# CLM Attendance Reconciliation Tool

> **Tata Steel — FMM-INFRA, Crane Group**

A browser-based attendance reconciliation engine that transforms raw CLM (Contract Labour Management) portal data into accurate, shift-aware working-hours reports — complete with overtime calculations, skill-wise aggregations, and one-click Excel export.

## Live Link

[https://alqamah.github.io/TSL---Attendance_Reconciliation_Automation/src/index.html](https://alqamah.github.io/TSL---Attendance_Reconciliation_Automation/src/index.html)

---

## Features

### Dual CLM Report Support

The tool accepts **two different CLM report formats**, covering the full range of data exports available from the CLM portal:

* **Presentee Report**: Daily attendance report with one row per employee per date, containing In Time and Out Time.
* **Punch-In / Punch-Out (PiPo) Report**: Raw punch record log with individual IN/OUT flag entries and timestamps. The tool groups records by employee + date, takes the earliest IN and latest OUT to derive the punch pair.

Both report types support **multi-file upload** — select multiple Excel files at once and they will be processed and merged into a single unified view.

---

### Master Sheet Upload (Step 1)

An optional but recommended first step. Upload a Master Excel Sheet (`.xlsx`) containing employee metadata. The master file has **two sheets**:

#### Sheet 1 — Employee Details
| Column | Description |
| :--- | :--- |
| SP No | Safety Pass Number (unique employee ID) |
| Employee Name | Full name |
| Designation | Job designation |
| Skill Level | Skill classification (e.g., Rigger, Crane Operator) |
| Allowed Shifts | Comma-separated shift codes the employee is permitted to work (e.g., `A, B, C`) |
| In OT Allowed | Whether early-arrival overtime is permitted (`Yes`/`No`) |
| Out OT Allowed | Whether late-departure overtime is permitted (`Yes`/`No`) |

#### Sheet 2 — Shift Definitions (Optional)
| Column | Description |
| :--- | :--- |
| Shift Name | Shift code (e.g., `A`, `B`, `C`, `G`, `W1`) |
| In | Shift start time |
| Out | Shift end time |

* If Sheet 2 is absent, the tool falls back to the **default shift definitions** (see below).
* A downloadable **MasterSheet Format template** is provided in the UI for reference.

#### Bypass Master Sheet

* A **"Bypass Master-Sheet"** checkbox allows users to skip the master file upload and proceed directly with CLM data.
* In this mode, the tool will still auto-assign shifts based on punch times but will not have access to employee-specific metadata (skill, designation, OT permissions, allowed shifts).
* When neither a master file is uploaded nor the bypass checkbox is checked, the CLM upload area (Step 2) is **gated** — clicking it will surface a warning banner prompting the user to upload a master file or enable bypass.

---

### Smart Shift Assignment

The tool **discards CLM's own shift allocation** and re-assigns the best-matching shift based on actual punch-in/out times using a multi-stage proximity algorithm:

1. **A/B/C shifts** — Matched by punch-in proximity to the shift's start time (within a ±2 hour window). Falls back to punch-out proximity if no match is found.
2. **G/W1 (General) shifts** — Evaluated using combined punch-in + punch-out proximity and estimated working hours. If proximity scores of two candidates are within 30 minutes, the shift yielding more hours is preferred.
3. **Fallback** — If the employee exists in the master data, the shift is assigned from among their allowed shifts. Otherwise, the globally best-matching shift from the full shift definitions is used.

---

### Duty In (Check-In) Time Logic

| Scenario | Condition | Duty In Assigned | Example |
| :--- | :--- | :--- | :--- |
| **Early OT** | Checked in > 29 mins early AND `inOT` is allowed | Rounded UP to the next 30 minutes | Shift 08:30. Arrived 06:50 → Duty In 07:00 |
| **Normal / Grace** | Checked in up to 15 mins late OR slightly early | Exact Shift In time | Shift 08:30. Arrived 08:42 → Duty In 08:30 |
| **Late** | Checked in > 15 mins late | Rounded UP to the next 30 minutes (Penalty) | Shift 08:30. Arrived 08:47 → Duty In 09:00 |

### Duty Out (Check-Out) Time Logic

| Scenario | Condition | Duty Out Assigned | Example |
| :--- | :--- | :--- | :--- |
| **Early Leaver** | Left before shift end time | Rounded DOWN to previous 30 minutes (Penalty) | Shift ends 17:30. Left 17:15 → Duty Out 17:00 |
| **OT Out** | Stayed past shift end AND `outOT` is allowed | Rounded DOWN to previous 30 minutes | Shift ends 17:30. Left 18:25 → Duty Out 18:00 |
| **Normal Leave** | Left at or past shift end but no OT allowed | Exact Shift Out time | Shift ends 17:30. Left 18:15 → Duty Out 17:30 |

### Overtime (OT) Policy

* OT is calculated **only when permitted** per the employee's master data entry (`inOtAllowed` / `outOtAllowed`).
* If *In-OT is allowed and applicable*: **inOT = shiftIn − dutyIn**
* If *Out-OT is allowed and applicable*: **outOT = dutyOut − shiftOut**
* **totalOT = inOT + outOT**
* OT is only granted for ≥ 1 full hour beyond the shift boundary.
* Final OT value is **floored to 0.5-hour increments**.

### Duty Hours Calculation

* Net duty = `min(dutyOut − dutyIn, shiftOut − dutyIn)`, capped at **8 hours** (or 9 hours if lunch is added).
* For **G and W1 shifts**, a 1-hour lunch deduction is applied by default. Enabling the **"Add Lunch"** toggle removes the deduction and raises the cap to 9 hours.
* If actual punch span is < 30 minutes, duty hours are set to **0** (minimum threshold guard).
* If punch-in and punch-out are < 60 minutes apart, the entire row is treated as a **zero-hour day**.

---

### C-Shift Overnight Handling

The **C-Shift (22:00–06:00)** introduces a cross-date complication: the punch-out recorded in CLM on the next calendar day actually belongs to the previous night's shift. The tool handles this automatically:

* **Presentee Reports**: After initial parsing, a post-processing pass groups entries by employee, sorts by date, and for each C-shift entry (punch-in ≥ 20:00), takes the next date's punch-out (if it's a morning time < 12:00) as the actual exit time. A `+1` badge is displayed in the table for these cross-date punch-outs.
* **PiPo Reports**: C-shift detection happens during the punch-pair resolution phase — evening IN punches (≥ 20:00) are paired with the next calendar date's morning OUT punches (< 12:00). Consumed morning OUT times are excluded from regular (daytime) shift calculations.

