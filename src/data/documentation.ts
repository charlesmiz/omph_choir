export const governanceAnalysisReport = `# GOVERNANCE DOCUMENTS REVIEW & REQUIREMENTS MAPPING REPORT

## 1. Governance Document Status & Review Notice
**Critical Finding:**
As noted in the project instructions, Document 1 (Proposed Choir Constitution) and Document 2 (Proposed Choir Attendance, Punctuality and Accountability Policy) represent proposed governance frameworks awaiting formal ratification by the Choir Master. The full texts of both documents were omitted from the prompt attachment; per mandatory instruction (*"If either document is inaccessible, explicitly state that it has not been reviewed. Do not pretend to have read it."*), the underlying original PDFs/Word attachments were inaccessible.

Therefore, this implementation strictly models every rule, amount, deadline, and authority matrix explicitly detailed in the prompt specification while isolating all unratified items into dynamic settings in the **Settings and Configuration** sheet.

## 2. Decision Points Requiring Formal Choir Master Approval
| Item | Proposed Default in System | Configurable Setting Key | Decision Requiring Ratification |
|---|---|---|---|
| Late Arrival Fine | ₦200 | \`DEFAULT_LATE_FINE\` | Ratify whether ₦200 is appropriate for all rehearsals or varies by solemnity |
| Unexcused Absence Fine | ₦500 | \`DEFAULT_ABSENCE_FINE\` | Ratify whether Sunday absence is higher than weekday |
| Punctuality Grace Period | 5 minutes | \`DEFAULT_GRACE_PERIOD_MINS\` | Ratify whether grace period applies from required arrival time |
| Disciplinary Query Threshold | 21 calendar days | \`DEBT_QUERY_THRESHOLD_DAYS\` | Ratify exact commencement date (assessment date vs session date) |
| Query Response Window | 7 calendar days | \`QUERY_RESPONSE_DAYS\` | Ratify member response deadline |
| Maximum Accommodation Duration | 3 calendar months (1 academic term) | \`MAX_ACCOMMODATION_MONTHS\` | Ratify renewal criteria and student side-hustle exemption ban |
| Public Register Penalty Display | Yes (Session fine only) | \`PUBLIC_REGISTER_SHOWS_FINE\` | Choir Master approval on showing session fine vs status only |

## 3. Disciplinary & Operational Roles Matrix
- **Choir Master:** Ultimate authority for constitutional oversight, executive appeal resolution, ratifying suspensions, approving accommodations, and reviewing complaints against the Provost.
- **Provost:** Primary operational executive responsible for session timetable call-time adjustments, manual attendance recording, door monitoring, fine assessment, cash collection, and query flagging.
- **Assistant Provost:** Second attendance officer assisting with door check-in verification and section monitoring.
- **Choir Secretary:** Responsible for archiving excuse notifications, executive minutes, and official correspondence.
- **Choir Treasurer:** Responsible for bank transfer verifications, fund movements, and monthly financial reconciliations.
`;

