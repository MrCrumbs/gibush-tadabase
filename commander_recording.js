TB.render('component_10', function(data) {
    setTimeout(() => {
        $('.pull-left, .form-inline').addClass('pull-right').removeClass('pull-left').css("direction", "rtl");
        $(".filter-tabs li:last a").text("נקה סינון");
        $(".t-filter-button-text").text(" הוסף מסננים");
        $(".input-group input").attr("placeholder", "חיפוש");
        
        // Add comments column to the table
        addCommentsColumn();
        trun();
    });
});

// Global variable to store the assessor mapping
let assessorMapping = new Map();

// Store the original XHR open method
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function () {
  this.addEventListener("load", function () {
    try {
      const response = JSON.parse(this.responseText);
      console.log("Tadabase response:", response);
      
      // Check if this is the assessor data response
      if (response.items && Array.isArray(response.items)) {
        // Clear previous mapping
        assessorMapping.clear();
        
        // Create mapping of assessor number (field_1530) to assessor ID
        response.items.forEach(item => {
          if (item.field_1530 && item.id) {
            assessorMapping.set(item.field_1530.toString(), item.id);
            // console.log(`Mapped assessor ${item.field_1530} to ID: ${item.id}`);
          }
        });
        
        console.log(`Total assessors mapped: ${assessorMapping.size}`);
        console.log("Assessor mapping:", Object.fromEntries(assessorMapping));
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

// Helper function to get assessor number from a table row
function getAssessorNumberFromRow(row) {
    // Get the last cell (last column) which contains the assessor number
    const lastCell = row.querySelector('td:last-child');
    if (lastCell) {
        const text = lastCell.textContent.trim();
        // Check if it's a number (assessor number)
        if (/^\d+$/.test(text)) {
            return parseInt(text);
        }
    }
    return null;
}

// Function to update assessor record in Tadabase via backend
async function updateAssessorRecord(assessorId, assessorNumber, value) {
    try {
        // Prepare the payload for your backend
        const payload = {
            assessor_id: assessorId,
            comment: value
        };
        
        // Make the API call to your backend
        const response = await fetch('https://misc-ten.vercel.app/update_commander_comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(`Successfully updated record for assessor ${assessorNumber}:`, result);
            
            // Refresh the table to show updated data
            const refreshButton = document.querySelector('.t-refresh-button');
            if (refreshButton) {
                refreshButton.click();
            }
        } else {
            const errorData = await response.json();
            console.error(`Failed to update record for assessor ${assessorNumber}:`, response.status, errorData.error);
        }
    } catch (error) {
        console.error(`Error updating record for assessor ${assessorNumber}:`, error);
    }
}

function addCommentsColumn() {
    // Find the table
    const table = document.querySelector('table');
    if (!table) return;
    
    // Add header cell if it doesn't exist
    const thead = table.querySelector('thead');
    if (thead) {
        const headerRow = thead.querySelector('tr');
        if (headerRow) {
            const existingHeader = headerRow.querySelector('.comments-column-header');
            if (!existingHeader) {
                const newHeaderCell = document.createElement('th');
                newHeaderCell.textContent = 'הערות';
                newHeaderCell.className = 'comments-column-header';
                
                // Insert as third column (index 2, before the 4th column)
                const fourthCell = headerRow.children[2];
                if (fourthCell) {
                    headerRow.insertBefore(newHeaderCell, fourthCell);
                } else {
                    // If there's no fourth column, append to the end
                    headerRow.appendChild(newHeaderCell);
                }
            }
        }
    }
    
    // Always add data cells to each row (since tbody gets refreshed)
    const tbody = table.querySelector('tbody');
    if (tbody) {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            // Check if this row already has a comments cell
            const existingCell = row.querySelector('.comments-column-cell');
            if (existingCell) {
                console.log('Row already has comments cell, skipping...');
                return;
            }
            
            const newDataCell = document.createElement('td');
            newDataCell.className = 'comments-column-cell';
            
            // Create record button
            const recordButton = document.createElement('button');
            recordButton.className = 'record-button';
            
            // Add FontAwesome icon
            const icon = document.createElement('i');
            icon.className = 'fas fa-microphone';
            recordButton.appendChild(icon);
            
            // Add click functionality (you can customize this)
            recordButton.addEventListener('click', async () => {
                // console.log('Record button clicked for row:', row);
                
                // Check if we're currently recording
                if (currentMediaRecorder && currentMediaRecorder.state === 'recording') {
                    // Stop the current recording
                    stopRecording();
                    return;
                }
                
                // Get the assessee number from this row
                const assessorNumber = getAssessorNumberFromRow(row);
                if (assessorNumber) {
                    // Get the assessor ID from our mapping
                    const assessorId = assessorMapping.get(assessorNumber.toString());
                    if (assessorId) {
                        console.log(`Starting recording for assessor ${assessorNumber} (ID: ${assessorId})`);
                        
                        // Start recording audio
                        console.log('Starting recording...');
                        const audioBlob = await startRecording(recordButton);
                        console.log('Recording finished, audioBlob:', audioBlob ? 'exists' : 'null');
                        
                        if (audioBlob && audioBlob.size > 0) {
                            console.log('Audio blob size:', audioBlob.size, 'bytes');
                            // Show processing state
                            recordButton.classList.add('processing');
                            recordButton.innerHTML = '<i class="fas fa-spinner"></i>';
                            
                            try {
                                // Send audio for transcription
                                const transcription = await transcribeRecording(audioBlob);
                                
                                if (transcription) {
                                    // Update the record in Tadabase with transcription
                                    await updateAssessorRecord(assessorId, assessorNumber, transcription);
                                }
                            } finally {
                                // Reset button to normal state
                                recordButton.classList.remove('processing');
                                recordButton.innerHTML = '<i class="fas fa-microphone"></i>';
                            }
                        } else {
                            console.log('No valid audio blob received, skipping processing');
                        }
                    }
                    else {
                        console.log(`No mapping found for assessor number: ${assessorNumber}`);
                    }
                }
                else {
                    console.log('Could not find assessor number in row');
                }
            });
            
            newDataCell.appendChild(recordButton);
            
            // Insert as third column (index 2, before the 4th column)
            const fourthCell = row.children[2];
            if (fourthCell) {
                row.insertBefore(newDataCell, fourthCell);
            } else {
                // If there's no fourth column, append to the end
                row.appendChild(newDataCell);
            }
        });
    }
}

// Global variables to track recording state
let currentMediaRecorder = null;
let currentStream = null;
let currentButton = null;

// Function to start audio recording
async function startRecording(button) {
    try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create MediaRecorder
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks = [];
        
        // Store references globally
        currentMediaRecorder = mediaRecorder;
        currentStream = stream;
        currentButton = button;
        
        // Update button appearance to show recording
        button.innerHTML = '<i class="fas fa-stop"></i>';
        button.classList.add('recording');
        
        return new Promise((resolve) => {
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                console.log('MediaRecorder stopped, chunks:', audioChunks.length);
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
                
                // Create audio blob
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                console.log('Created audio blob, size:', audioBlob.size, 'bytes');
                
                // Reset button appearance
                button.innerHTML = '<i class="fas fa-microphone"></i>';
                button.classList.remove('recording');
                
                // Clear global references
                currentMediaRecorder = null;
                currentStream = null;
                currentButton = null;
                
                resolve(audioBlob);
            };
            
            // Start recording
            mediaRecorder.start();
            
            // Set a 10-second timeout to automatically stop recording
            const timeoutId = setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    console.log('10-second timeout reached, stopping recording automatically');
                    mediaRecorder.stop();
                }
            }, 10000); // 10 seconds
            
            // Store the timeout ID so we can clear it if user stops manually
            mediaRecorder.timeoutId = timeoutId;
        });
    } catch (error) {
        console.error('Error starting recording:', error);
        return null;
    }
}

