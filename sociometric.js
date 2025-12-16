let teamMap = null;
let team_number = null;
var user_number = null;
let dragStartIndex;
let draggedElement = null;
let placeholder;
var blockNumbers = null;
let touchOffset;
let containerRect;
var assessees = [];
let bucketContainer = null;
let orderContainer = null;
let resetButton = null;
let bracketCapacities = []; // Track max capacity for each bracket
let firstBracket = null;
let secondBracket = null;
let thirdBracket = null;
let fourthBracket = null;

// Store the original XHR open method
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;
// Override the open method
function extractTeamOptions(response) {
  try {
    // Check if response has the expected structure
    if (!response?.dataFields || typeof response.dataFields !== "object") {
      return null;
    }

    // Find the object with name = "צוות"
    const teamField = Object.values(response.dataFields).find(
      (field) => field.name === "צוות"
    );

    // If we didn't find the team field or it doesn't have options
    if (!teamField?.options || !Array.isArray(teamField.options)) {
      return null;
    }

    // Convert to object where key is text and value is id
    return teamField.options.reduce((acc, option) => {
      acc[option.text] = option.id;
      return acc;
    }, {});
  } catch (error) {
    console.log("Error parsing response:", error);
    return null;
  }
}
XMLHttpRequest.prototype.open = function () {
  this.addEventListener("load", function () {
    try {
      if (teamMap) return;
      const response = JSON.parse(this.responseText);
      teamMap = extractTeamOptions(response);
      if (teamMap) {
        console.log("Found team map:", teamMap);
        // Use teamMap here...
      }
    } catch (e) {
      console.log("Not a relevant response:", e);
    }
  });
  originalOpen.apply(this, arguments);
};
// If you need to also track the request data:
XMLHttpRequest.prototype.send = function () {
  console.log("Request being sent:", arguments[0]);
  originalSend.apply(this, arguments);
};

