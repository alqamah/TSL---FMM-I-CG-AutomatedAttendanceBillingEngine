// Core Application Logic for Working Hours Calculator

const fileInput = document.getElementById('fileInput');
const pipoInput = document.getElementById('pipoInput');
const statusSection = document.getElementById('statusSection');
const fileStatusList = document.getElementById('fileStatusList');
const fileCountBadge = document.getElementById('fileCountBadge');
const dataTable = document.getElementById('dataTable');
const tableBody = document.getElementById('tableBody');
const exportBtn = document.getElementById('exportBtn');
const searchInput = document.getElementById('searchInput');
const addLunchCheckbox = document.getElementById('addLunchCheckbox');
const bypassPersistentDataCheckbox = document.getElementById('bypassPersistentDataCheckbox');
const columnPickerBtn = document.getElementById('columnPickerBtn');
const columnPickerDropdown = document.getElementById('columnPickerDropdown');

//EMPLOYEE DATA STRUCTURE BLUEPRINT
/*
let employeeData = [
    {
        date: from Uploaded file
        sp_no: from Uploaded file
        name: from Uploaded file
        vendor_name: from Uploaded file
        workorder_no: from Uploaded file
        dept_name: from Uploaded file
        section: from Uploaded file
        skill: from persistent_data
        designation: from persistent_data   
        shiftsAllowed[]: from persistent_data
        shift: after assignShift()
        shiftIn: after assignShift()
        shiftOut: after assignShift()
        punchIn: from Uploaded file
        punchOut: from Uploaded file
        dutyIn: after calculateHours()
        dutyOut: after calculateHours()
        addLunch: from addLunch button/flag
        dutyHours: from calculateHours()
        otHours: from calculateHours()
        inOtAllowed: from persistent_data
        outOtAllowed: from persistent_data
        totalHours: from calculateHours()        
    }
]
*/

let employeeData = [];

// Column visibility logic
const dynamicStyle = document.createElement('style');
dynamicStyle.id = 'dynamicColumnStyles';
document.head.appendChild(dynamicStyle);

const COLUMN_DEFS = [
    { id: 'SN', label: 'SN', defaultVisible: true },
    { id: 'DATE', label: 'DATE', defaultVisible: true },
    { id: 'SP_NO', label: 'SP NO', defaultVisible: true },
    { id: 'NAME', label: 'NAME', defaultVisible: true },
    { id: 'PUNCH_IN', label: 'PUNCH IN', defaultVisible: true },
    { id: 'PUNCH_OUT', label: 'PUNCH OUT', defaultVisible: true },
    { id: 'TOTAL_HRS', label: 'TOTAL HRS', defaultVisible: true },
    { id: 'DUTY_HRS', label: 'DUTY HRS', defaultVisible: true },
    { id: 'OT_HRS', label: 'OT HRS', defaultVisible: true },
    { id: 'ADD_LUNCH', label: 'Allow LUNCH', defaultVisible: true },
    { id: 'SHIFTS_ALLOWED', label: 'SHIFTS ALLOWED', defaultVisible: true },
    { id: 'SHIFT', label: 'SHIFT', defaultVisible: true },
    { id: 'SHIFT_IN', label: 'SHIFT IN', defaultVisible: true },
    { id: 'SHIFT_OUT', label: 'SHIFT OUT', defaultVisible: true },
    { id: 'DUTY_IN', label: 'DUTY IN', defaultVisible: true },
    { id: 'DUTY_OUT', label: 'DUTY OUT', defaultVisible: true },
    { id: 'SKILL', label: 'SKILL', defaultVisible: true },
    { id: 'IN_OT', label: 'Allow IN-OT', defaultVisible: true },
    { id: 'OUT_OT', label: 'Allow OUT-OT', defaultVisible: true },
    { id: 'DESIGNATION', label: 'DESIGNATION', defaultVisible: true },
    { id: 'VENDOR_NAME', label: 'VENDOR NAME', defaultVisible: true },
    { id: 'WORKORDER_NO', label: 'WORKORDER NO', defaultVisible: true },
    { id: 'DEPT_NAME', label: 'DEPT NAME', defaultVisible: true },
    { id: 'SECTION', label: 'SECTION', defaultVisible: true }
];
//------------------------------------------------
// TABLE PRE-RENDER FUNCTIONS
// -----------------------------------------------
//column visibility logic
let hiddenColumns = new Set();
// Sort state for all sortable columns: 'none' | 'asc' | 'desc'
const sortStates = {
    date: 'asc',
    name: 'none',
    skill: 'none',
    designation: 'none',
    shiftsAllowed: 'none',
    shift: 'none'
};
if (columnPickerDropdown) {
    const header = document.createElement('div');
    header.className = 'column-dropdown-header';
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'column-toggle-btn';
    toggleBtn.textContent = 'Toggle All';

    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // determine if we are selecting all or deselecting all
        const allSelected = hiddenColumns.size === 0;

        if (allSelected) {
            // deselect all
            checkboxes.forEach(cb => cb.checked = false);
            COLUMN_DEFS.forEach((col, i) => hiddenColumns.add(i + 1));
        } else {
            // select all
            checkboxes.forEach(cb => cb.checked = true);
            hiddenColumns.clear();
        }
        updateColumnVisibility();
    });

    header.appendChild(toggleBtn);
    columnPickerDropdown.appendChild(header);

    const checkboxes = [];

    COLUMN_DEFS.forEach((col, index) => {
        const label = document.createElement('label');
        label.className = 'column-dropdown-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = col.defaultVisible;
        if (!col.defaultVisible) hiddenColumns.add(index + 1);

        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                hiddenColumns.delete(index + 1);
            } else {
                hiddenColumns.add(index + 1);
            }
            updateColumnVisibility();
        });

        checkboxes.push(checkbox);
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(col.label));
        columnPickerDropdown.appendChild(label);
    });
}

// Generic column sort toggle
function toggleSort(col) {
    try {
        if (sortStates[col] === 'none') sortStates[col] = 'asc';
        else if (sortStates[col] === 'asc') sortStates[col] = 'desc';
        else sortStates[col] = 'none';
        renderTable();
    } catch (err) {
        console.error('toggleSort error:', err);
    }
}
// Keep backward compat
function toggleDateSort() { toggleSort('date'); }

