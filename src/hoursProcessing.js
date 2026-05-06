// hoursProcessing.js
// Date/time normalisation, shift assignment, and hours calculation functions.
// Dependencies: main.js (SHIFT_DEFINITIONS, masterEmployeeDetails)

// -----------------------------------------------
// DATE & TIME NORMALISATION FUNCTIONS
// -----------------------------------------------

/**
 * Converts a time string (e.g. "06:30", "6.30", "6:30 AM") to minutes since midnight.
 * Returns null if the string cannot be parsed.
 */
function parseTimeFormatToMinutes(timeStr) {
    try {
        // Regex to match HH:MM, HH:MM:SS, HH.MM, H AM/PM, etc.
        const timeMatch = String(timeStr).trim().match(/^(\d{1,2})[:.]?(\d{2})?[:.]?(\d{2})?\s*([aApP][mM])?$/);
        if (!timeMatch) return null;

        let hours = parseInt(timeMatch[1], 10);
        const mins = parseInt(timeMatch[2] || '0', 10);
        // We ignore seconds (timeMatch[3]) as the tool calculates based on minutes.
        const period = timeMatch[4] ? timeMatch[4].toUpperCase() : null;

        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        return hours * 60 + mins;
    } catch (err) {
        console.error('parseTimeFormatToMinutes error:', err);
        return null;
    }
}

/**
 * Formats minutes since midnight to a "HH:MM" 24-hour string.
 */
function formatMinutesTo24h(totalMinutes) {
    try {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    } catch (err) {
        console.error('formatMinutesTo24h error:', err);
        return '';
    }
}

/**
 * Normalises a raw date string to a clean DD-MM-YYYY (or similar) format.
 * Replaces slashes with dashes and strips garbage from regex captures.
 */
function normalizeDate(dateStr) {
    try {
        if (!dateStr) return 'N/A';

        let clean = dateStr.replace(/[\\/\\.]/g, '-').trim();

        const strictMatch = clean.match(/(\d{1,2}[-\s/.]\d{1,2}[-\s/.]\d{2,4})/);
        if (strictMatch) {
            clean = strictMatch[1].replace(/\s+/g, '-');
        }

        return clean;
    } catch (err) {
        console.error('normalizeDate error:', err);
        return 'N/A';
    }
}

/**
 * Parses a date string (DD-MM-YYYY or DD/MM/YYYY) into a sortable timestamp (ms).
 */
function parseSortableDate(dateStr) {
    try {
        if (!dateStr || dateStr === 'N/A') return 0;
        const parts = dateStr.split(/[-\/\.]/);
        if (parts.length === 3) {
            const day   = parseInt(parts[0], 10);
            let month = parseInt(parts[1], 10) - 1;
            if (isNaN(month)) {
                const monthNames = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
                month = monthNames[(parts[1] || '').toLowerCase()] || 0;
            }
            let year  = parseInt(parts[2], 10);
            if (year < 100) year += 2000;
            return new Date(year, month, day).getTime();
        }
        return 0;
    } catch (err) {
        console.error('parseSortableDate error:', err);
        return 0;
    }
}

// -----------------------------------------------
// HOURS CALCULATION FUNCTIONS
// -----------------------------------------------

/**
 * Calculates duty-in and duty-out (in minutes) from punch times and shift boundaries.
 * Applies OT grace/penalty rules (round to nearest 30 min).
 *
 * @returns {{ dutyInMins: number|null, dutyOutMins: number|null }}
 */