// Function to stop current recording
function stopRecording() {
    console.log('stopRecording called, currentMediaRecorder:', currentMediaRecorder ? 'exists' : 'null');
    if (currentMediaRecorder && currentMediaRecorder.state === 'recording') {
        console.log('Stopping recording manually...');
        // Clear the timeout if user stops manually
        if (currentMediaRecorder.timeoutId) {
            clearTimeout(currentMediaRecorder.timeoutId);
            currentMediaRecorder.timeoutId = null;
        }
        currentMediaRecorder.stop();
    } else {
        console.log('No active recording to stop');
    }
}

// Function to transcribe audio recording
async function transcribeRecording(audioBlob) {
    console.log(`Transcribing recording`);
    try {
        // Convert audio blob to base64
        // alert("before arrayBuffer");
        // const arrayBuffer = await audioBlob.arrayBuffer();
        // alert("before base64Audio");
        // const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        // alert("after base64Audio");
        const base64Audio = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = () => {
                reject(new Error('Failed to read audio file'));
            };
            reader.readAsDataURL(audioBlob);
        });

        // Prepare the payload for your backend
        const payload = {
            audio_blob: base64Audio,
            method: "ivrit"
        };
        
        console.log('Sending transcription request, payload size:', JSON.stringify(payload).length, 'characters');
        
        // Make the API call to your backend
        const response = await fetch('https://misc-ten.vercel.app/transcribe_audio_assessors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(`Successfully transcribed recording:`, result);
            return result.transcription;
        } else {
            const errorData = await response.json();
            console.log(`Failed to transcribe recording:`, response.status, errorData.error);
            return null;
        }
    } catch (error) {
        console.log(`Error transcribing recording:`, error);
        return null;
    }
}


