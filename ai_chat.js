/**
 * Gibush AI chat - full-page ChatGPT-style panel embedded into the Tadabase
 * page's <article> (or the empty HTML component inside it). Talks to
 * POST /gibush_ai_ask_stream on the misc backend (SSE: live Hebrew progress in
 * the spinner, final answer as the last event), falling back to the plain
 * POST /gibush_ai_ask when the browser or network can't stream.
 *
 * Paste this on a dedicated Tadabase page, and paste ai_chat.css into the
 * page's Custom CSS (styles are not injected from this file). Typical wrapper:
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
 * SCREENSHOTS: paste (Ctrl/Cmd+V) or use the paperclip to attach one image
 * (png/jpeg/webp/gif). The client downscales before send; history keeps only
 * a small thumbnail (full image is not stored in localStorage).
 *
 * Multi-turn state: the last OpenAI response_id is kept in localStorage
 * (per-browser) so follow-up questions continue the same conversation
 * without the backend storing any chat history. "שיחה חדשה" clears it.
 *
 * DIAGNOSTIC MODE: preset chips run under a live-only, team-scoped prompt and
 * keep a separate response_id. A banner shows the active mode with "יציאה
 * לשיחה חופשית". Exiting (button or sending free text) switches to the free
 * prompt + full tools while migrating the diagnostic response_id into the
 * free-chat thread so follow-ups like "אותה שאלה על ארכיון…" keep context.
 */

var GIBUSH_API_TOKEN = "jfhf3fUVRKuAlHoRqkgcAcv0me3q31Ii0LFawlUa3bQ";
var MISC_API_BASE = "https://misc-ten.vercel.app";

// true = field-team page (scoped). false = commander/admin (no limits).
var GIBUSH_AI_CHAT_SCOPED_MODE = false;

// Only used when GIBUSH_AI_CHAT_SCOPED_MODE is true.
var GIBUSH_AI_CHAT_TEAM_NUMBER = "{loggedInUser.צוות שטח}";

var GIBUSH_AI_CHAT_STORAGE_KEY = "gibushAiChat_previousResponseId";
var GIBUSH_AI_CHAT_DIAGNOSTIC_STORAGE_KEY = "gibushAiChat_diagnosticResponseId";
var GIBUSH_AI_CHAT_DIAGNOSTIC_MODE_KEY = "gibushAiChat_diagnosticMode";
var GIBUSH_AI_CHAT_HISTORY_KEY = "gibushAiChat_history";

// Client-side image limits before POST (server also validates).
var GIBUSH_AI_CHAT_IMAGE_MAX_EDGE = 1600;
var GIBUSH_AI_CHAT_IMAGE_THUMB_EDGE = 240;
var GIBUSH_AI_CHAT_IMAGE_JPEG_QUALITY = 0.85;
var GIBUSH_AI_CHAT_IMAGE_MAX_DATA_URL_CHARS = 3500000;
var GIBUSH_AI_CHAT_IMAGE_ONLY_PLACEHOLDER =
    "מה אתה רואה בתמונה? אם יש נתונים רלוונטיים לגיבוש — נתח אותם.";

// Answers stream over SSE (/gibush_ai_ask_stream) so the spinner can show live
// progress and the connection never sits silent; /gibush_ai_ask is the fallback
// when the browser or network can't stream. The server heartbeats every ~10s,
// so a gap longer than this means the connection died without an error event.
var GIBUSH_AI_CHAT_STREAM_IDLE_TIMEOUT_MS = 45000;
var GIBUSH_AI_CHAT_STREAM_CUT_MESSAGE =
    "החיבור נקטע לפני שהתשובה הושלמה. נסה לשאול שוב, ואם הבעיה חוזרת — נסה לצמצם את אופי השאלה.";
var GIBUSH_AI_CHAT_PARTIAL_NOTE =
    "התשובה מבוססת על נתונים חלקיים — הזמן שהוקצב לשאלה נגמר. כדאי לצמצם את אופי השאלה ולשאול שוב.";