function calculateHours(inTimeStr, outTimeStr, shiftInStr, shiftOutStr, allowedOtIn, allowedOtOut) {
    try {
        if (
            !inTimeStr || !outTimeStr ||
            String(inTimeStr).toLowerCase()  === 'off' ||
            String(outTimeStr).toLowerCase() === 'off'
        ) {
            return { dutyInMins: null, dutyOutMins: null };
        }

        const inMins       = parseTimeFormatToMinutes(inTimeStr);
        const outMins      = parseTimeFormatToMinutes(outTimeStr);
        const shiftInMins  = shiftInStr  ? parseTimeFormatToMinutes(shiftInStr)  : null;
        const shiftOutMins = shiftOutStr ? parseTimeFormatToMinutes(shiftOutStr) : null;

        if (inMins === null || outMins === null) {
            return { dutyInMins: null, dutyOutMins: null };
        }

        let dutyInMins  = inMins;
        let dutyOutMins = outMins;

        // Guard: if punch-in and punch-out are < 60 min apart, treat as zero-hour day
        // (also prevents erroneous Night-Shift allocation, e.g. 06:01 → 06:10)
        let diffRaw = outMins - inMins;
        if (diffRaw < 0) diffRaw += 1440; // wrap around midnight

        if (diffRaw < 60) {
            return { dutyInMins: inMins, dutyOutMins: inMins };
        }

        // --- IN TIME LOGIC ---
        if (shiftInMins !== null) {
            let nInMins = inMins;
            // Handle cross-day discrepancy (e.g. shift starts 22:00, punched at 01:00)
            if (inMins < shiftInMins - 720) nInMins += 1440;
            else if (inMins > shiftInMins + 720) nInMins -= 1440;

            if (nInMins > shiftInMins + 15) {
                // Late check-in: round UP to nearest 30 min (penalty)
                let r = Math.ceil(nInMins / 30) * 30;
                dutyInMins = (r % 1440 + 1440) % 1440;
            } else if (allowedOtIn && (shiftInMins - nInMins > 29)) {
                // Early OT: round UP to nearest 30 min (reward)
                let r = Math.ceil(nInMins / 30) * 30;
                dutyInMins = (r % 1440 + 1440) % 1440;
            } else {
                // Normal / within grace period
                dutyInMins = shiftInMins;
            }
        } else {
            // No shift assigned – round both ends to nearest 30
            dutyInMins  = Math.ceil(inMins  / 30) * 30;
            dutyOutMins = Math.floor(outMins / 30) * 30;
        }

        // --- OUT TIME LOGIC ---
        if (shiftOutMins !== null && shiftInMins !== null) {
            let nOutMins  = outMins;
            if (outMins < inMins) nOutMins += 1440;

            let nShiftOut = shiftOutMins;
            if (shiftOutMins < shiftInMins) nShiftOut += 1440;

            if (nOutMins < nShiftOut) {
                // Early leaver: round DOWN to nearest 30 min (penalty)
                let r = Math.floor(nOutMins / 30) * 30;
                dutyOutMins = (r % 1440 + 1440) % 1440;
            } else if (allowedOtOut) {
                // OT out: round DOWN to nearest 30 min (reward)
                let r = Math.floor(nOutMins / 30) * 30;
                dutyOutMins = (r % 1440 + 1440) % 1440;
            } else {
                // Normal departure – cap at shift end
                dutyOutMins = shiftOutMins;
            }
        } else if (shiftOutMins !== null) {
            dutyOutMins = shiftOutMins;
        }

        return { dutyInMins, dutyOutMins };
    } catch (err) {
        console.error('calculateHours error:', err);
        return { dutyInMins: null, dutyOutMins: null };
    }
}

/**
 * Calculates duty hours directly from duty-in/out.
 */
function calculateDutyHours(dutyInMins, dutyOutMins, shiftOutMins, shiftStr, addLunch) {
    if (dutyInMins === null || dutyOutMins === null) return 0;

    let diffMins = dutyOutMins - dutyInMins;
    let actualOut = dutyOutMins;
    if (dutyOutMins < dutyInMins) {
        diffMins += 1440;
        actualOut += 1440;
    }
    if (diffMins < 0) diffMins = 0;

    if (!addLunch) {
        // Calculate overlap with 12:00 PM (720 mins) to 1:00 PM (780 mins)
        let overlap1 = Math.max(0, Math.min(actualOut, 780) - Math.max(dutyInMins, 720));
        let overlap2 = Math.max(0, Math.min(actualOut, 780 + 1440) - Math.max(dutyInMins, 720 + 1440));
        diffMins -= (overlap1 + overlap2);
    }

    if (diffMins < 30) return 0;

    return diffMins / 60;
}

/**
 * Calculates OT hours (in decimal) for an employee.
 * OT is only granted for >= 1 full hour before/after the shift boundary.
 * Result is rounded down to the nearest 0.5 h.
 */
