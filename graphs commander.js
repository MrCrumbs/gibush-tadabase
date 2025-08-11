var initialElementGraphs = document.querySelector("article div[ui-view]");
var currentTeamNumberGraphs = "{loggedInUser.צוות שטח}";

TB.render("component_23", async function (data) {
    $("div[af-data-table]").remove();
    
    const existing = initialElementGraphs.nextSibling;
    if (existing) existing.remove();
    
    showLoading(initialElementGraphs); // <-- show loading spinner
    
    fetch("https://misc-ten.vercel.app/get_team_activity_data", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            team_number: "all",
            activity_names: "sprints,crawls,sociometric_stretcher"
        })
    })
    .then(response => response.json())
    .then(response => {
        console.log(response);
        if (Object.keys(response).length === 0) {
            console.log("No data for team and activity:", currentTeamNumberGraphs);
            return;
        }
        
        hideLoading(); // <-- hide when data is ready
        draw_graph_hicharts(response);
    })
    .catch(error => {
        console.error("Fetch error:", error);
    });
});

// Utility function to show/hide loader
function showLoading() {
  // Remove existing canvas and loader first
  $('#hichartsJS').remove();
  $('#loading-spinner').remove();
  $('<div id="loading-spinner" style="margin-top:10px; text-align:center;">' +
    '<img src="https://i.gifer.com/7YUL.gif" alt="Loading..." width="50">' +
    '</div>').insertAfter($(initialElementGraphs));
}

function hideLoading() {
    $('#loading-spinner').remove();
}

