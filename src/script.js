// Core Application Logic for Working Hours Calculator

const fileInput = document.getElementById('fileInput');
const statusSection = document.getElementById('statusSection');
const fileStatusList = document.getElementById('fileStatusList');
const fileCountBadge = document.getElementById('fileCountBadge');
const dataTable = document.getElementById('dataTable');
const tableBody = document.getElementById('tableBody');
const exportBtn = document.getElementById('exportBtn');
const searchInput = document.getElementById('searchInput');

let allProcessedData = [];

// Listen for file selections
fileInput.addEventListener('change', handleFileSelect);
exportBtn.addEventListener('click', exportToExcel);
if (searchInput) searchInput.addEventListener('input', renderTable);

async function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    statusSection.style.display = 'block';

    // Clear previous list if running again? Or append? Let's clear for new batch.
    fileStatusList.innerHTML = '';
    allProcessedData = [];
    tableBody.innerHTML = ''; // clear table

    fileCountBadge.textContent = `${files.length} File${files.length > 1 ? 's' : ''}`;

    for (const file of files) {
        await processFile(file);
    }

    // Render the processed data
    renderTable();

    if (allProcessedData.length > 0) {
        exportBtn.disabled = false;
    }
}

async function processFile(file) {
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
            const rowStr = row.join('').toLowerCase();
            // Look for columns we know exist
            if (rowStr.includes('safetypassno') || rowStr.includes('employeename') || rowStr.includes('in time')) {
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
            .filter(row => row['Employee Name'] && String(row['Employee Name']).trim() !== '') // Ignore empty footprint rows
            .map((row, index) => {
                const inTimeRaw = String(row['In Time'] || row['In-Time'] || '').trim();
                const outTimeRaw = String(row['Out Time'] || row['Out-Time'] || '').trim();

                const inMins = parseTimeFormatToMinutes(inTimeRaw);
                const outMins = parseTimeFormatToMinutes(outTimeRaw);

                const inTime = inMins !== null ? formatMinutesTo24h(inMins) : inTimeRaw;
                const outTime = outMins !== null ? formatMinutesTo24h(outMins) : outTimeRaw;

                let shift = String(row['Shift'] || '').trim().toUpperCase();
                const employeeId = String(row['Safety Pass No'] || '').trim();

                shift = assignShift(employeeId, shift);

                let shiftIn = '';
                let shiftOut = '';
                if (shift && SHIFT_DEFINITIONS[shift]) {
                    shiftIn = SHIFT_DEFINITIONS[shift].shiftIn;
                    shiftOut = SHIFT_DEFINITIONS[shift].shiftOut;
                }

                const calc = calculateHours(inTime, outTime, shift, shiftIn);

                const formattedDutyIn = calc.dutyInMins !== null ? formatMinutesTo24h(calc.dutyInMins) : '';
                const formattedDutyOut = calc.dutyOutMins !== null ? formatMinutesTo24h(calc.dutyOutMins) : '';

                return {
                    'SL.NO.': allProcessedData.length + index + 1,
                    'Date': normalizedDate,
                    'Safety Pass No': row['Safety Pass No'] || '',
                    'Employee Name': row['Employee Name'] || '',
                    'Vendor Code': row['Vendor Code'] || '',
                    'Shift': shift === null ? '' : shift,
                    'Shift-In': shiftIn === undefined ? 'N/A' : shiftIn,
                    'Shift-Out': shiftOut === undefined ? 'N/A' : shiftOut,
                    'In-Time': inTime === undefined ? 'N/A' : inTime,
                    'Out-Time': outTime === undefined ? 'N/A' : outTime,
                    'Duty-In': formattedDutyIn === undefined ? 'N/A' : formattedDutyIn,
                    'Duty-Out': formattedDutyOut === undefined ? 'N/A' : formattedDutyOut,
                    'Duty-Hours': calc.dutyHours === undefined ? 'N/A' : calc.dutyHours,
                    'OT-Hours': calc.otHours === undefined ? 'N/A' : calc.otHours,
                    'NET-HOURS': calc.netHours === undefined ? 'N/A' : calc.netHours,
                };
            });

        // Append to master list
        // Update SL NO based on master list length as we append
        const updatedProcessedRows = processedRows.map((r, i) => ({ ...r, 'SL.NO.': allProcessedData.length + i + 1 }));
        allProcessedData = allProcessedData.concat(updatedProcessedRows);

        statusItem.classList.add('success');
        statusItem.querySelector('.status-text').textContent = 'Success';

    } catch (err) {
        console.error(err);
        statusItem.classList.add('error');
        statusItem.querySelector('.status-text').textContent = 'Failed';
    }
}
//hours calc fn
function calculateHours(inTimeStr, outTimeStr, shiftStr, shiftInStr) {
    if (!inTimeStr || !outTimeStr || String(inTimeStr).toLowerCase() === 'off' || String(outTimeStr).toLowerCase() === 'off') {
        return { dutyInMins: null, dutyOutMins: null, netHours: 0 };
    }

    // Attempt to parse manually (hh:mm AM/PM)
    const inMins = parseTimeFormatToMinutes(inTimeStr);
    const outMins = parseTimeFormatToMinutes(outTimeStr);
    const shiftInMins = shiftInStr ? parseTimeFormatToMinutes(shiftInStr) : null;

    if (inMins === null || outMins === null) {
        return { dutyInMins: null, dutyOutMins: null, netHours: 0 };
    }

    let dutyInMins = inMins;
    let dutyOutMins = outMins;

    // if (shiftStr === 'C') {
    //     dutyInMins = Math.ceil(inMins / 30) * 30;
    //     dutyOutMins = Math.floor(outMins / 30) * 30;
    // } else if (shiftInMins !== null) {
    //     if (inMins <= shiftInMins + 15) {
    //         dutyInMins = shiftInMins;
    //     } else {
    //         dutyInMins = Math.ceil(inMins / 30) * 30;
    //     }

    //     dutyOutMins = Math.floor(outMins / 30) * 30;
    // }
    if (shiftInMins !== null && inMins > shiftInMins && inMins <= shiftInMins + 15)
        dutyInMins = shiftInMins;
    else
        dutyInMins = Math.ceil(inMins / 30) * 30;
    dutyOutMins = Math.floor(outMins / 30) * 30;

    // If outTime is smaller, it crossed midnight (next day)
    let diffMins = dutyOutMins - dutyInMins;
    if (outMins < inMins) {
        diffMins += 24 * 60;
    } else if (diffMins < 0) {
        diffMins = 0;
    }

    let totalHours = diffMins / 60;

    // Lunch hour is not to be calculated by the app's end, so netHours = totalHours
    let netHours = totalHours;
    let otHours = totalHours > 8 ? totalHours - 8 : 0;
    let dutyHours = totalHours - otHours;

    if (diffMins < 30) {
        netHours = 0;
        otHours = 0;
        dutyHours = 0;
    }

    return {
        dutyInMins,
        dutyOutMins,
        netHours: parseFloat(netHours.toFixed(2)),
        otHours: parseFloat(otHours.toFixed(2)),
        dutyHours: parseFloat(dutyHours.toFixed(2))
    };
}

