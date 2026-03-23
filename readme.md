# Working Hours Calculator

This application calculates the exact total working hours, duty hours, and overtime (OT) for employees based on uploaded CLM (Contract Labor Management) punch-in and punch-out data. Designed to seamlessly handle complex payroll edge cases, this tool automatically assigns accurate shifts, enforces custom overtime logic, and generates reliable reporting aggregates.

### Key Features
- **Smart Shift Allocation:** Automatically detects and assigns the appropriate shift based on punch-in/out times matching against the employee's allowed shifts list (CLM shift allocation is discarded).
- **Advanced Aggregation:** Instantly aggregates parsed data into skill-wise and employee-wise hour breakdowns.
- **Accurate Time Tracking:** Processes custom duty-hour calculations and strict block overtime increments according to duty logic rules, i.e. employee specific rules.
- **Flexible Adjustments:** Includes an optional toggle to factor lunch hour deductions into the net total working hours.
- **One-Click Exporting:** Directly export attendance data and processed aggregations to `.xlsx` files.
- **Search Functionality:** Search bar to search in Name, ID and Date.
- #### Local Database
- **Persistent Data:** Employee details are stored in `persistent_data.js` file. This file is used to store employee details such as name, skill, designation, allowed shifts, allowed OT, etc. This file is used to store employee details such as name, skill, designation, allowed shifts, allowed OT, etc.

### Duty In (Check-In) Time Logic

| Scenario | Condition | Duty In Assigned | Example |
| :--- | :--- | :--- | :--- |
| **Early OT** | Checked in > 59 mins early AND `allowedOT.in` is true | Rounded UP to the next 30 minutes | Shift 08:30. Arrived 06:50 ➔ Duty In 07:00 |
| **Normal / Grace** | Checked in anywhere up to 15 mins late OR slightly early | Exact Shift In time | Shift 08:30. Arrived 08:42 ➔ Duty In 08:30 |
| **Late** | Checked in > 15 mins late | Rounded UP to the next 30 minutes (Penalty) | Shift 08:30. Arrived 08:47 ➔ Duty In 09:00 |

### Duty Out (Check-Out) Time Logic

| Scenario | Condition | Duty Out Assigned | Example |
| :--- | :--- | :--- | :--- |
| **Early Leaver** | Pulled out before shift end time | Rounded DOWN to previous 30 minutes (Penalty) | Shift ends 17:30. Left 17:15 ➔ Duty Out 17:00 |
| **OT Out** | Stayed past shift end AND `allowedOT.out` is true | Rounded DOWN to previous 30 minutes | Shift ends 17:30. Left 18:25 ➔ Duty Out 18:00 |
| **Normal Leave** | Left at or past shift end but no OT allowed | Exact Shift Out time | Shift ends 17:30. Left 18:15 ➔ Duty Out 17:30 |

### Overtime (OT) Policy
- All computed Overtime (OT) is automatically floored and allotted  in **1-hour-chunks** (1 hour integers). 
- If the employee is allowed OT (permissions are present in persistent_data), then the OT will be calculated as follows:
    - if *inOT is allowed* and *applicable*, **inOT = shiftIn - dutyIn**
    - if *outOT is allowed* and *applicable*, **outOT = dutyOut - shiftOut**
    - **totalOT = inOT + outOT**

### Shift Definitions

| Shift Code | Shift In | Shift Out |
| :--- | :--- | :--- |
| **A** | 06:00 | 14:00 |
| **B** | 14:00 | 22:00 |
| **C** | 22:00 | 06:00 |
| **W1** | 08:30 | 17:30 |
| **G** | 08:00 | 17:00 |

### Edge Cases

- If **Shift is not defined** or employee is **not present in the persistent_data**, the best shift will be allocated from the shift-definition
- Else, the best shift will be allocated from among the shifts allowed. 