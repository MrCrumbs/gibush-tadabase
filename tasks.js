var GIBUSH_API_TOKEN = "jfhf3fUVRKuAlHoRqkgcAcv0me3q31Ii0LFawlUa3bQ";

var selectedTaskId = null;
var tasksShellReady = false;

function guideSection(title, bodyHtml) {
    return '<div class="task-guide-section"><h3>' + title + '</h3>' + bodyHtml + '</div>';
}

function guideList(items) {
    return '<ul>' + items.map(function (item) { return '<li>' + item + '</li>'; }).join('') + '</ul>';
}

function buildGuideCard(title, intensity, badges, sections, note) {
    var intensityClass = intensity === '0' ? 'task-guide-badge--intensity-0' : 'task-guide-badge--intensity-1';
    var meta = badges.map(function (b) {
        return '<span class="task-guide-badge' + (b.kind ? ' ' + b.kind : '') + '">' + b.text + '</span>';
    }).join('');
    meta = '<span class="task-guide-badge ' + intensityClass + '">עצימות: ' + intensity + '</span>' + meta;
    var noteHtml = note ? '<div class="task-guide-note">' + note + '</div>' : '';
    return '<div class="task-guide-card"><h2>' + title + '</h2><div class="task-guide-meta">' + meta + '</div>' +
        sections.join('') + noteHtml + '</div>';
}

