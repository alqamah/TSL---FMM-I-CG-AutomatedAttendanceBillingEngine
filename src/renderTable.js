// renderTable.js
// Table rendering, aggregate view, and Excel export functions.
// Dependencies: hoursProcessing.js (parseSortableDate), main.js (employeeData, DOM refs, sortStates)

// -----------------------------------------------
// MAIN TABLE RENDER
// -----------------------------------------------

/**
 * Renders (or re-renders) the main employee-data table.
 * Applies the active search filter and all active column sorts before painting rows.
 */
function renderTable() {
    try {
        if (dataTable) dataTable.classList.add('main-view');
        const btnExit = document.getElementById('btnExitAggregate');
        if (btnExit) btnExit.style.display = 'none';

        const tableContainer = document.getElementById('tableContainer');
        if (employeeData.length === 0) {
            if (tableContainer) tableContainer.style.display = 'none';
            return;
        }

        // Show the table container now that we have data
        if (tableContainer) tableContainer.style.display = '';

        // Build sortable column headers
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

        tableBody.innerHTML = '';

        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

        const filteredData = employeeData.filter(row => {
            if (!query) return true;
            const searchStr = `${row.sp_no} ${row.name} ${row.vendor_name} ${row.shift}`.toLowerCase();
            return searchStr.includes(query);
        });

        // Apply active column sorts (stable sort: last toggled wins)
        const strCompare = (va, vb, order) => {
            const sa  = String(va || '').toLowerCase();
            const sb  = String(vb || '').toLowerCase();
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
        if (sortStates.name         !== 'none') filteredData.sort((a, b) => strCompare(a.name,        b.name,        sortStates.name));
        if (sortStates.skill        !== 'none') filteredData.sort((a, b) => strCompare(a.skill,       b.skill,       sortStates.skill));
        if (sortStates.designation  !== 'none') filteredData.sort((a, b) => strCompare(a.designation, b.designation, sortStates.designation));
        if (sortStates.shiftsAllowed !== 'none') {
            filteredData.sort((a, b) => strCompare(
                (a.shiftsAllowed || []).join(','),
                (b.shiftsAllowed || []).join(','),
                sortStates.shiftsAllowed
            ));
        }
        if (sortStates.shift !== 'none') filteredData.sort((a, b) => strCompare(a.shift, b.shift, sortStates.shift));

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

// -----------------------------------------------
// AGGREGATED VIEW RENDERER
// -----------------------------------------------

/**
 * Renders a generic aggregated data table (replaces the main table view).
 * @param {object[]} data    - Array of row objects with keys matching `columns`.
 * @param {string[]} columns - Ordered list of column names to display.
 */
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

// -----------------------------------------------
// AGGREGATE CALCULATION FUNCTIONS
// -----------------------------------------------

/**
 * Returns employee-wise aggregated total hours and shift counts.
 * @returns {object[]}
 */
function getEmployeeAggregatedData() {
    try {
        if (employeeData.length === 0) return [];

        const aggregated = {};
        employeeData.forEach(row => {
            let empId = row.sp_no;
            if (!empId) return;
            empId = String(empId).trim();

            const key = `${empId}|${row.name}`;
            if (!aggregated[key]) {
                aggregated[key] = {
                    'Safety Pass No': empId,
                    'Employee Name':  row.name,
                    'Total Hours':    0
                };
            }
            aggregated[key]['Total Hours'] += (parseFloat(row.totalHours) || 0);
        });

        return Object.values(aggregated).map((item, index) => ({
            'SL.NO.':         index + 1,
            'Safety Pass No': item['Safety Pass No'],
            'Employee Name':  item['Employee Name'],
            'Total Hours':    parseFloat(item['Total Hours'].toFixed(2)),
            'Total Shifts':   parseFloat((item['Total Hours'] / 8).toFixed(2))
        }));
    } catch (err) {
        console.error('getEmployeeAggregatedData error:', err);
        return [];
    }
}

/**
 * Returns skill-wise aggregated total hours and shift counts.
 * @returns {object[]}
 */
function getSkillAggregatedData() {
    try {
        if (employeeData.length === 0) return [];

        const aggregated = {};
        employeeData.forEach(row => {
            if (!row.sp_no) return;
            const skill = String(row.skill || 'UNKNOWN').toUpperCase();
            aggregated[skill] = (aggregated[skill] || 0) + (parseFloat(row.totalHours) || 0);
        });

        return Object.keys(aggregated).map((skill, index) => ({
            'SL.NO.':      index + 1,
            'Skill Level': skill,
            'Total Hours': parseFloat(aggregated[skill].toFixed(2)),
            'Total Shifts':parseFloat((aggregated[skill] / 8).toFixed(2))
        }));
    } catch (err) {
        console.error('getSkillAggregatedData error:', err);
        return [];
    }
}

// -----------------------------------------------
// AGGREGATE VIEW TRIGGERS (called from HTML)
// -----------------------------------------------

/** Displays the employee-wise total-hours aggregated view. */
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

/** Displays the skill-wise total-hours aggregated view. */
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

// -----------------------------------------------
// EXCEL EXPORT
// -----------------------------------------------

/**
 * Exports `employeeData` and both aggregate views to a multi-sheet XLSX file.
 */
function exportToExcel() {
    try {
        if (employeeData.length === 0) return;

        const workbook = XLSX.utils.book_new();

        const ws1 = XLSX.utils.json_to_sheet(employeeData);
        XLSX.utils.book_append_sheet(workbook, ws1, 'AttendanceData');

        const empData = getEmployeeAggregatedData();
        if (empData.length > 0) {
            const ws2 = XLSX.utils.json_to_sheet(empData);
            XLSX.utils.book_append_sheet(workbook, ws2, 'EmployeeHours');
        }

        const skillData = getSkillAggregatedData();
        if (skillData.length > 0) {
            const ws3 = XLSX.utils.json_to_sheet(skillData);
            XLSX.utils.book_append_sheet(workbook, ws3, 'SkillHours');
        }

        XLSX.writeFile(workbook, 'Calculated_Working_Hours.xlsx');
    } catch (err) {
        console.error('exportToExcel error:', err);
    }
}
