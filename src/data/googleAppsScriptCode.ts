export interface ScriptFile {
  name: string;
  type: 'gs' | 'html' | 'json';
  description: string;
  code: string;
}

export const googleAppsScriptFiles: ScriptFile[] = [
  {
    name: '01_Setup_and_Schema.gs',
    type: 'gs',
    description: 'Automated 1-click installer: creates all 20 sheets in Workbook A, applies choir header styling, formulas, and sets up Workbook B.',
    code: `/**
 * @file 01_Setup_and_Schema.gs
 * @description Automated Setup & Schema Initialization for the Choir Management System
 * Church Choir Attendance, Discipline, and Financial Accountability System
 * Zero-cost Google Workspace architecture.
 */

const APP_CONFIG = {
  APP_NAME: "St. Cecilia Choir Management System",
  CURRENCY: "₦",
  DEFAULT_LATE_FINE: 200,
  DEFAULT_ABSENCE_FINE: 500,
  DEFAULT_GRACE_PERIOD_MINS: 5,
  DEBT_QUERY_DAYS: 21,
  QUERY_RESPONSE_DAYS: 7,
  MAX_ACCOMMODATION_MONTHS: 3
};

/**
 * 1-CLICK INITIALIZER
 * Run this function from the Apps Script editor to build or format all 20 sheets.
 */
function initializeMasterWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsDefinition = [
    { name: "Executive Dashboard", headers: ["Metric Category", "Key Indicator", "Current Value", "Benchmark / Threshold", "Status / Flag", "Last Updated"] },
    { name: "Settings and Configuration", headers: ["Setting Key", "Parameter Description", "Configured Value", "Approval Authority", "Notes"] },
    { name: "Chorister Membership", headers: ["Member ID", "Full Name", "Voice Part", "Phone Number (E.164)", "Membership Date", "Membership Status", "Attendance Arrangement", "Registration Date", "Administrative Notes", "Email Address"] },
    { name: "Rehearsal Schedule", headers: ["Session ID", "Activity Type", "Date", "Default Arrival", "Required Arrival", "Actual Start", "End Time", "Grace Period (Mins)", "Compulsory?", "Penalties Apply?", "Special Circumstances", "Approving Officer", "Access Code", "Session Status"] },
    { name: "Attendance Raw Responses", headers: ["Timestamp", "Session ID", "Member ID", "Access Code Provided", "Submission Method", "IP/User Agent Hash", "System Status"] },
    { name: "Final Attendance Register", headers: ["Attendance ID", "Session ID", "Member ID", "Full Name", "Voice Part", "Observed Arrival", "Entry Timestamp", "Method", "Classification", "Verified By", "Fine Assessed (₦)", "Fine ID", "Remarks"] },
    { name: "Manual Attendance Entries", headers: ["Entry ID", "Session ID", "Member ID", "Observed Arrival Time", "Record Entry Timestamp", "Recorded By", "Classification", "Verification Reason"] },
    { name: "Absence Notifications", headers: ["Notification ID", "Member ID", "Full Name", "Session ID / Date", "Absence Reason", "Category (Anticipated/Emergency)", "Explanation", "Timestamp", "Review Status", "Reviewed By", "Decision Date", "Officer Notes"] },
    { name: "Accommodation Applications", headers: ["Application ID", "Member ID", "Full Name", "Category", "Explanation", "Affected Days", "Affected Sessions", "Start Date", "Expiry Date", "Duration (Months)", "Supporting Doc Ref", "Status", "Review Notes"] },
    { name: "Approved Accommodations", headers: ["Approval ID", "Member ID", "Full Name", "Category", "Start Date", "Expiry Date", "Late Penalty Exempt?", "Absence Penalty Exempt?", "Special Instructions", "Choir Master Approval", "Exec Rep 1 Approval", "Exec Rep 2 Approval", "Status"] },
    { name: "Fine Ledger", headers: ["Fine ID", "Member ID", "Full Name", "Session ID", "Session Date", "Violation Type", "Fine Amount (₦)", "Assessment Timestamp", "Assessment Officer", "Exempted?", "Due Date (21 Days)", "Payment Status"] },
    { name: "Payment Ledger", headers: ["Payment ID", "Member ID", "Full Name", "Payment Date", "Amount Paid (₦)", "Payment Method", "Bank Reference", "Receipt Number", "Received By (Provost)", "Recorded By", "Notes"] },
    { name: "Adjustment and Waiver Ledger", headers: ["Adjustment ID", "Member ID", "Full Name", "Date", "Type (Waiver/Correction/Credit)", "Amount (₦)", "Justification Reason", "Approved By (Choir Master)", "Executive Minute Ref"] },
    { name: "Individual Financial Accounts", headers: ["Member ID", "Full Name", "Voice Part", "Total Fines (₦)", "Total Paid (₦)", "Total Adjustments (₦)", "Net Outstanding Balance (₦)", "Oldest Unpaid Fine Date", "Days Overdue", "21-Day Query Flag"] },
    { name: "Queries and Responses", headers: ["Query ID", "Member ID", "Full Name", "Issue Date", "Response Deadline", "Outstanding Debt (₦)", "Fines Included", "Query Status", "Issued By", "Member Response Date", "Member Explanation", "Executive Decision", "Reviewing Officers"] },
    { name: "Suspension and Reinstatement Register", headers: ["Suspension ID", "Member ID", "Full Name", "Effective Date", "Disciplinary Grounds", "Approving Panel", "Reinstatement Terms", "Current Status", "Reinstatement Date", "Ratified By"] },
    { name: "Complaints and Disputes", headers: ["Complaint ID", "Member ID", "Full Name", "Date Filed", "Category", "Description", "Ref Session/Tx ID", "Assigned Adjudicator", "Investigation Status", "Resolution Finding", "Resolution Date"] },
    { name: "Fund Movement and Expense Register", headers: ["Movement ID", "Date", "Transaction Type", "Amount (₦)", "Description", "Disbursed/Collected By", "Approved By", "Voucher/Receipt No"] },
    { name: "Monthly Reports", headers: ["Report Month", "Total Sessions", "Avg Attendance %", "Total Fines Assessed (₦)", "Total Fines Collected (₦)", "Outstanding Debt (₦)", "Cash In Hand (₦)", "Bank Balance (₦)", "Generated Timestamp"] },
    { name: "Audit Log", headers: ["Log ID", "Timestamp", "Responsible Officer", "Action Performed", "Target Entity", "Original Value", "Updated Value", "Mandatory Reason"] }
  ];

  sheetsDefinition.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
    }
    // Set headers
    sheet.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
    sheet.getRange(1, 1, 1, def.headers.length)
      .setBackground("#1e3a8a")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, def.headers.length);
  });

  populateDefaultSettings(ss);
  logAuditEvent("SYSTEM_BOOTSTRAP", "All 20 Sheets Initialized", "None", "Complete 20-Sheet Schema Provisioned", "System Installation");
  SpreadsheetApp.getUi().alert("Setup Successful! All 20 Master Sheets created and formatted.");
}

function populateDefaultSettings(ss) {
  const sheet = ss.getSheetByName("Settings and Configuration");
  if (!sheet) return;
  const defaults = [
    ["DEFAULT_LATE_FINE", "Penalty assessed for late arrival past grace period", 200, "Choir Master", "Configurable under Part 9"],
    ["DEFAULT_ABSENCE_FINE", "Penalty assessed for unexcused rehearsal absence", 500, "Choir Master", "Configurable under Part 9"],
    ["DEFAULT_GRACE_PERIOD_MINS", "Grace period added to required arrival time", 5, "Provost / Choir Master", "Default 5 minutes"],
    ["DEBT_QUERY_THRESHOLD_DAYS", "Days before unpaid fine triggers disciplinary query", 21, "Constitution Part 11", "Compulsory 21-day rule"],
    ["QUERY_RESPONSE_DAYS", "Calendar days member has to answer official query", 7, "Executive Committee", "Standard response window"],
    ["MAX_ACCOMMODATION_MONTHS", "Maximum continuous accommodation duration", 3, "Part 8 Policy", "Renewable upon re-application"],
    ["PUBLIC_REGISTER_SHOWS_FINE", "Display session fine on public register", "YES", "Choir Master", "YES or NO"],
    ["CHOIR_MASTER_NAME", "Current Choir Master", "Sir Anthony K. Nwosu", "Diocese / Parish", ""],
    ["PROVOST_NAME", "Current Provost (Attendance & Discipline)", "Brother Emmanuel Okoli", "Choir Executive", ""]
  ];
  sheet.getRange(2, 1, defaults.length, 5).setValues(defaults);
}
`
  },
  {
    name: '02_Code_Main.gs',
    type: 'gs',
    description: 'Custom Google Sheets Menu "CHOIR MANAGEMENT", dialog triggers, and QR code generator.',
    code: `/**
 * @file 02_Code_Main.gs
 * @description Master UI menu and workflow triggers
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("CHOIR MANAGEMENT")
    .addItem("1. Register New Chorister", "menuRegisterChorister")
    .addItem("2. Create Rehearsal Session", "menuCreateSession")
    .addItem("3. Edit Session Timetable (With Audit)", "menuEditSessionTimetable")
    .addSeparator()
    .addItem("4. Generate Session QR & Attendance Link", "menuGenerateQR")
    .addItem("5. Open Attendance Check-in", "menuOpenAttendance")
    .addItem("6. Manual Check-in (Dual Timestamps)", "menuManualCheckin")
    .addItem("7. Reconcile & Finalise Session Attendance", "menuFinaliseAttendance")
    .addSeparator()
    .addItem("8. Record Payment (Cash / Bank Transfer)", "menuRecordPayment")
    .addItem("9. Process Approved Waiver / Adjustment", "menuProcessWaiver")
    .addItem("10. Recalculate Financial Accounts", "recalculateAllAccounts")
    .addSeparator()
    .addItem("11. Scan 21-Day Overdue Debts & Flag Queries", "scan21DayOverdueDebts")
    .addItem("12. Generate Official Disciplinary Query Notice", "menuGenerateQueryNotice")
    .addItem("13. Record Query Response", "menuRecordQueryResponse")
    .addItem("14. Process Suspension / Reinstatement", "menuProcessSuspension")
    .addSeparator()
    .addItem("15. Synchronise Public Attendance Register", "synchronisePublicRegister")
    .addItem("16. Generate Monthly Executive Report", "generateMonthlyReport")
    .addItem("17. Backup Database to Google Drive", "backupMasterWorkbook")
    .addToUi();
}

/**
 * Generates an attendance check-in link and displayable QR code
 */
function menuGenerateQR() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const schedSheet = ss.getSheetByName("RehearsalSchedule");
  const ui = SpreadsheetApp.getUi();

  const response = ui.prompt("Generate Check-in QR", "Enter Active Session ID (e.g. SESS-2026-11-01-SUN-AM):", ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const sessionId = response.getResponseText().trim();

  // Look up session
  const session = findSessionById(sessionId);
  if (!session) {
    ui.alert("Error", "Session ID not found in Rehearsal Schedule.", ui.ButtonSet.OK);
    return;
  }

  const webAppUrl = ScriptApp.getService().getUrl() || "https://script.google.com/macros/s/CURRENT_DEPLOYMENT_ID/exec";
  const checkinUrl = webAppUrl + "?action=checkin&session=" + encodeURIComponent(sessionId) + "&code=" + encodeURIComponent(session.accessCode);
  
  // Free Google Charts API / QR server image
  const qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" + encodeURIComponent(checkinUrl);

  const htmlOutput = HtmlService.createHtmlOutput(
    '<div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">' +
    '<h2 style="color: #1e3a8a; margin-bottom: 5px;">' + session.activityType + '</h2>' +
    '<p style="margin: 0; color: #555;">Date: <strong>' + session.date + '</strong> | Required Call: <strong>' + session.requiredArrivalTime + '</strong></p>' +
    '<p style="color: #c026d3; font-weight: bold; font-size: 16px;">Session Access Code: ' + session.accessCode + '</p>' +
    '<img src="' + qrImageUrl + '" alt="Attendance QR Code" style="border: 2px solid #e2e8f0; border-radius: 8px; margin: 15px 0;" />' +
    '<p style="font-size: 12px; color: #64748b; word-break: break-all;">Direct Link: <a href="' + checkinUrl + '" target="_blank">' + checkinUrl + '</a></p>' +
    '<p style="font-size: 11px; color: #94a3b8;">Choristers can scan this code with their phone camera to open the self check-in portal.</p>' +
    '</div>'
  ).setWidth(420).setHeight(520);

  ui.showModalDialog(htmlOutput, "Rehearsal Check-in QR Code");
}
`
  },
  {
    name: '03_Attendance_Engine.gs',
    type: 'gs',
    description: 'Punctuality calculation, dual timestamp manual check-in, duplicate validation, and self-service web app endpoint.',
    code: `/**
 * @file 03_Attendance_Engine.gs
 * @description Attendance Recording, Punctuality Evaluation, and Reconciliation
 */

/**
 * Evaluates punctuality based on required arrival time, grace period, and actual arrival time
 * @param {string} reqTimeStr - "HH:mm" (e.g. "07:30")
 * @param {string} actualTimeStr - "HH:mm" (e.g. "07:35")
 * @param {number} graceMinutes - default 5
 * @returns {Object} { classification: "Present"|"Late", isLate: boolean }
 */
function evaluatePunctuality(reqTimeStr, actualTimeStr, graceMinutes) {
  graceMinutes = Number(graceMinutes) || 5;
  const [reqH, reqM] = reqTimeStr.split(":").map(Number);
  const [actH, actM] = actualTimeStr.split(":").map(Number);

  const reqTotalMinutes = reqH * 60 + reqM;
  const actTotalMinutes = actH * 60 + actM;
  const cutoffMinutes = reqTotalMinutes + graceMinutes;

  if (actTotalMinutes <= cutoffMinutes) {
    return { classification: "Present", isLate: false };
  } else {
    return { classification: "Late", isLate: true };
  }
}

/**
 * Provost Manual Check-in function
 * Enforces dual timestamps:
 * 1. observedArrivalTime: The actual time the chorister walked into the rehearsal room
 * 2. recordEntryTimestamp: Current system clock when Provost entered the data
 */
function recordManualAttendance(sessionId, memberId, observedArrivalTime, recordedBy, notes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const finalSheet = ss.getSheetByName("Final Attendance Register");
  const manualSheet = ss.getSheetByName("Manual Attendance Entries");
  const schedSheet = ss.getSheetByName("Rehearsal Schedule");
  const memberSheet = ss.getSheetByName("Chorister Membership");

  // Validate duplicate
  if (isMemberAlreadyCheckedIn(sessionId, memberId)) {
    throw new Error("Duplicate Check-in: Member " + memberId + " already has an attendance entry for session " + sessionId);
  }

  // Get session info
  const session = findSessionById(sessionId);
  if (!session) throw new Error("Session not found: " + sessionId);

  // Get member info
  const member = findMemberById(memberId);
  if (!member) throw new Error("Member not found: " + memberId);

  // Check accommodation
  const accommodation = getActiveAccommodation(memberId, session.date);
  let classification = "Present";

  const punctuality = evaluatePunctuality(session.requiredArrivalTime, observedArrivalTime, session.gracePeriodMinutes);
  if (punctuality.isLate) {
    if (accommodation && accommodation.exemptLatePenalties) {
      classification = "Present"; // Accommodated
      notes = (notes ? notes + "; " : "") + "Late fine exempted under approved accommodation";
    } else {
      classification = "Late";
    }
  }

  const now = new Date();
  const entryTimestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  const attId = "ATT-" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd") + "-" + Math.floor(1000 + Math.random() * 9000);

  // Write to Manual Attendance Entries
  manualSheet.appendRow([
    "MAN-" + attId,
    sessionId,
    memberId,
    observedArrivalTime,
    entryTimestamp,
    recordedBy || "Brother Emmanuel Okoli (Provost)",
    classification,
    notes || "Verified by Provost"
  ]);

  // Write to Final Attendance Register
  finalSheet.appendRow([
    attId,
    sessionId,
    memberId,
    member.fullName,
    member.voicePart,
    observedArrivalTime,
    entryTimestamp,
    "Manual_Provost",
    classification,
    recordedBy || "Brother Emmanuel Okoli (Provost)",
    classification === "Late" ? session.latePenaltyAmount : 0,
    "",
    notes || ""
  ]);

  logAuditEvent("MANUAL_CHECKIN", "Recorded attendance for " + member.fullName, "None", classification + " (" + observedArrivalTime + ")", notes || "Manual verification");
  return { success: true, attendanceId: attId, classification: classification };
}

/**
 * Web App Endpoint for Chorister Self Check-in
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sessionId = data.sessionId;
    const memberId = data.memberId;
    const accessCode = data.accessCode;

    const session = findSessionById(sessionId);
    if (!session) return jsonResponse({ success: false, message: "Invalid Session ID" });
    if (session.sessionStatus === "Finalised") return jsonResponse({ success: false, message: "Attendance for this session has been finalised and closed." });
    if (session.accessCode !== accessCode) return jsonResponse({ success: false, message: "Invalid or expired session access code." });

    if (isMemberAlreadyCheckedIn(sessionId, memberId)) {
      return jsonResponse({ success: false, message: "Duplicate submission: You are already checked in for this session." });
    }

    const member = findMemberById(memberId);
    if (!member) return jsonResponse({ success: false, message: "Unrecognised Member ID." });

    const now = new Date();
    const actualArrivalTime = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm");
    const entryTimestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");

    const punctuality = evaluatePunctuality(session.requiredArrivalTime, actualArrivalTime, session.gracePeriodMinutes);
    const classification = punctuality.classification;

    const attId = "ATT-" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd") + "-" + Math.floor(1000 + Math.random() * 9000);
    const finalSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Final Attendance Register");
    
    finalSheet.appendRow([
      attId,
      sessionId,
      memberId,
      member.fullName,
      member.voicePart,
      actualArrivalTime,
      entryTimestamp,
      "QR_Self",
      classification,
      "Self-Checkin (Pending Provost Verification)",
      0, // Fine assessed during finalisation
      "",
      ""
    ]);

    return jsonResponse({
      success: true,
      attendanceId: attId,
      memberName: member.fullName,
      classification: classification,
      actualArrivalTime: actualArrivalTime,
      message: "Check-in recorded successfully as " + classification + "!"
    });
  } catch (err) {
    return jsonResponse({ success: false, message: err.toString() });
  }
}
`
  },
  {
    name: '04_Finance_and_Discipline.gs',
    type: 'gs',
    description: 'Fine assessment upon finalisation, payment ledger, 21-day debt aging scanner, query notice generator, and suspension panel.',
    code: `/**
 * @file 04_Finance_and_Discipline.gs
 * @description Financial Penalties, Payment Collections, 21-Day Debt Queries, and Disciplinary Sanctions
 */

/**
 * Finalises session attendance and assesses fines:
 * - Late arrival: ₦200 (unless exempted by approved accommodation)
 * - Unexcused absence: ₦500 (unless Excused or Not Expected)
 * - Approved excuse: ₦0
 */
function finaliseSessionAttendance(sessionId, officerName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const finalSheet = ss.getSheetByName("Final Attendance Register");
  const fineSheet = ss.getSheetByName("Fine Ledger");
  const session = findSessionById(sessionId);
  if (!session) throw new Error("Session not found: " + sessionId);

  const attData = finalSheet.getDataRange().getValues();
  let finesAssessedCount = 0;
  let totalFinesAmount = 0;

  for (let r = 1; r < attData.length; r++) {
    if (attData[r][1] === sessionId) {
      const memberId = attData[r][2];
      const memberName = attData[r][3];
      const classification = attData[r][8];
      let fineAmount = 0;
      let violationType = "";

      if (classification === "Late") {
        fineAmount = session.latePenaltyAmount;
        violationType = "Late Arrival";
      } else if (classification === "Absent") {
        fineAmount = session.absencePenaltyAmount;
        violationType = "Unexcused Absence";
      }

      if (fineAmount > 0) {
        const fineId = "FINE-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd") + "-" + Math.floor(100 + Math.random() * 900);
        const assessmentTimestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
        
        // 21-day due date
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 21);
        const dueDateStr = Utilities.formatDate(dueDate, Session.getScriptTimeZone(), "yyyy-MM-dd");

        // Write to Fine Ledger
        fineSheet.appendRow([
          fineId,
          memberId,
          memberName,
          sessionId,
          session.date,
          violationType,
          fineAmount,
          assessmentTimestamp,
          officerName || "Brother Emmanuel Okoli (Provost)",
          "NO",
          dueDateStr,
          "Unpaid"
        ]);

        // Update Final Register with Fine ID and Amount
        finalSheet.getRange(r + 1, 11).setValue(fineAmount);
        finalSheet.getRange(r + 1, 12).setValue(fineId);

        finesAssessedCount++;
        totalFinesAmount += fineAmount;
      }
    }
  }

  // Update session status
  updateSessionStatus(sessionId, "Finalised");
  recalculateAllAccounts();
  logAuditEvent("FINALISE_ATTENDANCE", "Finalised session " + sessionId, "In Progress", "Finalised", "Assessed " + finesAssessedCount + " fines totaling ₦" + totalFinesAmount);
  return { finesAssessedCount: finesAssessedCount, totalFinesAmount: totalFinesAmount };
}

/**
 * Records a fine settlement payment
 * Supports Cash, Bank Transfer, partial payments, multiple payments, full settlement
 */
function recordPayment(memberId, amount, paymentMethod, bankReference, receivedBy, notes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const paySheet = ss.getSheetByName("Payment Ledger");
  const member = findMemberById(memberId);
  if (!member) throw new Error("Member not found: " + memberId);

  const now = new Date();
  const paymentId = "PAY-" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd") + "-" + Math.floor(100 + Math.random() * 900);
  const receiptNo = "RCP-" + Math.floor(1000 + Math.random() * 9000);
  const paymentDate = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");

  paySheet.appendRow([
    paymentId,
    memberId,
    member.fullName,
    paymentDate,
    Number(amount),
    paymentMethod,
    bankReference || "",
    receiptNo,
    receivedBy || "Brother Emmanuel Okoli (Provost)",
    Session.getActiveUser().getEmail() || "Executive Desk",
    notes || ""
  ]);

  // Record fund movement
  const fundSheet = ss.getSheetByName("Fund Movement and Expense Register");
  fundSheet.appendRow([
    "FND-" + paymentId,
    paymentDate,
    paymentMethod === "Cash" ? "Fine Collection (Cash)" : "Fine Collection (Bank)",
    Number(amount),
    "Payment received from " + member.fullName + " (Receipt: " + receiptNo + ")",
    receivedBy || "Provost Desk",
    "",
    receiptNo
  ]);

  recalculateAllAccounts();
  logAuditEvent("PAYMENT_RECORDED", "Payment of ₦" + amount + " for " + member.fullName, "Receipt: " + receiptNo, "Outstanding reduced", notes || "");
  return { paymentId: paymentId, receiptNumber: receiptNo };
}

/**
 * COMPULSORY 21-DAY DEBT SCANNER
 * Flags any member with unpaid fines older than 21 calendar days
 */
function scan21DayOverdueDebts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const fineSheet = ss.getSheetByName("Fine Ledger");
  const querySheet = ss.getSheetByName("Queries and Responses");
  const memberSheet = ss.getSheetByName("Chorister Membership");
  const today = new Date();

  const fineData = fineSheet.getDataRange().getValues();
  const overdueMembers = {};

  for (let r = 1; r < fineData.length; r++) {
    const status = fineData[r][11];
    if (status === "Unpaid" || status === "Partially Paid") {
      const memberId = fineData[r][1];
      const memberName = fineData[r][2];
      const fineId = fineData[r][0];
      const amount = Number(fineData[r][6]);
      const sessionDate = new Date(fineData[r][4]);

      const diffDays = Math.floor((today - sessionDate) / (1000 * 60 * 60 * 24));
      if (diffDays >= 21) {
        if (!overdueMembers[memberId]) {
          overdueMembers[memberId] = {
            memberId: memberId,
            memberName: memberName,
            totalOverdue: 0,
            fineIds: [],
            oldestDays: diffDays
          };
        }
        overdueMembers[memberId].totalOverdue += amount;
        overdueMembers[memberId].fineIds.push(fineId);
        if (diffDays > overdueMembers[memberId].oldestDays) {
          overdueMembers[memberId].oldestDays = diffDays;
        }
      }
    }
  }

  const flagged = Object.values(overdueMembers);
  return flagged;
}

/**
 * Prepares and issues an Official Disciplinary Query Notice
 */
function issueOfficialQuery(memberId, fineIds, outstandingAmount, responseDays) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const querySheet = ss.getSheetByName("Queries and Responses");
  const memberSheet = ss.getSheetByName("Chorister Membership");
  const member = findMemberById(memberId);
  if (!member) throw new Error("Member not found");

  const now = new Date();
  const queryId = "QRY-" + Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd") + "-" + Math.floor(100 + Math.random() * 900);
  const issueDate = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + (responseDays || 7));
  const deadlineStr = Utilities.formatDate(deadline, Session.getScriptTimeZone(), "yyyy-MM-dd");

  const noticeText = "OFFICIAL DISCIPLINARY QUERY: In accordance with Part 11 of the Choir Accountability Policy, your outstanding disciplinary debt of ₦" + 
    outstandingAmount + " has remained unsettled past the 21-day threshold. You are required to submit an explanation or proposed payment plan by " + deadlineStr + ".";

  querySheet.appendRow([
    queryId,
    memberId,
    member.fullName,
    issueDate,
    deadlineStr,
    outstandingAmount,
    fineIds.join(", "),
    "Issued",
    "Sir Anthony K. Nwosu (Choir Master) & Brother Emmanuel Okoli (Provost)",
    "",
    "",
    "Pending Review",
    ""
  ]);

  // Update member status to 'Under Query'
  updateMemberMembershipStatus(memberId, "Under Query");
  logAuditEvent("QUERY_ISSUED", "Disciplinary Query " + queryId + " issued to " + member.fullName, "Active", "Under Query", "21-Day Debt Overdue: ₦" + outstandingAmount);
  return { queryId: queryId, deadline: deadlineStr, noticeText: noticeText };
}
`
  },
  {
    name: '05_PublicSync_and_Drive.gs',
    type: 'gs',
    description: 'Sanitised synchronisation to Workbook B (Public Register) and automated Google Drive backup.',
    code: `/**
 * @file 05_PublicSync_and_Drive.gs
 * @description Synchronization to Public Register (Workbook B) and Google Drive Backups
 */

/**
 * Synchronises finalised attendance to Workbook B (Public Register)
 * ZERO PRIVACY LEAK ENFORCEMENT:
 * Strips cumulative debts, payment receipts, private accommodation reasons, and disciplinary notes.
 */
function synchronisePublicRegister() {
  const masterSS = SpreadsheetApp.getActiveSpreadsheet();
  const finalSheet = masterSS.getSheetByName("Final Attendance Register");
  const settingsSheet = masterSS.getSheetByName("Settings and Configuration");

  // Determine if individual session fines are authorised for public display
  const showFine = getSettingValue("PUBLIC_REGISTER_SHOWS_FINE") === "YES";

  // Target Workbook B ID stored in script properties or user input
  const publicSpreadsheetId = PropertiesService.getScriptProperties().getProperty("PUBLIC_REGISTER_SPREADSHEET_ID");
  if (!publicSpreadsheetId) {
    SpreadsheetApp.getUi().alert("Please configure 'PUBLIC_REGISTER_SPREADSHEET_ID' in Script Properties or run Setup.");
    return;
  }

  const publicSS = SpreadsheetApp.openById(publicSpreadsheetId);
  let publicSheet = publicSS.getSheetByName("Public Attendance Register");
  if (!publicSheet) {
    publicSheet = publicSS.insertSheet("Public Attendance Register");
  }

  // Clear and rewrite sanitized headers
  publicSheet.clear();
  const headers = ["Session ID", "Date", "Chorister Name", "Voice Part", "Observed Arrival", "Attendance Status"];
  if (showFine) headers.push("Session Penalty (₦)");

  publicSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  publicSheet.getRange(1, 1, 1, headers.length)
    .setBackground("#047857")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  publicSheet.setFrozenRows(1);

  const rawData = finalSheet.getDataRange().getValues();
  const publicRows = [];

  for (let r = 1; r < rawData.length; r++) {
    const sessionId = rawData[r][1];
    const memberName = rawData[r][3];
    const voicePart = rawData[r][4];
    const observedArrival = rawData[r][5];
    const classification = rawData[r][8];
    const fineAmount = rawData[r][10] || 0;

    const row = [sessionId, rawData[r][1].substring(5, 15), memberName, voicePart, observedArrival, classification];
    if (showFine) row.push(classification === "Late" || classification === "Absent" ? fineAmount : 0);
    publicRows.push(row);
  }

  if (publicRows.length > 0) {
    publicSheet.getRange(2, 1, publicRows.length, headers.length).setValues(publicRows);
  }
  publicSheet.autoResizeColumns(1, headers.length);

  logAuditEvent("PUBLIC_SYNC", "Pushed " + publicRows.length + " sanitized records to Workbook B", "Pending", "Synchronised", "Public register update");
  SpreadsheetApp.getUi().alert("Public Attendance Register (Workbook B) synchronised successfully! " + publicRows.length + " records published.");
}

/**
 * Automated Database Backup to Google Drive
 */
function backupMasterWorkbook() {
  const masterSS = SpreadsheetApp.getActiveSpreadsheet();
  const masterFile = DriveApp.getFileById(masterSS.getId());
  
  // Find or create 'Choir Backups' folder in Drive
  let folderIterator = DriveApp.getFoldersByName("Choir Backups");
  let folder;
  if (folderIterator.hasNext()) {
    folder = folderIterator.next();
  } else {
    folder = DriveApp.createFolder("Choir Backups");
  }

  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd_HHmmss");
  const backupName = "Master_Workbook_Backup_" + timestamp;
  const backupFile = masterFile.makeCopy(backupName, folder);

  logAuditEvent("DATABASE_BACKUP", "Created Drive backup: " + backupName, "Active", "Archived", "Drive folder: Choir Backups");
  SpreadsheetApp.getUi().alert("Backup Created Successfully! Saved in Google Drive under folder 'Choir Backups' as: " + backupName);
}
`
  },
  {
    name: '06_CheckinPortal.html',
    type: 'html',
    description: 'Responsive mobile-friendly chorister self check-in interface with camera QR scanner and Provost manual mode.',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Choir Attendance Check-in Portal</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
</head>
<body class="bg-gray-50 text-gray-800">
  <div class="max-w-md mx-auto min-h-screen p-4 flex flex-col justify-between">
    <div>
      <!-- Header -->
      <div class="bg-blue-900 text-white p-5 rounded-2xl shadow-lg mb-4 text-center">
        <h1 class="text-xl font-bold tracking-tight">St. Cecilia Church Choir</h1>
        <p class="text-blue-200 text-xs mt-1">Rehearsal Attendance Check-in Portal</p>
        <div id="sessionBanner" class="mt-3 bg-blue-800 py-1.5 px-3 rounded-lg text-xs font-mono inline-block">
          Loading Session...
        </div>
      </div>

      <!-- Main Card -->
      <div class="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
        <div class="flex border-b border-gray-200 mb-4">
          <button id="tabSelf" class="flex-1 py-2 text-sm font-semibold border-b-2 border-blue-600 text-blue-600">
            Chorister Self Check-in
          </button>
          <button id="tabProvost" class="flex-1 py-2 text-sm font-semibold border-b-2 border-transparent text-gray-500">
            Provost Manual Mode
          </button>
        </div>

        <!-- Self Check-in Tab -->
        <div id="selfCheckinSection">
          <form id="checkinForm" onsubmit="handleSelfCheckin(event)" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-gray-700 uppercase mb-1">Select Your Name / Member ID</label>
              <select id="memberSelect" required class="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">-- Choose your name --</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-gray-700 uppercase mb-1">Session Access Code</label>
              <input type="text" id="accessCodeInput" required placeholder="e.g. SUN-732" 
                class="w-full border border-gray-300 rounded-lg p-2.5 text-sm uppercase tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <p class="text-xs text-gray-500 mt-1">Access code is announced by the Provost at the rehearsal door.</p>
            </div>

            <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-900">
              <span class="font-semibold">Note:</span> Your arrival timestamp is recorded automatically by the server upon submission.
            </div>

            <button type="submit" id="submitBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl shadow transition">
              Confirm My Attendance
            </button>
          </form>

          <div id="resultBox" class="mt-4 hidden p-4 rounded-xl text-center"></div>
        </div>

        <!-- Provost Manual Mode Tab -->
        <div id="provostSection" class="hidden space-y-4">
          <div class="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900">
            <strong>Provost Desk:</strong> Enter observed arrival time for choristers without smartphones.
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 uppercase mb-1">Chorister</label>
            <select id="provostMemberSelect" class="w-full border border-gray-300 rounded-lg p-2.5 text-sm"></select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 uppercase mb-1">Observed Arrival Time</label>
            <input type="time" id="provostTimeInput" class="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
          </div>
          <button onclick="handleProvostCheckin()" class="w-full bg-green-700 text-white font-medium py-2.5 rounded-xl">
            Save Manual Record
          </button>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center text-xs text-gray-400 py-4">
      St. Cecilia Choir Disciplinary System &copy; 2026
    </div>
  </div>

  <script>
    // Embedded client script handling URL params and Google Apps Script backend calls
    function getQueryParam(param) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(param);
    }

    window.onload = function() {
      const session = getQueryParam('session') || 'SESS-2026-11-01-SUN-AM';
      const code = getQueryParam('code') || '';
      document.getElementById('sessionBanner').innerText = 'Session: ' + session;
      if (code) {
        document.getElementById('accessCodeInput').value = code;
      }
    };
  </script>
</body>
</html>
`
  }
];