var TASKS = [
    // When you add a Tadabase table per task, set componentId (e.g. component_4)
    // and add: TB.render('component_4', function (data) { initTaskTable(data, 'component_4'); });
    {
        id: 'gaza',
        title: 'כניסה לעזה',
        iconClass: 'fas fa-compass',
        componentId: 'component_3',
        guideHtml: buildGuideCard(
            'משימת לימוד — כניסה לעזה',
            '0',
            [
                { text: '5 דק׳ תדריך · 15 דק׳ ביצוע · 5 דק׳ הצגה · 20 דק׳ סה״כ' },
                { text: 'מדדים: עבודת צוות, יכולות בין-אישיות' }
            ],
            [
                guideSection('הסבר למגבשים', '<p>התרגיל מחולק לשני שלבים. יש לחלק 2/3 מהמפות של מרחב "בארי" לצוות.</p>' +
                    guideList([
                        'שלב א׳ — שלב הלימוד: כל צוות מקבל דף מכוון; לצפות בדינמיקה הקבוצתית ואופן הלמידה.',
                        'שלב ב׳ — שולחן חול: לחלק לחוליות של 4–5 חיילים; כל קבוצה בונה שולחן חול המדמה את תא השטח.',
                        '15 דק׳ לבנייה; ניתן להחליף בין חוליות (7 דק׳). בסיום — נציג מציג; להעביר רשות דיבור בין חברי החולייה.',
                        'בסיום — לשאול על ציר הניווט.'
                    ])),
                guideSection('הנחיות לחיילים — שלב א׳ (לימוד)', guideList([
                    'בעוד יומיים הצוות נכנס לרצועת עזה; על כל חייל ללמוד את תא השטח מהמפות.',
                    'להתמקד ביישובים: כפר עזה, נחל עוז, סעד, עלומים, שובה, תושייה, כפר מימון, שוקדה, בארי.',
                    'ללמוד את הצירים בין בארי לגדר, ולבנות ציר ניווט מבארי לבולם (100 מ׳).',
                    'ניתן ללמוד בכל זמן חופשי; לשמור על המפות.'
                ])),
                guideSection('הנחיות לחיילים — שלב ב׳ (שולחן חול)', guideList([
                    'לחלק את הצוות לחוליות של 4 חיילים.',
                    'לבנות דגם של תא השטח שלמדתם; לשים דגש על מיקום היישובים לפי הסדר.'
                ]))
            ],
            'זכרו: משימת הלימוד היא תרגיל קבוצתי ללא מאמץ — המיקוד על עבודת צוות והתנהלות, לא על התוצאה. יש לתצפת בזמן בניית שולחן החול.'
        )
    },
    {
        id: 'walker',
        title: 'הולכת לוחם',
        iconClass: 'fas fa-shield-alt',
        componentId: null,
        guideHtml: buildGuideCard(
            'הולכת לוחם A',
            '1',
            [
                { text: '5 דק׳ הסבר · 5 דק׳ תכנון · 10 דק׳ ביצוע' },
                { text: 'ציוד: שק חול, מסגרת A, חבלים, קסדות (לעומד על A), כפפות' },
                { text: 'מדדים: עבודת צוות, חוסן מנטלי' }
            ],
            [
                guideSection('הסבר למגבשים', guideList([
                    'יש לקרוא את המשימה ולצפות בביצוע; ניתן לשנות במהלכה.',
                    'למקם 3 שקים: (א) מלא קצת, (ב) חצי מלא, (ג) מלא עד הסוף — יוצר דילמה בגישה למשימה.'
                ])),
                guideSection('דגשים ובטיחות', guideList([
                    'החייל על ה-A חייב קסדה וכפפות.',
                    'קצין הבטיחות עומד צמוד למסגרת ומאבטח במקרה של נפילה.'
                ])),
                guideSection('הנחיות למועמדים', guideList([
                    'ניתן לנוע במרחב רק באמצעות מסגרת A; רק החייל על A רשאי לאסוף שקי חול.',
                    'בכל פעם שק אחד בלבד — לרוקן בנקודת ההתחלה ולחזור.',
                    'המטרה: לבנות את ערמת החול הגבוהה ביותר.',
                    'להחליט מי מוביל, מי על A, ומי קצין הבטיחות (אם לא נקבע מראש).',
                    '5 דק׳ תכנון, 10 דק׳ ביצוע.',
                    'נפילת מסגרת או נגיעת החייל בקרקע — שיטוח הערמה.',
                    'אין להשתמש ב-A בצורה אופקית — עליה לעמוד.'
                ]))
            ]
        )
    },
    {
        id: 'lectures',
        title: 'הרצאות',
        iconClass: 'fas fa-graduation-cap',
        componentId: null,
        guideHtml: buildGuideCard(
            'הרצאות',
            '1',
            [
                { text: '5 דק׳ הסבר · 7 דק׳ לכל מועמד (בפרקי זמן שונים)' },
                { text: 'ציוד: דפים, עטים' },
                { text: 'מדדים: עמידה מול קהל, עבודה בתנאי לחץ' }
            ],
            [
                guideSection('הסבר למגבשים', '<p>התרגיל בוחן יכולת תכנון מול ביצוע — תכנון הרצאה לפרק זמן מוגדר והצגתה לצוות.</p>'),
                guideSection('הנחיות למועמדים', guideList([
                    'להרצות מול שאר חברי הצוות על נושא לבחירתכם (צבאי או אזרחי).',
                    'לכתוב את ההרצאה על דף שיחולק.',
                    '15 דק׳ לתכנון; לאחר מכן מתחילה המשימה.',
                    'בכל פעם מציג חייל אחד.',
                    'אסור לדבר ביניכם במהלך התרגיל.',
                    '7 דק׳ בלבד לכל הצגה — אין לחרוג מהזמן.'
                ]))
            ]
        )
    },
    {
        id: 'rescue',
        title: 'הצלת יישוב',
        iconClass: 'fas fa-ambulance',
        componentId: null,
        guideHtml: buildGuideCard(
            'דיון הצלת ישוב',
            '0',
            [
                { text: '5 דק׳ תדריך · 5 דק׳ אישי + 10 דק׳ קבוצתי · 10 דק׳ תחקיר' },
                { text: 'ציוד: דף מנחה עם פירוט כוחות, עטים' },
                { text: 'מדדים: עבודת צוות — התנהלות הדיון, לא התוצאה' }
            ],
            [
                guideSection('הסבר למגבשים', guideList([
                    'ליצור שיבוץ קרבי מהיר ל-13 אנשי צוות שיעלו על מסוק, להגנת שני יישובים.',
                    'חלק אישי (5 דק׳) וחלק קבוצתי (10 דק׳).',
                    'אין לקבל החלטות על סמך הצבעה — נדרשת הסכמה מלאה.'
                ])),
                guideSection('הנחיות למועמדים',
                    '<p>הוזנקתם לתכנן כוח משימה על גבי מסוק. אויב פרץ בשני מוקדים: מול נטועה (עייתא שעב) ומול זרעית (מרווחין).</p>' +
                    '<p><strong>מטרה:</strong> לשמור על תושבי נטועה וזרעית ולהשמיד אויב.</p>' +
                    '<p><strong>משימה:</strong> לבנות כוח של 13 אנשים שיעלה למסוק.</p>' +
                    '<p><strong>כוחות לרשות:</strong></p>' +
                    guideList([
                        '15 לוחמים מצוות כוננות (ניתן לפצל את הצוות)',
                        '2 קשרי אוגדה עם ציוד',
                        '2 קציני ארטילריה',
                        '4 רופאים',
                        '2 לוחמי הנדסה מיקום',
                        '2 לוחמי עוקץ עם 2 כלבים (כלב לא תופס מקום במסוק)'
                    ]) +
                    guideList([
                        'חלק 1 (5 דק׳): פתרון אישי — מי 13 העולים; ניתן להיעזר בדף העזר.',
                        'חלק 2 (10 דק׳): החלטה קבוצתית — הסכמה מלאה, בלי הצבעה; הרוב לא קובע.',
                        'חלק 3: תחקיר קצר על התרגיל.'
                    ]))
            ],
            'זכרו: המיקוד על התנהלות הדיון עצמו, לא על התוצאה הסופית!'
        )
    },
    {
        id: 'sandpipe',
        title: 'צינור חול',
        iconClass: 'fas fa-fill-drip',
        componentId: null,
        guideHtml: buildGuideCard(
            'משימת צינור חול',
            '0',
            [
                { text: '5 דק׳ תדריך · 3 דק׳ תכנון · 10 דק׳ ביצוע' },
                { text: 'ציוד: 4 דליים, 20 חבלים קצרים, 2 צינורות ארוכים + 2 קצרים, 2 בקבוקים, 2 מספריים, 2 שקי חול' },
                { text: 'מדדים: עבודת צוות — התנהלות הדיון והביצוע, לא התוצאה' }
            ],
            [
                guideSection('הסבר למגבשים', '<p>להעביר חול מדלי ראשון לשני בלי לגעת בדלי, בחול או בצינור. לוודא: 2 צינורות ארוכים, 2 קצרים, דלי עם חול + בקבוק + מספריים, 10 חבלים קצרים.</p>'),
                guideSection('הנחיות למועמדים', guideList([
                    'שני דליים בקצוות הצינור — אחד מלא, אחד ריק; להעביר חול דרך הצינור בלבד.',
                    'כללים: אסור לגעת בחול, בצינור, או להעביר ישירות בין דליים; חייבים להשתמש בכל 7 החוטים; אסור לקשור חוטים.',
                    'כלים בדלי: בקבוק ריק, מספריים, חבלים קצרים.',
                    '3 דק׳ תכנון, חלוקה ל-2 צוותים; 10 דק׳ ביצוע.',
                    'אחרי ~3 דק׳ — צינור נוסף (אסור לגעת בו; רק בחוטים).'
                ])),
                guideSection('התערבויות אפשריות', guideList([
                    'להוסיף שק פק״ל מלא חול בקצה הצינור',
                    'להוריד חוטים שמחזיקים את הצינור',
                    'לבצע עם יד אחת מאחורי הגב',
                    'לאחוז רק חוט אחד',
                    'חילופי מיקומים / שני מועמדים עושים סקוואטים'
                ]))
            ]
        )
    },
    {
        id: 'spiderweb',
        title: 'תרגיל רשת עכביש',
        iconClass: 'fas fa-spider',
        componentId: null,
        guideHtml: buildGuideCard(
            '"רשת עכביש" — תרגיל',
            '1',
            [
                { text: '5 דק׳ הסבר · 10 דק׳ תכנון · 15 דק׳ ביצוע · ~30 דק׳ סה״כ' },
                { text: 'מרחק: עד 250 מטר' },
                { text: 'ציוד: רשת עם ריבועים, שק חול' },
                { text: 'מדדים: עבודת צוות, חוסן מנטלי' }
            ],
            [
                guideSection('הסבר למגבשים', '<p>תרגיל ביצועי קבוצתי עם מאמץ פיזי מתון — שני שלבים: תכנון וביצוע. לתדרך על נפילות ונקיעת רגליים בדילוגים.</p>'),
                guideSection('הנחיות למועמדים', '<p>לעבור דרך הרשת כמה שיותר מהר מצד לצד.</p>' +
                    guideList([
                        'אסור לגעת ברשת.',
                        'בכל ריבוע — רק אדם אחד.',
                        'אין להיעזר באמצעים.',
                        'אין "קפיצות ראש".',
                        'אם נפגש איסור — "מוקפא" למשך דקה על המפר.',
                        '10 דק׳ תכנון ותרגול; 10 דק׳ ביצוע לפי הוראות המעריכים.'
                    ])),
                guideSection('התערבות אפשרית (אחרי 5 דק׳)', '<p>להוסיף שק חול שגם אותו צריך להעביר לצד השני.</p>')
            ]
        )
    }
];