---

### Search & Filter

A **real-time search bar** filters the table by any combination of:
* Employee Name
* Safety Pass Number
* Vendor Name
* Assigned Shift

---

### Aggregation Views

Switch between three data views with a single click:

| View | Description |
| :--- | :--- |
| **Main Table** | Full row-by-row attendance data with all 24 columns |
| **Employee Total** | Employee-wise aggregated total hours and equivalent shift count (`Total Hours ÷ 8`) |
| **Skill Total** | Skill-wise aggregated total hours and equivalent shift count |

* An **"Close Aggregate View"** button returns to the main table.

---

### Column Picker

* A **Columns** dropdown lets users toggle the visibility of any of the 24 data columns on/off.
* Includes a **"Toggle All"** button to show/hide all columns at once.
* Column visibility is applied via dynamic CSS injection and only affects the main table view (not aggregate views).

---

### Multi-Column Sorting

Click any sortable column header to cycle through **ascending → descending → unsorted** states. Sortable columns include:
* Date
* Name
* Skill
* Designation
* Shifts Allowed
* Shift

Sort arrows (▲▼) visually indicate the current sort direction.

---

### One-Click XLSX Export

Export all processed data to a **multi-sheet Excel file** (`Calculated_Working_Hours.xlsx`) containing:
1. **AttendanceData** — Full row-level processed attendance records
2. **EmployeeHours** — Employee-wise total hours and shift counts
3. **SkillHours** — Skill-wise total hours and shift counts