// Preset ids + Hebrew labels/task text for the visible bubble only.
// Backend DIAGNOSTIC_TASKS.user_prompt (English) is authoritative for the model.
var GIBUSH_AI_CHAT_DIAGNOSTIC_PRESETS = [
    {
        id: "instability",
        label: "מי לא יציב?",
        user_prompt:
            "נתח את יציבות הביצועים של המועמדים הנמצאים בשליש העליון ובשליש האמצעי.\n" +
            "התמקד בזחילות ובספרינטים ובדוק את השינוי במיקום היחסי בין כל שני מקצים סמוכים.\n" +
            "זהה את שני המועמדים בעלי התנודתיות הגבוהה ביותר.\n" +
            "אל תבחר מועמד בגלל נפילה בודדת. חפש דפוס חוזר של קפיצות משמעותיות, " +
            "למשל מעבר מקדמת הקבוצה לחלקה האחורי וחזרה.\n" +
            "עבור כל מועמד: הצג רצף מיקומים או דוגמאות עוקבות שממחישות את הזגזוג; " +
            "ציין כמה פעמים הופיע שינוי חריף; קבע האם התנודתיות מופיעה בתרגיל אחד או בשניהם; " +
            "הבחן בין חוסר יציבות מתמשך לבין משבר קצר ולאחריו התייצבות; " +
            "נסח נקודת בדיקה אחת למגבש.\n" +
            "דרג את שני המועמדים מהפחות יציב ליותר יציב."
    },
    {
        id: "late_fade",
        label: "מי נשחק בסוף?",
        user_prompt:
            "נתח את המועמדים בשליש העליון ובשליש האמצעי וחפש ירידה תפקודית ככל שהגיבוש מתקדם.\n" +
            "השווה בין השליש הראשון לשליש האחרון בזחילות, בספרינטים ובאלונקה הסוציומטרית " +
            "(אם פעילות זו כבר הושקה).\n" +
            "זהה את שלושת המועמדים בעלי השחיקה המאוחרת המשמעותית ביותר.\n" +
            "שחיקה יכולה להתבטא בירידה במיקום היחסי, במעבר מאלונקה או ג׳ריקן ל־FIRST או ל־0, " +
            "ברצף תוצאות חלשות בשליש האחרון או במקצים חסרים בחלק המאוחר.\n" +
            "עבור כל מועמד: הצג רמת ביצוע בתחילה ובסוף; כמת את גודל הירידה; " +
            "ציין האם המשיך להשתתף אך ירד ברמה או גם החסיר מקצים; " +
            "האם השחיקה בתרגיל אחד או במספר תרגילים; חומרה נמוכה/בינונית/גבוהה.\n" +
            "אל תציג מועמד עם נפילה מאוחרת אחת בלבד ולאחריה התאוששות."
    },
    {
        id: "recovery",
        label: "מי התאושש?",
        user_prompt:
            "חפש בקרב המועמדים בשליש העליון ובשליש האמצעי מקרים של ירידה משמעותית " +
            "ולאחריה חזרה יציבה לרמת ביצוע טובה יותר.\n" +
            "זהה את שלושת המועמדים בעלי יכולת ההתאוששות הבולטת ביותר.\n" +
            "התאוששות תיחשב רק כאשר הייתה נפילה ברורה או רצף חלש, לאחריה הופיעו לפחות " +
            "שני מקצים רצופים טובים יותר, והשיפור לא נעלם מיד במקצה הבא.\n" +
            "עבור כל מועמד: תאר את נקודת המשבר; הצג רצף מקצים לפני/במהלך/אחרי; " +
            "כמה מקצים נדרשו להתאוששות; האם נשמרה הרמה עד סוף התרגיל; " +
            "האם הופיעה ביותר מסוג מאמץ אחד; הבחן בין התאוששות מלאה/חלקית/רגעית.\n" +
            "דרג לפי חוזק ההתאוששות, לא לפי הציון הכללי."
    },
    {
        id: "hidden_risk",
        label: "סיכון נסתר בצמרת",
        user_prompt:
            "נתח רק את המועמדים בשליש העליון.\n" +
            "זהה עד שלושה מועמדים שהדירוג הכללי שלהם גבוה, אך בתוך דפוס הביצועים מופיע " +
            "סיכון שאינו בולט בציון הכולל.\n" +
            "חפש תנודתיות קיצונית, שחיקה בשליש האחרון, תחום חוזר אחד חלש משמעותית, " +
            "מקצים חסרים, תוצאות שיא שמסתירות קריסות, או פער גדול בין סוגי מאמץ.\n" +
            "עבור כל מועמד: הצג דירוג בשליש העליון; הסבר את הסיכון הנסתר; " +
            "לפחות שני נתונים תומכים; מדוע הציון הכללי עלול להסתיר את הבעיה; " +
            "סיכון נקודתי או דפוס חוזר; פעולה אחת למגבש לבדיקה.\n" +
            "אל תבחר מועמד רק משום שאינו ראשון בצוות — נדרש דגל ברור ברצף הנתונים."
    },
    {
        id: "mid_potential",
        label: "פוטנציאל בשליש האמצעי",
        user_prompt:
            "נתח רק את המועמדים בשליש האמצעי.\n" +
            "זהה את שלושת המועמדים בעלי הפוטנציאל הגבוה ביותר להערכה מחודשת, " +
            "אף שאינם בשליש העליון.\n" +
            "חפש מגמת שיפור, ביצוע טוב יותר בשליש האחרון, יציבות גבוהה ללא תוצאות שיא, " +
            "התאוששות ברורה, אחידות בין סוגי מאמץ, או השתתפות ללא מקצים חסרים.\n" +
            "עבור כל מועמד: מדוע הוא באמצע; הדפוס החיובי; האם השיפור בתרגיל אחד או במספר; " +
            "נתונים מהשליש הראשון והאחרון; גורם מגביל אחד; מה לבדוק בהמשך.\n" +
            "אל תבחר רק על בסיס תוצאה גבוהה בתרגיל חד־פעמי כמו שקים או אלונקה רגילה."
    },
    {
        id: "balance",
        label: "אחידות בין תרגילים",
        user_prompt:
            "השווה בין ביצועי המועמדים בשליש העליון ובשליש האמצעי בפעילויות שהושקו " +
            "(זחילות, ספרינטים, אלונקה סוציומטרית, שקים, אלונקה רגילה — לפי הזמין).\n" +
            "זהה את שני המועמדים בעלי הפרופיל האחיד והמאוזן ביותר ואת שני המועמדים " +
            "בעלי הפערים הגדולים ביותר בין סוגי המאמץ.\n" +
            "עבור כל מועמד: התחום החזק/החלש; גודל הפער; האם החולשה מרמה נמוכה / חוסר יציבות " +
            "/ שחיקה / מקצים חסרים; האם החוזק מתרגיל חוזר או חד־פעמי; " +
            "האם הפרופיל דומה גם בשליש האחרון.\n" +
            "אל תאפשר לתוצאה גבוהה בשקים או באלונקה רגילה לבדה להגדיר מועמד כמאוזן — " +
            "תן עדיפות לדפוס שחוזר בזחילות, בספרינטים ובאלונקה הסוציומטרית."
    }
];

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

function gibushAiChatLoadHistory() {
    try {
        var raw = localStorage.getItem(GIBUSH_AI_CHAT_HISTORY_KEY);
        var parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function gibushAiChatHistoryForStorage(history) {
    // Never persist full screenshot payloads — thumbs only.
    if (!Array.isArray(history)) return [];
    return history.map(function (message) {
        if (!message || typeof message !== "object") return message;
        var copy = {};
        Object.keys(message).forEach(function (key) {
            if (key === "image") return;
            copy[key] = message[key];
        });
        return copy;
    });
}

function gibushAiChatSaveHistory(history) {
    try {
        localStorage.setItem(
            GIBUSH_AI_CHAT_HISTORY_KEY,
            JSON.stringify(gibushAiChatHistoryForStorage(history))
        );
    } catch (e) {
        // localStorage full/unavailable - drop thumbs and retry once.
        try {
            var slim = gibushAiChatHistoryForStorage(history).map(function (message) {
                if (!message || typeof message !== "object") return message;
                var copy = {};
                Object.keys(message).forEach(function (key) {
                    if (key === "image" || key === "image_thumb") return;
                    copy[key] = message[key];
                });
                if (message.image_thumb || message.image) {
                    copy.has_image = true;
                }
                return copy;
            });
            localStorage.setItem(GIBUSH_AI_CHAT_HISTORY_KEY, JSON.stringify(slim));
        } catch (e2) {
            // chat still works for the session
        }
    }
}

function gibushAiChatLoadImageElement(dataUrl) {
    return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(new Error("לא ניתן לקרוא את התמונה")); };
        img.src = dataUrl;
    });
}

