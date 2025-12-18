var initialElementGrades = document.querySelector("article div[ui-view]");
var engToHebTranslations = {
    "sprints": "ספרינטים", "crawls": "זחילות", "sociometric_stretcher": "אלונקה סוציומטרית", 
    "holes": "חפירת בור", "sacks": "שקים"
}

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

// Utility function to show/hide loader
function showLoading() {
  // Remove existing canvas and loader first
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

async function fetchGradesData(){
    try {
        const response = await fetch("https://misc-ten.vercel.app/get_team_activity_data_for_grades", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                team_number: "all",
                activity_names: "sprints,crawls,sociometric_stretcher,sacks,holes"
            })
        });
        
        const data = await response.json();
        console.log(data);
        
        if (Object.keys(data).length === 0) {
            console.log("No grades data for team and activity:", currentTeamNumberGrades);
            return null;
        }
        return data;
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
}

function createTable(gradesData){
    // Remove existing table and filters
    $('#grades-table-container').remove();
    $('#team-filters-container').remove();
    
    // Create container for filters
    const filtersContainer = $('<div id="team-filters-container"></div>');
    $(initialElementGrades).after(filtersContainer);
    
    // Create container for the table
    const tableContainer = $('<div id="grades-table-container"></div>');
    filtersContainer.after(tableContainer);
    
    // Transform nested team data into flat structure with team info
    const tableData = [];
    const availableTeams = Object.keys(gradesData);
    
    Object.entries(gradesData).forEach(([teamNumber, teamMembers]) => {
        Object.entries(teamMembers).forEach(([assesseeNumber, activities]) => {
            const row = { 
                teamNumber,
                assesseeNumber,
                sprints: activities.sprints ?? '-',
                crawls: activities.crawls ?? '-',
                sociometric_stretcher: activities.sociometric_stretcher ?? '-',
                sacks: activities.sacks ?? '-',
                holes: activities.holes ?? '-',
                final_grade: activities.final_grade ?? '-'
            };
            tableData.push(row);
        });
    });
    
    // Create team filter buttons
    createTeamFilters(availableTeams, filtersContainer);
    
    // Helper function to get grade color class
    function getGradeClass(grade) {
        if (grade === '-') return 'grade-no-data';
        if (grade >= 80) return 'grade-excellent';
        if (grade >= 60) return 'grade-average';
        return 'grade-failing';
    }
    
    // Define columns
    const columns = [
        { 
            id: 'assesseeNumber',
            name: 'מוערך',
            sort: true,
            width: '100px' // Set explicit width
        },
        { 
            id: 'final_grade',
            name: 'ציון סופי',
            sort: true,
            width: '120px',
            formatter: (cell) => {
                const className = getGradeClass(cell);
                return gridjs.html(`<span class="${className} highlighted-column">${cell}</span>`);
            }
        },
        { 
            id: 'sprints',
            name: 'ספרינטים',
            sort: true,
            width: '120px', // Ensure enough space for header
            formatter: (cell) => {
                const className = getGradeClass(cell);
                return gridjs.html(`<span class="${className}">${cell}</span>`);
            }
        },
        { 
            id: 'crawls',
            name: 'זחילות',
            sort: true,
            width: '110px',
            formatter: (cell) => {
                const className = getGradeClass(cell);
                return gridjs.html(`<span class="${className}">${cell}</span>`);
            }
        },
        { 
            id: 'sociometric_stretcher',
            name: 'אלונקה',
            sort: true,
            width: '120px', // Longer header needs more space
            formatter: (cell) => {
                const className = getGradeClass(cell);
                return gridjs.html(`<span class="${className}">${cell}</span>`);
            }
        },
        { 
            id: 'sacks',
            name: 'שקים',
            sort: true,
            width: '100px',
            formatter: (cell) => {
                const className = getGradeClass(cell);
                return gridjs.html(`<span class="${className}">${cell}</span>`);
            }
        },
        { 
            id: 'holes',
            name: 'בורות',
            sort: true,
            width: '100px',
            formatter: (cell) => {
                const className = getGradeClass(cell);
                return gridjs.html(`<span class="${className}">${cell}</span>`);
            }
        }
    ];
    
    // Create Grid.js instance
    window.gradesGrid = new gridjs.Grid({
        data: tableData,
        columns: columns,
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
                results: () => 'תוצאות'
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
    
    // Store original data for filtering
    window.originalTableData = tableData;
}

// Function to create team filter buttons
function createTeamFilters(teams, container) {
    const filtersHtml = `
        <div class="team-filters">
            <label class="filter-label">סינון לפי צוות:</label>
            <button class="team-filter-btn active" data-team="all">כל הצוותים</button>
            ${teams.map(team => `<button class="team-filter-btn" data-team="${team}">צוות ${team}</button>`).join('')}
        </div>
    `;
    
    container.html(filtersHtml);
    
    // Add event listeners for filter buttons
    container.find('.team-filter-btn').on('click', function() {
        const selectedTeam = $(this).data('team');
        
        // Update active button
        container.find('.team-filter-btn').removeClass('active');
        $(this).addClass('active');
        
        // Filter the table data
        filterTableByTeam(selectedTeam);
    });
}

// Function to filter table by team
function filterTableByTeam(teamNumber) {
    if (!window.gradesGrid || !window.originalTableData) return;
    
    let filteredData;
    if (teamNumber === 'all') {
        filteredData = window.originalTableData;
    } else {
        // Convert both to strings to ensure proper comparison
        filteredData = window.originalTableData.filter(row => String(row.teamNumber) === String(teamNumber));
    }
    
    // Update the grid with filtered data
    window.gradesGrid.updateConfig({
        data: filteredData
    }).forceRender();
}