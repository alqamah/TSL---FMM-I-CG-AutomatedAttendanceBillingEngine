// main.js
// Application entry point: DOM references, shared state, column visibility,
// sort state, table pre-render helpers, and event listener wiring.
// Dependencies: persistent_data.js, hoursProcessing.js, uploadProcessFiles.js, renderTable.js

// -----------------------------------------------
// DOM REFERENCES
// -----------------------------------------------
const fileInput                   = document.getElementById('fileInput');
const pipoInput                   = document.getElementById('pipoInput');
const statusSection               = document.getElementById('statusSection');
const fileStatusList              = document.getElementById('fileStatusList');
const fileCountBadge              = document.getElementById('fileCountBadge');
const dataTable                   = document.getElementById('dataTable');
const tableBody                   = document.getElementById('tableBody');
const exportBtn                   = document.getElementById('exportBtn');
const searchInput                 = document.getElementById('searchInput');
const addLunchCheckbox            = document.getElementById('addLunchCheckbox');
const bypassPersistentDataCheckbox= document.getElementById('bypassPersistentDataCheckbox');
const columnPickerBtn             = document.getElementById('columnPickerBtn');
const columnPickerDropdown        = document.getElementById('columnPickerDropdown');

// -----------------------------------------------
// SHARED STATE
// -----------------------------------------------

/**
 * Master employee-data array.
 * Populated by processPresenteeFile / processPipoFile.
 *
 * Each entry shape:
 * {
 *   date, sp_no, name, vendor_name, workorder_no, dept_name, section,
 *   skill, designation, shiftsAllowed[], shift, shiftIn, shiftOut,
 *   punchIn, punchOut, dutyIn, dutyOut, addLunch,
 *   dutyHours, otHours, totalHours, inOT, outOT
 * }
 */
let employeeData = [];

// -----------------------------------------------
// COLUMN VISIBILITY
// -----------------------------------------------

const dynamicStyle = document.createElement('style');
dynamicStyle.id = 'dynamicColumnStyles';
document.head.appendChild(dynamicStyle);

const COLUMN_DEFS = [
    { id: 'SN',            label: 'SN',            defaultVisible: true },
    { id: 'DATE',          label: 'DATE',           defaultVisible: true },
    { id: 'SP_NO',         label: 'SP NO',          defaultVisible: true },
    { id: 'NAME',          label: 'NAME',           defaultVisible: true },
    { id: 'PUNCH_IN',      label: 'PUNCH IN',       defaultVisible: true },
    { id: 'PUNCH_OUT',     label: 'PUNCH OUT',      defaultVisible: true },
    { id: 'TOTAL_HRS',     label: 'TOTAL HRS',      defaultVisible: true },
    { id: 'DUTY_HRS',      label: 'DUTY HRS',       defaultVisible: true },
    { id: 'OT_HRS',        label: 'OT HRS',         defaultVisible: true },
    { id: 'ADD_LUNCH',     label: 'Allow LUNCH',    defaultVisible: true },
    { id: 'SHIFTS_ALLOWED',label: 'SHIFTS ALLOWED', defaultVisible: true },
    { id: 'SHIFT',         label: 'SHIFT',          defaultVisible: true },
    { id: 'SHIFT_IN',      label: 'SHIFT IN',       defaultVisible: true },
    { id: 'SHIFT_OUT',     label: 'SHIFT OUT',      defaultVisible: true },
    { id: 'DUTY_IN',       label: 'DUTY IN',        defaultVisible: true },
    { id: 'DUTY_OUT',      label: 'DUTY OUT',       defaultVisible: true },
    { id: 'SKILL',         label: 'SKILL',          defaultVisible: true },
    { id: 'IN_OT',         label: 'Allow IN-OT',    defaultVisible: true },
    { id: 'OUT_OT',        label: 'Allow OUT-OT',   defaultVisible: true },
    { id: 'DESIGNATION',   label: 'DESIGNATION',    defaultVisible: true },
    { id: 'VENDOR_NAME',   label: 'VENDOR NAME',    defaultVisible: true },
    { id: 'WORKORDER_NO',  label: 'WORKORDER NO',   defaultVisible: true },
    { id: 'DEPT_NAME',     label: 'DEPT NAME',      defaultVisible: true },
    { id: 'SECTION',       label: 'SECTION',        defaultVisible: true }
];

/** Set of 1-based column-child indices that are currently hidden. */
let hiddenColumns = new Set();

/**
 * Injects CSS rules to hide columns whose indices are in `hiddenColumns`.
 * Only hides columns while the table is in its main (non-aggregate) view.
 */
function updateColumnVisibility() {
    let cssRules = '';
    hiddenColumns.forEach(childIndex => {
        cssRules += `#dataTable.main-view th:nth-child(${childIndex}), #dataTable.main-view td:nth-child(${childIndex}) { display: none !important; }\n`;
    });
    dynamicStyle.innerHTML = cssRules;
}

