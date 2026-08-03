var GIBUSH_API_TOKEN = "jfhf3fUVRKuAlHoRqkgcAcv0me3q31Ii0LFawlUa3bQ";
var initialElementGrades = document.querySelector("article div[ui-view]");
var currentTeamNumberGrades = "{loggedInUser.צוות שטח}";
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

async function fetchGradesData() {
    try {
        const response = await fetch("https://misc-ten.vercel.app/get_team_activity_data_for_grades", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + GIBUSH_API_TOKEN
            },
            body: JSON.stringify({
                team_number: currentTeamNumberGrades,
                activity_names: "sprints,crawls,sociometric_stretcher,sacks,holes,stretcher"
            })
        });

        const data = await response.json();
        console.log(data);

        if (!data || data.error || Object.keys(data).length === 0) {
            console.log("No grades data for team and activity:", currentTeamNumberGrades);
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

    const tableContainer = $('<div id="grades-table-container"></div>');
    $(initialElementGrades).after(tableContainer);

    const teamKey = String(currentTeamNumberGrades);
    const teamPayload = gradesData[teamKey] || gradesData[currentTeamNumberGrades];
    if (!teamPayload || !teamPayload.members) {
        showNoDataMessage();
        return;
    }

    const launched = teamPayload.launched_activities || [];
    const members = teamPayload.members || {};
    if (!launched.length && !Object.keys(members).length) {
        showNoDataMessage();
        return;
    }

    const tableData = Object.entries(members).map(function ([assesseeNumber, activities]) {
        const row = {
            assesseeNumber: assesseeNumber,
            final_grade: (activities.final_grade === null || activities.final_grade === undefined)
                ? '-'
                : activities.final_grade
        };
        launched.forEach(function (name) {
            var value = activities[name];
            row[name] = (value === null || value === undefined || value === "") ? '-' : value;
        });
        return row;
    });

    const columns = [
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
    ].concat(buildActivityColumns(launched));

    new gridjs.Grid({
        data: tableData,
        columns: columns,
        height: "calc(100vh - 100px)",
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
