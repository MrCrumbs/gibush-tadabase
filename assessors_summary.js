var MISC_API_BASE = 'https://misc-ten.vercel.app';

/** Latest `data.records` from TB.render('component_3') — full values, not DOM / truncated text. */
var assessorsSummaryRecordsCache = [];

function extractMadadFromRecord(v) {
    if (v == null || v === '') return '';
    if (typeof v === 'object' && !Array.isArray(v)) {
        var parts = [];
        for (var k in v) {
            if (Object.prototype.hasOwnProperty.call(v, k)) {
                parts.push(String(v[k]));
            }
        }
        return parts.join(', ');
    }
    return String(v);
}

/** Strip HTML / entities for plain-text AI payload (source is trusted app data). */
function normalizeAiText(val) {
    if (val == null || val === undefined) return '';
    if (typeof val === 'number') {
        return isFinite(val) ? String(val) : '';
    }
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    var s = String(val);
    s = s.replace(/&nbsp;/gi, ' ').replace(/\u00a0/g, ' ');
    s = s.replace(/<br\s*\/?>/gi, '\n');
    s = s.replace(/<[^>]+>/g, ' ');
    s = s.replace(/[ \t\f\v]+/g, ' ').replace(/\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return s;
}

/** Maps one Tadabase record to API row keys (same order as misc ASSESSORS_SUMMARY_ROW_KEYS). */
function recordToAssessorsSummaryRow(rec) {
    if (!rec || typeof rec !== 'object') return null;
    return {
        assessee_number: normalizeAiText(rec.field_61),
        madad: normalizeAiText(extractMadadFromRecord(rec.field_265)),
        final_grade: normalizeAiText(rec.field_295),
        assessors_recommendation: normalizeAiText(rec.field_333),
        physical_component: normalizeAiText(rec.field_565),
        field_component: normalizeAiText(rec.field_566),
        sociometric_component: normalizeAiText(rec.field_130),
        interview_component: normalizeAiText(rec.field_141),
        assessors_comments_field: normalizeAiText(rec.field_300),
        assessors_comments_interview: normalizeAiText(rec.field_318),
        trustworthiness: normalizeAiText(rec.field_324),
        medical: normalizeAiText(rec.field_330)
    };
}

function buildAssessorsSummaryRowsFromCache() {
    if (!assessorsSummaryRecordsCache || !assessorsSummaryRecordsCache.length) return [];
    var out = [];
    for (var i = 0; i < assessorsSummaryRecordsCache.length; i++) {
        var row = recordToAssessorsSummaryRow(assessorsSummaryRecordsCache[i]);
        if (row) out.push(row);
    }
    return out;
}

function ensureAssessorsSummaryAiStyles() {
    var style = document.getElementById('assessors-summary-ai-styles');
    if (!style) {
        style = document.createElement('style');
        style.id = 'assessors-summary-ai-styles';
        document.head.appendChild(style);
    }
    style.textContent =
        '#assessors-summary-ai-modal{--asai-fs:14px;--asai-fs-label:14px;--asai-lh:1.45;--asai-radius:8px;--asai-border:#d8d8d8;--asai-muted:#5c5c5c;--asai-bg:#f6f7f9;}' +
        '#assessors-summary-ai-modal{display:none;position:fixed;inset:0;z-index:10050;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Hebrew","Noto Sans",sans-serif;}' +
        '#assessors-summary-ai-modal.asai-open{display:flex;}' +
        '#assessors-summary-ai-modal .asai-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.48);cursor:pointer;}' +
        '#assessors-summary-ai-modal .asai-dialog{position:relative;z-index:1;width:100%;max-width:640px;max-height:88vh;overflow:auto;background:#fff;border-radius:var(--asai-radius);padding:20px 22px;box-shadow:0 16px 48px rgba(0,0,0,0.18);border:1px solid #e2e4e8;box-sizing:border-box;font-size:var(--asai-fs);line-height:var(--asai-lh);color:#1a1d21;}' +
        '#assessors-summary-ai-modal .asai-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin:0 0 16px;padding-bottom:14px;border-bottom:1px solid var(--asai-border);}' +
        '#assessors-summary-ai-modal .asai-head h2{margin:0;font-size:var(--asai-fs);font-weight:600;line-height:var(--asai-lh);color:#111;}' +
        '#assessors-summary-ai-modal .asai-close{border:1px solid var(--asai-border);background:var(--asai-bg);border-radius:6px;font-size:var(--asai-fs);line-height:1;width:36px;height:36px;padding:0;cursor:pointer;color:#333;display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
        '#assessors-summary-ai-modal .asai-close:hover{background:#eceef2;color:#000;}' +
        '#assessors-summary-ai-modal .asai-field-label{display:block;font-size:var(--asai-fs-label);font-weight:600;line-height:var(--asai-lh);color:var(--asai-muted);margin:0 0 8px;}' +
        '#assessors-summary-ai-modal .asai-field-label.asai-label-tight{margin-top:4px;}' +
        '#assessors-summary-ai-modal textarea#assessors-summary-ai-question{width:100%;min-height:100px;box-sizing:border-box;margin:0 0 16px;padding:12px 14px;font-size:var(--asai-fs);font-family:inherit;line-height:var(--asai-lh);color:#1a1d21;border:1px solid var(--asai-border);border-radius:6px;resize:vertical;background:#fff;}' +
        '#assessors-summary-ai-modal textarea#assessors-summary-ai-question:focus{outline:none;border-color:#6b7280;box-shadow:0 0 0 2px rgba(107,114,128,0.15);}' +
        '#assessors-summary-ai-modal .asai-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 12px;}' +
        '#assessors-summary-ai-modal .asai-actions button#assessors-summary-ai-submit{font-family:inherit;font-size:var(--asai-fs);font-weight:600;line-height:1.2;min-height:40px;padding:0 20px;cursor:pointer;border-radius:6px;border:1px solid #2d3748;background:#2d3748;color:#fff;}' +
        '#assessors-summary-ai-modal .asai-actions button#assessors-summary-ai-submit:hover{background:#1a202c;border-color:#1a202c;}' +
        '#assessors-summary-ai-modal .asai-actions button#assessors-summary-ai-submit:disabled{opacity:0.55;cursor:wait;}' +
        '#assessors-summary-ai-modal .asai-spin-line{display:none;align-items:center;gap:8px;font-size:var(--asai-fs);font-weight:500;color:var(--asai-muted);}' +
        '#assessors-summary-ai-modal .asai-spinner{width:20px;height:20px;border:2px solid #e5e7eb;border-top-color:#374151;border-radius:50%;animation:asai-spin 0.7s linear infinite;flex-shrink:0;}' +
        '@keyframes asai-spin{to{transform:rotate(360deg);}}' +
        '#assessors-summary-ai-modal .asai-answer{white-space:pre-wrap;margin:0;padding:14px 16px;font-size:var(--asai-fs);font-family:inherit;line-height:var(--asai-lh);color:#1a1d21;background:var(--asai-bg);border:1px solid var(--asai-border);border-radius:6px;min-height:3.5em;max-height:42vh;overflow:auto;}' +
        '#assessors-summary-ai-modal .asai-error{margin:8px 0 0;font-size:var(--asai-fs);font-weight:500;line-height:var(--asai-lh);color:#b00020;}';
}

function openAssessorsSummaryAiModal() {
    var modal = document.getElementById('assessors-summary-ai-modal');
    if (!modal) return;
    document.getElementById('assessors-summary-ai-error').textContent = '';
    modal.classList.add('asai-open');
}

function closeAssessorsSummaryAiModal() {
    var modal = document.getElementById('assessors-summary-ai-modal');
    if (modal) modal.classList.remove('asai-open');
}

function ensureAssessorsSummaryAiModal() {
    ensureAssessorsSummaryAiStyles();
    if (!document.getElementById('assessors-summary-ai-modal')) {
        var modal = document.createElement('div');
        modal.id = 'assessors-summary-ai-modal';
        modal.setAttribute('dir', 'rtl');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'assessors-summary-ai-title');

        var backdrop = document.createElement('div');
        backdrop.className = 'asai-backdrop';
        backdrop.addEventListener('click', closeAssessorsSummaryAiModal);

        var dialog = document.createElement('div');
        dialog.className = 'asai-dialog';
        dialog.addEventListener('click', function (e) {
            e.stopPropagation();
        });

        var head = document.createElement('div');
        head.className = 'asai-head';
        var h2 = document.createElement('h2');
        h2.id = 'assessors-summary-ai-title';
        h2.textContent = 'שאלה ל-AI על הנתונים בטבלה';
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'asai-close';
        closeBtn.setAttribute('aria-label', 'סגור');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', closeAssessorsSummaryAiModal);
        head.appendChild(h2);
        head.appendChild(closeBtn);

        var qLabel = document.createElement('label');
        qLabel.className = 'asai-field-label';
        qLabel.setAttribute('for', 'assessors-summary-ai-question');
        qLabel.textContent = 'שאלה';

        var ta = document.createElement('textarea');
        ta.id = 'assessors-summary-ai-question';
        ta.setAttribute('placeholder', 'לדוגמה: מי המועמדים עם ציון סוציומטרי מעל 25 והמלצה 1+?');
        ta.setAttribute('rows', '4');

        var actions = document.createElement('div');
        actions.className = 'asai-actions';
        var submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.id = 'assessors-summary-ai-submit';
        submitBtn.textContent = 'שלח';
        var spinWrap = document.createElement('span');
        spinWrap.id = 'assessors-summary-ai-spin-wrap';
        spinWrap.className = 'asai-spin-line';
        spinWrap.innerHTML = '<span class="asai-spinner" aria-hidden="true"></span><span class="asai-status-text">מעבד…</span>';
        actions.appendChild(submitBtn);
        actions.appendChild(spinWrap);

        var err = document.createElement('div');
        err.className = 'asai-error';
        err.id = 'assessors-summary-ai-error';

        var ansLabel = document.createElement('div');
        ansLabel.className = 'asai-field-label asai-label-tight';
        ansLabel.textContent = 'תשובה';

        var ans = document.createElement('div');
        ans.className = 'asai-answer';
        ans.id = 'assessors-summary-ai-answer';

        dialog.appendChild(head);
        dialog.appendChild(qLabel);
        dialog.appendChild(ta);
        dialog.appendChild(actions);
        dialog.appendChild(err);
        dialog.appendChild(ansLabel);
        dialog.appendChild(ans);
        modal.appendChild(backdrop);
        modal.appendChild(dialog);
        document.body.appendChild(modal);

        submitBtn.addEventListener('click', function () {
            var question = (ta.value || '').trim();
            err.textContent = '';
            ans.textContent = '';
            if (!question) {
                err.textContent = 'נא להזין שאלה.';
                return;
            }
            var rows = buildAssessorsSummaryRowsFromCache();
            if (!rows.length) {
                err.textContent = 'אין רשומות לשליחה. רענן את הדף או את הטבלה ונסה שוב.';
                return;
            }
            submitBtn.disabled = true;
            spinWrap.style.display = 'inline-flex';

            fetch(MISC_API_BASE + '/assessors_summary_ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question, rows: rows })
            })
                .then(function (res) {
                    return res.json().then(function (data) {
                        if (!res.ok) throw new Error(data.error || res.statusText);
                        return data;
                    });
                })
                .then(function (data) {
                    ans.textContent = data.answer || '';
                })
                .catch(function (e) {
                    err.textContent = e.message || String(e);
                })
                .finally(function () {
                    submitBtn.disabled = false;
                    spinWrap.style.display = 'none';
                });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('asai-open')) {
                closeAssessorsSummaryAiModal();
            }
        });
    }

    /* Put the button inside the first inline toolbar (search / sync / filter), not on .table-actions
       after .clearfix — that forces a separate row. */
    var actionsRoot = document.querySelector('.table-actions');
    var toolbar = actionsRoot && actionsRoot.querySelector('.form-inline.pull-right');
    if (toolbar && !toolbar.querySelector('#assessors-summary-ai-open-btn')) {
        var openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.id = 'assessors-summary-ai-open-btn';
        openBtn.className = 'btn btn-default btn-sm m-l-xs';
        openBtn.textContent = 'שאל AI';
        openBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openAssessorsSummaryAiModal();
        });
        toolbar.appendChild(openBtn);
    }
}