// Guide text is sourced verbatim from `mobile-app-tasks.json`.
// We render it using `textContent` so the letters aren’t modified by HTML escaping/templating.
var TASK_GUIDE_ID_BY_TASK_ID = {
    gaza: 5,
    walker: 3,
    lectures: 4,
    rescue: 2,
    sandpipe: 1,
    spiderweb: 6
};

var TASK_GUIDES_BY_ID = {
    1: {
        id: 1,
        name: "משימת צינור חול",
        header: {
            unit: "מערך מדעי ההתנהגות - סיירת גולני",
            classification: "-סודי אישי-",
            date_hebrew: "י\"ד שבט תשפ\"ה",
            date_gregorian: "12 פברואר 2025"
        },
        metadata: {
            intensity: "0",
            duration: "תדריך: 5 דקות | תכנון: 3 דקות | ביצוע: 10 דקות",
            equipment: "4 דליים עם חול, 20 חבלים קצרים, 2 צינורות קצרים ו-2 צינורות ארוכים, 2 בקבוק פלסטיק ריק, 2 מספריים, 2 שקי חול מלאים",
            metrics: "עבודת צוות. זכרו! המיקוד הוא על התנהלות הדיון והתנהלות החיילים במהלך המשימה ולא על התוצאה הסופית."
        },
        sections: {
            assessor_instructions: "מטרת המשימה היא להעביר את החול מהדלי הראשון לדלי השני בלי לגעת בדלי, בחול או בצינור. יש לוודא שבמשימה ישנם שני צינורות ארוכים, 2 צינורות קצרים, דלי עם חול ובתוכו בקבוק ריק ומספריים ו-10 חבלים קצרים.",
            candidate_instructions: "לפניכם שני דליים, דלי אחד מלא בחול ודלי שני ריק, שני הדליים מוצבים בשתי קצוות הצינור. המטרה שלכם היא להעביר את החול מדלי אחד לדלי השני דרך הצינור בלבד.",
            rules: [
                "אסור לגעת בחול.",
                "אסור לגעת בצינור.",
                "אסור להעביר חול ישירות מדלי אחד לדלי השני.",
                "חייבים להשתמש בכל 7 החוטים.",
                "אסור לקשור את החוטים."
            ],
            available_tools: "בתוך דלי החול, יש בקבוק ריק, מספריים וחבלים קצרים בעזרתם ניתן לבצע את המשימה.",
            timing_flow: "כעת תתחלקו לשני צוותים, כל קבוצה מקבלת שלוש דקות של תכנון ראשוני על מנת לבצע את המשימה.\nלאחר 3 דקות - לרשותכם 10 דקות לבצע את המשימה.\n3 דקות לאחר תחילת המשימה (רצוי לאחר שהצליחו להעביר חול) - כעת תקבלו צינור נוסף לביצוע המשימה. גם בצינור זה אסור לכם לגעת, יש להשתמש בחוטים שלרשותכם.",
            interventions: [
                "להוסיף שק פק\"ל מלא חול בקצה של הצינור",
                "להוריד חוטים שמחזיקים את הצינור",
                "על המועמד/ים לבצע את התרגיל עם יד אחת מאחורי הגב",
                "על המועמד/ים לאחוז חוט אחד ולא שניים",
                "בכל זמן נתון שני מועמדים מבצעים סקוואטים/חילופי מיקומי מועמדים תו\"כ המשימה"
            ]
        }
    },
    2: {
        id: 2,
        name: "דיון הצלת ישוב",
        header: {
            unit: "מערך מדעי ההתנהגות - סיירת גולני",
            classification: "-סודי אישי-",
            date_hebrew: "י\"ד שבט תשפ\"ה",
            date_gregorian: "12 פברואר 2025"
        },
        metadata: {
            intensity: "0",
            duration: "תדריך: 5 דקות | ביצוע: 5 דק' אישי ו-10 דק' קבוצתית | תחקיר: 10 דקות",
            equipment: "דף מנחה עם פירוט הכוחות, עטים.",
            metrics: "עבודת צוות. זכרו! המיקוד הוא על התנהלות הדיון עצמו ולא על התוצאה הסופית."
        },
        sections: {
            assessor_instructions: "1. על הצוות לייצר שיבוץ קרבי מהיר ל-13 אנשי צוות שיכולים לעלות על מסוק, על מנת לעמוד במשימה של הגנת שני הישובים.\n2. המשימה מתחלקת לשני חלקים - חלק אישי וחלק קבוצתי.\n3. בחלק האישי הם יקבלו דף עזר ולרשותם 5 דק' לתכנן את כח המשימה שיעלה למסוק.\n4. בחלק הקבוצתי לרשותם 10 דק' לקבל החלטה קבוצתית מי יעלה למסוק. אין לקבל החלטות על סמך הצבעה.",
            candidate_instructions: "הנכם לוחמים בסיירת גולני, במסגרת פעילות הגנת יישובי גבול הצפון הוזנקתם לתכנן כוח משימה אשר יגיע על גבי מסוק לישובים. כוח של אויב פרץ את הגבול ונכנס בשני מוקדים- מול נטועה מאזור עייתא שעב ומול זרעית מאזור מרווחין בגליל העליון.",
            objective: "לשמור על תושבי נטועה וזרעית ולהשמיד אויב.",
            mission: "לבנות כח משימה שיעלה למסוק, המונה מקום לסד\"כ של 13 אנשים.",
            available_forces: [
                "צוות כוננות של סיירת גולני שמונה 15 לוחמים (אפשר לפצל את הצוות).",
                "שני קשרי אוגדה עם ציוד.",
                "שני קציני ארטילריה.",
                "ארבעה רופאים.",
                "שני לוחמי הנדסה מיקום.",
                "שני לוחמי עוקץ עם שני כלבים (כלב לא תופס מקום ישיבה במסוק)."
            ],
            candidate_mission_goal: "להחליט מי הם 13 אנשים הצוות שאתם מעלים על המסוק. המשימה היא אישית.\n1. לרשותכם 5 דקות לפתרון אישי של התרגיל, לצורך כך תוכלו להיעזר בדף עזר שקבלתם.\n2. לאחר 5 דקות – כעת לרשותכם 10 דקות על מנת לקבוע באופן קבוצתי מי עולה למסוק. המטרה שהבחירה האישית שלכם תהיה כמה שיותר תואמת לבחירה הקבוצתית. תצטרכו להגיע להסכמה מלאה של כל הקבוצה – אין לבצע הצבעה. זכרו שהרוב לא קובע.\n3. לאחר 10 דקות – הסתיים התרגיל. כעת נערוך תחקיר קצר על התרגיל עצמו."
        }
    },
    3: {
        id: 3,
        name: "הולכת לוחם A",
        header: {
            unit: "מערך מדעי ההתנהגות - סיירת גולני",
            classification: "-סודי אישי-",
            date_hebrew: "י\"ד שבט תשפ\"ה",
            date_gregorian: "12 פברואר 2025"
        },
        metadata: {
            intensity: "1",
            duration: "5 דקות - הסבר | 5 דקות - תכנון | 10 דקות - ביצוע",
            equipment: "שקי חול, מסגרת A, חבלים, קסדות (רק למי שעל ה-A), כפפות",
            metrics: "עבודת צוות וחוסן מנטאלי"
        },
        sections: {
            assessor_instructions: "עליכם להקריא למועמדים את המשימה ולצפות בהם במהלך הביצוע. יש לכם אפשרות למנות את מוביל המשימה ולשנותו במהלכה בהתאם לצורך.\nיש למקם את השקים ב-3 קווים, הצבת השקים במיקומים שונים מייצר לצוות דילמה כיצד לגשת למשימה:\nא. שק ראשון מלא קצת\nב. שק שני חצי מלא\nג. שק שלישי מלא עד הסוף",
            safety_dgeshim: "- החייל שעל ה-A נדרש לחבוש קסדה וכפפות על הידיים.\n- על קצין הבטיחות של הצוות לעמוד צמוד למסגרת ה-A ולאבטח את החייל במידה ונופל.",
            candidate_instructions: "לפניכם מרחב שבו מונחים שקי חול בעלי משקל שונה. במרחב ניתן לנוע באמצעות מסגרת A בלבד, שעליה חייל. רק לחייל שעל המסגרת מותר לאסוף את שקי החול.\n1. לחייל על ה-A מותר לאסוף בכל פעם רק שק אחד, לרוקן בנקודת ההתחלה ולחזור לאסוף שק נוסף.\n2. המטרה - לבנות את ערמת החול הגבוהה ביותר במסגרת הזמנים.\n3. עליכם להחליט מי מוביל את המשימה, מיהו החייל על ה-A ומיהו קצין הבטיחות של הצוות (אם לא נקבע כבר לפני על ידי המגבשים).\n4. לרשותכם 5 דקות לתכנון המשימה. יש לכם 10 דקות לצורך הביצוע.\n5. כל נפילה של המסגרת או נגיעה בקרקע על חייל שעל ה-A - תגרום לשיטוח ערמת החול.\n6. אין להשתמש ב-A בצורה אופקית - עליה לעמוד!"
        }
    },
    4: {
        id: 4,
        name: "הרצאות",
        header: {
            unit: "מערך מדעי ההתנהגות - סיירת גולני",
            classification: "-סודי אישי-",
            date_hebrew: "י\"ד שבט תשפ\"ה",
            date_gregorian: "12 פברואר 2025"
        },
        metadata: {
            intensity: "1",
            duration: "5 דקות - הסבר | 7 דקות עבור כל מועמד (יכול להתרחש בפרקי זמן שונים בלו\"ז)",
            equipment: "דפים, עטים",
            metrics: "עמידה בתנאי לחץ, עמידה מול קהל"
        },
        sections: {
            assessor_instructions: "התרגיל בוחן את יכולת התכנון של המועמדים מול הביצוע, באמצעות תכנון הרצאה לפרק זמן מוגדר והצגתה לצוות.",
            candidate_instructions: "עליכם להרצות מול שאר חברי הצוות על נושא שברצונכם להציג.\nעליכם לכתוב את ההרצאה על דף שיחולק לכם.\nלרשותכם 15 דקות לתכנון ההרצאה ולאחר מכן מתחילה המשימה.\nבכל פעם יציג חייל אחד לחברי הצוות.\nאסור לדבר ביניכם במהלך התרגיל.\nלכל הצגה מוקצב זמן של 7 דקות בלבד.\nלא ניתן לחרוג מהזמן המוקצב לכל חייל.\nהנושא יכול להיות קשור לצבא או לכל נושא אזרחי אחר."
        }
    },
    5: {
        id: 5,
        name: "משימת לימוד - כניסה לעזה",
        header: {
            unit: "מערך מדעי ההתנהגות - סיירת גולני",
            classification: "-סודי אישי-",
            date_hebrew: "י\"ד שבט תשפ\"ה",
            date_gregorian: "12 פברואר 2025"
        },
        metadata: {
            intensity: "0",
            duration: "תדריך - 5 דקות | ביצוע - 15 דקות | הצגת הדיון - 5 דקות | סה\"כ: 20 דקות",
            metrics: "משימת הלימוד הינה תרגיל קבוצתי ללא מאמץ המהווה סימולציה לתפקוד החיילים בעבודת צוות ויכולות בין אישיות. תכלית התרגיל היא לבדוק עבודת צוות. זכרו! ההתמצאות במרחב, יכולת הלמידה והיצירתיות חשובות אך לא במוקד התרגיל. יש לתצפת בזמן בניית השוו\"ח (התוצאה פחות חשובה)."
        },
        sections: {
            assessor_instructions: "עליכם לחלק לצוות 2/3 מפות של מרחב \"בארי\". התרגיל מחולק לשני שלבים:\n1. שלב א' - שלב הלימוד: איך הצוות לומד למשימה כאשר ברשותו רק 2/3 מפות בחינת הדינמיקה הקבוצתית והאופן בו אנשים מתנהלים במשימה שלא דורשת יכולת פיזית. כל צוות יקבל דף מכוון לשלב הלימוד.\n2. שלב ב' - שלב הביצוע שולחן חול:\nא. 5 דקות לפני תחילת המשימה יש לחלק את הקבוצה לחוליות של 5/4 חיילים.\nב. על כל קבוצה לבנות שולחן חול המדמה את תא השטח שלמדו.\nג. 15 דקות זמן בנייה (לאחר 7 דקות ניתן להחליף בין החוליות לראות כיצד מתמודדים).\nד. בסיום הזמן המגבשים עוברים בין הקבוצות וכל קבוצה בוחרת נציג שמציג.\nה. יש להעביר את רשות הדיבור בין חברי החולייה ואף לשאול אותם אישית האם יש להם משהו להוסיף - בעצם השיח אנו מתרשמים מהיכולת האישית של המתמודד.\nו. בסיום הצגת שולחן חול יש לשאול את החיילים על ציר הניווט.",
            candidate_instructions_phase_a: "אתם צוות בסיירת גולני. בעוד יומיים הצוות שלכם עתיד להיכנס לרצועת עזה יחד עם היחידה. על כל חייל ללמוד את תא השטח המוגדר באמצעות המפות המצורפות.\nעליכם להתמקד על מיקומי היישובים (בארי, שוקדה, כפר מיימון, תושייה, שובה, עלומים, סעד, כפר עזה ונחל עוז) וללמוד היטב את הצירים שנמצאים בין הישוב בארי לגדר.\nבנוסף עליכם לבנות ציר ניווט המוליך מבארי לבולם 100.\nעליכם לשמור על המפות! ביכולתכם ללמוד בכל זמן חופשי שיש לכם (זמן שתיה, אוכל...).",
            candidate_instructions_phase_b: "יש לחלק את הצוות לחוליות של 4 חיילים.\nכעת נחלק אתכם לחוליות של 4 חיילים. עליכם לבנות דגם של תא השטח שלמדתם. יש לשים דגש על מיקום היישובים על פי הסדר שלהם."
        }
    },
    6: {
        id: 6,
        name: "תרגיל \"רשת עכביש\"",
        header: {
            unit: "מערך מדעי ההתנהגות - סיירת גולני",
            classification: "-סודי אישי-",
            date_hebrew: "י\"ד שבט תשפ\"ה",
            date_gregorian: "12 פברואר 2025"
        },
        metadata: {
            intensity: "1",
            duration: "עד 250 מטרים, סה\"כ 30 דקות. 5 דקות - הסבר. | 10 דקות - תכנון. | 15 דקות - ביצוע.",
            equipment: "רשת עם ריבועים, שק חול",
            metrics: "עבודת צוות וחוסן מנטאלי"
        },
        sections: {
            assessor_instructions: "לתרגיל שני שלבים - תכנון וביצוע. רשת עכביש הינו תרגיל ביצועי קבוצתי הכולל מאמץ פיזי מתון ומהווה סימולציה לתפקוד המועמדים.",
            safety_dgeshim: "- לתדרך את החיילים על נפילות ונקיעת רגליים בעת הדילוגים.",
            candidate_instructions: "לפניכם רשת עם ריבועים. על הקבוצה לעבור דרך הרשת כמה שיותר מהר מצד אחד של הרשת לצד השני.",
            rules: [
                "אסור לאף אחד לגעת ברשת.",
                "בכל ריבוע מותר רק לאדם אחד לעבור.",
                "אין להיעזר באמצעים כלשהם.",
                "אין לבצע \"קפיצות ראש\".",
                "אם אחד האיסורים מופר, על המפר להיות \"מוקפא\" למשך דקה."
            ],
            timing_flow: "לרשותכם 10 דקות לתכנון ותרגול. בתום 10 דקות יחל הצוות בביצוע המשימה לפי הוראות המעריכים.",
            interventions: [
                "לאחר 5 דקות, התערבות שניתן לבצע על מנת לקבל מידע הערכתי נוסף: - להוסיף למשימה שק חול שגם אותו הם צריכים להעביר לצד השני."
            ]
        }
    }
};

