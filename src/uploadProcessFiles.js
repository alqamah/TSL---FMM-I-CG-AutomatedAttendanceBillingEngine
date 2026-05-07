// uploadProcessFiles.js
// Handles all file upload events and file processing for both Presentee and PiPo report types.
// Dependencies: hoursProcessing.js, main.js (employeeData, masterEmployeeDetails, masterFileUploaded, DOM refs)

// -----------------------------------------------
// PIPO FILE UPLOAD HANDLER
// -----------------------------------------------

/**
 * Event handler for the PiPo (Punch-In/Punch-Out) file input.
 * Clears state, processes each selected file, then triggers a table render.
 */
async function handlePipoFileSelect(event) {
    try {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        statusSection.classList.remove('is-hidden');
        fileStatusList.innerHTML    = '';
        employeeData                = [];
        tableBody.innerHTML         = '';

        fileCountBadge.textContent = `${files.length} File${files.length > 1 ? 's' : ''}`;

        const globalTempMap = {};

        for (const file of files) {
            await processPipoFile(file, globalTempMap);
        }

        _finalizePipoProcessing(globalTempMap);

        renderTable();

        if (employeeData.length > 0) {
            exportBtn.disabled = false;
            const btnEmployeeTotal = document.getElementById('btnEmployeeTotal');
            const btnSkillTotal    = document.getElementById('btnSkillTotal');
            if (btnEmployeeTotal) btnEmployeeTotal.classList.remove('is-hidden');
            if (btnSkillTotal)    btnSkillTotal.classList.remove('is-hidden');
        }
    } catch (err) {
        console.error('handlePipoFileSelect error:', err);
    }
}

// -----------------------------------------------
// C-SHIFT CROSS-DATE RESOLUTION (shared)
// -----------------------------------------------

const C_SHIFT_THRESHOLD_MINS = 20 * 60; // 20:00 — evening punch-in signals C-shift

// Shared row helpers

/**
 * Recalculates shift, duty hours, and OT for an already-normalised employee row.
 */
function _recalculateEmployeeRow(row) {
    const inTime  = row.punchIn;
    const outTime = row.punchOut;

    const shift = assignShift(row.sp_no, inTime, outTime);
    let shiftIn = '', shiftOut = '';
    let shiftInMins = null, shiftOutMins = null;

    if (shift && SHIFT_DEFINITIONS[shift]) {
        shiftIn      = SHIFT_DEFINITIONS[shift].shiftIn;
        shiftOut     = SHIFT_DEFINITIONS[shift].shiftOut;
        shiftInMins  = parseTimeFormatToMinutes(shiftIn);
        shiftOutMins = parseTimeFormatToMinutes(shiftOut);
    }

    const { dutyInMins, dutyOutMins } = calculateHours(inTime, outTime, shiftIn, shiftOut, row.inOT, row.outOT);
    const shiftDef = SHIFT_DEFINITIONS[shift];
    const deductLunch = shiftDef ? shiftDef.deductLunch : false;
    const dutyHours  = calculateDutyHours(dutyInMins, dutyOutMins, shiftInMins, shiftOutMins, shift, deductLunch);
    const otHours    = calculateOtHours(row.sp_no, shiftInMins, shiftOutMins, dutyInMins, dutyOutMins);

    row.shift      = shift;
    row.shiftIn    = shiftIn;
    row.shiftOut   = shiftOut;
    row.dutyIn     = dutyInMins  !== null ? formatMinutesTo24h(dutyInMins)  : '';
    row.dutyOut    = dutyOutMins !== null ? formatMinutesTo24h(dutyOutMins) : '';
    row.dutyHours  = parseFloat(dutyHours.toFixed(2));
    row.otHours    = parseFloat(otHours.toFixed(2));
    row.totalHours = parseFloat((dutyHours + otHours).toFixed(2));
}

/**
 * PiPo uploads can contain overlapping files. Collapse all uploaded punches into
 * employee/date groups, then resolve C-shift exits from the next calendar date.
 */
