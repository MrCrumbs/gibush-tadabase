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
    "holes_obstacle": "חפירת בור מכשול", "holes_personal_group": "חפירת בור אישי קבוצתי", "sacks": "שקים"
}

TB.render("component_9", async function (data) {

    initialSetup();
    
    if (currentGame === null) {
        showLoading();
        
        listenToAssesseeChanges();
        selectTeam();
        await syncActivityNumbers(); 
        
        hideLoading();
        displayMenu();
    }

    activityNumberMap = JSON.parse(localStorage.getItem("gameState") || "{}");
    const activityNumbers = activityNumberMap[currentGame] || [];
    const highestNumber = activityNumbers.length > 0 ? Math.max(...activityNumbers.map(Number)) : 0;
    const nextActivityNumber = highestNumber + 1;
    switch (currentGame){
        case "sprints":
            sprintsOrCrawls("sprints", nextActivityNumber);
            break;
        case "crawls":
            sprintsOrCrawls("crawls", nextActivityNumber);
            break;
        case "sacks":
            sacks();
            break;
        case "holes_obstacle":
            holesObstacleOrPersonalGroup("holes_obstacle");
            break;
        case "holes_personal_group":
            holesObstacleOrPersonalGroup("holes_personal_group");
            break;
        case "sociometric_stretcher":
            sociometricStretcher(nextActivityNumber);
            break;
    }
});

async function syncActivityNumbers() {
    const localState = JSON.parse(localStorage.getItem("gameState") || "{}");
    console.log("in syncActivityNumbers, localState:", localState);
    activityNumberMap = localState;

    try {
        const response = await fetch("https://misc-ten.vercel.app/get_game_state_for_team", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                team_number: currentTeamNumber
            })
        });

        if (!response.ok) {
            console.error("Failed to fetch game state:", response.statusText);
            return;
        }

        const data = await response.json();
        console.log("in syncActivityNumbers, fetched from server and updating to:", data);

        if (Object.keys(data).length === 0) {
            console.log("No game state data for team:", currentTeamNumber);
        }

        activityNumberMap = data;
        localStorage.setItem("gameState", JSON.stringify(activityNumberMap));
    } catch (error) {
        console.error("Error fetching game state:", error);
    }
} 

function listenToAssesseeChanges(){
    console.log("listening to assessee changes");
    $("#field_block_field_1482").change(() => {
        console.log("team changed");
        const container = document.querySelector("#field_block_field_1483");
        const observer = new MutationObserver(() => {
            const options = container.querySelectorAll('option');
            Array.from(options).forEach(opt => {
                const text = opt.textContent.trim();
                const value = opt.value.trim();
                if (/^\d+$/.test(text) && value !== "") {
                    numberToIdMap[Number(text)] = value;
                }
            });
            console.log("numberToIdMap:", numberToIdMap);
            assesseeNumbers = Object.keys(numberToIdMap);
            console.log("assessee numbers loaded: " + JSON.stringify(assesseeNumbers));
  
            observer.disconnect(); // stop observing after the first update
        });
        observer.observe(container, { childList: true, subtree: true });
    });
}

function selectTeam(){
    setTimeout(() => {
        $('#field_block_field_1482 select.select2').each(function () {
            const $select = $(this);
            const $options = $select.find('option').filter(function () {
                return $(this).val(); // Excludes empty value options
            });
    
            if ($options.length === 1) {
                currentTeamID = $options.first().val();
                $select.val(currentTeamID).trigger('change'); // select and trigger change event
            }
            console.log("selected team, currentTeamID:", currentTeamID);
        });
    }, 100);
}

function initialSetup(){
    window.trun = function() { return false; };
    initialElement = document.querySelector("article div[ui-view]");
    const existing = initialElement.nextSibling;
    if (existing) existing.remove();

    if(!currentTeamNumber){
        alert("המשתמש לא מחובר, נא להתחבר ולנסות שוב");
        return;
    }
}

function displayMenu(){
    if (!initialElement) return;
    
    // Create menu container
    const menuContainer = document.createElement("div");
    menuContainer.id = "game-menu";

    // Menu items
    const games = [
        { title: "ספרינטים", translatedTitle: "sprints", icon: "🏃" },
        { title: "זחילות", translatedTitle: "crawls", icon: "🐛" },
        { title: "שקים", translatedTitle: "sacks", icon: "🎒" },
        { title: "בורות", translatedTitle: "holes", icon: "🕳️" },
        { title: "אלונקה", translatedTitle: "sociometric_stretcher", icon: "🚑️" }
    ];

    games.forEach(game => {
        const btn = document.createElement("button");
        btn.className = "game-button";
        btn.innerHTML = `<span class="game-icon">${game.icon}</span><span class="game-title">${game.title}</span>`;
        // Add onclick handler per game
        btn.addEventListener("click", function () {
            if (game.translatedTitle === "holes") {
                displayHolesSubMenu();
            } else {
                runGame(game.translatedTitle);
            }
        });
        menuContainer.appendChild(btn);
    });

    // Append menu after the initial element
    initialElement.parentNode.insertBefore(menuContainer, initialElement.nextSibling);
}

function displayHolesSubMenu(){
    // Remove existing menu
    const existingMenu = document.getElementById("game-menu");
    if (existingMenu) existingMenu.remove();
    
    // Create back button container
    const backButtonContainer = document.createElement("div");
    backButtonContainer.className = "top-button-container";
    
    // Create back button
    const backButton = document.createElement("button");
    backButton.className = "back-button";
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i>';
    backButton.addEventListener("click", () => {
        backButtonContainer.remove();
        subMenuContainer.remove();
        displayMenu();
    });
    backButtonContainer.appendChild(backButton);
    
    // Create sub-menu container
    const subMenuContainer = document.createElement("div");
    subMenuContainer.id = "holes-sub-menu";
    
    // Sub-menu items
    const holesTypes = [
        { title: "חפירת בור מכשול", holesType: "holes_obstacle", icon: "🕳️" },
        { title: "חפירת בור אישי קבוצתי", holesType: "holes_personal_group", icon: "👥" }
    ];
    
    holesTypes.forEach(holesOption => {
        const btn = document.createElement("button");
        btn.className = "game-button";
        btn.innerHTML = `<span class="game-icon">${holesOption.icon}</span><span class="game-title">${holesOption.title}</span>`;
        btn.addEventListener("click", function () {
            runGame(holesOption.holesType);
        });
        subMenuContainer.appendChild(btn);
    });
    
    // Append back button container and sub-menu after the initial element
    initialElement.parentNode.insertBefore(backButtonContainer, initialElement.nextSibling);
    initialElement.parentNode.insertBefore(subMenuContainer, backButtonContainer.nextSibling);
}

