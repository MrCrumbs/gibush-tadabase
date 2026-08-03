var GIBUSH_API_TOKEN = "jfhf3fUVRKuAlHoRqkgcAcv0me3q31Ii0LFawlUa3bQ";
var initialElementGrades = document.querySelector("article div[ui-view]");
var engToHebTranslations = {
    "sprints": "ספרינטים",
    "crawls": "זחילות",
    "sociometric_stretcher": "אלונקה סוציומטרית",
    "holes": "חפירת בור",
    "sacks": "שקים",
    "stretcher": "מסע אלונקה"
};
var ACTIVITY_COLUMN_ORDER = [
    "sprints",
    "crawls",
    "sociometric_stretcher",
    "sacks",
    "holes",
    "stretcher"
];

TB.render("component_23", async function (data) {
    window.trun = function() { return false; };
    $("div[af-data-table]").remove();

    const existing = initialElementGrades.nextSibling;
    if (existing) existing.remove();

    showLoading();

    try {
        const gradesData = await fetchGradesData();
        if (gradesData) {
            createTable(gradesData);
        } else {
            showNoDataMessage();
        }
    } catch (error) {
        console.error("Error loading table:", error);
        showErrorMessage();
    } finally {
        hideLoading();
    }
});

function showLoading() {
  $('#hichartsJS').remove();
  $('#loading-spinner').remove();
  $('<div id="loading-spinner">' +
    '<img src="https://i.gifer.com/7YUL.gif" alt="Loading..." width="50">' +
    '</div>').insertAfter($(initialElementGrades));
}

function hideLoading() {
    $('#loading-spinner').remove();
}

function showNoDataMessage() {
    const messageDiv = $('<div id="no-data-message">' +
        '<i class="fas fa-info-circle"></i><br>' +
        'אין נתונים זמינים עבור הצוות הנוכחי' +
        '</div>');
    $(initialElementGrades).after(messageDiv);
}

function showErrorMessage() {
    const messageDiv = $('<div id="error-message">' +
        '<i class="fas fa-exclamation-triangle"></i><br>' +
        'שגיאה בטעינת הנתונים' +
        '</div>');
    $(initialElementGrades).after(messageDiv);
}

function getGradeClass(grade) {
    if (grade === '-' || grade === null || grade === undefined || grade === "") {
        return 'grade-no-data';
    }
    if (grade >= 80) return 'grade-excellent';
    if (grade >= 60) return 'grade-average';
    return 'grade-failing';
}

function gradeCellFormatter(highlighted) {
    return function (cell) {
        var display = (cell === null || cell === undefined || cell === "") ? '-' : cell;
        var className = getGradeClass(display);
        var extra = highlighted ? ' highlighted-column' : '';
        return gridjs.html('<span class="' + className + extra + '">' + display + '</span>');
    };
}

function buildActivityColumns(launchedActivities) {
    var launchedSet = {};
    (launchedActivities || []).forEach(function (name) {
        launchedSet[name] = true;
    });
    return ACTIVITY_COLUMN_ORDER.filter(function (name) {
        return launchedSet[name];
    }).map(function (name) {
        return {
            id: name,
            name: engToHebTranslations[name] || name,
            sort: true,
            width: '120px',
            formatter: gradeCellFormatter(false)
        };
    });
}

function buildBaseColumns(launchedActivities) {
    return [
        {
            id: 'assesseeNumber',
            name: 'מוערך',
            sort: true,
            width: '100px'
        },
        {
            id: 'final_grade',
            name: 'ציון סופי',
            sort: true,
            width: '120px',
            formatter: gradeCellFormatter(true)
        }
    ].concat(buildActivityColumns(launchedActivities));
}

function unionLaunchedActivities(launchedByTeam) {
    var seen = {};
    Object.keys(launchedByTeam || {}).forEach(function (team) {
        (launchedByTeam[team] || []).forEach(function (name) {
            seen[name] = true;
        });
    });
    return ACTIVITY_COLUMN_ORDER.filter(function (name) {
        return seen[name];
    });
}