// assigns shift - for assigning custom shift to Drivers
function assignShift(employeeId, currentShift) {
    if (!DRIVERS.includes(employeeId) && currentShift === 'G') {
        return 'W1';
    }
    return currentShift;
}

// Converts standard "hh:mm AM/PM" format to minutes since midnight
function parseTimeFormatToMinutes(timeStr) {
    const timeMatch = String(timeStr).trim().match(/^(\d{1,2})[.:]?(\d{2})?\s*([aApP][mM])?$/);
    if (!timeMatch) return null;

    let hours = parseInt(timeMatch[1], 10);
    const mins = parseInt(timeMatch[2] || '0', 10);
    const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + mins;
}

// Formats minutes since midnight to "HH:mm" (24h format)
function formatMinutesTo24h(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

// Date normalization function 
function normalizeDate(dateStr) {
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
}

function renderTable() {
    if (allProcessedData.length === 0) return;

    tableBody.innerHTML = ''; // clear empty state

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filteredData = allProcessedData.filter(row => {
        if (!query) return true;
        const searchStr = `${row['Safety Pass No']} ${row['Employee Name']} ${row['Vendor Code']} ${row['Shift']}`.toLowerCase();
        return searchStr.includes(query);
    });

    if (filteredData.length === 0) {
        tableBody.innerHTML = `
            <tr class="empty-state-row">
                <td colspan="15">
                    <div class="empty-state">
                        <p>NO MATCHING RECORDS FOUND</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    // Render filtered rows
    filteredData.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row['SL.NO.']}</td>
            <td>${row['Date']}</td>
            <td>${row['Safety Pass No']}</td>
            <td>${row['Employee Name']}</td>
            <!-- <td>${row['Vendor Code']}</td> -->
            <td>${row['Shift']}</td>
            <td>${row['Shift-In']}</td>
            <td>${row['Shift-Out']}</td>
            <td>${row['In-Time']}</td>
            <td>${row['Out-Time']}</td>
            <!-- <td>${row['Duty-In']}</td> -->
            <!-- <td>${row['Duty-Out']}</td> -->
            <td>${row['Duty-Hours']}</td>
            <td>${row['OT-Hours']}</td>
            <td class="highlight-hours">${row['NET-HOURS']}</td>
        `;
        tableBody.appendChild(tr);
    });
}

//excel export fn
function exportToExcel() {
    if (allProcessedData.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(allProcessedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Processed Attendance");

    XLSX.writeFile(workbook, "Calculated_Working_Hours.xlsx");
}