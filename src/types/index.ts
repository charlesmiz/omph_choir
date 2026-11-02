export type VoicePart = 'Soprano' | 'Alto' | 'Tenor' | 'Bass';

export type MembershipStatus = 'Active' | 'Under Query' | 'Suspended' | 'Inactive' | 'Resigned';

export type AttendanceArrangement = 
  | 'Standard'
  | 'Approved Accommodation - Work'
  | 'Approved Accommodation - Distance'
  | 'Approved Accommodation - Music Instruction'
  | 'Approved Accommodation - Other'
  | 'Special Dispensation';

export type AttendanceClassification = 
  | 'Present' 
  | 'Late' 
  | 'Absent' 
  | 'Excused' 
  | 'Not Expected' 
  | 'Pending Review' 
  | 'Suspended';

export type CheckinMethod = 'QR_Self' | 'Manual_Provost' | 'Admin_Adjustment';

export type ViolationType = 'Late Arrival' | 'Unexcused Absence' | 'Disciplinary Fine';

export type PaymentMethod = 'Cash' | 'Bank Transfer';

export type QueryStatus = 'Flagged' | 'Issued' | 'Response Received' | 'Resolved' | 'Suspension Recommended' | 'Closed';

export type ComplaintCategory = 
  | 'Incorrect Attendance' 
  | 'Incorrect Fine' 
  | 'Payment Record Dispute' 
  | 'Accommodation Decision' 
  | 'Administrative Conduct' 
  | 'Other';

export type ComplaintStatus = 'New' | 'Under Review' | 'Further Information Required' | 'Resolved' | 'Rejected' | 'Escalated';

export interface Chorister {
  memberId: string;
  fullName: string;
  voicePart: VoicePart;
  phoneNumber: string; // E.164 / international format, e.g., +234 803 123 4567
  membershipDate: string; // YYYY-MM-DD
  membershipStatus: MembershipStatus;
  attendanceArrangement: AttendanceArrangement;
  registrationDate: string;
  notes?: string;
  email?: string;
  profilePhotoUrl?: string; // Image URL or Base64 avatar
}

export interface RehearsalSession {
  sessionId: string;
  activityType: 'Friday Rehearsal' | 'Saturday Rehearsal' | 'Sunday Pre-Mass' | 'Sunday Post-Mass' | 'Special Programme';
  date: string; // YYYY-MM-DD
  defaultRequiredArrivalTime: string; // HH:mm
  requiredArrivalTime: string; // HH:mm (can be overridden)
  actualStartTime: string; // HH:mm
  rehearsalEndTime?: string; // HH:mm
  attendanceOpeningTime: string; // HH:mm
  attendanceClosingTime: string; // HH:mm
  gracePeriodMinutes: number; // default 5
  isCompulsory: boolean;
  penaltiesApply: boolean;
  specialCircumstances?: string;
  approvingOfficer: string;
  scheduleAnnouncementTimestamp: string;
  sessionStatus: 'Scheduled' | 'In Progress' | 'Finalised' | 'Cancelled';
  accessCode: string;
  latePenaltyAmount: number; // ₦200 default
  absencePenaltyAmount: number; // ₦500 default
}

export interface ScheduleChangeAudit {
  auditId: string;
  sessionId: string;
  oldTime: string;
  newTime: string;
  reason: string;
  modifiedBy: string;
  timestamp: string;
}

export interface AttendanceRecord {
  attendanceId: string;
  sessionId: string;
  memberId: string;
  memberName: string;
  voicePart: VoicePart;
  actualArrivalTime: string; // e.g. "07:32"
  entryTimestamp: string; // e.g. "2026-11-01 07:35:10"
  entryMethod: CheckinMethod;
  recordedBy: string;
  classification: AttendanceClassification;
  isVerified: boolean;
  notes?: string;
  fineAssessed?: number;
  fineId?: string;
}

export interface AbsenceNotification {
  notificationId: string;
  memberId: string;
  memberName: string;
  sessionId: string;
  rehearsalDate: string;
  reason: string;
  isAnticipated: boolean; // Anticipated vs Emergency
  supportingExplanation?: string;
  submissionTimestamp: string;
  status: 'Pending Review' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewDate?: string;
  reviewNotes?: string;
}

export interface AccommodationApplication {
  applicationId: string;
  memberId: string;
  memberName: string;
  category: 'Employment' | 'Transport & Distance' | 'Music Instruction / Teaching' | 'Other Exceptional';
  explanation: string;
  affectedDays: string[]; // e.g. ['Friday', 'Saturday']
  affectedSessionTypes: string[];
  startDate: string;
  expiryDate: string;
  requestedDurationMonths: number;
  supportingDocumentRef?: string;
  exemptLatePenalties: boolean;
  exemptAbsencePenalties: boolean;
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Expired';
  firstApprover?: string; // Choir Master
  secondApprover?: string; // 1st designated exec
  thirdApprover?: string; // 2nd designated exec
  approvedDate?: string;
  notes?: string;
}