function sortArrowsHtml(col) {
    return `<span class="sort-arrows">
        <span class="sort-arrow up ${sortStates[col] === 'asc' ? 'active' : ''}">▲</span>
        <span class="sort-arrow down ${sortStates[col] === 'desc' ? 'active' : ''}">▼</span>
    </span>`;
}

function updateColumnVisibility() {
    let cssRules = '';
    hiddenColumns.forEach(childIndex => {
        cssRules += `#dataTable.main-view th:nth-child(${childIndex}), #dataTable.main-view td:nth-child(${childIndex}) { display: none !important; }\n`;
    });
    dynamicStyle.innerHTML = cssRules;
}

if (columnPickerBtn) {
    columnPickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        columnPickerDropdown.style.display = columnPickerDropdown.style.display === 'none' ? 'flex' : 'none';
    });
}
document.addEventListener('click', (e) => {
    if (columnPickerBtn && !columnPickerBtn.contains(e.target) && !columnPickerDropdown.contains(e.target)) {
        columnPickerDropdown.style.display = 'none';
    }
});
updateColumnVisibility();
// -----------------------------------------------

// FILE UPLOAD
// -----------------------------------------------
// Listen for file selections
fileInput.addEventListener('change', handlePresenteeFileSelect);
if (pipoInput) pipoInput.addEventListener('change', handlePipoFileSelect);
exportBtn.addEventListener('click', exportToExcel);
if (searchInput) searchInput.addEventListener('input', renderTable);
if (addLunchCheckbox) addLunchCheckbox.addEventListener('change', reprocessData);

// PIPO FILE UPLOAD HANDLER
async function handlePipoFileSelect(event) {
    try {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        statusSection.style.display = 'block';
        fileStatusList.innerHTML = '';
        employeeData = [];
        tableBody.innerHTML = '';

        fileCountBadge.textContent = `${files.length} File${files.length > 1 ? 's' : ''}`;

        for (const file of files) {
            await processPipoFile(file);
        }

        renderTable();

        if (employeeData.length > 0) {
            exportBtn.disabled = false;
            const btnEmployeeTotal = document.getElementById('btnEmployeeTotal');
            const btnSkillTotal = document.getElementById('btnSkillTotal');
            if (btnEmployeeTotal) btnEmployeeTotal.style.display = 'block';
            if (btnSkillTotal) btnSkillTotal.style.display = 'block';
        }
    } catch (err) {
        console.error('handlePipoFileSelect error:', err);
    }
}

// PRESENTEE FILE PROCESSING
//file upload
async function handlePresenteeFileSelect(event) {
    try {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        statusSection.style.display = 'block';

        // Clear previous list if running again? Or append? Let's clear for new batch.
        fileStatusList.innerHTML = '';
        employeeData = [];
        tableBody.innerHTML = ''; // clear table

        fileCountBadge.textContent = `${files.length} File${files.length > 1 ? 's' : ''}`;

        for (const file of files) {
            await processPresenteeFile(file);
        }

        // Render the processed data
        renderTable();

        if (employeeData.length > 0) {
            exportBtn.disabled = false;

            const btnEmployeeTotal = document.getElementById('btnEmployeeTotal');
            const btnSkillTotal = document.getElementById('btnSkillTotal');
            if (btnEmployeeTotal) btnEmployeeTotal.style.display = 'block';
            if (btnSkillTotal) btnSkillTotal.style.display = 'block';
        }

    } catch (err) {
        console.error('handleFileSelect error:', err);
    }
}

