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

    if(!initialSetup()){
        return;
    }
    
    sociometricStretcher();
});

function initialSetup(){
    window.trun = function() { return false; };
    initialElement = document.querySelector("article div[ui-view]");
    const existing = initialElement.nextSibling;
    if (existing) existing.remove();

    return true;
}
function sociometricStretcher(){
    const brackets = [];
    let autoScrollInterval = null;
    let lastBucketDragTargetBracket = null;

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
    instructionsDiv.textContent = "גררו כל מוערך לריבוע לפי המשימה שביצע.";
    initialElement.appendChild(instructionsDiv);

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
    
    let assesseeNumbers = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
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
        const newTargetBracket = elementBelow?.closest(".bracket");
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
            const newParentBracket = elementBelow?.closest(".bracket");          
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
            document.querySelector(".bucket-section").style.display = "none";
        } 
        else {
            document.querySelector(".bucket-section").style.display = "flex";
        }
    }
        
    function updateUI() {
        updateResultsStrings();
        updateBucketVisibility();
        updateBracketFullness();
    }

    function updateBracketFullness() {
        document.querySelectorAll(".bracket").forEach((bracket) => {
            const capacity = parseInt(bracket.dataset.maxCapacity);
            const currentSize = bracket.querySelectorAll(".block-wrapper").length;
            if (currentSize >= capacity) {
                bracket.classList.add("bracket-full");
            } else {
                bracket.classList.remove("bracket-full");
            }
        });
    }

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
        const gameLayout = initialElement.querySelector('.game-layout');
        const submitContainer = initialElement.querySelector('.submit-container');
        const activityNumberBanner = initialElement.querySelector('.activity-number-banner');
        const activityNameDisplay = initialElement.querySelector('.activity-name-banner');
        const instructionsDiv = initialElement.querySelector('.instructions');

        if (buttonContainer) buttonContainer.remove();
        if (gameLayout) gameLayout.remove();
        if (submitContainer) submitContainer.remove();
        if (activityNumberBanner) activityNumberBanner.remove();
        if (activityNameDisplay) activityNameDisplay.remove();
        if (instructionsDiv) instructionsDiv.remove();
        
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
            br.querySelectorAll(".block-wrapper").forEach((wrapper) =>
                returnToBucket(wrapper)
            );
        });

        const bucketSection = document.querySelector(".bucket-section");
        const orderSection = document.querySelector(".order-section");
        if (bucketSection) bucketSection.style.display = "flex";
        if (orderSection) orderSection.style.display = "flex";

        const banner = document.querySelector(".activity-number-banner");
        if (banner) {
            console.log ("in resetGame, displaying banner with activity number: ", activityNumber);
            banner.textContent = `מקצה נוכחי: ${activityNumber}`;
        }

        updateUI();
    }
}