export interface FineRecord {
  fineId: string;
  memberId: string;
  memberName: string;
  sessionId: string;
  date: string;
  violationType: ViolationType;
  amount: number;
  assessmentTimestamp: string;
  assessmentOfficer: string;
  isExempted: boolean;
  exemptionReason?: string;
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Waived';
  dueDate: string; // 21 days after assessment
}

export interface PaymentRecord {
  paymentId: string;
  memberId: string;
  memberName: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  bankReference?: string;
  receiptNumber: string;
  receivedBy: string; // e.g. Provost
  recordedBy: string;
  notes?: string;
}

export interface AdjustmentRecord {
  adjustmentId: string;
  memberId: string;
  memberName: string;
  date: string;
  type: 'Waiver' | 'Correction' | 'Credit';
  amount: number;
  reason: string;
  approvedBy: string; // Choir Master / Authorized Exec
  notes?: string;
}

export interface MemberFinancialAccount {
  memberId: string;
  memberName: string;
  voicePart: VoicePart;
  totalFines: number;
  totalPaid: number;
  totalAdjustments: number;
  outstandingBalance: number; // totalFines - totalPaid - totalAdjustments
  oldestUnpaidFineDate?: string;
  daysOverdue: number;
  queryEligible: boolean; // Overdue > 21 days
}

export interface QueryRecord {
  queryId: string;
  memberId: string;
  memberName: string;
  issueDate: string;
  responseDeadline: string; // 7 days from issue
  outstandingAmount: number;
  fineIds: string[];
  status: QueryStatus;
  issuedBy: string;
  officialNoticeText: string;
  memberResponseDate?: string;
  memberResponseText?: string;
  executiveReviewDate?: string;
  executiveDecision?: 'Resolved' | 'Payment Arrangement Approved' | 'Further Explanation Required' | 'Query Upheld' | 'Suspension Recommended' | 'No Action';
  decisionNotes?: string;
  reviewingOfficers?: string[];
}

export interface SuspensionRecord {
  suspensionId: string;
  memberId: string;
  memberName: string;
  effectiveDate: string;
  reason: string;
  approvingOfficers: string[]; // Choir Master + Executives
  reinstatementConditions: string;
  isReinstated: boolean;
  reinstatementDate?: string;
  reinstatedBy?: string;
}

export interface ComplaintRecord {
  complaintId: string;
  memberId: string;
  memberName: string;
  complaintDate: string;
  category: ComplaintCategory;
  description: string;
  relevantReferenceId?: string; // Session ID or Transaction ID
  assignedOfficer: string; // If against Provost, assigned to Choir Master
  status: ComplaintStatus;
  decision?: string;
  resolutionDate?: string;
  isConfidential: boolean;
}

export interface FundMovementRecord {
  movementId: string;
  date: string;
  type: 'Fine Collection (Cash)' | 'Fine Collection (Bank)' | 'Disbursement / Expense' | 'Bank Deposit';
  amount: number;
  description: string;
  recordedBy: string;
  approvedBy?: string;
}

export interface AuditLogEntry {
  logId: string;
  timestamp: string;
  user: string;
  action: string;
  targetEntity: string;
  oldValue: string;
  newValue: string;
  reason: string;
}

export interface SystemSettings {
  parishName: string;
  choirName: string;
  executivePin: string; // PIN code for executive access (e.g. "1234")
  defaultLateFine: number; // 200
  defaultAbsenceFine: number; // 500
  defaultGracePeriodMinutes: number; // 5
  debtQueryThresholdDays: number; // 21
  queryResponseDays: number; // 7
  maxAccommodationMonths: number; // 3
  publicRegisterShowsFineAmount: boolean; // configurable by Choir Master
  choirMasterName: string;
  provostName: string;
  assistantProvostName: string;
  secretaryName: string;
  treasurerName: string;
  currencySymbol: string; // ₦
}

export type LiturgicalCategory = 
  | 'Entrance Hymn'
  | 'Kyrie & Gloria'
  | 'Responsorial Psalm'
  | 'Gospel Acclamation / Alleluia'
  | 'Offertory'
  | 'Sanctus & Benedictus'
  | 'Agnus Dei'
  | 'Communion'
  | 'Marian Hymn / Antiphon'
  | 'Recessional / Dismissal'
  | 'Solemn Feast / Easter / Christmas'
  | 'Lent & Holy Week'
  | 'Choral Anthem';

export interface ChoirSong {
  songId: string;
  title: string;
  composer?: string;
  category: LiturgicalCategory;
  liturgicalSeason?: string;
  keySignature?: string;
  solfaNotes?: string;
  scriptText: string;
  sheetMusicUrl?: string;
  audioGuideUrl?: string;
  voiceParts?: ('Soprano' | 'Alto' | 'Tenor' | 'Bass')[];
  uploadedBy?: string;
  dateAdded: string;
}

export interface ChoirGalleryItem {
  photoId: string;
  title: string;
  caption?: string;
  eventDate: string;
  category: 'Solemnities & Feasts' | 'Robing & Inductions' | 'Rehearsals & Practices' | 'Choir Competitions' | 'Parish Events' | 'Retreats & Community';
  imageUrl: string;
  uploadedBy?: string;
  uploadedDate: string;
}


