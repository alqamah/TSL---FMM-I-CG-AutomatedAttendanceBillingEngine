// hoursProcessing.js
// Date/time normalisation, shift assignment, and hours calculation functions.
// Dependencies: persistent_data.js (SHIFT_DEFINITIONS, employee_details)

// -----------------------------------------------
// DATE & TIME NORMALISATION FUNCTIONS
// -----------------------------------------------

/**
 * Converts a time string (e.g. "06:30", "6.30", "6:30 AM") to minutes since midnight.
 * Returns null if the string cannot be parsed.
 */
function parseTimeFormatToMinutes(timeStr) {
    try {
        const timeMatch = String(timeStr).trim().match(/^(\d{1,2})[.:]?(\d{2})?\s*([aApP][mM])?$/);
        if (!timeMatch) return null;

        let hours = parseInt(timeMatch[1], 10);
        const mins = parseInt(timeMatch[2] || '0', 10);
        const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

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

        let clean = dateStr.replace(/\//g, '-').trim();

        const strictMatch = clean.match(/(\d{1,2}[-\s/]\d{1,2}[-\s/]\d{2,4})/);
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
        const parts = dateStr.split(/[-\/]/);
        if (parts.length === 3) {
            const day   = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year  = parseInt(parts[2], 10);
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
 * Calculates net duty hours from duty-in/out, honouring max-duty caps and lunch deduction.
 */
function calculateDutyHours(dutyInMins, dutyOutMins, shiftOutMins, shiftStr, addLunch) {
    if (dutyInMins === null || dutyOutMins === null) return 0;

    const endMins = shiftOutMins !== null ? shiftOutMins : dutyOutMins;

    let diffActual = dutyOutMins - dutyInMins;
    if (dutyOutMins < dutyInMins) diffActual += 1440;

    let diffShift = endMins - dutyInMins;
    if (endMins < dutyInMins) diffShift += 1440;

    let diffMins = Math.min(diffActual, diffShift);
    if (diffMins < 0) diffMins = 0;

    let totalHours = diffMins / 60;
    let maxDuty    = 8;

    if (shiftStr === 'G' || shiftStr === 'W1') {
        if (!addLunch) {
            totalHours = Math.max(0, totalHours - 1); // deduct 1-hour lunch break
        } else {
            maxDuty = 9;
        }
    }

    let dutyHours = Math.min(maxDuty, totalHours);

    if (diffActual < 30) {
        dutyHours = 0;
    }

    return dutyHours;
}

/**
 * Calculates OT hours (in decimal) for an employee.
 * OT is only granted for >= 1 full hour before/after the shift boundary.
 * Result is rounded down to the nearest 0.5 h.
 */
function calculateOtHours(employeeId, shiftInMins, shiftOutMins, dutyInMins, dutyOutMins) {
    if (shiftOutMins === null || dutyOutMins === null || dutyInMins === null || shiftInMins === null) return 0;

    const empDetails = (typeof employee_details !== 'undefined')
        ? employee_details.find(e => e.sp_no === employeeId)
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

/**
 * Assigns the best matching shift key for an employee based on punch-in / punch-out times.
 * Priority: A/B/C shifts matched via punch-in proximity → fallback via punch-out proximity
 *           → G/W1 general shifts matched via combined proximity + estimated working hours.
 *
 * @returns {string} Shift key (e.g. 'A', 'B', 'C', 'G', 'W1', or 'NA')
 */
function assignShift(employeeId, punchIn, punchOut) {
    try {
        const punchInMins  = punchIn  ? parseTimeFormatToMinutes(punchIn)  : null;
        const punchOutMins = punchOut ? parseTimeFormatToMinutes(punchOut) : null;

        const abcShifts = ['A', 'B', 'C'];
        const gwShifts  = ['G', 'W1'];

        let bestShift = 'NA';
        let bestDiff  = Infinity;

        // Midnight-aware absolute difference
        function timeDiff(a, b) {
            let d = Math.abs(a - b);
            if (d > 720) d = 1440 - d;
            return d;
        }

        // Step 1a: Match A/B/C via punch-in proximity to shiftIn
        if (punchInMins !== null) {
            abcShifts.forEach(shiftKey => {
                const def = SHIFT_DEFINITIONS[shiftKey];
                if (!def) return;
                const target = parseTimeFormatToMinutes(def.shiftIn);
                if (target === null) return;

                const diff = timeDiff(punchInMins, target);
                if (diff <= 120 && diff < bestDiff) {
                    bestDiff  = diff;
                    bestShift = shiftKey;
                }
            });
        }

        // Step 1b: Fallback – match A/B/C via punch-out proximity to shiftOut
        if (bestShift === 'NA' && punchOutMins !== null) {
            abcShifts.forEach(shiftKey => {
                const def = SHIFT_DEFINITIONS[shiftKey];
                if (!def) return;
                const target = parseTimeFormatToMinutes(def.shiftOut);
                if (target === null) return;

                const diff = timeDiff(punchOutMins, target);
                if (diff <= 120 && diff < bestDiff) {
                    bestDiff  = diff;
                    bestShift = shiftKey;
                }
            });
        }

        // Step 2: Evaluate G/W1 via combined proximity + estimated working hours
        const gwCandidates = [];
        gwShifts.forEach(shiftKey => {
            const def = SHIFT_DEFINITIONS[shiftKey];
            if (!def) return;

            const shiftInMins  = parseTimeFormatToMinutes(def.shiftIn);
            const shiftOutMins = parseTimeFormatToMinutes(def.shiftOut);
            if (shiftInMins === null || shiftOutMins === null) return;

            let totalDiff  = 0;
            let matchCount = 0;

            if (punchInMins  !== null) { totalDiff += timeDiff(punchInMins,  shiftInMins);  matchCount++; }
            if (punchOutMins !== null) { totalDiff += timeDiff(punchOutMins, shiftOutMins); matchCount++; }

            if (matchCount > 0) {
                const avgDiff = totalDiff / matchCount;
                if (avgDiff <= 120) {
                    const effectiveIn  = punchInMins  !== null ? Math.max(punchInMins,  shiftInMins)  : shiftInMins;
                    const effectiveOut = punchOutMins !== null ? Math.min(punchOutMins, shiftOutMins) : shiftOutMins;
                    let estMins = effectiveOut - effectiveIn;
                    if (estMins < 0)    estMins += 1440;
                    if (estMins > 720)  estMins = 0; // sanity cap

                    gwCandidates.push({ shiftKey, avgDiff, estMins });
                }
            }
        });

        // Pick best G/W1: if proximity scores are within 30 min, prefer the higher-hours shift
        if (gwCandidates.length > 0) {
            gwCandidates.sort((a, b) => {
                const diffGap = Math.abs(a.avgDiff - b.avgDiff);
                if (diffGap <= 30) {
                    const hoursDiff = b.estMins - a.estMins;
                    if (hoursDiff !== 0) return hoursDiff;
                    return a.avgDiff - b.avgDiff;
                }
                return a.avgDiff - b.avgDiff;
            });

            const topGw = gwCandidates[0];
            if (topGw.avgDiff < bestDiff) {
                bestDiff  = topGw.avgDiff;
                bestShift = topGw.shiftKey;
            }
        }

        console.log(`assignShift: ${employeeId} → punchIn=${punchIn}, punchOut=${punchOut}, assigned=${bestShift}`);
        return bestShift;
    } catch (err) {
        console.error('assignShift error:', err);
        return 'NA';
    }
}
