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

        for (const file of files) {
            await processPipoFile(file);
        }

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

                const inTime   = inMins  !== null ? formatMinutesTo24h(inMins)  : inTimeRaw;
                const outTime  = outMins !== null ? formatMinutesTo24h(outMins) : outTimeRaw;

                const employeeId = String(row['Safety Pass No'] || '').trim();
                const addLunch   = addLunchCheckbox ? addLunchCheckbox.checked : false;

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

                const dutyHours  = calculateDutyHours(dutyInMins, dutyOutMins, shiftOutMins, shift, addLunch);
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
                    addLunch,
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
async function processPipoFile(file) {
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

        // --- 3. Group punch records by Safety Pass No ---
        const tempMap = {};

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

            if (!tempMap[spNo]) {
                tempMap[spNo] = {
                    date,
                    [spNo]: {},
                    vendor_name:   vendorName,
                    workorder_no:  workorderNo,
                    workman_name:  workmanName,
                    dept_name:     deptName
                };
            }

            if (flag) {
                if (!tempMap[spNo][spNo][flag]) tempMap[spNo][spNo][flag] = [];
                tempMap[spNo][spNo][flag].push(time);
            }
        });

        const pipoRecords = Object.values(tempMap);
        console.log('pipoRecords:', pipoRecords);

        // --- 4. Resolve earliest IN and latest OUT per employee ---
        const pipoEmployeeDetails = pipoRecords.map(record => {
            const date        = record.date;
            const vendorName  = record.vendor_name;
            const workorderNo = record.workorder_no;
            const workmanName = record.workman_name || '';
            const deptName    = record.dept_name    || '';
            const spNo        = Object.keys(record).find(k => k !== 'date' && k !== 'vendor_name' && k !== 'workorder_no' && k !== 'workman_name' && k !== 'dept_name');

            let punchInMins  = null;
            let punchOutMins = null;

            if (spNo && record[spNo]) {
                const inTimes  = record[spNo]['IN']  || [];
                const outTimes = record[spNo]['OUT'] || [];

                const toMins = val => {
                    if (typeof val === 'number') return Math.round((val % 1) * 1440);
                    return parseTimeFormatToMinutes(val);
                };

                const validInMins  = inTimes.filter(t => t !== '').map(toMins).filter(m => m !== null);
                const validOutMins = outTimes.filter(t => t !== '').map(toMins).filter(m => m !== null);

                if (validInMins.length  > 0) punchInMins  = Math.min(...validInMins);
                if (validOutMins.length > 0) punchOutMins = Math.max(...validOutMins);
            }

            return { date, sp_no: spNo, punchInMins, punchOutMins, vendorName, workorderNo, workmanName, deptName };
        });

        console.log('pipoEmployeeDetails:', pipoEmployeeDetails);

        // --- 5. Convert to unified employeeData rows ---
        const addLunch    = addLunchCheckbox ? addLunchCheckbox.checked : false;
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
            const shift = assignShift(emp.sp_no, inTime, outTime);
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

            const dutyHours  = calculateDutyHours(dutyInMins, dutyOutMins, shiftOutMins, shift, addLunch);
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
                dutyIn:        formattedDutyIn,
                dutyOut:       formattedDutyOut,
                addLunch,
                dutyHours:     parseFloat(dutyHours.toFixed(2)),
                otHours:       parseFloat(otHours.toFixed(2)),
                totalHours
            });
        });

        employeeData = employeeData.concat(processedRows);

        statusItem.classList.add('success');
        statusItem.querySelector('.status-text').textContent = '';

    } catch (err) {
        console.error('processPipoFile error:', err);
        statusItem.classList.add('error');
        statusItem.querySelector('.status-text').textContent = 'Failed';
    }
}
