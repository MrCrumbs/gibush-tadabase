TB.render('component_3', function(data) {
    setTimeout(() => {
        $("#hichartsJS").remove();
        var assesseesInitialElement = document.querySelector("article div[ui-view]");
        const existing = assesseesInitialElement.nextSibling;
        if (existing) existing.remove();
        $('.pull-left, .form-inline').addClass('pull-right').removeClass('pull-left').css("direction", "rtl");
        $(".filter-tabs li:last a").text("נקה סינון");
        $(".t-filter-button-text").text(" הוסף מסננים");
        $(".input-group input").attr("placeholder", "חיפוש");
        $(".t-export-button").text("ייצוא");
        
        // Add comments column to the table
        addCommentsColumn();
    });
});

// Global variable to store the assessee mapping
let assesseeMapping = new Map();

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
        // Clear previous mapping
        assesseeMapping.clear();
        
        // Create mapping of assessee number (field_61) to assessee ID
        response.items.forEach(item => {
          if (item.field_61 && item.id) {
            assesseeMapping.set(item.field_61.toString(), item.id);
            // console.log(`Mapped assessee ${item.field_61} to ID: ${item.id}`);
          }
        });
        
        console.log(`Total assessees mapped: ${assesseeMapping.size}`);
        console.log("Assessee mapping:", Object.fromEntries(assesseeMapping));
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

// Helper function to get assessee number from a table row
function getAssesseeNumberFromRow(row) {
    // Get the first cell (first column) which contains the assessee number
    const firstCell = row.querySelector('td:first-child');
    if (firstCell) {
        const text = firstCell.textContent.trim();
        // Check if it's a number (assessee number)
        if (/^\d+$/.test(text)) {
            return parseInt(text);
        }
    }
    
    return null;
}

// Function to update assessee record in Tadabase via backend
async function updateAssesseeRecord(assesseeId, assesseeNumber, value) {
    try {
        // Prepare the payload for your backend
        const payload = {
            app: "gibush",
            table_id: "JDXQ80QYRl",
            record_id: assesseeId,
            record_update: {
                "field_1521": value
            }
        };
        
        // Make the API call to your backend
        const response = await fetch('https://misc-ten.vercel.app/update_record_in_tadabase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(`Successfully updated record for assessee ${assesseeNumber}:`, result);
            
            // Refresh the table to show updated data
            const refreshButton = document.querySelector('.t-refresh-button');
            if (refreshButton) {
                refreshButton.click();
            }
        } else {
            const errorData = await response.json();
            console.error(`Failed to update record for assessee ${assesseeNumber}:`, response.status, errorData.error);
        }
    } catch (error) {
        console.error(`Error updating record for assessee ${assesseeNumber}:`, error);
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
                
                // Insert as third column (index 2)
                const thirdCell = headerRow.children[2];
                if (thirdCell) {
                    headerRow.insertBefore(newHeaderCell, thirdCell);
                } else {
                    // If there's no third column, append to the end
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
                const assesseeNumber = getAssesseeNumberFromRow(row);
                if (assesseeNumber) {
                    // Get the assessee ID from our mapping
                    const assesseeId = assesseeMapping.get(assesseeNumber.toString());
                    if (assesseeId) {
                        console.log(`Starting recording for assessee ${assesseeNumber} (ID: ${assesseeId})`);
                        
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
                                    await updateAssesseeRecord(assesseeId, assesseeNumber, transcription);
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
                        console.log(`No mapping found for assessee number: ${assesseeNumber}`);
                    }
                }
                else {
                    console.log('Could not find assessee number in row');
                }
            });
            
            newDataCell.appendChild(recordButton);
            
            // Insert as third column (index 2) in the row
            const thirdCell = row.children[2];
            if (thirdCell) {
                row.insertBefore(newDataCell, thirdCell);
            } else {
                // If there's no third column, append to the end
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
            audio_blob: base64Audio
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
            return result.transcription || result.text; // Adjust based on your backend response
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