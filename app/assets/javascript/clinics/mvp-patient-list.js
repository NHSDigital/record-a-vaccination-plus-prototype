// mvp-patient-list.js
// Auto-generated from inline <script> blocks in mvp-patient-list.html
// All original behaviour preserved, moved into an external file.


  // Ensure GOV.UK initialises (adds body class) before MOJ binds
  document.addEventListener('DOMContentLoaded', function () {
    try { window.GOVUKFrontend && GOVUKFrontend.initAll(); } catch (e) {}
  });

// ============================================================================
// MVP Patient List — Client-side controller
// ============================================================================
//
// This script handles all dynamic behaviour for the MVP patient list:
//   • Builds tables (Vaccinated / Unvaccinated / Not yet eligible / Removed)
//   • Runs MOJ Sortable Table on each view
//   • Applies GA filters (32 / 36 weeks)
//   • Applies column visibility rules (driven by ?invite-type)
//   • Applies pagination (NHS-style numbered pagination)
//   • Applies sticky headers / sticky columns behaviour
//   • Updates secondary navigation labels + counts
//   • Preserves all query-string-driven configuration options
//
// The file is organised into clear sections:
//
//   1. Query string + configuration
//   2. Data helpers (parsing, date normalisation, GA calculation)
//   3. Column visibility
//   4. Row inclusion logic
//   5. Table builders (headers + rows)
//   6. Pagination engine
//   7. View rendering (Filtered / Suppressed)
//   8. Navigation labelling + details
//   9. Sticky columns / MOJ sortable table initialisation
//
// Behaviour MUST remain unchanged for all existing user journeys.
// This file has been rationalised for readability and maintainability only.
// ============================================================================