function draw_graph_hicharts(data) {
    const default_race_activities_to_draw = ["sprints", "crawls"];
    const default_category_activities_to_draw = ["sociometric_stretcher"];
    const engToHeb = {"sprints": "ספרינטים", "crawls": "זחילות", "sociometric_stretcher": "אלונקה סוציומטרית"}
    
    // Store original data for filtering
    const originalData = data;
    let currentFilter = "all";
    
    // Remove any existing chart container
    $("#hichartsJS").remove();

    // Add new chart container after #field_block_field_243
    $('<div id="hichartsJS"></div>').insertAfter($(initialElementGraphs));

    // Add team filter buttons
    const teamFilterContainer = $('<div id="team-filter-container"></div>');
    $('#hichartsJS').prepend(teamFilterContainer);
    
    // Get all team numbers from data
    const allTeamNumbers = Object.keys(data).sort();
    console.log("allTeamNumbers", allTeamNumbers);
    
    // Add "All Teams" button first
    const allTeamsButton = $('<button class="team-filter-btn active" data-team="all">כל הצוותים</button>');
    
    teamFilterContainer.append(allTeamsButton);
    
    // Add individual team buttons
    allTeamNumbers.forEach(teamNumber => {
        const teamButton = $(`<button class="team-filter-btn" data-team="${teamNumber}">צוות ${teamNumber}</button>`);
        
        teamFilterContainer.append(teamButton);
    });
    
    // Create chart containers
    default_race_activities_to_draw.forEach(activityName => {
        const chartContainerId = `hichart-${activityName}`;
        $('#hichartsJS').append(`<div id="${chartContainerId}" style="margin-bottom:50px;"></div>`);
    });
    
    default_category_activities_to_draw.forEach(activityName => {
        const chartContainerId = `hichart-${activityName}`;
        $('#hichartsJS').append(`<div id="${chartContainerId}" style="margin-bottom:50px;"></div>`);
    });
    
    // Add click handlers for filter buttons
    $('.team-filter-btn').on('click', function() {
        const selectedTeam = $(this).data('team');
        console.log('Selected team:', selectedTeam);
        
        // Update button states
        $('.team-filter-btn').removeClass('active');
        $(this).addClass('active');
        
        // Update filter and redraw charts
        currentFilter = selectedTeam;
        redrawCharts();
    });
    
    // Initial chart drawing
    redrawCharts();

    // Function to redraw all charts with filtered data
    function redrawCharts() {
        const filteredData = currentFilter === "all" ? originalData : { [currentFilter]: originalData[currentFilter] };
        
        // Redraw race activity charts
        default_race_activities_to_draw.forEach(activityName => {
            const chartContainerId = `hichart-${activityName}`;
            
            // Step 1: Get all unique activity numbers from filtered data
            const allNumbers = [
                ...new Set(
                    Object.values(filteredData)
                        .flatMap(teamData => 
                            Object.values(teamData)
                                .flatMap(user => Object.keys(user?.[activityName]?.places || {}))
                        )
                )
            ].sort((a, b) => a - b);

            // Step 2: Build series from filtered data
            const series = [];
            Object.entries(filteredData).forEach(([teamNumber, teamData]) => {
                Object.entries(teamData)
                    .filter(([competitor, activities]) => {
                        // Only include competitors who have data for this activity
                        return activities?.[activityName]?.places && 
                               Object.keys(activities[activityName].places).length > 0;
                    })
                    .forEach(([competitor, activities]) => {
                        const places = allNumbers.map(num => {
                            return activities?.[activityName]?.[String(num)] ?? null;
                        });

                        series.push({
                            name: competitor,
                            data: places,
                            connectNulls: false,
                            visible: false
                        });
                    });
            });

            // Step 3: Create or update chart
            const existingChart = Highcharts.charts.find(chart => chart && chart.renderTo.id === chartContainerId);
            if (existingChart) {
                existingChart.update({
                    xAxis: { categories: allNumbers },
                    series: series
                }, true, true, true);
            } else {
                Highcharts.chart(chartContainerId, {
                    chart: { type: 'line', spacingLeft: 0, spacingRight: 0 },
                    title: { text: `${engToHeb[activityName]}` },
                    xAxis: {
                        categories: allNumbers,
                        title: { text: "מקצים" },
                        tickmarkPlacement: 'on',
                        startOnTick: true,
                        endOnTick: true,
                        min: 0,
                        max: allNumbers.length - 1
                    },
                    yAxis: {
                        title: { text: 'מקום' },
                        reversed: true,
                        allowDecimals: false,
                        startOnTick: false,
                        endOnTick: false
                    },
                    tooltip: {
                        shared: true,
                        crosshairs: true
                    },
                    legend: {
                        layout: 'vertical',
                        align: 'right',
                        verticalAlign: 'middle',
                        maxHeight: 300,
                        scrollable: true
                    },
                    series: series,
                    plotOptions: {
                        series: {
                            pointPadding: 0,
                            groupPadding: 0,
                            events: {
                                show: function () {
                                    const chart = this.chart;
                                    if (chart.boldResetTimer) {
                                        clearTimeout(chart.boldResetTimer);
                                    }
                                    chart.boldResetTimer = setTimeout(() => {
                                        chart.series.forEach(s => s.setState && s.setState('normal'));
                                        if (chart.hoverPoint) chart.hoverPoint.setState('normal');
                                        chart.hoverSeries = null;
                                    }, 1000);
                                }
                            }
                        }
                    }
                });
            }
        });
        
        // Redraw category activity charts
        default_category_activities_to_draw.forEach(activityName => {
            const chartContainerId = `hichart-${activityName}`;
            
            // Get the full set of x-axis categories from filtered data
            const allCategories = Array.from(
              new Set(
                Object.values(filteredData)
                  .flatMap(teamData => 
                    Object.values(teamData)
                      .flatMap(user => Object.keys(user?.[activityName]?.aggregated_categories || {}))
                  )
              )
            );
            
            // Translate category names if needed
            const categoryTranslations = {
                "stretcher": "אלונקה",
                "first": "ראשון",
                "jerrycan": "ג'ריקן",
            };
            
            const translatedCategories = allCategories.map(cat => 
                categoryTranslations[cat] || cat
            );
            
            // Prepare series data for each user from filtered data
            const series = [];
            Object.entries(filteredData).forEach(([teamNumber, teamData]) => {
                Object.entries(teamData)
                    .filter(([competitor, activities]) => {
                        // Only include competitors who have data for this activity
                        return activities?.[activityName]?.aggregated_categories && 
                               Object.keys(activities[activityName].aggregated_categories).length > 0;
                    })
                    .forEach(([competitor, activities]) => {
                      const categoryData = activities?.[activityName]?.aggregated_categories || {};
                      series.push({
                        name: competitor,
                        data: allCategories.map(cat => categoryData[cat] ?? 0), // fill missing with 0
                        visible: false  // start hidden
                      });
                    });
            });
            
            // Create or update chart
            const existingChart = Highcharts.charts.find(chart => chart && chart.renderTo.id === chartContainerId);
            if (existingChart) {
                existingChart.update({
                    xAxis: { categories: translatedCategories },
                    series: series
                }, true, true, true);
            } else {
                Highcharts.chart(chartContainerId, {
                    chart: {
                        type: 'column'
                    },
                    title: {
                        text: `${engToHeb[activityName]}`
                    },
                    xAxis: {
                        categories: translatedCategories,
                        title: {
                            text: 'סיווגים'
                        }
                    },
                    yAxis: {
                        min: 0,
                        title: {
                            text: 'כמות'
                        }
                    },
                    legend: {
                        layout: 'vertical',
                        align: 'right',
                        verticalAlign: 'middle',
                        maxHeight: 300,
                        scrollable: true
                    },
                    plotOptions: {
                        series: {
                            events: {
                                show: function () {
                                    const chart = this.chart;
                                    if (chart.boldResetTimer) {
                                        clearTimeout(chart.boldResetTimer);
                                    }
                                    chart.boldResetTimer = setTimeout(() => {
                                        chart.series.forEach(s => s.setState && s.setState('normal'));
                                        if (chart.hoverPoint) chart.hoverPoint.setState('normal');
                                        chart.hoverSeries = null;
                                    }, 1000);
                                }
                            }
                        }
                    },
                    series: series
                });
            }
        });
    }
}