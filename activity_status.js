var initialElementActivityStatus = document.querySelector("article div[ui-view]");


TB.render("component_23", async function (data) {
    $("div[af-data-table]").remove();
    
    const existing = initialElementActivityStatus.nextSibling;
    if (existing) existing.remove();
    
    showLoading(initialElementActivityStatus); // <-- show loading spinner
    
    fetch("https://misc-ten.vercel.app/get_game_state_for_team", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            team_number: "all"
        })
    })
    .then(response => response.json())
    .then(response => {
        console.log(response);
        if (Object.keys(response).length === 0) {
            console.log("No game state data for all teams");
            return;
        }
        
        hideLoading(); // <-- hide when data is ready
        showActivityStatus(response);
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
    '</div>').insertAfter($(initialElementActivityStatus));
}

function hideLoading() {
    $('#loading-spinner').remove();
}

function showActivityStatus(data) {
    var engToHebTranslations = {
        "sprints": "ספרינטים", "crawls": "זחילות", "sociometric_stretcher": "אלונקה סוציומטרית", 
        "holes": "חפירת בור", "sacks": "שקים", "stretcher": "מסע אלונקה"
    }
    
    // Remove existing table if present
    $('#grades-table-container').remove();
    
    // Create container for the table (reuse existing CSS targeting this id)
    const tableContainer = $('<div id="grades-table-container"></div>');
    $(initialElementActivityStatus).after(tableContainer);

    // Define the activities and their order
    const activityKeys = [
        'sprints',
        'crawls',
        'sociometric_stretcher',
        'sacks',
        'holes',
        'stretcher'
    ];

    // Helper to compute the maximum numeric value from an array of strings
    function getMaxNumber(values) {
        if (!Array.isArray(values) || values.length === 0) return '-';
        const numericValues = values
            .map(function(v) { return parseInt(v, 10); })
            .filter(function(n) { return Number.isFinite(n); });
        if (numericValues.length === 0) return '-';
        return Math.max.apply(null, numericValues);
    }

    // Transform input data into flat rows per team, skipping empty teams
    const tableData = [];
    Object.entries(data).forEach(function(entry) {
        const teamNumber = entry[0];
        const activities = entry[1] || {};
        if (!activities || Object.keys(activities).length === 0) return; // skip empty teams

        const row = { team: teamNumber };
        activityKeys.forEach(function(key) {
            row[key] = getMaxNumber(activities[key]);
        });
        tableData.push(row);
    });

    // Define columns
    const columns = [
        {
            id: 'team',
            name: 'צוות',
            sort: true,
            width: '100px'
        }
    ].concat(
        activityKeys.map(function(key) {
            return {
                id: key,
                name: engToHebTranslations[key] || key,
                sort: true,
                width: '120px'
            };
        })
    );

    // Render Grid.js table
    new gridjs.Grid({
        data: tableData,
        columns: columns,
        height: '400px',
        pagination: { limit: 35 },
        search: true,
        sort: true,
        language: {
            search: { placeholder: 'חיפוש...' },
            pagination: {
                previous: 'הקודם',
                next: 'הבא',
                of: 'מתוך',
                to: 'עד',
                showing: 'מציג',
                results: function() { return 'תוצאות'; }
            }
        },
        style: {
            table: { width: '100%' }
        },
        className: {
            table: 'grades-table',
            th: 'grades-header',
            td: 'grades-cell'
        },
        fixedHeader: true
    }).render(document.getElementById('grades-table-container'));
}