function runGame(gameTitle) {
    // Remove existing game/menu content after initialElement
    const existing = initialElement.nextSibling;
    if (existing) existing.remove();

    // Remove sub-menu if it exists (for holes game)
    if (gameTitle === "holes_obstacle" || gameTitle === "holes_personal_group") {
        const subMenu = document.getElementById("holes-sub-menu");
        if (subMenu) subMenu.remove();
    }

    currentGame = gameTitle;
    activityNumberMap = JSON.parse(localStorage.getItem("gameState") || "{}");
    const activityNumbers = activityNumberMap[currentGame] || [];
    const highestNumber = activityNumbers.length > 0 ? Math.max(...activityNumbers.map(Number)) : 0;
    const nextActivityNumber = highestNumber + 1;
    switch (currentGame){
        case "sprints":
            sprintsOrCrawls("sprints", nextActivityNumber);
            break;
        case "crawls":
            sprintsOrCrawls("crawls", nextActivityNumber);
            break;
        case "sacks":
            sacks();
            break;
        case "holes_obstacle":
            holesObstacleOrPersonalGroup("holes_obstacle");
            break;
        case "holes_personal_group":
            holesObstacleOrPersonalGroup("holes_personal_group");
            break;
        case "sociometric_stretcher":
            sociometricStretcher(nextActivityNumber);
            break;
    }
}

function holesObstacleOrPersonalGroup(activityName){
    // Check if sacks activity has already been submitted
    const gameState = JSON.parse(localStorage.getItem("gameState") || "{}");
    const holesActivities = gameState[activityName] || [];
    
    if (holesActivities.length > 0) {
        // Activity has already been submitted
        alert("מקצה זה כבר הוגש. לתיקון המקצה, עבור לעמוד תיקון מקצים בתפריט.");
        currentGame = null;
        displayHolesSubMenu();
        return;
    }

    // Create and display the activity name banner
    const activityNameDisplay = document.createElement("div");
    activityNameDisplay.className = "activity-name-banner";
    activityNameDisplay.textContent = engToHeb[activityName];
    initialElement.appendChild(activityNameDisplay);
    
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
    
    // Create main container
    const holesContainer = document.createElement("div");
    holesContainer.className = "holes-container";
    initialElement.appendChild(holesContainer);
    
    // Create assessees list
    const assesseesList = document.createElement("div");
    assesseesList.className = "assessees-list";
    holesContainer.appendChild(assesseesList);
    
    // Load existing data from localStorage
    const holesData = JSON.parse(localStorage.getItem(`${activityName}Data`) || "{}");
    console.log("holesData:", holesData);
    
    // Create assessee rows
    assesseeNumbers.forEach(assesseeNumber => {
        const assesseeRow = document.createElement("div");
        assesseeRow.className = "assessee-row";
        assesseeRow.dataset.number = assesseeNumber;
        
        // Create container for input groups
        const inputGroupsContainer = document.createElement("div");
        inputGroupsContainer.className = "input-groups-container";
        
        // Create first input group (עבודת צוות)
        const firstInputGroup = createInputGroup(
            "עבודת צוות", 
            "teamwork", 
            assesseeNumber, 
            holesData, 
            activityName
        );
        inputGroupsContainer.appendChild(firstInputGroup);
        
        // Create second input group (נחישות ואגרסיביות)
        const secondInputGroup = createInputGroup(
            "נחישות ואגרסיביות", 
            "determination", 
            assesseeNumber, 
            holesData, 
            activityName
        );
        inputGroupsContainer.appendChild(secondInputGroup);
        
        assesseeRow.appendChild(inputGroupsContainer);
        
        const assesseeNumberDiv = document.createElement("div");
        assesseeNumberDiv.className = "assessee-number-holes";
        assesseeNumberDiv.textContent = assesseeNumber;
        assesseeRow.appendChild(assesseeNumberDiv);
        
        assesseesList.appendChild(assesseeRow);
    });
    
    // Create submit container
    const submitContainer = document.createElement("div");
    submitContainer.className = "submit-container";
    const submitButton = document.createElement("button");
    submitButton.className = "submit-button";
    submitButton.textContent = "שליחה";
    submitContainer.appendChild(submitButton);
    initialElement.appendChild(submitContainer);
    
    // Helper function to create input group with plus/minus buttons
    function createInputGroup(label, fieldName, assesseeNumber, data, activityName) {
        const inputGroup = document.createElement("div");
        inputGroup.className = "input-group";
        
        const labelDiv = document.createElement("div");
        labelDiv.className = "input-label";
        labelDiv.textContent = label;
        inputGroup.appendChild(labelDiv);
        
        const inputContainer = document.createElement("div");
        inputContainer.className = "input-container";
        
        const minusButton = document.createElement("button");
        minusButton.className = "input-button minus-button";
        minusButton.textContent = "-";
        minusButton.addEventListener("click", () => {
            const input = inputContainer.querySelector(".score-input");
            const currentValue = parseInt(input.value) || 0;
            if (currentValue > 0) {
                input.value = currentValue - 1;
                
                // Remove red border when value becomes valid
                if (currentValue - 1 > 0) {
                    input.style.borderColor = "#ddd";
                }
                
                saveHolesData(activityName);
            }
        });
        
        const scoreInput = document.createElement("input");
        scoreInput.className = "score-input";
        scoreInput.type = "number";
        scoreInput.min = "0";
        scoreInput.max = "6";
        scoreInput.value = data[assesseeNumber]?.[fieldName] || "0";
        scoreInput.addEventListener("input", () => {
            const value = parseInt(scoreInput.value) || 0;
            if (value > 6) scoreInput.value = "6";
            if (value < 0) scoreInput.value = "0";
            
            // Remove red border when user enters a valid value
            if (value > 0) {
                scoreInput.style.borderColor = "#ddd";
            }
            
            saveHolesData(activityName);
        });
        
        const plusButton = document.createElement("button");
        plusButton.className = "input-button plus-button";
        plusButton.textContent = "+";
        plusButton.addEventListener("click", () => {
            const input = inputContainer.querySelector(".score-input");
            const currentValue = parseInt(input.value) || 0;
            if (currentValue < 6) {
                input.value = currentValue + 1;
                
                // Remove red border when value becomes valid
                if (currentValue + 1 > 0) {
                    input.style.borderColor = "#ddd";
                }
                
                saveHolesData(activityName);
            }
        });
        
        inputContainer.appendChild(minusButton);
        inputContainer.appendChild(scoreInput);
        inputContainer.appendChild(plusButton);
        inputGroup.appendChild(inputContainer);
        
        return inputGroup;
    }
    
    // Helper function to save data to localStorage
    function saveHolesData(activityName) {
        const data = {};
        document.querySelectorAll(".assessee-row").forEach(row => {
            const assesseeNumber = row.dataset.number;
            data[assesseeNumber] = {
                teamwork: row.querySelector(".input-group:nth-child(1) .score-input").value,
                determination: row.querySelector(".input-group:nth-child(2) .score-input").value
            };
        });
        localStorage.setItem(`${activityName}Data`, JSON.stringify(data));
    }
    
    // Helper function to build result string
    function buildHolesResultString() {
        const results = [];
        document.querySelectorAll(".assessee-row").forEach(row => {
            const assesseeNumber = row.dataset.number;
            const assesseeId = numberToIdMap[assesseeNumber];
            const teamwork = row.querySelector(".input-group:nth-child(1) .score-input").value;
            const determination = row.querySelector(".input-group:nth-child(2) .score-input").value;
            
            if (teamwork !== "0" || determination !== "0") {
                results.push(`${assesseeNumber}-${assesseeId}:${teamwork}-${determination}`);
            }
        });
        return results.join(",");
    }
    
    // Helper function to validate all inputs
    function validateInputs() {
        let isValid = true;
        document.querySelectorAll(".score-input").forEach(input => {
            if (input.value === "0") {
                isValid = false;
                input.style.borderColor = "#f44336";
            } else {
                input.style.borderColor = "#ddd";
            }
        });
        return isValid;
    }
    
    // Back button event
    backButton.addEventListener("click", () => {
        // Remove all created elements after initialElement
        holesContainer.remove();
        submitContainer.remove();
        topButtonContainer.remove();
        activityNameDisplay.remove();

        // Reset current game
        currentGame = null;
        
        // Display main menu
        displayMenu();
    });
    
    // Reset button event
    resetButton.addEventListener("click", () => {
        if (confirm("האם אתה בטוח שברצונך לאפס את כל הנתונים?")) {
            localStorage.removeItem(`${activityName}Data`);
            document.querySelectorAll(".score-input").forEach(input => {
                input.value = "0";
            });
        }
    });
    
    // Submit button event
    submitButton.addEventListener("click", async () => {
        if (!validateInputs()) {
            alert("יש לתת ציונים לכל המוערכים.");
            return;
        }
        
        const resultString = buildHolesResultString();
        console.log("resultString:", resultString);
        
        // Show loading state
        submitButton.disabled = true;
        submitButton.textContent = "שולח...";
        
        const succeeded = await submitActivity(currentTeamNumber, currentTeamID, activityName, 1, resultString);
        
        if (succeeded) {
            // Show success toast
            showSuccessToast();
            
            // Clear localStorage after successful submission
            localStorage.removeItem(`${activityName}Data`);
            
            // Update activity number to track completion
            updateActivityNumber(activityName, 1);
            
            // Wait 2 seconds before going back to menu
            setTimeout(() => {
                // Remove all created elements after initialElement
                holesContainer.remove();
                submitContainer.remove();
                topButtonContainer.remove();
                activityNameDisplay.remove();
                
                // Reset current game
                currentGame = null;
                
                // Display main menu
                displayMenu();
            }, 2000);
        } else {
            // Reset button state on failure
            submitButton.disabled = false;
            submitButton.textContent = "שליחה";
        }
    });
}

