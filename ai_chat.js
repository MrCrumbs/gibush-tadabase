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
 * ACCESS: merge fields resolve per logged-in user on one shared page:
 *   - GIBUSH_AI_CHAT_USER_ROLE = "{loggedInUser.role}"
 *   - GIBUSH_AI_CHAT_TEAM_NUMBER = "{loggedInUser.צוות שטח}" (required for מגבש)
 *   - GIBUSH_AI_CHAT_USER_NAME = "{loggedInUser.name}"
 *   - GIBUSH_AI_CHAT_USER_RECORD_ID = "{loggedInUser.Record ID}" (required for מגבש)
 * Modes: מגבש → live_team; גישה לארכיון → archive; מנהל/מפקד גיבוש → full.
 * Unknown role, מגבש without team, or מגבש without record id → "אין הרשאה".
 *
 * EXPENSIVE MODEL: the "$" toggle next to Send arms the next turn(s) to use
 * OPENAI_MODEL_GIBUSH_AGENT_EXPENSIVE (gpt-5.6-sol) instead of the default
 * Terra model. Leave it off for routine questions; turn it on for hard
 * suitability / "why" investigations that need deeper reasoning.
 *
 * SCREENSHOTS: paste (Ctrl/Cmd+V) or use the photo icon to attach one image
 * (png/jpeg/webp/gif). The client downscales before send; history keeps only
 * a small thumbnail (full image is not stored in localStorage).
 *
 * Multi-turn state: the last opaque application conversation token (returned
 * in the response_id compatibility field) is kept in localStorage so follow-up
 * questions continue the same bounded server-side conversation. "שיחה חדשה"
 * clears it.
 *
 * DIAGNOSTIC MODE: the clipboard icon opens a modal of preset analyses. After
 * confirming a prompt (and team, when needed), it runs under a live-only,
 * team-scoped prompt and keeps a separate conversation token. A banner shows
 * the active mode with "יציאה לשיחה חופשית". Exiting switches back to the
 * independently stored free-chat thread; diagnostic tokens never cross a team,
 * preset, or mode boundary.
 */
 