function calculateOtHours(employeeId, shiftInMins, shiftOutMins, dutyInMins, dutyOutMins) {
    if (shiftOutMins === null || dutyOutMins === null || dutyInMins === null || shiftInMins === null) return 0;

    const empDetails = (typeof masterEmployeeDetails !== 'undefined' && masterEmployeeDetails.length > 0)
        ? masterEmployeeDetails.find(e => e.sp_no === employeeId)
        : null;

    if (!empDetails) return 0;

    let inOt = 0, outOt = 0;

    // Midnight-aware signed difference
    function getDiff(target, actual, isArrival) {
        let d = isArrival ? (target - actual) : (actual - target);
        if (d < -720) d += 1440;
        if (d >  720) d -= 1440;
        return d;
    }

    if (empDetails.inOtAllowed) {
        const diffIn = getDiff(shiftInMins, dutyInMins, true);
        if (diffIn > 59) inOt = diffIn;
    }

    if (empDetails.outOtAllowed) {
        const diffOut = getDiff(shiftOutMins, dutyOutMins, false);
        if (diffOut > 59) outOt = diffOut;
    }

    // Round down to nearest 0.5 h
    const totalOtMins = inOt + outOt;
    const otHours     = Math.floor(totalOtMins / 30) * 0.5;

    return otHours;
}

// -----------------------------------------------
// SHIFT ASSIGNMENT
// -----------------------------------------------

function _normalizeShiftKey(shiftKey) {
    return String(shiftKey || '').trim().toUpperCase();
}

function _resolveShiftDefinitionKey(shiftKey) {
    const rawKey = String(shiftKey || '').trim();
    if (!rawKey) return '';
    const shiftDefinitions = _getActiveShiftDefinitions();
    if (shiftDefinitions[rawKey]) return rawKey;

    const normalizedKey = _normalizeShiftKey(rawKey);
    return Object.keys(shiftDefinitions).find(key => _normalizeShiftKey(key) === normalizedKey) || rawKey;
}

function _getActiveShiftDefinitions() {
    const hasUploadedMaster = typeof masterFileUploaded !== 'undefined' && masterFileUploaded;
    if (!hasUploadedMaster && typeof DEFAULT_SHIFT_DEFINITIONS !== 'undefined') {
        return DEFAULT_SHIFT_DEFINITIONS;
    }

    return SHIFT_DEFINITIONS;
}

function _getDefaultShiftDefinitions() {
    if (typeof DEFAULT_SHIFT_DEFINITIONS !== 'undefined') {
        return DEFAULT_SHIFT_DEFINITIONS;
    }

    return SHIFT_DEFINITIONS;
}

function _getEmployeeMasterDetails(employeeId) {
    if (typeof masterEmployeeDetails === 'undefined' || !Array.isArray(masterEmployeeDetails)) {
        return null;
    }

    const targetId = String(employeeId || '').trim();
    return masterEmployeeDetails.find(e => String(e.sp_no || '').trim() === targetId) || null;
}

function _getShiftCandidatesForEmployee(employeeId) {
    const shiftDefinitions = _getActiveShiftDefinitions();
    const empDetails = _getEmployeeMasterDetails(employeeId);
    const allowedShifts = empDetails && Array.isArray(empDetails.allowedShifts)
        ? empDetails.allowedShifts
        : [];

    if (allowedShifts.length > 0) {
        const seen = new Set();
        const resolvedAllowed = [];

        allowedShifts.forEach(shiftKey => {
            const resolvedKey = _resolveShiftDefinitionKey(shiftKey);
            if (!shiftDefinitions[resolvedKey]) return;

            const normalizedKey = _normalizeShiftKey(resolvedKey);
            if (seen.has(normalizedKey)) return;

            seen.add(normalizedKey);
            resolvedAllowed.push(resolvedKey);
        });

        if (resolvedAllowed.length > 0) return resolvedAllowed;
    }

    return Object.keys(shiftDefinitions);
}

function _timeDiffMinutes(a, b) {
    let d = Math.abs(a - b);
    if (d > 720) d = 1440 - d;
    return d;
}

function _estimateShiftOverlapMins(punchInMins, punchOutMins, shiftInMins, shiftOutMins) {
    let actualIn = punchInMins;
    let actualOut = punchOutMins;
    let normalizedShiftOut = shiftOutMins;

    if (actualIn === null || actualOut === null) {
        let duration = normalizedShiftOut - shiftInMins;
        if (duration < 0) duration += 1440;
        return duration;
    }

    if (actualOut < actualIn) actualOut += 1440;
    if (normalizedShiftOut < shiftInMins) normalizedShiftOut += 1440;

    if (actualIn < shiftInMins - 720) actualIn += 1440;
    if (actualIn > shiftInMins + 720) actualIn -= 1440;
    if (actualOut < actualIn) actualOut += 1440;

    return Math.max(0, Math.min(actualOut, normalizedShiftOut) - Math.max(actualIn, shiftInMins));
}