(function () {
  // back links
  (function(){var qs=location.search||'';var base=location.pathname.replace(/[^\/]+$/,'');var n=document.getElementById('backLink');if(n) n.href=base+'mvp-choose-cohort'+qs;})();
  (function(){var qs=location.search||'';var base=location.pathname.replace(/[^\/]+$/,'');var n=document.getElementById('backToInvite');if(n) n.href=base+'mvp-choose-cohort'+qs;})();

  // ---------------------------------------------------------------------------
  //  SECTION 1 — QUERY STRING + CONFIG
  // ---------------------------------------------------------------------------
  // state from URL (Considering filters)
  var params=new URLSearchParams(location.search);
  function sel(k){ return params.getAll(k).includes('1'); }
  var selected={
    f28w:sel('f28w'), fContacted:sel('fContacted'), fPhone:sel('fPhone'),
    fExpl:sel('fExpl'), fNo9m:sel('fNo9m'), fNoBook:sel('fNoBook'),
    fNo14:sel('fNo14'), fNoOther:sel('fNoOther')
  };

  // URL flag: hide Action column if ?hideAction=1 (or true) or ?noAction=1
  var hideAction = (function () {
    var p = new URLSearchParams(location.search);
    var v = (p.get('hideAction') || p.get('noAction') || '').toLowerCase();
    return v === '1' || v === 'true';
  })();

  // els
  var theadRow=document.getElementById('table-head-row');
  var tbody=document.getElementById('removable-table-body');
  var suppressedHead=document.getElementById('suppressed-head-row');
  var suppressedTbody=document.getElementById('suppressed-table-body');
  var rowCount=document.getElementById('row-count');

  var linkFiltered=document.getElementById('linkFiltered');
  var linkUnvaccinated=document.getElementById('linkUnvaccinated');
  var linkCloseToDueDate=document.getElementById('linkCloseToDueDate');
  var linkImmunosuppressed=document.getElementById('linkImmunosuppressed');
  var linkSuppressed=document.getElementById('linkSuppressed');

  var liFiltered=document.getElementById('liFiltered');
  var liUnvaccinated=document.getElementById('liUnvaccinated');
  var liCloseToDueDate=document.getElementById('liCloseToDueDate');
  var liImmunosuppressed=document.getElementById('liImmunosuppressed');
  var liSuppressed=document.getElementById('liSuppressed');

  var panelFiltered=document.getElementById('panelFiltered');
  var panelSuppressed=document.getElementById('panelSuppressed');
  var currentTabDetails=document.getElementById('currentTabDetails');
  var orderByName=document.getElementById('orderByName');
  var orderByNumber=document.getElementById('orderByNumber');
  var orderByDueDate=document.getElementById('orderByDueDate');

  // Completely hide the "Removed" panel and tab behaviour when Action is hidden in the URL
  if (hideAction) {
    // Hide the nav tab (Nunjucks already removes it visually, this is JS backup)
    if (liSuppressed) liSuppressed.style.display = 'none';

    // Hide the panel entirely
    if (panelSuppressed) panelSuppressed.style.display = 'none';

    // Prevent any click from switching to the Removed view
    if (linkSuppressed) {
      linkSuppressed.addEventListener('click', function(e){
        e.preventDefault();
        e.stopPropagation();
        return false;
      });
    }
  }

  // Map from incoming data column name to UI heading labels
  // Note: Only add the columns that need renaming, else UI will use name from data source
  const HEADING_LABELS = {
    'DOB': 'Date of birth',
    'Due date': 'Pregnancy due date',
    'Address Line 1': 'Address line 1',
    'Address Line 2': 'Address line 2',
    'Town': 'Town or city',
    'RSV eligible (28 weeks)': 'RSV eligibility date',
    'Pregnancy due date': 'Estimated due date',
    'Patient name': 'Name',
    'Pertussis eligible (16 weeks)': 'Pertussis eligibility date',
    'RSV eligible (28 weeks)': 'RSV eligibility date'
   };

  // ---------------------------------------------------------------------------
  //  SECTION 2 — DATA & DATE HELPERS
  // ---------------------------------------------------------------------------
  // utils
  function norm(s){ return String(s||'').toLowerCase().trim().replace(/\s+/g,' '); }
  function parseDate(str){
    if(!str) return NaN; var s=String(str).trim(); if(!s) return NaN;
    var m=/^([0-3]?\d)[\/-]([0-1]?\d)[\/-](\d{4})$/.exec(s); // d-m-y or d/m/y
    if(m){ var d=+m[1],mo=+m[2]-1,y=+m[3]; var dt=new Date(y,mo,d); if(dt&&dt.getFullYear()===y&&dt.getMonth()===mo&&dt.getDate()===d) return dt; }
    var t=Date.parse(s); if(!isNaN(t)) return new Date(t); return NaN;
  }
  function getData(){ return window.PATIENT_DATA||window.patientDataV2||window.patientData||window.patient_list_data; }
  function getColIndexByName(cols, header){
    var want=norm(header);
    for(var i=0;i<cols.length;i++){ if(norm(cols[i])===want) return i; }
    return -1;
  }

  function getDataset(){
    const data = getData();
    if (!data) return { columns: [], rows: [] };

    return {
      columns: data.columns || [],
      rows: data.rows || data
    };
  }

  function sortKeyFromDdMmYyyy(str){
    // Legacy helper – now just delegates to the shared date key logic.
    // Keeps existing callers working but avoids duplicate regex logic.
    if (typeof _dateSortKey === 'function') {
      return _dateSortKey(str);
    }

    // Fallback if _dateSortKey is ever missing for some reason
    var m = /^([0-3]?\d)[\/-]([0-1]?\d)[\/-](\d{4})$/.exec(String(str || '').trim());
    if (!m) return '';
    var d  = String(m[1]).padStart(2, '0');
    var mo = String(m[2]).padStart(2, '0');
    var y  = m[3];
    return y + '/' + mo + '/' + d;
  }

  // --- 1) List the headers that should sort as dates (exact names) ---
  const DATE_HEADER_NAMES = [
    'DOB',
    'Due date',
    'Pertussis eligible (16 weeks)',
    'RSV eligible (28 weeks)',
    'COVID-19 & Flu eligible',
    'Date of last Pertussis vaccination',
    'Date of last RSV vaccination',
    'Date of last Flu vaccination',
    'Date of last COVID vaccination',
    'Date of Pertussis vaccination booking',
    'Date of RSV vaccination booking',
    'Date of Flu vaccination booking',
    'Date of COVID vaccination booking',
    'Date of last Pertussis invite',
    'Date of last RSV invite',
    'Date of last Flu invite',
    'Date of last COVID invite'
  ];

  // Track which original data indexes are date columns
  let DATE_INDEXES = new Set();
  function computeDateIndexes(cols){
    DATE_INDEXES = new Set();
    DATE_HEADER_NAMES.forEach(h => {
      const idx = getColIndexByName(cols, h);
      if (idx >= 0) DATE_INDEXES.add(idx);
    });
  }

  // --- 2) Robust date parsing and keying (supports dd/mm/yyyy, d/m/yyyy, dd-mm-yyyy, ISO, "1 Jan 2025") ---
  function _tryParseDate(val){
    if (val == null) return NaN;
    const s = String(val).trim();
    if (!s) return NaN;

    // ISO / native
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return new Date(t);

    // d/m/yyyy or d-m-yyyy
    let m = /^([0-3]?\d)[\/-]([0-1]?\d)[\/-](\d{4})$/.exec(s);
    if (m){
      const d = +m[1], mo = (+m[2])-1, y = +m[3];
      const dt = new Date(y, mo, d);
      if (dt && dt.getFullYear()===y && dt.getMonth()===mo && dt.getDate()===d) return dt;
    }

    // d Mon yyyy / d Month yyyy
    m = /^([0-3]?\d)\s+([A-Za-z]+)\s+(\d{4})$/.exec(s);
    if (m){
      const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11};
      const d = +m[1], y = +m[3];
      const key = m[2].toLowerCase();
      const mo = months[key] ?? months[key.slice(0,3)];
      if (mo>=0){
        const dt = new Date(y, mo, d);
        if (dt && dt.getFullYear()===y && dt.getMonth()===mo && dt.getDate()===d) return dt;
      }
    }
    return NaN;
  }

  function _dateSortKey(val){
    const dt = _tryParseDate(val);
    if (Number.isNaN(+dt)) return '';
    const y = String(dt.getFullYear());
    const m = String(dt.getMonth()+1).padStart(2,'0');
    const d = String(dt.getDate()).padStart(2,'0');
    return `${y}/${m}/${d}`;
  }

  // Helper: set consistent date sort metadata on a table cell
  function setDateSortAttributes(td, value) {
    // Prefer the shared _dateSortKey helper if available
    var key = (typeof _dateSortKey === 'function')
      ? _dateSortKey(value)
      : (typeof sortKeyFromDdMmYyyy === 'function'
          ? sortKeyFromDdMmYyyy(value)
          : '');

    if (key) {
      // Normal case – stable YYYY/MM/DD key for the MOJ sorter
      td.setAttribute('data-sort-value', key);
    } else {
      // Only mark as "empty" if there is genuinely no visible value
      if (!String(value || '').trim()) {
        td.setAttribute('data-sort-empty', '1');
      }
      // If there is non-empty text but we couldn't parse it as a date,
      // we leave MOJ to sort it as normal text.
    }
  }

  // --- 3) Case/space normaliser so header matching is resilient ---
  function _normHeader(s){
    return String(s || '')
      .replace(/\s+/g,' ')   // collapse spaces
      .trim()
      .toLowerCase();
  }
  const _TARGET_HEADERS_NORM = new Set(DATE_HEADER_NAMES.map(_normHeader));

  // --- 4) Find the column indexes that match the target header names ---
  function _findDateColumnIndexes(table){
    const ths = table.querySelectorAll('thead th, thead td');
    const idxs = [];
    for (let i = 0; i < ths.length; i++){
      const th = ths[i];

      // Prefer the ORIGINAL column key if we stored one
      const rawKey = th.dataset && th.dataset.colKey;
      const labelText = (th.innerText || th.textContent || '').trim();

      // Use rawKey when present, otherwise fall back to visible text
      const candidate = rawKey || labelText;

      if (_TARGET_HEADERS_NORM.has(_normHeader(candidate))) {
        idxs.push(i);
      }
    }
    return idxs;
  }

  // --- 5) Set data-sort-value on each cell in those columns ---
  function _applyDateKeysToColumns(table, colIdxs){
    const tbody = table.tBodies && table.tBodies[0];
    if (!tbody) return;

    for (let r=0; r<tbody.rows.length; r++){
      const row = tbody.rows[r];
      // Some tables hide/remove columns; guard by existing cell count
      for (const c of colIdxs){
        if (c < row.cells.length){
          const td = row.cells[c];
          const text = (td.innerText || td.textContent || '').trim();
          const key = _dateSortKey(text);
          if (key){
            td.setAttribute('data-sort-value', key);
          } else {
            // If you want empties to sort last, uncomment the next line:
            // td.setAttribute('data-sort-value', '9999/12/31');
          }
        }
      }
    }
  }

  // --- 6) Apply to all MOJ sortable tables on the page ---
  function applyExplicitDateSortKeysForAllTables(){
    const tables = document.querySelectorAll('table[data-module="moj-sortable-table"], table.moj-sortable-table');
    tables.forEach(table => {
      const idxs = _findDateColumnIndexes(table);
      if (idxs.length) _applyDateKeysToColumns(table, idxs);
    });
  }

  // LIVE search getters (reads the input each time)
  function _getSearchNow(){
    const input = document.querySelector('input[name="nameOrNhsNumber"]');
    let raw = (input && input.value != null) ? String(input.value).trim() : '';

    if (!raw) {
      const p = new URLSearchParams(location.search);
      raw = (p.get('nameOrNhsNumber') || '').trim();
    }

    const digits = raw.replace(/\D/g, '');
    return { raw, digits };
  }

  function _matchesSearch(values, cols) {
    const { raw, digits } = _getSearchNow();
    if (!raw) return true; // no search -> include everything

    const idxName = getColIndexByName(cols, 'Patient name');
    const idxNhs  = getColIndexByName(cols, 'NHS number');

    // NHS-number exact match if mostly digits
    if (digits.length >= 6) {
      const nhs = (idxNhs >= 0 ? String(values[idxNhs] || '') : '').replace(/\D/g, '');
      return nhs === digits;
    }

    // Otherwise, case-insensitive name contains
    const name = (idxName >= 0 ? String(values[idxName] || '') : '').toLowerCase();
    return name.includes(raw.toLowerCase());
  }

  // ---- Weeks filter / Gestational Age helpers ----
  //
  // weeksThreshold:
  //   null → no weeks filter
  //   32   → GA must be > 32 weeks
  //   36   → GA must be > 36 weeks
  //
  // GA = 40 weeks at due date. We infer GA from "Due date" and today's date.

  // ---------------------------------------------------------------------------
  //  SECTION 4 — WEEKS FILTER / GESTATIONAL AGE
  //  weeksThreshold: null (off), 32, 36
  // ---------------------------------------------------------------------------
  let weeksThreshold = null; // null | 32 | 36

  // Try to locate the Due date / EDD column even if the header text changes slightly
  function _getDueDateIndex(cols){
    const names = cols.map(c => String(c || '').toLowerCase());
    let idx = names.findIndex(n => n === 'due date');
    if (idx < 0) idx = names.findIndex(n => n.startsWith('due date'));
    if (idx < 0) idx = names.findIndex(n => n.includes('due') && n.includes('date'));
    if (idx < 0) idx = names.findIndex(n => n === 'edd' || n.includes('(edd)'));
    return idx; // -1 if not found
  }

  function _daysBetweenUTC(a, b){
    const A = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const B = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((B - A) / (24 * 60 * 60 * 1000));
  }

  // Reuse your existing _tryParseDate if present; fallback to parseDate
  function _parseDue(val){
    if (typeof _tryParseDate === 'function') {
      const d = _tryParseDate(val);
      return (Number.isNaN(+d) ? parseDate(val) : d);
    }
    return parseDate(val);
  }

  // Gestational age in weeks from today's date + Due date
  function gestationalAgeWeeks(values, cols){
    const idxDue = _getDueDateIndex(cols);
    if (idxDue < 0) return NaN;

    const due = _parseDue(values[idxDue]);
    if (Number.isNaN(+due)) return NaN;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysUntilDue = _daysBetweenUTC(today, due); // future = positive
    const gaDays = 280 - daysUntilDue;                // 280 days = 40 weeks
    return gaDays / 7;
  }

  // "Does this row pass the current GA threshold?"
  function isMoreThanWeeks(values, cols, threshold){
    try {
      const ga = gestationalAgeWeeks(values, cols);
      if (Number.isNaN(ga)) return false; // if we can't compute GA, fail when filter is active
      return ga > threshold;
    } catch (e) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Column visibility – driven by invite-type in the query string
  //
  // We show/hide certain columns depending on the view:
  //   - ?invite-type=rsv        → hide Pertussis + Flu + COVID columns
  //   - ?invite-type=pertussis  → hide RSV + Flu + COVID columns
  //   - ?invite-type=all        → show everything except sensitive IDs/flags
  //   - (no or unknown type)    → sensible default
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  //  SECTION 3 — COLUMN VISIBILITY (HIDDEN_COLUMNS by invite-type)
  // ---------------------------------------------------------------------------
  const INVITE_TYPE = (new URLSearchParams(location.search).get('invite-type') || '')
    .toLowerCase();

  const HIDDEN_COLUMNS = (function getHiddenColumns() {
    // Columns that we almost always hide
    const baseIdentifiers = [
      'Patient ID'
    ];

    // RSV-focused view
    if (INVITE_TYPE === 'rsv') {
      return baseIdentifiers.concat([
        'Pertussis eligible (16 weeks)',
        'COVID-19 & Flu eligible',
        'RSV explained and offered',
        'RSV side effects discussed',
        'Flu explained and offered',
        'Flu side effects discussed',
        'Pertussis explained and offered',
        'Pertussis side effects discussed',
        'Contactable',
        'Date of last RSV vaccination',
        'Date of last RSV invite',
        'Date of RSV vaccination booking',
        'Date of last Flu vaccination',
        'Date of last Flu invite',
        'Date of Flu vaccination booking',
        'Date of last COVID vaccination',
        'Date of COVID vaccination booking',
        'Date of last COVID invite',
        'Date of last Pertussis vaccination',
        'Date of Pertussis vaccination booking',
        'Date of last Pertussis invite',
        "Address Line 1",
        "Address Line 2",
        "Town",
        "Phone number"
      ]);
    }

    // Pertussis-focused view
    if (INVITE_TYPE === 'pertussis') {
      return baseIdentifiers.concat([
        'RSV eligible (28 weeks)',
        'COVID-19 & Flu eligible',
        'RSV explained and offered',
        'RSV side effects discussed',
        'Flu explained and offered',
        'Flu side effects discussed',
        'Pertussis explained and offered',
        'Pertussis side effects discussed',
        'Contactable',
        'Date of last RSV vaccination',
        'Date of last RSV invite',
        'Date of RSV vaccination booking',
        'Date of last Flu vaccination',
        'Date of last Flu invite',
        'Date of Flu vaccination booking',
        'Date of last COVID vaccination',
        'Date of COVID vaccination booking',
        'Date of last COVID invite',
        'Date of last Pertussis vaccination',
        'Date of Pertussis vaccination booking',
        'Date of last Pertussis invite',
        "Address Line 1",
        "Address Line 2",
        "Town",
        "Phone number"
      ]);
    }

    // "All vaccines" view – keep only the core identifiers hidden
    if (INVITE_TYPE === 'all') {
      return baseIdentifiers.concat([
        'RSV explained and offered',
        'RSV side effects discussed',
        'Flu explained and offered',
        'Flu side effects discussed',
        'Pertussis explained and offered',
        'Pertussis side effects discussed',
        'Contactable',
        'Date of last RSV vaccination',
        'Date of last RSV invite',
        'Date of RSV vaccination booking',
        'Date of last Flu vaccination',
        'Date of last Flu invite',
        'Date of Flu vaccination booking',
        'Date of last COVID vaccination',
        'Date of COVID vaccination booking',
        'Date of last COVID invite',
        'Date of last Pertussis vaccination',
        'Date of Pertussis vaccination booking',
        'Date of last Pertussis invite',
        "Address Line 1",
        "Address Line 2",
        "Town",
        "Phone number"
      ]);
    }

    // Fallback (no invite-type) – keep it simple and safe
    return baseIdentifiers.concat([
      'Contactable'
    ]);
  })();

  // ---------------------------------------------------------------------------
  // END: column visibility
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  //  COLUMN ORDER — master config
  //
  //  This defines the *logical* order of all data columns. We will:
  //    • Start from this order
  //    • Drop any columns in HIDDEN_COLUMNS
  //    • Drop any columns not present in the current data set
  //    • Use the result for BOTH headers and body cells
  //
  //  To change the column order, ONLY edit COLUMN_ORDER below.
  // ---------------------------------------------------------------------------
  const COLUMN_ORDER = [
    // Core identifiers
    'Patient ID',                    // (hidden by HIDDEN_COLUMNS, but kept for safety)
    'Patient name',
    'NHS number',

    // Demographics
    'DOB',
    'Due date',

    // Address cluster — ORDER YOU ASKED FOR:
    // Postcode → Address line 1 → Address Line 2 → Town or city
    'Postcode',
    'Address Line 1',
    'Address Line 2',
    'Town',

    // Contact
    'Phone number',
    'Contactable',                   // (hidden by HIDDEN_COLUMNS)

    // Eligibility flags
    'Pertussis eligible (16 weeks)',
    'RSV eligible (28 weeks)',
    'COVID-19 & Flu eligible',

    // Counselling / explained & offered
    'Pertussis explained and offered',
    'Pertussis side effects discussed',
    'RSV explained and offered',
    'RSV side effects discussed',
    'Flu explained and offered',
    'Flu side effects discussed',

    // Vaccination history
    'Date of last Pertussis vaccination',
    'Date of last RSV vaccination',
    'Date of last Flu vaccination',
    'Date of last COVID vaccination',

    // Bookings
    'Date of Pertussis vaccination booking',
    'Date of RSV vaccination booking',
    'Date of Flu vaccination booking',
    'Date of COVID vaccination booking',

    // Invites
    'Date of last Pertussis invite',
    'Date of last RSV invite',
    'Date of last Flu invite',
    'Date of last COVID invite'
  ];

  // Normaliser for column-key matching
  function _normColNameForOrder(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Given the raw data columns, return visible columns in the configured order
  function getVisibleColumnsInOrder(columns) {
    // Map normalised name → order index
    const orderIndex = new Map();
    COLUMN_ORDER.forEach((name, idx) => {
      orderIndex.set(_normColNameForOrder(name), idx);
    });

    // Drop any columns that are globally hidden for this invite-type
    const visible = columns.filter(c => !HIDDEN_COLUMNS.includes(c));

    // Sort by:
    //   1) configured order (COLUMN_ORDER)
    //   2) original index as a stable tie-breaker / fallback
    return visible.slice().sort((a, b) => {
      const na = _normColNameForOrder(a);
      const nb = _normColNameForOrder(b);

      const ia = orderIndex.has(na) ? orderIndex.get(na) : Number.MAX_SAFE_INTEGER;
      const ib = orderIndex.has(nb) ? orderIndex.get(nb) : Number.MAX_SAFE_INTEGER;

      if (ia !== ib) return ia - ib;

      // Fallback: preserve original ordering for anything not in COLUMN_ORDER
      return columns.indexOf(a) - columns.indexOf(b);
    });
  }

 // deterministic buckets
  function djb2(str){ var h=5381; for(var i=0;i<str.length;i++){ h=((h<<5)+h)+str.charCodeAt(i); h|=0; } return Math.abs(h); }
  function keyFor(values){ return String(values&&values.length?values[0]:JSON.stringify(values||[])); } // stable key from first data column
  function bucketFor(values){ return djb2(keyFor(values))%10; }
  function isUnvaccinated(v){ var b=bucketFor(v); return b===0||b===1||b===2; }
  function isCloseToDue(v){ var b=bucketFor(v); return b===3||b===4; }
  function isImmuno(v){ var b=bucketFor(v); return b===5; }

  // -------- Sorting state (for your top pill buttons; MOJ handles header clicks) --------
  var sortBy = 'name'; // 'name' | 'number' | 'dueDate' | null

  function cmpName(cols,a,b){
    var i=getColIndexByName(cols,'Patient name');
    var sa=(i>=0?String(a[i]||''):'').toLowerCase();
    var sb=(i>=0?String(b[i]||''):'').toLowerCase();
    if(sa<sb) return -1; if(sa>sb) return 1; return 0;
  }
  function cmpNumber(cols,a,b){
    var i=getColIndexByName(cols,'NHS number');
    var na=(i>=0?String(a[i]||'').replace(/\D/g,''):'');
    var nb=(i>=0?String(b[i]||'').replace(/\D/g,''):'');
    var ai=na?parseInt(na,10):Number.POSITIVE_INFINITY;
    var bi=nb?parseInt(nb,10):Number.POSITIVE_INFINITY;
    return ai-bi;
  }
  function cmpDueDate(cols,a,b){
    var i=getColIndexByName(cols,'Due date');
    var da=(i>=0?parseDate(a[i]):NaN);
    var db=(i>=0?parseDate(b[i]):NaN);
    var ta=isNaN(+da)?Number.POSITIVE_INFINITY:+da;
    var tb=isNaN(+db)?Number.POSITIVE_INFINITY:+db;
    return ta-tb;
  }
  function sortValuesList(cols, list){
    if(!sortBy) return list;
    var arr=list.slice();
    if(sortBy==='name') arr.sort(function(a,b){ return cmpName(cols,a,b); });
    else if(sortBy==='number') arr.sort(function(a,b){ return cmpNumber(cols,a,b); });
    else if(sortBy==='dueDate') arr.sort(function(a,b){ return cmpDueDate(cols,a,b); });
    return arr;
  }
  function sortSuppressedTbody(){
    if(!sortBy) return;
    var rows=Array.from(suppressedTbody.querySelectorAll('tr'));
    if(rows.length<2) return;
    var data=getData(), cols=data.columns;

    rows.sort(function(r1,r2){
      var v1=[]; var v2=[];
      try{ v1=JSON.parse(r1.dataset.values||'[]'); }catch(_){}
      try{ v2=JSON.parse(r2.dataset.values||'[]'); }catch(_){}
      if(sortBy==='name') return cmpName(cols,v1,v2);
      if(sortBy==='number') return cmpNumber(cols,v1,v2);
      if(sortBy==='dueDate') return cmpDueDate(cols,v1,v2);
      return 0;
    });
    var frag=document.createDocumentFragment();
    rows.forEach(function(r){ frag.appendChild(r); });
    suppressedTbody.appendChild(frag);
  }
  // -----------------------------------------

  function removedCount(){ return suppressedTbody.querySelectorAll('tr').length; }

  function getCountsLive(){
    var data=getData(); if(!data) return {considering:0,unvax:0,close:0,immuno:0,total:0};
    var cols=data.columns, rows=data.rows||data;
    var anySel=Object.values(selected).some(Boolean);
    var cCon=0,cUn=0,cCl=0,cIm=0;
    rows.forEach(function(vals){
      var key = keyFor(vals);
      if(removedKeys.has(key)) return;
      if(anySel && passesFilters(vals,cols)) cCon++;
      if(isUnvaccinated(vals)) cUn++;
      if(isCloseToDue(vals)) cCl++;
      if(isImmuno(vals)) cIm++;
    });
    return {considering:cCon,unvax:cUn,close:cCl,immuno:cIm,total:rows.length};
  }

  // ---------------------------------------------------------------------------
  //  SECTION 9 — NAVIGATION LABELS + COUNTS + DETAILS TEXT
  // ---------------------------------------------------------------------------
  //function labelCounts(){
  //  return useLiveCounts ? getCountsLive()
  //    : {considering:BASE_COUNTS[VIEW.CONSIDERING],unvax:BASE_COUNTS[VIEW.UNVAX],close:BASE_COUNTS[VIEW.CLOSE],immuno:BASE_COUNTS[VIEW.IMMUNO],total:BASE_TOTAL};
  //}
  function labelCounts(){
    if (INVITE_TYPE === 'all') return getCountsLive();   // ← new line
    return useLiveCounts ? getCountsLive()
      : {considering:BASE_COUNTS[VIEW.CONSIDERING],
        unvax:BASE_COUNTS[VIEW.UNVAX],
        close:BASE_COUNTS[VIEW.CLOSE],
        immuno:BASE_COUNTS[VIEW.IMMUNO],
        total:BASE_TOTAL};
  }

  // ---------------------------------------------------------------------------
  // Secondary nav: labels + explanatory text
  // ---------------------------------------------------------------------------

  function setNavLabels() {
    var counts = labelCounts();

    if (INVITE_TYPE === 'all') {
      // Combined view – "Included" only
      if (linkFiltered) {
        linkFiltered.textContent = 'Included (' + (counts.considering || 0) + ')';
      }

      // Nunjucks already hides these, this is just a JS safety net
      if (liUnvaccinated)  liUnvaccinated.style.display  = 'none';
      if (liCloseToDueDate) liCloseToDueDate.style.display = 'none';
    } else {
      // Single-vaccine views
      if (linkFiltered) {
        linkFiltered.textContent = 'Vaccinated (' + (counts.considering || 0) + ')';
      }
      if (linkUnvaccinated) {
        linkUnvaccinated.textContent = 'Not yet vaccinated (' + (counts.unvax || 0) + ')';
      }
      if (liCloseToDueDate && linkCloseToDueDate) {
        linkCloseToDueDate.textContent = 'Not yet eligible (' + (counts.close || 0) + ')';
      }
      // If you decide to re-enable the Immunosuppressed tab:
      // if (linkImmunosuppressed) {
      //   linkImmunosuppressed.textContent = 'Close to due date (' + (counts.immuno || 0) + ')';
      // }
    }

    // "Removed" tab text (only when Action column is present)
    if (!hideAction && linkSuppressed) {
      linkSuppressed.innerHTML = '<strong>Removed (' + removedCount() + ')</strong>';
    }
  }

  // If you re-enable explanatory copy later, this is ready to use.
  function detailsHtml(view, count, total) {
    // Reuse INVITE_TYPE computed at the top of the script
    var vaccineLabel = 'the RSV vaccine';
    if (INVITE_TYPE === 'pertussis') vaccineLabel = 'the Pertussis vaccine';
    if (INVITE_TYPE === 'all')       vaccineLabel = 'RSV or Pertussis vaccines';

    // Currently all messaging is suppressed – we just return '' to keep the
    // layout stable without showing explanatory text.
    switch (view) {
      case VIEW.CONSIDERING:
        // return `<p class="nhsuk-body nhsuk-u-margin-top-2">
        //   Patients who have had ${vaccineLabel}.
        // </p>`;
        return '';
      case VIEW.UNVAX:
        // return `<p class="nhsuk-body nhsuk-u-margin-top-2">
        //   Patients eligible for ${vaccineLabel} who have not had the vaccine.
        // </p>`;
        return '';
      case VIEW.CLOSE:
        // return `<p class="nhsuk-body nhsuk-u-margin-top-2">
        //   Patients not yet at 28 weeks of pregnancy.
        // </p>`;
        return '';
      case VIEW.IMMUNO:
        // return `<p class="nhsuk-body nhsuk-u-margin-top-2">
        //   Unvaccinated patients with less than four weeks before their due date.
        // </p>`;
        return '';
      default:
        return '';
    }
  }

  function renderRemovedParagraph() {
    if (!currentTabDetails) return;

    currentTabDetails.innerHTML = '';
    var p = document.createElement('p');
    p.className = 'nhsuk-body nhsuk-u-margin-top-2';
    p.textContent = 'Patients you have manually removed from the list.';
    currentTabDetails.appendChild(p);
  }

  function setDetailsFor(view) {
    if (!currentTabDetails) return;

    if (view === VIEW.REMOVED) {
      renderRemovedParagraph();
      return;
    }

    var counts = labelCounts();
    var countForView =
      view === VIEW.CONSIDERING ? counts.considering :
      view === VIEW.UNVAX       ? counts.unvax :
      view === VIEW.CLOSE       ? counts.close :
                                  counts.immuno;

    var total = counts.total || BASE_TOTAL;
    currentTabDetails.innerHTML = detailsHtml(view, countForView, total);
  }

  // ---------------------------------------------------------------------------
  //  SECTION 5 — ROW INCLUSION LOGIC (filters + invite-type rules)
  // ---------------------------------------------------------------------------
  function includeInView(view, values, cols){
    const key = keyFor(values);
    if (removedKeys.has(key)) return false;

    // 1) Search filter (now live)
    if (!_matchesSearch(values, cols)) return false;

    // 2) Weeks filter (if set): require GA > threshold based on Due date vs today
    if (typeof weeksThreshold === 'number' && weeksThreshold != null) {
      if (!isMoreThanWeeks(values, cols, weeksThreshold)) return false;
    }

    // 3) Existing view logic
    if (view === VIEW.UNVAX)  return isUnvaccinated(values);
    if (view === VIEW.CLOSE)  return isCloseToDue(values);
    if (view === VIEW.IMMUNO) return isImmuno(values);

    //if (view === VIEW.CONSIDERING){
    //  const anySel = Object.values(selected).some(Boolean);
    //  return anySel ? passesFilters(values, cols) : false;
    //}

    if (view === VIEW.CONSIDERING){
      const anySel = Object.values(selected).some(Boolean);
      return anySel ? passesFilters(values, cols) : true;
    }

    return false;
  }

  function applyMojSortableChrome(tableSelector){
    const table = document.querySelector(tableSelector);
    if (!table) return;

    // Table needs the MOJ hook
    table.classList.add('moj-sortable-table');
    table.setAttribute('data-module', 'moj-sortable-table');

    // If you have a frozen Action col, detect it so indexes line up
    const hasAction =
      !!table.querySelector('tbody tr td:first-child.table-col-action') ||
      !!table.querySelector('thead th:first-child.table-col-action');
    const offset = hasAction ? 1 : 0;

    const ths = table.tHead ? Array.from(table.tHead.querySelectorAll('th')) : [];
    let visible = 0;

    ths.forEach((th, i) => {
      if (offset === 1 && i === 0) return; // skip Action header

      th.classList.add('moj-sortable-table__header');

      let btn = th.querySelector('button');
      const label = (btn ? btn.textContent : (th.textContent || '')).trim();
      if (!btn) {
        th.textContent = '';
        btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        th.appendChild(btn);
      }

      // The two key classes that give you MOJ look + behaviour
      btn.classList.add('moj-sortable-table__button', 'govuk-link');
      btn.setAttribute('data-index', String(offset + visible));

      // ARIA state – MOJ will update this as sorting changes
      th.setAttribute('aria-sort', 'none');

      visible++;
    });
  }

  // ---------- MOJ Sortable: init after each render ----------
  function initMojSortableTables(){
    try {
      if (!window.MOJFrontend) return false;
      if (MOJFrontend.initAll) MOJFrontend.initAll();
      var els = document.querySelectorAll('[data-module="moj-sortable-table"]');
      if (MOJFrontend.SortableTable && els.length){
        els.forEach(function(el){
          if(!el.__mojBound){ new MOJFrontend.SortableTable(el); el.__mojBound = true; }
        });
      }
      return true;
    } catch(e){ return false; }
  }
  // ----------------------------------------------------------

  // ---------------------------------------------------------------------------
  //  SECTION 6 — TABLE BUILDERS (HEADERS + ROWS)
  // ---------------------------------------------------------------------------
  function buildHeader(columns){
    theadRow.innerHTML='';
    suppressedHead.innerHTML='';

    // Action column (unchanged — handled separately, not part of COLUMN_ORDER)
    if (!hideAction) {
      var thA = document.createElement('th');
      thA.className = 'nhsuk-table__header is-sticky-col table-col-action';
      thA.textContent = 'Action';
      theadRow.appendChild(thA);
      suppressedHead.appendChild(thA.cloneNode(true));
    }

    var visibleIndex = 0;
    var actualIndexOffset = hideAction ? 0 : 1;

    // Use the configured column order (minus hidden columns)
    var orderedVisibleCols = getVisibleColumnsInOrder(columns);

    orderedVisibleCols.forEach(function(c){
      // Look up the friendly UI label; fall back to the raw column name
      var displayLabel = HEADING_LABELS[c] || c;

      function makeTh(){
        var th = document.createElement('th');
        th.className = 'nhsuk-table__header';
        th.setAttribute('scope','col');

        // Remember the ORIGINAL column key so other logic (dates, etc.) can still find it
        th.dataset.colKey = c;

        if (norm(c) === 'patient name') {
          th.classList.add('is-sticky-col');
          th.setAttribute('aria-sort', 'none');
        } else {
          th.setAttribute('aria-sort', 'none');
        }

        th.classList.add('moj-sortable-table__header');

        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'moj-sortable-table__button govuk-link';
        btn.textContent = displayLabel;

        // data-index aligns with MOJ sorting (offset for Action when present)
        btn.setAttribute('data-index', String(actualIndexOffset + visibleIndex));

        th.appendChild(btn);
        return th;
      }

      theadRow.appendChild(makeTh());
      suppressedHead.appendChild(makeTh());
      visibleIndex++;
    });
  }

  // build a row from ORIGINAL values (full array in data order),
  // but render cells in our configured COLUMN_ORDER.
  function buildRow(values, toSuppressed){
    var tr = document.createElement('tr');
    tr.dataset.key = keyFor(values);
    try{ tr.dataset.values = JSON.stringify(values); }catch(e){}

    // Action column (conditionally rendered, separate from COLUMN_ORDER)
    if (!hideAction) {
      var tdA = document.createElement('td');
      tdA.className = 'nhsuk-table__cell is-sticky-col table-col-action';
      var a = document.createElement('a');
      a.href = '#';
      a.className = 'nhsuk-link nhsuk-link--no-visited-state';
      if (toSuppressed) { a.setAttribute('data-add',''); a.textContent='Add back'; }
      else { a.setAttribute('data-remove',''); a.textContent='Remove'; }
      tdA.appendChild(a);
      tr.appendChild(tdA);
    }

    const { columns: cols, rows } = getDataset();

    if (!DATE_INDEXES.size) computeDateIndexes(cols); // initialise once per render

    var idxPID   = getColIndexByName(cols,'Patient ID');
    var idxPName = getColIndexByName(cols,'Patient name');
    var idxNHS   = getColIndexByName(cols,'NHS number');
    var idxDue   = getColIndexByName(cols,'Due date');

    // DOB index (DOB or Date of birth)
    var idxDOB = getColIndexByName(cols,'DOB');
    if (idxDOB < 0) idxDOB = getColIndexByName(cols,'Date of birth');

    // Use the same visible column ordering as the header
    var orderedVisibleCols = getVisibleColumnsInOrder(cols);

    orderedVisibleCols.forEach(function(colName){
      // Find the original index for this column in the data
      var i = getColIndexByName(cols, colName);
      if (i < 0) return; // safety

      var v = values[i];

      var td = document.createElement('td');
      td.className = 'nhsuk-table__cell';

      // Always keep Patient name sticky in the body
      if (i === idxPName) td.classList.add('is-sticky-col');

      // Sort keys
      if (i === idxNHS) {
        // NHS number – normalise to digits only so numeric sort is reliable
        td.setAttribute('data-sort-value', String(v || '').replace(/\D/g, ''));
      } else if (DATE_INDEXES.has(i) || i === idxDue || i === idxDOB) {
        // Any recognised date column (including Due date and DOB)
        setDateSortAttributes(td, v);
      }

      // Render cell content
      if (i === idxPName) {
        var pid = (idxPID >= 0 ? values[idxPID] : '');
        var link = document.createElement('a');

        // Your existing profile link behaviour
        link.href = '/patient-tracker/profile?pid=' + encodeURIComponent(pid) +
          '&addHistory=&selectVaccine=&chosenReason=&further-information=&fromPatientList=true';

        link.className = 'nhsuk-link nhsuk-link--no-visited-state';
        link.textContent = v || '';
        td.appendChild(link);

        // explicit sort key so A–Z / Z–A is stable and case-insensitive
        td.setAttribute('data-sort-value', String(v || '').toLowerCase().trim());
      } else {
        td.textContent = v == null ? '' : String(v);
      }

      tr.appendChild(td);
    });

    return tr;
  }

  // Considering filters
  function passesFilters(values,cols){
    var today=new Date(); today.setHours(0,0,0,0);
    var cutoff9=new Date(today); cutoff9.setMonth(cutoff9.getMonth()-9);
    var cutoff14=new Date(today.getTime()-14*24*60*60*1000);
    var idx=function(h){ return cols.findIndex(function(c){ return norm(c)===norm(h); }); };
    var get=function(h){ var i=idx(h); return i>=0?values[i]:''; };
    var vis=true;
    if(selected.fContacted && get('Contactable')!=='Yes') vis=false;
    if(selected.fPhone && get('Phone number')==='') vis=false;
    if(selected.f28w){ var e=parseDate(get('RSV eligible (28 weeks)')); if(isNaN(e)||(today<=e)) vis=false; }
    if(selected.fExpl && get('RSV side effects discussed')!=='Yes') vis=false;
    if(selected.fNo9m){ var l=parseDate(get('Date of last RSV vaccination')); if(!isNaN(l)&&l>=cutoff9) vis=false; }
    if(selected.fNoBook){ var b=parseDate(get('Date of RSV vaccination booking')); if(!isNaN(b)&&b>today) vis=false; }
    if(selected.fNo14){ var inv=parseDate(get('Date of last RSV invite')); if(!isNaN(inv)&&inv>=cutoff14) vis=false; }
    if(selected.fNoOther){
      var p=parseDate(get('Date of last Pertussis invite'));
      var f=parseDate(get('Date of last Flu invite'));
      var c=parseDate(get('Date of last COVID invite'));
      if((!isNaN(p)&&p>today)||(!isNaN(f)&&f>today)||(!isNaN(c)&&c>today)) vis=false;
    }
    return vis;
  }

  // Views for the secondary navigation tabs
  var VIEW={ CONSIDERING:'considering', UNVAX:'unvax', CLOSE:'close', IMMUNO:'immuno', REMOVED:'removed' };
  var currentView=VIEW.CONSIDERING;

  // Baseline counts from the data snapshot (used when useLiveCounts === false)
  var BASE_TOTAL=763;
  var BASE_COUNTS=(function(o){ o[VIEW.CONSIDERING]=54; o[VIEW.UNVAX]=395; o[VIEW.CLOSE]=122; o[VIEW.IMMUNO]=85; return o; })({});
  var REMOVED_TOTAL=736;

  var useLiveCounts=false;
  var removedKeys=new Set();

  function removedCount(){ return suppressedTbody.querySelectorAll('tr').length; }

  // ---------------------------------------------------------------------------
  //  SECTION 8 — VIEW RENDERERS (Filtered / Removed panels)
  // ---------------------------------------------------------------------------
  function renderView(view){
    const data = getData(); if(!data) return;
    const { columns: cols, rows } = getDataset();

    panelFiltered.classList.remove('hiddenPanel');
    panelSuppressed.classList.add('hiddenPanel');

    var sig = JSON.stringify(cols) + '|' + (hideAction ? 1 : 0);
    if (_headerSignature !== sig) {
      buildHeader(cols);
      _headerSignature = sig;

      // Ensure MOJ sortable chrome is applied to both tables after header rebuild
      applyMojSortableChrome('#filtered-table');
      applyMojSortableChrome('#suppressed-table');
    }
    tbody.innerHTML = '';

    // Build list for the requested view
    let list = [];
    rows.forEach(v => { if (includeInView(view, v, cols)) list.push(v); });

    // If this view is empty AND (we're in CONSIDERING with no filters chosen),
    // fall back to UNVAX so the page never looks empty on first load.
    //const anySel = Object.values(selected).some(Boolean);
    //if (!list.length && view === VIEW.CONSIDERING && !anySel) {
    //  view = VIEW.UNVAX;
    //  currentView = VIEW.UNVAX;
    //  list = [];
    //  rows.forEach(v => { if (includeInView(view, v, cols)) list.push(v); });
    //  setActiveNav(liUnvaccinated);
    //}

    // Optional "Order by" (your pill buttons)
    list = sortValuesList(cols, list);

    // Render rows
    const frag = document.createDocumentFragment();
    list.forEach(vals => frag.appendChild(buildRow(vals, false)));
    tbody.appendChild(frag);

    // Ensure MOJ sortable header styling is applied after rebuild
    applyMojSortableChrome('#filtered-table');

    if (rowCount) rowCount.value = tbody.querySelectorAll('tr').length;

    setNavLabels();
    setDetailsFor(view);

    // Pagination + MOJ sorter
    state.filteredPage = 1;
    renderFiltered();
    applyExplicitDateSortKeysForAllTables();
    initMojSortableTables();
  }

// ---------- PAGINATION (scoped delegation) ----------
// PAGE_SIZE — number of rows per page in each table
var PAGE_SIZE = 25;
var filteredPager = document.getElementById('filtered-pagination');
var suppressedPager = document.getElementById('suppressed-pagination');
if (!suppressedPager && panelSuppressed) {
  suppressedPager = document.createElement('div');
  suppressedPager.id = 'suppressed-pagination';
  suppressedPager.className = 'nhsuk-u-margin-top-4';
  panelSuppressed.appendChild(suppressedPager);
}
var state = { filteredPage: 1, suppPage: 1 };
var _headerSignature = null;

function getRows(tb){ return Array.from(tb.querySelectorAll('tr')); }
function totalPages(tb){ return Math.max(1, Math.ceil(getRows(tb).length / PAGE_SIZE)); }
function clamp(tb, p){ var t = totalPages(tb); return Math.min(Math.max(1, p), t); }
function showPage(tb, p){
  var rows = getRows(tb);
  var start = (p-1)*PAGE_SIZE, end = start + PAGE_SIZE;
  rows.forEach(function(r, i){ r.style.display = (i >= start && i < end) ? '' : 'none'; });
}

// Build the numbered page list to match NHS example
function buildNumberedList(total, current, ctx){
  var ul = document.createElement('ul');
  ul.className = 'nhsuk-pagination__list';

  function addPage(n){
    var li = document.createElement('li');
    li.className = 'nhsuk-pagination__item' + (n === current ? ' nhsuk-pagination__item--current' : '');
    var a = document.createElement('a');
    a.className = 'nhsuk-pagination__link';
    a.href = '#/';
    a.setAttribute('aria-label', 'Page ' + n);
    a.dataset.page = n;
    a.dataset.pager = ctx;
    a.textContent = n;
    if (n === current){
      a.setAttribute('aria-current', 'page');
    }
    li.appendChild(a);
    ul.appendChild(li);
  }

  function dots(){
    var li = document.createElement('li');
    li.className = 'nhsuk-pagination__item nhsuk-pagination__item--ellipsis';
    li.innerHTML = '&ctdot;';
    ul.appendChild(li);
  }

  var windowSize = 5;
  var start = Math.max(1, current - Math.floor(windowSize / 2));
  var end   = Math.min(total, start + windowSize - 1);
  start = Math.max(1, Math.min(start, total - windowSize + 1));

  if (start > 1){
    addPage(1);
    if (start > 2) dots();
  }

  for (var i = start; i <= end; i++){
    addPage(i);
  }

  if (end < total){
    if (end < total - 1) dots();
    addPage(total);
  }

  return ul;
}

// Build full NHS pagination nav (previous + numbered + next)
function buildPager(total, current, ctx){
  var nav = document.createElement('nav');
  nav.className = 'nhsuk-pagination nhsuk-pagination--numbered';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Pagination');

  // Previous link (only when not on first page)
  if (current > 1){
    var prev = document.createElement('a');
    prev.className = 'nhsuk-pagination__previous';
    prev.href = '#/';
    prev.rel = 'prev';
    prev.dataset.page = current - 1;
    prev.dataset.pager = ctx;
    prev.innerHTML =
      '<svg class="nhsuk-icon nhsuk-icon--arrow-left" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">' +
        '<path d="M10.7 6.3c.4.4.4 1 0 1.4L7.4 11H19a1 1 0 0 1 0 2H7.4l3.3 3.3c.4.4.4 1 0 1.4a1 1 0 0 1-1.4 0l-5-5A1 1 0 0 1 4 12c0-.3.1-.5.3-.7l5-5a1 1 0 0 1 1.4 0Z" />' +
      '</svg>' +
      '<span class="nhsuk-pagination__title">' +
        'Previous<span class="nhsuk-u-visually-hidden"> page</span>' +
      '</span>';
    nav.appendChild(prev);
  }

  // Numbered pages in the middle
  nav.appendChild(buildNumberedList(total, current, ctx));

  // Next link (only when not on last page)
  if (current < total){
    var next = document.createElement('a');
    next.className = 'nhsuk-pagination__next';
    next.href = '#/';
    next.rel = 'next';
    next.dataset.page = current + 1;
    next.dataset.pager = ctx;
    next.innerHTML =
      '<span class="nhsuk-pagination__title">' +
        'Next<span class="nhsuk-u-visually-hidden"> page</span>' +
      '</span>' +
      '<svg class="nhsuk-icon nhsuk-icon--arrow-right" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" focusable="false" aria-hidden="true">' +
        '<path d="m14.7 6.3 5 5c.2.2.3.4.3.7 0 .3-.1.5-.3.7l-5 5a1 1 0 0 1-1.4-1.4l3.3-3.3H5a1 1 0 0 1 0-2h11.6l-3.3-3.3a1 1 0 1 1 1.4-1.4Z" />' +
      '</svg>';
    nav.appendChild(next);
  }

  return nav;
}

function renderSection(tb, pagerEl, pageRef, ctx){
  if(!pagerEl) return;
  var current = clamp(tb, state[pageRef]);
  state[pageRef] = current;
  showPage(tb, current);
  pagerEl.innerHTML = '';
  pagerEl.appendChild(buildPager(totalPages(tb), current, ctx));
}

function renderFiltered(){
  renderSection(tbody, document.getElementById('filtered-pagination'), 'filteredPage', 'filtered');
  tbody.offsetHeight; // fix: force reflow so scroll works on first gesture
  afterFilteredRender();
}
function renderSupp(){
  renderSection(suppressedTbody, document.getElementById('suppressed-pagination'), 'suppPage', 'suppressed');
  suppressedTbody.offsetHeight; // fix—scroll works immediately
  afterSuppressedRender();
}

// Scoped delegation for clicks – relies on data-page + data-pager
function wirePaginationDelegation() {
  function delegate(containerId, stateKey, renderFn) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener('click', function (e) {
      var link = e.target.closest('.nhsuk-pagination__link');
      if (!link || !link.dataset.page || !link.dataset.pager || link.getAttribute('aria-disabled') === 'true') return;
      e.preventDefault();
      var page = parseInt(link.dataset.page, 10);
      if (!page) return;
      if (stateKey === 'filtered'){ state.filteredPage = page; renderFiltered(); }
      if (stateKey === 'suppressed'){ state.suppPage = page; renderSupp(); }
    });
  }
  delegate('filtered-pagination', 'filtered', renderFiltered);
  delegate('suppressed-pagination', 'suppressed', renderSupp);
}
wirePaginationDelegation();

// ---------------------------------------------------------------------------
//  SECTION 7 — PAGINATION ENGINE (scoped delegation)
// ---------------------------------------------------------------------------

// Make vertical scrolling feel normal when hovered over the scrollable panes
(function wireVerticalScrollPassthrough(){
  var panes = document.querySelectorAll('.moj-scrollable-pane');
  if (!panes.length) return;

  panes.forEach(function(pane){
    pane.addEventListener('wheel', function(e){
      // We only care about *mostly vertical* gestures
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) {
        return; // let horizontal swipes behave normally
      }

      // If the pane itself can scroll vertically, let the browser handle it
      var canScrollY =
        pane.scrollHeight > pane.clientHeight &&
        (
          (e.deltaY < 0 && pane.scrollTop > 0) ||
          (e.deltaY > 0 && pane.scrollTop + pane.clientHeight < pane.scrollHeight)
        );

      if (canScrollY) {
        return;
      }

      // Otherwise, prevent the pane from hijacking the event
      // and push the scroll to the page instead
      e.preventDefault();
      window.scrollBy(0, e.deltaY);
    }, { passive: false });
  });
})();

// ---------- /PAGINATION ----------

  // remove / add back — using the row's stable key + full values
  tbody.addEventListener('click',function(e){
    var t=e.target.closest('[data-remove]'); if(!t) return; e.preventDefault();
    var tr=t.closest('tr');
    var key=tr.dataset.key;
    var values=[]; try{ values=JSON.parse(tr.dataset.values||'[]'); }catch(_){ values=[]; }
    removedKeys.add(key);
    suppressedTbody.appendChild(buildRow(values,true));
    tr.remove();
    useLiveCounts=true;
    setNavLabels();
    setDetailsFor(currentView);
    renderFiltered(); renderSupp();
  });

  suppressedTbody.addEventListener('click',function(e){
    var t=e.target.closest('[data-add]'); if(!t) return; e.preventDefault();
    var tr=t.closest('tr');
    var key=tr.dataset.key;
    var values=[]; try{ values=JSON.parse(tr.dataset.values||'[]'); }catch(_){ values=[]; }
    removedKeys.delete(key);
    var data=getData(), cols=data.columns;
    if(includeInView(currentView, values, cols)){ tbody.appendChild(buildRow(values,false)); }
    tr.remove();
    useLiveCounts=true;
    setNavLabels();
    setDetailsFor(currentView);
    renderFiltered(); renderSupp();
  });

  function _pushDateEmptiesToBottom(table, colIndex){
    const tb = table.tBodies && table.tBodies[0];
    if (!tb) return;

    const rows = Array.from(tb.rows);
    if (!rows.length) return;

    // Partition rows by whether the active cell is empty (no sort key & marked)
    const withData = [];
    const empties  = [];
    rows.forEach(r => {
      const td = r.cells[colIndex];
      if (!td) { withData.push(r); return; }
      const hasKey = td.getAttribute('data-sort-value');
      const isEmpty = td.getAttribute('data-sort-empty') === '1' || (!hasKey && !td.textContent.trim());
      (isEmpty ? empties : withData).push(r);
    });

    if (!empties.length) return;

    const frag = document.createDocumentFragment();
    withData.concat(empties).forEach(r => frag.appendChild(r));
    tb.appendChild(frag);
  }

  // tabs
  function setActiveNav(target){
    [liFiltered,liUnvaccinated,liCloseToDueDate,liImmunosuppressed,liSuppressed].forEach(function(li){
      if(!li) return; li.classList.toggle('x-govuk-secondary-navigation__list-item--current', li===target);
    });
    [linkFiltered,linkUnvaccinated,linkCloseToDueDate,linkImmunosuppressed,linkSuppressed].forEach(function(a){
      if(!a) return; a.removeAttribute('aria-current');
    });
    var a=target&&target.querySelector('a'); if(a) a.setAttribute('aria-current','page');
  }

  function wireTabs(){
    linkFiltered.addEventListener('click',function(e){
      e.preventDefault(); currentView=VIEW.CONSIDERING; setActiveNav(liFiltered); renderView(currentView);
    });
    linkUnvaccinated.addEventListener('click',function(e){
      e.preventDefault(); currentView=VIEW.UNVAX; setActiveNav(liUnvaccinated); renderView(currentView);
    });
    linkCloseToDueDate.addEventListener('click',function(e){
      e.preventDefault(); currentView=VIEW.CLOSE; setActiveNav(liCloseToDueDate); renderView(currentView);
    });
    linkImmunosuppressed.addEventListener('click',function(e){
      e.preventDefault(); currentView=VIEW.IMMUNO; setActiveNav(liImmunosuppressed); renderView(currentView);
    });
    linkSuppressed.addEventListener('click',function(e){
      e.preventDefault();
      currentView=VIEW.REMOVED; setActiveNav(liSuppressed);
      panelSuppressed.classList.remove('hiddenPanel'); panelFiltered.classList.add('hiddenPanel');
      setNavLabels();
      renderRemovedParagraph();
      sortSuppressedTbody();
      renderSupp();
      // >>> Bind MOJ Sortable on the Removed table too
      applyExplicitDateSortKeysForAllTables();
      initMojSortableTables();
    });
  }

  // --- Clear-filters focus/press defuser (load + reload + BFCache) ---
  (function defuseClearFiltersFocus(){
    const clearBtn = document.getElementById('orderByAll');
    if (!clearBtn) return;

    // Never show as selected on load
    clearBtn.classList.remove('is-selected');

    // Temporarily remove focusability during first paint, then restore
    const prevTabIndex = clearBtn.getAttribute('tabindex');
    clearBtn.setAttribute('tabindex', '-1');

    // Ensure it's not pre-focused on load or BFCache restore
    const defocus = () => clearBtn.blur();
    requestAnimationFrame(defocus);
    setTimeout(defocus, 0);
    window.addEventListener('pageshow', defocus);

    // Restore focusability so keyboard users can tab to it
    setTimeout(() => {
      if (prevTabIndex === null) clearBtn.removeAttribute('tabindex');
      else clearBtn.setAttribute('tabindex', prevTabIndex);
    }, 200);

    // Prevent sticky :active on mouse down, but DO NOT blur on keyboard
    clearBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();      // stops :active sticking
      clearBtn.blur();         // drop mouse focus only
    });
  })();

  // --- Pill UI helpers ---
  function updateWeeksPillSelection(){
    const pills = document.querySelectorAll('#filterByButtons a[role="radio"]');

    pills.forEach(p => {
      p.classList.remove('is-selected');
      p.setAttribute('aria-checked', 'false');
    });

    if (weeksThreshold === 32) {
      const el = document.getElementById('orderBy32weeks');
      el?.classList.add('is-selected');
      el?.setAttribute('aria-checked', 'true');
    } else if (weeksThreshold === 36) {
      const el = document.getElementById('orderBy36weeks');
      el?.classList.add('is-selected');
      el?.setAttribute('aria-checked', 'true');
    } else {
      // No weeks filter active; none selected
    }
  }

  // --- Clear weeks + clear search (no reload) ---
  (function wireWeeksFilterPills(){
    const container = document.getElementById('filterByButtons');
    if (!container) return;

    updateWeeksPillSelection();

    container.addEventListener('click', function(e){
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // Detect whether this activation came from mouse or keyboard
      const isMouse = e.detail > 0; // Mouse clicks usually have detail=1; keyboard clicks are 0

      // Only blur (remove focus) if it's a mouse click
      if (isMouse) a.blur();

      if (a.id === 'orderBy32weeks') {
        weeksThreshold = 32;
        updateWeeksPillSelection();
        state.filteredPage = 1;
        renderView(currentView);
        renderFiltered();
        return;
      }

      if (a.id === 'orderBy36weeks') {
        weeksThreshold = 36;
        updateWeeksPillSelection();
        state.filteredPage = 1;
        renderView(currentView);
        renderFiltered();
        return;
      }

      if (a.id === 'orderByAll') {
        // Clear filters
        weeksThreshold = null;

        const input = document.querySelector('input[name="nameOrNhsNumber"]');
        if (input) input.value = '';

        const url = new URL(location.href);
        url.searchParams.delete('nameOrNhsNumber');
        history.replaceState({}, '', url.toString());

        updateWeeksPillSelection();
        const clearBtn = document.getElementById('orderByAll');
        clearBtn?.classList.remove('is-selected');

        state.filteredPage = 1;
        renderView(currentView);
        renderFiltered();

        // If keyboard activation, keep focus for visible ring; if mouse, blur
        if (isMouse) setTimeout(() => clearBtn?.blur(), 50);

        return;
      }
    });
  })();

  // --- Keyboard navigation for weeks filter pills ---
  (function makeWeeksPillsKeyboardFriendly(){
    const container = document.getElementById('filterByButtons');
    if (!container) return;
    const pills = Array.from(container.querySelectorAll('a[role="radio"]'));

    container.addEventListener('keydown', e => {
      const current = document.activeElement;
      const idx = pills.indexOf(current);
      if (idx === -1) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = pills[(idx + 1) % pills.length];
        next.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = pills[(idx - 1 + pills.length) % pills.length];
        prev.focus();
      }
    });
  })();

  // init
  var BASE_TOTAL=763;
  var BASE_COUNTS=(function(o){ o[VIEW.CONSIDERING]=54; o[VIEW.UNVAX]=395; o[VIEW.CLOSE]=122; o[VIEW.IMMUNO]=85; return o; })({});
  var useLiveCounts=false;

  function init(){
    if(!getData()){ console.error('No data'); return; }
    wireTabs();
    setNavLabels();

    // Start in Considering, but the renderView() now auto-falls back to UNVAX if empty
    currentView = VIEW.CONSIDERING;
    setActiveNav(liFiltered);
    renderView(currentView);

    state.filteredPage = 1; state.suppPage = 1;
    renderFiltered(); renderSupp();
  }
  window.addEventListener('load',init);
})();