TB.render("component_3", function (data) {
    setTimeout(function () {
        // hide submit button, show my own
        $(".form-submit .btn-success").hide(); // or use .addClass("hidden") with CSS
        
        // in id box allow only numbers
        const input = document.getElementById("fieldoaANBAwr1b");
        input.addEventListener("input", function (event) {
            this.value = this.value.replace(/\D/g, "");
        });
        
        // hide result/rating input box and hidden assessee list
        $("#field_block_field_106").hide();
        $(".component_3_field_570").hide();
        // hide instructions div (until input boxes are populated)
        let instructions_div = $(".tb-field-type-_special_");
        instructions_div.hide();

        // when team is changed, get updated team number and team id, and also get the list of its assessees
        $("#field_block_field_244").change(() => {
            team_number = $("#field_block_field_244 .select2-selection__rendered").attr("title");
            console.log("Changed team number to " + team_number);
      
            const container = document.querySelector('#field_block_field_570');
            const observer = new MutationObserver(() => {
                const options = container.querySelectorAll('option');
                // const numbers = Array.from(options).map(opt => opt.textContent.trim()).filter(text => /^\d+$/.test(text)).map(Number);
                const numberToIdMap = {};
                Array.from(options).forEach(opt => {
                    const text = opt.textContent.trim();
                    const value = opt.value.trim();
                    if (/^\d+$/.test(text) && value !== "") {
                        numberToIdMap[Number(text)] = value;
                    }
                });
                console.log(numberToIdMap);
    
                assessees = Object.keys(numberToIdMap);
                console.log("assessees loaded: " + JSON.stringify(assessees));
    
                observer.disconnect(); // stop observing after the first update
            });

            observer.observe(container, { childList: true, subtree: true });
        });

        // when assessee is updated, load the rest of the interface
        $("#field_block_field_78").change(() => {
            user_number = Number($("#field_block_field_78 .select2-selection__rendered").attr("title"));
            console.log("user_number:", user_number);
            console.log("type of user_number:", typeof(user_number));

            // if no assessee is defined, empty game classes, remove instructions, and return
            if (user_number === undefined) {
                $(".game-layout").remove();
                $(".reset-button").remove();
                instructions_div.hide();
                return;
            }
            // if assessee was selected, show instructions
            else {
                instructions_div.show();
            }

            // if game classes already exist, we want to refresh them
            if ($(".game-layout").length || $(".reset-button").length) {
                console.log("game layout or reset button exist, refreshing...");
                $(".game-layout").remove();
                $(".reset-button").remove();
                $(".submit-container").remove();
                // get reloaded assessees
                const container = document.querySelector('#field_block_field_570');
                const options = container.querySelectorAll('option');
                const numbers = Array.from(options).map(opt => opt.textContent.trim()).filter(text => /^\d+$/.test(text)).map(Number);
                assessees = numbers;
                console.log("assessees re-loaded: " + JSON.stringify(assessees));
            } else {
                console.log("game layout and reset button don't exist, adding...");
            }
            
            // remove selected assessee from assessees (for rating)
            console.log("assessees before removal: " + JSON.stringify(assessees))
            // assessees = assessees.filter(item => item !== Number(user_number));
            assessees = assessees.filter(item => item !== user_number);
            console.log("assessees after removal: " + JSON.stringify(assessees))
            // Sort numbers in ascending order
            const sortedAssessees = assessees.sort((a, b) => {
                // Convert to numbers for proper comparison
                return parseInt(a) - parseInt(b);
            });

            // Store the original assessees array
            blockNumbers = [...assessees];
      
            $(".form-submit").before('<div class="main"></div>');
            const mainEl = document.querySelector(".main");
            
            const brackets = [];
            let autoScrollInterval = null;
            let lastBucketDragTargetBracket = null;
      
            resetButton = document.createElement("button");
            resetButton.className = "reset-button";
            resetButton.innerHTML = '<i class="fas fa-trash" style="margin-right: 5px;"></i> איפוס';
            mainEl.appendChild(resetButton);
            
            const gameLayout = document.createElement("div");
            gameLayout.className = "game-layout";
            mainEl.appendChild(gameLayout);
            
            const submitContainer = document.createElement("div");
            submitContainer.className = "submit-container";
            const submitButton = document.createElement("button");
            submitButton.className = "submit-button";
            submitButton.textContent = "שליחה";
            submitContainer.appendChild(submitButton);
            mainEl.appendChild(submitContainer);
        
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
            
            for (let i = 0; i < sortedAssessees.length; i++) {
                const block = document.createElement("div");
                block.className = "bucket-block";
                block.dataset.number = sortedAssessees[i];
                block.textContent = sortedAssessees[i];
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

                removeBtn.addEventListener("click", () => {
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
                }
            };
            
            const handleBucketTouchEnd = (e) => {
                stopAutoScroll();
                document.body.classList.remove("no-touch-actions");
                document.querySelectorAll(".replace-target, .dragging-target").forEach((el) =>
                    el.classList.remove("replace-target", "dragging-target")
                );
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
                let offsetY, currentClone, originalParent, originalNextSibling, isDraggingBracket = false, startXBracket, startYBracket, lastTargetBracket = null;
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
                const endDrag = (e) => {
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

            function updateResultsStrings() {
                brackets.forEach((br, idx) => {
                    const items = br.querySelectorAll(".block-wrapper .block");
                    const numbers = Array.from(items).map((el) => `${idx + 1}:${el.dataset.originalNumber}`);
                    
                    if (idx === 0)
                        firstBracket = numbers.join(",");
                    else if (idx === 1)
                        secondBracket = numbers.join(",");
                    else if (idx === 2)
                        thirdBracket = numbers.join(",");
                    else if (idx === 3)
                        fourthBracket = numbers.join(",");
                });
                
                console.log("firstBracket:", firstBracket);
                console.log("secondBracket:", secondBracket);
                console.log("thirdBracket:", thirdBracket);
                console.log("fourthBracket:", fourthBracket);
            }

            function updateBucketVisibility() {
                requestAnimationFrame(() => {
                    const totalBlocks = document.querySelectorAll(".bucket-block").length;
                    const orderedBlocks = document.querySelectorAll(".block-wrapper").length;
                    if (totalBlocks - orderedBlocks <= 0) {
                        document.querySelector(".bucket-section").style.display = "none";
                    } 
                    else {
                        document.querySelector(".bucket-section").style.display = "flex";
                    }
                });
            }
            
            function updateBracketFullness() {
                document.querySelectorAll(".bracket").forEach((bracket) => {
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

            function updateUI() {
                updateResultsStrings();
                updateBucketVisibility();
                updateBracketFullness();
            }
            
            const bracketCapacities = generate_blocks_per_bracket(assessees.length + 1);
            for (let i = 1; i <= 4; i++) {
                const bracket = document.createElement("div");
                bracket.className = "bracket";
            
                // const randomLimit = Math.floor(Math.random() * 10) + 1;
                const bracketCapacity = bracketCapacities[i-1];
                bracket.setAttribute("data-max-capacity", bracketCapacity);
            
                const bracketTitle = document.createElement("div");
                bracketTitle.className = "bracket-title";
                if (i === 1)
                    bracketTitle.textContent = `מתאים מאוד ליחידה (${bracketCapacity} מקומות)`;
                else if (i === 2)
                    bracketTitle.textContent = `מתאים ליחידה (${bracketCapacity} מקומות)`;
                else if (i === 3)
                    bracketTitle.textContent = `די מתאים ליחידה (${bracketCapacity} מקומות)`;
                else if (i === 4)
                    bracketTitle.textContent = `לא כל כך מתאים ליחידה (${bracketCapacity} מקומות)`;
            
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

            //RESET FUNCTION
            resetButton.addEventListener("click", () => {
                brackets.forEach((br) => {
                    br.querySelectorAll(".block-wrapper").forEach((wrapper) =>
                        returnToBucket(wrapper)
                    );
                });
                updateUI();
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
                    const finalResultString = [firstBracket, secondBracket, thirdBracket, fourthBracket].join(",");
                    $("#fieldo6WQbadNnB").val(finalResultString).change();
                    $(".form-submit .btn-success").click();
                } 
                else {
                    alert("לא סיימת לשבץ את כל המוערכים, נא סיים ונסה שנית.");
                }
            });
            updateUI();
        }); 

      //fixIOSScrolling();

    // change font size for
    // const checkInterval = setInterval(function () {
    //   const $targetDiv = $(".form-process-message");
    //   if ($targetDiv.length) {
    //     addStyling($targetDiv);
    //     // Stop checking once the div is found
    //     clearInterval(checkInterval);
    //   }
    //   // Check every 100ms
    // }, 500);
    });
});

function generate_blocks_per_bracket(active_team_members) {
    const targetSum = active_team_members - 1;
    const result = [1, 1, 1, 1]; // Start with minimum values
    // Distribute the remaining sum
    let remaining = targetSum - result.reduce((a, b) => a + b, 0);
    let pos = 3; // Start filling from right to left
    while (remaining > 0) {
        result[pos] += 1;
        remaining -= 1;
        // Move left, wrap around to right
        pos = pos > 0 ? pos - 1 : 3;
    }
    return result;
}

// Function to fix iOS scrolling issues
function fixIOSScrolling() {
    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
        // Fix for the bounce effect
        // Do nothing, just capturing the touch
        document.body.addEventListener("touchstart", function () {}, { passive: true });
    }
}

/* START OF PLUGIN CODE FOR Form Submission Loading Spinner */
TB.render("component_3", function (data) {
  setTimeout(function () {
    const loader = `<div class="tb-form-loader">
                            <img src="https://d6by4xxhyiw7a.cloudfront.net/images/spinner-light.gif">
                            <p>שומר טופס...</p>
                        </div>`;
    jQuery(data.ele).css("position", "relative").append(loader);
    const tbFormLoader = jQuery(".tb-form-loader", data.ele).hide();
    jQuery(".af-form-submit", data.ele).on("click", function () {
      let self = jQuery(this);
      formSubmissionIntervalId = setInterval(function () {
        if (self.attr("disabled")) {
          tbFormLoader.show();
          jQuery(data.ele).css("opacity", 0.5);
        } else {
          tbFormLoader.hide();
          jQuery(data.ele).css("opacity", 1);
          clearInterval(formSubmissionIntervalId);
        }
      }, 100);
    });
  });
});
/* END OF PLUGIN CODE FOR Form Submission Loading Spinner */
