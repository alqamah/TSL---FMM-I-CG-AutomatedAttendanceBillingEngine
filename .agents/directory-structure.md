# Directory Structure & Component Overview

This document outlines the file structure and purpose of each component in the `src/` directory to help future agents navigate the codebase.

## `src/` Directory Overview

### UI & Styling
*   **`index.html`**: The main entry point. Contains the complete structural layout of the application, including the file upload sections, the configuration settings (e.g., bypass master file, add lunch), the action buttons, and the structure of the data table.
*   **`styles.css`**: The stylesheet. Defines the visual layout, using CSS Variables for theming (Material Design principles), responsiveness, flexbox layouts, and custom UI states (like `.is-hidden`, `.success`, `.error` badges).

### Core Logic & State
*   **`main.js`**: The central controller. 
    *   Holds global state variables (e.g., `employeeData`, `masterEmployeeDetails`, `masterFileUploaded`).
    *   Defines the default `SHIFT_DEFINITIONS` configuration.
    *   Initializes DOM element references and sets up all core event listeners (tab switching, file inputs, export buttons).
*   **`hoursProcessing.js`**: The mathematical engine.
    *   Contains pure and semi-pure functions for time manipulation (`parseTimeFormatToMinutes`, `formatMinutesTo24h`).
    *   Handles all calculations related to `DUTY IN`, `DUTY OUT`, `DUTY HRS`, and `OT HRS` (via `calculateHours`, `calculateDutyHours`, `calculateOtHours`).
    *   Contains the logic for dynamically assigning an employee's shift (`assignShift`) based on punch times and allowed master shifts.

### File Processing & Data Ingestion
*   **`masterFileUpload.js`**: Responsible for parsing the "Master Sheet" uploaded by the user. It extracts employee details, allowed shifts, and OT eligibility, populating the `masterEmployeeDetails` global array.
*   **`uploadProcessFiles.js`**: Responsible for parsing the daily attendance data files.
    *   Handles both **PiPo (Punch-In/Punch-Out)** files and **CLM Presentee** files.
    *   Contains complex logic for cross-date punch resolution (stitching an evening punch-in on one date to a morning punch-out on the next date for C-Shifts).
    *   Normalizes the parsed data into the unified `employeeData` structure.

### Rendering & Output
*   **`renderTable.js`**: The UI builder for data.
    *   Takes the populated `employeeData` array and dynamically generates HTML table rows (`<tr>`).
    *   Applies formatting (e.g., red badges for missing data, superscript "-1" for lunch deductions, cross-day indicators).
    *   Provides aggregate summary views (e.g., rendering subtotals per Employee or per Skill).
    *   Handles the export of the rendered table to an Excel file using the SheetJS (XLSX) library.
