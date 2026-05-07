# Working Hours Logic Reference

This document serves as a reference for AI agents to understand how hours and overtime are calculated within the application.

## 1. SHIFT IN and SHIFT OUT
These are determined by the application automatically assigning the "best matching" shift from `SHIFT_DEFINITIONS` to an employee's punch records:
*   The logic (`assignShift`) evaluates the proximity of the employee's `punch-in` and `punch-out` times against the predefined shifts (A, B, C, G, W1). 
*   If the employee has an uploaded master profile, it prioritizes matching within their `allowedShifts`.
*   Once the optimal shift is assigned, its defined start and end times become the `SHIFT IN` and `SHIFT OUT` respectively.

## 2. DUTY IN (Processed Check-in)
Calculated inside the `calculateHours()` function, `DUTY IN` adjusts the raw `punch-in` time using grace periods and overtime rules:
*   **Early Arrival (OT):** If the employee arrives >29 minutes early AND `inOtAllowed` is true, the time is rounded **UP** to the nearest 30-minute mark.
*   **Normal/Grace:** If the employee arrives up to 15 minutes late or slightly early, `DUTY IN` is snapped exactly to the `SHIFT IN` time.
*   **Late Penalty:** If the employee arrives >15 minutes late, it is rounded **UP** to the next 30-minute mark (as a penalty).

## 3. DUTY OUT (Processed Check-out)
Similarly calculated inside `calculateHours()` by adjusting the raw `punch-out` time:
*   **Early Departure Penalty:** If they leave before the shift ends, it is rounded **DOWN** to the nearest 30-minute mark.
*   **Late Departure (OT):** If they stay past the shift end AND `outOtAllowed` is true, it is rounded **DOWN** to the nearest 30-minute mark to grant overtime.
*   **Normal Departure:** If they leave at or after the shift end (but no OT is allowed), `DUTY OUT` is capped exactly at the `SHIFT OUT` time.

## 4. DUTY HRS (Regular Shift Hours)
Calculated inside the `calculateDutyHours()` function using the previously calculated `DUTY IN` and `DUTY OUT` times:
*   It takes the duty span but **strictly clamps** the times to the boundaries of `SHIFT IN` and `SHIFT OUT`. This ensures that any extra overtime portions are stripped away from regular duty hours.
*   It calculates the duration between the clamped limits and divides by 60 to return a decimal hour format.
*   **Guardrails:** If the resulting span is less than 30 minutes, it automatically returns `0` hours.

## 5. OT HRS (Overtime Hours)
Calculated inside the `calculateOtHours()` function:
*   It evaluates overtime only if `inOtAllowed` and/or `outOtAllowed` are true for the employee.
*   **In-OT:** Checks if `DUTY IN` is earlier than `SHIFT IN`.
*   **Out-OT:** Checks if `DUTY OUT` is later than `SHIFT OUT`.
*   **Threshold:** OT is only granted if the difference is **60 minutes or greater** (i.e., at least 1 full hour of OT).
*   **Rounding:** The final total OT (In-OT + Out-OT) is floored/rounded down to the nearest `0.5` hour increment.

## 6. TOTAL HRS
Calculated in the processing loops by adding `DUTY HRS` and `OT HRS` together.
*   `TOTAL HRS = DUTY HRS + OT HRS` (rounded to 2 decimal places).

## 7. OVERNIGHT SHIFTS & CROSS-PUNCH LOGIC (e.g., C-Shift)
The application handles shifts where `out-time < in-time` (crossing midnight) by flattening them onto a continuous timeline:
*   **Hours Processing (`hoursProcessing.js`):** If a punch-out time is numerically smaller than the punch-in time, or if the `SHIFT OUT` is smaller than `SHIFT IN`, the system automatically adds 1440 minutes (24 hours) to the out-time. Overtime uses a "midnight-aware signed difference" to correctly calculate discrepancies across the midnight boundary.
*   **PiPo Cross-Punch (`uploadProcessFiles.js`):** For Punch-In/Punch-Out files, the system identifies an evening punch-in (≥ 20:00, or ≥ 18:00 if an early C-shift). It then actively looks at the **next calendar date** for the same employee to find a morning punch-out (< 12:00) and pairs them together, assigning `punchOutNextDate`.
*   **Presentee Cross-Punch (`uploadProcessFiles.js`):** For CLM Presentee files, the "Out Time" row is often the morning exit of the *previous* night's shift. A post-processing pass (`_resolveCShiftCrossDate`) sorts entries by date. For an identified C-shift on Date X, it steals the morning punch-out from the employee's Date X+1 entry and pairs it to Date X.