//file processing
async function processPresenteeFile(file) {
    const statusItem = document.createElement('li');
    statusItem.className = 'status-item';
    statusItem.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="status-text">Processing...</span>
    `;
    fileStatusList.appendChild(statusItem);

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });

        // Assuming first sheet holds the data
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert sheet to array of arrays to find metadata and headers
        const rawJsonArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        // 1. Extract Date from Cell B3
        // In array of arrays, Cell B3 is row index 2, col index 1 (assuming 0-indexed)
        // Let's search entire first 10 rows just to be safe, but primarily check B3.
        let rawDateStr = '';
        const b3Val = worksheet['B3'] ? worksheet['B3'].v : '';
        if (b3Val) {
            // Regex to find "Date : <VALUE>"
            const dateMatch = b3Val.toString().match(/Date\s*:\s*(.+)/i);
            if (dateMatch) {
                rawDateStr = dateMatch[1].trim();
            }
        }

        // Fallback: search first 10 rows for "Date :"
        if (!rawDateStr) {
            for (let i = 0; i < Math.min(10, rawJsonArray.length); i++) {
                const rowString = rawJsonArray[i].join(' ');
                const fallbackMatch = rowString.match(/Date\s*:\s*(.+)/i);
                if (fallbackMatch) {
                    rawDateStr = fallbackMatch[1].trim();
                    break;
                }
            }
        }

        const normalizedDate = normalizeDate(rawDateStr);

        // 2. Programmatically find the header row
        let headerRowIndex = -1;
        for (let i = 0; i < rawJsonArray.length; i++) {
            const row = rawJsonArray[i];
            const rowStr = row.join('').toLowerCase().replace(/\s+/g, '').replace(/-/g, '');
            // Look for columns we know exist
            if (rowStr.includes('safetypassno') || rowStr.includes('employeename') || rowStr.includes('intime')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error('Could not cleanly identify the header row in this file.');
        }

        // 3. Extract the tabular records using the found header row
        const dataRows = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' });

        // 4. Process each row
        const processedRows = dataRows
            .filter(row => {
                const empName = row['Employee Name'] ? String(row['Employee Name']).trim() : '';
                let empId = row['Safety Pass No'] ? String(row['Safety Pass No']).trim() : '';
                if (!empName || !empId) return false;

                return true;
            })
            .map((row, index) => {
                const inTimeRaw = String(row['In Time'] || row['In-Time'] || '').trim();
                const outTimeRaw = String(row['Out Time'] || row['Out-Time'] || '').trim();

                const inMins = parseTimeFormatToMinutes(inTimeRaw);
                const outMins = parseTimeFormatToMinutes(outTimeRaw);

                const inTime = inMins !== null ? formatMinutesTo24h(inMins) : inTimeRaw;
                const outTime = outMins !== null ? formatMinutesTo24h(outMins) : outTimeRaw;

                const employeeId = String(row['Safety Pass No'] || '').trim();
                const addLunch = addLunchCheckbox ? addLunchCheckbox.checked : false;

                // 2. from persistent data
                let skillVal = null;
                let designationVal = null;
                let shiftsAllowedVal = [];
                let inOtAllowed = false;
                let outOtAllowed = false;

                const bypassPersistent = bypassPersistentDataCheckbox ? bypassPersistentDataCheckbox.checked : false;
                if (!bypassPersistent && typeof employee_details !== 'undefined') {
                    const empDetails = employee_details.find(e => e.sp_no === employeeId);
                    if (empDetails) {
                        skillVal = empDetails.skill || null;
                        designationVal = empDetails.designation || null;
                        shiftsAllowedVal = empDetails.allowedShifts || [];
                        inOtAllowed = !!empDetails.inOtAllowed;
                        outOtAllowed = !!empDetails.outOtAllowed;
                    }
                }

                // 3. shift, shiftIn, shiftOut: from assignShiftFunction
                const shift = assignShift(employeeId, inTime, outTime);
                let shiftIn = '';
                let shiftOut = '';
                let shiftInMins = null;
                let shiftOutMins = null;

                if (shift && SHIFT_DEFINITIONS[shift]) {
                    shiftIn = SHIFT_DEFINITIONS[shift].shiftIn;
                    shiftOut = SHIFT_DEFINITIONS[shift].shiftOut;
                    shiftInMins = parseTimeFormatToMinutes(shiftIn);
                    shiftOutMins = parseTimeFormatToMinutes(shiftOut);
                }

                // 4. dutyIn, dutyOut: calculateHours()
                const { dutyInMins, dutyOutMins } = calculateHours(inTime, outTime, shiftIn, shiftOut, inOtAllowed, outOtAllowed);
                const formattedDutyIn = dutyInMins !== null ? formatMinutesTo24h(dutyInMins) : '';
                const formattedDutyOut = dutyOutMins !== null ? formatMinutesTo24h(dutyOutMins) : '';

                // 5. dutyHours: calculateDutyHours()
                const dutyHours = calculateDutyHours(dutyInMins, dutyOutMins, shiftOutMins, shift, addLunch);

                // 6. otHours: calculateOtHours()
                const otHours = calculateOtHours(employeeId, shiftInMins, shiftOutMins, dutyInMins, dutyOutMins);

                // 7. totalHours: calculateHours()
                const totalHours = parseFloat((dutyHours + otHours).toFixed(2));

                return {
                    date: normalizedDate,
                    sp_no: employeeId,
                    name: row['Employee Name'] || '',
                    vendor_name: row['Vendor Name'] || '',
                    workorder_no: row['Workorder No'] || '',
                    dept_name: row['Department Name'] || '',
                    section: row['Section'] || '',
                    skill: skillVal,
                    inOT: inOtAllowed,
                    outOT: outOtAllowed,
                    designation: designationVal,
                    shiftsAllowed: shiftsAllowedVal,
                    shift: shift,
                    shiftIn: shiftIn,
                    shiftOut: shiftOut,
                    punchIn: inTime,
                    punchOut: outTime,
                    dutyIn: formattedDutyIn,
                    dutyOut: formattedDutyOut,
                    addLunch: addLunch,
                    dutyHours: parseFloat(dutyHours.toFixed(2)),
                    otHours: parseFloat(otHours.toFixed(2)),
                    totalHours: totalHours
                };
            });

        // Append to master list
        employeeData = employeeData.concat(processedRows);

        statusItem.classList.add('success');
        statusItem.querySelector('.status-text').textContent = 'Success';

    } catch (err) {
        console.error('processFile error:', err);
        statusItem.classList.add('error');
        statusItem.querySelector('.status-text').textContent = 'Failed';
    }
}


// PIPO FILE PROCESSING
// Handles punch-in/punch-out raw records with columns:
//   Date | Safety Pass No | Flag (IN/OUT) | Punch Time/HH:MM:SS
async function processPipoFile(file) {
    const statusItem = document.createElement('li');
    statusItem.className = 'status-item';
    statusItem.innerHTML = `
        <span class="file-name">${file.name}</span>
        <span class="status-text">Processing...</span>
    `;
    fileStatusList.appendChild(statusItem);

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to array-of-arrays to locate header row
        const rawJsonArray = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        console.log("Raw JSON Array:", rawJsonArray);

        // Look for a row that contains 'Safety No' or 'Safety Pass No' and 'Flag'
        let headerRowIndex = -1;
        for (let i = 0; i < rawJsonArray.length; i++) {
            const rowStr = rawJsonArray[i].join('').toLowerCase().replace(/\s+/g, '').replace(/-/g, '').replace(/\//g, '');
            if ((rowStr.includes('safetypassno') || rowStr.includes('safetyno')) && (rowStr.includes('flag') || rowStr.includes('punchtime'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error('Could not identify the header row. Expected columns: Safety No. (or Safety Pass No), Flag, Punch Time/HH:MM:SS');
        }

        // ---------- 2. Parse rows into data objects ----------
        const dataRows = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex, defval: '' });
        // console.log("Data Rows (parsed from Excel):", dataRows);

        const tempMap = {};
        dataRows.forEach(row => {
            let date = row['Date'] || '';
            // Convert Excel serial date number to readable date string
            if (typeof date === 'number') {
                const utcDays = date - 25569; // Excel epoch to Unix epoch offset
                const utcMs = utcDays * 86400 * 1000;
                const d = new Date(utcMs);
                const day = d.getUTCDate();
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                const mon = months[d.getUTCMonth()];
                const year = String(d.getUTCFullYear()).slice(-2);
                date = `${day}-${mon}-${year}`;
            }
            const spNo = row['Safety Pass No'] || row['Safety No.'] || '';
            const flag = row['Flag'] || '';
            const time = row['Punch Time/HH:MM:SS'] || row['Punch Time'] || '';
            const vendorName = row['Vendor Name'] || '';
            const workorderNo = row['Workorder No'] || '';

            if (!spNo) return;

            if (!tempMap[spNo]) {
                tempMap[spNo] = {
                    date: date,
                    [spNo]: {},
                    vendor_name: vendorName,
                    workorder_no: workorderNo
                };
            }

            if (flag) {
                // we'll push into an array to handle multiple punches for the same flag
                if (!tempMap[spNo][spNo][flag]) tempMap[spNo][spNo][flag] = [];
                tempMap[spNo][spNo][flag].push(time);
            }
        });

        const pipoRecords = Object.values(tempMap);
        console.log("pipoRecords:", pipoRecords);

        const pipoEmployeeDetails = pipoRecords.map(record => {
            const date = record.date;
            const vendorName = record.vendor_name;
            const workorderNo = record.workorder_no;
            // The safety_pass_no is the other key in the record Object
            const spNo = Object.keys(record).find(k => k !== 'date');

            let punchIn = null;
            let punchOut = null;

            if (spNo && record[spNo]) {
                const inTimes = record[spNo]['IN'] || [];
                const outTimes = record[spNo]['OUT'] || [];

                const validIn = inTimes.filter(t => t !== '').map(Number).filter(n => !isNaN(n));
                const validOut = outTimes.filter(t => t !== '').map(Number).filter(n => !isNaN(n));

                if (validIn.length > 0) {
                    punchIn = Math.min(...validIn);
                }
                if (validOut.length > 0) {
                    punchOut = Math.max(...validOut);
                }
            }

            return {
                date: date,
                sp_no: spNo,
                punchIn: punchIn,
                punchOut: punchOut,
                vendorName: vendorName,
                workorderNo: workorderNo
            };
        });

        console.log("pipoEmployeeDetails:", pipoEmployeeDetails);

        // ---------- Convert pipoEmployeeDetails into processedRows for employeeData ----------
        const addLunch = addLunchCheckbox ? addLunchCheckbox.checked : false;
        const processedRows = [];

        pipoEmployeeDetails.forEach(emp => {
            // Excel fractional-day → minutes → HH:MM string
            const inTime  = (emp.punchIn  !== null) ? formatMinutesTo24h(Math.round(emp.punchIn  * 1440)) : '';
            const outTime = (emp.punchOut !== null) ? formatMinutesTo24h(Math.round(emp.punchOut * 1440)) : '';

            const normalizedDate = emp.date ? normalizeDate(emp.date) : '';

            // Enrich from persistent employee_details
            let skillVal        = null;
            let designationVal  = null;
            let shiftsAllowedVal = [];
            let inOtAllowed     = false;
            let outOtAllowed    = false;
            let nameVal         = '';

            const bypassPersistent = bypassPersistentDataCheckbox ? bypassPersistentDataCheckbox.checked : false;
            if (!bypassPersistent && typeof employee_details !== 'undefined') {
                const empDetails = employee_details.find(e => e.sp_no === emp.sp_no);
                if (empDetails) {
                    skillVal         = empDetails.skill         || null;
                    designationVal   = empDetails.designation   || null;
                    shiftsAllowedVal = empDetails.allowedShifts || [];
                    inOtAllowed      = !!empDetails.inOtAllowed;
                    outOtAllowed     = !!empDetails.outOtAllowed;
                    nameVal          = empDetails.name          || '';
                }
            }

            // Assign shift
            const shift = assignShift(emp.sp_no, inTime, outTime);
            let shiftIn = '', shiftOut = '';
            let shiftInMins = null, shiftOutMins = null;

            if (shift && SHIFT_DEFINITIONS[shift]) {
                shiftIn     = SHIFT_DEFINITIONS[shift].shiftIn;
                shiftOut    = SHIFT_DEFINITIONS[shift].shiftOut;
                shiftInMins = parseTimeFormatToMinutes(shiftIn);
                shiftOutMins = parseTimeFormatToMinutes(shiftOut);
            }

            // Duty In / Duty Out
            const { dutyInMins, dutyOutMins } = calculateHours(inTime, outTime, shiftIn, shiftOut, inOtAllowed, outOtAllowed);
            const formattedDutyIn  = dutyInMins  !== null ? formatMinutesTo24h(dutyInMins)  : '';
            const formattedDutyOut = dutyOutMins !== null ? formatMinutesTo24h(dutyOutMins) : '';

            // Hours
            const dutyHours  = calculateDutyHours(dutyInMins, dutyOutMins, shiftOutMins, shift, addLunch);
            const otHours    = calculateOtHours(emp.sp_no, shiftInMins, shiftOutMins, dutyInMins, dutyOutMins);
            const totalHours = parseFloat((dutyHours + otHours).toFixed(2));

            processedRows.push({
                date:          normalizedDate,
                sp_no:         emp.sp_no,
                name:          nameVal,
                vendor_name:   emp.vendorName   || '',
                workorder_no:  emp.workorderNo  || '',
                dept_name:     '',
                section:       '',
                skill:         skillVal,
                inOT:          inOtAllowed,
                outOT:         outOtAllowed,
                designation:   designationVal,
                shiftsAllowed: shiftsAllowedVal,
                shift:         shift,
                shiftIn:       shiftIn,
                shiftOut:      shiftOut,
                punchIn:       inTime,
                punchOut:      outTime,
                dutyIn:        formattedDutyIn,
                dutyOut:       formattedDutyOut,
                addLunch:      addLunch,
                dutyHours:     parseFloat(dutyHours.toFixed(2)),
                otHours:       parseFloat(otHours.toFixed(2)),
                totalHours:    totalHours
            });
        });

        // Append to master list
        employeeData = employeeData.concat(processedRows);

        statusItem.classList.add('success');
        statusItem.querySelector('.status-text').textContent = 'Success';

    } catch (err) {
        console.error('processPipoFile error:', err);
        statusItem.classList.add('error');
        statusItem.querySelector('.status-text').textContent = 'Failed';
    }
}
// -----------------------------------------------

//DATA PROCESSING (MAIN) FUNCTIONS
//hours calc fn for duty-in and duty-out
function calculateHours(inTimeStr, outTimeStr, shiftInStr, shiftOutStr, allowedOtIn, allowedOtOut) {
    try {
        if (!inTimeStr || !outTimeStr || String(inTimeStr).toLowerCase() === 'off' || String(outTimeStr).toLowerCase() === 'off') {
            return { dutyInMins: null, dutyOutMins: null };
        }

        const inMins = parseTimeFormatToMinutes(inTimeStr);
        const outMins = parseTimeFormatToMinutes(outTimeStr);
        const shiftInMins = shiftInStr ? parseTimeFormatToMinutes(shiftInStr) : null;
        const shiftOutMins = shiftOutStr ? parseTimeFormatToMinutes(shiftOutStr) : null;

        if (inMins === null || outMins === null) {
            return { dutyInMins: null, dutyOutMins: null };
        }

        let dutyInMins = inMins;
        let dutyOutMins = outMins;

        // returns 0 hours if punch-in and punch-out are less than 60 minutes apart 
        // (using this explicitly to prevent Night Shift Allocation)[Eg. inTime: 6:01, outTime: 6:10; inTime+15min grace => outTime<inTime => Night Shift Allocated]
        let diffRaw = outMins - inMins;
        if (diffRaw < 0) diffRaw += 1440; // wrap around midnight

        if (diffRaw < 60) {
            dutyInMins = inMins;
            dutyOutMins = inMins;
            return { dutyInMins, dutyOutMins };
        }

        // IN TIME LOGIC
        if (shiftInMins !== null) {
            let nInMins = inMins;
            // Handle cross-day discrepancy (e.g. shift starts 22:00, punched at 01:00)
            if (inMins < shiftInMins - 720) nInMins += 1440;
            else if (inMins > shiftInMins + 720) nInMins -= 1440;

            if (nInMins > shiftInMins + 15) {
                // Late Check-In: Round UP to nearest 30 mins (Penalty)
                let r = Math.ceil(nInMins / 30) * 30;
                dutyInMins = (r % 1440 + 1440) % 1440;
            } else if (allowedOtIn && (shiftInMins - nInMins > 29)) {
                // Early OT: Round UP to nearest 30 mins (Reward)
                let r = Math.ceil(nInMins / 30) * 30;
                dutyInMins = (r % 1440 + 1440) % 1440;
            } else {
                // Normal / Grace period
                dutyInMins = shiftInMins;
            }
        } else {
            // No shift assigned
            dutyInMins = Math.ceil(inMins / 30) * 30;
            dutyOutMins = Math.floor(outMins / 30) * 30;
        }

        // OUT TIME LOGIC
        if (shiftOutMins !== null && shiftInMins !== null) {
            let nOutMins = outMins;
            if (outMins < inMins) nOutMins += 1440;

            let nShiftOut = shiftOutMins;
            if (shiftOutMins < shiftInMins) nShiftOut += 1440;

            if (nOutMins < nShiftOut) {
                // Early Leaver: Round DOWN to nearest 30 mins (Penalty)
                let r = Math.floor(nOutMins / 30) * 30;
                dutyOutMins = (r % 1440 + 1440) % 1440;
            } else if (allowedOtOut) {
                // OT Out: Round DOWN to nearest 30 mins (Reward)
                let r = Math.floor(nOutMins / 30) * 30;
                dutyOutMins = (r % 1440 + 1440) % 1440;
            } else {
                // Normal departure (no OT)
                dutyOutMins = shiftOutMins;
            }
        } else if (shiftOutMins !== null) {
            dutyOutMins = shiftOutMins;
        }

        return {
            dutyInMins,
            dutyOutMins
        };
    } catch (err) {
        console.error('calculateHours error:', err);
        return { dutyInMins: null, dutyOutMins: null };
    }
}

function calculateDutyHours(dutyInMins, dutyOutMins, shiftOutMins, shiftStr, addLunch) {
    if (dutyInMins === null || dutyOutMins === null) return 0;

    let endMins = shiftOutMins !== null ? shiftOutMins : dutyOutMins;

    let diffActual = dutyOutMins - dutyInMins;
    if (dutyOutMins < dutyInMins) diffActual += 1440;

    let diffShift = endMins - dutyInMins;
    if (endMins < dutyInMins) diffShift += 1440;

    let diffMins = Math.min(diffActual, diffShift);
    if (diffMins < 0) diffMins = 0;

    let totalHours = diffMins / 60;
    let maxDuty = 8;

    if (shiftStr === 'G' || shiftStr === 'W1') {
        if (!addLunch) {
            totalHours = Math.max(0, totalHours - 1);
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

function calculateOtHours(employeeId, shiftInMins, shiftOutMins, dutyInMins, dutyOutMins) {
    if (shiftOutMins === null || dutyOutMins === null || dutyInMins === null || shiftInMins === null) return 0;

    const empDetails = (typeof employee_details !== 'undefined')
        ? employee_details.find(e => e.sp_no === employeeId)
        : null;

    if (!empDetails) return 0;

    let inOt = 0, outOt = 0;

    // Helper: midnight-aware difference
    function getDiff(target, actual, isArrival) {
        let d = isArrival ? (target - actual) : (actual - target);
        if (d < -720) d += 1440;
        if (d > 720) d -= 1440;
        return d;
    }

    //OT applicable only when ot >= 1h

    if (empDetails.inOtAllowed) {
        const diffIn = getDiff(shiftInMins, dutyInMins, true);
        if (diffIn > 59) inOt = diffIn;
    }

    if (empDetails.outOtAllowed) {
        const diffOut = getDiff(shiftOutMins, dutyOutMins, false);
        if (diffOut > 59) outOt = diffOut;
    }

    // Round to nearest 0.5h
    let totalOtMins = inOt + outOt;
    let otHours = Math.floor(totalOtMins / 30) * 0.5;

    return otHours;
}

// Assigns the correct shift by finding the nearest shiftIn to punchIn else if shiftOut to punchOut else punchIn to shiftDefinitions
function assignShift(employeeId, punchIn, punchOut) {
    try {
        const punchInMins = punchIn ? parseTimeFormatToMinutes(punchIn) : null;
        const punchOutMins = punchOut ? parseTimeFormatToMinutes(punchOut) : null;

        const abcShifts = ['A', 'B', 'C'];
        const gwShifts = ['G', 'W1'];

        let bestShift = 'NA';
        let bestDiff = Infinity;

        // Helper: midnight-aware absolute difference
        function timeDiff(a, b) {
            let d = Math.abs(a - b);
            if (d > 720) d = 1440 - d;
            return d;
        }

        // --- Step 1a: Try A, B, C shifts using punch-in against shiftIn ---
        if (punchInMins !== null) {
            abcShifts.forEach(shiftKey => {
                const def = SHIFT_DEFINITIONS[shiftKey];
                if (!def) return;
                const target = parseTimeFormatToMinutes(def.shiftIn);
                if (target === null) return;

                const diff = timeDiff(punchInMins, target);
                if (diff <= 120 && diff < bestDiff) {
                    bestDiff = diff;
                    bestShift = shiftKey;
                }
            });
        }

        // --- Step 1b: Fallback – if no A/B/C match on punchIn, try punchOut against shiftOut ---
        if (bestShift === 'NA' && punchOutMins !== null) {
            abcShifts.forEach(shiftKey => {
                const def = SHIFT_DEFINITIONS[shiftKey];
                if (!def) return;
                const target = parseTimeFormatToMinutes(def.shiftOut);
                if (target === null) return;

                const diff = timeDiff(punchOutMins, target);
                if (diff <= 120 && diff < bestDiff) {
                    bestDiff = diff;
                    bestShift = shiftKey;
                }
            });
        }

        // --- Step 2: Try G, W1 shifts using both punch-in and punch-out ---
        // Collect candidates with their proximity scores
        const gwCandidates = [];
        gwShifts.forEach(shiftKey => {
            const def = SHIFT_DEFINITIONS[shiftKey];
            if (!def) return;

            const shiftInMins = parseTimeFormatToMinutes(def.shiftIn);
            const shiftOutMins = parseTimeFormatToMinutes(def.shiftOut);
            if (shiftInMins === null || shiftOutMins === null) return;

            let totalDiff = 0;
            let matchCount = 0;

            if (punchInMins !== null) {
                totalDiff += timeDiff(punchInMins, shiftInMins);
                matchCount++;
            }
            if (punchOutMins !== null) {
                totalDiff += timeDiff(punchOutMins, shiftOutMins);
                matchCount++;
            }

            if (matchCount > 0) {
                const avgDiff = totalDiff / matchCount;
                if (avgDiff <= 120) {
                    // Estimate total working hours for this shift
                    const effectiveIn = punchInMins !== null ? Math.max(punchInMins, shiftInMins) : shiftInMins;
                    const effectiveOut = punchOutMins !== null ? Math.min(punchOutMins, shiftOutMins) : shiftOutMins;
                    let estMins = effectiveOut - effectiveIn;
                    if (estMins < 0) estMins += 1440;
                    if (estMins > 720) estMins = 0; // sanity cap

                    gwCandidates.push({ shiftKey, avgDiff, estMins });
                }
            }
        });

        // Pick best G/W1: if proximity scores are close (within 30 min), prefer max hours
        if (gwCandidates.length > 0) {
            gwCandidates.sort((a, b) => {
                const diffGap = Math.abs(a.avgDiff - b.avgDiff);
                if (diffGap <= 30) {
                    // Close proximity — prefer shift with more estimated hours
                    const hoursDiff = b.estMins - a.estMins;
                    if (hoursDiff !== 0) return hoursDiff;
                    // Same hours — prefer closer proximity
                    return a.avgDiff - b.avgDiff;
                }
                return a.avgDiff - b.avgDiff;
            });

            const topGw = gwCandidates[0];
            if (topGw.avgDiff < bestDiff) {
                bestDiff = topGw.avgDiff;
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

//FINAL DETAILS ALLOCATION FUNCTION TO EMP OBJECT
function reprocessData() {
    try {
        const addLunch = addLunchCheckbox ? addLunchCheckbox.checked : false;
        employeeData.forEach(row => {
            row.addLunch = addLunch; // update the stored value so the table reflects it

            // 1. data from row
            const punch_in = row.punchIn;
            const punch_out = row.punchOut;
            const employeeId = row.sp_no;

            if (punch_in && punch_out && punch_in !== 'N/A' && punch_out !== 'N/A') {
                // 2. from persistent data
                const inOtAllowed = row.inOT;
                const outOtAllowed = row.outOT;

                // 3. shift, shiftIn, shiftOut
                const shift = row.shift;
                const shiftIn = row.shiftIn;
                const shiftOut = row.shiftOut;
                const shiftInMins = shiftIn ? parseTimeFormatToMinutes(shiftIn) : null;
                const shiftOutMins = shiftOut ? parseTimeFormatToMinutes(shiftOut) : null;

                // 4. dutyIn, dutyOut: calculateHours()
                const { dutyInMins, dutyOutMins } = calculateHours(punch_in, punch_out, shiftIn, shiftOut, inOtAllowed, outOtAllowed);

                // 5. dutyHours: calculateDutyHours()
                const dutyHours = calculateDutyHours(dutyInMins, dutyOutMins, shiftOutMins, shift, addLunch);

                // 6. otHours: calculateOtHours()
                const otHours = calculateOtHours(employeeId, shiftInMins, shiftOutMins, dutyInMins, dutyOutMins);

                // 7. totalHours: calculateHours()
                const totalHours = parseFloat((dutyHours + otHours).toFixed(2));

                row.dutyIn = dutyInMins !== null ? formatMinutesTo24h(dutyInMins) : '';
                row.dutyOut = dutyOutMins !== null ? formatMinutesTo24h(dutyOutMins) : '';
                row.dutyHours = parseFloat(dutyHours.toFixed(2));
                row.otHours = parseFloat(otHours.toFixed(2));
                row.totalHours = totalHours;
            }
        });
        // 8. RenderTable
        renderTable();
    } catch (err) {
        console.error('reprocessData error:', err);
    }
}

// -----------------------------------------------
// DATE, TIME NORMALISATION FUNCTIONS
// Converts standard "hh:mm AM/PM" format to minutes since midnight
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

// Formats minutes since midnight to "HH:mm" (24h format)
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

// Date normalization function 
function normalizeDate(dateStr) {
    try {
        if (!dateStr) return 'N/A';

        // Just a basic cleanup for now, it's already extracted.
        // Replace slashes with dashes, trim spaces.
        let clean = dateStr.replace(/\//g, '-').trim();

        // Remove extra trailing words from extraction edge cases?
        // the regex .match(/Date\s*:\s*(.*)/) could capture garbage.
        const strictMatch = clean.match(/(\d{1,2}[-\s/]\d{1,2}[-\s/]\d{2,4})/);
        if (strictMatch) {
            clean = strictMatch[1].replace(/\s+/g, '-'); // replace spaces with dashes
        }

        return clean;
    } catch (err) {
        console.error('normalizeDate error:', err);
        return 'N/A';
    }
}

// Parses date string (dd-mm-yyyy or dd/mm/yyyy) into a sortable timestamp
function parseSortableDate(dateStr) {
    try {
        if (!dateStr || dateStr === 'N/A') return 0;
        const parts = dateStr.split(/[-\/]/);
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day).getTime();
        }
        return 0;
    } catch (err) {
        console.error('parseSortableDate error:', err);
        return 0;
    }
}
// -----------------------------------------------

//TABLE RENDERING FUNCTIONS
// -----------------------------------------------

// Render table functions
function renderTable() {
    try {
        if (dataTable) dataTable.classList.add('main-view');
        const btnExit = document.getElementById('btnExitAggregate');
        if (btnExit) btnExit.style.display = 'none';

        if (employeeData.length === 0) return;

        const thead = document.querySelector('#dataTable thead');
        if (thead) {
            thead.innerHTML = `
                <tr>
                    <th>SN</th>
                    <th class="sortable-header" onclick="toggleSort('date')">
                        DATE ${sortArrowsHtml('date')}
                    </th>
                    <th>SP NO</th>
                    <th class="sortable-header" onclick="toggleSort('name')">
                        NAME ${sortArrowsHtml('name')}
                    </th>
                    <th>PUNCH IN</th>
                    <th>PUNCH OUT</th>
                    <th class="highlight-header">TOTAL HRS</th>
                    <th>DUTY HRS</th>
                    <th>OT HRS</th>
                    <th>ADD LUNCH</th>
                    <th class="sortable-header" onclick="toggleSort('shiftsAllowed')">
                        SHIFTS ALLOWED ${sortArrowsHtml('shiftsAllowed')}
                    </th>
                    <th class="sortable-header" onclick="toggleSort('shift')">
                        SHIFT ${sortArrowsHtml('shift')}
                    </th>
                    <th>SHIFT IN</th>
                    <th>SHIFT OUT</th>
                    <th>DUTY IN</th>
                    <th>DUTY OUT</th>
                    <th class="sortable-header" onclick="toggleSort('skill')">
                        SKILL ${sortArrowsHtml('skill')}
                    </th>
                    <th>IN-OT</th>
                    <th>OUT-OT</th>
                    <th class="sortable-header" onclick="toggleSort('designation')">
                        DESIGNATION ${sortArrowsHtml('designation')}
                    </th>
                    <th>VENDOR NAME</th>
                    <th>WORKORDER NO</th>
                    <th>DEPT NAME</th>
                    <th>SECTION</th>
                </tr>
            `;
        }

        tableBody.innerHTML = ''; // clear empty state

        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filteredData = employeeData.filter(row => {
            if (!query) return true;
            const searchStr = `${row.sp_no} ${row.name} ${row.vendor_name} ${row.shift}`.toLowerCase();
            return searchStr.includes(query);
        });

        // Apply active sorts (last toggled takes priority via stable sort)
        const strCompare = (va, vb, order) => {
            const sa = String(va || '').toLowerCase();
            const sb = String(vb || '').toLowerCase();
            const cmp = sa.localeCompare(sb);
            return order === 'asc' ? cmp : -cmp;
        };

        if (sortStates.date !== 'none') {
            filteredData.sort((a, b) => {
                const dateA = parseSortableDate(a.date);
                const dateB = parseSortableDate(b.date);
                return sortStates.date === 'asc' ? dateA - dateB : dateB - dateA;
            });
        }
        if (sortStates.name !== 'none') {
            filteredData.sort((a, b) => strCompare(a.name, b.name, sortStates.name));
        }
        if (sortStates.skill !== 'none') {
            filteredData.sort((a, b) => strCompare(a.skill, b.skill, sortStates.skill));
        }
        if (sortStates.designation !== 'none') {
            filteredData.sort((a, b) => strCompare(a.designation, b.designation, sortStates.designation));
        }
        if (sortStates.shiftsAllowed !== 'none') {
            filteredData.sort((a, b) => strCompare(
                (a.shiftsAllowed || []).join(','),
                (b.shiftsAllowed || []).join(','),
                sortStates.shiftsAllowed
            ));
        }
        if (sortStates.shift !== 'none') {
            filteredData.sort((a, b) => strCompare(a.shift, b.shift, sortStates.shift));
        }

        if (filteredData.length === 0) {
            tableBody.innerHTML = `
                <tr class="empty-state-row">
                    <td colspan="24">
                        <div class="empty-state">
                            <p>NO MATCHING RECORDS FOUND</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        // Render filtered rows
        filteredData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td title="date">${row.date || ''}</td>
                <td title="sp-no">${row.sp_no || ''}</td>
                <td title="name">${row.name || ''}</td>
                <td title="punch-in">${row.punchIn || ''}</td>
                <td title="punch-out">${row.punchOut || ''}</td>
                <td title="total-hrs" class="highlight-hours">${row.totalHours ?? ''}</td>
                <td title="duty-hrs">${row.dutyHours ?? ''}</td>
                <td title="ot-hrs">${row.otHours ?? ''}</td>
                <td title="add-lunch">${row.addLunch ? 'Yes' : 'No'}</td>
                <td title="shifts-allowed">${(row.shiftsAllowed || []).join(', ') || ''}</td>
                <td title="shift"${(row.shiftsAllowed && !row.shiftsAllowed.includes(row.shift)) ? ' style="background-color: #E36A6A;"' : ''}>${row.shift || ''}</td>
                <td title="shift-in">${row.shiftIn || ''}</td>
                <td title="shift-out">${row.shiftOut || ''}</td>
                <td title="duty-in">${row.dutyIn || ''}</td>
                <td title="duty-out">${row.dutyOut || ''}</td>
                <td title="skill">${row.skill || ''}</td>
                <td title="in-ot">${row.inOT ? 'Yes' : 'No'}</td>
                <td title="out-ot">${row.outOT ? 'Yes' : 'No'}</td>
                <td title="${('designation: ' + row.designation) || 'designation N/A'}">${row.designation || ''}</td>
                <td title="vendor-name">${row.vendor_name || ''}</td>
                <td title="workorder-no">${row.workorder_no || ''}</td>
                <td title="dept-name">${row.dept_name || ''}</td>
                <td title="section">${row.section || ''}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        console.error('renderTable error:', err);
    }
}