function sacks(){
    // Check if sacks activity has already been submitted
    const gameState = JSON.parse(localStorage.getItem("gameState") || "{}");
    const sacksActivities = gameState["sacks"] || [];
    
    if (sacksActivities.length > 0) {
        // Sacks activity has already been submitted
        alert("מקצה השקים כבר הוגש. לתיקון המקצה, עבור לעמוד תיקון מקצים בתפריט.");
        currentGame = null;
        displayMenu();
        return;
    }
    
    // Create and display the activity name banner
    const activityNameDisplay = document.createElement("div");
    activityNameDisplay.className = "activity-name-banner";
    activityNameDisplay.textContent = engToHeb["sacks"];
    initialElement.appendChild(activityNameDisplay);
    
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
    
    // Create assessee cards
    assesseeNumbers.forEach(assesseeNumber => {
        const assesseeCard = document.createElement("div");
        assesseeCard.className = "assessee-card";
        assesseeCard.dataset.number = assesseeNumber;
        
        const assesseeNumberDiv = document.createElement("div");
        assesseeNumberDiv.className = "assessee-number";
        assesseeNumberDiv.textContent = assesseeNumber;
        assesseeCard.appendChild(assesseeNumberDiv);
        
        const counterContainer = document.createElement("div");
        counterContainer.className = "counter-container";
        
        const minusButton = document.createElement("button");
        minusButton.className = "counter-button minus-button";
        minusButton.textContent = "-";
        minusButton.addEventListener("click", () => {
            const currentCount = parseInt(assesseeCard.querySelector(".lap-counter").textContent);
            if (currentCount > 0) {
                assesseeCard.querySelector(".lap-counter").textContent = currentCount - 1;
                saveSacksData();
            }
        });
        
        const lapCounter = document.createElement("div");
        lapCounter.className = "lap-counter";
        lapCounter.textContent = sacksData[assesseeNumber] || "0";
        
        const plusButton = document.createElement("button");
        plusButton.className = "counter-button plus-button";
        plusButton.textContent = "+";
        plusButton.addEventListener("click", () => {
            const currentCount = parseInt(assesseeCard.querySelector(".lap-counter").textContent);
            assesseeCard.querySelector(".lap-counter").textContent = currentCount + 1;
            saveSacksData();
        });
        
        counterContainer.appendChild(minusButton);
        counterContainer.appendChild(lapCounter);
        counterContainer.appendChild(plusButton);
        assesseeCard.appendChild(counterContainer);
        
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

function sociometricStretcher(activityNumber){
    // Create and display the activity name banner
    const activityNameDisplay = document.createElement("div");
    activityNameDisplay.className = "activity-name-banner";
    activityNameDisplay.textContent = engToHeb["sociometric_stretcher"];
    initialElement.appendChild(activityNameDisplay);
    
    // Create and display the activity number banner
    const activityNumberDisplay = document.createElement("div");
    activityNumberDisplay.className = "activity-number-banner";
    activityNumberDisplay.textContent = `מקצה נוכחי: ${activityNumber}`;
    initialElement.appendChild(activityNumberDisplay);
    
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

    const gameLayout = document.createElement("div");
    gameLayout.className = "game-layout";
    initialElement.appendChild(gameLayout);
    
    const submitContainer = document.createElement("div");
    submitContainer.className = "submit-container";
    const submitButton = document.createElement("button");
    submitButton.className = "submit-button";
    submitButton.textContent = "שליחה";
    submitContainer.appendChild(submitButton);
    initialElement.appendChild(submitContainer);
    
    const bucketSection = document.createElement("div");
    bucketSection.className = "bucket-section";
    gameLayout.appendChild(bucketSection);
    
    const bucketTitle = document.createElement("div");
    bucketTitle.className = "bucket-title";
    bucketTitle.textContent = "בחר מוערכים";
    bucketSection.appendChild(bucketTitle);
    
    const bucketItems = document.createElement("div");
    bucketItems.className = "bucket-items";
    bucketSection.appendChild(bucketItems);
    
    for (let i = 0; i < assesseeNumbers.length; i++) {
        const block = document.createElement("div");
        block.className = "bucket-block";
        block.dataset.number = assesseeNumbers[i];
        block.textContent = assesseeNumbers[i];
        block.setAttribute("draggable", true);
        bucketItems.appendChild(block);
    }
    
    const orderSection = document.createElement("div");
    orderSection.className = "order-section";
    gameLayout.appendChild(orderSection);

    function returnToBucket(blockWrapper) {
        const originalNumber = blockWrapper.querySelector(".block").dataset.originalNumber;
        const sourceBlock = document.querySelector(`.bucket-block[data-number="${originalNumber}"]`);
        if (sourceBlock) {
            sourceBlock.style.display = "flex";
        }
        blockWrapper.remove();
    }
    
    function createBlockInBracket(number, targetBracket, nextSibling = null) {
        const capacity = parseInt(targetBracket.dataset.maxCapacity);
        if (!nextSibling && targetBracket.querySelectorAll(".block-wrapper").length >= capacity) {
          return null;
        }
        const sourceBlock = document.querySelector(`.bucket-block[data-number="${number}"]`);
        if (!sourceBlock || sourceBlock.style.display === "none") return null;
        
        const blockWrapper = document.createElement("div");
        blockWrapper.className = "block-wrapper";
        
        const blockInner = document.createElement("div");
        blockInner.className = "block";
        blockInner.setAttribute("data-original-number", number);
        
        const numberSpan = document.createElement("span");
        numberSpan.className = "number";
        numberSpan.textContent = number;
        
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-button";
        removeBtn.textContent = "x";
        
        blockInner.appendChild(numberSpan);
        blockInner.appendChild(removeBtn);
        blockWrapper.appendChild(blockInner);
        targetBracket.insertBefore(blockWrapper, nextSibling);
        
        sourceBlock.style.display = "none";
        
        updateUI();
        
        removeBtn.addEventListener("click", (e) => {
            returnToBucket(blockWrapper);
            updateUI();
        });
        
        initDrag(blockWrapper);

        return blockWrapper;
    }
    
    const brackets = [];
    const limits = (assesseeNumbers.length > 19) ? [8, 2, 4] : [4, 2, 4];
    const limitTitles = ["לקחו אלונקה", "לקחו ג'ריקן", "מקום ראשון"];
    
    for (let i = 0; i < limits.length; i++) {
        const bracket = document.createElement("div");
        bracket.className = "bracket";
        
        const currentLimit = limits[i];
        bracket.setAttribute("data-max-capacity", currentLimit);
        
        const bracketTitle = document.createElement("div");
        bracketTitle.className = "bracket-title";
        bracketTitle.textContent = `${limitTitles[i]} (${limits[i]} מוערכים)`;

        bracket.appendChild(bracketTitle);
        orderSection.appendChild(bracket);
        brackets.push(bracket);
        
        bracket.addEventListener("dragover", (e) => {e.preventDefault();
            const elementBelow = e.target.closest(".block-wrapper");
            const isFull = bracket.querySelectorAll(".block-wrapper").length >= parseInt(bracket.dataset.maxCapacity);
            const previousTarget = document.querySelector(".replace-target");
            if (previousTarget && previousTarget !== elementBelow) {
                previousTarget.classList.remove("replace-target");
            }
            if (isFull && elementBelow) {
                elementBelow.classList.add("replace-target");
            }
        });
        
        bracket.addEventListener("dragleave", (e) => {
            e.target.closest(".block-wrapper")?.classList.remove("replace-target");
        });

        bracket.addEventListener("drop", (e) => {
            e.preventDefault();
            const number = e.dataTransfer.getData("text/plain");
            if (!number) return;
            document.querySelectorAll(".replace-target").forEach((el) => el.classList.remove("replace-target"));
            const targetBlock = e.target.closest(".block-wrapper");
            const isFull = bracket.querySelectorAll(".block-wrapper").length >= parseInt(bracket.dataset.maxCapacity);
            if (targetBlock && isFull) {
                const nextSibling = targetBlock.nextElementSibling;
                returnToBucket(targetBlock);
                createBlockInBracket(number, bracket, nextSibling);
            } 
            else {
                createBlockInBracket(number, bracket);
            }
        });
    }
    
    let draggedBucketItem = null;
    let ghostBucketItem = null;
    let isDraggingBucket = false;
    let startXBucket, startYBucket;
    let bucketAutoScrollInterval = null;
    
    const handleBucketTouchMove = (e) => {
        if (!isDraggingBucket) {
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - startXBucket);
            const deltaY = Math.abs(touch.clientY - startYBucket);
            if (Math.sqrt(deltaX ** 2 + deltaY ** 2) > 10) {
                isDraggingBucket = true;
                ghostBucketItem = draggedBucketItem.cloneNode(true);
                ghostBucketItem.classList.add("ghost");
                document.body.appendChild(ghostBucketItem);
            } 
            else {
                return;
            }
        }

        e.preventDefault();
        if (!ghostBucketItem) return;
        
        const touch = e.touches[0];
        
        ghostBucketItem.style.left = `${touch.pageX - ghostBucketItem.offsetWidth / 2}px`;
        ghostBucketItem.style.top = `${touch.pageY - ghostBucketItem.offsetHeight / 2}px`;

        const clientY = touch.clientY;

        const margin = 80;
        const speed = 8;
        if (clientY < margin) {
            if (!bucketAutoScrollInterval) {
                bucketAutoScrollInterval = setInterval(() => {
                    document.documentElement.scrollTop -= speed;
                    document.body.scrollTop -= speed;
                }, 15);
            }
        } 
        else if (clientY > window.innerHeight - margin) {
            if (!bucketAutoScrollInterval) {
                bucketAutoScrollInterval = setInterval(() => {
                    document.documentElement.scrollTop += speed;
                    document.body.scrollTop += speed;
                }, 15);
            }
        } 
        else {
            if (bucketAutoScrollInterval) {
                clearInterval(bucketAutoScrollInterval);
                bucketAutoScrollInterval = null;
            }
        }
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const currentTarget = elementBelow?.closest(".block-wrapper");
        const previousTarget = document.querySelector(".replace-target");
        if (previousTarget && previousTarget !== currentTarget) {
            previousTarget.classList.remove("replace-target");
        }
        const targetBracket = currentTarget?.closest(".bracket");
        if (targetBracket && currentTarget) {
            const capacity = parseInt(targetBracket.dataset.maxCapacity);
            const currentSize = targetBracket.querySelectorAll(".block-wrapper").length;
            if (currentSize >= capacity) {
                currentTarget.classList.add("replace-target");
            }
        }
    };
    
    const handleBucketTouchEnd = (e) => {
        if (bucketAutoScrollInterval) {
            clearInterval(bucketAutoScrollInterval);
            bucketAutoScrollInterval = null;
        }

        document.body.classList.remove("no-touch-actions");
        document.querySelectorAll(".replace-target").forEach((el) => el.classList.remove("replace-target"));

        if (isDraggingBucket) {
            const touch = e.changedTouches[0];
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetBlock = elementBelow?.closest(".block-wrapper");
            const targetBracket = elementBelow?.closest(".bracket");
        
            if (targetBracket) {
                const number = draggedBucketItem.dataset.number;
                const isFull = targetBracket.querySelectorAll(".block-wrapper").length >= parseInt(targetBracket.dataset.maxCapacity);
                if (targetBlock && isFull) {
                    const nextSibling = targetBlock.nextElementSibling;
                    returnToBucket(targetBlock);
                    createBlockInBracket(number, targetBracket, nextSibling);
                } 
                else {
                    createBlockInBracket(number, targetBracket);
                }
            }
        }
        
        if (ghostBucketItem?.parentNode) {
          document.body.removeChild(ghostBucketItem);
        }
        
        draggedBucketItem = null;
        ghostBucketItem = null;

        isDraggingBucket = false;
        document.removeEventListener("touchmove", handleBucketTouchMove);
    };
    
    document.querySelectorAll(".bucket-block").forEach((block) => {
        block.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", block.dataset.number);
        });
    
        block.addEventListener("touchstart", (e) => {
            if (block.style.display === "none") return;
            e.preventDefault();
            draggedBucketItem = block;
            isDraggingBucket = false;
            const touch = e.touches[0];
            startXBucket = touch.clientX;
            startYBucket = touch.clientY;        
            document.addEventListener("touchmove", handleBucketTouchMove, {
                passive: false,
            });
            document.addEventListener("touchend", handleBucketTouchEnd, {
                once: true,
            });
        },
        { passive: false }
        );
    });
    
    function initDrag(el) {
        let offsetY;
        let currentClone = null;

        let originalParent = null;
        let originalNextSibling = null;
        let isDraggingBracket = false;
        let startXBracket, startYBracket;
        let autoScrollInterval = null;
        
        const getClientCoords = (e) => {
            const touch = e.touches?.[0] || e.changedTouches?.[0] || e;
            return { clientX: touch.clientX, clientY: touch.clientY };
        };
        
        const move = (e) => {
            if (!isDraggingBracket) {
                const { clientX, clientY } = getClientCoords(e);
                const deltaX = Math.abs(clientX - startXBracket);
                const deltaY = Math.abs(clientY - startYBracket);
                if (Math.sqrt(deltaX ** 2 + deltaY ** 2) > 10) {
                    isDraggingBracket = true;
                    const rect = el.getBoundingClientRect();
                    offsetY = clientY - rect.top;
                    currentClone = el.cloneNode(true);
                    currentClone.classList.add("block-clone-preview");
                    document.body.appendChild(currentClone);
                    Object.assign(currentClone.style, {
                        position: "fixed",
                        width: `${rect.width}px`,
                        height: `${rect.height}px`,
                        left: `${rect.left}px`,
                        top: `${rect.top}px`,
                        pointerEvents: "none",
                        zIndex: "9999",
                    });
                el.classList.add("dragging");
                } 
                else {
                    return;
                }
            }
            if (e.type === "touchmove") e.preventDefault();

            if (!currentClone) return;

            const { clientX, clientY } = getClientCoords(e);
            currentClone.style.top = `${clientY - offsetY}px`;
            const margin = 80;
            const speed = 8;
            if (clientY < margin) {
                if (!autoScrollInterval) {
                    autoScrollInterval = setInterval(() => {
                        document.documentElement.scrollTop -= speed;
                        document.body.scrollTop -= speed;
                    }, 15);
                }
            } 
            else if (clientY > window.innerHeight - margin) {
                if (!autoScrollInterval) {
                    autoScrollInterval = setInterval(() => {
                        document.documentElement.scrollTop += speed;
                        document.body.scrollTop += speed;
                    }, 15);
                }
            } else {
                if (autoScrollInterval) {
                    clearInterval(autoScrollInterval);
                    autoScrollInterval = null;
                }
            }
            currentClone.style.display = "none";
            const elementBelow = document.elementFromPoint(clientX, clientY);
            currentClone.style.display = "";
            const currentTarget = elementBelow?.closest(".block-wrapper");
            const previousTarget = document.querySelector(".replace-target");
            if (previousTarget && previousTarget !== currentTarget) {
                previousTarget.classList.remove("replace-target");
            }
            const newParentBracket = elementBelow?.closest(".bracket");          
            if (!newParentBracket) return;
            const capacity = parseInt(newParentBracket.dataset.maxCapacity);
            const currentSize = newParentBracket.querySelectorAll(".block-wrapper:not(.dragging)").length;
            if (currentSize < capacity) {
                const siblings = [...newParentBracket.querySelectorAll(".block-wrapper:not(.dragging)"),];
                const next = siblings.find((s) => 
                    clientY <= s.getBoundingClientRect().top + s.getBoundingClientRect().height / 2
                );
                newParentBracket.insertBefore(el, next);
            } 
            else if (currentTarget && currentTarget !== el) {
                currentTarget.classList.add("replace-target");
            }
        };
        
        const endDrag = (e) => {
            if (autoScrollInterval) {
                clearInterval(autoScrollInterval);
                autoScrollInterval = null;
            }
            if (isDraggingBracket) {
                const blockToSwap = document.querySelector(".replace-target");
                if (blockToSwap) {
                    const swapParent = blockToSwap.parentElement;
                    const swapNextSibling = blockToSwap.nextElementSibling;
                    originalParent.insertBefore(blockToSwap, originalNextSibling);
                    swapParent.insertBefore(el, swapNextSibling);
                    blockToSwap.classList.remove("replace-target");
                }
                if (currentClone) currentClone.remove();
                el.classList.remove("dragging");
            }
            currentClone = null;
            isDraggingBracket = false;
            document.body.classList.remove("no-touch-actions");
            document.removeEventListener("mousemove", move);
            document.removeEventListener("touchmove", move);
          
            updateUI();
        };
        
        const startDrag = (e) => {
            if (e.target.classList.contains("remove-button")) {
                return;
            }
            if (e.button && e.button !== 0) return;
            e.preventDefault();
            originalParent = el.parentElement;
            originalNextSibling = el.nextElementSibling;
            isDraggingBracket = false;
            const { clientX, clientY } = getClientCoords(e);
            startXBracket = clientX;
            startYBracket = clientY;

            document.body.classList.add("no-touch-actions");
            document.addEventListener("mousemove", move);
            document.addEventListener("touchmove", move, { passive: false });
            document.addEventListener("mouseup", endDrag, { once: true });
            document.addEventListener("touchend", endDrag, { once: true });
        };
        
        el.addEventListener("mousedown", startDrag);
        el.addEventListener("touchstart", startDrag, { passive: false });
    }
        
    function getTotalBlocks() {
        return document.querySelectorAll(".block-wrapper").length;
    }
        
    function updateResultsStrings() {
        brackets.forEach((br, idx) => {
            const items = br.querySelectorAll(".block-wrapper .block");
            const numbers = Array.from(items).map((el) => el.dataset.originalNumber);
            
            if (idx === 0)
                stretcherBracketResults = numbers.join(",");
            else if (idx === 1)
                firstPlaceBracketResults = numbers.join(",");
            else if (idx === 2)
                jerrycanResultsBracketResults = numbers.join(",");
        });
        console.log("stretcherBracketResults: ", stretcherBracketResults);
        console.log("firstPlaceBracketResults: ", firstPlaceBracketResults);
        console.log("jerrycanResultsBracketResults: ", jerrycanResultsBracketResults);
    }
        
    function updateBucketVisibility() {
        if (document.querySelectorAll(".bucket-block").length - getTotalBlocks() <= 0) {
            document.querySelector(".bucket-section").style.display = "none";
        } 
        else {
            document.querySelector(".bucket-section").style.display = "flex";
        }
    }
        
    function updateUI() {
        updateResultsStrings();
        updateBucketVisibility();
    }
    // Back to menu button event handler
    backButton.addEventListener("click", () => {
        // Remove all game content (button container and game layout)
        const buttonContainer = initialElement.querySelector('.top-button-container');
        const gameLayout = initialElement.querySelector('.game-layout');
        const submitContainer = initialElement.querySelector('.submit-container');
        const activityNumberBanner = initialElement.querySelector('.activity-number-banner');
        const activityNameDisplay = initialElement.querySelector('.activity-name-banner');

        if (buttonContainer) buttonContainer.remove();
        if (gameLayout) gameLayout.remove();
        if (submitContainer) submitContainer.remove();
        if (activityNumberBanner) activityNumberBanner.remove();
        if (activityNameDisplay) activityNameDisplay.remove();

        // Reset current game
        currentGame = null;
        
        // Display main menu
        displayMenu();
    });

    // Reset button
    resetButton.addEventListener("click", () => {
        resetGame();
    });
    
    // Validation check
    submitButton.addEventListener("click", async () => {
        let allBracketsFull = true;
        
        for (const bracket of brackets) {
            const capacity = parseInt(bracket.dataset.maxCapacity);
            const currentSize = bracket.querySelectorAll(".block-wrapper").length;
        
            if (currentSize < capacity) {
                allBracketsFull = false;
                break;
            }
        }
        
        if (allBracketsFull) {
            // Show loading state
            submitButton.disabled = true;
            submitButton.textContent = "שולח...";

            // Show loading and hide sections
            showLoading();

            // Hide sections while submitting
            const bucketSection = document.querySelector(".bucket-section");
            const orderSection = document.querySelector(".order-section");
            if (bucketSection) bucketSection.style.display = "none";
            if (orderSection) orderSection.style.display = "none";

            let finalResultString = buildFinalResultString();            
            const succeeded = await submitActivity(currentTeamNumber, currentTeamID, "sociometric_stretcher", activityNumber, finalResultString);

            // Hide loading
            hideLoading();

            if (succeeded){
                // Show loading state
                submitButton.disabled = false;
                submitButton.textContent = "שליחה";

                // Show success toast
                showSuccessToast();
                
                updateActivityNumber("sociometric_stretcher", activityNumber);
                activityNumber += 1;
                console.log("incremented activity number locally to: ", activityNumber);
                resetGame();
            } else {
                alert("שגיאה בשליחת נתונים לשרת. נא לנסות שנית.");
                // Show sections again if submission failed
                if (bucketSection) bucketSection.style.display = "flex";
                if (orderSection) orderSection.style.display = "flex";
            }
        } 
        else {
            alert("חלק מהתאים אינם מלאים, לא ניתן לשלוח את הטופס.");
            // Show loading state
            submitButton.disabled = false;
            submitButton.textContent = "שליחה";
        }
    });

    function buildFinalResultString() {
        let finalResultString = "";

        const stretcherWithIds = stretcherBracketResults.split(",").map(number => {
            const id = numberToIdMap[number];
            return `${number}:${id}`;
        }).join(",");
        finalResultString += `stretcher-${stretcherWithIds}`;

        finalResultString += ",";
        const firstWithIds = firstPlaceBracketResults.split(",").map(number => {
            const id = numberToIdMap[number];
            return `${number}:${id}`;
        }).join(",");
        finalResultString += `first-${firstWithIds}`;
        
        finalResultString += ",";
        const jerrycanWithIds = jerrycanResultsBracketResults.split(",").map(number => {
            const id = numberToIdMap[number];
            return `${number}:${id}`;
        }).join(",");
        finalResultString += `jerrycan-${jerrycanWithIds}`;

        return finalResultString;
    }

    function resetGame(){
        brackets.forEach((br) => {
            const title = br.querySelector(".bracket-title");
            br.innerHTML = "";
            if (title) br.appendChild(title);
        });
        document.querySelectorAll(".bucket-block").forEach((block) => {
            block.style.display = "flex";
        });

        const banner = document.querySelector(".activity-number-banner");
        if (banner) {
            console.log ("in resetGame, displaying banner with activity number: ", activityNumber);
            banner.textContent = `מקצה נוכחי: ${activityNumber}`;
        }
        
        updateUI();
    }
}