function mojAudit(){
  const out = [];
  const mojCss = !!Array.from(document.styleSheets).find(s=>String(s.href||'').includes('moj-frontend'));
  const mojJs  = !!window.MOJFrontend;
  if(!mojCss) out.push('❌ MOJ CSS not detected');
  if(!mojJs)  out.push('❌ MOJ JS not detected');

  document.querySelectorAll('[data-module="moj-sortable-table"]').forEach((table,ti)=>{
    const headBtns = table.querySelectorAll('thead th > button.govuk-link');
    if(!headBtns.length) out.push(`❌ [T${ti}] No header buttons for sortable`);

    // Detect hidden first column (breaks index mapping)
    const firstThHidden = !!table.querySelector('thead th:first-child[style*="display:none"], thead th:first-child[hidden]');
    const firstTdHidden = !!table.querySelector('tbody td:first-child[style*="display:none"], tbody td:first-child[hidden]');
    if(firstThHidden || firstTdHidden) out.push(`❌ [T${ti}] First column hidden (Action col?) — breaks MOJ index alignment`);

    // Check index mapping vs presence of an Action cell in body
    const hasAction = !!table.querySelector('tbody tr td:first-child');
    headBtns.forEach((btn, i)=>{
      const idx = parseInt(btn.getAttribute('data-index'),10);
      if (hasAction && idx === i){
        out.push(`❌ [T${ti}] Header btn ${i} has data-index=${idx} (should be ${i+1} if Action col is at index 0)`);
      }
    });
  });

  // Pagination click target robustness
  const usesOldClass = !!document.querySelector('.nhsuk-pagination--numbered__link');
  if(usesOldClass) out.push('⚠️ Pagination uses deprecated class .nhsuk-pagination--numbered__link (prefer matching by [data-page][data-pager])');

  if(!out.length) console.log('%cMOJ/NHS audit: all good ✅','color:green');
  else out.forEach(m=>console.warn(m));
}

