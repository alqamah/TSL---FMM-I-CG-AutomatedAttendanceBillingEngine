# Agent Main Configuration

> **DESIGN SYSTEM:** For UI/UX design specifications, refer strictly to `design.md` in this directory.
>
> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** the generic design files.
> If not, strictly follow the rules in `design.md`.
>
> **AGENT REFERENCE:** For logic related to the calculation of duty hours, overtime, and shift times, refer to `design-system/working-hours-calculator/hours-logic.md`.
>
> **DIRECTORY STRUCTURE:** For an overview of the codebase architecture and what each file in `src/` is responsible for, refer to `directory-structure.md`.
>
> **GRAPHIFY:** This project uses `graphify` to maintain a structural code graph. Agents should reference the graphify outputs or use `graphify` commands to understand the codebase and relationships.

---

**Project:** Working Hours Calculator
**Category:** Attendance Reconciliation

## Project Structure

```
├── src/
│   ├── index.html              # Main application page
│   ├── styles.css              # Full design system & styling
│   ├── main.js                 # App entry: DOM refs, state, column picker, event wiring
│   ├── hoursProcessing.js      # Time parsing, shift assignment, hours/OT calculation
│   ├── uploadProcessFiles.js   # Presentee & Punch Record upload handlers
│   ├── renderTable.js          # Table rendering, aggregation views, Excel export
│   └── masterFileUpload.js     # Master sheet upload & parsing
├── assets/
│   ├── logo2.svg               # Tata Steel logo
│   ├── masterSheet_format.xlsx # Downloadable master sheet template
│   ├── 1.png                   # Presentee upload card icon
│   └── 2.png                   # Punch Records upload card icon
```
