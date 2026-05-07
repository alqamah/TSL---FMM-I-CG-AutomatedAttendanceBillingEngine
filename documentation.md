# CLIENT END / UI

## Step 1: Upload Master Sheet
User uploads the master sheet or bypasses it. 

The master sheet contains the employee details in **Sheet 1** named "employee-details":

| Column | Description |
| :--- | :--- |
| **SP No** | Safety Pass Number (unique employee ID) |
| **Employee Name** | Full name |
| **Designation** | Job designation |
| **Skill Level** | Skill classification (e.g., Rigger, Crane Operator) |
| **Allowed Shifts** | Comma-separated shift codes the employee is permitted to work (e.g., `A, B, C`) |
| **In OT Allowed** | Whether early-arrival overtime is permitted (`Yes`/`No`) |
| **Out OT Allowed** | Whether late-departure overtime is permitted (`Yes`/`No`) |

And shift definitions in **Sheet 2** named "shift-definitions":

| Column | Description |
| :--- | :--- |
| **Shift Name** | Shift code |
| **In** | Shift start time |
| **Out** | Shift end time |
| **Deduct Lunch** | Whether lunch time should be deducted (`YES`/`NO`) |

**Example Data:**

| Shift Name | In | Out | Deduct Lunch |
| :--- | :--- | :--- | :--- |
| A | 6:00 | 14:00 | NO |
| B | 14:00 | 22:00 | NO |
| C | 22:00 | 6:00 | NO |
| W1 | 8:30 | 17:30 | YES |
| G | 8:00 | 17:00 | YES |

## Step 2: Upload CLM Data
User uploads the CLM excel sheet(s). 
i. **CLM Presentee Records**: consisting of punch-in and punch-out timings 
OR
ii. **CLM Punch Records**: consisting of all the in and out punches made. 
