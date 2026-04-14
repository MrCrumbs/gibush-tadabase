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
    "holes": "חפירת בור", "sacks": "שקים", "stretcher": "מסע אלונקה"
}

TB.render("component_9", async function (data) {

    if(!initialSetup()){
        return;
    }
    
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
            await sacks(nextActivityNumber);
            break;
        case "holes":
            await holes();
            break;
        case "sociometric_stretcher":
            sociometricStretcher(nextActivityNumber);
            break;
        case "stretcher":
            stretcher(nextActivityNumber);
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
        return false;
    }
    return true;
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
        { title: "אלונקה סוציומטרית", translatedTitle: "sociometric_stretcher", icon: "🚑️" },
        { title: "מסע אלונקה", translatedTitle: "stretcher", icon: "🛏️" }
    ];

    games.forEach(game => {
        const btn = document.createElement("button");
        btn.className = "game-button";
        btn.innerHTML = `<span class="game-icon">${game.icon}</span><span class="game-title">${game.title}</span>`;
        // Add onclick handler per game
        btn.addEventListener("click", function () {
            void runGame(game.translatedTitle);
        });
        menuContainer.appendChild(btn);
    });

    // Append menu after the initial element
    initialElement.parentNode.insertBefore(menuContainer, initialElement.nextSibling);
}

async function runGame(gameTitle) {
    // Remove existing game/menu content after initialElement
    const existing = initialElement.nextSibling;
    if (existing) existing.remove();

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
            await sacks(nextActivityNumber);
            break;
        case "holes":
            await holes();
            break;
        case "sociometric_stretcher":
            sociometricStretcher(nextActivityNumber);
            break;
        case "stretcher":
            stretcher(nextActivityNumber);
            break;
    }
}

/** Top bar: שליחה, optional סדר קודם, איפוס (RTL); back button top-right with → arrow. */
function createGameTopToolbar(parent, options) {
    options = options || {};
    const includeLoadPrevious = options.includeLoadPrevious !== false;

    const topButtonContainer = document.createElement("div");
    topButtonContainer.className = "top-button-container game-top-toolbar";
    parent.appendChild(topButtonContainer);

    const actionsRow = document.createElement("div");
    actionsRow.className = "top-button-actions";
    topButtonContainer.appendChild(actionsRow);

    const submitButton = document.createElement("button");
    submitButton.className = "submit-button submit-button--toolbar";
    submitButton.type = "button";
    submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> שליחה';
    actionsRow.appendChild(submitButton);

    let loadPreviousButton = null;
    if (includeLoadPrevious) {
        loadPreviousButton = document.createElement("button");
        loadPreviousButton.className = "load-previous-arrangement-button";
        loadPreviousButton.type = "button";
        loadPreviousButton.innerHTML = '<i class="fas fa-clone"></i> סדר קודם';
        actionsRow.appendChild(loadPreviousButton);
        loadPreviousButton.addEventListener("click", async () => {
            if (typeof options.onLoadPrevious === "function") {
                loadPreviousButton.disabled = true;
                try {
                    await options.onLoadPrevious();
                } catch (e) {
                    console.error(e);
                    alert("שגיאה בטעינת סידור קודם.");
                } finally {
                    loadPreviousButton.disabled = false;
                }
            } else {
                alert("פיצ'ר בבנייה");
            }
        });
    }

    const resetButton = document.createElement("button");
    resetButton.className = "reset-button";
    resetButton.type = "button";
    resetButton.innerHTML = '<i class="fas fa-undo"></i> איפוס';
    actionsRow.appendChild(resetButton);

    const backButton = document.createElement("button");
    backButton.className = "back-button game-toolbar-back";
    backButton.type = "button";
    backButton.innerHTML = '<i class="fas fa-arrow-right"></i>';
    let mainContent = parent.closest(".tb-main-content");
    if (!mainContent) {
        mainContent = parent.querySelector(".tb-main-content");
    }
    if (mainContent) {
        mainContent.appendChild(backButton);
    } else {
        topButtonContainer.appendChild(backButton);
    }

    return {
        topButtonContainer,
        actionsRow,
        backButton,
        resetButton,
        loadPreviousButton,
        submitButton,
    };
}

function setActivityTitleBannerContent(bannerEl, activityLabel, heatNumber) {
    bannerEl.replaceChildren();
    const namePart = document.createElement("span");
    namePart.className = "activity-title-name";
    namePart.textContent = activityLabel;
    const heatPart = document.createElement("span");
    heatPart.className = "activity-heat-suffix";
    heatPart.textContent = ` (מקצה ${heatNumber})`;
    bannerEl.appendChild(namePart);
    bannerEl.appendChild(heatPart);
}

/** "?" top-left of .tb-main-content (mirror of back); opens instructions modal. Call destroy() when leaving activity. */
function createActivityInstructionsModal(parent, instructionText) {
    let mainContent = parent.closest(".tb-main-content");
    if (!mainContent) {
        mainContent = parent.querySelector(".tb-main-content");
    }

    const helpButton = document.createElement("button");
    helpButton.type = "button";
    helpButton.className = "help-button game-toolbar-help";
    helpButton.setAttribute("aria-label", "הוראות");
    helpButton.textContent = "?";

    let parentPositionRestore = null;
    if (mainContent) {
        mainContent.appendChild(helpButton);
    } else {
        const prev = parent.style.position;
        if (!prev || prev === "static") {
            parent.style.position = "relative";
            parentPositionRestore = prev || "";
        }
        helpButton.classList.add("game-toolbar-help--in-parent");
        parent.appendChild(helpButton);
    }

    const modalRoot = document.createElement("div");
    modalRoot.className = "activity-instructions-modal";
    modalRoot.setAttribute("role", "dialog");
    modalRoot.setAttribute("aria-modal", "true");
    modalRoot.setAttribute("aria-hidden", "true");

    const backdrop = document.createElement("div");
    backdrop.className = "activity-instructions-modal__backdrop";

    const panel = document.createElement("div");
    panel.className = "activity-instructions-modal__panel";

    const titleEl = document.createElement("div");
    titleEl.className = "activity-instructions-modal__title";
    titleEl.textContent = "הוראות";

    const bodyEl = document.createElement("div");
    bodyEl.className = "activity-instructions-modal__body";
    bodyEl.textContent = instructionText;

    const dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "activity-instructions-modal__dismiss";
    dismissBtn.setAttribute("aria-label", "סגור");
    dismissBtn.textContent = "\u00D7";

    panel.appendChild(dismissBtn);
    panel.appendChild(titleEl);
    panel.appendChild(bodyEl);
    modalRoot.appendChild(backdrop);
    modalRoot.appendChild(panel);
    document.body.appendChild(modalRoot);

    function onKeyDown(e) {
        if (e.key === "Escape") {
            closeModal();
        }
    }

    function openModal() {
        modalRoot.classList.add("is-open");
        modalRoot.setAttribute("aria-hidden", "false");
        document.addEventListener("keydown", onKeyDown);
    }

    function closeModal() {
        modalRoot.classList.remove("is-open");
        modalRoot.setAttribute("aria-hidden", "true");
        document.removeEventListener("keydown", onKeyDown);
    }

    helpButton.addEventListener("click", openModal);
    backdrop.addEventListener("click", closeModal);
    dismissBtn.addEventListener("click", closeModal);

    function destroy() {
        closeModal();
        helpButton.remove();
        modalRoot.remove();
        document.removeEventListener("keydown", onKeyDown);
        if (parentPositionRestore !== null) {
            parent.style.position = parentPositionRestore;
        }
    }

    return { helpButton, modalRoot, destroy };
}