function renderGuideContent(guide) {
    var guideContent = document.getElementById('task-guide-content');
    if (!guideContent || !guide) return;

    guideContent.innerHTML = '';

    var card = document.createElement('div');
    card.className = 'task-guide-card';

    var titleEl = document.createElement('h2');
    titleEl.textContent = guide.name;
    card.appendChild(titleEl);

    function addTextBlock(text) {
        if (text === undefined || text === null) return;
        var div = document.createElement('div');
        div.className = 'task-guide-text-block';
        div.textContent = text;
        card.appendChild(div);
    }

    function addSection(title, bodyText) {
        if (bodyText === undefined || bodyText === null) return;
        var h3 = document.createElement('h3');
        h3.className = 'task-guide-section-title';
        h3.textContent = title;
        card.appendChild(h3);

        addTextBlock(bodyText);
    }

    function addSectionList(title, arr) {
        if (!Array.isArray(arr)) return;
        var filtered = arr.filter(function (x) { return x !== undefined && x !== null && String(x).length > 0; });
        if (filtered.length === 0) return;

        var h3 = document.createElement('h3');
        h3.className = 'task-guide-section-title';
        h3.textContent = title;
        card.appendChild(h3);

        var ul = document.createElement('ul');
        ul.className = 'task-guide-bullets';
        filtered.forEach(function (item) {
            var li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
        });
        card.appendChild(ul);
    }

    function addInfoLine(label, value) {
        if (value === undefined || value === null) return;
        var row = document.createElement('div');
        row.className = 'task-guide-info-row';
        var labelEl = document.createElement('span');
        labelEl.className = 'task-guide-info-label';
        labelEl.textContent = label;
        var valueEl = document.createElement('span');
        valueEl.className = 'task-guide-info-value';
        valueEl.textContent = value;
        row.appendChild(labelEl);
        row.appendChild(valueEl);
        card.appendChild(row);
    }

    // Info (like the PDF header area)
    addInfoLine('עצימות: ', guide.metadata.intensity);
    addInfoLine('משך התרגיל: ', guide.metadata.duration);
    addInfoLine('ציוד: ', guide.metadata.equipment);
    addInfoLine('מדדים נבדקים: ', guide.metadata.metrics);

    // Sections with nice headers from JSON keys
    // (We keep exact text in `textContent` to avoid changing letters.)
    if (guide.id === 1) {
        addSection('הסבר והנחיות למגבשים:', guide.sections.assessor_instructions);
        addSection('הנחיות למועמדים:', guide.sections.candidate_instructions);
        addSectionList('כללים:', guide.sections.rules);
        addSection('כלים זמינים לטובת המשימה:', guide.sections.available_tools);
        addSection('תהליך התרגיל:', guide.sections.timing_flow);
        addSectionList('התערבויות אפשריות:', guide.sections.interventions);
    } else if (guide.id === 2) {
        addSection('הסבר והנחיות למגבשים:', guide.sections.assessor_instructions);
        addSection('הנחיות למועמדים:', guide.sections.candidate_instructions);
        addSection('המטרה:', guide.sections.objective);
        addSection('המשימה:', guide.sections.mission);
        addSectionList('הכוחות לרשות:', guide.sections.available_forces);
        addSection('מטרת המשימה:', guide.sections.candidate_mission_goal);
    } else if (guide.id === 3) {
        addSection('הסבר והנחיות למגבשים:', guide.sections.assessor_instructions);
        addSection('דגשים ובטיחות:', guide.sections.safety_dgeshim);
        addSection('הנחיות למועמדים:', guide.sections.candidate_instructions);
    } else if (guide.id === 4) {
        addSection('הסבר והנחיות למגבשים:', guide.sections.assessor_instructions);
        addSection('הנחיות למועמדים:', guide.sections.candidate_instructions);
    } else if (guide.id === 5) {
        addSection('הסבר והנחיות למגבשים:', guide.sections.assessor_instructions);
        addSection('הסבר והנחיות לחיילים - שלב א׳ - שלב הלימוד:', guide.sections.candidate_instructions_phase_a);
        addSection('הסבר והנחיות לחיילים - שלב ב׳ - שלב הביצוע:', guide.sections.candidate_instructions_phase_b);
    } else if (guide.id === 6) {
        addSection('הסבר והנחיות למגבשים:', guide.sections.assessor_instructions);
        addSection('דגשים ובטיחות:', guide.sections.safety_dgeshim);
        addSection('הנחיות למועמדים:', guide.sections.candidate_instructions);
        addSectionList('כללים:', guide.sections.rules);
        addSection('תהליך התרגיל:', guide.sections.timing_flow);
        addSectionList('התערבות אפשרית:', guide.sections.interventions);
    }

    guideContent.appendChild(card);
}

