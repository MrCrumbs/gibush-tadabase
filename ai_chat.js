/**
 * Gibush AI chat - full-page ChatGPT-style panel embedded into the Tadabase
 * page's <article> (or the empty HTML component inside it). Talks to
 * POST /gibush_ai_ask on the misc backend.
 *
 * Paste this on a dedicated Tadabase page. Typical wrapper:
 *
 *   TB.render("component_3", async function (data) {
 *       ensureGibushAiChatWidget();
 *   });
 *
 * SCOPING: set GIBUSH_AI_CHAT_SCOPED_MODE below.
 *   - true  (field-team page): also set GIBUSH_AI_CHAT_TEAM_NUMBER (usually
 *     "{loggedInUser.צוות שטח}") — every question is scoped to that team.
 *   - false (commander/admin page): team number is ignored; full access.
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

// true = field-team page (scoped). false = commander/admin (no limits).
var GIBUSH_AI_CHAT_SCOPED_MODE = false;

// Only used when GIBUSH_AI_CHAT_SCOPED_MODE is true.
var GIBUSH_AI_CHAT_TEAM_NUMBER = "{loggedInUser.צוות שטח}";

var GIBUSH_AI_CHAT_STORAGE_KEY = "gibushAiChat_previousResponseId";
var GIBUSH_AI_CHAT_HISTORY_KEY = "gibushAiChat_history";

function gibushAiChatResolvedTeamNumber() {
    if (!GIBUSH_AI_CHAT_SCOPED_MODE) {
        return null;
    }
    var raw = (GIBUSH_AI_CHAT_TEAM_NUMBER == null) ? "" : String(GIBUSH_AI_CHAT_TEAM_NUMBER).trim();
    // Tadabase leaves the literal "{loggedInUser...}" merge-field text in place
    // if it fails to resolve (e.g. previewed outside a real session) - treat
    // that as "no scope" rather than sending a bogus team_number.
    if (!raw || raw.indexOf("{") === 0 || raw.toLowerCase() === "undefined" || raw.toLowerCase() === "all") {
        return null;
    }
    return raw;
}

/**
 * Prefer the empty HTML component Tadabase places inside <article>, else the
 * article itself, else body. That matches pages that host the script via
 * TB.render("component_3", ...) on an af-html element.
 */
function gibushAiChatFindMount() {
    var article = document.querySelector("article");
    if (article) {
        var htmlEle = article.querySelector(".x-type-html.t-html") || article.querySelector(".x-type-html");
        if (htmlEle) return htmlEle;
        return article;
    }
    return document.querySelector(".x-type-html.t-html") || document.body;
}