function getTeamDataFromActivityResponse(activityData) {
    if (!activityData || typeof activityData !== "object" || typeof activityData.error === "string") {
        return null;
    }
    const tn = String(currentTeamNumber);
    if (activityData[tn]) return activityData[tn];
    const n = Number(tn);
    if (activityData[n] != null) return activityData[n];
    for (const k of Object.keys(activityData)) {
        if (String(k) === tn) return activityData[k];
    }
    return null;
}

/** Local holes draft matches a full submitted heat (all assessees, scores 1–6). */
function isHolesLocalRestoreUsable(holesData) {
    if (!holesData || typeof holesData !== "object" || assesseeNumbers.length === 0) return false;
    for (const num of assesseeNumbers) {
        const row = holesData[num];
        if (!row) return false;
        const t = parseInt(row.teamwork, 10);
        const d = parseInt(row.determination, 10);
        if (!Number.isFinite(t) || !Number.isFinite(d) || t < 1 || t > 6 || d < 1 || d > 6) return false;
    }
    return true;
}

function isSacksLocalRestoreUsable(sacksData) {
    if (!sacksData || typeof sacksData !== "object") return false;
    for (const k of Object.keys(sacksData)) {
        const v = parseInt(sacksData[k], 10);
        if (Number.isFinite(v) && v > 0) return true;
    }
    return false;
}

async function fetchHolesSubmittedDataFromServer(heatNumber) {
    const response = await fetch("https://misc-ten.vercel.app/get_team_activity_data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            team_number: String(currentTeamNumber),
            activity_names: "holes",
        }),
    });
    if (!response.ok) throw new Error("get_team_activity_data failed");
    const data = await response.json();
    if (data && typeof data.error === "string") throw new Error(data.error);
    const teamData = getTeamDataFromActivityResponse(data);
    if (!teamData) return {};
    const heatKey = String(heatNumber);
    const out = {};
    for (const assesseeNum of Object.keys(teamData)) {
        const holes = teamData[assesseeNum]?.holes;
        if (!holes || typeof holes !== "object") continue;
        const heat = holes[heatKey] !== undefined && holes[heatKey] !== null ? holes[heatKey] : holes[heatNumber];
        if (!heat || typeof heat !== "object") continue;
        if (heat.teamwork == null || heat.determination == null) continue;
        out[assesseeNum] = {
            teamwork: String(heat.teamwork),
            determination: String(heat.determination),
        };
    }
    return out;
}

async function fetchSacksSubmittedDataFromServer(heatNumber) {
    const response = await fetch("https://misc-ten.vercel.app/get_team_activity_data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            team_number: String(currentTeamNumber),
            activity_names: "sacks",
        }),
    });
    if (!response.ok) throw new Error("get_team_activity_data failed");
    const data = await response.json();
    if (data && typeof data.error === "string") throw new Error(data.error);
    const teamData = getTeamDataFromActivityResponse(data);
    if (!teamData) return {};
    const heatKey = String(heatNumber);
    const out = {};
    for (const assesseeNum of Object.keys(teamData)) {
        const sacks = teamData[assesseeNum]?.sacks;
        if (!sacks || typeof sacks !== "object") continue;
        const heat =
            sacks[heatKey] !== undefined && sacks[heatKey] !== null ? sacks[heatKey] : sacks[heatNumber];
        if (heat === undefined || heat === null || typeof heat === "object") continue;
        const n = parseInt(heat, 10);
        if (Number.isFinite(n)) out[assesseeNum] = n;
    }
    return out;
}

async function resubmitActivity(currentTeamNumberArg, currentTeamIDArg, activityName, activityNumber, resultString) {
    try {
        const response = await fetch("https://misc-ten.vercel.app/resubmit_activity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                team_number: currentTeamNumberArg,
                team_id: currentTeamIDArg,
                activity_name: activityName,
                activity_number: activityNumber,
                results: resultString,
            }),
        });
        if (!response.ok) {
            console.error("Server returned an error:", response.status);
            return false;
        }
        const respData = await response.json();
        console.log("resubmitActivity response:", respData);
        return respData.success === true;
    } catch (error) {
        console.error("resubmitActivity fetch error:", error);
        return false;
    }
}