TB.render("component_3", function (data) {
    setTimeout(function () {
      $("#hichartsJS").remove();
      $("#game-menu").remove(); // explicit — more reliable than only nextSibling
      var root = document.querySelector("article div[ui-view]");
      if (root && root.nextSibling) root.nextSibling.remove();
      ensureGibushAiChatWidget();
    }, 0);
  });
  
  var GIBUSH_API_TOKEN = "jfhf3fUVRKuAlHoRqkgcAcv0me3q31Ii0LFawlUa3bQ";
  var MISC_API_BASE = "https://misc-ten.vercel.app";
  
  // Tadabase merge fields — resolve per logged-in user.
  var GIBUSH_AI_CHAT_USER_ROLE = "{loggedInUser.role}";
  var GIBUSH_AI_CHAT_TEAM_NUMBER = "{loggedInUser.צוות שטח}";
  var GIBUSH_AI_CHAT_USER_NAME = "{loggedInUser.name}";
  var GIBUSH_AI_CHAT_USER_RECORD_ID = "{loggedInUser.Record ID}";
  
  // Exact Tadabase Users.role strings → access mode (must match server).
  var GIBUSH_AI_CHAT_ROLE_MODES = {
      "מגבש": "live_team",
      "גישה לארכיון": "archive",
      "מנהל": "full",
      "מפקד גיבוש": "full"
  };
  
  var GIBUSH_AI_CHAT_STORAGE_KEY = "gibushAiChat_previousResponseId";
  // Legacy diagnostic token key is removed on write/clear. New diagnostic state
  // stores mode + token atomically in GIBUSH_AI_CHAT_DIAGNOSTIC_MODE_KEY.
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
  // Initial SSE connection plus one same-turn re-attachment after consecutive
  // transport failures. Server "pending" responses keep polling until the
  // overall turn deadline below; they are not terminal failures.
  var GIBUSH_AI_CHAT_STREAM_MAX_ATTEMPTS = 2;
  var GIBUSH_AI_CHAT_PENDING_REATTACH_DELAY_MS = 750;
  var GIBUSH_AI_CHAT_TURN_DEADLINE_MS = 11 * 60 * 1000;
  var GIBUSH_AI_CHAT_TURN_DEADLINE_MESSAGE =
      "הבקשה ארכה זמן רב מדי ונעצרה. אפשר לנסות שוב או לצמצם את השאלה.";
  var GIBUSH_AI_CHAT_JSON_TIMEOUT_MS = 180000;
  var GIBUSH_AI_CHAT_JSON_TIMEOUT_MESSAGE =
      "הבקשה ארכה זמן רב מדי ונעצרה. אפשר לנסות שוב או לצמצם את השאלה.";
  var GIBUSH_AI_CHAT_PARTIAL_NOTE =
      "התשובה מבוססת על נתונים חלקיים — הזמן שהוקצב לשאלה נגמר. כדאי לצמצם את אופי השאלה ולשאול שוב.";
  
  /** Return an opaque id that stays stable across stream -> JSON fallback. */
  function gibushAiChatNewTurnId() {
      if (window.crypto && typeof window.crypto.randomUUID === "function") {
          return window.crypto.randomUUID();
      }
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (char) {
          var random = Math.floor(Math.random() * 16);
          var value = char === "x" ? random : ((random & 3) | 8);
          return value.toString(16);
      });
  }
  
  // Preset ids + Hebrew labels for the modal. `summary` is shown on confirm.
  // Backend DIAGNOSTIC_TASKS.user_prompt (English) is authoritative for the model;
  // `user_prompt` here is what the assessor sees in chat history.
  var GIBUSH_AI_CHAT_DIAGNOSTIC_PRESETS = [
      {
          id: "instability",
          label: "מי לא יציב?",
          summary:
              "מאתר מועמדים בשליש העליון/אמצעי עם תנודתיות חוזרת בזחילות ובספרינטים — " +
              "לא נפילה בודדת, אלא זגזוג משמעותי בין מקצים.",
          user_prompt:
              "נתח את יציבות הביצועים של המועמדים הנמצאים בשליש העליון ובשליש האמצעי.\n" +
              "התמקד בזחילות ובספרינטים ובדוק את השינוי במיקום היחסי בין כל שני מקצים סמוכים.\n" +
              "זהה עד שני מועמדים עם תנודתיות גבוהה שמגובה היטב בנתונים.\n" +
              "אל תבחר מועמד בגלל נפילה בודדת. חפש דפוס חוזר של קפיצות משמעותיות, " +
              "למשל מעבר מקדמת הקבוצה לחלקה האחורי וחזרה.\n" +
              "עבור כל מועמד: הצג רצף מיקומים או דוגמאות עוקבות שממחישות את הזגזוג; " +
              "ציין כמה פעמים הופיע שינוי חריף; קבע האם התנודתיות מופיעה בתרגיל אחד או בשניהם; " +
              "הבחן בין חוסר יציבות מתמשך לבין משבר קצר ולאחריו התייצבות; " +
              "נסח נקודת בדיקה אחת למגבש.\n" +
              "דרג את הממצאים מהפחות יציב ליותר יציב."
      },
      {
          id: "late_fade",
          label: "מי נשחק בסוף?",
          summary:
              "מחפש שחיקה מאוחרת: ירידה בין השליש הראשון לאחרון בזחילות, ספרינטים " +
              "ואלונקה סוציומטרית.",
          user_prompt:
              "נתח את המועמדים בשליש העליון ובשליש האמצעי וחפש ירידה תפקודית ככל שהגיבוש מתקדם.\n" +
              "השווה בין השליש הראשון לשליש האחרון בזחילות, בספרינטים ובאלונקה הסוציומטרית " +
              "(אם פעילות זו כבר הושקה).\n" +
              "זהה עד שלושה מועמדים עם שחיקה מאוחרת משמעותית שמגובה בנתונים.\n" +
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
          summary:
              "מאתר ירידה משמעותית ואחריה חזרה יציבה לרמה טובה יותר — " +
              "לפחות שני מקצים רצופים משופרים שנשמרים.",
          user_prompt:
              "חפש בקרב המועמדים בשליש העליון ובשליש האמצעי מקרים של ירידה משמעותית " +
              "ולאחריה חזרה יציבה לרמת ביצוע טובה יותר.\n" +
              "זהה עד שלושה מועמדים עם התאוששות בולטת שמגובה בנתונים.\n" +
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
          summary:
              "בודק רק את השליש העליון ומחפש סיכון שהציון הכולל מסתיר — " +
              "תנודתיות, שחיקה מאוחרת, תחום חלש או מקצים חסרים.",
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
          summary:
              "מחפש בשליש האמצעי מועמדים עם מגמת שיפור, יציבות או התאוששות " +
              "שמצדיקים מבט נוסף — לא בזכות תרגיל חד־פעמי.",
          user_prompt:
              "נתח רק את המועמדים בשליש האמצעי.\n" +
              "זהה עד שלושה מועמדים עם פוטנציאל מבוסס להערכה מחודשת, " +
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
          summary:
              "משווה בין סוגי מאמץ ומאתר פרופילים מאוזנים מול פערים גדולים " +
              "בין זחילות, ספרינטים ואלונקה סוציומטרית.",
          user_prompt:
              "השווה בין ביצועי המועמדים בשליש העליון ובשליש האמצעי בפעילויות שהושקו " +
              "(זחילות, ספרינטים, אלונקה סוציומטרית, שקים, אלונקה רגילה — לפי הזמין).\n" +
              "זהה עד שני מועמדים בעלי פרופיל אחיד ומאוזן שמגובה בנתונים ועד שני מועמדים " +
              "בעלי הפערים הגדולים ביותר בין סוגי המאמץ.\n" +
              "עבור כל מועמד: התחום החזק/החלש; גודל הפער; האם החולשה מרמה נמוכה / חוסר יציבות " +
              "/ שחיקה / מקצים חסרים; האם החוזק מתרגיל חוזר או חד־פעמי; " +
              "האם הפרופיל דומה גם בשליש האחרון.\n" +
              "אל תאפשר לתוצאה גבוהה בשקים או באלונקה רגילה לבדה להגדיר מועמד כמאוזן — " +
              "תן עדיפות לדפוס שחוזר בזחילות, בספרינטים ובאלונקה הסוציומטרית."
      }
  ];
  
  function gibushAiChatSvgIcon(kind) {
      if (kind === "photo") {
          return (
              '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" ' +
              'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
              'stroke-linejoin="round" aria-hidden="true">' +
              '<rect x="3" y="5" width="18" height="14" rx="2"></rect>' +
              '<circle cx="8.5" cy="10.5" r="1.5"></circle>' +
              '<path d="M21 15l-5-5L5 21"></path>' +
              "</svg>"
          );
      }
      if (kind === "clipboard") {
          return (
              '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" ' +
              'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
              'stroke-linejoin="round" aria-hidden="true">' +
              '<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"></path>' +
              '<rect x="9" y="3" width="6" height="4" rx="1"></rect>' +
              '<path d="M9 12h6M9 16h6"></path>' +
              "</svg>"
          );
      }
      return "";
  }
  
  function gibushAiChatResolvedRole() {
      var raw = (GIBUSH_AI_CHAT_USER_ROLE == null) ? "" : String(GIBUSH_AI_CHAT_USER_ROLE).trim();
      if (!raw || raw.indexOf("{") === 0 || raw.toLowerCase() === "undefined" || raw.toLowerCase() === "null") {
          return null;
      }
      return raw;
  }
  
  function gibushAiChatResolvedTeamNumber() {
      var raw = (GIBUSH_AI_CHAT_TEAM_NUMBER == null) ? "" : String(GIBUSH_AI_CHAT_TEAM_NUMBER).trim();
      // Tadabase leaves the literal "{loggedInUser...}" merge-field text in place
      // if it fails to resolve (e.g. previewed outside a real session).
      if (!raw || raw.indexOf("{") === 0 || raw.toLowerCase() === "undefined" || raw.toLowerCase() === "null" || raw.toLowerCase() === "all") {
          return null;
      }
      return raw;
  }
  
  function gibushAiChatResolvedUserName() {
      var raw = (GIBUSH_AI_CHAT_USER_NAME == null) ? "" : String(GIBUSH_AI_CHAT_USER_NAME).trim();
      if (!raw || raw.indexOf("{") === 0 || raw.toLowerCase() === "undefined" || raw.toLowerCase() === "null") {
          return null;
      }
      return raw;
  }
  
  function gibushAiChatResolvedUserRecordId() {
      var raw = (GIBUSH_AI_CHAT_USER_RECORD_ID == null) ? "" : String(GIBUSH_AI_CHAT_USER_RECORD_ID).trim();
      if (!raw || raw.indexOf("{") === 0 || raw.toLowerCase() === "undefined" || raw.toLowerCase() === "null") {
          return null;
      }
      return raw;
  }
  
  /**
   * Resolve UI/API access from merge fields. Fail closed when role is missing/
   * unknown, or מגבש lacks צוות שטח / Users record id.
   * Returns { role, mode, teamNumber, userName, userRecordId, allowed, denyReason, scopeLabel }.
   */
  function gibushAiChatResolveAccess() {
      var role = gibushAiChatResolvedRole();
      var teamNumber = gibushAiChatResolvedTeamNumber();
      var userName = gibushAiChatResolvedUserName();
      var userRecordId = gibushAiChatResolvedUserRecordId();
      if (!role) {
          return {
              role: null,
              mode: null,
              teamNumber: teamNumber,
              userName: userName,
              userRecordId: userRecordId,
              allowed: false,
              denyReason: "אין הרשאה — תפקיד המשתמש לא זוהה.",
              scopeLabel: "אין הרשאה"
          };
      }
      var mode = GIBUSH_AI_CHAT_ROLE_MODES[role];
      if (!mode) {
          return {
              role: role,
              mode: null,
              teamNumber: teamNumber,
              userName: userName,
              userRecordId: userRecordId,
              allowed: false,
              denyReason: "אין הרשאה — תפקיד זה אינו מורשה לשימוש ב-AI.",
              scopeLabel: "אין הרשאה"
          };
      }
      if (mode === "live_team" && !teamNumber) {
          return {
              role: role,
              mode: mode,
              teamNumber: null,
              userName: userName,
              userRecordId: userRecordId,
              allowed: false,
              denyReason: "אין הרשאה — למגבש חסר צוות שטח.",
              scopeLabel: "אין הרשאה"
          };
      }
      if (mode === "live_team" && !userRecordId) {
          return {
              role: role,
              mode: mode,
              teamNumber: teamNumber,
              userName: userName,
              userRecordId: null,
              allowed: false,
              denyReason: "אין הרשאה — למגבש חסר מזהה משתמש.",
              scopeLabel: "אין הרשאה"
          };
      }
      var scopeLabel = "כל הצוותים";
      if (mode === "live_team") {
          scopeLabel = "צוות " + teamNumber;
      } else if (mode === "archive") {
          scopeLabel = "ארכיון בלבד";
      }
      return {
          role: role,
          mode: mode,
          teamNumber: teamNumber,
          userName: userName,
          userRecordId: userRecordId,
          allowed: true,
          denyReason: null,
          scopeLabel: scopeLabel
      };
  }
  
  /** Payload scope object for every ask/stream request. Null if access denied. */
  function gibushAiChatScopePayload() {
      var access = gibushAiChatResolveAccess();
      if (!access.allowed) return null;
      var scope = { role: access.role };
      if (access.mode === "live_team" && access.teamNumber) {
          scope.team_number = String(access.teamNumber);
      }
      if (access.userName) {
          scope.user_name = access.userName;
      }
      if (access.userRecordId) {
          scope.user_record_id = String(access.userRecordId);
      }
      return scope;
  }
  
  function gibushAiChatWelcomeCopy(access) {
      var name = access && access.userName ? access.userName : null;
      var hello = name ? ("שלום, " + name) : "שלום";
      var detail = "שאל על מוערכים, ציונים, ראיונות, הערכות שטח או מחזורים קודמים. "
      if (!access || !access.allowed) {
          return { title: hello, detail: (access && access.denyReason) || "אין הרשאה" };
      }
      if (access.mode === "live_team") {
          detail = "אתה מגבש של צוות " + access.teamNumber +
              ". באפשרותך לשאול על מוערכים, תרגילים, וכל נושא שמעניין אותך בנוגע לצוות שלך."
      } else if (access.mode === "archive") {
          detail = "הגישה שלך לארכיון בלבד — מחזורים קודמים בכל הצוותים. "
      } else {
          detail = "גישה מלאה לכל הצוותים, לנתונים חיים ולארכיון. "
      }
      return { title: hello, detail: detail };
  }
  
  function gibushAiChatFreeConversationStorageKey() {
      var access = gibushAiChatResolveAccess();
      if (!access.allowed) {
          return GIBUSH_AI_CHAT_STORAGE_KEY + ":denied";
      }
      if (access.mode === "live_team") {
          return GIBUSH_AI_CHAT_STORAGE_KEY + ":live_team-" + String(access.teamNumber);
      }
      return GIBUSH_AI_CHAT_STORAGE_KEY + ":" + access.mode;
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
      // Live diagnostic presets: full (picker) and live_team (fixed team, no picker).
      var access = gibushAiChatResolveAccess();
      return !!(access.allowed && (access.mode === "full" || access.mode === "live_team"));
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
              label: parsed.label ? String(parsed.label) : String(parsed.preset),
              response_id: (
                  typeof parsed.response_id === "string" && parsed.response_id
                      ? parsed.response_id
                      : null
              )
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
                  label: mode.label ? String(mode.label) : String(mode.preset),
                  response_id: mode.response_id ? String(mode.response_id) : null
              })
          );
          localStorage.removeItem(GIBUSH_AI_CHAT_DIAGNOSTIC_STORAGE_KEY);
      } catch (e) { /* ignore */ }
  }
  
  function gibushAiChatDiagnosticContextMatches(mode, teamNumber, presetId) {
      return !!(
          mode &&
          String(mode.team_number) === String(teamNumber) &&
          String(mode.preset) === String(presetId)
      );
  }
  
  /**
   * Leave diagnostic UI mode. Diagnostic and free-chat tokens are intentionally
   * isolated; crossing the mode boundary discards the diagnostic token and keeps
   * the independently stored free-chat thread.
   */
  function gibushAiChatExitDiagnosticMode() {
      var wasActive = !!gibushAiChatLoadDiagnosticMode();
      try {
          localStorage.removeItem(GIBUSH_AI_CHAT_DIAGNOSTIC_STORAGE_KEY);
      } catch (e) { /* ignore */ }
      gibushAiChatSaveDiagnosticMode(null);
      return wasActive;
  }
  
  function gibushAiChatEnterDiagnosticMode(teamNumber, preset, responseId) {
      if (!teamNumber || !preset) return;
      gibushAiChatSaveDiagnosticMode({
          team_number: String(teamNumber),
          preset: preset.id || String(preset),
          label: preset.label || preset.id || String(preset),
          response_id: responseId || null
      });
  }
  
  function gibushAiChatDiagnosticModeLabel(mode) {
      if (!mode) return "";
      return "מצב אבחון · צוות " + mode.team_number + " · " + mode.label;
  }
  
  function gibushAiChatRenderEmpty(container) {
      var access = gibushAiChatResolveAccess();
      var welcome = gibushAiChatWelcomeCopy(access);
      var empty = document.createElement("div");
      empty.className = "gaic-empty";
      empty.id = "gibush-ai-chat-empty";
      empty.innerHTML =
          "<h3>" + gibushAiChatEscapeHtml(welcome.title) + "</h3>" +
          "<p>" + gibushAiChatEscapeHtml(welcome.detail) + "</p>";
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
      if (message.role === "assistant" && message.conversationReset) {
          var resetTrace = document.createElement("div");
          resetTrace.className = "gaic-msg gaic-msg-trace";
          resetTrace.textContent = "הקשר השיחה הקודם לא היה זמין, ולכן התשובה התחילה הקשר חדש.";
          container.appendChild(resetTrace);
      }
      return el;
  }
  
  function gibushAiChatNewConversation(messagesContainer) {
      try {
          localStorage.removeItem(GIBUSH_AI_CHAT_STORAGE_KEY);
          localStorage.removeItem(gibushAiChatFreeConversationStorageKey());
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
      var access = gibushAiChatResolveAccess();
      var scopeLine = document.createElement("div");
      scopeLine.className = "gaic-scope-line";
      scopeLine.textContent = "מרחב נתונים: " + access.scopeLabel;
      headLeft.appendChild(h2);
      headLeft.appendChild(scopeLine);
      if (!access.allowed) {
          var denyLine = document.createElement("div");
          denyLine.className = "gaic-scope-deny";
          denyLine.textContent = access.denyReason || "אין הרשאה";
          headLeft.appendChild(denyLine);
      }
  
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
      attachBtn.className = "gaic-icon-btn";
      attachBtn.innerHTML = gibushAiChatSvgIcon("photo");
      attachBtn.setAttribute("aria-label", "צרף צילום מסך או תמונה");
      attachBtn.title = "צרף תמונה / צילום מסך (אפשר גם להדביק עם Ctrl+V)";
      var presetsBtn = null;
      if (gibushAiChatDiagnosticsEnabled()) {
          presetsBtn = document.createElement("button");
          presetsBtn.type = "button";
          presetsBtn.id = "gibush-ai-chat-presets";
          presetsBtn.className = "gaic-icon-btn";
          presetsBtn.innerHTML = gibushAiChatSvgIcon("clipboard");
          presetsBtn.setAttribute("aria-label", "ניתוחים מוכנים");
          presetsBtn.title = "ניתוחים מוכנים — פותח רשימת שאלות אבחון";
      }
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
      var actionsRow = document.createElement("div");
      actionsRow.className = "gaic-actions";
      actionsRow.appendChild(attachBtn);
      if (presetsBtn) actionsRow.appendChild(presetsBtn);
      actionsRow.appendChild(expensiveBtn);
      actionsRow.appendChild(sendBtn);
      inputRow.appendChild(textarea);
      inputRow.appendChild(actionsRow);
      inputRow.appendChild(fileInput);
  
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
      var presetPicker = null;
      var pendingPresetConfirm = null;
      // Team picker only for full access; live_team starts diagnostics on its fixed team.
      if (access.allowed && access.mode === "full") {
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
          // Keep in sync with misc helpers_gibush.MAX_TEAM_NUMBER (currently 14).
          var maxTeamNumber = 14;
          for (var teamN = 1; teamN <= maxTeamNumber; teamN++) {
              var teamBtn = document.createElement("button");
              teamBtn.type = "button";
              teamBtn.className = "gaic-team-btn";
              teamBtn.textContent = String(teamN);
              teamBtn.setAttribute("data-team", String(teamN));
              teamGrid.appendChild(teamBtn);
          }
      }
  
      if (gibushAiChatDiagnosticsEnabled()) {
          presetPicker = document.createElement("div");
          presetPicker.id = "gibush-ai-chat-preset-picker";
          presetPicker.setAttribute("dir", "rtl");
          presetPicker.setAttribute("role", "dialog");
          presetPicker.setAttribute("aria-modal", "true");
          presetPicker.setAttribute("aria-labelledby", "gibush-ai-chat-preset-picker-title");
          presetPicker.innerHTML =
              '<div class="gaic-picker-panel">' +
              '<div class="gaic-preset-step" data-gaic-preset-step="list">' +
              '<h3 class="gaic-picker-title" id="gibush-ai-chat-preset-picker-title">ניתוחים מוכנים</h3>' +
              '<p class="gaic-picker-sub">בחר שאלת אבחון להרצה על צוות</p>' +
              '<div class="gaic-preset-list" id="gibush-ai-chat-preset-list"></div>' +
              '<div class="gaic-picker-actions">' +
              '<button type="button" id="gibush-ai-chat-preset-close">סגור</button>' +
              "</div></div>" +
              '<div class="gaic-preset-step" data-gaic-preset-step="confirm" hidden>' +
              '<h3 class="gaic-picker-title" id="gibush-ai-chat-preset-confirm-title"></h3>' +
              '<p class="gaic-preset-summary" id="gibush-ai-chat-preset-confirm-summary"></p>' +
              '<p class="gaic-preset-warn" id="gibush-ai-chat-preset-confirm-warn">' +
              "שים לב: בחירה זו תפתח הקשר שיחה נפרד (מצב אבחון) ולא תמשיך את השיחה החופשית הנוכחית. " +
              "האם להמשיך?" +
              "</p>" +
              '<div class="gaic-picker-actions">' +
              '<button type="button" id="gibush-ai-chat-preset-confirm">המשך</button>' +
              '<button type="button" id="gibush-ai-chat-preset-back">חזרה</button>' +
              "</div></div></div>";
          root.appendChild(presetPicker);
  
          var presetList = presetPicker.querySelector("#gibush-ai-chat-preset-list");
          GIBUSH_AI_CHAT_DIAGNOSTIC_PRESETS.forEach(function (preset) {
              var item = document.createElement("button");
              item.type = "button";
              item.className = "gaic-preset-item";
              item.setAttribute("data-preset", preset.id);
              item.textContent = preset.label;
              presetList.appendChild(item);
          });
      }
  
      if (!access.allowed) {
          shell.classList.add("gaic-access-denied");
          textarea.disabled = true;
          sendBtn.disabled = true;
          expensiveBtn.disabled = true;
          attachBtn.disabled = true;
          if (presetsBtn) presetsBtn.disabled = true;
          textarea.placeholder = "אין הרשאה";
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
      var activeTurn = null;
      var conversationEpoch = 0;
      var attachmentGeneration = 0;
      var pendingAttachment = null; // { dataUrl, thumbDataUrl }
    var spinLabel = spinLine.querySelector("span:last-child");
    var attachThumb = attachPreview.querySelector("#gibush-ai-chat-attach-thumb");
    var attachClearBtn = attachPreview.querySelector("#gibush-ai-chat-attach-clear");
    var teamConfirmBtn = teamPicker ? teamPicker.querySelector("#gibush-ai-chat-team-confirm") : null;
    var teamCancelBtn = teamPicker ? teamPicker.querySelector("#gibush-ai-chat-team-cancel") : null;
    var teamPickerSub = teamPicker ? teamPicker.querySelector("#gibush-ai-chat-team-picker-sub") : null;
    var presetCloseBtn = presetPicker ? presetPicker.querySelector("#gibush-ai-chat-preset-close") : null;
    var presetConfirmBtn = presetPicker ? presetPicker.querySelector("#gibush-ai-chat-preset-confirm") : null;
    var presetBackBtn = presetPicker ? presetPicker.querySelector("#gibush-ai-chat-preset-back") : null;
    var presetConfirmTitle = presetPicker ? presetPicker.querySelector("#gibush-ai-chat-preset-confirm-title") : null;
    var presetConfirmSummary = presetPicker ? presetPicker.querySelector("#gibush-ai-chat-preset-confirm-summary") : null;
    var presetStepList = presetPicker ? presetPicker.querySelector('[data-gaic-preset-step="list"]') : null;
    var presetStepConfirm = presetPicker ? presetPicker.querySelector('[data-gaic-preset-step="confirm"]') : null;

    /** Keep the latest message in view (messages pane + page fallback for mobile). */
    function scrollMessagesToBottom() {
        if (!messages) return;
        function pin() {
            messages.scrollTop = messages.scrollHeight;
            var last = messages.lastElementChild;
            if (last && typeof last.scrollIntoView === "function") {
                try {
                    last.scrollIntoView({ block: "end", inline: "nearest" });
                } catch (e) {
                    try { last.scrollIntoView(false); } catch (e2) { /* ignore */ }
                }
            }
        }
        pin();
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(function () {
                pin();
                requestAnimationFrame(pin);
            });
        } else {
            setTimeout(pin, 0);
            setTimeout(pin, 50);
        }
    }
  
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
          attachmentGeneration += 1;
          setPendingAttachment(null);
          try { fileInput.value = ""; } catch (e) { /* ignore */ }
      }
  
      function showAttachError(text) {
          var history = gibushAiChatLoadHistory();
          history.push({ role: "error", text: text });
          gibushAiChatSaveHistory(history);
          gibushAiChatRenderMessage(messages, { role: "error", text: text });
          scrollMessagesToBottom();
      }
  
      function acceptImageBlob(blob) {
          if (requestInFlight) return;
          var acceptedEpoch = conversationEpoch;
          var acceptedGeneration = attachmentGeneration + 1;
          attachmentGeneration = acceptedGeneration;
          gibushAiChatProcessImageBlob(blob)
              .then(function (processed) {
                  if (
                      acceptedEpoch !== conversationEpoch ||
                      acceptedGeneration !== attachmentGeneration ||
                      requestInFlight
                  ) return;
                  setPendingAttachment(processed);
                  textarea.focus();
              })
              .catch(function (err) {
                  if (
                      acceptedEpoch !== conversationEpoch ||
                      acceptedGeneration !== attachmentGeneration
                  ) return;
                  showAttachError((err && err.message) || String(err));
              });
      }
  
      function setComposerBusy(busy) {
          requestInFlight = !!busy;
          var accessOk = gibushAiChatResolveAccess().allowed;
          if (!accessOk) {
              sendBtn.disabled = true;
              sendBtn.textContent = "שלח";
              expensiveBtn.disabled = true;
              attachBtn.disabled = true;
              if (presetsBtn) presetsBtn.disabled = true;
              if (attachClearBtn) attachClearBtn.disabled = true;
              if (diagModeExitBtn) diagModeExitBtn.disabled = true;
              textarea.disabled = true;
              return;
          }
          // While busy this becomes a Stop button. It deliberately remains
          // clickable so the browser can abort and ask the backend to cancel.
          sendBtn.disabled = false;
          sendBtn.textContent = requestInFlight ? "עצור" : "שלח";
          sendBtn.setAttribute(
              "aria-label",
              requestInFlight ? "עצור את יצירת התשובה" : "שלח שאלה"
          );
          expensiveBtn.disabled = requestInFlight;
          attachBtn.disabled = requestInFlight;
          if (presetsBtn) presetsBtn.disabled = requestInFlight;
          if (attachClearBtn) attachClearBtn.disabled = requestInFlight;
          if (diagModeExitBtn) diagModeExitBtn.disabled = requestInFlight;
          textarea.disabled = requestInFlight;
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
       * Exit diagnostic UI mode without moving its token into free chat.
       * If announce=true, append a short notice bubble to the visible history.
       */
      function freeChatHandoffNotice() {
          var currentAccess = gibushAiChatResolveAccess();
          if (currentAccess.mode === "live_team") {
              return (
                  "יצאת ממצב אבחון. ההמשך בשיחה חופשית על צוות " +
                  currentAccess.teamNumber +
                  " (נתונים חיים בלבד); שיחות האבחון נשמרות בנפרד כדי למנוע ערבוב בין הקשרים."
              );
          }
          return (
              "יצאת ממצב אבחון. ההמשך בשיחה חופשית (ארכיון + כל הכלים); " +
              "שיחות האבחון נשמרות בנפרד כדי למנוע ערבוב בין הקשרים."
          );
      }
  
      function exitDiagnosticMode(announce) {
          var wasActive = !!gibushAiChatLoadDiagnosticMode();
          gibushAiChatExitDiagnosticMode();
          refreshDiagModeBar();
          if (announce && wasActive) {
              var notice = {
                  role: "assistant",
                  text: freeChatHandoffNotice()
              };
              var history = gibushAiChatLoadHistory();
              history.push(notice);
              gibushAiChatSaveHistory(history);
              gibushAiChatRenderMessage(messages, notice);
              scrollMessagesToBottom();
          }
          return wasActive;
      }
  
      function autosizeTextarea() {
          textarea.style.height = "auto";
          textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
      }
  
      function showPresetStep(step) {
          if (!presetStepList || !presetStepConfirm) return;
          var showConfirm = step === "confirm";
          presetStepList.hidden = showConfirm;
          presetStepConfirm.hidden = !showConfirm;
          if (presetPicker) {
              presetPicker.setAttribute(
                  "aria-labelledby",
                  showConfirm
                      ? "gibush-ai-chat-preset-confirm-title"
                      : "gibush-ai-chat-preset-picker-title"
              );
          }
      }
  
      function closePresetPicker() {
          if (!presetPicker) return;
          presetPicker.classList.remove("gaic-open");
          pendingPresetConfirm = null;
          showPresetStep("list");
      }
  
      function openPresetPicker() {
          if (!presetPicker || requestInFlight) return;
          if (!gibushAiChatResolveAccess().allowed) return;
          pendingPresetConfirm = null;
          showPresetStep("list");
          presetPicker.classList.add("gaic-open");
      }
  
      function openPresetConfirm(preset) {
          if (!presetPicker || !preset) return;
          pendingPresetConfirm = preset;
          if (presetConfirmTitle) presetConfirmTitle.textContent = preset.label || "";
          if (presetConfirmSummary) {
              presetConfirmSummary.textContent = preset.summary || preset.label || "";
          }
          showPresetStep("confirm");
      }
  
      function confirmPendingPreset() {
          var preset = pendingPresetConfirm;
          if (!preset) return;
          var currentAccess = gibushAiChatResolveAccess();
          closePresetPicker();
          if (currentAccess.mode === "live_team" && currentAccess.teamNumber) {
              sendDiagnostic(preset, currentAccess.teamNumber);
              return;
          }
          openTeamPicker(preset);
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
          for (var si = 0; si < selected.length; si++) {
              selected[si].classList.remove("gaic-selected");
          }
          teamPicker.classList.add("gaic-open");
      }
  
      function setSpinnerText(text) {
          if (spinLabel && text) spinLabel.textContent = text;
      }
  
      function isCurrentTurnContext(ctx) {
          return !!(
              ctx &&
              ctx.turn &&
              activeTurn === ctx.turn &&
              !ctx.turn.cancelled &&
              ctx.epoch === conversationEpoch
          );
      }
  
      function removeLiveAssistant(ctx) {
          if (ctx && ctx.liveAssistantEl && ctx.liveAssistantEl.parentNode) {
              ctx.liveAssistantEl.parentNode.removeChild(ctx.liveAssistantEl);
          }
          if (ctx) ctx.liveAssistantEl = null;
      }
  
      function appendAnswerDelta(event, ctx) {
          if (!isCurrentTurnContext(ctx)) return;
          var delta = event.delta;
          if (delta == null) delta = event.text;
          if (delta == null) delta = event.answer_delta;
          if (delta == null || delta === "") return;
          // Keep consuming streamed output so the connection stays live and a
          // completed answer can still be recovered if the terminal event omits
          // its text. Do not render each provider token: Hebrew output often
          // arrives in tiny deltas, which makes the answer feel much slower than
          // an atomic reveal. handleAskSuccess renders the complete answer once.
          ctx.streamedAnswer = (ctx.streamedAnswer || "") + String(delta);
      }
  
      function clearResponseIdForContext(ctx) {
          try {
              if (ctx && ctx.diagnostic) {
                  var mode = gibushAiChatLoadDiagnosticMode();
                  if (mode) {
                      mode.response_id = null;
                      gibushAiChatSaveDiagnosticMode(mode);
                  }
                  localStorage.removeItem(GIBUSH_AI_CHAT_DIAGNOSTIC_STORAGE_KEY);
              } else {
                  localStorage.removeItem(gibushAiChatFreeConversationStorageKey());
              }
          } catch (e) { /* ignore */ }
      }
  
      function handleConversationReset(ctx) {
          if (!isCurrentTurnContext(ctx)) return;
          clearResponseIdForContext(ctx);
          ctx.conversationReset = true;
          setSpinnerText("ההקשר הקודם לא זמין — ממשיך בשיחה חדשה…");
      }
  
      function requestBackendCancellation(turn) {
          if (
              !turn || turn.cancelAcknowledged || turn.cancelInFlight ||
              (turn.cancelAttempts || 0) >= 3 || !window.fetch
          ) return;
          turn.cancelAttempts = (turn.cancelAttempts || 0) + 1;
          turn.cancelInFlight = true;
          try {
              fetch(MISC_API_BASE + "/gibush_ai_cancel", {
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                      "Authorization": "Bearer " + GIBUSH_API_TOKEN
                  },
                  body: JSON.stringify({ client_turn_id: turn.id }),
                  keepalive: true
              })
                  .then(function (response) {
                      if (!response.ok) throw new Error("cancel request failed");
                      turn.cancelAcknowledged = true;
                  })
                  .catch(function () {
                      turn.cancelInFlight = false;
                      if (!turn.cancelAcknowledged && turn.cancelAttempts < 3) {
                          window.setTimeout(function () {
                              requestBackendCancellation(turn);
                          }, 300 * turn.cancelAttempts);
                      }
                  })
                  .then(function () {
                      turn.cancelInFlight = false;
                  });
          } catch (e) {
              turn.cancelInFlight = false;
              if (turn.cancelAttempts < 3) {
                  window.setTimeout(function () {
                      requestBackendCancellation(turn);
                  }, 300 * turn.cancelAttempts);
              }
          }
      }
  
      function clearTurnDeadline(turn) {
          if (turn && turn.deadlineTimer) {
              window.clearTimeout(turn.deadlineTimer);
              turn.deadlineTimer = null;
          }
      }
  
      function expireActiveTurn(turn) {
          if (!turn || activeTurn !== turn || turn.cancelled) return;
          clearTurnDeadline(turn);
          turn.overallTimedOut = true;
          // Render while the context is still current, then make every late
          // stream/JSON callback stale before aborting the active transport.
          handleAskFailure(GIBUSH_AI_CHAT_TURN_DEADLINE_MESSAGE, turn.ctx);
          turn.cancelled = true;
          if (turn.controller) {
              try { turn.controller.abort(); } catch (e) { /* ignore */ }
          }
          requestBackendCancellation(turn);
          activeTurn = null;
          setComposerBusy(false);
          spinLine.style.display = "none";
          scrollMessagesToBottom();
          textarea.focus();
      }
  
      function cancelActiveTurn(silent) {
          var turn = activeTurn;
          if (!turn) return;
          clearTurnDeadline(turn);
          turn.cancelled = true;
          if (turn.controller) {
              try { turn.controller.abort(); } catch (e) { /* ignore */ }
          }
          requestBackendCancellation(turn);
          removeLiveAssistant(turn.ctx);
          activeTurn = null;
          setComposerBusy(false);
          spinLine.style.display = "none";
          if (!silent && turn.epoch === conversationEpoch) {
              var stopped = { role: "error", text: "הבקשה נעצרה." };
              var history = gibushAiChatLoadHistory();
              history.push(stopped);
              gibushAiChatSaveHistory(history);
              gibushAiChatRenderMessage(messages, stopped);
              scrollMessagesToBottom();
          }
          textarea.focus();
      }
  
      function handleAskSuccess(data, ctx) {
          if (!isCurrentTurnContext(ctx)) return;
          if (data && data.conversation_reset) {
              handleConversationReset(ctx);
          }
          var history = gibushAiChatLoadHistory();
          var isDiagnostic = !!ctx.diagnostic;
          var answer = data.answer || ctx.streamedAnswer || "";
          var responseId = data.response_id || null;
          var toolCallsMade = Array.isArray(data.tool_calls_made) ? data.tool_calls_made : [];
          var wasExpensive = !!(data.expensive || ctx.expensive || isDiagnostic);
          if (responseId) {
              try {
                  if (!isDiagnostic) {
                      localStorage.setItem(gibushAiChatFreeConversationStorageKey(), responseId);
                  }
              } catch (e) { /* ignore */ }
          }
          var assistantMessage = {
              role: "assistant",
              text: answer,
              toolCallsMade: toolCallsMade,
              expensive: wasExpensive,
              partial: !!data.partial,
              conversationReset: !!ctx.conversationReset
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
              gibushAiChatEnterDiagnosticMode(
                  ctx.teamNumber,
                  presetMeta || { id: ctx.presetId, label: ctx.presetId },
                  responseId
              );
              refreshDiagModeBar();
          }
          removeLiveAssistant(ctx);
          history.push(assistantMessage);
          gibushAiChatSaveHistory(history);
          gibushAiChatRenderMessage(messages, assistantMessage);
          scrollMessagesToBottom();
      }

      function handleAskFailure(errorText, ctx) {
          if (!isCurrentTurnContext(ctx)) return;
          removeLiveAssistant(ctx);
          var history = gibushAiChatLoadHistory();
          var text = errorText || "שגיאה לא ידועה";
          history.push({ role: "error", text: text });
          gibushAiChatSaveHistory(history);
          gibushAiChatRenderMessage(messages, { role: "error", text: text });
          scrollMessagesToBottom();
          if (ctx.diagnostic) {
              var existingMode = gibushAiChatLoadDiagnosticMode();
              var existingDiagId = existingMode && existingMode.response_id;
              if (!existingDiagId) {
                  gibushAiChatSaveDiagnosticMode(null);
                  refreshDiagModeBar();
              }
          }
      }
  
      function askErrorText(data, status) {
          var text = (data && data.error) || "שגיאה לא ידועה";
          if (status === 501) {
              text = "מנוע ה-AI טרם הופעל במלואו (הרישום/לולאת הכלים עוד לא מומשו). " + text;
          }
          if (data && data.correlation_id) {
              text += " (מזהה תקלה: " + String(data.correlation_id) + ")";
          }
          return text;
      }
  
      function isPendingAiTurn(data) {
          return !!(
              data &&
              data.code === "AI_TURN_PENDING" &&
              data.retryable !== false
          );
      }
  
      // One "data: {...}" block from the SSE stream. Comment frames (": ping",
      // the opening padding) carry no payload and parse to null.
      function parseSseBlock(block) {
          var lines = (block || "").split(/\r?\n/);
          var payloadLines = [];
          for (var i = 0; i < lines.length; i++) {
              var line = lines[i];
              if (!line || line.charAt(0) === ":") continue;
              if (line.indexOf("data:") !== 0) continue;
              var payload = line.substring(5).replace(/^\s+/, "");
              if (payload) payloadLines.push(payload);
          }
          if (!payloadLines.length) return null;
          try {
              return JSON.parse(payloadLines.join("\n"));
          } catch (e) {
              return null;
          }
      }
  
      /**
       * Ask over SSE, updating the spinner from status events.
       *
       * Resolves with { needsFallback: true } whenever the transport ends before
       * a terminal event. The fallback carries the same client_turn_id, so the
       * backend waits for/replays the existing job instead of running it twice;
       * this is also how a connection resumes after some answer deltas arrived.
       */
      function streamAsk(body, ctx) {
          return new Promise(function (resolve) {
              if (!window.fetch || typeof AbortController === "undefined" || typeof TextDecoder === "undefined") {
                  resolve({ needsFallback: true, retryable: false });
                  return;
              }
              if (!isCurrentTurnContext(ctx)) {
                  resolve();
                  return;
              }
  
              var controller = new AbortController();
              ctx.turn.controller = controller;
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
                      ctx.turn.streamTimedOut = true;
                      try { controller.abort(); } catch (e) { /* ignore */ }
                  }, GIBUSH_AI_CHAT_STREAM_IDLE_TIMEOUT_MS);
              }
  
              function settle(outcome) {
                  if (finished) return;
                  finished = true;
                  stopIdleTimer();
                  try { controller.abort(); } catch (e) { /* ignore */ }
                  if (ctx.turn.controller === controller) ctx.turn.controller = null;
                  resolve(outcome);
              }
  
              function handleEvent(event) {
                  if (!isCurrentTurnContext(ctx)) {
                      settle();
                      return;
                  }
                  if (event.type === "status") {
                      setSpinnerText(event.message);
                      return;
                  }
                  if (event.type === "answer_delta" || event.type === "response.output_text.delta") {
                      appendAnswerDelta(event, ctx);
                      return;
                  }
                  if (event.type === "answer_reset") {
                      removeLiveAssistant(ctx);
                      ctx.streamedAnswer = "";
                      return;
                  }
                  if (event.type === "conversation_reset") {
                      handleConversationReset(ctx);
                      return;
                  }
                  if (event.type === "done") {
                      handleAskSuccess(event, ctx);
                      settle();
                      return;
                  }
                  if (event.type === "error") {
                      if (isPendingAiTurn(event)) {
                          settle({ pending: true });
                          return;
                      }
                      handleAskFailure(askErrorText(event), ctx);
                      settle();
                  }
              }
  
              // Cover DNS/TLS/server stalls before headers as well as idle bodies.
              resetIdleTimer();
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
                                  if (isPendingAiTurn(data)) {
                                      settle({ pending: true });
                                      return;
                                  }
                                  handleAskFailure(askErrorText(data, res.status), ctx);
                                  settle();
                              });
                      }
                      if (!res.body || !res.body.getReader) {
                          // Retrying cannot add ReadableStream support to this
                          // browser, so proceed directly to the JSON transport.
                          settle({ needsFallback: true, retryable: false });
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
                                  settle({ needsFallback: true, retryable: true });
                                  return;
                              }
                              resetIdleTimer();
                              buffer += decoder.decode(chunk.value, { stream: true });
                              var blocks = buffer.split(/\r?\n\r?\n/);
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
                      if (!isCurrentTurnContext(ctx) || ctx.turn.cancelled) {
                          settle();
                          return;
                      }
                      settle({ needsFallback: true, retryable: true });
                  });
          });
      }
  
      /**
       * Re-attach once after consecutive nonterminal transport failures, and
       * continue SSE polling for explicit server-pending responses until the
       * overall deadline. Every attempt receives the same immutable request
       * body/client_turn_id, so Redis either waits for the original owner or
       * replays its terminal result. Capability failures move to JSON polling.
       */
      function streamAskWithRetry(body, ctx) {
          var attempt = 0;
          var consecutiveTransportFailures = 0;
  
          function reattachAfterPending() {
              setSpinnerText("הבקשה עדיין בעיבוד — מתחבר מחדש לאותה בקשה…");
              return new Promise(function (resolve) {
                  window.setTimeout(resolve, GIBUSH_AI_CHAT_PENDING_REATTACH_DELAY_MS);
              }).then(function () {
                  if (!isCurrentTurnContext(ctx)) return;
                  if (Date.now() >= ctx.turn.deadlineAt) {
                      expireActiveTurn(ctx.turn);
                      return;
                  }
                  return runAttempt();
              });
          }
  
          function runAttempt() {
              if (!isCurrentTurnContext(ctx)) return Promise.resolve();
              if (Date.now() >= ctx.turn.deadlineAt) {
                  expireActiveTurn(ctx.turn);
                  return Promise.resolve();
              }
              attempt += 1;
              ctx.streamAttempt = attempt;
              ctx.turn.streamTimedOut = false;
  
              return streamAsk(body, ctx).then(function (outcome) {
                  if (!isCurrentTurnContext(ctx)) return;
                  if (outcome && outcome.pending) {
                      consecutiveTransportFailures = 0;
                      ctx.transportFailureStreak = 0;
                      return reattachAfterPending();
                  }
                  if (
                      outcome &&
                      outcome.needsFallback &&
                      outcome.retryable !== false &&
                      isCurrentTurnContext(ctx)
                  ) {
                      consecutiveTransportFailures += 1;
                      if (consecutiveTransportFailures < GIBUSH_AI_CHAT_STREAM_MAX_ATTEMPTS) {
                          setSpinnerText("החיבור נקטע — מתחבר מחדש לאותה בקשה…");
                          return runAttempt();
                      }
                  }
                  return outcome;
              });
          }
  
          return runAttempt();
      }
  
      function jsonAsk(body, ctx) {
          if (!isCurrentTurnContext(ctx)) return Promise.resolve();
          setSpinnerText(ctx.expensive || ctx.diagnostic
              ? "בודק את הנתונים (מודל מורחב)…"
              : "בודק את הנתונים…");
          var controller = typeof AbortController === "undefined" ? null : new AbortController();
          var timeoutId = null;
          ctx.turn.jsonTimedOut = false;
          if (controller) ctx.turn.controller = controller;
          var requestOptions = {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": "Bearer " + GIBUSH_API_TOKEN
              },
              body: JSON.stringify(body)
          };
          if (controller) requestOptions.signal = controller.signal;
  
          var fetchPromise = fetch(MISC_API_BASE + "/gibush_ai_ask", requestOptions)
              .then(function (res) {
                  return res.json().then(function (data) {
                      return { ok: res.ok, status: res.status, data: data };
                  });
              });
          var timeoutPromise = new Promise(function (resolve, reject) {
              timeoutId = setTimeout(function () {
                  ctx.turn.jsonTimedOut = true;
                  if (controller) {
                      try { controller.abort(); } catch (e) { /* ignore */ }
                  }
                  reject(new Error(GIBUSH_AI_CHAT_JSON_TIMEOUT_MESSAGE));
              }, GIBUSH_AI_CHAT_JSON_TIMEOUT_MS);
          });
  
          return Promise.race([fetchPromise, timeoutPromise])
              .then(function (result) {
                  if (!isCurrentTurnContext(ctx)) return;
                  if (!result.ok) {
                      if (isPendingAiTurn(result.data)) {
                          return { pending: true };
                      }
                      handleAskFailure(askErrorText(result.data, result.status), ctx);
                      return { terminal: true };
                  }
                  handleAskSuccess(result.data, ctx);
                  return { terminal: true };
              })
              .catch(function (e) {
                  if (!isCurrentTurnContext(ctx) || ctx.turn.cancelled) return;
                  // The request may have reached the idempotent owner even when
                  // its response was lost. Re-attach instead of cancelling or
                  // presenting a healthy pending turn as a failure.
                  return { pending: true, transportFailure: true };
              })
              .finally(function () {
                  if (timeoutId) clearTimeout(timeoutId);
                  if (ctx.turn.controller === controller) ctx.turn.controller = null;
              });
      }
  
      function runTurnTransport(body, ctx) {
          if (!isCurrentTurnContext(ctx)) return Promise.resolve();
          if (Date.now() >= ctx.turn.deadlineAt) {
              expireActiveTurn(ctx.turn);
              return Promise.resolve();
          }
  
          var streamResult = ctx.streamUnavailable
              ? Promise.resolve({ needsFallback: true, retryable: false })
              : streamAskWithRetry(body, ctx);
  
          return streamResult.then(function (outcome) {
              if (!isCurrentTurnContext(ctx)) return;
              if (!outcome || !outcome.needsFallback) return outcome;
              if (outcome.retryable === false) ctx.streamUnavailable = true;
  
              ctx.jsonPollAttempts = (ctx.jsonPollAttempts || 0) + 1;
              setSpinnerText("מתחבר מחדש לאותה בקשה…");
              return jsonAsk(body, ctx).then(function (jsonOutcome) {
                  if (!isCurrentTurnContext(ctx)) return;
                  if (!jsonOutcome || !jsonOutcome.pending) return jsonOutcome;
  
                  setSpinnerText("הבקשה עדיין בעיבוד — בודק שוב…");
                  if (jsonOutcome.transportFailure) {
                      ctx.transportFailureStreak = (ctx.transportFailureStreak || 0) + 1;
                  } else {
                      ctx.transportFailureStreak = 0;
                  }
                  var reattachDelay = jsonOutcome.transportFailure
                      ? Math.min(
                          10000,
                          GIBUSH_AI_CHAT_PENDING_REATTACH_DELAY_MS * Math.pow(
                              2,
                              Math.min(ctx.transportFailureStreak, 4)
                          )
                      )
                      : GIBUSH_AI_CHAT_PENDING_REATTACH_DELAY_MS;
                  return new Promise(function (resolve) {
                      window.setTimeout(resolve, reattachDelay);
                  }).then(function () {
                      if (!isCurrentTurnContext(ctx)) return;
                      if (Date.now() >= ctx.turn.deadlineAt) {
                          expireActiveTurn(ctx.turn);
                          return;
                      }
                      // Prefer SSE again when supported. The body still carries
                      // the original client_turn_id, so this only re-attaches.
                      return runTurnTransport(body, ctx);
                  });
              });
          });
      }
  
      function postAsk(body, options) {
          options = options || {};
          var turn = {
              id: gibushAiChatNewTurnId(),
              epoch: conversationEpoch,
              deadlineAt: Date.now() + GIBUSH_AI_CHAT_TURN_DEADLINE_MS,
              deadlineTimer: null,
              overallTimedOut: false,
              controller: null,
              cancelled: false,
              cancelAttempts: 0,
              cancelInFlight: false,
              cancelAcknowledged: false,
              ctx: null
          };
          body.client_turn_id = turn.id;
          var ctx = {
              diagnostic: !!options.diagnostic,
              teamNumber: options.teamNumber || null,
              presetId: options.presetId || null,
              expensive: !!body.expensive,
              epoch: turn.epoch,
              turn: turn,
              streamedAnswer: "",
              liveAssistantEl: null,
              conversationReset: false,
              jsonPollAttempts: 0,
              transportFailureStreak: 0,
              streamUnavailable: false
          };
          turn.ctx = ctx;
          activeTurn = turn;
  
          setComposerBusy(true);
          setSpinnerText(ctx.expensive || ctx.diagnostic
              ? "בודק את הנתונים (מודל מורחב)…"
              : "בודק את הנתונים…");
          spinLine.style.display = "flex";
          turn.deadlineTimer = window.setTimeout(function () {
              expireActiveTurn(turn);
          }, GIBUSH_AI_CHAT_TURN_DEADLINE_MS);
  
          runTurnTransport(body, ctx)
              .catch(function (e) {
                  if (!isCurrentTurnContext(ctx) || turn.cancelled) return;
                  handleAskFailure((e && e.message) || String(e), ctx);
              })
              .finally(function () {
                  clearTurnDeadline(turn);
                  if (activeTurn !== turn) return;
                  activeTurn = null;
                  setComposerBusy(false);
                  spinLine.style.display = "none";
                  scrollMessagesToBottom();
                  textarea.focus();
              });
      }
  
      function sendMessage() {
          if (requestInFlight) return;
          var currentAccess = gibushAiChatResolveAccess();
          if (!currentAccess.allowed) return;
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
          textarea.value = "";
          autosizeTextarea();
          clearPendingAttachment();
          scrollMessagesToBottom();
  
          // Free text leaves diagnostic mode and resumes the separate free thread.
          var priorDiagMode = gibushAiChatLoadDiagnosticMode();
          var continuedFromDiagnostic = false;
          if (priorDiagMode) {
              continuedFromDiagnostic = !!exitDiagnosticMode(false);
          }
  
          var apiQuestion = question || visibleText;
          if (continuedFromDiagnostic && priorDiagMode) {
              if (currentAccess.mode === "live_team") {
                  apiQuestion =
                      "המשך משיחת אבחון קודמת (צוות " + priorDiagMode.team_number +
                      " · " + priorDiagMode.label +
                      "). המשתמש עבר לשיחה חופשית — הגישה נשארת לנתונים חיים של צוות " +
                      currentAccess.teamNumber +
                      " בלבד (ללא ארכיון וללא צוותים אחרים).\n\n" +
                      apiQuestion;
              } else {
                  apiQuestion =
                      "המשך משיחת אבחון קודמת (צוות " + priorDiagMode.team_number +
                      " · " + priorDiagMode.label +
                      "). המשתמש עבר לשיחה חופשית — ניתן להשתמש בארכיון ובכלים המלאים, " +
                      "ולענות על אותה שאלת אבחון בהקשר חדש אם מבקשים.\n\n" +
                      apiQuestion;
              }
          }
  
          var body = { question: apiQuestion };
          if (attachment && attachment.dataUrl) {
              body.image = attachment.dataUrl;
          }
          if (useExpensive) {
              body.expensive = true;
          }
          body.scope = gibushAiChatScopePayload();
          var previousResponseId = null;
          try {
              previousResponseId = localStorage.getItem(gibushAiChatFreeConversationStorageKey());
          } catch (e) { /* ignore */ }
          if (previousResponseId) {
              body.previous_response_id = previousResponseId;
          }
          postAsk(body, { diagnostic: false });
      }
  
      function sendDiagnostic(preset, teamNumber) {
          if (requestInFlight || !preset || !teamNumber) return;
          var currentAccess = gibushAiChatResolveAccess();
          if (!currentAccess.allowed || !gibushAiChatDiagnosticsEnabled()) return;
          if (currentAccess.mode === "live_team" && String(teamNumber) !== String(currentAccess.teamNumber)) {
              return;
          }
          // Read the old context before changing the banner. A response id is
          // valid only for the exact same team + preset; either boundary starts
          // a new diagnostic thread.
          var previousMode = gibushAiChatLoadDiagnosticMode();
          var continueDiagnostic = gibushAiChatDiagnosticContextMatches(
              previousMode,
              teamNumber,
              preset.id
          );
          var diagnosticResponseId = null;
          if (continueDiagnostic) {
              diagnosticResponseId = previousMode.response_id || null;
          }
  
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
          gibushAiChatEnterDiagnosticMode(teamNumber, preset, diagnosticResponseId);
          refreshDiagModeBar();
          scrollMessagesToBottom();
  
          var scope = gibushAiChatScopePayload();
          if (!scope) return;
          // full users still send the picker-chosen team; live_team already has it.
          if (currentAccess.mode === "full") {
              scope.team_number = String(teamNumber);
          }
  
          var body = {
              question: preset.user_prompt,
              diagnostic_preset: preset.id,
              team_number: String(teamNumber),
              scope: scope,
              expensive: true
          };
  
          if (diagnosticResponseId) {
              body.previous_response_id = diagnosticResponseId;
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
      refreshDiagModeBar();
      scrollMessagesToBottom();
  
      newConvoBtn.addEventListener("click", function () {
          conversationEpoch += 1;
          cancelActiveTurn(true);
          gibushAiChatNewConversation(messages);
          setExpensiveArmed(false);
          clearPendingAttachment();
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
      if (presetsBtn) {
          presetsBtn.addEventListener("click", function () {
              if (requestInFlight) return;
              openPresetPicker();
          });
      }
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
  
      if (presetPicker) {
          presetPicker.addEventListener("click", function (e) {
              if (e.target === presetPicker) {
                  closePresetPicker();
              }
          });
          presetPicker.querySelector("#gibush-ai-chat-preset-list").addEventListener("click", function (e) {
              var item = e.target.closest("button.gaic-preset-item");
              if (!item) return;
              var presetId = item.getAttribute("data-preset");
              var preset = null;
              for (var pi = 0; pi < GIBUSH_AI_CHAT_DIAGNOSTIC_PRESETS.length; pi++) {
                  if (GIBUSH_AI_CHAT_DIAGNOSTIC_PRESETS[pi].id === presetId) {
                      preset = GIBUSH_AI_CHAT_DIAGNOSTIC_PRESETS[pi];
                      break;
                  }
              }
              if (preset) openPresetConfirm(preset);
          });
          if (presetCloseBtn) {
              presetCloseBtn.addEventListener("click", closePresetPicker);
          }
          if (presetBackBtn) {
              presetBackBtn.addEventListener("click", function () {
                  pendingPresetConfirm = null;
                  showPresetStep("list");
              });
          }
          if (presetConfirmBtn) {
              presetConfirmBtn.addEventListener("click", confirmPendingPreset);
          }
      }
  
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
  
      sendBtn.addEventListener("click", function () {
          if (requestInFlight) {
              cancelActiveTurn(false);
              return;
          }
          sendMessage();
      });
      // Enter inserts a newline (phone-friendly); send is only via the button.
  
      textarea.focus();
  }
  
  function clearActivitiesUI(){
      $("#hichartsJS").remove();
      var assesseesInitialElement = document.querySelector("article div[ui-view]");
      const existing = assesseesInitialElement.nextSibling;
      if (existing) existing.remove();
  }
  
  // Auto-mount when the script loads outside TB.render; TB.render pages should
  // call ensureGibushAiChatWidget() themselves (idempotent if both run).
  if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ensureGibushAiChatWidget);
  } else {
      clearActivitiesUI();    
      ensureGibushAiChatWidget();
  }
  