function _scoreShiftCandidate(shiftKey, punchInMins, punchOutMins, shiftDefinitions, enforceMatchWindow = true) {
    const definitions = shiftDefinitions || _getActiveShiftDefinitions();
    const def = definitions[shiftKey];
    if (!def) return null;

    const shiftInMins  = parseTimeFormatToMinutes(def.shiftIn);
    const shiftOutMins = parseTimeFormatToMinutes(def.shiftOut);
    if (shiftInMins === null || shiftOutMins === null) return null;

    const diffs = [];
    if (punchInMins  !== null) diffs.push(_timeDiffMinutes(punchInMins,  shiftInMins));
    if (punchOutMins !== null) diffs.push(_timeDiffMinutes(punchOutMins, shiftOutMins));
    if (diffs.length === 0) return null;

    const avgDiff = diffs.reduce((sum, diff) => sum + diff, 0) / diffs.length;
    const bestEdgeDiff = Math.min(...diffs);

    if (enforceMatchWindow && avgDiff > 120 && bestEdgeDiff > 120) return null;

    return {
        shiftKey,
        score: avgDiff,
        overlapMins: _estimateShiftOverlapMins(punchInMins, punchOutMins, shiftInMins, shiftOutMins)
    };
}

function isPunchInForOvernightShift(employeeId, punchIn) {
    const punchInMins = punchIn ? parseTimeFormatToMinutes(punchIn) : null;
    if (punchInMins === null) return false;

    return _getShiftCandidatesForEmployee(employeeId).some(shiftKey => {
        const def = _getActiveShiftDefinitions()[shiftKey];
        if (!def) return false;

        const shiftInMins  = parseTimeFormatToMinutes(def.shiftIn);
        const shiftOutMins = parseTimeFormatToMinutes(def.shiftOut);
        if (shiftInMins === null || shiftOutMins === null) return false;
        if (shiftOutMins >= shiftInMins) return false;

        return _timeDiffMinutes(punchInMins, shiftInMins) <= 180;
    });
}

function _sortShiftCandidates(candidates) {
    candidates.sort((a, b) => {
        const scoreGap = Math.abs(a.score - b.score);
        if (scoreGap <= 30) {
            const overlapDiff = b.overlapMins - a.overlapMins;
            if (overlapDiff !== 0) return overlapDiff;
        }
        return a.score - b.score;
    });

    return candidates;
}

function _getNearestDefaultShift(punchInMins, punchOutMins) {
    const defaultDefinitions = _getDefaultShiftDefinitions();
    const candidates = Object.keys(defaultDefinitions)
        .map(shiftKey => _scoreShiftCandidate(shiftKey, punchInMins, punchOutMins, defaultDefinitions, false))
        .filter(Boolean);

    if (candidates.length === 0) return 'NA';

    return _sortShiftCandidates(candidates)[0].shiftKey;
}

/**
 * Assigns the best matching shift key for an employee based on punch-in / punch-out times.
 * Uses the employee's uploaded master allowed shifts first. If no master file has
 * been uploaded, candidates come from DEFAULT_SHIFT_DEFINITIONS in main.js.
 *
 * @returns {string} Shift key (e.g. 'A', 'B', 'C', 'G', 'W1', or 'NA')
 */
function assignShift(employeeId, punchIn, punchOut) {
    let punchInMins = null;
    let punchOutMins = null;

    try {
        punchInMins  = punchIn  ? parseTimeFormatToMinutes(punchIn)  : null;
        punchOutMins = punchOut ? parseTimeFormatToMinutes(punchOut) : null;

        const candidates = _getShiftCandidatesForEmployee(employeeId)
            .map(shiftKey => _scoreShiftCandidate(shiftKey, punchInMins, punchOutMins))
            .filter(Boolean);

        if (candidates.length === 0) {
            const fallbackShift = _getNearestDefaultShift(punchInMins, punchOutMins);
            console.log(`assignShift: ${employeeId} -> punchIn=${punchIn}, punchOut=${punchOut}, assigned=${fallbackShift} (default fallback)`);
            return fallbackShift;
        }

        const bestShift = _sortShiftCandidates(candidates)[0].shiftKey;
        console.log(`assignShift: ${employeeId} -> punchIn=${punchIn}, punchOut=${punchOut}, assigned=${bestShift}`);
        return bestShift;
    } catch (err) {
        console.error('assignShift error:', err);
        return _getNearestDefaultShift(punchInMins, punchOutMins);
    }
}