TB.render('component_3', function(data) {
    setTimeout(() => {
        assessorsSummaryRecordsCache =
            data && data.records && data.records.length ? data.records.slice() : [];

        $("#hichartsJS").remove();
        var summaryInitialElement = document.querySelector("article div[ui-view]");
        const existing = summaryInitialElement.nextSibling;
        if (existing) existing.remove();
        $('.pull-left, .form-inline').addClass('pull-right').removeClass('pull-left');
        $(".filter-tabs li:last a").text("נקה סינון");
        $(".t-filter-button-text").text(" הוסף מסננים");
        $(".input-group input").attr("placeholder", "חיפוש");
        $(".t-export-button").text("ייצוא");
        $(".t-view-download").text("הצג הורדות");
        
        $('table tr').each(function() {
            var columnText = $(this).find('td:nth-child(17)').text().trim();
            if (columnText !== '') {
              $(this).css('background-color', '#FF6464');
            }
        });
        
        trun();
        
        addRowNumbers();
        ensureAssessorsSummaryAiModal();
    });
});

function showMore(id, event) {
    // Prevent the click from bubbling up to parent elements (which would open the editing modal)
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }    
    document.getElementById(id + 'Overflow').className = '';
    document.getElementById(id + 'MoreLink').className = 'hidden';
    document.getElementById(id + 'LessLink').className = '';
}
function showLess(id, event) {
    // Prevent the click from bubbling up to parent elements (which would open the editing modal)
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    document.getElementById(id + 'Overflow').className = 'hidden';
    document.getElementById(id + 'MoreLink').className = '';
    document.getElementById(id + 'LessLink').className = 'hidden';
}
/* ── truncation counter (survives multiple trun() calls) ────── */
var _trunCounter = 0;

