// masterFileUpload.js
// Handles upload and parsing of the Master File (employee_details + SHIFT_DEFINITIONS).
// On successful parse, overwrites the in-memory arrays/objects declared in persistent_data.js.
// Dependencies: persistent_data.js (declares employee_details, SHIFT_DEFINITIONS as let/var),
//               hoursProcessing.js (parseTimeFormatToMinutes, formatMinutesTo24h)

// -----------------------------------------------
// INTERNAL HELPERS
// -----------------------------------------------

/**
 * Normalises an Excel time value to a clean "HH:MM" string.
 *
 * Excel can give us:
 *   - A fractional day number  (e.g. 0.25 = 06:00)
 *   - A string like "06:00", "6:00", "06.00", "6.30 AM"
 *   - An integer serial date (treat same as fractional, e.g. 0)
 *
 * Returns "" if the value cannot be resolved.
 */
function _excelTimeToHHMM(val) {
    if (val === null || val === undefined || val === '') return '';

    // Numeric fractional day (Excel time encoding)
    if (typeof val === 'number') {
        // Keep only the fractional part in case a full datetime serial slips through
        const frac = val % 1;
        const totalMins = Math.round(frac * 1440);
        return formatMinutesTo24h(totalMins);
    }

    // String — try parseTimeFormatToMinutes (handles HH:MM, HH.MM, h AM/PM, etc.)
    if (typeof val === 'string') {
        const mins = parseTimeFormatToMinutes(val.trim());
        if (mins !== null) return formatMinutesTo24h(mins);
    }

    return String(val).trim(); // last resort – return as-is
}

/**
 * Converts a YES/NO/TRUE/FALSE/1/0 cell value to a boolean.
 */
function _parseYesNo(val) {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number')  return val !== 0;
    const s = String(val).trim().toLowerCase();
    return s === 'yes' || s === 'true' || s === '1';
}

/**
 * Parses the "Allowed Shifts" cell, which may be:
 *   "A, G, C"  |  "A,G,C"  |  "W1"  |  ["W1","B"]
 * Returns an array of trimmed shift-key strings.
 */
function _parseAllowedShifts(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
    return String(val).split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
}

// -----------------------------------------------
// SHEET PARSERS
// -----------------------------------------------

/**
 * Parses Sheet 1 ("employee_details").
 * Expected headers (case-insensitive, order-insensitive):
 *   SP No | Employee Name | Designation | Skill Level | Allowed Shifts | In OT Allowed | Out OT Allowed
 *
 * @param {object} worksheet - SheetJS worksheet object
 * @returns {object[]} Parsed employee_details array
 */
function _parseEmployeeDetailsSheet(worksheet) {
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Normalise header keys: lower-case, strip spaces/punctuation for flexible matching
    const norm = str => String(str).toLowerCase().replace(/[\s_\-\.]/g, '');

    const parsed = [];

    rawRows.forEach((row, rowIdx) => {
        // Map raw keys to normalised keys once per row
        const get = targetNorm => {
            for (const key of Object.keys(row)) {
                if (norm(key) === targetNorm) return row[key];
            }
            return '';
        };

        const spNo = String(get('spno') || get('safetpassno') || get('safetypassno') || '').trim();
        if (!spNo) return; // skip blank / header echo rows

        const entry = {
            sp_no:         spNo,
            name:          String(get('employeename') || '').trim(),
            designation:   String(get('designation')  || '').trim().toLowerCase(),
            skill:         String(get('skilllevel')   || '').trim().toLowerCase(),
            allowedShifts: _parseAllowedShifts(
                               get('allowedshifts') || get('allowedshift') || ''
                           ),
            inOtAllowed:   _parseYesNo(get('inotallowed')  || get('inot')  || false),
            outOtAllowed:  _parseYesNo(get('outotallowed') || get('outot') || false)
        };

        parsed.push(entry);
        console.log(`[Master] employee_details[${rowIdx}]:`, entry);
    });

    return parsed;
}

/**
 * Parses Sheet 2 ("shift_definitions").
 * Expected headers (case-insensitive):
 *   Shift Name | In | Out
 *
 * @param {object} worksheet - SheetJS worksheet object
 * @returns {object} SHIFT_DEFINITIONS map  { shiftKey: { shiftIn, shiftOut }, … }
 */