function updateActivityNumber(activityName, activityNumber){
    console.log ("updating activity number in map and local storage with new activity number: ", activityNumber);
    if (!activityNumberMap[activityName]) {
        activityNumberMap[activityName] = [activityNumber.toString()];
    } else {
        activityNumberMap[activityName].push(activityNumber.toString());
    }
    localStorage.setItem("gameState", JSON.stringify(activityNumberMap));
}

function sprintsOrCrawls(activityName, activityNumber){
    // Create and display the activity name banner
    const activityNameDisplay = document.createElement("div");
    activityNameDisplay.className = "activity-name-banner";
    activityNameDisplay.textContent = engToHeb[activityName] || activityName;
    initialElement.appendChild(activityNameDisplay);
    
    // Create and display the activity number banner
    const activityNumberDisplay = document.createElement("div");
    activityNumberDisplay.className = "activity-number-banner";
    activityNumberDisplay.textContent = `מקצה נוכחי: ${activityNumber}`;
    initialElement.appendChild(activityNumberDisplay);

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
    
    const gameLayout = document.createElement("div");
    gameLayout.className = "game-layout";
    initialElement.appendChild(gameLayout);
    
    const submitContainer = document.createElement("div");
    submitContainer.className = "submit-container";
    const submitButton = document.createElement("button");
    submitButton.className = "submit-button";
    submitButton.textContent = "שליחה";
    submitContainer.appendChild(submitButton);
    initialElement.appendChild(submitContainer);
    
    const bucketSection = document.createElement("div");
    bucketSection.className = "bucket-section";
    gameLayout.appendChild(bucketSection);
    
    const bucketTitle = document.createElement("div");
    bucketTitle.className = "bucket-title";
    bucketTitle.textContent = "בחר מוערכים";
    bucketSection.appendChild(bucketTitle);
    
    const bucketItems = document.createElement("div");
    bucketItems.className = "bucket-items";
    bucketSection.appendChild(bucketItems);
    
    for (let i = 0; i < assesseeNumbers.length; i++) {
        const block = document.createElement("div");
        block.className = "bucket-block";
        block.dataset.number = assesseeNumbers[i];
        block.textContent = assesseeNumbers[i];
        bucketItems.appendChild(block);
    }
    
    const orderSection = document.createElement("div");
    orderSection.className = "order-section";
    gameLayout.appendChild(orderSection);
    
    const bracket = document.createElement("div");
    bracket.className = "bracket";
    bracket.setAttribute("data-max-capacity", "7");
    orderSection.appendChild(bracket);
    
    const bracketTitle = document.createElement("div");
    bracketTitle.className = "bracket-title";
    bracketTitle.textContent = "Box Section 1";
    // bracket.appendChild(bracketTitle);
    
    let currentIndex = 0;
    let currentClone = null;
    
    document.querySelectorAll(".bucket-block").forEach((block) => {
        block.addEventListener("click", () => {
            const number = block.dataset.number;
            
            const blockWrapper = document.createElement("div");
            blockWrapper.className = "block-wrapper";
            blockWrapper.setAttribute("data-index", currentIndex);
            
            const blockInner = document.createElement("div");
            blockInner.className = "block";
            blockInner.setAttribute("data-original-number", number);
            
            const numberSpan = document.createElement("span");
            numberSpan.className = "number";
            numberSpan.textContent = number;
            
            const removeBtn = document.createElement("button");
            removeBtn.className = "remove-button";
            removeBtn.textContent = "x";
            
            blockInner.appendChild(numberSpan);
            blockInner.appendChild(removeBtn);
            blockWrapper.appendChild(blockInner);
            bracket.appendChild(blockWrapper);
            block.style.display = "none";
            
            if (document.querySelectorAll(".bucket-block").length - bracket.querySelectorAll(".block-wrapper").length <= 0) {
                document.querySelector(".bucket-section").style.display = "none";
                orderSection.style.width = "100%";
                orderSection.classList.add("order-section-centered");
            }
            
            currentIndex++;
            
            updateResultString();
    
            removeBtn.addEventListener("click", (e) => {
                e.stopPropagation(); // Prevent bubbling up to block drag logic
                bracket.removeChild(blockWrapper);
                block.style.display = "flex";
                if (document.querySelectorAll(".bucket-block").length - bracket.querySelectorAll(".block-wrapper").length > 0) {
                    document.querySelector(".bucket-section").style.display = "flex";
                }
                updateResultString();
            });
            // Add this to prevent touchstart from triggering drag
            removeBtn.addEventListener("touchstart", (e) => {
                e.stopPropagation();
            });
    
            initDrag(blockWrapper);
        });
    });
    
    function updateResultString() {
        const items = bracket.querySelectorAll(".block-wrapper .block");
        const numbers = Array.from(items).map((el) => el.dataset.originalNumber);
        raceAssesseesOrder = numbers.join(",");
        console.log("raceAssesseesOrder: ", raceAssesseesOrder);
    }
    
    function getScrollableParent(el) {
        while (el) {
            const style = getComputedStyle(el);
            const overflowY = style.overflowY;
            if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
                return el;
            }
            el = el.parentElement;
        }
        return document.scrollingElement || document.documentElement;
    }

    
    function initDrag(el) {
        let offsetY;
        
        const move = (clientY) => {
            if (!currentClone) return;
            currentClone.style.top = `${clientY - offsetY}px`;
            
            const margin = 80;
            const speed = 6;
            
            // AUTO SCROLL - Compatible with mobile
            const scrollable = getScrollableParent(initialElement);
            if (clientY < margin) {
                window.scrollBy(0, -speed);
                document.documentElement.scrollTop -= speed;
                document.body.scrollTop -= speed;
                scrollable.scrollTop -= speed;
            } 
            else if (clientY > window.innerHeight - margin) {
                window.scrollBy(0, speed);
                document.documentElement.scrollTop += speed;
                document.body.scrollTop += speed;
                scrollable.scrollTop += speed;
            }
            
            const siblings = [
                ...bracket.querySelectorAll(".block-wrapper:not(.dragging)"),
            ];
            const next = siblings.find((sibling) => {
                const rect = sibling.getBoundingClientRect();
                return clientY <= rect.top + rect.height / 2;
            });
            
            if (next) {
                bracket.insertBefore(el, next);
            } 
            else {
                bracket.appendChild(el);
            }
        };
    
        const endDrag = () => {
            if (currentClone && currentClone.parentNode) currentClone.remove();
            el.classList.remove("dragging");
            currentClone = null;
            
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            
            updateResultString();
        };
        
        const onMouseMove = (e) => move(e.clientY);
        const onMouseUp = () => endDrag();
        
        const onTouchMove = (e) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                move(touch.clientY);
                e.preventDefault();
            }
        };
        
        const onTouchEnd = () => endDrag();
        
        const start = (clientX, clientY) => {
            const rect = el.getBoundingClientRect();
            offsetY = clientY - rect.top;
            
            currentClone = el.cloneNode(true);
            currentClone.classList.add("block-clone-preview");
            currentClone.style.position = "fixed";
            currentClone.style.width = `${rect.width}px`;
            currentClone.style.height = `${rect.height}px`;
            currentClone.style.left = `${rect.left}px`;
            currentClone.style.top = `${rect.top}px`;
            currentClone.style.pointerEvents = "none";
            currentClone.style.zIndex = "9999";
            document.body.appendChild(currentClone);
            
            el.classList.add("dragging");
        };
        
        el.addEventListener("mousedown", (e) => {
            // e.preventDefault(); // <<< This prevents other layout/scroll interference
            start(e.clientX, e.clientY);
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });
        
        el.addEventListener("touchstart", (e) => {
            if (e.touches.length > 0) {
                // e.preventDefault(); // <<< Here too!
                const touch = e.touches[0];
                start(touch.clientX, touch.clientY);
                document.addEventListener("touchmove", onTouchMove, { passive: false });
                document.addEventListener("touchend", onTouchEnd);
            }
        });
    }
    
    // Back to menu button event handler
    backButton.addEventListener("click", () => {
        // Remove all game content (button container and game layout)
        const buttonContainer = initialElement.querySelector('.top-button-container');
        const gameLayout = initialElement.querySelector('.game-layout');
        const submitContainer = initialElement.querySelector('.submit-container');
        const activityNumberBanner = initialElement.querySelector('.activity-number-banner');
        const activityNameDisplay = initialElement.querySelector('.activity-name-banner');
        
        if (buttonContainer) buttonContainer.remove();
        if (gameLayout) gameLayout.remove();
        if (submitContainer) submitContainer.remove();
        if (activityNumberBanner) activityNumberBanner.remove();
        if (activityNameDisplay) activityNameDisplay.remove();
        
        // Reset current game
        currentGame = null;
        
        // Display main menu
        displayMenu();
    });
    
    resetButton.addEventListener("click", () => {
        resetGame();
    });
    
    // Validation check
    submitButton.addEventListener("click", async () => {
        const allBucketBlocksNumber = document.querySelectorAll(".bucket-block").length;
        // const allHiddenBlocks = Array.from(allBucketBlocks).filter(block => block.style.display === "none");
        const orderBlocksNumber = bracket.querySelectorAll(".block-wrapper").length;
        const formValid = orderBlocksNumber > 0 && orderBlocksNumber <= allBucketBlocksNumber;

        if (!formValid) {
            alert("יש להוסיף מוערכים למקצה זה.");
            return;
        }

        // If there are blocks left in bucket section, ask for confirmation
        if (orderBlocksNumber < allBucketBlocksNumber) {
            const remainingBlocks = allBucketBlocksNumber - orderBlocksNumber;
            const confirmMessage = `יש ${remainingBlocks} מוערכים שלא סודרו במקצה זה. האם אתה בטוח שברצונך להמשיך?`;
            const userConfirmed = confirm(confirmMessage);
            
            if (!userConfirmed) {
                return; // User chose not to continue, let them fix the form
            }
        }

        // Show loading state
        submitButton.disabled = true;
        submitButton.textContent = "שולח...";

        // Show loading and hide sections
        showLoading();

        // Hide sections while submitting
        const bucketSection = document.querySelector(".bucket-section");
        const orderSection = document.querySelector(".order-section");
        if (bucketSection) bucketSection.style.display = "none";
        if (orderSection){
            orderSection.classList.remove("order-section-centered");
            orderSection.style.display = "none";
        }
        
        // Submit activity
        const assesseeNumbers = raceAssesseesOrder.split(",");
        const resultString = assesseeNumbers.map(number => {
            const id = numberToIdMap[number];
            return `${number}:${id}`;
        }).join(",");
        const succeeded = await submitActivity(currentTeamNumber, currentTeamID, activityName, activityNumber, resultString);
        
        // Hide loading
        hideLoading();
        
        if (succeeded){
            // Show loading state
            submitButton.disabled = false;
            submitButton.textContent = "שליחה";

            // Show success toast
            showSuccessToast();
            
            updateActivityNumber(activityName, activityNumber);
            activityNumber += 1;
            console.log("incremented activity number locally to: ", activityNumber);
            resetGame();
        } else {
            alert("שגיאה בשליחת נתונים לשרת. נא לנסות שנית.");
            // Show sections again if submission failed
            if (bucketSection) bucketSection.style.display = "flex";
            if (orderSection) {
                orderSection.style.display = "flex";
                orderSection.classList.add("order-section-centered");
            }
            // Show loading state
            submitButton.disabled = false;
            submitButton.textContent = "שליחה";
        }
    });

    function resetGame(){
        bracket.querySelectorAll(".block-wrapper").forEach((wrapper) => {
            bracket.removeChild(wrapper);
        });
        document.querySelectorAll(".bucket-block").forEach((block) => {
            block.style.display = "flex";
        });
        document.querySelector(".bucket-section").style.display = "flex";
        document.querySelector(".order-section").style.display = "flex";
        raceAssesseesOrder = null;
        currentIndex = 0;

        const banner = document.querySelector(".activity-number-banner");
        if (banner) {
            console.log ("in resetGame, displaying banner with activity number: ", activityNumber);
            banner.textContent = `מקצה נוכחי: ${activityNumber}`;
        }
    }
}