function ensureGibushAiChatStyles() {
    var style = document.getElementById("gibush-ai-chat-styles");
    if (!style) {
        style = document.createElement("style");
        style.id = "gibush-ai-chat-styles";
        document.head.appendChild(style);
    }
    style.textContent =
        'article:has(#gibush-ai-chat-root), .x-type-html:has(#gibush-ai-chat-root){padding:0 !important;}' +
        '#gibush-ai-chat-root{--gaic-bg:#f7f7f8;--gaic-panel:#ffffff;--gaic-border:#e5e5e5;--gaic-text:#0d0d0d;--gaic-muted:#6b6b6b;--gaic-user:#2d3748;--gaic-assistant:#f4f4f4;display:flex;justify-content:center;width:100%;min-height:calc(100vh - 120px);background:var(--gaic-bg);font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,"Noto Sans Hebrew",sans-serif;font-size:16px;line-height:1.55;color:var(--gaic-text);box-sizing:border-box;}' +
        '#gibush-ai-chat-root *,#gibush-ai-chat-root *::before,#gibush-ai-chat-root *::after{box-sizing:border-box;}' +
        '#gibush-ai-chat-shell{display:flex;flex-direction:column;width:100%;max-width:820px;min-height:calc(100vh - 120px);background:var(--gaic-panel);border-inline:1px solid var(--gaic-border);}' +
        '#gibush-ai-chat-shell .gaic-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;border-bottom:1px solid var(--gaic-border);background:var(--gaic-panel);position:sticky;top:0;z-index:2;}' +
        '#gibush-ai-chat-shell .gaic-head h2{margin:0;font-size:17px;font-weight:700;}' +
        '#gibush-ai-chat-shell .gaic-head-meta{display:flex;align-items:center;gap:10px;}' +
        '#gibush-ai-chat-shell .gaic-scope-line{font-size:12px;color:var(--gaic-muted);}' +
        '#gibush-ai-chat-shell .gaic-head-actions button{border:1px solid var(--gaic-border);background:#fff;border-radius:8px;font-size:13px;cursor:pointer;padding:7px 12px;color:#333;}' +
        '#gibush-ai-chat-shell .gaic-head-actions button:hover{background:#f0f0f0;}' +
        '#gibush-ai-chat-messages{flex:1;overflow-y:auto;padding:28px 20px 12px;display:flex;flex-direction:column;gap:18px;background:var(--gaic-panel);}' +
        '#gibush-ai-chat-messages .gaic-empty{margin:auto;max-width:520px;text-align:center;color:var(--gaic-muted);padding:40px 16px;}' +
        '#gibush-ai-chat-messages .gaic-empty h3{margin:0 0 8px;font-size:26px;font-weight:700;color:var(--gaic-text);}' +
        '#gibush-ai-chat-messages .gaic-empty p{margin:0;font-size:15px;line-height:1.5;}' +
        '#gibush-ai-chat-messages .gaic-msg{max-width:min(720px,100%);padding:14px 16px;border-radius:16px;white-space:pre-wrap;word-break:break-word;text-align:right;}' +
        /* Physical margins so RTL dir on the shell does not flip chat sides. Hebrew: user=right, AI=left. */ +
        '#gibush-ai-chat-messages .gaic-msg-user{margin-left:auto;margin-right:0;background:var(--gaic-user);color:#fff;border-bottom-left-radius:4px;}' +
        '#gibush-ai-chat-messages .gaic-msg-assistant{margin-right:auto;margin-left:0;background:var(--gaic-assistant);color:var(--gaic-text);border-bottom-right-radius:4px;}' +
        '#gibush-ai-chat-messages .gaic-msg-error{margin-right:auto;margin-left:0;background:#fde8e8;color:#8a1c1c;}' +
        '#gibush-ai-chat-messages .gaic-msg-trace{margin-right:auto;margin-left:0;font-size:12px;color:var(--gaic-muted);background:none;padding:0 6px;}' +
        '#gibush-ai-chat-shell .gaic-composer{position:sticky;bottom:0;padding:12px 20px 20px;background:linear-gradient(to top,var(--gaic-panel) 70%,rgba(255,255,255,0));}' +
        '#gibush-ai-chat-shell .gaic-spin-line{display:none;align-items:center;gap:8px;padding:0 4px 10px;font-size:13px;color:var(--gaic-muted);}' +
        '#gibush-ai-chat-shell .gaic-spinner{width:16px;height:16px;border:2px solid #e5e7eb;border-top-color:#374151;border-radius:50%;animation:gaic-spin 0.7s linear infinite;flex-shrink:0;}' +
        '@keyframes gaic-spin{to{transform:rotate(360deg);}}' +
        '#gibush-ai-chat-shell .gaic-input-row{display:flex;gap:8px;align-items:flex-end;padding:10px 12px;border:1px solid var(--gaic-border);border-radius:18px;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,0.06);}' +
        '#gibush-ai-chat-shell textarea#gibush-ai-chat-input{flex:1;resize:none;min-height:44px;max-height:160px;padding:10px 8px;font-size:15px;font-family:inherit;border:none;outline:none;background:transparent;}' +
        '#gibush-ai-chat-shell button#gibush-ai-chat-expensive{border:1px solid var(--gaic-border);background:#fff;color:#5c5c5c;border-radius:10px;min-width:40px;height:40px;padding:0 10px;font-size:16px;font-weight:700;cursor:pointer;line-height:1;flex-shrink:0;}' +
        '#gibush-ai-chat-shell button#gibush-ai-chat-expensive:hover{background:#f0f0f0;}' +
        '#gibush-ai-chat-shell button#gibush-ai-chat-expensive.gaic-expensive-on{background:#2d3748;border-color:#2d3748;color:#f6e05e;}' +
        '#gibush-ai-chat-shell button#gibush-ai-chat-expensive.gaic-expensive-on:hover{background:#1a202c;}' +
        '#gibush-ai-chat-shell button#gibush-ai-chat-expensive:disabled{opacity:0.55;cursor:wait;}' +
        '#gibush-ai-chat-shell button#gibush-ai-chat-send{border:none;background:#2d3748;color:#fff;border-radius:10px;padding:0 18px;height:40px;font-size:14px;font-weight:600;cursor:pointer;flex-shrink:0;}' +
        '#gibush-ai-chat-shell button#gibush-ai-chat-send:hover{background:#1a202c;}' +
        '#gibush-ai-chat-shell button#gibush-ai-chat-send:disabled{opacity:0.55;cursor:wait;}' +
        '#gibush-ai-chat-messages .gaic-msg-user.gaic-expensive-msg::before{content:"$ ";opacity:0.75;font-weight:700;}' +
        '@media (max-width:720px){#gibush-ai-chat-root{min-height:calc(100vh - 80px);}#gibush-ai-chat-shell{min-height:calc(100vh - 80px);border-inline:none;}#gibush-ai-chat-shell .gaic-head{padding:12px 14px;}#gibush-ai-chat-messages{padding:20px 14px 8px;}#gibush-ai-chat-shell .gaic-composer{padding:10px 12px 14px;}}';
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

function gibushAiChatRenderEmpty(container) {
    var empty = document.createElement("div");
    empty.className = "gaic-empty";
    empty.id = "gibush-ai-chat-empty";
    empty.innerHTML = "<h3>שאל את ה-AI</h3><p>שאל על מוערכים, ציונים, ראיונות, הערכות שטח או מחזורים קודמים.</p>";
    container.appendChild(empty);
}

function gibushAiChatClearEmpty(container) {
    var empty = container.querySelector("#gibush-ai-chat-empty");
    if (empty) empty.remove();
}

function gibushAiChatEscapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Escape HTML, then turn **bold** into <strong>. Safe for model/user text. */
function gibushAiChatFormatMarkdown(text) {
    var escaped = gibushAiChatEscapeHtml(text == null ? "" : text);
    return escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function gibushAiChatRenderMessage(container, message) {
    gibushAiChatClearEmpty(container);
    var el = document.createElement("div");
    el.className = "gaic-msg gaic-msg-" + (message.role || "assistant");
    if (message.role === "user" && message.expensive) {
        el.className += " gaic-expensive-msg";
    }
    if (message.role === "assistant") {
        el.innerHTML = gibushAiChatFormatMarkdown(message.text || "");
    } else {
        el.textContent = message.text || "";
    }
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
    gibushAiChatRenderEmpty(messagesContainer);
}

function ensureGibushAiChatWidget() {
    ensureGibushAiChatStyles();
    if (document.getElementById("gibush-ai-chat-root")) return;

    var mount = gibushAiChatFindMount();
    var root = document.createElement("div");
    root.id = "gibush-ai-chat-root";

    var shell = document.createElement("div");
    shell.id = "gibush-ai-chat-shell";
    shell.setAttribute("dir", "rtl");
    shell.setAttribute("role", "region");
    shell.setAttribute("aria-labelledby", "gibush-ai-chat-title");

    var head = document.createElement("div");
    head.className = "gaic-head";

    var headLeft = document.createElement("div");
    var h2 = document.createElement("h2");
    h2.id = "gibush-ai-chat-title";
    h2.textContent = "שאל את ה-AI";
    var scopeLine = document.createElement("div");
    scopeLine.className = "gaic-scope-line";
    var resolvedTeam = gibushAiChatResolvedTeamNumber();
    scopeLine.textContent = resolvedTeam ? ("מרחב נתונים: צוות " + resolvedTeam) : "מרחב נתונים: כל הצוותים";
    headLeft.appendChild(h2);
    headLeft.appendChild(scopeLine);

    var headMeta = document.createElement("div");
    headMeta.className = "gaic-head-meta";
    var headActions = document.createElement("div");
    headActions.className = "gaic-head-actions";
    var newConvoBtn = document.createElement("button");
    newConvoBtn.type = "button";
    newConvoBtn.textContent = "שיחה חדשה";
    headActions.appendChild(newConvoBtn);
    headMeta.appendChild(headActions);

    head.appendChild(headLeft);
    head.appendChild(headMeta);

    var messages = document.createElement("div");
    messages.id = "gibush-ai-chat-messages";

    var composer = document.createElement("div");
    composer.className = "gaic-composer";

    var spinLine = document.createElement("div");
    spinLine.className = "gaic-spin-line";
    spinLine.id = "gibush-ai-chat-spin-wrap";
    spinLine.innerHTML = '<span class="gaic-spinner" aria-hidden="true"></span><span>בודק את הנתונים…</span>';

    var inputRow = document.createElement("div");
    inputRow.className = "gaic-input-row";
    var textarea = document.createElement("textarea");
    textarea.id = "gibush-ai-chat-input";
    textarea.rows = 1;
    textarea.placeholder = "שאל משהו על מוערך, צוות או מחזור…";
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

    composer.appendChild(spinLine);
    composer.appendChild(inputRow);

    shell.appendChild(head);
    shell.appendChild(messages);
    shell.appendChild(composer);
    root.appendChild(shell);

    // Clear Tadabase's empty HTML shell content so the chat owns the area.
    if (mount && mount !== document.body) {
        mount.innerHTML = "";
        mount.appendChild(root);
    } else {
        document.body.appendChild(root);
    }

    var expensiveArmed = false;
    var spinLabel = spinLine.querySelector("span:last-child");

    function setExpensiveArmed(on) {
        expensiveArmed = !!on;
        expensiveBtn.classList.toggle("gaic-expensive-on", expensiveArmed);
        expensiveBtn.setAttribute("aria-pressed", expensiveArmed ? "true" : "false");
    }

    function autosizeTextarea() {
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
    }

    var history = gibushAiChatLoadHistory();
    if (history.length) {
        history.forEach(function (message) {
            gibushAiChatRenderMessage(messages, message);
        });
    } else {
        gibushAiChatRenderEmpty(messages);
    }
    messages.scrollTop = messages.scrollHeight;

    newConvoBtn.addEventListener("click", function () {
        gibushAiChatNewConversation(messages);
        setExpensiveArmed(false);
        textarea.focus();
    });
    expensiveBtn.addEventListener("click", function () {
        setExpensiveArmed(!expensiveArmed);
    });
    textarea.addEventListener("input", autosizeTextarea);

    function sendMessage() {
        var question = (textarea.value || "").trim();
        if (!question) return;

        var useExpensive = expensiveArmed;
        var history = gibushAiChatLoadHistory();
        history.push({ role: "user", text: question, expensive: useExpensive });
        gibushAiChatSaveHistory(history);
        gibushAiChatRenderMessage(messages, { role: "user", text: question, expensive: useExpensive });
        textarea.value = "";
        autosizeTextarea();
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
                textarea.focus();
            });
    }

    sendBtn.addEventListener("click", sendMessage);
    textarea.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    textarea.focus();
}

// Auto-mount when the script loads outside TB.render; TB.render pages should
// call ensureGibushAiChatWidget() themselves (idempotent if both run).
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureGibushAiChatWidget);
} else {
    ensureGibushAiChatWidget();
}