function _finalizePipoProcessing(globalTempMap) {
    // --- 4. Resolve punch pairs, handling C-shift overnight boundaries ---
    const _monthIdx = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    const _parsePipoDate = ds => {
        const parts = ds.split(/[-\/\.]/);
        if (parts.length >= 3) {
            const day = parseInt(parts[0], 10);
            let mon = parseInt(parts[1], 10);
            if (isNaN(mon)) {
                mon = _monthIdx[(parts[1] || '').toLowerCase()] || 0;
            } else {
                mon = mon - 1; // Convert 1-12 to 0-11
            }
            let yr = parseInt(parts[2], 10);
            if (yr < 100) yr += 2000;
            return new Date(yr, mon, day).getTime();
        }
        return 0;
    };

    const C_SHIFT_IN_THRESHOLD       = 20 * 60;  // 20:00 = 1200 min - evening IN signals C-shift
    const EARLY_C_SHIFT_IN_THRESHOLD = 18 * 60;  // C-shift can be punched early before 20:00
    const MORNING_OUT_CUTOFF         = 12 * 60;  // 12:00 = 720 min - morning OUT belongs to prev C-shift

    // Group per-date records by employee for cross-date resolution
    const byEmployee = {};
    Object.values(globalTempMap).forEach(g => {
        if (!byEmployee[g.sp_no]) byEmployee[g.sp_no] = [];
        byEmployee[g.sp_no].push(g);
    });

    const pipoEmployeeDetails = [];

    Object.values(byEmployee).forEach(groups => {
        // Sort this employee's date-groups chronologically
        groups.sort((a, b) => _parsePipoDate(a.date) - _parsePipoDate(b.date));

        // Track the IN punch already used to create each C-shift row.
        const cPunchInsByGroup = new Map();

        // First pass: identify C-shift entries and consume next-date morning OUTs
        groups.forEach((group, idx) => {
            const sameDateMorningOuts = group.outTimes.filter(m => m < MORNING_OUT_CUTOFF);
            const nextGroup = groups[idx + 1];
            const nextDateMorningOuts = nextGroup
                ? nextGroup.outTimes.filter(m => m < MORNING_OUT_CUTOFF)
                : [];

            const eveningIns = group.inTimes.filter(m => {
                if (m >= C_SHIFT_IN_THRESHOLD) return true;
                return (
                    m >= EARLY_C_SHIFT_IN_THRESHOLD &&
                    (sameDateMorningOuts.length > 0 || nextDateMorningOuts.length > 0)
                );
            });

            if (eveningIns.length > 0) {
                // This date has a C-shift start
                const punchInMins = Math.min(...eveningIns);
                let punchOutMins = null;
                cPunchInsByGroup.set(idx, new Set(eveningIns));

                // Look for morning OUT on the NEXT date for this employee
                if (nextDateMorningOuts.length > 0) {
                    punchOutMins = Math.max(...nextDateMorningOuts);
                }

                pipoEmployeeDetails.push({
                    date: group.date, sp_no: group.sp_no,
                    punchInMins, punchOutMins,
                    punchOutNextDate: (punchOutMins !== null && nextGroup) ? nextGroup.date : null,
                    vendorName: group.vendor_name, workorderNo: group.workorder_no,
                    workmanName: group.workman_name, deptName: group.dept_name
                });
            }
        });

        // Second pass: regular (non-C) shift entries
        groups.forEach((group, idx) => {
            const cPunchIns = cPunchInsByGroup.get(idx);
            const regularIns = group.inTimes.filter(m => !cPunchIns || !cPunchIns.has(m));

            // Morning OUTs are C-shift exits, either already consumed by the previous
            // date's C row or belonging to a previous upload not present here.
            let availableOuts = group.outTimes.filter(m => m >= MORNING_OUT_CUTOFF);

            // If no daytime IN and no available OUT, skip this day
            if (regularIns.length === 0 && availableOuts.length === 0) return;

            const punchInMins = regularIns.length > 0 ? Math.min(...regularIns) : null;
            const punchOutMins = availableOuts.length > 0 ? Math.max(...availableOuts) : null;

            pipoEmployeeDetails.push({
                date: group.date, sp_no: group.sp_no,
                punchInMins, punchOutMins,
                vendorName: group.vendor_name, workorderNo: group.workorder_no,
                workmanName: group.workman_name, deptName: group.dept_name
            });
        });
    });

    // Sort final results by date for consistent output
    pipoEmployeeDetails.sort((a, b) => _parsePipoDate(a.date) - _parsePipoDate(b.date));

    console.log('pipoEmployeeDetails:', pipoEmployeeDetails);

    // --- 5. Convert to unified employeeData rows ---
    const processedRows = [];

    pipoEmployeeDetails.forEach(emp => {
        // Minutes since midnight → HH:MM string
        const inTime  = emp.punchInMins  !== null ? formatMinutesTo24h(emp.punchInMins)  : '';
        const outTime = emp.punchOutMins !== null ? formatMinutesTo24h(emp.punchOutMins) : '';

        const normalizedDate = emp.date ? normalizeDate(emp.date) : '';

        // Enrich from master-sheet employee data (if uploaded and not bypassed)
        let skillVal         = null;
        let designationVal   = null;
        let shiftsAllowedVal = [];
        let inOtAllowed      = false;
        let outOtAllowed     = false;
        let nameVal          = emp.workmanName || '';  // default from CLM punch data

        const bypassMaster = bypassMasterFileCheckbox ? bypassMasterFileCheckbox.checked : false;
        if (masterFileUploaded && !bypassMaster) {
            const empDetails = masterEmployeeDetails.find(e => e.sp_no === emp.sp_no);
            if (empDetails) {
                skillVal         = empDetails.skill         || null;
                designationVal   = empDetails.designation   || null;
                shiftsAllowedVal = empDetails.allowedShifts || [];
                inOtAllowed      = !!empDetails.inOtAllowed;
                outOtAllowed     = !!empDetails.outOtAllowed;
                nameVal          = empDetails.name          || nameVal;
            }
        }

        // Shift assignment
        const shift = emp.shiftOverride || assignShift(emp.sp_no, inTime, outTime);
        let shiftIn = '', shiftOut = '';
        let shiftInMins = null, shiftOutMins = null;

        if (shift && SHIFT_DEFINITIONS[shift]) {
            shiftIn      = SHIFT_DEFINITIONS[shift].shiftIn;
            shiftOut     = SHIFT_DEFINITIONS[shift].shiftOut;
            shiftInMins  = parseTimeFormatToMinutes(shiftIn);
            shiftOutMins = parseTimeFormatToMinutes(shiftOut);
        }

        // Hours calculation
        const { dutyInMins, dutyOutMins } = calculateHours(inTime, outTime, shiftIn, shiftOut, inOtAllowed, outOtAllowed);
        const formattedDutyIn  = dutyInMins  !== null ? formatMinutesTo24h(dutyInMins)  : '';
        const formattedDutyOut = dutyOutMins !== null ? formatMinutesTo24h(dutyOutMins) : '';

        const shiftDef = SHIFT_DEFINITIONS[shift];
        const deductLunch = shiftDef ? shiftDef.deductLunch : false;
        const dutyHours  = calculateDutyHours(dutyInMins, dutyOutMins, shiftInMins, shiftOutMins, shift, deductLunch);
        const otHours    = calculateOtHours(emp.sp_no, shiftInMins, shiftOutMins, dutyInMins, dutyOutMins);
        const totalHours = parseFloat((dutyHours + otHours).toFixed(2));

        processedRows.push({
            date:          normalizedDate,
            sp_no:         emp.sp_no,
            name:          nameVal,
            vendor_name:   emp.vendorName   || '',
            workorder_no:  emp.workorderNo  || '',
            dept_name:     emp.deptName      || '',
            section:       '',
            skill:         skillVal,
            inOT:          inOtAllowed,
            outOT:         outOtAllowed,
            designation:   designationVal,
            shiftsAllowed: shiftsAllowedVal,
            shift,
            shiftIn,
            shiftOut,
            punchIn:       inTime,
            punchOut:      outTime,
            punchOutNextDate: emp.punchOutNextDate || null,
            dutyIn:        formattedDutyIn,
            dutyOut:       formattedDutyOut,
            dutyHours:     parseFloat(dutyHours.toFixed(2)),
            otHours:       parseFloat(otHours.toFixed(2)),
            totalHours
        });
    });

    employeeData = employeeData.concat(processedRows);
}