// Build column-picker dropdown
if (columnPickerDropdown) {
    const header    = document.createElement('div');
    header.className = 'column-dropdown-header';

    const checkboxes = [];

    const toggleBtn = document.createElement('button');
    toggleBtn.className   = 'column-toggle-btn';
    toggleBtn.textContent = 'Toggle All';
    toggleBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        const allSelected = hiddenColumns.size === 0;
        if (allSelected) {
            checkboxes.forEach(cb => cb.checked = false);
            COLUMN_DEFS.forEach((_, i) => hiddenColumns.add(i + 1));
        } else {
            checkboxes.forEach(cb => cb.checked = true);
            hiddenColumns.clear();
        }
        updateColumnVisibility();
    });

    header.appendChild(toggleBtn);
    columnPickerDropdown.appendChild(header);

    COLUMN_DEFS.forEach((col, index) => {
        const label    = document.createElement('label');
        label.className = 'column-dropdown-item';

        const checkbox   = document.createElement('input');
        checkbox.type    = 'checkbox';
        checkbox.checked = col.defaultVisible;
        if (!col.defaultVisible) hiddenColumns.add(index + 1);

        checkbox.addEventListener('change', e => {
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

// Toggle dropdown open/close
if (columnPickerBtn) {
    columnPickerBtn.addEventListener('click', e => {
        e.stopPropagation();
        columnPickerDropdown.style.display =
            columnPickerDropdown.style.display === 'none' ? 'flex' : 'none';
    });
}
// Close dropdown on outside click
document.addEventListener('click', e => {
    if (
        columnPickerBtn &&
        !columnPickerBtn.contains(e.target) &&
        !columnPickerDropdown.contains(e.target)
    ) {
        columnPickerDropdown.style.display = 'none';
    }
});

// Apply initial visibility (all visible by default)
updateColumnVisibility();

// -----------------------------------------------
// SORT STATE
// -----------------------------------------------

/** Per-column sort state: 'none' | 'asc' | 'desc' */
const sortStates = {
    date:          'asc',
    name:          'none',
    skill:         'none',
    designation:   'none',
    shiftsAllowed: 'none',
    shift:         'none'
};

/**
 * Cycles a column's sort state (none → asc → desc → none) and re-renders.
 * @param {string} col - Key of `sortStates` to toggle.
 */
function toggleSort(col) {
    try {
        if      (sortStates[col] === 'none') sortStates[col] = 'asc';
        else if (sortStates[col] === 'asc')  sortStates[col] = 'desc';
        else                                  sortStates[col] = 'none';
        renderTable();
    } catch (err) {
        console.error('toggleSort error:', err);
    }
}

/** Back-compat alias used by older inline onclick references. */
function toggleDateSort() { toggleSort('date'); }

/**
 * Returns the HTML snippet for up/down sort-arrow indicators for a column.
 * @param {string} col - Key of `sortStates`.
 * @returns {string} HTML string.
 */
function sortArrowsHtml(col) {
    return `<span class="sort-arrows">
        <span class="sort-arrow up ${sortStates[col] === 'asc'  ? 'active' : ''}">▲</span>
        <span class="sort-arrow down ${sortStates[col] === 'desc' ? 'active' : ''}">▼</span>
    </span>`;
}

// -----------------------------------------------
// REPROCESS (called when addLunch checkbox changes)
// -----------------------------------------------

/**
 * Recalculates hours for all rows in `employeeData` using the current addLunch flag,
 * then re-renders the main table.
 */
function reprocessData() {
    try {
        const addLunch = addLunchCheckbox ? addLunchCheckbox.checked : false;
        employeeData.forEach(row => {
            row.addLunch = addLunch;

            const punch_in   = row.punchIn;
            const punch_out  = row.punchOut;
            const employeeId = row.sp_no;

            if (punch_in && punch_out && punch_in !== 'N/A' && punch_out !== 'N/A') {
                const inOtAllowed  = row.inOT;
                const outOtAllowed = row.outOT;

                const shiftIn     = row.shiftIn;
                const shiftOut    = row.shiftOut;
                const shiftInMins  = shiftIn  ? parseTimeFormatToMinutes(shiftIn)  : null;
                const shiftOutMins = shiftOut ? parseTimeFormatToMinutes(shiftOut) : null;

                const { dutyInMins, dutyOutMins } = calculateHours(punch_in, punch_out, shiftIn, shiftOut, inOtAllowed, outOtAllowed);

                const dutyHours  = calculateDutyHours(dutyInMins, dutyOutMins, shiftOutMins, row.shift, addLunch);
                const otHours    = calculateOtHours(employeeId, shiftInMins, shiftOutMins, dutyInMins, dutyOutMins);
                const totalHours = parseFloat((dutyHours + otHours).toFixed(2));

                row.dutyIn    = dutyInMins  !== null ? formatMinutesTo24h(dutyInMins)  : '';
                row.dutyOut   = dutyOutMins !== null ? formatMinutesTo24h(dutyOutMins) : '';
                row.dutyHours = parseFloat(dutyHours.toFixed(2));
                row.otHours   = parseFloat(otHours.toFixed(2));
                row.totalHours = totalHours;
            }
        });

        renderTable();
    } catch (err) {
        console.error('reprocessData error:', err);
    }
}

// -----------------------------------------------
// EVENT LISTENERS
// -----------------------------------------------
fileInput.addEventListener('change', handlePresenteeFileSelect);
if (pipoInput)          pipoInput.addEventListener('change',  handlePipoFileSelect);
exportBtn.addEventListener('click',  exportToExcel);
if (searchInput)        searchInput.addEventListener('input',  renderTable);
if (addLunchCheckbox)   addLunchCheckbox.addEventListener('change', reprocessData);

const masterFileInput = document.getElementById('masterFileInput');
if (masterFileInput)    masterFileInput.addEventListener('change', handleMasterFileUpload);