function ensureTasksShell() {
    if (tasksShellReady) return;
    var anchor = document.querySelector('article div[ui-view]');
    if (!anchor) return;
    tasksShellReady = true;

    var existing = anchor.nextSibling;
    if (existing && existing.id === 'tasks-menu') {
        return;
    }

    var menu = document.createElement('div');
    menu.id = 'tasks-menu';
    TASKS.forEach(function (task) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'task-menu-button';
        btn.dataset.taskId = task.id;

        var emoji = '✅';
        var taskName = task.title || '';
        if (taskName.includes('רשת עכביש')) {
            emoji = '🕸️';
        }
        else if (taskName.includes('צינור חול')) {
            emoji = '🪣';
        }
        else if (taskName.includes('הצלת יישוב')) {
            emoji = '🚑';
        }
        else if (taskName.includes('הרצאות')) {
            emoji = '🎓';
        }
        else if (taskName.includes('הולכת לוחם')) {
            emoji = '🪖';
        }
        else if (taskName.includes('כניסה לעזה')) {
            emoji = '🧭';
        }

        btn.innerHTML = '<span class="task-emoji">' + emoji + '</span>' +
            '<span class="task-menu-title">' + task.title + '</span>';
        btn.addEventListener('click', function () {
            selectTask(task.id);
        });
        menu.appendChild(btn);
    });
    anchor.parentNode.insertBefore(menu, anchor.nextSibling);

    var guidePanel = document.createElement('div');
    guidePanel.id = 'task-guide-panel';
    guidePanel.className = 'task-guide-panel hidden';

    // Keep back button + content stable (we fill only #task-guide-content).
    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.id = 'task-guide-back-btn';
    backBtn.className = 'task-guide-back-btn hidden';
    backBtn.textContent = 'חזרה לתפריט';
    backBtn.addEventListener('click', backToMenu);
    guidePanel.appendChild(backBtn);

    var guideContent = document.createElement('div');
    guideContent.id = 'task-guide-content';
    guidePanel.appendChild(guideContent);

    menu.parentNode.insertBefore(guidePanel, menu.nextSibling);
}