/**
 * Parses a normalised date string (DD-MM-YYYY or D-Mon-YY) into a sortable ms timestamp.
 */
function _parseDateForCShift(ds) {
    if (!ds) return 0;
    const monthNames = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
    const parts = ds.split(/[-\/\.]/);
    if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        let mon = parseInt(parts[1], 10);
        if (isNaN(mon)) mon = (monthNames[(parts[1] || '').toLowerCase()] ?? 0) + 1;
        let yr = parseInt(parts[2], 10);
        if (yr < 100) yr += 2000;
        return new Date(yr, mon - 1, day).getTime();
    }
    return 0;
}

/**
 * Post-processing pass over employeeData to fix C-shift overnight punch-outs.
 *
 * In CLM Presentee files the "Out Time" on date X is actually the morning exit
 * from the PREVIOUS night's C-shift (date X-1).  This function:
 *   1. Groups entries by employee (sp_no) and sorts by date.
 *   2. For consecutive C-shift entries, takes the NEXT date's punchOut as
 *      the current date's actual exit.
 *   3. Recalculates shift, hours, etc. for every modified row.
 *   4. The last C-shift entry in a run gets punchOut = '' (N/A).
 */
function _resolveCShiftCrossDate() {
    // Group by employee
    const byEmployee = {};
    employeeData.forEach((row, idx) => {
        if (!byEmployee[row.sp_no]) byEmployee[row.sp_no] = [];
        byEmployee[row.sp_no].push({ row, idx });
    });

    Object.values(byEmployee).forEach(entries => {
        // Sort by date
        entries.sort((a, b) => _parseDateForCShift(a.row.date) - _parseDateForCShift(b.row.date));

        // Identify entries whose allowed shift crosses midnight.
        const cShiftIndices = [];
        entries.forEach((entry, pos) => {
            const inMins = parseTimeFormatToMinutes(entry.row.punchIn);
            if (
                inMins !== null &&
                (
                    isPunchInForOvernightShift(entry.row.sp_no, entry.row.punchIn) ||
                    inMins >= C_SHIFT_THRESHOLD_MINS
                )
            ) {
                cShiftIndices.push(pos);
            }
        });

        if (cShiftIndices.length === 0) return;

        // Resolve: current C-shift's punchOut = next entry's punchOut
        cShiftIndices.forEach((pos, i) => {
            const currentRow = entries[pos].row;
            const nextEntry  = entries[pos + 1]; // next calendar-date entry for this employee

            let newPunchOut = '';
            let punchOutDate = ''; // date the punch-out actually falls on
            if (nextEntry) {
                const nextOutMins = parseTimeFormatToMinutes(nextEntry.row.punchOut);
                // Only take if the next entry's Out is a morning time (< 12:00)
                if (nextOutMins !== null && nextOutMins < 12 * 60) {
                    newPunchOut = nextEntry.row.punchOut;
                    punchOutDate = nextEntry.row.date; // the next calendar date
                }
            }

            // Update punchOut and tag with next-day date for rendering
            currentRow.punchOut = newPunchOut;
            currentRow.punchOutNextDate = punchOutDate || null;

            // Recalculate shift, hours, duty for this row
            const inTime  = currentRow.punchIn;
            const outTime = currentRow.punchOut;

            const shift = assignShift(currentRow.sp_no, inTime, outTime);
            let shiftIn = '', shiftOut = '';
            let shiftInMins = null, shiftOutMins = null;

            if (shift && SHIFT_DEFINITIONS[shift]) {
                shiftIn      = SHIFT_DEFINITIONS[shift].shiftIn;
                shiftOut     = SHIFT_DEFINITIONS[shift].shiftOut;
                shiftInMins  = parseTimeFormatToMinutes(shiftIn);
                shiftOutMins = parseTimeFormatToMinutes(shiftOut);
            }

            const { dutyInMins, dutyOutMins } = calculateHours(inTime, outTime, shiftIn, shiftOut, currentRow.inOT, currentRow.outOT);
            const formattedDutyIn  = dutyInMins  !== null ? formatMinutesTo24h(dutyInMins)  : '';
            const formattedDutyOut = dutyOutMins !== null ? formatMinutesTo24h(dutyOutMins) : '';
            const shiftDef = SHIFT_DEFINITIONS[shift];
            const deductLunch = shiftDef ? shiftDef.deductLunch : false;
            const dutyHours  = calculateDutyHours(dutyInMins, dutyOutMins, shiftInMins, shiftOutMins, shift, deductLunch);
            const otHours    = calculateOtHours(currentRow.sp_no, shiftInMins, shiftOutMins, dutyInMins, dutyOutMins);

            currentRow.shift      = shift;
            currentRow.shiftIn    = shiftIn;
            currentRow.shiftOut   = shiftOut;
            currentRow.dutyIn     = formattedDutyIn;
            currentRow.dutyOut    = formattedDutyOut;
            currentRow.dutyHours  = parseFloat(dutyHours.toFixed(2));
            currentRow.otHours    = parseFloat(otHours.toFixed(2));
            currentRow.totalHours = parseFloat((dutyHours + otHours).toFixed(2));
        });

        // Last C-shift entry in the run: punchOut is already '' if no next entry existed,
        // which means hours will be 0 — correct per requirements.
    });

    console.log('[C-Shift Resolve] Post-processed employeeData:', employeeData);
}