/* ── core function: only processes un-truncated spans ───────── */
var trun = function () {
    var len = 40;

    // KEY FIX: filter to spans that don't already contain truncation markup
    var candidates = $('tbody td span').filter(function () {
        return $(this).find('.shrinkables').length === 0      // doesn't contain truncation
            && !$(this).hasClass('shrinkables')               // isn't the truncation wrapper
            && $(this).closest('.shrinkables').length === 0;  // ← isn't NESTED inside one
    });

    candidates.each(function () {
        var el = this;
        var fullText = el.innerHTML.replaceAll('&nbsp;', ' ');

        if (
            fullText.length > len
            && !$(el.offsetParent).hasClass('allow-inline-edit')
            && !fullText.includes('badge')
        ) {
            var trunc = fullText.substring(0, len).replace(/\w+$/, '');
            var remainder = fullText.substring(len);
            var id = 'shrinkable' + (_trunCounter++);

            el.innerHTML =
                '<span class="shrinkables">'
                + trunc
                + '<span class="hidden" id="' + id + 'Overflow">' + remainder + '</span>'
                + '</span>'
                + '&nbsp;<a id="' + id + 'MoreLink" style="cursor:pointer;color:blue;" '
                + 'onclick="showMore(\'' + id + '\', event);">הצג עוד</a>'
                + '<a class="hidden" style="cursor:pointer;color:blue;" id="' + id + 'LessLink" '
                + 'onclick="showLess(\'' + id + '\', event);">הצג פחות</a>';
        }
    });
};