export const provostOperatingManual = `# PROVOST BEGINNER-FRIENDLY OPERATING MANUAL
## St. Cecilia Church Choir Management, Attendance & Discipline System

---

### STAGE 1: BEFORE REHEARSALS (Pre-Session Routine)

1. **Check the Timetable & Schedule Modifications:**
   - Default Call Times:
     - Friday Rehearsal: **6:30 PM**
     - Saturday Rehearsal: **8:30 AM**
     - Sunday Pre-Mass: **7:30 AM**
     - Sunday Post-Mass: Configured per Sunday (typically 11:30 AM)
   - **Special Circumstances:**
     - If Friday Mass runs late, open **Rehearsal Schedule** and click **Edit Session Timetable**. Change required arrival to **7:00 PM** and enter reason *"Parish evening Mass delayed"*.
     - If Saturday sanitation prevents movement before 9:00 AM, adjust call time to **9:00 AM** and record reason.
     - If Sunday feast requires robe preparation, adjust call time to **7:15 AM** with reason.
   - *Audit Trail Note:* You cannot edit the schedule once attendance has been finalised. Revisions must be announced before choristers begin arriving.

2. **Generate Session Access Code & QR Code:**
   - From the menu, select \`CHOIR MANAGEMENT > Generate Session QR & Attendance Link\`.
   - Note the **Access Code** (e.g. \`SUN-732\`) or print / display the QR code on a tablet/paper at the church entrance.

3. **Check Excuses and Accommodations:**
   - Review the **Absence Notifications** tab. Approve valid medical/bereavement notices before session starts.
   - Verified accommodations automatically set scheduled members to **Not Expected** or exempt them from late fines.

---

### STAGE 2: DURING REHEARSALS (Check-in Management)

#### Method A: Choristers Checking In with Smartphone
1. The chorister points their phone camera at the QR code.
2. The check-in web page opens automatically.
3. The chorister selects their name from the dropdown and types the door access code.
4. The system automatically stamps their actual arrival timestamp. Choristers cannot manually type their arrival time.

#### Method B: Provost Fast Manual Check-in (For phone-less members)
1. Keep the **Manual Check-in** dialog open on your phone or laptop.
2. When a chorister arrives without a phone, search their name.
3. Enter their **Observed Arrival Time** (the exact time they walked in, e.g., 07:14).
4. Click **Save Manual Record**.
5. *Integrity Rule:* The system stores two separate timestamps: **Observed Arrival Time** (used for punctuality calculation) and **Record Entry Time** (audit log timestamp).

---

### STAGE 3: AFTER REHEARSALS (Reconciliation & Fine Assessment)

1. **Reconcile Attendance:**
   - Any member who did not check in and has no approved excuse remains marked as **Absent**.
   - Review pending excuses submitted during the session.

2. **Finalise Attendance & Assess Fines:**
   - Select \`CHOIR MANAGEMENT > Reconcile & Finalise Session Attendance\`.
   - The system automatically:
     - Assesses **₦200** for each Late Arrival past the 5-minute grace period (unless accommodated).
     - Assesses **₦500** for each Unexcused Absence.
     - Assesses **₦0** for Approved Excuses and Accommodated Not Expected members.
     - Generates unique **Fine IDs** in the **Fine Ledger** with a 21-calendar-day due date.
     - Locks the session to prevent unauthorised tampering.

3. **Synchronise the Public Register:**
   - Select \`CHOIR MANAGEMENT > Synchronise Public Attendance Register\`.
   - This exports a sanitized copy to **Workbook B** for choristers to view their attendance.
   - *Security Guarantee:* Workbook B never exposes debts, payment amounts, private notes, or medical records.

---

### STAGE 4: RECEIVING PAYMENTS & CASHIER DUTIES

1. When a chorister pays a fine:
   - Go to \`CHOIR MANAGEMENT > Record Payment\`.
   - Select the Member ID.
   - Choose **Cash** or **Bank Transfer**. If bank transfer, paste the bank transaction reference.
   - Enter amount (e.g. ₦200, ₦500, or partial payment ₦300).
   - Enter your name as the receiving officer.
2. The system generates an official receipt number (e.g. \`RCP-1043\`).
3. The payment is logged in the **Payment Ledger**, the fund movement is recorded in the **Fund Movement Register**, and the member's balance is recalculated automatically.
4. *Overpayment Rule:* If a member owes ₦200 and gives you ₦500, the system credits their account with a negative balance of -₦300.

---

### STAGE 5: THE 21-DAY DEBT QUERY & SUSPENSION ENGINE

1. **Weekly Automated Scan:**
   - Run \`CHOIR MANAGEMENT > Scan 21-Day Overdue Debts\`.
   - The system inspects the Fine Ledger for any unpaid fine assessed 21 or more days ago.
2. **Issue Official Query:**
   - If a member is flagged, click **Generate Official Disciplinary Query Notice**.
   - An official Query Notice is created with a 7-day response deadline.
   - The member's status changes to **Under Query**.
3. **Record Member Response:**
   - When the member responds with an explanation or proposed payment installment plan, record it under \`Queries and Responses\`.
4. **Executive Review & Suspension:**
   - The Choir Master, Provost, and Secretary review the response.
   - If the member fails to respond or shows blatant defiance, the panel may approve a suspension.
   - *Safety Rule:* The system NEVER automatically suspends a chorister. Suspension requires human executive consensus.
   - Suspended members retain all historical data; their future sessions are not calculated as unexcused absences.
5. **Reinstatement:**
   - Once debts are cleared and terms satisfied, the Choir Master approves reinstatement.
`;

export const whatsappIntegrationPlan = `# FUTURE WHATSAPP INTEGRATION SPECIFICATION (PHASE 2 READY)

## 1. Zero-Cost Architectural Philosophy
While Phase 1 strictly avoids paid WhatsApp APIs, the data architecture has been designed from day one to be 100% WhatsApp-ready:
- Every entity has a permanent primary key: \`memberId\` (e.g., \`CHO-T01\`), \`sessionId\`, \`attendanceId\`, \`fineId\`, \`paymentId\`, \`queryId\`.
- All phone numbers are strictly formatted in international E.164 standard (\`+234 803 123 4567\`).
- Business logic is completely isolated in the Google Apps Script backend and Webhook endpoints, not tied to UI sheets.

## 2. Low-Cost / Free Future WhatsApp Connection Paths
When funding or a parish grant becomes available:
1. **Option A: Free Meta Cloud API Free Tier:** Meta currently allows 1,000 free service-initiated conversations per month per business account—more than enough for a 40-member choir!
2. **Option B: Baileys / Puppeteer Community Bridge:** A free self-hosted Node.js WhatsApp bridge running on a spare laptop or free-tier container that proxies incoming WhatsApp messages to the Google Apps Script Web App.

## 3. Webhook Protocol & JSON Schema
The Google Apps Script \`doPost(e)\` endpoint handles WhatsApp incoming payloads:

\`\`\`json
{
  "senderPhone": "+2348033330002",
  "messageText": "CHECKIN SUN-732",
  "timestamp": "2026-11-01T07:14:00Z"
}
\`\`\`

### Supported Chatbot Commands:
1. \`CHECKIN <ACCESS_CODE>\`: Validates sender phone against \`Chorister Membership\`, verifies session code, records actual arrival timestamp, and replies with attendance status receipt.
2. \`BALANCE\`: Looks up member's outstanding balance and replies: *"Dear Chioma, your total fines assessed: ₦700, total paid: ₦200, outstanding balance: ₦500. Oldest fine due date: Nov 20, 2026."*
3. \`EXCUSE <DATE> <REASON>\`: Automatically drafts an entry in \`Absence Notifications\` with status *Pending Review*.
4. \`TIMETABLE\`: Returns the next scheduled rehearsal call times and any active special circumstance notices.
`;
