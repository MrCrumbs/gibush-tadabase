var initialElementGrades = document.querySelector("article div[ui-view]");
var currentTeamNumberGrades = "{loggedInUser.צוות שטח}";
var engToHebTranslations = {
    "sprints": "ספרינטים", "crawls": "זחילות", "sociometric_stretcher": "אלונקה סוציומטרית", "holes": "בורות",
    "holes_obstacle": "חפירת בור מכשול", "holes_personal_group": "חפירת בור אישי קבוצתי", "sacks": "שקים"
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
                team_number: currentTeamNumberGrades,
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
    // Remove existing table
    $('#grades-table-container').remove();
    
    // Create container for the table
    const tableContainer = $('<div id="grades-table-container"></div>');
    $(initialElementGrades).after(tableContainer);
    
    // Transform data for Grid.js
    const teamData = gradesData[currentTeamNumberGrades];
    
    const tableData = Object.entries(teamData).map(([assesseeNumber, activities]) => {
        const row = { 
            assesseeNumber,
            sprints: activities.sprints || '-',
            crawls: activities.crawls || '-',
            sociometric_stretcher: activities.sociometric_stretcher || '-',
            sacks: activities.sacks || '-',
            holes: activities.holes || '-',
            final_grade: activities.final_grade || '-'
        };
        return row;
    });
    
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
    const grid = new gridjs.Grid({
        data: tableData,
        columns: columns,
        // height: "400px", 
        height: "calc(100vh - 100px)",
        // pagination: {
        //     limit: 35
        // },
        pagination: false,
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
    
}