function gibushAiChatCanvasToJpegDataUrl(img, maxEdge, quality) {
    var w = img.naturalWidth || img.width || 0;
    var h = img.naturalHeight || img.height || 0;
    if (!w || !h) {
        throw new Error("תמונה לא תקינה");
    }
    var scale = 1;
    var longest = Math.max(w, h);
    if (longest > maxEdge) {
        scale = maxEdge / longest;
    }
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    var ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("לא ניתן לעבד תמונה בדפדפן זה");
    }
    ctx.drawImage(img, 0, 0, cw, ch);
    return canvas.toDataURL("image/jpeg", quality);
}

function gibushAiChatProcessImageBlob(blob) {
    return new Promise(function (resolve, reject) {
        if (!blob || !blob.type || blob.type.indexOf("image/") !== 0) {
            reject(new Error("ניתן לצרף רק תמונות (png / jpeg / webp / gif)"));
            return;
        }
        var allowed = {
            "image/png": true,
            "image/jpeg": true,
            "image/jpg": true,
            "image/webp": true,
            "image/gif": true
        };
        if (!allowed[blob.type]) {
            reject(new Error("סוג תמונה לא נתמך"));
            return;
        }
        var reader = new FileReader();
        reader.onerror = function () {
            reject(new Error("קריאת הקובץ נכשלה"));
        };
        reader.onload = function () {
            var rawDataUrl = reader.result;
            gibushAiChatLoadImageElement(rawDataUrl)
                .then(function (img) {
                    var dataUrl = gibushAiChatCanvasToJpegDataUrl(
                        img,
                        GIBUSH_AI_CHAT_IMAGE_MAX_EDGE,
                        GIBUSH_AI_CHAT_IMAGE_JPEG_QUALITY
                    );
                    if (dataUrl.length > GIBUSH_AI_CHAT_IMAGE_MAX_DATA_URL_CHARS) {
                        throw new Error("התמונה גדולה מדי גם לאחר כיווץ — נסה צילום מסך ממוקד יותר");
                    }
                    var thumbDataUrl = gibushAiChatCanvasToJpegDataUrl(
                        img,
                        GIBUSH_AI_CHAT_IMAGE_THUMB_EDGE,
                        0.7
                    );
                    resolve({ dataUrl: dataUrl, thumbDataUrl: thumbDataUrl });
                })
                .catch(reject);
        };
        reader.readAsDataURL(blob);
    });
}

function gibushAiChatDiagnosticsEnabled() {
    // Preset chips are for the unscoped commander/admin page only.
    return !GIBUSH_AI_CHAT_SCOPED_MODE;
}

function gibushAiChatLastAssistantMessage(history) {
    if (!Array.isArray(history)) return null;
    for (var i = history.length - 1; i >= 0; i--) {
        if (history[i] && history[i].role === "assistant") {
            return history[i];
        }
    }
    return null;
}

