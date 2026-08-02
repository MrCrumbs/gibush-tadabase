/**
 * Gibush AI chat widget - floating button + multi-turn chat panel that talks
 * to POST /gibush_ai_ask on the misc backend.
 *
 * Paste this (and ai_chat.css, inlined below via ensureGibushAiChatStyles) on
 * any Tadabase gibush page, or a dedicated page. It renders a floating "שאל
 * את ה-AI" button; clicking it opens a chat panel.
 *
 * SCOPING: set GIBUSH_AI_CHAT_TEAM_NUMBER below.
 *   - On a page meant for one field team (mirrors currentTeamNumber in
 *     js.js/grades.js/etc.): leave it as "{loggedInUser.צוות שטח}" so every
 *     question is scoped server-side to that team.
 *   - On a commander/admin page meant to see everything (mirrors the "all"
 *     used in "grades commander.js"/"graphs commander.js"): set it to null.
 *
 * EXPENSIVE MODEL: the "$" toggle next to Send arms the next turn(s) to use
 * OPENAI_MODEL_GIBUSH_AGENT_EXPENSIVE (gpt-5.6-sol) instead of the default
 * Terra model. Leave it off for routine questions; turn it on for hard
 * suitability / "why" investigations that need deeper reasoning.
 *
 * Multi-turn state: the last OpenAI response_id is kept in localStorage
 * (per-browser) so follow-up questions continue the same conversation
 * without the backend storing any chat history. "שיחה חדשה" clears it.
 */

var GIBUSH_API_TOKEN = "jfhf3fUVRKuAlHoRqkgcAcv0me3q31Ii0LFawlUa3bQ";
var MISC_API_BASE = "https://misc-ten.vercel.app";

// Set to null on commander/unscoped pages - see comment above.
var GIBUSH_AI_CHAT_TEAM_NUMBER = "{loggedInUser.צוות שטח}";

var GIBUSH_AI_CHAT_STORAGE_KEY = "gibushAiChat_previousResponseId";
var GIBUSH_AI_CHAT_HISTORY_KEY = "gibushAiChat_history";

function gibushAiChatResolvedTeamNumber() {
    var raw = (GIBUSH_AI_CHAT_TEAM_NUMBER == null) ? "" : String(GIBUSH_AI_CHAT_TEAM_NUMBER).trim();
    // Tadabase leaves the literal "{loggedInUser...}" merge-field text in place
    // if it fails to resolve (e.g. previewed outside a real session) - treat
    // that as "no scope" rather than sending a bogus team_number.
    if (!raw || raw.indexOf("{") === 0 || raw.toLowerCase() === "undefined" || raw.toLowerCase() === "all") {
        return null;
    }
    return raw;
}