// -----------------------------------------------
// PRESENTEE FILE UPLOAD HANDLER
// -----------------------------------------------

/**
 * Event handler for the Presentee (CLM) file input.
 * Clears state, processes each selected file, then triggers a table render.
 */
async function handlePresenteeFileSelect(event) {
    try {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        statusSection.classList.remove('is-hidden');
        fileStatusList.innerHTML    = '';
        employeeData                = [];
        tableBody.innerHTML         = '';

        fileCountBadge.textContent = `${files.length} File${files.length > 1 ? 's' : ''}`;

        for (const file of files) {
            await processPresenteeFile(file);
        }

        // Fix C-shift overnight punch-outs across dates
        _resolveCShiftCrossDate();

        renderTable();

        if (employeeData.length > 0) {
            exportBtn.disabled = false;
            const btnEmployeeTotal = document.getElementById('btnEmployeeTotal');
            const btnSkillTotal    = document.getElementById('btnSkillTotal');
            if (btnEmployeeTotal) btnEmployeeTotal.classList.remove('is-hidden');
            if (btnSkillTotal)    btnSkillTotal.classList.remove('is-hidden');
        }
    } catch (err) {
        console.error('handlePresenteeFileSelect error:', err);
    }
}

// -----------------------------------------------
// PRESENTEE FILE PROCESSOR
// -----------------------------------------------