function retrofitHeaderButtons(tableSelector){
  const table = document.querySelector(tableSelector);
  if (!table) return;

  // Auto-detect if there is a leading Action column in TBODY/HEAD
  const hasAction =
    !!table.querySelector('tbody tr td:first-child.table-col-action') ||
    !!table.querySelector('thead th:first-child.table-col-action');

  const offset = hasAction ? 1 : 0;

  const ths = table.querySelectorAll('thead th');
  if (!ths.length) return;

  let visible = 0; // counts only data columns (skip Action th when present)
  ths.forEach((th, i) => {
    if (offset === 1 && i === 0) return; // skip the Action header cell

    th.classList.add('moj-sortable-table__header');

    const existingBtn = th.querySelector('button');
    if (existingBtn){
      existingBtn.classList.add('moj-sortable-table__button','govuk-link');
      existingBtn.setAttribute('data-index', String(offset + visible));
      visible++;
      return;
    }

    // Build a proper MOJ header button from existing label
    const label = (th.querySelector('a')?.textContent || th.textContent || '').trim();
    if (!label) { visible++; return; }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'moj-sortable-table__button govuk-link';
    btn.textContent = label;

    btn.setAttribute('data-index', String(offset + visible));
    th.appendChild(btn);

    visible++;
  });
}