function gibushAiChatLoadDiagnosticMode() {
    try {
        var raw = localStorage.getItem(GIBUSH_AI_CHAT_DIAGNOSTIC_MODE_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        if (!parsed.team_number || !parsed.preset) return null;
        return {
            team_number: String(parsed.team_number),
            preset: String(parsed.preset),
            label: parsed.label ? String(parsed.label) : String(parsed.preset)
        };
    } catch (e) {
        return null;
    }
}

function gibushAiChatSaveDiagnosticMode(mode) {
    try {
        if (!mode) {
            localStorage.removeItem(GIBUSH_AI_CHAT_DIAGNOSTIC_MODE_KEY);
            return;
        }
        localStorage.setItem(
            GIBUSH_AI_CHAT_DIAGNOSTIC_MODE_KEY,
            JSON.stringify({
                team_number: String(mode.team_number),
                preset: String(mode.preset),
                label: mode.label ? String(mode.label) : String(mode.preset)
            })
        );
    } catch (e) { /* ignore */ }
}

/**
 * Leave diagnostic UI mode and hand the OpenAI thread to free chat.
 * Returns true if a diagnostic response_id was migrated to the free-chat key.
 */
function gibushAiChatExitDiagnosticMode() {
    var migrated = false;
    var diagnosticResponseId = null;
    try {
        diagnosticResponseId = localStorage.getItem(GIBUSH_AI_CHAT_DIAGNOSTIC_STORAGE_KEY);
    } catch (e) { /* ignore */ }
    if (diagnosticResponseId) {
        try {
            localStorage.setItem(GIBUSH_AI_CHAT_STORAGE_KEY, diagnosticResponseId);
            migrated = true;
        } catch (e) { /* ignore */ }
    }
    gibushAiChatSaveDiagnosticMode(null);
    return migrated;
}

function gibushAiChatEnterDiagnosticMode(teamNumber, preset) {
    if (!teamNumber || !preset) return;
    gibushAiChatSaveDiagnosticMode({
        team_number: String(teamNumber),
        preset: preset.id || String(preset),
        label: preset.label || preset.id || String(preset)
    });
}

function gibushAiChatDiagnosticModeLabel(mode) {
    if (!mode) return "";
    return "מצב אבחון · צוות " + mode.team_number + " · " + mode.label;
}

function gibushAiChatRenderEmpty(container) {
    var empty = document.createElement("div");
    empty.className = "gaic-empty";
    empty.id = "gibush-ai-chat-empty";
    empty.innerHTML =
        "<h3>שאל את ה-AI</h3>" +
        "<p>שאל על מוערכים, ציונים, ראיונות, הערכות שטח או מחזורים קודמים. " +
        "אפשר גם להדביק צילום מסך (Ctrl+V) או לצרף תמונה.</p>";
    if (gibushAiChatDiagnosticsEnabled()) {
        var chipHost = document.createElement("div");
        chipHost.className = "gaic-preset-row gaic-preset-empty";
        chipHost.setAttribute("data-gaic-preset-host", "empty");
        empty.appendChild(chipHost);
    }
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
function gibushAiChatFormatInlineMarkdown(text) {
    var escaped = gibushAiChatEscapeHtml(text == null ? "" : text);
    return escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function gibushAiChatIsMarkdownTableSeparator(line) {
    var trimmed = String(line || "").trim();
    if (!trimmed || trimmed.indexOf("|") === -1) return false;
    // GFM separator: |---|:---| or ---|---
    var body = trimmed.replace(/^\|/, "").replace(/\|$/, "");
    var cells = body.split("|");
    if (cells.length < 2) return false;
    for (var i = 0; i < cells.length; i++) {
        if (!/^:?-{3,}:?$/.test(cells[i].trim())) return false;
    }
    return true;
}

function gibushAiChatIsMarkdownTableRow(line) {
    var trimmed = String(line || "").trim();
    if (!trimmed || trimmed.indexOf("|") === -1) return false;
    if (gibushAiChatIsMarkdownTableSeparator(trimmed)) return false;
    return trimmed.charAt(0) === "|" || trimmed.charAt(trimmed.length - 1) === "|";
}

function gibushAiChatSplitMarkdownTableCells(line) {
    var trimmed = String(line || "").trim();
    if (trimmed.charAt(0) === "|") trimmed = trimmed.slice(1);
    if (trimmed.charAt(trimmed.length - 1) === "|") trimmed = trimmed.slice(0, -1);
    return trimmed.split("|").map(function (cell) {
        return cell.trim();
    });
}

function gibushAiChatRenderMarkdownTable(rows) {
    if (!rows || rows.length < 2) return "";
    var header = rows[0];
    var body = rows.slice(1);
    var html = '<div class="gaic-table-wrap"><table class="gaic-md-table"><thead><tr>';
    header.forEach(function (cell) {
        html += "<th>" + gibushAiChatFormatInlineMarkdown(cell) + "</th>";
    });
    html += "</tr></thead><tbody>";
    body.forEach(function (row) {
        html += "<tr>";
        for (var i = 0; i < header.length; i++) {
            html += "<td>" + gibushAiChatFormatInlineMarkdown(row[i] || "") + "</td>";
        }
        html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
}

/**
 * Escape HTML, bold **text**, and render GFM pipe tables as real HTML tables.
 * Safe for model/user text (no raw HTML passthrough).
 */
function gibushAiChatFormatMarkdown(text) {
    var raw = text == null ? "" : String(text);
    var lines = raw.split(/\r?\n/);
    var parts = [];
    var textBuf = [];

    function flushText() {
        if (!textBuf.length) return;
        var block = textBuf.join("\n").replace(/^\n+/, "").replace(/\n+$/, "");
        textBuf = [];
        if (!block) return;
        parts.push('<div class="gaic-md-text">' + gibushAiChatFormatInlineMarkdown(block) + "</div>");
    }

    var i = 0;
    while (i < lines.length) {
        if (
            gibushAiChatIsMarkdownTableRow(lines[i]) &&
            i + 1 < lines.length &&
            gibushAiChatIsMarkdownTableSeparator(lines[i + 1])
        ) {
            flushText();
            var tableRows = [gibushAiChatSplitMarkdownTableCells(lines[i])];
            i += 2; // skip header + separator
            while (i < lines.length && gibushAiChatIsMarkdownTableRow(lines[i])) {
                tableRows.push(gibushAiChatSplitMarkdownTableCells(lines[i]));
                i += 1;
            }
            parts.push(gibushAiChatRenderMarkdownTable(tableRows));
            continue;
        }
        textBuf.push(lines[i]);
        i += 1;
    }
    flushText();
    return parts.join("");
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
        var thumbSrc = message.image_thumb || message.image || null;
        if (thumbSrc || message.has_image) {
            var media = document.createElement("div");
            media.className = "gaic-msg-media";
            if (thumbSrc) {
                var img = document.createElement("img");
                img.src = thumbSrc;
                img.alt = "צילום מסך מצורף";
                img.className = "gaic-msg-image";
                media.appendChild(img);
            } else {
                var stub = document.createElement("div");
                stub.className = "gaic-msg-image-stub";
                stub.textContent = "צילום מסך צורף";
                media.appendChild(stub);
            }
            el.appendChild(media);
        }
        var text = message.text || "";
        if (text) {
            var textEl = document.createElement("div");
            textEl.className = "gaic-msg-text";
            textEl.textContent = text;
            el.appendChild(textEl);
        } else if (!thumbSrc && !message.has_image) {
            el.textContent = "";
        }
    }
    container.appendChild(el);
    if (message.role === "assistant" && message.partial) {
        var partialNote = document.createElement("div");
        partialNote.className = "gaic-msg gaic-msg-trace gaic-msg-partial";
        partialNote.textContent = GIBUSH_AI_CHAT_PARTIAL_NOTE;
        container.appendChild(partialNote);
    }
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
        localStorage.removeItem(GIBUSH_AI_CHAT_DIAGNOSTIC_STORAGE_KEY);
        localStorage.removeItem(GIBUSH_AI_CHAT_DIAGNOSTIC_MODE_KEY);
    } catch (e) { /* ignore */ }
    gibushAiChatSaveHistory([]);
    messagesContainer.innerHTML = "";
    gibushAiChatRenderEmpty(messagesContainer);
}

function ensureGibushAiChatWidget() {
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

    var attachPreview = document.createElement("div");
    attachPreview.className = "gaic-attach-preview";
    attachPreview.id = "gibush-ai-chat-attach-preview";
    attachPreview.style.display = "none";
    attachPreview.innerHTML =
        '<img id="gibush-ai-chat-attach-thumb" alt="תצוגה מקדימה" />' +
        '<button type="button" id="gibush-ai-chat-attach-clear" aria-label="הסר תמונה">×</button>';

    var inputRow = document.createElement("div");
    inputRow.className = "gaic-input-row";
    var textarea = document.createElement("textarea");
    textarea.id = "gibush-ai-chat-input";
    textarea.rows = 1;
    textarea.placeholder = "שאל משהו…";
    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png,image/jpeg,image/webp,image/gif";
    fileInput.id = "gibush-ai-chat-file";
    fileInput.style.display = "none";
    var attachBtn = document.createElement("button");
    attachBtn.type = "button";
    attachBtn.id = "gibush-ai-chat-attach";
    attachBtn.textContent = "תמונה";
    attachBtn.setAttribute("aria-label", "צרף צילום מסך או תמונה");
    attachBtn.title = "צרף תמונה / צילום מסך (אפשר גם להדביק עם Ctrl+V)";
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
    inputRow.appendChild(attachBtn);
    inputRow.appendChild(expensiveBtn);
    inputRow.appendChild(sendBtn);
    inputRow.appendChild(fileInput);

    var composerPresetRow = null;
    if (gibushAiChatDiagnosticsEnabled()) {
        composerPresetRow = document.createElement("div");
        composerPresetRow.className = "gaic-preset-row";
        composerPresetRow.setAttribute("data-gaic-preset-host", "composer");
        composer.appendChild(composerPresetRow);
    }

    var diagModeBar = null;
    var diagModeText = null;
    var diagModeExitBtn = null;
    if (gibushAiChatDiagnosticsEnabled()) {
        diagModeBar = document.createElement("div");
        diagModeBar.className = "gaic-diag-mode";
        diagModeBar.id = "gibush-ai-chat-diag-mode";
        diagModeBar.style.display = "none";
        diagModeText = document.createElement("span");
        diagModeText.className = "gaic-diag-mode-text";
        diagModeExitBtn = document.createElement("button");
        diagModeExitBtn.type = "button";
        diagModeExitBtn.id = "gibush-ai-chat-diag-exit";
        diagModeExitBtn.textContent = "חזרה לשיחה חופשית";
        diagModeExitBtn.setAttribute("aria-label", "יציאה ממצב אבחון לשיחה חופשית");
        diagModeBar.appendChild(diagModeText);
        diagModeBar.appendChild(diagModeExitBtn);
        composer.appendChild(diagModeBar);
    }

    composer.appendChild(spinLine);
    composer.appendChild(attachPreview);
    composer.appendChild(inputRow);

    shell.appendChild(head);
    shell.appendChild(messages);
    shell.appendChild(composer);
    root.appendChild(shell);

    var teamPicker = null;
    var pendingDiagnosticPreset = null;
    var selectedDiagnosticTeam = null;
    if (gibushAiChatDiagnosticsEnabled()) {
        teamPicker = document.createElement("div");
        teamPicker.id = "gibush-ai-chat-team-picker";
        teamPicker.setAttribute("dir", "rtl");
        teamPicker.setAttribute("role", "dialog");
        teamPicker.setAttribute("aria-modal", "true");
        teamPicker.setAttribute("aria-labelledby", "gibush-ai-chat-team-picker-title");
        teamPicker.innerHTML =
            '<div class="gaic-picker-panel">' +
            '<h3 class="gaic-picker-title" id="gibush-ai-chat-team-picker-title">נא לבחור צוות לניתוח</h3>' +
            '<p class="gaic-picker-sub" id="gibush-ai-chat-team-picker-sub"></p>' +
            '<div class="gaic-team-grid" id="gibush-ai-chat-team-grid"></div>' +
            '<div class="gaic-picker-actions">' +
            '<button type="button" id="gibush-ai-chat-team-confirm" disabled>הפעל ניתוח</button>' +
            '<button type="button" id="gibush-ai-chat-team-cancel">ביטול</button>' +
            "</div></div>";
        root.appendChild(teamPicker);

        var teamGrid = teamPicker.querySelector("#gibush-ai-chat-team-grid");
        for (var teamN = 1; teamN <= 13; teamN++) {
            var teamBtn = document.createElement("button");
            teamBtn.type = "button";
            teamBtn.className = "gaic-team-btn";
            teamBtn.textContent = String(teamN);
            teamBtn.setAttribute("data-team", String(teamN));
            teamGrid.appendChild(teamBtn);
        }
    }

    // Clear Tadabase's empty HTML shell content so the chat owns the area.
    if (mount && mount !== document.body) {
        mount.innerHTML = "";
        mount.appendChild(root);
    } else {
        document.body.appendChild(root);
    }

    var expensiveArmed = false;
    var requestInFlight = false;
    var pendingAttachment = null; // { dataUrl, thumbDataUrl }
    var spinLabel = spinLine.querySelector("span:last-child");
    var attachThumb = attachPreview.querySelector("#gibush-ai-chat-attach-thumb");
    var attachClearBtn = attachPreview.querySelector("#gibush-ai-chat-attach-clear");
    var teamConfirmBtn = teamPicker ? teamPicker.querySelector("#gibush-ai-chat-team-confirm") : null;
    var teamCancelBtn = teamPicker ? teamPicker.querySelector("#gibush-ai-chat-team-cancel") : null;
    var teamPickerSub = teamPicker ? teamPicker.querySelector("#gibush-ai-chat-team-picker-sub") : null;

    function setExpensiveArmed(on) {
        expensiveArmed = !!on;
        expensiveBtn.classList.toggle("gaic-expensive-on", expensiveArmed);
        expensiveBtn.setAttribute("aria-pressed", expensiveArmed ? "true" : "false");
    }

    function setPendingAttachment(next) {
        pendingAttachment = next || null;
        if (pendingAttachment && pendingAttachment.thumbDataUrl) {
            attachThumb.src = pendingAttachment.thumbDataUrl;
            attachPreview.style.display = "flex";
        } else {
            attachThumb.removeAttribute("src");
            attachPreview.style.display = "none";
        }
    }

    function clearPendingAttachment() {
        setPendingAttachment(null);
        try { fileInput.value = ""; } catch (e) { /* ignore */ }
    }

    function showAttachError(text) {
        var history = gibushAiChatLoadHistory();
        history.push({ role: "error", text: text });
        gibushAiChatSaveHistory(history);
        gibushAiChatRenderMessage(messages, { role: "error", text: text });
        messages.scrollTop = messages.scrollHeight;
    }

    function acceptImageBlob(blob) {
        if (requestInFlight) return;
        gibushAiChatProcessImageBlob(blob)
            .then(function (processed) {
                setPendingAttachment(processed);
                textarea.focus();
            })
            .catch(function (err) {
                showAttachError((err && err.message) || String(err));
            });
    }

    function setComposerBusy(busy) {
        requestInFlight = !!busy;
        sendBtn.disabled = requestInFlight;
        expensiveBtn.disabled = requestInFlight;
        attachBtn.disabled = requestInFlight;
        if (attachClearBtn) attachClearBtn.disabled = requestInFlight;
        if (diagModeExitBtn) diagModeExitBtn.disabled = requestInFlight;
        textarea.disabled = requestInFlight;
        var chips = shell.querySelectorAll("button.gaic-preset-chip");
        for (var i = 0; i < chips.length; i++) {
            chips[i].disabled = requestInFlight;
        }
    }

    function refreshDiagModeBar() {
        if (!diagModeBar || !diagModeText) return;
        var mode = gibushAiChatLoadDiagnosticMode();
        if (!mode) {
            diagModeBar.style.display = "none";
            diagModeText.textContent = "";
            return;
        }
        diagModeText.textContent = gibushAiChatDiagnosticModeLabel(mode);
        diagModeBar.style.display = "flex";
    }

    /**
     * Exit diagnostic UI mode. Migrates the OpenAI thread into free chat.
     * If announce=true, append a short notice bubble to the visible history.
     */
    function exitDiagnosticMode(announce) {
        var wasActive = !!gibushAiChatLoadDiagnosticMode();
        var migrated = gibushAiChatExitDiagnosticMode();
        refreshDiagModeBar();
        if (announce && wasActive) {
            var notice = {
                role: "assistant",
                text: migrated
                    ? "יצאת ממצב אבחון. ההמשך בשיחה חופשית (ארכיון + כל הכלים) — ההקשר מהניתוח הקודם נשמר."
                    : "יצאת ממצב אבחון. ההמשך בשיחה חופשית."
            };
            var history = gibushAiChatLoadHistory();
            history.push(notice);
            gibushAiChatSaveHistory(history);
            gibushAiChatRenderMessage(messages, notice);
            messages.scrollTop = messages.scrollHeight;
        }
        return migrated;
    }

    function autosizeTextarea() {
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
    }

    function fillPresetHost(host) {
        if (!host) return;
        host.innerHTML = "";
        GIBUSH_AI_CHAT_DIAGNOSTIC_PRESETS.forEach(function (preset) {
            var chip = document.createElement("button");
            chip.type = "button";
            chip.className = "gaic-preset-chip";
            chip.textContent = preset.label;
            chip.setAttribute("data-preset", preset.id);
            chip.disabled = requestInFlight;
            chip.addEventListener("click", function () {
                openTeamPicker(preset);
            });
            host.appendChild(chip);
        });
    }

    function refreshPresetChips() {
        if (!gibushAiChatDiagnosticsEnabled()) return;
        var emptyHost = messages.querySelector('[data-gaic-preset-host="empty"]');
        if (emptyHost) fillPresetHost(emptyHost);
        if (composerPresetRow) {
            var hasHistory = gibushAiChatLoadHistory().length > 0;
            composerPresetRow.style.display = hasHistory ? "flex" : "none";
            if (hasHistory) fillPresetHost(composerPresetRow);
        }
    }

    function closeTeamPicker() {
        if (!teamPicker) return;
        teamPicker.classList.remove("gaic-open");
        pendingDiagnosticPreset = null;
        selectedDiagnosticTeam = null;
        if (teamConfirmBtn) teamConfirmBtn.disabled = true;
        var selected = teamPicker.querySelectorAll("button.gaic-team-btn.gaic-selected");
        for (var i = 0; i < selected.length; i++) {
            selected[i].classList.remove("gaic-selected");
        }
    }

    function openTeamPicker(preset) {
        if (!teamPicker || requestInFlight) return;
        pendingDiagnosticPreset = preset;
        selectedDiagnosticTeam = null;
        if (teamPickerSub) {
            teamPickerSub.textContent = preset.label || "";
        }
        if (teamConfirmBtn) teamConfirmBtn.disabled = true;
        var selected = teamPicker.querySelectorAll("button.gaic-team-btn.gaic-selected");
        for (var i = 0; i < selected.length; i++) {
            selected[i].classList.remove("gaic-selected");
        }
        teamPicker.classList.add("gaic-open");
    }

    function setSpinnerText(text) {
        if (spinLabel && text) spinLabel.textContent = text;
    }

    function handleAskSuccess(data, ctx) {
        var history = gibushAiChatLoadHistory();
        var isDiagnostic = !!ctx.diagnostic;
        var answer = data.answer || "";
        var responseId = data.response_id || null;
        var toolCallsMade = Array.isArray(data.tool_calls_made) ? data.tool_calls_made : [];
        var wasExpensive = !!(data.expensive || ctx.expensive || isDiagnostic);
        if (responseId) {
            try {
                if (isDiagnostic) {
                    localStorage.setItem(GIBUSH_AI_CHAT_DIAGNOSTIC_STORAGE_KEY, responseId);
                } else {
                    localStorage.setItem(GIBUSH_AI_CHAT_STORAGE_KEY, responseId);
                }
            } catch (e) { /* ignore */ }
        }
        var assistantMessage = {
            role: "assistant",
            text: answer,
            toolCallsMade: toolCallsMade,
            expensive: wasExpensive,
            partial: !!data.partial
        };
        if (isDiagnostic) {
            assistantMessage.diagnostic = true;
            assistantMessage.team_number = ctx.teamNumber || null;
            assistantMessage.preset = ctx.presetId || null;
            var presetMeta = null;
            for (var pi = 0; pi < GIBUSH_AI_CHAT_DIAGNOSTIC_PRESETS.length; pi++) {
                if (GIBUSH_AI_CHAT_DIAGNOSTIC_PRESETS[pi].id === ctx.presetId) {
                    presetMeta = GIBUSH_AI_CHAT_DIAGNOSTIC_PRESETS[pi];
                    break;
                }
            }
            gibushAiChatEnterDiagnosticMode(ctx.teamNumber, presetMeta || { id: ctx.presetId, label: ctx.presetId });
            refreshDiagModeBar();
        }
        history.push(assistantMessage);
        gibushAiChatSaveHistory(history);
        gibushAiChatRenderMessage(messages, assistantMessage);
        refreshPresetChips();
    }

    function handleAskFailure(errorText, ctx) {
        var history = gibushAiChatLoadHistory();
        var text = errorText || "שגיאה לא ידועה";
        history.push({ role: "error", text: text });
        gibushAiChatSaveHistory(history);
        gibushAiChatRenderMessage(messages, { role: "error", text: text });
        if (ctx.diagnostic) {
            var existingDiagId = null;
            try {
                existingDiagId = localStorage.getItem(GIBUSH_AI_CHAT_DIAGNOSTIC_STORAGE_KEY);
            } catch (err) { /* ignore */ }
            if (!existingDiagId) {
                gibushAiChatSaveDiagnosticMode(null);
                refreshDiagModeBar();
            }
        }
        refreshPresetChips();
    }

    function askErrorText(data, status) {
        var text = (data && data.error) || "שגיאה לא ידועה";
        if (status === 501) {
            text = "מנוע ה-AI טרם הופעל במלואו (הרישום/לולאת הכלים עוד לא מומשו). " + text;
        }
        return text;
    }

    // One "data: {...}" block from the SSE stream. Comment frames (": ping",
    // the opening padding) carry no payload and parse to null.
    function parseSseBlock(block) {
        var lines = (block || "").split("\n");
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (!line || line.charAt(0) === ":") continue;
            if (line.indexOf("data:") !== 0) continue;
            var payload = line.substring(5).replace(/^\s+/, "");
            if (!payload) continue;
            try {
                return JSON.parse(payload);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Ask over SSE, updating the spinner from status events.
     *
     * Resolves with { needsFallback: true } when nothing at all came through
     * (streaming blocked, no ReadableStream support, dead before the first
     * event) so the caller can retry on the plain JSON endpoint. Resolves with
     * undefined once it has rendered an answer or an error itself - a stream
     * that dies mid-answer is NOT retried, since re-running the turn would cost
     * another full (possibly expensive) model run.
     */
    function streamAsk(body, ctx) {
        return new Promise(function (resolve) {
            if (!window.fetch || typeof AbortController === "undefined" || typeof TextDecoder === "undefined") {
                resolve({ needsFallback: true });
                return;
            }

            var controller = new AbortController();
            var eventsSeen = 0;
            var finished = false;
            var idleTimer = null;

            function stopIdleTimer() {
                if (idleTimer) {
                    clearTimeout(idleTimer);
                    idleTimer = null;
                }
            }

            // Heartbeats arrive every ~10s, so a longer gap than this means the
            // connection is gone even though no error fired.
            function resetIdleTimer() {
                stopIdleTimer();
                idleTimer = setTimeout(function () {
                    try { controller.abort(); } catch (e) { /* ignore */ }
                }, GIBUSH_AI_CHAT_STREAM_IDLE_TIMEOUT_MS);
            }

            function settle(outcome) {
                if (finished) return;
                finished = true;
                stopIdleTimer();
                try { controller.abort(); } catch (e) { /* ignore */ }
                resolve(outcome);
            }

            function handleEvent(event) {
                eventsSeen++;
                if (event.type === "status") {
                    setSpinnerText(event.message);
                    return;
                }
                if (event.type === "done") {
                    handleAskSuccess(event, ctx);
                    settle();
                    return;
                }
                if (event.type === "error") {
                    handleAskFailure(event.error, ctx);
                    settle();
                }
            }

            fetch(MISC_API_BASE + "/gibush_ai_ask_stream", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + GIBUSH_API_TOKEN
                },
                body: JSON.stringify(body),
                signal: controller.signal
            })
                .then(function (res) {
                    if (!res.ok) {
                        // Rejected before the stream opened - a real error, not
                        // a streaming problem, so don't fall back.
                        return res.json()
                            .then(function (data) { return data; }, function () { return {}; })
                            .then(function (data) {
                                handleAskFailure(askErrorText(data, res.status), ctx);
                                settle();
                            });
                    }
                    if (!res.body || !res.body.getReader) {
                        settle({ needsFallback: true });
                        return;
                    }

                    var reader = res.body.getReader();
                    var decoder = new TextDecoder();
                    var buffer = "";
                    resetIdleTimer();

                    function pump() {
                        return reader.read().then(function (chunk) {
                            if (finished) return;
                            if (chunk.done) {
                                if (eventsSeen) {
                                    handleAskFailure(GIBUSH_AI_CHAT_STREAM_CUT_MESSAGE, ctx);
                                    settle();
                                } else {
                                    settle({ needsFallback: true });
                                }
                                return;
                            }
                            resetIdleTimer();
                            buffer += decoder.decode(chunk.value, { stream: true });
                            var blocks = buffer.split("\n\n");
                            buffer = blocks[blocks.length - 1];
                            for (var i = 0; i < blocks.length - 1; i++) {
                                var event = parseSseBlock(blocks[i]);
                                if (event) handleEvent(event);
                                if (finished) return;
                            }
                            return pump();
                        });
                    }

                    return pump();
                })
                .catch(function (e) {
                    if (finished) return;
                    if (!eventsSeen) {
                        settle({ needsFallback: true });
                        return;
                    }
                    handleAskFailure((e && e.message) || String(e), ctx);
                    settle();
                });
        });
    }

    function jsonAsk(body, ctx) {
        setSpinnerText(ctx.expensive || ctx.diagnostic
            ? "בודק את הנתונים (מודל מורחב)…"
            : "בודק את הנתונים…");
        return fetch(MISC_API_BASE + "/gibush_ai_ask", {
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
                if (!result.ok) {
                    handleAskFailure(askErrorText(result.data, result.status), ctx);
                    return;
                }
                handleAskSuccess(result.data, ctx);
            });
    }

    function postAsk(body, options) {
        options = options || {};
        var ctx = {
            diagnostic: !!options.diagnostic,
            teamNumber: options.teamNumber || null,
            presetId: options.presetId || null,
            expensive: !!body.expensive
        };

        setComposerBusy(true);
        setSpinnerText(ctx.expensive || ctx.diagnostic
            ? "בודק את הנתונים (מודל מורחב)…"
            : "בודק את הנתונים…");
        spinLine.style.display = "flex";

        streamAsk(body, ctx)
            .then(function (outcome) {
                if (outcome && outcome.needsFallback) {
                    return jsonAsk(body, ctx);
                }
            })
            .catch(function (e) {
                handleAskFailure((e && e.message) || String(e), ctx);
            })
            .finally(function () {
                setComposerBusy(false);
                spinLine.style.display = "none";
                messages.scrollTop = messages.scrollHeight;
                textarea.focus();
            });
    }

    function sendMessage() {
        if (requestInFlight) return;
        var question = (textarea.value || "").trim();
        var attachment = pendingAttachment;
        if (!question && !attachment) return;

        var useExpensive = expensiveArmed;
        var visibleText = question;
        if (!visibleText && attachment) {
            visibleText = GIBUSH_AI_CHAT_IMAGE_ONLY_PLACEHOLDER;
        }
        var userMessage = {
            role: "user",
            text: visibleText,
            expensive: useExpensive
        };
        if (attachment) {
            userMessage.image_thumb = attachment.thumbDataUrl;
            userMessage.has_image = true;
        }
        var history = gibushAiChatLoadHistory();
        history.push(userMessage);
        gibushAiChatSaveHistory(history);
        gibushAiChatRenderMessage(messages, userMessage);
        refreshPresetChips();
        textarea.value = "";
        autosizeTextarea();
        clearPendingAttachment();
        messages.scrollTop = messages.scrollHeight;

        // Free text leaves diagnostic UI mode but keeps the OpenAI thread.
        var priorDiagMode = gibushAiChatLoadDiagnosticMode();
        var continuedFromDiagnostic = false;
        if (priorDiagMode) {
            continuedFromDiagnostic = !!exitDiagnosticMode(false);
        }

        var apiQuestion = question || visibleText;
        if (continuedFromDiagnostic && priorDiagMode) {
            apiQuestion =
                "המשך משיחת אבחון קודמת (צוות " + priorDiagMode.team_number +
                " · " + priorDiagMode.label +
                "). המשתמש עבר לשיחה חופשית — ניתן להשתמש בארכיון ובכלים המלאים, " +
                "ולענות על אותה שאלת אבחון בהקשר חדש אם מבקשים.\n\n" +
                apiQuestion;
        }

        var body = { question: apiQuestion };
        if (attachment && attachment.dataUrl) {
            body.image = attachment.dataUrl;
        }
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
        postAsk(body, { diagnostic: false });
    }

    function sendDiagnostic(preset, teamNumber) {
        if (requestInFlight || !preset || !teamNumber) return;
        var history = gibushAiChatLoadHistory();
        var visibleText = "צוות " + teamNumber + " · " + preset.label + "\n\n" + preset.user_prompt;
        var userMessage = {
            role: "user",
            text: visibleText,
            expensive: true,
            diagnostic: true,
            team_number: String(teamNumber),
            preset: preset.id
        };
        history.push(userMessage);
        gibushAiChatSaveHistory(history);
        gibushAiChatRenderMessage(messages, userMessage);
        gibushAiChatEnterDiagnosticMode(teamNumber, preset);
        refreshDiagModeBar();
        refreshPresetChips();
        messages.scrollTop = messages.scrollHeight;

        var body = {
            question: preset.user_prompt,
            diagnostic_preset: preset.id,
            team_number: String(teamNumber),
            scope: { team_number: String(teamNumber) },
            expensive: true
        };

        // Continue diagnostic thread only when still in diagnostic mode for the
        // same team (or last assistant was that diagnostic). Otherwise start fresh.
        var mode = gibushAiChatLoadDiagnosticMode();
        var lastAssistant = gibushAiChatLastAssistantMessage(history.slice(0, -1));
        var continueDiagnostic = !!(
            mode &&
            String(mode.team_number) === String(teamNumber)
        ) || !!(
            lastAssistant &&
            lastAssistant.diagnostic &&
            String(lastAssistant.team_number || "") === String(teamNumber)
        );
        if (continueDiagnostic) {
            var diagnosticResponseId = null;
            try {
                diagnosticResponseId = localStorage.getItem(GIBUSH_AI_CHAT_DIAGNOSTIC_STORAGE_KEY);
            } catch (e) { /* ignore */ }
            if (diagnosticResponseId) {
                body.previous_response_id = diagnosticResponseId;
            }
        }

        postAsk(body, {
            diagnostic: true,
            teamNumber: String(teamNumber),
            presetId: preset.id
        });
    }

    var history = gibushAiChatLoadHistory();
    if (history.length) {
        history.forEach(function (message) {
            gibushAiChatRenderMessage(messages, message);
        });
    } else {
        gibushAiChatRenderEmpty(messages);
    }
    refreshPresetChips();
    refreshDiagModeBar();
    messages.scrollTop = messages.scrollHeight;

    newConvoBtn.addEventListener("click", function () {
        gibushAiChatNewConversation(messages);
        setExpensiveArmed(false);
        clearPendingAttachment();
        refreshPresetChips();
        refreshDiagModeBar();
        textarea.focus();
    });
    if (diagModeExitBtn) {
        diagModeExitBtn.addEventListener("click", function () {
            if (requestInFlight) return;
            exitDiagnosticMode(true);
            textarea.focus();
        });
    }
    expensiveBtn.addEventListener("click", function () {
        setExpensiveArmed(!expensiveArmed);
    });
    attachBtn.addEventListener("click", function () {
        if (requestInFlight) return;
        fileInput.click();
    });
    if (attachClearBtn) {
        attachClearBtn.addEventListener("click", function () {
            if (requestInFlight) return;
            clearPendingAttachment();
            textarea.focus();
        });
    }
    fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        acceptImageBlob(file);
    });
    textarea.addEventListener("paste", function (e) {
        if (requestInFlight) return;
        var items = (e.clipboardData && e.clipboardData.items) || [];
        for (var i = 0; i < items.length; i++) {
            if (items[i].type && items[i].type.indexOf("image/") === 0) {
                var blob = items[i].getAsFile();
                if (blob) {
                    e.preventDefault();
                    acceptImageBlob(blob);
                    return;
                }
            }
        }
    });
    textarea.addEventListener("input", autosizeTextarea);

    if (teamPicker) {
        teamPicker.addEventListener("click", function (e) {
            if (e.target === teamPicker) {
                closeTeamPicker();
            }
        });
        teamPicker.querySelector("#gibush-ai-chat-team-grid").addEventListener("click", function (e) {
            var btn = e.target.closest("button.gaic-team-btn");
            if (!btn) return;
            var buttons = teamPicker.querySelectorAll("button.gaic-team-btn");
            for (var i = 0; i < buttons.length; i++) {
                buttons[i].classList.toggle("gaic-selected", buttons[i] === btn);
            }
            selectedDiagnosticTeam = btn.getAttribute("data-team");
            if (teamConfirmBtn) teamConfirmBtn.disabled = !selectedDiagnosticTeam;
        });
        if (teamCancelBtn) {
            teamCancelBtn.addEventListener("click", closeTeamPicker);
        }
        if (teamConfirmBtn) {
            teamConfirmBtn.addEventListener("click", function () {
                if (!pendingDiagnosticPreset || !selectedDiagnosticTeam) return;
                var preset = pendingDiagnosticPreset;
                var team = selectedDiagnosticTeam;
                closeTeamPicker();
                sendDiagnostic(preset, team);
            });
        }
    }

    sendBtn.addEventListener("click", sendMessage);
    // Enter inserts a newline (phone-friendly); send is only via the button.

    textarea.focus();
}

// Auto-mount when the script loads outside TB.render; TB.render pages should
// call ensureGibushAiChatWidget() themselves (idempotent if both run).
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureGibushAiChatWidget);
} else {
    ensureGibushAiChatWidget();
}