function ensureGibushAiChatStyles() {
    var style = document.getElementById("gibush-ai-chat-styles");
    if (!style) {
        style = document.createElement("style");
        style.id = "gibush-ai-chat-styles";
        document.head.appendChild(style);
    }
    style.textContent =
        '#gibush-ai-chat-fab{position:fixed;bottom:22px;left:22px;z-index:10040;width:auto;height:44px;padding:0 18px;border-radius:22px;border:none;background:#2d3748;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,"Noto Sans Hebrew",sans-serif;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,0.22);}' +
        '#gibush-ai-chat-fab:hover{background:#1a202c;}' +
        '#gibush-ai-chat-panel{display:none;position:fixed;bottom:78px;left:22px;z-index:10041;width:380px;max-width:92vw;height:520px;max-height:78vh;background:#fff;border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,0.24);border:1px solid #e2e4e8;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,"Noto Sans Hebrew",sans-serif;font-size:14px;line-height:1.45;color:#1a1d21;}' +
        '#gibush-ai-chat-panel.gaic-open{display:flex;}' +
        '#gibush-ai-chat-panel .gaic-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-bottom:1px solid #e2e4e8;background:#f6f7f9;}' +
        '#gibush-ai-chat-panel .gaic-head h2{margin:0;font-size:14px;font-weight:700;}' +
        '#gibush-ai-chat-panel .gaic-head-actions{display:flex;gap:6px;align-items:center;}' +
        '#gibush-ai-chat-panel .gaic-head-actions button{border:1px solid #d8d8d8;background:#fff;border-radius:6px;font-size:12px;cursor:pointer;padding:5px 9px;color:#333;}' +
        '#gibush-ai-chat-panel .gaic-head-actions button:hover{background:#eceef2;}' +
        '#gibush-ai-chat-panel .gaic-scope-line{padding:4px 14px 0;font-size:11px;color:#8a8f98;}' +
        '#gibush-ai-chat-messages{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;background:#fbfbfc;}' +
        '#gibush-ai-chat-messages .gaic-msg{max-width:88%;padding:9px 12px;border-radius:10px;white-space:pre-wrap;word-break:break-word;}' +
        '#gibush-ai-chat-messages .gaic-msg-user{align-self:flex-end;background:#2d3748;color:#fff;border-bottom-left-radius:2px;}' +
        '#gibush-ai-chat-messages .gaic-msg-assistant{align-self:flex-start;background:#eef0f3;color:#1a1d21;border-bottom-right-radius:2px;}' +
        '#gibush-ai-chat-messages .gaic-msg-error{align-self:flex-start;background:#fde8e8;color:#8a1c1c;}' +
        '#gibush-ai-chat-messages .gaic-msg-trace{align-self:flex-start;font-size:11px;color:#8a8f98;background:none;padding:0 4px;}' +
        '#gibush-ai-chat-panel .gaic-spin-line{display:none;align-items:center;gap:8px;padding:0 14px 8px;font-size:12px;color:#5c5c5c;}' +
        '#gibush-ai-chat-panel .gaic-spinner{width:16px;height:16px;border:2px solid #e5e7eb;border-top-color:#374151;border-radius:50%;animation:gaic-spin 0.7s linear infinite;flex-shrink:0;}' +
        '@keyframes gaic-spin{to{transform:rotate(360deg);}}' +
        '#gibush-ai-chat-panel .gaic-input-row{display:flex;gap:8px;padding:10px;border-top:1px solid #e2e4e8;background:#fff;align-items:flex-end;}' +
        '#gibush-ai-chat-panel textarea#gibush-ai-chat-input{flex:1;resize:none;min-height:38px;max-height:110px;padding:8px 10px;font-size:14px;font-family:inherit;border:1px solid #d8d8d8;border-radius:8px;box-sizing:border-box;}' +
        '#gibush-ai-chat-panel textarea#gibush-ai-chat-input:focus{outline:none;border-color:#6b7280;box-shadow:0 0 0 2px rgba(107,114,128,0.15);}' +
        '#gibush-ai-chat-panel button#gibush-ai-chat-expensive{border:1px solid #d8d8d8;background:#fff;color:#5c5c5c;border-radius:8px;min-width:38px;height:38px;padding:0 10px;font-size:16px;font-weight:700;cursor:pointer;line-height:1;flex-shrink:0;}' +
        '#gibush-ai-chat-panel button#gibush-ai-chat-expensive:hover{background:#eceef2;}' +
        '#gibush-ai-chat-panel button#gibush-ai-chat-expensive.gaic-expensive-on{background:#2d3748;border-color:#2d3748;color:#f6e05e;}' +
        '#gibush-ai-chat-panel button#gibush-ai-chat-expensive.gaic-expensive-on:hover{background:#1a202c;}' +
        '#gibush-ai-chat-panel button#gibush-ai-chat-expensive:disabled{opacity:0.55;cursor:wait;}' +
        '#gibush-ai-chat-panel button#gibush-ai-chat-send{border:none;background:#2d3748;color:#fff;border-radius:8px;padding:0 16px;height:38px;font-size:14px;font-weight:600;cursor:pointer;flex-shrink:0;}' +
        '#gibush-ai-chat-panel button#gibush-ai-chat-send:hover{background:#1a202c;}' +
        '#gibush-ai-chat-panel button#gibush-ai-chat-send:disabled{opacity:0.55;cursor:wait;}' +
        '#gibush-ai-chat-messages .gaic-msg-user.gaic-expensive-msg::before{content:"$ ";opacity:0.75;font-weight:700;}';
}