/* ── MutationObserver: catches Angular re-renders after update() ─
   Watches tbody for subtree changes; debounces to avoid thrashing  */
var _trunTimer = null;
var _observer = new MutationObserver(function (mutations) {
    var relevant = mutations.some(function (m) {
        // ignore className-only changes (show/hide toggles)
        if (m.type === 'attributes') return false;
        var target = m.target;
        if (
            target.className === 'shrinkables'
            || (target.parentElement && target.parentElement.className === 'shrinkables')
        ) return false;
        return !!$(target).closest('tbody td').length;
    });

    if (relevant) {
        clearTimeout(_trunTimer);
        _trunTimer = setTimeout(trun, 150);
    }
});

// Start observing once the table is in the DOM
setTimeout(function () {
    var tbody = document.querySelector('tbody');
    if (tbody) {
        _observer.observe(tbody, { childList: true, subtree: true, attributes: true });
    }
}, 500);

/* ── fallback click handler (for cases MutationObserver misses) ─ */
$('body').on('click', 'button', function () {
    setTimeout(trun, 600);
});

function addRowNumbers() {
  const table = document.querySelector('.tb-table tbody, table tbody');
  if (!table) return;

  // Add header if not already present
  const thead = document.querySelector('.tb-table thead tr, table thead tr');
  if (thead && !thead.querySelector('.row-num-header')) {
    const th = document.createElement('th');
    th.className = 'row-num-header';
    th.textContent = '#';
    th.style.cssText = 'width:40px; text-align:center;';
    thead.insertBefore(th, thead.firstChild);
  }

  // Add number cells to each row
  const rows = table.querySelectorAll('tr');
  rows.forEach((row, index) => {
    // Remove existing number cell to avoid duplicates on re-render
    const existing = row.querySelector('.row-num-cell');
    if (existing) existing.remove();

    const td = document.createElement('td');
    td.className = 'row-num-cell';
    td.textContent = index + 1;
    td.style.cssText = 'text-align:center; font-weight:bold; color:#666;';
    row.insertBefore(td, row.firstChild);
  });
}

