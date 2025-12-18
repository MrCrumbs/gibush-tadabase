var initialElement = null;
var currentGame = null;
var currentTeamNumber = "{loggedInUser.צוות שטח}";
var currentTeamID = null;
var assesseeNumbers = [];
var raceAssesseesOrder = null;
var stretcherBracketResults = null;
var firstPlaceBracketResults = null;
var jerrycanResultsBracketResults = null;
var activityNumberMap = {};
var numberToIdMap = {};
var engToHeb = {
    "sprints": "ספרינטים", "crawls": "זחילות", "sociometric_stretcher": "אלונקה סוציומטרית", 
    "holes": "חפירת בור", "sacks": "שקים"
}

TB.render("component_9", async function (data) {

    if(!initialSetup()){
        return;
    }
    
    sacks();
});

function initialSetup(){
    window.trun = function() { return false; };
    initialElement = document.querySelector("article div[ui-view]");
    const existing = initialElement.nextSibling;
    if (existing) existing.remove();

    return true;
}
function sacks(){
    
    // Create button container for both reset and back to menu buttons
    const topButtonContainer = document.createElement("div");
    topButtonContainer.className = "top-button-container";
    initialElement.appendChild(topButtonContainer);
    
    // Create back to menu button
    const backButton = document.createElement("button");
    backButton.className = "back-button";
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
    topButtonContainer.appendChild(backButton);
    
    // Create reset button
    const resetButton = document.createElement("button");
    resetButton.className = "reset-button";
    resetButton.innerHTML = '<i class="fas fa-trash" style="margin-right: 5px;"></i> איפוס';
    topButtonContainer.appendChild(resetButton);
    
    // Create instructions div
    const instructionsDiv = document.createElement("div");
    instructionsDiv.className = "instructions";
    instructionsDiv.textContent = "לחיצה על הכדור מוסיפה הקפה. לחיצה ארוכה להורדת הקפות.";
    initialElement.appendChild(instructionsDiv);

    // Undo button (cancel last action)
    const actionStack = [];
    const undoButton = document.createElement("button");
    undoButton.className = "undo-button";
    undoButton.textContent = "בטל פעולה אחרונה";
    undoButton.disabled = true;
    const updateUndoButtonState = () => {
        undoButton.disabled = actionStack.length === 0;
    };
    undoButton.addEventListener("click", () => {
        const last = actionStack.pop();
        if (!last) return;
        const card = document.querySelector(`.assessee-card[data-number="${last.number}"]`);
        const lapCounter = card?.querySelector(".lap-counter");
        if (!lapCounter) return;
        const current = parseInt(lapCounter.textContent) || 0;
        // Inverse the last delta
        const next = Math.max(0, current - last.delta);
        lapCounter.textContent = next.toString();
        saveSacksData();
        updateUndoButtonState();
    });
    initialElement.appendChild(undoButton);
    
    // Create main container
    const sacksContainer = document.createElement("div");
    sacksContainer.className = "sacks-container";
    initialElement.appendChild(sacksContainer);
    
    // Create grid for assessees
    const assesseesGrid = document.createElement("div");
    assesseesGrid.className = "assessees-grid";
    sacksContainer.appendChild(assesseesGrid);
    
    // Load existing data from localStorage
    const sacksData = JSON.parse(localStorage.getItem("sacksData") || "{}");
    
    // Create assessee balls
    let assesseeNumbers = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
    assesseeNumbers.forEach(assesseeNumber => {
        const assesseeCard = document.createElement("div");
        assesseeCard.className = "assessee-card";
        assesseeCard.dataset.number = assesseeNumber;

        const ball = document.createElement("div");
        ball.className = "assessee-ball";
        ball.textContent = assesseeNumber;

        const lapCounter = document.createElement("div");
        lapCounter.className = "lap-counter";
        lapCounter.textContent = sacksData[assesseeNumber] || "0";

        // Interaction: tap to increment, long-press to show minus button
        let pressTimer = null;
        let longPressTriggered = false;
        let minusButton = null;

        const clearPressTimer = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        };

        const hideMinusButton = () => {
            if (minusButton) {
                minusButton.remove();
                minusButton = null;
            }
        };

        ball.addEventListener("pointerdown", (e) => {
            e.preventDefault();
            longPressTriggered = false;
            hideMinusButton(); // Hide any existing minus button
            
            pressTimer = setTimeout(() => {
                longPressTriggered = true;
                
                // Create and show minus button near the ball
                minusButton = document.createElement("button");
                minusButton.className = "long-press-minus";
                minusButton.textContent = "-";
                minusButton.style.position = "absolute";
                
                // Position the minus button above the ball
                const ballRect = ball.getBoundingClientRect();
                minusButton.style.left = (ballRect.left + ballRect.width/2 - 12) + "px";
                minusButton.style.top = (ballRect.top - 30) + "px";
                minusButton.style.zIndex = "1000";
                
                // Add click event to decrement
                minusButton.addEventListener("click", () => {
                    const currentCount = parseInt(lapCounter.textContent) || 0;
                    if (currentCount > 0) {
                        lapCounter.textContent = (currentCount - 1).toString();
                        actionStack.push({ number: assesseeNumber, delta: -1 });
                        updateUndoButtonState();
                        saveSacksData();
                    }
                    hideMinusButton();
                });
                
                document.body.appendChild(minusButton);
                
                // Auto-hide after 3 seconds
                setTimeout(hideMinusButton, 3000);
            }, 500);
        });

        ball.addEventListener("pointerup", (e) => {
            e.preventDefault();
            if (!longPressTriggered) {
                const currentCount = parseInt(lapCounter.textContent) || 0;
                lapCounter.textContent = (currentCount + 1).toString();
                actionStack.push({ number: assesseeNumber, delta: +1 });
                updateUndoButtonState();
                saveSacksData();
            }
            clearPressTimer();
        });

        ball.addEventListener("pointercancel", clearPressTimer);
        ball.addEventListener("pointerleave", clearPressTimer);

        assesseeCard.appendChild(ball);
        assesseeCard.appendChild(lapCounter);
        assesseesGrid.appendChild(assesseeCard);
    });
    
    // Create submit container
    const submitContainer = document.createElement("div");
    submitContainer.className = "submit-container";
    const submitButton = document.createElement("button");
    submitButton.className = "submit-button";
    submitButton.textContent = "שליחה";
    submitContainer.appendChild(submitButton);
    initialElement.appendChild(submitContainer);
    
    // Back button event
    backButton.addEventListener("click", () => {
        // Remove all created elements after initialElement
        sacksContainer.remove();
        submitContainer.remove();
        topButtonContainer.remove();
        activityNameDisplay.remove();
        instructionsDiv.remove();

        // Reset current game
        currentGame = null;
        
        // Display main menu
        displayMenu();
    });
    
    // Reset button event
    resetButton.addEventListener("click", () => {
        if (confirm("האם אתה בטוח שברצונך לאפס את כל הנתונים?")) {
            localStorage.removeItem("sacksData");
            document.querySelectorAll(".lap-counter").forEach(counter => {
                counter.textContent = "0";
            });
            actionStack.length = 0;
            updateUndoButtonState();
        }
    });
    
    // Submit button event
    submitButton.addEventListener("click", async () => {
        // Show loading
        showLoading();
        
        // Build result string
        const resultString = buildSacksResultString();
        console.log("resultString:", resultString);
        if (resultString.length === 0) {
            hideLoading();
            alert("לא ניתן לשלוח מקצה ריק.");
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        submitButton.textContent = "שולח...";
        
        // Submit activity (activity_number is 1 for sacks)
        const succeeded = await submitActivity(currentTeamNumber, currentTeamID, "sacks", 1, resultString);
        
        // Hide loading
        hideLoading();
        
        if (succeeded) {
            // Show loading state
            submitButton.disabled = false;
            submitButton.textContent = "שליחה";

            // Show success toast
            showSuccessToast("הטופס נשלח בהצלחה! חוזר לתפריט...");
            
            // Clear localStorage after successful submission
            localStorage.removeItem("sacksData");
            
            // Update activity number to track completion
            updateActivityNumber("sacks", 1);
            
            // Wait 2 seconds before going back to menu so user can see the success message
            setTimeout(() => {
                // Reset current game
                currentGame = null;

                // Remove all created elements after initialElement
                sacksContainer.remove();
                submitContainer.remove();
                topButtonContainer.remove();
                activityNameDisplay.remove();
                instructionsDiv.remove();
                
                // Display main menu
                displayMenu();
            }, 2000);
        } else {
            alert("שגיאה בשליחת נתונים לשרת. נא לנסות שנית.");
            // Show loading state
            submitButton.disabled = false;
            submitButton.textContent = "שליחה";
        }
    });
    
    // Helper function to save data to localStorage
    function saveSacksData() {
        const data = {};
        document.querySelectorAll(".assessee-card").forEach(card => {
            const number = card.dataset.number;
            const count = parseInt(card.querySelector(".lap-counter").textContent);
            data[number] = count;
        });
        localStorage.setItem("sacksData", JSON.stringify(data));
    }
    
    // Helper function to build result string
    function buildSacksResultString() {
        const results = [];
        document.querySelectorAll(".assessee-card").forEach(card => {
            const number = card.dataset.number;
            const count = parseInt(card.querySelector(".lap-counter").textContent);
            const id = numberToIdMap[number];
            if (count > 0) {
                results.push(`${number}:${id}-${count}`);
            }
        });
        return results.join(",");
    }
}