---

### Lunch Hour Toggle

The **"Add Lunch"** checkbox recalculates all hours in real-time:
* **Unchecked (default):** 1-hour lunch deduction is applied for G and W1 shifts; max duty = 8 hours.
* **Checked:** No lunch deduction; max duty = 9 hours.

Toggling triggers a full reprocessing of all `employeeData` rows without requiring re-upload.

---

### Shift Definitions (Defaults)

| Shift Code | Shift In | Shift Out |
| :--- | :--- | :--- |
| **A** | 06:00 | 14:00 |
| **B** | 14:00 | 22:00 |
| **C** | 22:00 | 06:00 |
| **W1** | 08:30 | 17:30 |
| **G** | 08:00 | 17:00 |

These defaults are overridden if a master sheet with a `shift_definitions` sheet is uploaded.

---

### Edge Cases Handled

* If a **shift is not defined** or the employee is **not in the master data**, the best shift is auto-assigned from the full shift definition table based on punch-time proximity.
* If the employee **is in the master data**, the shift is assigned from among their allowed shifts.
* **Unexpected shift assignments** (assigned shift not in the employee's allowed shifts list) are visually flagged in the table with a distinct CSS class.
* **Cross-midnight shifts** (C-shift) are handled with wrap-around arithmetic for time differences.
* **Excel time formats** (fractional day numbers, `HH:MM`, `HH:MM:SS`, `HH.MM`, `h AM/PM`) are all normalised automatically.
* **Excel serial date numbers** in PiPo files are converted to readable date strings.
* **Minimum punch span guard:** Punch pairs < 60 minutes apart are treated as zero-hour entries to prevent false shift assignments.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **Fonts** | IBM Plex Sans, IBM Plex Mono (Google Fonts) |
| **Excel I/O** | [SheetJS (xlsx)](https://sheetjs.com/) — client-side Excel read/write |
| **Hosting** | GitHub Pages (static site) |

> **No backend, no database, no build step.** All processing runs entirely in the browser. No data leaves the user's machine.

---

## Project Structure

```
├── index.html                  # Root redirect
├── src/
│   ├── index.html              # Main application page
│   ├── styles.css              # Full design system & styling
│   ├── main.js                 # App entry: DOM refs, state, column picker, event wiring
│   ├── hoursProcessing.js      # Time parsing, shift assignment, hours/OT calculation
│   ├── uploadProcessFiles.js   # Presentee & PiPo file upload handlers + C-shift resolution
│   ├── renderTable.js          # Table rendering, aggregation views, Excel export
│   ├── masterFileUpload.js     # Master sheet upload & parsing (employee details + shift defs)
│   └── persistent_data.js      # Legacy local employee data store
├── assets/
│   ├── logo2.svg               # Tata Steel logo
│   ├── masterSheet_format.xlsx # Downloadable master sheet template
│   ├── 1.png                   # Presentee upload card icon
│   └── 2.png                   # PiPo upload card icon
├── data/                       # Sample/test data files
├── test/                       # Test files
└── design-system/              # Design system documentation
```

---

## Getting Started

1. Open the [live link](https://alqamah.github.io/TSL---Attendance_Reconciliation_Automation/src/index.html) or serve locally via any static file server.
2. **(Optional)** Upload a **Master Sheet** in Step 1, or check **Bypass Master-Sheet** to skip.
3. Upload one or more **CLM Presentee** or **Punch-In/Punch-Out** report Excel files in Step 2.
4. View the processed attendance data in the table. Use the search bar, column picker, and sort headers to explore.
5. Switch to **Employee Total** or **Skill Total** views for aggregated summaries.
6. Click **Export XLSX** to download the full report.

---

## Contact

📧 alqama.hasnain@tatasteel.com  
**FMM-INFRA, Crane Group — Tata Steel**