function gibushAiChatLoadHistory() {
    try {
        var raw = localStorage.getItem(GIBUSH_AI_CHAT_HISTORY_KEY);
        var parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function gibushAiChatSaveHistory(history) {
    try {
        localStorage.setItem(GIBUSH_AI_CHAT_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        // localStorage full/unavailable - chat still works, just won't persist across reloads.
    }
}

function gibushAiChatRenderMessage(container, message) {
    var el = document.createElement("div");
    el.className = "gaic-msg gaic-msg-" + (message.role || "assistant");
    if (message.role === "user" && message.expensive) {
        el.className += " gaic-expensive-msg";
    }
    el.textContent = message.text || "";
    container.appendChild(el);
    if (message.role === "assistant" && message.toolCallsMade && message.toolCallsMade.length) {
        var trace = document.createElement("div");
        trace.className = "gaic-msg gaic-msg-trace";
        var prefix = message.expensive ? ("מודל מורחב · ") : "";
        trace.textContent = prefix + "כלים שנבדקו: " + message.toolCallsMade.join(", ");
        container.appendChild(trace);
    } else if (message.role === "assistant" && message.expensive) {
        var expensiveTrace = document.createElement("div");
        expensiveTrace.className = "gaic-msg gaic-msg-trace";
        expensiveTrace.textContent = "מודל מורחב";
        container.appendChild(expensiveTrace);
    }
    return el;
}

function gibushAiChatNewConversation(messagesContainer) {
    try {
        localStorage.removeItem(GIBUSH_AI_CHAT_STORAGE_KEY);
    } catch (e) { /* ignore */ }
    gibushAiChatSaveHistory([]);
    messagesContainer.innerHTML = "";
}

function ensureGibushAiChatWidget() {
    ensureGibushAiChatStyles();
    if (document.getElementById("gibush-ai-chat-fab")) return;

    var fab = document.createElement("button");
    fab.type = "button";
    fab.id = "gibush-ai-chat-fab";
    fab.textContent = "שאל את ה-AI";

    var panel = document.createElement("div");
    panel.id = "gibush-ai-chat-panel";
    panel.setAttribute("dir", "rtl");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "gibush-ai-chat-title");

    var head = document.createElement("div");
    head.className = "gaic-head";
    var h2 = document.createElement("h2");
    h2.id = "gibush-ai-chat-title";
    h2.textContent = "שאל את ה-AI";
    var headActions = document.createElement("div");
    headActions.className = "gaic-head-actions";
    var newConvoBtn = document.createElement("button");
    newConvoBtn.type = "button";
    newConvoBtn.textContent = "שיחה חדשה";
    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "סגור");
    headActions.appendChild(newConvoBtn);
    headActions.appendChild(closeBtn);
    head.appendChild(h2);
    head.appendChild(headActions);

    var scopeLine = document.createElement("div");
    scopeLine.className = "gaic-scope-line";
    var resolvedTeam = gibushAiChatResolvedTeamNumber();
    scopeLine.textContent = resolvedTeam ? ("היקף: צוות " + resolvedTeam) : "היקף: כל הצוותים";

    var messages = document.createElement("div");
    messages.id = "gibush-ai-chat-messages";

    var spinLine = document.createElement("div");
    spinLine.className = "gaic-spin-line";
    spinLine.id = "gibush-ai-chat-spin-wrap";
    spinLine.innerHTML = '<span class="gaic-spinner" aria-hidden="true"></span><span>בודק את הנתונים…</span>';

    var inputRow = document.createElement("div");
    inputRow.className = "gaic-input-row";
    var textarea = document.createElement("textarea");
    textarea.id = "gibush-ai-chat-input";
    textarea.placeholder = "לדוגמה: מה הציון הפיזי של מועמד 305?";
    var expensiveBtn = document.createElement("button");
    expensiveBtn.type = "button";
    expensiveBtn.id = "gibush-ai-chat-expensive";
    expensiveBtn.textContent = "$";
    expensiveBtn.setAttribute(
        "aria-label",
        "מודל מורחב (יקר יותר) — לשאלות מורכבות שדורשות חשיבה עמוקה"
    );
    expensiveBtn.title = "מודל מורחב ($) — הפעל לשאלות מורכבות / הערכת התאמה";
    expensiveBtn.setAttribute("aria-pressed", "false");
    var sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.id = "gibush-ai-chat-send";
    sendBtn.textContent = "שלח";
    inputRow.appendChild(textarea);
    inputRow.appendChild(expensiveBtn);
    inputRow.appendChild(sendBtn);

    panel.appendChild(head);
    panel.appendChild(scopeLine);
    panel.appendChild(messages);
    panel.appendChild(spinLine);
    panel.appendChild(inputRow);

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    var expensiveArmed = false;
    var spinLabel = spinLine.querySelector("span:last-child");

    function setExpensiveArmed(on) {
        expensiveArmed = !!on;
        expensiveBtn.classList.toggle("gaic-expensive-on", expensiveArmed);
        expensiveBtn.setAttribute("aria-pressed", expensiveArmed ? "true" : "false");
    }

    // Restore persisted history on load.
    var history = gibushAiChatLoadHistory();
    history.forEach(function (message) {
        gibushAiChatRenderMessage(messages, message);
    });
    messages.scrollTop = messages.scrollHeight;

    fab.addEventListener("click", function () {
        panel.classList.toggle("gaic-open");
        if (panel.classList.contains("gaic-open")) {
            textarea.focus();
            messages.scrollTop = messages.scrollHeight;
        }
    });
    closeBtn.addEventListener("click", function () {
        panel.classList.remove("gaic-open");
    });
    newConvoBtn.addEventListener("click", function () {
        gibushAiChatNewConversation(messages);
        setExpensiveArmed(false);
    });
    expensiveBtn.addEventListener("click", function () {
        setExpensiveArmed(!expensiveArmed);
    });

    function sendMessage() {
        var question = (textarea.value || "").trim();
        if (!question) return;

        var useExpensive = expensiveArmed;
        var history = gibushAiChatLoadHistory();
        history.push({ role: "user", text: question, expensive: useExpensive });
        gibushAiChatSaveHistory(history);
        gibushAiChatRenderMessage(messages, { role: "user", text: question, expensive: useExpensive });
        textarea.value = "";
        messages.scrollTop = messages.scrollHeight;

        sendBtn.disabled = true;
        expensiveBtn.disabled = true;
        if (spinLabel) {
            spinLabel.textContent = useExpensive
                ? "בודק את הנתונים (מודל מורחב)…"
                : "בודק את הנתונים…";
        }
        spinLine.style.display = "flex";

        var body = { question: question };
        if (useExpensive) {
            body.expensive = true;
        }
        var teamNumber = gibushAiChatResolvedTeamNumber();
        if (teamNumber) {
            body.scope = { team_number: teamNumber };
        }
        var previousResponseId = null;
        try {
            previousResponseId = localStorage.getItem(GIBUSH_AI_CHAT_STORAGE_KEY);
        } catch (e) { /* ignore */ }
        if (previousResponseId) {
            body.previous_response_id = previousResponseId;
        }

        fetch(MISC_API_BASE + "/gibush_ai_ask", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + GIBUSH_API_TOKEN
            },
            body: JSON.stringify(body)
        })
            .then(function (res) {
                return res.json().then(function (data) {
                    return { ok: res.ok, status: res.status, data: data };
                });
            })
            .then(function (result) {
                var history = gibushAiChatLoadHistory();
                if (!result.ok) {
                    var errorText = (result.data && result.data.error) || "שגיאה לא ידועה";
                    if (result.status === 501) {
                        errorText = "מנוע ה-AI טרם הופעל במלואו (הרישום/לולאת הכלים עוד לא מומשו). " + errorText;
                    }
                    history.push({ role: "error", text: errorText });
                    gibushAiChatSaveHistory(history);
                    gibushAiChatRenderMessage(messages, { role: "error", text: errorText });
                    return;
                }
                var answer = result.data.answer || "";
                var responseId = result.data.response_id || null;
                var toolCallsMade = Array.isArray(result.data.tool_calls_made) ? result.data.tool_calls_made : [];
                var wasExpensive = !!(result.data.expensive || useExpensive);
                if (responseId) {
                    try {
                        localStorage.setItem(GIBUSH_AI_CHAT_STORAGE_KEY, responseId);
                    } catch (e) { /* ignore */ }
                }
                var assistantMessage = {
                    role: "assistant",
                    text: answer,
                    toolCallsMade: toolCallsMade,
                    expensive: wasExpensive
                };
                history.push(assistantMessage);
                gibushAiChatSaveHistory(history);
                gibushAiChatRenderMessage(messages, assistantMessage);
            })
            .catch(function (e) {
                var history = gibushAiChatLoadHistory();
                var errorText = (e && e.message) || String(e);
                history.push({ role: "error", text: errorText });
                gibushAiChatSaveHistory(history);
                gibushAiChatRenderMessage(messages, { role: "error", text: errorText });
            })
            .finally(function () {
                sendBtn.disabled = false;
                expensiveBtn.disabled = false;
                spinLine.style.display = "none";
                messages.scrollTop = messages.scrollHeight;
            });
    }

    sendBtn.addEventListener("click", sendMessage);
    textarea.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureGibushAiChatWidget);
} else {
    ensureGibushAiChatWidget();
}
