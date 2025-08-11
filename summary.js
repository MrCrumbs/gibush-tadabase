// Global variable to store the assessee mapping
let assesseeMappingSummary = new Map();

TB.render('component_3', function(data) {
    setTimeout(() => {
        $('.pull-left, .form-inline').addClass('pull-right').removeClass('pull-left');
        $(".filter-tabs li:last a").text("נקה סינון");
        $(".t-filter-button-text").text(" הוסף מסננים");
        $(".input-group input").attr("placeholder", "חיפוש");
        $(".t-export-button").text("ייצוא");
        $(".t-view-download").text("הצג הורדות");
        
        $('table tr').each(function() {
            var columnText = $(this).find('td:nth-child(17)').text().trim();
            if (columnText !== '') {
              $(this).css('background-color', '#FF6464');
            }
        });
        
        trun();
        addActionColumn();
    });
});

function showMore(id, event) {
    // Prevent the click from bubbling up to parent elements (which would open the editing modal)
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }    document.getElementById(id + 'Overflow').className = '';
    document.getElementById(id + 'MoreLink').className = 'hidden';
    document.getElementById(id + 'LessLink').className = '';
}
function showLess(id, event) {
    // Prevent the click from bubbling up to parent elements (which would open the editing modal)
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    document.getElementById(id + 'Overflow').className = 'hidden';
    document.getElementById(id + 'MoreLink').className = '';
    document.getElementById(id + 'LessLink').className = 'hidden';
}

var trun = function(){
    if(!$('.shrinkables').length){
        var len = 40;
        var shrinkables = $('tbody td span');
        if (shrinkables.length > 0) {
            for (var i = 0; i < shrinkables.length; i++) {
                var fullText = shrinkables[i].innerHTML.replaceAll("&nbsp;", " ");
                if (fullText.length > len && !$(shrinkables[i].offsetParent).hasClass('allow-inline-edit') && !fullText.includes("badge")) {
                    var trunc = fullText.substring(0, len).replace(/\w+$/, '');
                    var remainder = "";
                    var id = 'shrinkable' + i;
                    remainder = fullText.substring(len, fullText.length);
                    shrinkables[i].innerHTML = '<span class="shrinkables">' + trunc + '<span class="hidden" id="' + id + 'Overflow">' + remainder + '</span></span>&nbsp;<a id="' + id + 'MoreLink" style="cursor:pointer;color:blue;" onclick="showMore(\'' + id + '\', event);">הצג עוד</a><a class="hidden" style="cursor:pointer;color:blue;" id="' + id + 'LessLink" onclick="showLess(\'' + id + '\', event);">הצג פחות</a>';
    
                }
            }
        }
    }
};

$('body, button').click(function(){
    setTimeout(function(){
        if($('.shrinkables').length === 0){
             trun();
        }
    },500);
});

// Add this new function after the TB.render function
function addActionColumn() {
    // Add header for the new column only if it doesn't exist
    if($('table thead tr th:contains("AI")').length === 0){
        $('table thead tr').append('<th>AI</th>');
    }
    
    // Always add action buttons to each data row (in case table was re-rendered)
    $('table tbody tr').each(function() {
        // Skip if this row already has an action column
        if($(this).find('td:last-child .action-btn').length > 0){
            return;
        }
        
        var assesseeNumber = $(this).find('td:first').text().trim();
        
        // Create button with FontAwesome icon
        var actionButton = $('<button class="btn btn-sm btn-primary action-btn"><i class="fas fa-magic"></i></button>');
        
        // Add click handler
        actionButton.on('click', function(e) {
            console.log('First column value:', assesseeNumber, assesseeMappingSummary.get(assesseeNumber));
        });
        
        // Append the button cell to the row
        $(this).append($('<td>').append(actionButton));
    });
}

// Store the original XHR open method
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function () {
  this.addEventListener("load", function () {
    try {
      const response = JSON.parse(this.responseText);
      console.log("Tadabase response:", response);
      
             // Check if this is the assessee data response
       if (response.items && Array.isArray(response.items)) {
         // Add to existing mapping (don't clear)
         // assesseeMappingSummary.clear(); // Removed this line
         
         // Create mapping of assessee number (field_61) to assessee ID
         response.items.forEach(item => {
           if (item.field_61 && item.id) {
             assesseeMappingSummary.set(item.field_61.toString(), item.id);
             // console.log(`Mapped assessee ${item.field_61} to ID: ${item.id}`);
           }
         });
    
        console.log(`Total assessees mapped: ${assesseeMappingSummary.size}`);
        console.log("Assessee mapping:", Object.fromEntries(assesseeMappingSummary));
      }
    } catch (e) {
      console.log("Not a relevant response:", e);
    }
  });
  originalOpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function () {
  console.log("Request being sent:", arguments[0]);
  originalSend.apply(this, arguments);
};