function getTableContainer() {
    var tableActions = document.querySelector('.table-actions.no-print');
    if (!tableActions) return null;
    return tableActions.closest('.tb-component') ||
        tableActions.closest('[class*="component"]') ||
        tableActions.parentElement;
}

function moveGuideAboveTable() {
    var guidePanel = document.getElementById('task-guide-panel');
    if (!guidePanel) return;

    var tableContainer = getTableContainer();
    if (!tableContainer || !tableContainer.parentNode) return;

    // Move guide panel right above the table container.
    if (guidePanel.nextSibling !== tableContainer) {
        tableContainer.parentNode.insertBefore(guidePanel, tableContainer);
    }
}

function markTableContainer(taskId) {
    var container = getTableContainer();
    if (!container || container.dataset.taskTableBound) return container;
    container.classList.add('task-table-panel', 'hidden');
    container.dataset.taskId = taskId;
    container.dataset.taskTableBound = '1';
    return container;
}

function selectTask(taskId) {
    selectedTaskId = taskId;
    var task = TASKS.find(function (t) { return t.id === taskId; });
    if (!task) return;

    document.querySelectorAll('.task-menu-button').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.taskId === taskId);
    });

    var guidePanel = document.getElementById('task-guide-panel');
    if (guidePanel) {
        guidePanel.classList.remove('hidden');
        var guide = TASK_GUIDES_BY_ID[TASK_GUIDE_ID_BY_TASK_ID[taskId]];
        renderGuideContent(guide);

        var backBtn = document.getElementById('task-guide-back-btn');
        if (backBtn) backBtn.classList.remove('hidden');
    }

    // Hide menu to avoid crowding.
    var menu = document.getElementById('tasks-menu');
    if (menu) menu.style.display = 'none';

    document.querySelectorAll('.task-table-panel').forEach(function (panel) {
        panel.classList.toggle('hidden', panel.dataset.taskId !== taskId);
    });

    var panels = document.querySelectorAll('.task-table-panel');
    if (panels.length === 1) {
        panels[0].classList.remove('hidden');
    }

    setTimeout(function () {
        addCommentsColumn();
        trun();
        refreshRecordsLabel();
        moveGuideAboveTable();
    }, 150);
}

function backToMenu() {
    selectedTaskId = null;

    document.querySelectorAll('.task-menu-button').forEach(function (btn) {
        btn.classList.remove('active');
    });

    var guidePanel = document.getElementById('task-guide-panel');
    if (guidePanel) guidePanel.classList.add('hidden');
    var guideContent = document.getElementById('task-guide-content');
    if (guideContent) guideContent.innerHTML = '';

    var backBtn = document.getElementById('task-guide-back-btn');
    if (backBtn) backBtn.classList.add('hidden');

    document.querySelectorAll('.task-table-panel').forEach(function (panel) {
        panel.classList.add('hidden');
    });

    var menu = document.getElementById('tasks-menu');
    if (menu) menu.style.display = '';
}

function refreshRecordsLabel() {
    var label = document.querySelector('.records-count-label');
    if (!label) return;
    var rows = document.querySelectorAll('tbody tr');
    if (rows.length) {
        label.textContent = rows.length + ' מוערכים';
    }
}

function initTaskTable(data, componentId) {
    var task = TASKS.find(function (t) { return t.componentId === componentId; });
    if (!task) {
        task = TASKS[0];
    }
    var tableContainer = markTableContainer(task.id);

    setTimeout(function () {
        ensureTasksShell();
        $('.pull-left, .form-inline').addClass('pull-right').removeClass('pull-left').css('direction', 'rtl');
        $('.filter-tabs li:last a').text('נקה סינון');
        $('.t-filter-button-text').text(' הוסף מסננים');
        $('.input-group input').attr('placeholder', 'חיפוש');
        $('.t-export-button').text('ייצוא');

        var tableActions = document.querySelector('.table-actions.no-print');
        if (tableActions) {
            var recordsLabel = tableActions.querySelector('.records-count-label');
            if (!recordsLabel) {
                recordsLabel = document.createElement('span');
                recordsLabel.className = 'badge badge-secondary records-count-label';
                recordsLabel.style.cssText = 'direction: rtl; vertical-align: middle; font-size: 13px; padding: 5px 10px; float: left; margin-top: 5px;';
                tableActions.insertBefore(recordsLabel, tableActions.firstChild);
            }
            if (data && data.records) {
                recordsLabel.textContent = data.records.length + ' מוערכים';
            }
        }

        if (selectedTaskId) {
            selectTask(selectedTaskId);
        } else {
            // Default view: keep guide above the table (menu shown).
            moveGuideAboveTable();
        }
    }, 0);
}