/**
 * Reads and parses a single CLM-Presentee Excel file.
 * - Extracts the attendance date from cell B3 (or searches the first 10 rows).
 * - Locates the header row by scanning for known column identifiers.
 * - Maps each employee row into the unified employeeData structure.
 */
async function processPresenteeFile(file) {
    const statusItem = document.createElement('li');
    statusItem.className = 'status-item';
    statusItem.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="status-text"></span>
    `;
    fileStatusList.appendChild(statusItem);

    try {
        const data      = await file.arrayBuffer();
        const workbook  = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // Convert sheet to array-of-arrays for header/metadata scanning
        const rawJsonArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        // --- 1. Extract attendance date from B3, or search first 10 rows ---
        let rawDateStr = '';
        const b3Val = worksheet['B3'] ? worksheet['B3'].v : '';
        if (b3Val) {
            const dateMatch = b3Val.toString().match(/Date\s*:\s*(.+)/i);
            if (dateMatch) rawDateStr = dateMatch[1].trim();
        }

        if (!rawDateStr) {
            for (let i = 0; i < Math.min(10, rawJsonArray.length); i++) {
                const fallbackMatch = rawJsonArray[i].join(' ').match(/Date\s*:\s*(.+)/i);
                if (fallbackMatch) {
                    rawDateStr = fallbackMatch[1].trim();
                    break;
                }
            }
        }

        const normalizedDate = normalizeDate(rawDateStr);

        // --- 2. Locate header row ---
        let headerRowIndex = -1;
        for (let i = 0; i < rawJsonArray.length; i++) {
            const rowStr = rawJsonArray[i].join('').toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
            if (rowStr.includes('safetypassno') || rowStr.includes('employeename') || rowStr.includes('intime')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error('Could not identify the header row in this file.');
        }

        // --- 3. Parse tabular records ---
        const dataRows = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' });

        // --- 4. Map each row to the employee data structure ---
        const processedRows = dataRows
            .filter(row => {
                const empName = row['Employee Name'] ? String(row['Employee Name']).trim() : '';
                const empId   = row['Safety Pass No'] ? String(row['Safety Pass No']).trim() : '';
                return empName && empId;
            })
            .map(row => {
                const inTimeRaw  = String(row['In Time']  || row['In-Time']  || '').trim();
                const outTimeRaw = String(row['Out Time'] || row['Out-Time'] || '').trim();

                const inMins  = parseTimeFormatToMinutes(inTimeRaw);
                const outMins = parseTimeFormatToMinutes(outTimeRaw);

                // Keep original raw time (may include HH:MM:SS) for display
                const inTime   = inTimeRaw  || (inMins  !== null ? formatMinutesTo24h(inMins)  : '');
                const outTime  = outTimeRaw || (outMins !== null ? formatMinutesTo24h(outMins) : '');

                const employeeId = String(row['Safety Pass No'] || '').trim();

                // Enrich from master-sheet employee data (if uploaded and not bypassed)
                let skillVal         = null;
                let designationVal   = null;
                let shiftsAllowedVal = [];
                let inOtAllowed      = false;
                let outOtAllowed     = false;

                const bypassMaster = bypassMasterFileCheckbox ? bypassMasterFileCheckbox.checked : false;
                if (masterFileUploaded && !bypassMaster) {
                    const empDetails = masterEmployeeDetails.find(e => e.sp_no === employeeId);
                    if (empDetails) {
                        skillVal         = empDetails.skill         || null;
                        designationVal   = empDetails.designation   || null;
                        shiftsAllowedVal = empDetails.allowedShifts || [];
                        inOtAllowed      = !!empDetails.inOtAllowed;
                        outOtAllowed     = !!empDetails.outOtAllowed;
                    }
                }

                // Shift assignment
                const shift = assignShift(employeeId, inTime, outTime);
                let shiftIn = '', shiftOut = '';
                let shiftInMins = null, shiftOutMins = null;

                if (shift && SHIFT_DEFINITIONS[shift]) {
                    shiftIn      = SHIFT_DEFINITIONS[shift].shiftIn;
                    shiftOut     = SHIFT_DEFINITIONS[shift].shiftOut;
                    shiftInMins  = parseTimeFormatToMinutes(shiftIn);
                    shiftOutMins = parseTimeFormatToMinutes(shiftOut);
                }

                // Hours calculation
                const { dutyInMins, dutyOutMins } = calculateHours(inTime, outTime, shiftIn, shiftOut, inOtAllowed, outOtAllowed);
                const formattedDutyIn  = dutyInMins  !== null ? formatMinutesTo24h(dutyInMins)  : '';
                const formattedDutyOut = dutyOutMins !== null ? formatMinutesTo24h(dutyOutMins) : '';

                const shiftDef = SHIFT_DEFINITIONS[shift];
                const deductLunch = shiftDef ? shiftDef.deductLunch : false;
                const dutyHours  = calculateDutyHours(dutyInMins, dutyOutMins, shiftInMins, shiftOutMins, shift, deductLunch);
                const otHours    = calculateOtHours(employeeId, shiftInMins, shiftOutMins, dutyInMins, dutyOutMins);
                const totalHours = parseFloat((dutyHours + otHours).toFixed(2));

                return {
                    date:          normalizedDate,
                    sp_no:         employeeId,
                    name:          row['Employee Name']  || '',
                    vendor_name:   row['Vendor Name']    || '',
                    workorder_no:  row['Workorder No']   || '',
                    dept_name:     row['Department Name']|| '',
                    section:       row['Section']        || '',
                    skill:         skillVal,
                    inOT:          inOtAllowed,
                    outOT:         outOtAllowed,
                    designation:   designationVal,
                    shiftsAllowed: shiftsAllowedVal,
                    shift,
                    shiftIn,
                    shiftOut,
                    punchIn:       inTime,
                    punchOut:      outTime,
                    dutyIn:        formattedDutyIn,
                    dutyOut:       formattedDutyOut,
                    dutyHours:     parseFloat(dutyHours.toFixed(2)),
                    otHours:       parseFloat(otHours.toFixed(2)),
                    totalHours
                };
            });

        employeeData = employeeData.concat(processedRows);

        statusItem.classList.add('success');
        statusItem.querySelector('.status-text').textContent = '';

    } catch (err) {
        console.error('processPresenteeFile error:', err);
        statusItem.classList.add('error');
        statusItem.querySelector('.status-text').textContent = 'Failed';
    }
}

// -----------------------------------------------
// PIPO FILE PROCESSOR
// -----------------------------------------------

/**
 * Reads and parses a single CLM-Punch Records (PiPo) Excel file.
 * Expected columns: Date | Safety Pass No | Flag (IN/OUT) | Punch Time/HH:MM:SS
 * - Groups all punch records per employee.
 * - Takes the earliest IN and latest OUT punch for each employee per day.
 * - Maps results into the unified employeeData structure.
 */
async function processPipoFile(file, globalTempMap) {
    const statusItem = document.createElement('li');
    statusItem.className = 'status-item';
    statusItem.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="status-text"></span>
    `;
    fileStatusList.appendChild(statusItem);

    try {
        const data      = await file.arrayBuffer();
        const workbook  = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        const rawJsonArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        console.log('Raw JSON Array:', rawJsonArray);

        // --- 1. Locate header row ---
        let headerRowIndex = -1;
        for (let i = 0; i < rawJsonArray.length; i++) {
            const rowStr = rawJsonArray[i]
                .join('').toLowerCase()
                .replace(/\s+/g, '').replace(/-/g, '').replace(/\//g, '');
            if (
                (rowStr.includes('safetypassno') || rowStr.includes('safetyno')) &&
                (rowStr.includes('flag') || rowStr.includes('punchtime'))
            ) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error(
                'Could not identify the header row. ' +
                'Expected columns: Safety No. (or Safety Pass No), Flag, Punch Time/HH:MM:SS'
            );
        }

        // --- 2. Parse rows into data objects ---
        const dataRows = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' });

        // --- 3. Group punch records by Safety Pass No + Date ---
        const tempMap = globalTempMap;

        dataRows.forEach(row => {
            let date = row['Date'] || '';

            // Convert Excel serial date number to readable date string
            if (typeof date === 'number') {
                const utcMs = (date - 25569) * 86400 * 1000; // Excel epoch → Unix epoch
                const d     = new Date(utcMs);
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                date = `${d.getUTCDate()}-${months[d.getUTCMonth()]}-${String(d.getUTCFullYear()).slice(-2)}`;
            }

            const spNo        = row['Safety Pass No'] || row['Safety No.'] || '';
            const flag        = row['Flag']                                 || '';
            const time        = row['Punch Time/HH:MM:SS'] || row['Punch Time'] || '';
            const vendorName  = row['Vendor Name']  || '';
            const workorderNo = row['Workorder No'] || '';
            const workmanName = row['Workman Name'] || row['Employee Name'] || '';
            const deptName    = row['Dept. Name'] || row['Department Name'] || '';

            if (!spNo) return;

            const groupKey = `${spNo}||${date}`;

            if (!tempMap[groupKey]) {
                tempMap[groupKey] = {
                    date,
                    sp_no:         spNo,
                    inTimes:       [],
                    outTimes:      [],
                    vendor_name:   vendorName,
                    workorder_no:  workorderNo,
                    workman_name:  workmanName,
                    dept_name:     deptName
                };
            }

            // Convert punch time to minutes since midnight
            const toMins = val => {
                if (val === '' || val === null || val === undefined) return null;
                if (typeof val === 'number') return Math.round((val % 1) * 1440);
                return parseTimeFormatToMinutes(String(val));
            };

            const timeMins = toMins(time);
            if (timeMins === null) return;

            if (flag === 'IN')       tempMap[groupKey].inTimes.push(timeMins);
            else if (flag === 'OUT') tempMap[groupKey].outTimes.push(timeMins);
        });

        console.log('Appended to globalTempMap for file:', file.name);

        statusItem.classList.add('success');
        statusItem.querySelector('.status-text').textContent = '';

    } catch (err) {
        console.error('processPipoFile error:', err);
        statusItem.classList.add('error');
        statusItem.querySelector('.status-text').textContent = 'Failed';
    }
}