async function submitActivity(currentTeamNumber, currentTeamID, activityName, activityNumber, resultString){
    try {
        const response = await fetch("https://misc-ten.vercel.app/submit_activity", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                team_number: currentTeamNumber,
                team_id: currentTeamID,
                activity_name: activityName,
                activity_number: activityNumber,
                results: resultString
            }),
        });

        if (!response.ok) {
            console.error("Server returned an error:", response.status);
            return false;
        }

        const data = await response.json();
        console.log("submitActivity response:", data);
        return data.success === true;
    } catch (error) {
        console.error("submitActivity fetch error:", error);
        return false;
    }
}

// Utility function to show/hide loader
function showLoading() {
  // Remove existing canvas and loader first
  $('#hichartsJS').remove();
  $('#loading-spinner').remove();

  $('<div id="loading-spinner" style="margin-top:10px; text-align:center;">' +
    '<img src="https://i.gifer.com/7YUL.gif" alt="Loading..." width="50">' +
    '</div>').insertAfter($(initialElement));
}


function hideLoading() {
    $('#loading-spinner').remove();
}

function showSuccessToast(toastMessage = "הטופס נשלח בהצלחה!") {
    // Remove any existing toast
    const existingToast = document.querySelector('.success-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-check-circle"></i>
            <span>${toastMessage}</span>
        </div>
    `;
    
    // Insert after submit button
    const submitButton = document.querySelector('.submit-button');
    if (submitButton && submitButton.parentNode) {
        submitButton.parentNode.insertBefore(toast, submitButton.nextSibling);
    }
    
    // Trigger fade in
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