TB.render('component_3', function (data) {
    initTaskTable(data, 'component_3');
});

// Function to click the "Align right" button and set RTL direction
function handleModalOpen() {
    var alignRightButton = document.querySelector('[aria-label="Align right"]');
    if (alignRightButton) {
        alignRightButton.click();
    }

    var checkForTinyMCE = setInterval(function () {
        var iframe = document.querySelector('.mce-edit-area iframe');
        if (iframe && iframe.contentDocument) {
            var textBox = iframe.contentDocument.getElementById('tinymce');
            if (textBox) {
                textBox.style.direction = 'rtl';
                clearInterval(checkForTinyMCE);
            }
        }
    }, 50);

    setTimeout(function () {
        clearInterval(checkForTinyMCE);
    }, 3000);
}

var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) {
                if (node.classList && node.classList.contains('popover')) {
                    setTimeout(handleModalOpen, 100);
                } else if (node.querySelector && node.querySelector('.popover')) {
                    setTimeout(handleModalOpen, 100);
                }
            }
        });
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

if (document.querySelector('.popover')) {
    setTimeout(handleModalOpen, 100);
}

var assesseeMapping = new Map();

if (!window.xhrInterceptorInstalled) {
    window.xhrInterceptorInstalled = true;

    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function () {
        this.addEventListener('load', function () {
            try {
                if (this.responseText && this.responseText.trim().startsWith('{')) {
                    var response = JSON.parse(this.responseText);
                    if (response.items && Array.isArray(response.items)) {
                        assesseeMapping.clear();
                        response.items.forEach(function (item) {
                            if (item.field_61 && item.id) {
                                assesseeMapping.set(item.field_61.toString(), item.id);
                            }
                        });
                    }
                }
            } catch (e) {
                // ignore non-JSON
            }
        });
        originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
        originalSend.apply(this, arguments);
    };
}

function getAssesseeNumberFromRow(row) {
    var firstCell = row.querySelector('td:first-child');
    if (firstCell) {
        var text = firstCell.textContent.trim();
        if (/^\d+$/.test(text)) {
            return parseInt(text, 10);
        }
    }
    return null;
}

async function updateAssesseeRecord(assesseeId, assesseeNumber, value) {
    try {
        var assessor_name = '{loggedInUser.Name}';
        var payload = {
            assessee_id: assesseeId,
            comment: assessor_name + ': ' + value
        };

        var response = await fetch('https://misc-ten.vercel.app/update_assessor_comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + GIBUSH_API_TOKEN
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            var refreshButton = document.querySelector('.t-refresh-button');
            if (refreshButton) {
                refreshButton.click();
            }
        } else {
            var errorData = await response.json();
            console.error('Failed to update record for assessee ' + assesseeNumber + ':', response.status, errorData.error);
        }
    } catch (error) {
        console.error('Error updating record for assessee ' + assesseeNumber + ':', error);
    }
}

function addCommentsColumn() {
    var table = document.querySelector('.task-table-panel:not(.hidden) table') || document.querySelector('table');
    if (!table) return;

    var thead = table.querySelector('thead');
    if (thead) {
        var headerRow = thead.querySelector('tr');
        if (headerRow) {
            var existingHeader = headerRow.querySelector('.comments-column-header');
            if (!existingHeader) {
                var newHeaderCell = document.createElement('th');
                newHeaderCell.textContent = 'הערות';
                newHeaderCell.className = 'comments-column-header';
                var commentsHeader = headerRow.children[1];
                if (commentsHeader) {
                    headerRow.insertBefore(newHeaderCell, commentsHeader);
                } else {
                    headerRow.appendChild(newHeaderCell);
                }
            }
        }
    }

    var tbody = table.querySelector('tbody');
    if (tbody) {
        var rows = tbody.querySelectorAll('tr');
        rows.forEach(function (row) {
            if (row.querySelector('.comments-column-cell')) {
                return;
            }

            var newDataCell = document.createElement('td');
            newDataCell.className = 'comments-column-cell';

            var recordButton = document.createElement('button');
            recordButton.className = 'record-button';
            recordButton.type = 'button';
            var icon = document.createElement('i');
            icon.className = 'fas fa-microphone';
            recordButton.appendChild(icon);

            recordButton.addEventListener('click', async function () {
                if (currentMediaRecorder && currentMediaRecorder.state === 'recording') {
                    stopRecording();
                    return;
                }

                var assesseeNumber = getAssesseeNumberFromRow(row);
                if (!assesseeNumber) return;

                var assesseeId = assesseeMapping.get(assesseeNumber.toString());
                if (!assesseeId) return;

                var audioBlob = await startRecording(recordButton);
                if (audioBlob && audioBlob.size > 0) {
                    recordButton.classList.add('processing');
                    recordButton.innerHTML = '<i class="fas fa-spinner"></i>';
                    try {
                        var transcription = await transcribeRecording(audioBlob);
                        if (transcription) {
                            await updateAssesseeRecord(assesseeId, assesseeNumber, transcription);
                        }
                    } finally {
                        recordButton.classList.remove('processing');
                        recordButton.innerHTML = '<i class="fas fa-microphone"></i>';
                    }
                }
            });

            newDataCell.appendChild(recordButton);
            var commentsCell = row.children[1];
            if (commentsCell) {
                row.insertBefore(newDataCell, commentsCell);
            } else {
                row.appendChild(newDataCell);
            }
        });
    }
}

var currentMediaRecorder = null;
var currentStream = null;
var currentButton = null;

