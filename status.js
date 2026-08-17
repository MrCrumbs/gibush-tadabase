TB.render('component_11', function(data) {
    setTimeout(() => {
        function fixSummaryRow() {
          const summaryRows = document.querySelectorAll('tr.table-row-summery');
          
          summaryRows.forEach(row => {
            // Get all visible (non-hidden) tds
            const visibleTds = Array.from(row.querySelectorAll('td')).filter(td => td.style.display !== 'none');
            
            if (visibleTds.length > 0) {
              const firstTd = visibleTds[0];
              const span = firstTd.querySelector('span');
              if (span && span.textContent !== 'סהכ') {
                span.textContent = 'סהכ';
                // Optional: style it to stand out
                span.style.fontWeight = 'bold';
              }
            }
          });
        }

        // Run immediately
        fixSummaryRow();

        // Watch for DOM changes (table re-renders, pagination, filters, etc.)
        const observer = new MutationObserver(() => {
            fixSummaryRow();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
});        

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
    
        function parseCellInt(rawText) {
            var cleaned = String(rawText || "").replace(/[^\d\-]/g, "");
            var n = parseInt(cleaned, 10);
            return Number.isFinite(n) ? n : 0;
        }

        var dynamicTargetSum = 0;
        var fixedTargetSum = 0;
        var count = 0;
        var color_flag = 1;
        var color_flag_2 = 1;
        $('.relevant-table tr').each(function() {
            count += 1;
            var currentRow = $(this);
            if (currentRow.hasClass("table-row-summery") || currentRow.find("td").length === 0) {
                return;
            }
            var currentValue = currentRow.find('td:first').text();
            dynamicTargetSum += parseCellInt(currentRow.find('td:eq(' + dynamicTargetColumnIndex + ')').text());

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
                fixedTargetSum += parseCellInt(currentRow.find('td:eq(' + fixedTargetColumnIndex + ')').text());
                
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

        // Select the summary row and set totals (after merges)
        var summaryRow = $(".table-row-summery.row-summery-first");
        var dynamicTargetCell = summaryRow.find('td:eq(' + dynamicTargetColumnIndex + ')');
        var fixedTargetCell = summaryRow.find('td:eq(' + fixedTargetColumnIndex + ')');
        var total_cell = summaryRow.find('td:eq(4)');
        var total_value = parseCellInt(total_cell.text());
        total_cell.text(total_value - tempSum);
        dynamicTargetCell.text(dynamicTargetSum);
        fixedTargetCell.text(fixedTargetSum);
        
    });
});

TB.render('component_13', function(data) {
    setTimeout(() => {
        function headerText($cell) {
            return ($cell.text() || "").replace(/\s+/g, " ").trim();
        }

        function columnIndexByHeader($table, headerTextToFind) {
            var $headerCells = $table.find('thead tr:first th, thead tr:first td');
            if (!$headerCells.length) {
                $headerCells = $table.find('tr:first th, tr:first td');
            }
            var index = -1;
            $headerCells.each(function(i) {
                if (headerText($(this)) === headerTextToFind) {
                    index = i;
                    return false;
                }
            });
            return index;
        }

        function parseCellFloat(cell) {
            var $cell = $(cell);
            if (!$cell.length) {
                return NaN;
            }
            var $input = $cell.find('input, select, textarea').first();
            var raw = $input.length ? $input.val() : $cell.text();
            var cleaned = String(raw || "").replace(/[^\d.\-]/g, "");
            if (!cleaned) {
                return NaN;
            }
            var n = parseFloat(cleaned);
            return Number.isFinite(n) ? n : NaN;
        }

        // Re-query every time: inline edit replaces the table node, so a
        // captured jQuery handle goes stale until the blue refresh.
        function findWeightTable() {
            return $('.madad-table').filter(function() {
                return columnIndexByHeader($(this), "מכפיל") >= 0;
            }).first();
        }

        function findCountsTable($weightTable) {
            return $('.madad-table').filter(function() {
                return (!$weightTable.length || this !== $weightTable[0])
                    && columnIndexByHeader($(this), "מכפיל") < 0;
            }).first();
        }

        function dataRows($table) {
            return $table.find('tbody tr').filter(function() {
                var $row = $(this);
                return !$row.hasClass("table-row-summery") && $row.find("td").length > 0;
            });
        }

        function applyMadadAlerts() {
            var $weightTable = findWeightTable();
            var $countsTable = findCountsTable($weightTable);
            if (!$weightTable.length || !$countsTable.length) {
                return;
            }
            var statusColumnIndex = columnIndexByHeader($weightTable, "סטאטוס");
            var sayeretColumnIndex = columnIndexByHeader($weightTable, "יעד סיירת");
            var egozColumnIndex = columnIndexByHeader($weightTable, "יעד אגוז");
            var weightColumnIndex = columnIndexByHeader($weightTable, "מכפיל");
            var $weightRows = dataRows($weightTable);
            var $countRows = dataRows($countsTable);

            $weightRows.css("background-color", "");
            $countRows.each(function(rowIndex) {
                var $countRow = $(this);
                var $weightRow = $weightRows.eq(rowIndex);
                if (!$weightRow.length) {
                    $countRow.css("background-color", "");
                    return;
                }
                var status = parseCellFloat($weightRow.find('td').eq(statusColumnIndex));
                var sayeret = parseCellFloat($weightRow.find('td').eq(sayeretColumnIndex));
                var egoz = parseCellFloat($weightRow.find('td').eq(egozColumnIndex));
                var target = (Number.isFinite(sayeret) ? sayeret : 0) + (Number.isFinite(egoz) ? egoz : 0);
                var weight = parseCellFloat($weightRow.find('td').eq(weightColumnIndex));
                var currentRatio = (Number.isFinite(status) && target > 0) ? (status / target) : NaN;
                if (Number.isFinite(currentRatio) && Number.isFinite(weight) && currentRatio < weight) {
                    $countRow.css("background-color", "#FF6464");
                } else {
                    $countRow.css("background-color", "");
                }
            });
        }

        function scheduleApply() {
            clearTimeout(window._madadAlertTimer);
            window._madadAlertTimer = setTimeout(applyMadadAlerts, 150);
        }

        function toNode(el) {
            if (!el) {
                return null;
            }
            if (el.nodeType === 1 || el.nodeType === 9) {
                return el;
            }
            if (el.jquery || (typeof el.length === "number" && el[0])) {
                return el[0] && el[0].nodeType ? el[0] : null;
            }
            return null;
        }

        applyMadadAlerts();

        $(document)
            .off(".madadWeight")
            .on("input.madadWeight change.madadWeight focusout.madadWeight", function() {
                scheduleApply();
            });

        var observeRoot = toNode(data && data.ele)
            || toNode(findWeightTable().closest("div"))
            || document.body;
        if (window._madadAlertObserver) {
            window._madadAlertObserver.disconnect();
        }
        window._madadAlertObserver = new MutationObserver(function(mutations) {
            var relevant = mutations.some(function(m) {
                return m.type !== "attributes";
            });
            if (relevant) {
                scheduleApply();
            }
        });
        window._madadAlertObserver.observe(observeRoot, {
            childList: true,
            subtree: true,
            characterData: true
        });
    });
});

window.setInterval(function(){
    $('[ng-click="refreshData()"]').click();
}, 600000);