function _parseShiftDefinitionsSheet(worksheet) {
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const norm = str => String(str).toLowerCase().replace(/[\s_\-\.]/g, '');

    const defs = {};

    rawRows.forEach((row, rowIdx) => {
        const get = targetNorm => {
            for (const key of Object.keys(row)) {
                if (norm(key) === targetNorm) return row[key];
            }
            return '';
        };

        const shiftName = String(get('shiftname') || get('shift') || get('name') || '').trim();
        if (!shiftName) return;

        const shiftIn  = _excelTimeToHHMM(get('in')  || get('shiftin')  || '');
        const shiftOut = _excelTimeToHHMM(get('out') || get('shiftout') || '');

        const entry = { shiftIn, shiftOut };
        defs[shiftName] = entry;
        console.log(`[Master] SHIFT_DEFINITIONS["${shiftName}"]:`, entry);
    });

    return defs;
}

// -----------------------------------------------
// MAIN HANDLER
// -----------------------------------------------

/**
 * Handles the "Upload Master File" input change event.
 * Reads the selected XLSX, parses both sheets, logs the results, and replaces
 * the runtime employee_details and SHIFT_DEFINITIONS globals.
 */
async function handleMasterFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const masterStatusEl = document.getElementById('masterFileStatus');

    const setStatus = (text, type) => {
        if (!masterStatusEl) return;
        masterStatusEl.textContent = text;
        masterStatusEl.className   = `master-file-badge master-file-badge--${type}`;
    };

    setStatus('Processing...', 'loading');

    try {
        const data     = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });

        console.groupCollapsed(`[Master File Upload] "${file.name}"`);
        console.log('Sheets found:', workbook.SheetNames);

        // ---- Sheet 1: employee_details ----
        const empSheetName = workbook.SheetNames.find(n =>
            n.toLowerCase().replace(/\s/g, '') === 'employeedetails'
        ) || workbook.SheetNames[0];

        if (!empSheetName) throw new Error('Could not locate "employee_details" sheet (Sheet 1).');

        console.group(`Sheet 1 → "${empSheetName}" (employee_details)`);
        const parsedEmployees = _parseEmployeeDetailsSheet(workbook.Sheets[empSheetName]);
        console.groupEnd();

        // ---- Sheet 2: shift_definitions ----
        const shiftSheetName = workbook.SheetNames.find(n =>
            n.toLowerCase().replace(/\s/g, '') === 'shiftdefinitions'
        ) || workbook.SheetNames[1];

        if (!shiftSheetName) throw new Error('Could not locate "shift_definitions" sheet (Sheet 2).');

        console.group(`Sheet 2 → "${shiftSheetName}" (shift_definitions)`);
        const parsedShifts = _parseShiftDefinitionsSheet(workbook.Sheets[shiftSheetName]);
        console.groupEnd();

        console.groupEnd(); // Master File Upload

        // ---- Overwrite globals ----
        // employee_details and SHIFT_DEFINITIONS are declared as `const` in persistent_data.js
        // but we need to reassign them. Use the window object as a workaround while keeping
        // backward-compatibility with all existing references.
        //
        // IMPORTANT: persistent_data.js must declare these with `let` (or use window.X = …)
        // for this reassignment to work at runtime. If they are `const`, we splice in-place.

        try {
            // Try direct reassignment (works if declared with `let` / `var`)
            employee_details.length = 0;
            parsedEmployees.forEach(e => employee_details.push(e));
        } catch (_) {
            console.warn('[Master] Could not splice employee_details – trying window assignment.');
            window.employee_details = parsedEmployees;
        }

        try {
            // Clear and repopulate SHIFT_DEFINITIONS object in-place
            Object.keys(SHIFT_DEFINITIONS).forEach(k => delete SHIFT_DEFINITIONS[k]);
            Object.assign(SHIFT_DEFINITIONS, parsedShifts);
        } catch (_) {
            console.warn('[Master] Could not mutate SHIFT_DEFINITIONS – trying window assignment.');
            window.SHIFT_DEFINITIONS = parsedShifts;
        }

        console.log('[Master] Updated employee_details:', employee_details);
        console.log('[Master] Updated SHIFT_DEFINITIONS:', SHIFT_DEFINITIONS);

        setStatus(`Loaded: ${file.name}`, 'success');

    } catch (err) {
        console.error('[Master File Upload] Error:', err);
        setStatus(`Error: ${err.message}`, 'error');
    }

    // Reset input so the same file can be re-uploaded if needed
    event.target.value = '';
}