function _wirePostSortFix(tableId){
  const table = document.getElementById(tableId);
  if (!table) return;

  // Delegate clicks on header buttons
  table.querySelector('thead')?.addEventListener('click', function(e){
    const btn = e.target.closest('button.govuk-link[data-index]');
    if (!btn) return;

    // Let MOJ do its sort first, then fix empties at the bottom
    const colIndex = parseInt(btn.getAttribute('data-index'), 10);
    setTimeout(() => _pushDateEmptiesToBottom(table, colIndex), 0);
  });
}

function afterFilteredRender(){
  applyMojSortableChrome('#filtered-table');
  if (window.MOJFrontend?.initAll) MOJFrontend.initAll();
  const el = document.getElementById('filtered-table');
  if (el && !el.__mojBound){ new MOJFrontend.SortableTable(el); el.__mojBound = true; }
}

function afterSuppressedRender(){
  applyMojSortableChrome('#suppressed-table');
  if (window.MOJFrontend?.initAll) MOJFrontend.initAll();
  const el = document.getElementById('suppressed-table');
  if (el && !el.__mojBound){ new MOJFrontend.SortableTable(el); el.__mojBound = true; }
}

(function wirePatientSearch(){
  const form  = document.querySelector('#filterByPatient form');
  if (!form) return;
  const input = form.querySelector('input[name="nameOrNhsNumber"]');

  form.addEventListener('submit', function(e){
    e.preventDefault();
    const params = new URLSearchParams(location.search);

    const val = (input?.value || '').trim();
    if (val) params.set('nameOrNhsNumber', val);
    else params.delete('nameOrNhsNumber');

    // ✅ Preserves hideAction and invite-type
    location.search = params.toString();
  });
})();




  (function () {
    function wireScrollFade(wrapperSelector) {
      var wrapper = document.querySelector(wrapperSelector);
      if (!wrapper) return;

      var pane = wrapper.querySelector('.moj-scrollable-pane');
      if (!pane) return;

      function update() {
        var maxScroll = pane.scrollWidth - pane.clientWidth;

        // No horizontal overflow – no fades
        if (maxScroll <= 0) {
          wrapper.classList.remove(
            'app-scroll-gradient--left',
            'app-scroll-gradient--right'
          );
          return;
        }

        var x = pane.scrollLeft;

        // Left fade if we've scrolled away from the very start
        wrapper.classList.toggle('app-scroll-gradient--left', x > 1);

        // Right fade if there's still content to the right
        wrapper.classList.toggle('app-scroll-gradient--right', x < maxScroll - 1);
      }

      pane.addEventListener('scroll', update);
      window.addEventListener('resize', update);

      // Initial check
      update();
    }

    window.addEventListener('load', function () {
      wireScrollFade('#panelFiltered .app-scroll-gradient');
      wireScrollFade('#panelSuppressed .app-scroll-gradient');
    });
  })();



  window.addEventListener('load', function () {
    // make sure GOV.UK marks the body as supported (prevents MOJ JS complaints)
    document.body.classList.add('govuk-frontend-supported');
    window.GOVUKFrontend?.initAll?.();
    window.MOJFrontend?.initAll?.();
  });