async function startRecording(button) {
    try {
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        var mediaRecorder = new MediaRecorder(stream);
        var audioChunks = [];

        currentMediaRecorder = mediaRecorder;
        currentStream = stream;
        currentButton = button;

        button.innerHTML = '<i class="fas fa-stop"></i>';
        button.classList.add('recording');

        return new Promise(function (resolve) {
            mediaRecorder.ondataavailable = function (event) {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = function () {
                stream.getTracks().forEach(function (track) { track.stop(); });
                var audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                button.innerHTML = '<i class="fas fa-microphone"></i>';
                button.classList.remove('recording');
                currentMediaRecorder = null;
                currentStream = null;
                currentButton = null;
                resolve(audioBlob);
            };

            mediaRecorder.start();
            mediaRecorder.timeoutId = setTimeout(function () {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 20000);
        });
    } catch (error) {
        console.error('Error starting recording:', error);
        return null;
    }
}

function stopRecording() {
    if (currentMediaRecorder && currentMediaRecorder.state === 'recording') {
        if (currentMediaRecorder.timeoutId) {
            clearTimeout(currentMediaRecorder.timeoutId);
            currentMediaRecorder.timeoutId = null;
        }
        currentMediaRecorder.stop();
    }
}

async function transcribeRecording(audioBlob) {
    try {
        var base64Audio = await new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () {
                resolve(reader.result.split(',')[1]);
            };
            reader.onerror = function () {
                reject(new Error('Failed to read audio file'));
            };
            reader.readAsDataURL(audioBlob);
        });

        var response = await fetch('https://misc-ten.vercel.app/transcribe_audio_assessors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + GIBUSH_API_TOKEN
            },
            body: JSON.stringify({
                audio_blob: base64Audio,
                method: 'ivrit'
            })
        });

        if (response.ok) {
            var result = await response.json();
            return result.transcription;
        }
        return null;
    } catch (error) {
        console.error('Error transcribing recording:', error);
        return null;
    }
}

function showMore(id, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    document.getElementById(id + 'Overflow').className = '';
    document.getElementById(id + 'MoreLink').className = 'hidden';
    document.getElementById(id + 'LessLink').className = '';
}

function showLess(id, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    document.getElementById(id + 'Overflow').className = 'hidden';
    document.getElementById(id + 'MoreLink').className = '';
    document.getElementById(id + 'LessLink').className = 'hidden';
}

function getPlainTextContent(htmlString) {
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString.replaceAll('&nbsp;', ' ');
    return tempDiv.textContent || tempDiv.innerText || '';
}

function truncateHtmlAtTextLength(htmlString, maxTextLength) {
    var tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString.replaceAll('&nbsp;', ' ');
    var plainText = tempDiv.textContent || tempDiv.innerText || '';

    if (plainText.length <= maxTextLength) {
        return { truncated: htmlString, remainder: '' };
    }

    var splitPoint = maxTextLength;
    var textToSplit = plainText.substring(0, maxTextLength);
    var lastSpaceIndex = textToSplit.lastIndexOf(' ');
    if (lastSpaceIndex > 0) {
        splitPoint = lastSpaceIndex;
    }

    var textPosition = 0;
    var truncatedHtml = '';
    var foundSplitPoint = false;

    function processNodes(node) {
        if (foundSplitPoint) return;

        if (node.nodeType === Node.TEXT_NODE) {
            var text = node.textContent;
            if (textPosition + text.length <= splitPoint) {
                truncatedHtml += text;
                textPosition += text.length;
            } else {
                var charsFromThisNode = splitPoint - textPosition;
                var truncatedText = text.substring(0, charsFromThisNode);
                var lastSpace = truncatedText.lastIndexOf(' ');
                if (lastSpace > 0) {
                    truncatedText = truncatedText.substring(0, lastSpace);
                }
                truncatedHtml += truncatedText;
                foundSplitPoint = true;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            var tagName = node.tagName.toLowerCase();
            var attributes = '';
            for (var i = 0; i < node.attributes.length; i++) {
                var attr = node.attributes[i];
                attributes += ' ' + attr.name + '="' + attr.value + '"';
            }
            truncatedHtml += '<' + tagName + attributes + '>';
            for (var j = 0; j < node.childNodes.length; j++) {
                processNodes(node.childNodes[j]);
                if (foundSplitPoint) break;
            }
            truncatedHtml += '</' + tagName + '>';
        }
    }

    for (var i = 0; i < tempDiv.childNodes.length; i++) {
        processNodes(tempDiv.childNodes[i]);
        if (foundSplitPoint) break;
    }

    var remainderDiv = document.createElement('div');
    remainderDiv.innerHTML = htmlString.replaceAll('&nbsp;', ' ');
    var remainderPlainText = remainderDiv.textContent || remainderDiv.innerText || '';
    var truncatedPlainText = getPlainTextContent(truncatedHtml);
    var actualSplitPoint = truncatedPlainText.length;

    while (actualSplitPoint < remainderPlainText.length && remainderPlainText[actualSplitPoint] === ' ') {
        actualSplitPoint++;
    }

    var tempDiv2 = document.createElement('div');
    tempDiv2.innerHTML = htmlString.replaceAll('&nbsp;', ' ');

    function removeTextFromBeginning(node, textToRemove) {
        if (textToRemove <= 0) return 0;
        if (node.nodeType === Node.TEXT_NODE) {
            var text = node.textContent;
            if (text.length <= textToRemove) {
                node.textContent = '';
                return textToRemove - text.length;
            }
            node.textContent = text.substring(textToRemove);
            return 0;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            for (var k = 0; k < node.childNodes.length; k++) {
                textToRemove = removeTextFromBeginning(node.childNodes[k], textToRemove);
                if (textToRemove <= 0) break;
            }
        }
        return textToRemove;
    }

    removeTextFromBeginning(tempDiv2, actualSplitPoint);

    return {
        truncated: truncatedHtml,
        remainder: ' ' + tempDiv2.innerHTML
    };
}

var trun = function () {
    if (!$('.shrinkables').length) {
        var len = 40;
        var shrinkables = $('tbody td span');
        if (shrinkables.length > 0) {
            for (var i = 0; i < shrinkables.length; i++) {
                var fullText = shrinkables[i].innerHTML.replaceAll('&nbsp;', ' ');
                var plainText = getPlainTextContent(fullText);
                if (plainText.length > len && !fullText.includes('badge')) {
                    var truncationResult = truncateHtmlAtTextLength(fullText, len);
                    var id = 'shrinkable' + i;
                    shrinkables[i].innerHTML = '<span class="shrinkables">' + truncationResult.truncated +
                        '<span class="hidden" id="' + id + 'Overflow">' + truncationResult.remainder + '</span></span>&nbsp;' +
                        '<a id="' + id + 'MoreLink" style="cursor:pointer;color:blue;" onclick="showMore(\'' + id + '\', event);">הצג עוד</a>' +
                        '<a class="hidden" style="cursor:pointer;color:blue;" id="' + id + 'LessLink" onclick="showLess(\'' + id + '\', event);">הצג פחות</a>';
                }
            }
        }
    }
};

$('body, button').click(function () {
    setTimeout(function () {
        if ($('.shrinkables').length === 0) {
            trun();
        }
    }, 500);
});