function showMore(id, event) {
    // Prevent the click from bubbling up to parent elements (which would open the editing modal)
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    document.getElementById(id + 'Overflow').className = '';
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

// Helper function to strip HTML tags and get plain text content
function getPlainTextContent(htmlString) {
    // Create a temporary div element to parse HTML
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString.replaceAll("&nbsp;", " ");
    // Get text content without HTML tags
    return tempDiv.textContent || tempDiv.innerText || '';
}

function stripLeadingWhitespaceAndEmptyTags(html) {
    // remove leading whitespace
    html = html.replace(/^[\s\n\r]+/, '');
  
    // drop empty <p> or <span> wrappers at the start
    html = html.replace(/^<(p|span)(\s[^>]*)?>\s*<\/\1>/i, '');
  
    return html;
  }

// Helper function to split HTML content at a specific text length
// Returns an object with { truncated: "...", remainder: "..." }
function truncateHtmlAtTextLength(htmlString, maxTextLength) {
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString.replaceAll("&nbsp;", " ");
    
    // Get the plain text to find the split point
    var plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    if (plainText.length <= maxTextLength) {
        return {
            truncated: htmlString,
            remainder: ''
        };
    }
    
    // Find the text split point (at word boundary)
    var splitPoint = maxTextLength;
    var textToSplit = plainText.substring(0, maxTextLength);
    var lastSpaceIndex = textToSplit.lastIndexOf(' ');
    if (lastSpaceIndex > 0) {
        splitPoint = lastSpaceIndex;
    }
    
    // Now we need to find where this text position maps to in the HTML
    var textPosition = 0;
    var htmlPosition = 0;
    var truncatedHtml = '';
    var foundSplitPoint = false;
    
    function processNodes(node) {
        if (foundSplitPoint) return;
        
        if (node.nodeType === Node.TEXT_NODE) {
            var text = node.textContent;
            
            if (textPosition + text.length <= splitPoint) {
                // This entire text node goes in the truncated part
                truncatedHtml += text;
                textPosition += text.length;
            } else {
                // This text node spans the split point
                var charsFromThisNode = splitPoint - textPosition;
                var truncatedText = text.substring(0, charsFromThisNode);
                
                // Try to break at word boundary within this node
                var lastSpace = truncatedText.lastIndexOf(' ');
                if (lastSpace > 0) {
                    truncatedText = truncatedText.substring(0, lastSpace);
                }
                
                truncatedHtml += truncatedText;
                foundSplitPoint = true;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            var tagName = node.tagName.toLowerCase();
            var attributes = '';
            
            // Preserve attributes
            for (var i = 0; i < node.attributes.length; i++) {
                var attr = node.attributes[i];
                attributes += ' ' + attr.name + '="' + attr.value + '"';
            }
            
            truncatedHtml += '<' + tagName + attributes + '>';
            
            // Process child nodes
            for (var j = 0; j < node.childNodes.length; j++) {
                processNodes(node.childNodes[j]);
                if (foundSplitPoint) break;
            }
            
            truncatedHtml += '</' + tagName + '>';
        }
    }
    
    // Process all child nodes to build truncated HTML
    for (var i = 0; i < tempDiv.childNodes.length; i++) {
        processNodes(tempDiv.childNodes[i]);
        if (foundSplitPoint) break;
    }
    
    // Create remainder HTML by creating a new div with the original content
    // and removing the truncated text from the beginning
    var remainderDiv = document.createElement('div');
    remainderDiv.innerHTML = htmlString.replaceAll("&nbsp;", " ");
    var remainderPlainText = (remainderDiv.textContent || remainderDiv.innerText || '');
    
    // Find the actual split point in plain text
    var truncatedPlainText = getPlainTextContent(truncatedHtml);
    var actualSplitPoint = truncatedPlainText.length;
    
    // Skip any spaces at the split point
    while (actualSplitPoint < remainderPlainText.length && remainderPlainText[actualSplitPoint] === ' ') {
        actualSplitPoint++;
    }
    
    // Extract remainder text
    var remainderText = remainderPlainText.substring(actualSplitPoint);
    
    // Now rebuild the HTML structure with only the remainder text
    var remainderHtml = htmlString.replaceAll("&nbsp;", " ");
    
    // Simple approach: create a temporary div, extract text, and find HTML that contains this text
    var tempDiv2 = document.createElement('div');
    tempDiv2.innerHTML = remainderHtml;
    
    // Remove text from the beginning until we have only the remainder
    function removeTextFromBeginning(node, textToRemove) {
        if (textToRemove <= 0) return 0;
        
        if (node.nodeType === Node.TEXT_NODE) {
            var text = node.textContent;
            if (text.length <= textToRemove) {
                node.textContent = '';
                return textToRemove - text.length;
            } else {
                node.textContent = text.substring(textToRemove);
                return 0;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (var i = 0; i < node.childNodes.length; i++) {
                textToRemove = removeTextFromBeginning(node.childNodes[i], textToRemove);
                if (textToRemove <= 0) break;
            }
            return textToRemove;
        }
        return textToRemove;
    }
    
    removeTextFromBeginning(tempDiv2, actualSplitPoint);
    var remainderHtmlResult = tempDiv2.innerHTML;
    remainderHtmlResult = stripLeadingWhitespaceAndEmptyTags(remainderHtmlResult);
    if (truncatedPlainText.trim().endsWith('*')) {
        remainderHtmlResult = remainderHtmlResult
          .replace(/^[\s\n\r]+/, '')
          .replace(/^<p>(\s*<span[^>]*>\s*<\/span>\s*)*<\/p>/i, '')
          .replace(/^(<span[^>]*>\s*)/i, match => match.replace(/\s+$/, ' '));
      } else {
        remainderHtmlResult = ' ' + remainderHtmlResult;
      }
    
    // Check if truncated part ends with "*" and remainder starts with whitespace/newline
    // If so, strip leading whitespace from remainder to keep text adjacent to "*"
    var truncatedTextEnd = getPlainTextContent(truncatedHtml).trim();
    if (truncatedTextEnd.endsWith('*')) {
        // Strip leading whitespace (spaces, newlines, tabs) from remainder
        remainderHtmlResult = remainderHtmlResult.replace(/^[\s\n\r\t]+/, '');
    } else {
        // Add a space before remainder for normal cases
        remainderHtmlResult = " " + remainderHtmlResult;
    }
    
    return {
        truncated: truncatedHtml,
        remainder: remainderHtmlResult
    };
}
var trun = function(){
    if(!$('.shrinkables').length){
        var len = 40;
        var shrinkables = $('tbody td span');
        if (shrinkables.length > 0) {
            for (var i = 0; i < shrinkables.length; i++) {
                var fullText = shrinkables[i].innerHTML.replaceAll("&nbsp;", " ");
                var plainText = getPlainTextContent(fullText);
                // console.log("fullText:", fullText);
                // console.log("plainText:", plainText);
                // console.log("plainText length:", plainText.length);
                
                // Use plain text length for comparison, but keep full HTML for display
                if (plainText.length > len && !fullText.includes("badge")) { //&& !$(shrinkables[i].offsetParent).hasClass('allow-inline-edit')
                    // Find the truncation point in the original HTML based on plain text length
                    var truncationResult = truncateHtmlAtTextLength(fullText, len);
                    var id = 'shrinkable' + i;
                    shrinkables[i].innerHTML = '<span class="shrinkables">' + truncationResult.truncated + '<span class="hidden" id="' + id + 'Overflow">' + truncationResult.remainder + '</span></span>&nbsp;<a id="' + id + 'MoreLink" style="cursor:pointer;color:blue;" onclick="showMore(\'' + id + '\', event);">הצג עוד</a><a class="hidden" style="cursor:pointer;color:blue;" id="' + id + 'LessLink" onclick="showLess(\'' + id + '\', event);">הצג פחות</a>';
    
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