function renderAggregatedTable(data, columns) {
    try {
        if (dataTable) dataTable.classList.remove('main-view');
        const thead = document.querySelector('#dataTable thead');
        const tbody = document.getElementById('tableBody');

        // Build header
        let headerHTML = '<tr>';
        columns.forEach(col => {
            if (col === 'Total Hours' || col === 'Total Shifts') {
                headerHTML += `<th class="highlight-header">${col}</th>`;
            } else {
                headerHTML += `<th>${col}</th>`;
            }
        });
        headerHTML += '</tr>';
        thead.innerHTML = headerHTML;

        // Build body
        tbody.innerHTML = '';
        data.forEach(row => {
            const tr = document.createElement('tr');
            let rowHTML = '';
            columns.forEach(col => {
                if (col === 'Total Hours' || col === 'Total Shifts') {
                    rowHTML += `<td class="highlight-hours">${row[col]}</td>`;
                } else {
                    rowHTML += `<td>${row[col]}</td>`;
                }
            });
            tr.innerHTML = rowHTML;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('renderAggregatedTable error:', err);
    }
}
//----------------------------------------

// AGGREGATE FNS
function getEmployeeAggregatedData() {
    try {
        if (employeeData.length === 0) return [];

        const aggregated = {};
        employeeData.forEach(row => {
            let empId = row.sp_no;
            const name = row.name;
            // Ignore rows without employee ID
            if (!empId) return;

            empId = String(empId).trim();

            const key = `${empId}|${name}`;
            if (!aggregated[key]) {
                aggregated[key] = {
                    'Safety Pass No': empId,
                    'Employee Name': name,
                    'Total Hours': 0
                };
            }
            aggregated[key]['Total Hours'] += (parseFloat(row.totalHours) || 0);
        });

        return Object.values(aggregated).map((item, index) => ({
            'SL.NO.': index + 1,
            'Safety Pass No': item['Safety Pass No'],
            'Employee Name': item['Employee Name'],
            'Total Hours': parseFloat(item['Total Hours'].toFixed(2)),
            'Total Shifts': parseFloat((item['Total Hours'] / 8).toFixed(2))
        }));
    } catch (err) {
        console.error('getEmployeeAggregatedData error:', err);
        return [];
    }
}

function getSkillAggregatedData() {
    try {
        if (employeeData.length === 0) return [];

        const aggregated = {};

        employeeData.forEach(row => {
            let empId = row.sp_no;
            if (!empId) return;
            empId = String(empId).trim();

            const rawSkill = row.skill || 'UNKNOWN';
            const skill = String(rawSkill).toUpperCase();

            if (aggregated[skill] === undefined) {
                aggregated[skill] = 0;
            }
            aggregated[skill] += (parseFloat(row.totalHours) || 0);
        });

        return Object.keys(aggregated)
            .map((skill, index) => ({
                'SL.NO.': index + 1,
                'Skill Level': skill,
                'Total Hours': parseFloat(aggregated[skill].toFixed(2)),
                'Total Shifts': parseFloat((aggregated[skill] / 8).toFixed(2))
            }));
    } catch (err) {
        console.error('getSkillAggregatedData error:', err);
        return [];
    }
}

function employeewiseTotalHours() {
    try {
        const resultData = getEmployeeAggregatedData();
        if (resultData.length === 0) return;
        renderAggregatedTable(resultData, ['SL.NO.', 'Safety Pass No', 'Employee Name', 'Total Hours', 'Total Shifts']);
        const btnExit = document.getElementById('btnExitAggregate');
        if (btnExit) btnExit.style.display = 'flex';
    } catch (err) {
        console.error('employeewiseTotalHours error:', err);
    }
}

function skillwiseTotalHours() {
    try {
        const resultData = getSkillAggregatedData();
        if (resultData.length === 0) return;
        renderAggregatedTable(resultData, ['SL.NO.', 'Skill Level', 'Total Hours', 'Total Shifts']);
        const btnExit = document.getElementById('btnExitAggregate');
        if (btnExit) btnExit.style.display = 'flex';
    } catch (err) {
        console.error('skillwiseTotalHours error:', err);
    }
}

//excel export fn
function exportToExcel() {
    try {
        if (employeeData.length === 0) return;

        const workbook = XLSX.utils.book_new();

        const ws1 = XLSX.utils.json_to_sheet(employeeData);
        XLSX.utils.book_append_sheet(workbook, ws1, "AttendanceData");

        const empData = getEmployeeAggregatedData();
        if (empData.length > 0) {
            const ws2 = XLSX.utils.json_to_sheet(empData);
            XLSX.utils.book_append_sheet(workbook, ws2, "EmployeeHours");
        }

        const skillData = getSkillAggregatedData();
        if (skillData.length > 0) {
            const ws3 = XLSX.utils.json_to_sheet(skillData);
            XLSX.utils.book_append_sheet(workbook, ws3, "SkillHours");
        }

        XLSX.writeFile(workbook, "Calculated_Working_Hours.xlsx");
    } catch (err) {
        console.error('exportToExcel error:', err);
    }
}