async function fetchGradesData() {
    try {
        const response = await fetch("https://misc-ten.vercel.app/get_team_activity_data_for_grades", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + GIBUSH_API_TOKEN
            },
            body: JSON.stringify({
                team_number: "all",
                activity_names: "sprints,crawls,sociometric_stretcher,sacks,holes,stretcher"
            })
        });

        const data = await response.json();
        console.log(data);

        if (!data || data.error || Object.keys(data).length === 0) {
            console.log("No grades data for any team");
            return null;
        }
        return data;
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
}

function createTable(gradesData) {
    $('#grades-table-container').remove();
    $('#team-filters-container').remove();

    const filtersContainer = $('<div id="team-filters-container"></div>');
    $(initialElementGrades).after(filtersContainer);

    const tableContainer = $('<div id="grades-table-container"></div>');
    filtersContainer.after(tableContainer);

    const tableData = [];
    const launchedByTeam = {};
    const availableTeams = Object.keys(gradesData);

    Object.entries(gradesData).forEach(function ([teamNumber, teamPayload]) {
        if (!teamPayload || !teamPayload.members) {
            return;
        }
        var launched = teamPayload.launched_activities || [];
        launchedByTeam[String(teamNumber)] = launched;
        Object.entries(teamPayload.members).forEach(function ([assesseeNumber, activities]) {
            const row = {
                teamNumber: String(teamNumber),
                assesseeNumber: assesseeNumber,
                final_grade: (activities.final_grade === null || activities.final_grade === undefined)
                    ? '-'
                    : activities.final_grade
            };
            ACTIVITY_COLUMN_ORDER.forEach(function (name) {
                if (launched.indexOf(name) === -1) {
                    row[name] = '-';
                } else {
                    var value = activities[name];
                    row[name] = (value === null || value === undefined || value === "") ? '-' : value;
                }
            });
            tableData.push(row);
        });
    });

    if (!tableData.length) {
        showNoDataMessage();
        return;
    }

    createTeamFilters(availableTeams, filtersContainer);

    var initialLaunched = unionLaunchedActivities(launchedByTeam);
    window.gradesLaunchedByTeam = launchedByTeam;
    window.originalTableData = tableData;
    window.gradesGrid = new gridjs.Grid({
        data: tableData,
        columns: buildBaseColumns(initialLaunched),
        height: "400px",
        pagination: {
            limit: 35
        },
        search: true,
        sort: true,
        language: {
            search: {
                placeholder: 'חיפוש...'
            },
            pagination: {
                previous: 'הקודם',
                next: 'הבא',
                of: 'מתוך',
                to: 'עד',
                showing: 'מציג',
                results: function () { return 'תוצאות'; }
            }
        },
        style: {
            table: {
                width: '100%'
            }
        },
        className: {
            table: 'grades-table',
            th: 'grades-header',
            td: 'grades-cell'
        },
        fixedHeader: true
    }).render(document.getElementById('grades-table-container'));
}

function createTeamFilters(teams, container) {
    const filtersHtml =
        '<div class="team-filters">' +
        '<label class="filter-label">סינון לפי צוות:</label>' +
        '<button class="team-filter-btn active" data-team="all">כל הצוותים</button>' +
        teams.map(function (team) {
            return '<button class="team-filter-btn" data-team="' + team + '">צוות ' + team + '</button>';
        }).join('') +
        '</div>';

    container.html(filtersHtml);

    container.find('.team-filter-btn').on('click', function () {
        const selectedTeam = $(this).data('team');
        container.find('.team-filter-btn').removeClass('active');
        $(this).addClass('active');
        filterTableByTeam(selectedTeam);
    });
}

function filterTableByTeam(teamNumber) {
    if (!window.gradesGrid || !window.originalTableData) return;

    var filteredData;
    var launched;
    if (teamNumber === 'all') {
        filteredData = window.originalTableData;
        launched = unionLaunchedActivities(window.gradesLaunchedByTeam);
    } else {
        filteredData = window.originalTableData.filter(function (row) {
            return String(row.teamNumber) === String(teamNumber);
        });
        launched = (window.gradesLaunchedByTeam && window.gradesLaunchedByTeam[String(teamNumber)]) || [];
    }

    window.gradesGrid.updateConfig({
        data: filteredData,
        columns: buildBaseColumns(launched)
    }).forceRender();
}