async function holes(){
    const gameState = JSON.parse(localStorage.getItem("gameState") || "{}");
    const holesActivities = gameState["holes"] || [];
    let holesResubmitHeat = null;

    if (holesActivities.length > 0) {
        if (!confirm("מקצה זה כבר הוגש. האם ברצונך לתקנו?")) {
            currentGame = null;
            displayMenu();
            return;
        }
        holesResubmitHeat = Math.max(...holesActivities.map(Number));
        const fromLocal = JSON.parse(localStorage.getItem("holesData") || "{}");
        if (!isHolesLocalRestoreUsable(fromLocal)) {
            showLoading();
            let fetched = {};
            try {
                fetched = await fetchHolesSubmittedDataFromServer(holesResubmitHeat);
            } catch (e) {
                console.error(e);
            } finally {
                hideLoading();
            }
            if (Object.keys(fetched).length === 0) {
                alert("לא ניתן לטעון את נתוני המקצה מהשרת.");
                currentGame = null;
                displayMenu();
                return;
            }
            localStorage.setItem("holesData", JSON.stringify(fetched));
        }
    }

    const activityNameDisplay = document.createElement("div");
    activityNameDisplay.className = "activity-name-banner";
    activityNameDisplay.textContent = engToHeb["holes"];
    initialElement.appendChild(activityNameDisplay);

    const { topButtonContainer, backButton, resetButton, submitButton } = createGameTopToolbar(initialElement, {
        includeLoadPrevious: false,
    });

    const instructionsUI = createActivityInstructionsModal(
        initialElement,
        "דרג כל מוערך בכל תחום מ־1 (נמוך) עד 6 (גבוה)."
    );
    
    // Create main container
    const holesContainer = document.createElement("div");
    holesContainer.className = "holes-container";
    initialElement.appendChild(holesContainer);
    
    // Create assessees list
    const assesseesList = document.createElement("div");
    assesseesList.className = "assessees-list";
    holesContainer.appendChild(assesseesList);
    
    // Load existing data from localStorage
    const holesData = JSON.parse(localStorage.getItem("holesData") || "{}");
    console.log("holesData:", holesData);
    
    // Create assessee rows
    assesseeNumbers.forEach(assesseeNumber => {
        const assesseeRow = document.createElement("div");
        assesseeRow.className = "assessee-row";
        assesseeRow.dataset.number = assesseeNumber;
        
        // Create container for input groups
        const inputGroupsContainer = document.createElement("div");
        inputGroupsContainer.className = "input-groups-container";
        
        // Create first input group (ערבות הדדית)
        const firstInputGroup = createInputGroup(
            "ערבות הדדית", 
            "teamwork", 
            assesseeNumber, 
            holesData
        );
        inputGroupsContainer.appendChild(firstInputGroup);
        
        // Create second input group (רוח לחימה ומוטיבציה)
        const secondInputGroup = createInputGroup(
            "רוח לחימה ומוטיבציה", 
            "determination", 
            assesseeNumber, 
            holesData
        );
        inputGroupsContainer.appendChild(secondInputGroup);
        
        assesseeRow.appendChild(inputGroupsContainer);
        
        const assesseeNumberDiv = document.createElement("div");
        assesseeNumberDiv.className = "assessee-number-holes";
        assesseeNumberDiv.textContent = assesseeNumber;
        assesseeRow.appendChild(assesseeNumberDiv);
        
        assesseesList.appendChild(assesseeRow);
    });
    
    // Helper function to create input group with plus/minus buttons
    function createInputGroup(label, fieldName, assesseeNumber, data) {
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
                
                saveHolesData();
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
            
            saveHolesData();
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
                
                saveHolesData();
            }
        });
        
        inputContainer.appendChild(minusButton);
        inputContainer.appendChild(scoreInput);
        inputContainer.appendChild(plusButton);
        inputGroup.appendChild(inputContainer);
        
        return inputGroup;
    }
    
    // Helper function to save data to localStorage
    function saveHolesData() {
        const data = {};
        document.querySelectorAll(".assessee-row").forEach(row => {
            const assesseeNumber = row.dataset.number;
            data[assesseeNumber] = {
                teamwork: row.querySelector(".input-group:nth-child(1) .score-input").value,
                determination: row.querySelector(".input-group:nth-child(2) .score-input").value
            };
        });
        localStorage.setItem("holesData", JSON.stringify(data));
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
    
    backButton.addEventListener("click", () => {
        holesContainer.remove();
        backButton.remove();
        topButtonContainer.remove();
        activityNameDisplay.remove();
        instructionsUI.destroy();

        currentGame = null;
        displayMenu();
    });
    
    // Reset button event
    resetButton.addEventListener("click", () => {
        if (confirm("האם אתה בטוח שברצונך לאפס את כל הנתונים?")) {
            localStorage.removeItem("holesData");
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
        
        submitButton.disabled = true;
        submitButton.textContent = "שולח...";

        const succeeded =
            holesResubmitHeat != null
                ? await resubmitActivity(
                      currentTeamNumber,
                      currentTeamID,
                      "holes",
                      holesResubmitHeat,
                      resultString
                  )
                : await submitActivity(currentTeamNumber, currentTeamID, "holes", 1, resultString);

        if (succeeded) {
            showSuccessToast();

            localStorage.removeItem("holesData");

            if (holesResubmitHeat == null) {
                updateActivityNumber("holes", 1);
            }

            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> שליחה';

            setTimeout(() => {
                holesContainer.remove();
                backButton.remove();
                topButtonContainer.remove();
                activityNameDisplay.remove();
                instructionsUI.destroy();

                currentGame = null;
                displayMenu();
            }, 2000);
        } else {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> שליחה';
        }
    });
}

async function sacks(activityNumber){
    // Create and display the activity name banner
    const activityNameDisplay = document.createElement("div");
    activityNameDisplay.className = "activity-name-banner";
    setActivityTitleBannerContent(activityNameDisplay, engToHeb["sacks"], activityNumber);
    initialElement.appendChild(activityNameDisplay);
    
    const { topButtonContainer, actionsRow, backButton, resetButton, submitButton } =
        createGameTopToolbar(initialElement, { includeLoadPrevious: false });
    topButtonContainer.classList.add("game-top-toolbar--with-undo");
    
    const instructionsUI = createActivityInstructionsModal(
        initialElement,
        "לחיצה על הכדור מוסיפה הקפה. לחיצה ארוכה להורדת הקפות."
    );
    
    // Undo button (cancel last action)
    const actionStack = [];
    const undoButton = document.createElement("button");
    undoButton.className = "undo-button undo-button--toolbar";
    undoButton.innerHTML = '<i class="fas fa-forward"></i> בטל';
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
    actionsRow.insertBefore(undoButton, resetButton);
    
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
                
                // Create and show minus button above the ball
                minusButton = document.createElement("button");
                minusButton.className = "long-press-minus";
                minusButton.textContent = "-";
                minusButton.style.position = "absolute";
                
                // Position the minus button to the left of the ball
                const ballRect = ball.getBoundingClientRect();
                minusButton.style.left = (ballRect.left - 30) + "px";
                minusButton.style.top = (ballRect.top + ballRect.height/2 - 12) + "px";
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

        assesseeCard.appendChild(lapCounter);
        assesseeCard.appendChild(ball);
        assesseesGrid.appendChild(assesseeCard);
    });
    
    // Back button event
    backButton.addEventListener("click", () => {
        // Remove all created elements after initialElement
        sacksContainer.remove();
        backButton.remove();
        topButtonContainer.remove();
        activityNameDisplay.remove();
        instructionsUI.destroy();
        undoButton.remove();

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
        
        const succeeded = await submitActivity(
            currentTeamNumber,
            currentTeamID,
            "sacks",
            activityNumber,
            resultString
        );
        
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
            
            updateActivityNumber("sacks", activityNumber);
            
            // Wait 2 seconds before going back to menu so user can see the success message
            setTimeout(() => {
                // Reset current game
                currentGame = null;

                // Remove all created elements after initialElement
                sacksContainer.remove();
                backButton.remove();
                topButtonContainer.remove();
                activityNameDisplay.remove();
                instructionsUI.destroy();
                undoButton.remove();
                
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

function stretcher(activityNumber){
    const activityLabel = engToHeb["stretcher"];
    const activityNameDisplay = document.createElement("div");
    activityNameDisplay.className = "activity-name-banner";
    setActivityTitleBannerContent(activityNameDisplay, activityLabel, activityNumber);
    initialElement.appendChild(activityNameDisplay);
    
    const { topButtonContainer, actionsRow, backButton, resetButton, submitButton } =
        createGameTopToolbar(initialElement, { includeLoadPrevious: false });
    topButtonContainer.classList.add("game-top-toolbar--with-undo");
    
    const instructionsUI = createActivityInstructionsModal(
        initialElement,
        "לחיצה על הכדור מוסיפה נקודה. לחיצה ארוכה להורדת נקודות."
    );
    
    // Undo button (cancel last action)
    const actionStack = [];
    const undoButton = document.createElement("button");
    undoButton.className = "undo-button undo-button--toolbar";
    undoButton.innerHTML = '<i class="fas fa-forward"></i> בטל';
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
        saveStretcherData();
        updateUndoButtonState();
    });
    actionsRow.insertBefore(undoButton, resetButton);
    
    // Create main container
    const stretcherContainer = document.createElement("div");
    stretcherContainer.className = "sacks-container";
    initialElement.appendChild(stretcherContainer);

    // Stopwatch widget (for stretcher)
    const stopwatchWidget = document.createElement("div");
    stopwatchWidget.className = "stretcher-stopwatch";
    const stopwatchDisplay = document.createElement("div");
    stopwatchDisplay.className = "stretcher-stopwatch-display";
    const stopwatchActions = document.createElement("div");
    stopwatchActions.className = "stretcher-stopwatch-actions";
    const stopwatchToggleButton = document.createElement("button");
    stopwatchToggleButton.className = "stretcher-stopwatch-button";
    const stopwatchResetButton = document.createElement("button");
    stopwatchResetButton.className = "stretcher-stopwatch-button stretcher-stopwatch-button--reset";
    stopwatchResetButton.textContent = "איפוס";
    stopwatchActions.appendChild(stopwatchToggleButton);
    stopwatchActions.appendChild(stopwatchResetButton);
    stopwatchWidget.appendChild(stopwatchDisplay);
    stopwatchWidget.appendChild(stopwatchActions);
    initialElement.appendChild(stopwatchWidget);

    let stopwatchInterval = null;
    let stopwatchStartMs = 0;
    let stopwatchElapsedMs = 0;
    let stopwatchAlertFired = false;

    const formatStopwatch = (ms) => {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    const playStopwatchAlertTone = () => {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.0001, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.36);
            setTimeout(() => ctx.close().catch(() => {}), 450);
        } catch (e) {
            console.log("stopwatch tone unavailable", e);
        }
    };

    const renderStopwatch = () => {
        stopwatchDisplay.textContent = formatStopwatch(stopwatchElapsedMs);
        const over60 = stopwatchElapsedMs >= 60000;
        stopwatchDisplay.classList.toggle("stretcher-stopwatch-display--alert", over60);
        stopwatchToggleButton.textContent = stopwatchInterval ? "עצור" : "התחל";
    };

    const maybeTriggerStopwatchAlert = () => {
        if (stopwatchAlertFired || stopwatchElapsedMs < 60000) return;
        stopwatchAlertFired = true;
        if (navigator.vibrate) {
            navigator.vibrate([120, 80, 120]);
        }
        playStopwatchAlertTone();
    };

    const tickStopwatch = () => {
        stopwatchElapsedMs = Math.max(0, performance.now() - stopwatchStartMs);
        maybeTriggerStopwatchAlert();
        renderStopwatch();
    };

    const startStopwatch = () => {
        if (stopwatchInterval) return;
        stopwatchStartMs = performance.now() - stopwatchElapsedMs;
        stopwatchInterval = setInterval(tickStopwatch, 100);
        renderStopwatch();
    };

    const stopStopwatch = () => {
        if (!stopwatchInterval) return;
        clearInterval(stopwatchInterval);
        stopwatchInterval = null;
        renderStopwatch();
    };

    const resetStopwatch = () => {
        stopStopwatch();
        stopwatchElapsedMs = 0;
        stopwatchAlertFired = false;
        renderStopwatch();
    };

    stopwatchToggleButton.addEventListener("click", () => {
        if (stopwatchInterval) stopStopwatch();
        else startStopwatch();
    });
    stopwatchResetButton.addEventListener("click", resetStopwatch);
    renderStopwatch();
    
    // Create grid for assessees
    const assesseesGrid = document.createElement("div");
    assesseesGrid.className = "assessees-grid";
    stretcherContainer.appendChild(assesseesGrid);
    
    // Load existing data from localStorage
    const stretcherData = JSON.parse(localStorage.getItem("stretcherData") || "{}");
    
    // Create assessee balls
    assesseeNumbers.forEach(assesseeNumber => {
        const assesseeCard = document.createElement("div");
        assesseeCard.className = "assessee-card";
        assesseeCard.dataset.number = assesseeNumber;

        const ball = document.createElement("div");
        ball.className = "assessee-ball";
        ball.textContent = assesseeNumber;

        const lapCounter = document.createElement("div");
        lapCounter.className = "lap-counter";
        lapCounter.textContent = stretcherData[assesseeNumber] || "0";

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
                
                // Create and show minus button above the ball
                minusButton = document.createElement("button");
                minusButton.className = "long-press-minus";
                minusButton.textContent = "-";
                minusButton.style.position = "absolute";
                
                // Position the minus button to the left of the ball
                const ballRect = ball.getBoundingClientRect();
                minusButton.style.left = (ballRect.left - 30) + "px";
                minusButton.style.top = (ballRect.top + ballRect.height/2 - 12) + "px";
                minusButton.style.zIndex = "1000";
                
                // Add click event to decrement
                minusButton.addEventListener("click", () => {
                    const currentCount = parseInt(lapCounter.textContent) || 0;
                    if (currentCount > 0) {
                        lapCounter.textContent = (currentCount - 1).toString();
                        actionStack.push({ number: assesseeNumber, delta: -1 });
                        updateUndoButtonState();
                        saveStretcherData();
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
                saveStretcherData();
            }
            clearPressTimer();
        });

        ball.addEventListener("pointercancel", clearPressTimer);
        ball.addEventListener("pointerleave", clearPressTimer);

        assesseeCard.appendChild(lapCounter);
        assesseeCard.appendChild(ball);
        assesseesGrid.appendChild(assesseeCard);
    });
    
    // Back button event
    backButton.addEventListener("click", () => {
        // Remove all created elements after initialElement
        stopStopwatch();
        stretcherContainer.remove();
        stopwatchWidget.remove();
        backButton.remove();
        topButtonContainer.remove();
        activityNameDisplay.remove();
        instructionsUI.destroy();
        undoButton.remove();

        // Reset current game
        currentGame = null;
        
        // Display main menu
        displayMenu();
    });
    
    // Reset button event
    resetButton.addEventListener("click", () => {
        if (confirm("האם אתה בטוח שברצונך לאפס את כל הנתונים?")) {
            localStorage.removeItem("stretcherData");
            document.querySelectorAll(".lap-counter").forEach(counter => {
                counter.textContent = "0";
            });
            actionStack.length = 0;
            updateUndoButtonState();
            resetStopwatch();
        }
    });
    
    // Submit button event
    submitButton.addEventListener("click", async () => {
        // Show loading
        showLoading();
        
        // Build result string
        const resultString = buildStretcherResultString();
        console.log("resultString:", resultString);
        if (resultString.length === 0) {
            hideLoading();
            alert("לא ניתן לשלוח מקצה ריק.");
            return;
        }

        // Show loading state
        submitButton.disabled = true;
        submitButton.textContent = "שולח...";
        
        // Submit activity
        const succeeded = await submitActivity(currentTeamNumber, currentTeamID, "stretcher", activityNumber, resultString);
        
        // Hide loading
        hideLoading();
        
        if (succeeded) {
            // Show loading state
            submitButton.disabled = false;
            submitButton.textContent = "שליחה";

            // Show success toast
            showSuccessToast("הטופס נשלח בהצלחה!");
            
            // Clear localStorage after successful submission
            localStorage.removeItem("stretcherData");
            
            // Update activity number to track completion
            updateActivityNumber("stretcher", activityNumber);
            activityNumber += 1;
            console.log("incremented activity number locally to: ", activityNumber);
            
            // Reset game for next activity
            resetGame();
        } else {
            alert("שגיאה בשליחת נתונים לשרת. נא לנסות שנית.");
            // Show loading state
            submitButton.disabled = false;
            submitButton.textContent = "שליחה";
        }
    });
    
    // Helper function to save data to localStorage
    function saveStretcherData() {
        const data = {};
        document.querySelectorAll(".assessee-card").forEach(card => {
            const number = card.dataset.number;
            const count = parseInt(card.querySelector(".lap-counter").textContent);
            data[number] = count;
        });
        localStorage.setItem("stretcherData", JSON.stringify(data));
    }
    
    // Helper function to build result string
    function buildStretcherResultString() {
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
    
    // Helper function to reset game for next activity
    function resetGame() {
        // Reset all counters
        document.querySelectorAll(".lap-counter").forEach(counter => {
            counter.textContent = "0";
        });
        actionStack.length = 0;
        updateUndoButtonState();
        resetStopwatch();
        
        const banner = document.querySelector(".activity-name-banner");
        if (banner) {
            console.log("in resetGame, displaying banner with activity number: ", activityNumber);
            setActivityTitleBannerContent(banner, activityLabel, activityNumber);
        }
    }
}

function sociometricStretcher(activityNumber){
    const brackets = [];
    let autoScrollInterval = null;
    let lastBucketDragTargetBracket = null;

    const activityLabel = engToHeb["sociometric_stretcher"];
    const activityNameDisplay = document.createElement("div");
    activityNameDisplay.className = "activity-name-banner";
    setActivityTitleBannerContent(activityNameDisplay, activityLabel, activityNumber);
    initialElement.appendChild(activityNameDisplay);
    
    const instructionsUI = createActivityInstructionsModal(
        initialElement,
        "גררו כל מוערך לריבוע לפי המשימה שביצע."
    );

    const gameLayout = document.createElement("div");
    gameLayout.className = "stretcher-game-layout";
    initialElement.appendChild(gameLayout);

    const bucketSection = document.createElement("div");
    bucketSection.className = "stretcher-bucket-section";
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
    orderSection.className = "stretcher-order-section";
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

    function manageAutoScroll(clientY) {
        const margin = 80, speed = 8;
        if (clientY > margin && clientY < window.innerHeight - margin) {
            stopAutoScroll();
            return;
        }
        if (autoScrollInterval) return;
        if (clientY < margin) {
            autoScrollInterval = setInterval(() => {
                document.documentElement.scrollTop -= speed;
                document.body.scrollTop -= speed;
            }, 15);
        } 
        else if (clientY > window.innerHeight - margin) {
            autoScrollInterval = setInterval(() => {
                document.documentElement.scrollTop += speed;
                document.body.scrollTop += speed;
            }, 15);
        }
    }
    function stopAutoScroll() {
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
            autoScrollInterval = null;
        }
    }
    
    let draggedBucketItem = null;
    let ghostBucketItem = null;
    let isDraggingBucket = false;
    let startXBucket, startYBucket;
    
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

        manageAutoScroll(touch.clientY);
        ghostBucketItem.style.display = "none";
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        ghostBucketItem.style.display = "";
        const newTargetBracket = elementBelow?.closest(".stretcher-bracket");
        // Check if the new target bracket is different from the last target bracket
        if (newTargetBracket !== lastBucketDragTargetBracket) {
            // If so, remove the dragging target class from the last target bracket
            // and add it to the new target bracket
            if (lastBucketDragTargetBracket)
                lastBucketDragTargetBracket.classList.remove("dragging-target");
            if (newTargetBracket) newTargetBracket.classList.add("dragging-target");
                lastBucketDragTargetBracket = newTargetBracket;
        }

        const currentTarget = elementBelow?.closest(".block-wrapper");
        const previousTarget = document.querySelector(".replace-target");
        if (previousTarget && previousTarget !== currentTarget)
            previousTarget.classList.remove("replace-target");
        if (newTargetBracket && currentTarget) {
            const capacity = parseInt(newTargetBracket.dataset.maxCapacity);
            if (newTargetBracket.querySelectorAll(".block-wrapper").length >= capacity) {
                currentTarget.classList.add("replace-target");
            }
        }
    };
    
    const handleBucketTouchEnd = (e) => {
        stopAutoScroll();

        document.body.classList.remove("no-touch-actions");
        document.querySelectorAll(".replace-target, .dragging-target").forEach((el) => el.classList.remove("replace-target", "dragging-target"));
        lastBucketDragTargetBracket = null;

        if (isDraggingBucket) {
            const touch = e.changedTouches[0];
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetBlock = elementBelow?.closest(".block-wrapper");
            const targetBracket = elementBelow?.closest(".stretcher-bracket");
        
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
        
        if (ghostBucketItem?.parentNode)
            ghostBucketItem.remove();
        
        draggedBucketItem = null;
        ghostBucketItem = null;

        isDraggingBucket = false;
        document.removeEventListener("touchmove", handleBucketTouchMove);
    };
    
    function initDrag(el) {
        let offsetX, offsetY, currentClone, originalParent, originalNextSibling, isDraggingBracket = false, startXBracket, startYBracket, lastTargetBracket = null;
        const getClientCoords = (e) => e.touches?.[0] || e.changedTouches?.[0] || e;
        
        const move = (e) => {
            if (!isDraggingBracket) {
                const { clientX, clientY } = getClientCoords(e);
                const deltaX = Math.abs(clientX - startXBracket);
                const deltaY = Math.abs(clientY - startYBracket);
                if (Math.sqrt(deltaX ** 2 + deltaY ** 2) > 10) {
                    isDraggingBracket = true;
                    const rect = el.getBoundingClientRect();
                    offsetY = clientY - rect.top;
                    offsetX = clientX - rect.left;
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
            currentClone.style.left = `${clientX - offsetX}px`;
            manageAutoScroll(clientY);

            currentClone.style.display = "none";
            const elementBelow = document.elementFromPoint(clientX, clientY);
            currentClone.style.display = "";
            const currentTarget = elementBelow?.closest(".block-wrapper");
            const previousTarget = document.querySelector(".replace-target");
            if (previousTarget && previousTarget !== currentTarget)
                previousTarget.classList.remove("replace-target");
            const newParentBracket = elementBelow?.closest(".stretcher-bracket");          
            // Check if the new parent bracket is different from the last target bracket
            if (newParentBracket !== lastTargetBracket) {
                // If so, remove the dragging target class from the last target bracket
                // and add it to the new parent bracket
                if (lastTargetBracket)
                    lastTargetBracket.classList.remove("dragging-target");
                if (newParentBracket) newParentBracket.classList.add("dragging-target");
                    lastTargetBracket = newParentBracket;
            }
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
        
        const endDrag = () => {
            stopAutoScroll();
            // Remove the dragging target class from the last target bracket
            if (lastTargetBracket) {
                lastTargetBracket.classList.remove("dragging-target");
                lastTargetBracket = null;
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
            if (e.target.classList.contains("remove-button") || (e.button && e.button !== 0))
                return;
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
            document.querySelector(".stretcher-bucket-section").style.display = "none";
        } 
        else {
            document.querySelector(".stretcher-bucket-section").style.display = "flex";
        }
    }
        
    function updateUI() {
        updateResultsStrings();
        updateBucketVisibility();
        updateBracketFullness();
    }

    function updateBracketFullness() {
        document.querySelectorAll(".stretcher-bracket").forEach((bracket) => {
            const capacity = parseInt(bracket.dataset.maxCapacity);
            const currentSize = bracket.querySelectorAll(".block-wrapper").length;
            if (currentSize >= capacity) {
                bracket.classList.add("bracket-full");
            } 
            else {
                bracket.classList.remove("bracket-full");
            }
        });
    }

    const limits = (assesseeNumbers.length > 19) ? [8, 2, 4] : [4, 2, 4];
    const limitTitles = ["לקחו אלונקה", "לקחו ג'ריקן", "מקום ראשון"];
    for (let i = 0; i < limits.length; i++) {
        const bracket = document.createElement("div");
        bracket.className = "stretcher-bracket";
        
        const currentLimit = limits[i];
        bracket.setAttribute("data-max-capacity", currentLimit);
        
        const bracketTitle = document.createElement("div");
        bracketTitle.className = "stretcher-bracket-title";
        bracketTitle.textContent = `${limitTitles[i]} (${limits[i]} מוערכים)`;

        bracket.appendChild(bracketTitle);
        orderSection.appendChild(bracket);
        brackets.push(bracket);

        bracket.addEventListener("dragenter", (e) => {
            e.preventDefault();
            if (lastBucketDragTargetBracket !== bracket) {
                if (lastBucketDragTargetBracket)
                    lastBucketDragTargetBracket.classList.remove("dragging-target");
                bracket.classList.add("dragging-target");
                lastBucketDragTargetBracket = bracket;
            }
        });

        bracket.addEventListener("dragover", (e) => {
            e.preventDefault();
            manageAutoScroll(e.clientY);
            const elementBelow = e.target.closest(".block-wrapper");
            const isFull = bracket.querySelectorAll(".block-wrapper").length >= parseInt(bracket.dataset.maxCapacity);
            if (isFull && elementBelow) {
                elementBelow.classList.add("replace-target");
            }
        });
        
        bracket.addEventListener("dragleave", (e) => {
            if (e.relatedTarget && !bracket.contains(e.relatedTarget)) {
                bracket.classList.remove("dragging-target");
                if (lastBucketDragTargetBracket === bracket)
                    lastBucketDragTargetBracket = null;
            }
            stopAutoScroll();
        });

        bracket.addEventListener("drop", (e) => {
            e.preventDefault();
            stopAutoScroll();
            // Remove the dragging target class from all elements
            document.querySelectorAll(".replace-target, .dragging-target").forEach((el) =>
                el.classList.remove("replace-target", "dragging-target")
            );
            lastBucketDragTargetBracket = null;
            const number = e.dataTransfer.getData("text/plain");
            if (!number) return;
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

    async function applyPreviousSociometricArrangement() {
        if (activityNumber <= 1) {
            alert("אין מקצה קודם לטעינה.");
            return;
        }
        showLoading();
        let order;
        try {
            order = await fetchPreviousHeatRaceOrder(
                currentTeamNumber,
                "sociometric_stretcher",
                activityNumber - 1
            );
        } catch (e) {
            console.error(e);
            hideLoading();
            alert("שגיאה בטעינת נתונים מהשרת.");
            return;
        }
        hideLoading();
        const allowed = new Set(assesseeNumbers.map(String));
        const filtered = order.filter((n) => allowed.has(String(n)));
        if (filtered.length === 0) {
            alert("לא נמצאו נתוני מיקום במקצה הקודם.");
            return;
        }
        brackets.forEach((br) => {
            br.querySelectorAll(".block-wrapper").forEach((w) => returnToBucket(w));
        });
        const totalCap = limits.reduce((a, b) => a + b, 0);
        const pool = filtered.slice(0, totalCap);
        let offset = 0;
        for (let bi = 0; bi < brackets.length; bi++) {
            const cap = limits[bi];
            const slice = pool.slice(offset, offset + cap);
            offset += cap;
            for (const num of slice) {
                createBlockInBracket(num, brackets[bi]);
            }
        }
        updateUI();
    }

    const sociometricToolbar = createGameTopToolbar(initialElement, {
        onLoadPrevious: applyPreviousSociometricArrangement,
    });
    const { topButtonContainer, backButton, resetButton, submitButton } = sociometricToolbar;
    topButtonContainer.remove();
    activityNameDisplay.insertAdjacentElement("afterend", topButtonContainer);

    document.querySelectorAll(".bucket-block").forEach((block) => {
        block.addEventListener("dragstart", (e) =>
            e.dataTransfer.setData("text/plain", block.dataset.number)
        );
        block.addEventListener("dragend", () => {
            if (lastBucketDragTargetBracket)
                lastBucketDragTargetBracket.classList.remove("dragging-target");
            lastBucketDragTargetBracket = null;
            stopAutoScroll();
        });
        block.addEventListener("touchstart", (e) => {
            if (block.style.display === "none") return;
            e.preventDefault();
            draggedBucketItem = block;
            isDraggingBucket = false;
            const touch = e.touches[0];
            startXBucket = touch.clientX;
            startYBucket = touch.clientY;
            document.addEventListener("touchmove", handleBucketTouchMove, {passive: false,});
            document.addEventListener("touchend", handleBucketTouchEnd, {once: true,});
        },
        { passive: false }
        );
    });

    // Back to menu button event handler
    backButton.addEventListener("click", () => {
        // Remove all game content (button container and game layout)
        const buttonContainer = initialElement.querySelector('.top-button-container');
        const gameLayout = initialElement.querySelector('.stretcher-game-layout');
        const activityNameDisplay = initialElement.querySelector('.activity-name-banner');

        backButton.remove();
        if (buttonContainer) buttonContainer.remove();
        if (gameLayout) gameLayout.remove();
        if (activityNameDisplay) activityNameDisplay.remove();
        instructionsUI.destroy();
        
        // Reset current game
        currentGame = null;
        
        // Display main menu
        displayMenu();
    });

    // Reset button
    resetButton.addEventListener("click", () => {
        resetGame();
    });
    
    function hasUnderfilledBrackets() {
        for (let i = 0; i < brackets.length; i++) {
            const capacity = parseInt(brackets[i].dataset.maxCapacity, 10);
            const n = brackets[i].querySelectorAll(".block-wrapper").length;
            if (n < capacity) return true;
        }
        return false;
    }

    submitButton.addEventListener("click", async () => {
        updateUI();
        if (getTotalBlocks() === 0) {
            alert("יש להוסיף לפחות מוערך אחד למקצה.");
            return;
        }
        if (hasUnderfilledBrackets() && !confirm("לא כל התאים מלאים, האם ברצונך לשלוח בכל זאת?")) {
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "שולח...";

        showLoading();

        const bucketSection = document.querySelector(".stretcher-bucket-section");
        const orderSection = document.querySelector(".stretcher-order-section");
        if (bucketSection) bucketSection.style.display = "none";
        if (orderSection) orderSection.style.display = "none";

        const finalResultString = buildFinalResultString();
        const succeeded = await submitActivity(
            currentTeamNumber,
            currentTeamID,
            "sociometric_stretcher",
            activityNumber,
            finalResultString
        );

        hideLoading();

        if (succeeded) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> שליחה';

            showSuccessToast();

            updateActivityNumber("sociometric_stretcher", activityNumber);
            activityNumber += 1;
            console.log("incremented activity number locally to: ", activityNumber);
            resetGame();
        } else {
            alert("שגיאה בשליחת נתונים לשרת. נא לנסות שנית.");
            if (bucketSection) bucketSection.style.display = "flex";
            if (orderSection) orderSection.style.display = "flex";
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> שליחה';
        }
    });

    function buildFinalResultString() {
        const segment = (prefix, csv) => {
            const nums = String(csv ?? "")
                .split(",")
                .map((s) => s.trim())
                .filter((n) => n !== "" && numberToIdMap[n] != null);
            return `${prefix}-${nums.map((n) => `${n}:${numberToIdMap[n]}`).join(",")}`;
        };
        return `${segment("stretcher", stretcherBracketResults)},${segment("first", firstPlaceBracketResults)},${segment("jerrycan", jerrycanResultsBracketResults)}`;
    }

    function resetGame(){
        brackets.forEach((br) => {
            br.querySelectorAll(".block-wrapper").forEach((wrapper) =>
                returnToBucket(wrapper)
            );
        });

        const bucketSection = document.querySelector(".stretcher-bucket-section");
        const orderSection = document.querySelector(".stretcher-order-section");
        if (bucketSection) bucketSection.style.display = "flex";
        if (orderSection) orderSection.style.display = "flex";

        const banner = document.querySelector(".activity-name-banner");
        if (banner) {
            console.log ("in resetGame, displaying banner with activity number: ", activityNumber);
            setActivityTitleBannerContent(banner, activityLabel, activityNumber);
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
    const activityLabel = engToHeb[activityName] || activityName;
    const activityNameDisplay = document.createElement("div");
    activityNameDisplay.className = "activity-name-banner";
    setActivityTitleBannerContent(activityNameDisplay, activityLabel, activityNumber);
    initialElement.appendChild(activityNameDisplay);

    let bracket;
    let orderSection;
    let currentIndex = 0;
    let currentClone = null;

    function updateResultString() {
        const items = bracket.querySelectorAll(".block-wrapper .block");
        const numbers = Array.from(items).map((el) => el.dataset.originalNumber);
        raceAssesseesOrder = numbers.join(",");
        console.log("raceAssesseesOrder: ", raceAssesseesOrder);
    }

    function scrollNewRaceBlockIntoView(el) {
        if (!el || !el.isConnected) return;
        requestAnimationFrame(() => {
            el.scrollIntoView({ block: "nearest", behavior: "smooth", inline: "nearest" });
        });
    }

    function getScrollableParent(el) {
        while (el) {
            const style = getComputedStyle(el);
            const overflowY = style.overflowY;
            if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight) {
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

            const scrollable = getScrollableParent(initialElement);
            if (clientY < margin) {
                window.scrollBy(0, -speed);
                document.documentElement.scrollTop -= speed;
                document.body.scrollTop -= speed;
                scrollable.scrollTop -= speed;
            } else if (clientY > window.innerHeight - margin) {
                window.scrollBy(0, speed);
                document.documentElement.scrollTop += speed;
                document.body.scrollTop += speed;
                scrollable.scrollTop += speed;
            }

            const siblings = [...bracket.querySelectorAll(".block-wrapper:not(.dragging)")];
            const next = siblings.find((sibling) => {
                const rect = sibling.getBoundingClientRect();
                return clientY <= rect.top + rect.height / 2;
            });

            if (next) {
                bracket.insertBefore(el, next);
            } else {
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
            start(e.clientX, e.clientY);
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });

        el.addEventListener("touchstart", (e) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                start(touch.clientX, touch.clientY);
                document.addEventListener("touchmove", onTouchMove, { passive: false });
                document.addEventListener("touchend", onTouchEnd);
            }
        });
    }

    function addAssesseeToRaceBracket(number, options = {}) {
        const { suppressScroll = false } = options;
        const block = document.querySelector(`.bucket-block[data-number="${number}"]`);
        if (!block || block.style.display === "none") return;

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
            e.stopPropagation();
            bracket.removeChild(blockWrapper);
            block.style.display = "flex";
            if (document.querySelectorAll(".bucket-block").length - bracket.querySelectorAll(".block-wrapper").length > 0) {
                document.querySelector(".bucket-section").style.display = "flex";
            }
            updateResultString();
        });
        removeBtn.addEventListener("touchstart", (e) => {
            e.stopPropagation();
        });

        initDrag(blockWrapper);
        if (!suppressScroll) scrollNewRaceBlockIntoView(blockWrapper);
    }

    const { topButtonContainer, backButton, resetButton, submitButton } = createGameTopToolbar(initialElement, {
        onLoadPrevious: async () => {
            if (activityNumber <= 1) {
                alert("אין מקצה קודם לטעינה.");
                return;
            }
            showLoading();
            let order;
            try {
                order = await fetchPreviousHeatRaceOrder(currentTeamNumber, activityName, activityNumber - 1);
            } catch (e) {
                console.error(e);
                hideLoading();
                alert("שגיאה בטעינת נתונים מהשרת.");
                return;
            }
            hideLoading();
            const allowed = new Set(assesseeNumbers.map(String));
            const filtered = order.filter((n) => allowed.has(String(n)));
            if (filtered.length === 0) {
                alert("לא נמצאו נתוני מיקום במקצה הקודם.");
                return;
            }
            while (bracket.querySelector(".block-wrapper")) {
                bracket.removeChild(bracket.querySelector(".block-wrapper"));
            }
            document.querySelectorAll(".bucket-block").forEach((b) => {
                b.style.display = "flex";
            });
            orderSection.classList.remove("order-section-centered");
            orderSection.style.width = "";
            document.querySelector(".bucket-section").style.display = "flex";
            currentIndex = 0;
            filtered.forEach((num) => addAssesseeToRaceBracket(num, { suppressScroll: true }));
            const lastRaceWrapper = bracket.querySelector(".block-wrapper:last-child");
            scrollNewRaceBlockIntoView(lastRaceWrapper);
            updateResultString();
        },
    });

    const instructionsUI = createActivityInstructionsModal(
        initialElement,
        "דרגו לפי סדר הגעה – הראשון שתבחרו הוא שהגיע ראשון."
    );

    const gameLayout = document.createElement("div");
    gameLayout.className = "game-layout";
    initialElement.appendChild(gameLayout);

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

    orderSection = document.createElement("div");
    orderSection.className = "order-section";
    gameLayout.appendChild(orderSection);

    bracket = document.createElement("div");
    bracket.className = "bracket";
    bracket.setAttribute("data-max-capacity", "7");
    orderSection.appendChild(bracket);

    const bracketTitle = document.createElement("div");
    bracketTitle.className = "bracket-title";
    bracketTitle.textContent = "Box Section 1";

    document.querySelectorAll(".bucket-block").forEach((block) => {
        block.addEventListener("click", () => {
            addAssesseeToRaceBracket(block.dataset.number);
        });
    });

    // Back to menu button event handler
    backButton.addEventListener("click", () => {
        // Remove all game content (button container and game layout)
        const buttonContainer = initialElement.querySelector('.top-button-container');
        const gameLayout = initialElement.querySelector('.game-layout');
        const activityNameDisplay = initialElement.querySelector('.activity-name-banner');
        
        backButton.remove();
        if (buttonContainer) buttonContainer.remove();
        if (gameLayout) gameLayout.remove();
        if (activityNameDisplay) activityNameDisplay.remove();
        instructionsUI.destroy();

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

        const banner = document.querySelector(".activity-name-banner");
        if (banner) {
            console.log ("in resetGame, displaying banner with activity number: ", activityNumber);
            setActivityTitleBannerContent(banner, activityLabel, activityNumber);
        }
    }
}

/**
 * Fetches finish order from get_team_activity_data for one heat (by place ascending).
 * Prefers activity[heat] (e.g. sprints["11"] → place) over places[heat][0].
 * redisActivityName: e.g. "sprints", "crawls", "sociometric_stretcher"
 */
async function fetchPreviousHeatRaceOrder(teamNumber, redisActivityName, previousHeatNumber) {
    const heatKey = String(previousHeatNumber);
    const response = await fetch("https://misc-ten.vercel.app/get_team_activity_data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            team_number: String(teamNumber),
            activity_names: redisActivityName,
        }),
    });
    if (!response.ok) {
        throw new Error(`get_team_activity_data ${response.status}`);
    }
    const data = await response.json();
    if (data && typeof data.error === "string") {
        throw new Error(data.error);
    }
    const tn = String(teamNumber);
    let teamData = data[tn];
    if (!teamData && data) {
        const keys = Object.keys(data);
        const match = keys.find((k) => String(k) === tn);
        if (match != null) teamData = data[match];
    }
    if (!teamData || typeof teamData !== "object") {
        return [];
    }
    const entries = [];
    for (const assesseeNum of Object.keys(teamData)) {
        const act = teamData[assesseeNum]?.[redisActivityName];
        if (!act || typeof act !== "object") continue;

        let place = null;
        const direct =
            act[heatKey] !== undefined && act[heatKey] !== null
                ? act[heatKey]
                : act[previousHeatNumber];
        if (direct !== undefined && direct !== null && typeof direct !== "object") {
            const p = Number(direct);
            if (Number.isFinite(p)) place = p;
        }
        if (place == null) {
            const places = act.places;
            if (places && typeof places === "object") {
                const arr = places[heatKey] ?? places[previousHeatNumber];
                if (Array.isArray(arr) && arr.length >= 1) {
                    const p = Number(arr[0]);
                    if (Number.isFinite(p)) place = p;
                }
            }
        }
        if (place == null) continue;
        entries.push({ num: String(assesseeNum), place });
    }
    entries.sort((a, b) => a.place - b.place || a.num.localeCompare(b.num, undefined, { numeric: true }));
    return entries.map((e) => e.num);
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