window.addEventListener('load', function(){
  const params = new URLSearchParams(location.search);
  const input = document.querySelector('input[name="nameOrNhsNumber"]');

  // If the query parameter is gone, ensure the box is blank
  if (input && !params.has('nameOrNhsNumber')) {
    input.value = '';
  }
});



(function(){
  let tries = 0;
  function ready(){
    const params = new URLSearchParams(location.search);
    const invite = (params.get('invite-type') || '').toLowerCase();
    const INVITE_IS_ALL = (invite === 'all');

    const tables = Array.from(document.querySelectorAll('table.nhsuk-table'));
    if (!tables.length || !document.querySelector('tbody tr')) {
      if (++tries < 60) return setTimeout(ready, 100);
      return;
    }

    tables.forEach(table => {
      const theadRow = table.tHead ? table.tHead.rows[0] : table.querySelector('thead tr');
      if (!theadRow) return;

      const headers = Array.from(theadRow.cells);
      const idxName   = headers.findIndex(th => th.textContent.trim().toLowerCase() === 'patient name');
      const idxAction = headers.findIndex(th => th.textContent.trim().toLowerCase() === 'action');

      // Always freeze Patient name
      if (idxName > -1) {
        headers[idxName].classList.add('is-sticky-col','sticky-patient');
        table.querySelectorAll('tbody tr').forEach(tr => {
          const td = tr.cells[idxName];
          if (td) td.classList.add('is-sticky-col','sticky-patient');
        });
      }

      // Freeze Action only for invite-type=all
      if (idxAction > -1) {
        if (INVITE_IS_ALL) {
          headers[idxAction].classList.add('is-sticky-col','sticky-action');
          table.querySelectorAll('tbody tr').forEach(tr => {
            const td = tr.cells[idxAction];
            if (td) td.classList.add('is-sticky-col','sticky-action');
          });
        } else {
          headers[idxAction].classList.remove('is-sticky-col','sticky-action');
          table.querySelectorAll('tbody tr').forEach(tr => {
            const td = tr.cells[idxAction];
            if (td) td.classList.remove('is-sticky-col','sticky-action');
          });
        }
      }

      // Offset Patient name by the Action column width (+ divider/border) so it never sits under Action
      let actionWidth = 0;
      if (idxAction > -1) {
        const el =
          headers[idxAction] ||
          table.querySelector(`tbody tr td:nth-child(${idxAction + 1})`);

        if (el) {
          const rect = el.getBoundingClientRect();
          const cs   = getComputedStyle(el);
          const br   = parseFloat(cs.borderRightWidth) || 0;
          const fudgeDivider = 1; // our ::after divider is 1px
          actionWidth = Math.ceil(rect.width + br + fudgeDivider);
        }
      }
      // Offset Patient name by the widest Action cell so it never sits underneath
      let offsetPx = 0;
      if (INVITE_IS_ALL && idxAction > -1){
        offsetPx = getMaxActionWidth(table, idxAction);
      }
      table.style.setProperty('--sticky-offset', offsetPx ? `${offsetPx}px` : '0px');
    });

    // Recalc after MOJ sort toggles
    const thead = table.tHead || table.querySelector('thead');
    if (thead){
      thead.addEventListener('click', () => {
        // allow MOJ to finish layout
        setTimeout(() => {
          const idxName   = findHeaderIndex(headers, 'patient name');
          const idxAction = findHeaderIndex(headers, 'action');
          const offsetPx  = (INVITE_IS_ALL && idxAction > -1) ? getMaxActionWidth(table, idxAction) : 0;
          table.style.setProperty('--sticky-offset', offsetPx ? `${offsetPx}px` : '0px');
        }, 0);
      });
    }

  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    ready();
  } else {
    document.addEventListener('DOMContentLoaded', ready);
  }
})();



