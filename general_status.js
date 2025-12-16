TB.render('component_11', function(data) {
    setTimeout(() => {
        $('.pull-left, .form-inline').addClass('pull-right').removeClass('pull-left').css("direction", "rtl");;
        $("table th").css("pointer-events","none");

        var previousValue = null;
        var previousRow = null;
        var cellToMerge = null;
        var rowspan = null;
        var tempSum = 0;
        var targetHeader = "סהכ";
        var dynamicTargetHeader = "יעד דינאמי";
        
        var targetColumnIndex = $('table th').filter(function() {
            return $(this).text().trim() === targetHeader;
        }).index();
        
        var dynamicTargetColumnIndex = $('table th').filter(function() {
            return $(this).text().trim() === dynamicTargetHeader;
        }).index();
        
        var fixedTargetHeader = "יעד קבוע";
        var fixedTargetColumnIndex = $('table th').filter(function() {
            return $(this).text().trim() === fixedTargetHeader;
        }).index();
    
        var count = 0;
        var color_flag = 1;
        var color_flag_2 = 1;
        $('.relevant-table tr').each(function() {
            count += 1;
            var currentRow = $(this);
            var currentValue = currentRow.find('td:first').text();

            if (currentValue === previousValue) {
                // Merge first column cells
                var previous_row_first_col = previousRow.find('td:first');
                rowspan = parseInt(previous_row_first_col.attr('rowspan') || 1) + 1;
                previous_row_first_col.attr('rowspan', rowspan);
                currentRow.find('td:first').remove();
                
                // Center first column content vertically
                previous_row_first_col.css('vertical-align', 'middle');
    
                // Merge סהכ column cells (only if first column merged)
                cellToMerge = previousRow.find('td:eq(' + targetColumnIndex + ')');
                cellToMerge.attr('rowspan', rowspan);
                cellToRemove = currentRow.find('td:eq(' + (targetColumnIndex-1) + ')');
                tempSum += parseInt(cellToMerge.text().trim());
                cellToRemove.remove();
                
                // Merge יעד קבוע column cells (only if first column merged)
                var fixedCellToMerge = previousRow.find('td:eq(' + fixedTargetColumnIndex + ')');
                fixedCellToMerge.attr('rowspan', rowspan);
                // After removing first column and סהכ column, index shifts by 2
                var fixedCellToRemove = currentRow.find('td:eq(' + (fixedTargetColumnIndex - 2) + ')');
                fixedCellToRemove.remove();
                fixedCellToMerge.css('vertical-align', 'middle');
                
                var status_cell = currentRow.find("td:eq(2)");
                var fixed_cell = currentRow.find("td:eq(3)");
                var status = parseInt(status_cell.text());
                var fixed = parseInt(fixed_cell.text());

                var color_for_merge;
                if(color_flag === 1){
                    color_for_merge = previousRow.css('background-color');
                    previousRow.css("background-color", color_for_merge);
                    currentRow.css("background-color", color_for_merge);
                }
                else{
                    color_for_merge = previousRow.css('background-color');
                    previousRow.css("background-color", color_for_merge);
                    currentRow.css("background-color", color_for_merge);
                }
                color_flag *= (-1);
                // Center last column content vertically
                previousRow.find('td:eq(' + targetColumnIndex + ')').css('vertical-align', 'middle');
                
                // if(status <= fixed + 2){
                //     fixed_cell.css("background-color", "#FF6464");
                // }
            } else {
                var status_cell = currentRow.find("td:eq(3)");
                var fixed_cell = currentRow.find("td:eq(5)");
                var status = parseInt(status_cell.text());
                var fixed = parseInt(fixed_cell.text());
                
                previousValue = currentValue;
                previousRow = currentRow;
                if(color_flag_2 === 1){
                    previousRow.css("background-color", "white");
                }
                else{
                    previousRow.css("background-color", "#F0F0F0");
                }
                color_flag_2 *= (-1);
                
                // if(status <= fixed + 2){
                //     fixed_cell.css("background-color", "#FF6464");
                // }
            }
        });

        // Select the last row and find the target cell
        var summaryRow = $(".table-row-summery.row-summery-first");
        var targetCell = summaryRow.find('td:eq(' + dynamicTargetColumnIndex + ')');
        var total_cell = summaryRow.find('td:eq(4)');
        var total_value = parseInt(total_cell.text());
        total_cell.text(total_value - tempSum);
        targetCell.text("");
        
    });
});

TB.render('component_13', function(data) {
    setTimeout(() => {
        $('.madad-table tr').find('td:eq(3), th:eq(3)').hide();
        
        // $(".madad-table tbody tr:nth-child(1)").css("background-color", "#FF6464");
        // $(".madad-table tbody tr:nth-child(2)").css("background-color", "#FF6464");
        var third_row = $(".madad-table tbody tr:nth-child(3)");
        var fourth_row = $(".madad-table tbody tr:nth-child(4)");
        var sixth_row = $(".madad-table tbody tr:nth-child(6)");
        
        var status_third_row = parseInt(third_row.find("td:eq(2)").text());
        if(status_third_row <= 40){
            // third_row.css("background-color", "#FF6464");
        }
        
        var status_fourth_row = parseInt(fourth_row.find("td:eq(2)").text());
        if(status_fourth_row <= 37){
            // fourth_row.css("background-color", "#FF6464");
        }
        
        var status_sixth_row = parseInt(sixth_row.find("td:eq(2)").text());
        if(status_sixth_row <= 14){
            // sixth_row.css("background-color", "#FF6464");
        }
        
        $('.madad-table tr').each(function() {
            var currentRow = $(this);
            var currentDifference = parseInt(currentRow.find('td:eq(3)').text());
            var currentRatio = parseFloat(currentRow.find('td:eq(4)').text());
            console.log("currentDifference: " + currentDifference);
            console.log("currentRatio: " + currentRatio);
            // if((currentDifference < 8) || (currentRatio < 1.7)){
            if(currentRatio < 1.5){
                currentRow.css("background-color", "#FF6464");
            }
        });
    });
});

window.setInterval(function(){
    $('[ng-click="refreshData()"]').click();
}, 600000);