(function(){
  /* ---------------- utilities ---------------- */
  function getHeaderText(th){
    const el = th.querySelector('button') || th;
    let txt = (el.textContent || '').toLowerCase().replace(/\s+/g,' ').trim();
    txt = txt.replace(/\s*(sorted?|ascending|descending|sort|by).*$/,'').trim();
    return txt;
  }
  function findHeaderIndex(headers, target){
    target = target.toLowerCase();
    for (let i=0;i<headers.length;i++){
      const label = getHeaderText(headers[i]);
      if (label === target || label.startsWith(target)) return i;
    }
    return -1;
  }
  function isVisible(el){
    // visible in layout (width/height > 0 and not display:none)
    return !!(el && el.offsetParent !== null && el.getClientRects().length);
  }
  // Measure the WIDEST Action cell (header + up to 50 rows) + border + divider
  function getMaxActionWidth(table, idxAction){
    if (idxAction < 0) return 0;
    let max = 0;

    const th = table.tHead ? table.tHead.rows[0].cells[idxAction] : null;
    if (th) max = Math.max(max, Math.ceil(th.getBoundingClientRect().width));

    const body = table.tBodies[0];
    const rows = body ? Array.from(body.rows) : [];
    for (const tr of rows.slice(0, 50)){
      const td = tr.cells[idxAction]; if (!td) continue;
      const w = Math.ceil(td.getBoundingClientRect().width);
      if (w > max) max = w;
    }

    let borderRight = 0;
    const refEl = th || (rows[0] && rows[0].cells[idxAction]);
    if (refEl){
      const cs = getComputedStyle(refEl);
      borderRight = parseFloat(cs.borderRightWidth) || 0;
    }
    const divider = 1; // ::after width
    return max + borderRight + divider;
  }

  function applyForTable(table, INVITE_TYPE){
    if (!isVisible(table)) return; // skip hidden panels; we'll catch them when shown
    const INVITE_IS_ALL = (INVITE_TYPE === 'all');

    const theadRow = table.tHead ? table.tHead.rows[0] : table.querySelector('thead tr');
    if (!theadRow) return;

    const headers = Array.from(theadRow.cells);
    const idxName   = findHeaderIndex(headers, 'patient name');
    const idxAction = findHeaderIndex(headers, 'action');

    // Clear previous classes
    headers.forEach(th => th.classList.remove('is-sticky-col','sticky-action','sticky-patient'));
    table.querySelectorAll('tbody td').forEach(td => td.classList.remove('is-sticky-col','sticky-action','sticky-patient'));

    // Always stick Patient name (header + body)
    if (idxName > -1){
      headers[idxName].classList.add('is-sticky-col','sticky-patient');
      table.querySelectorAll('tbody tr').forEach(tr => {
        const td = tr.cells[idxName]; if (td) td.classList.add('is-sticky-col','sticky-patient');
      });
    }

    // Stick Action only for invite-type=all
    if (idxAction > -1 && INVITE_IS_ALL){
      headers[idxAction].classList.add('is-sticky-col','sticky-action');
      table.querySelectorAll('tbody tr').forEach(tr => {
        const td = tr.cells[idxAction]; if (td) td.classList.add('is-sticky-col','sticky-action');
      });
    }

    // Compute left offset for Patient name
    const offsetPx = (INVITE_IS_ALL && idxAction > -1) ? getMaxActionWidth(table, idxAction) : 0;
    table.style.setProperty('--sticky-offset', offsetPx ? (offsetPx + 'px') : '0px');
  }

  /* --------------- apply everywhere --------------- */
  let rafToken = null;
  function recalcAll(){
    if (rafToken) return; // throttle to next frame
    rafToken = requestAnimationFrame(() => {
      rafToken = null;
      const params = new URLSearchParams(location.search);
      const invite = (params.get('invite-type') || '').toLowerCase();

      // Apply to all NHS tables currently in the DOM (visible panels will stick;
      // hidden panels will be handled when they become visible)
      const tables = Array.from(document.querySelectorAll('table.nhsuk-table'));
      tables.forEach(t => applyForTable(t, invite));
    });
  }

  // Recalc on:
  // - initial render (with async retry)
  // - window resize (column widths change)
  // - tab/sub-nav switches (DOM mutations or link clicks)
  let tries = 0;
  function ready(){
    const tables = document.querySelectorAll('table.nhsuk-table');
    const hasRows = !!document.querySelector('tbody tr');
    if (!tables.length || !hasRows){
      if (++tries < 60) return setTimeout(ready, 100);
    }
    recalcAll();
  }

  // Sub-navigation: listen for clicks on anything that looks like a subnav link or tab
  document.addEventListener('click', function(e){
    const a = e.target.closest('a, button, [role="tab"]');
    if (!a) return;
    // allow the panel to switch, then recalc
    setTimeout(recalcAll, 0);
  });

  // Mutations (panels shown/hidden via classes/attributes)
  const mo = new MutationObserver(() => setTimeout(recalcAll, 0));
  mo.observe(document.body, { attributes:true, childList:true, subtree:true });

  // Resize (container/table size changes)
  window.addEventListener('resize', recalcAll);

  if (document.readyState === 'complete' || document.readyState === 'interactive') ready();
  else document.addEventListener('DOMContentLoaded', ready);
})();

