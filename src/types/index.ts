export type VoicePart = 'Soprano' | 'Alto' | 'Tenor' | 'Bass';

export type MembershipStatus = 'Active' | 'Under Query' | 'Suspended' | 'Inactive' | 'Archived' | 'Resigned';

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
  | 'Identity / Voice Correction'
  | 'Other';

export type ComplaintStatus = 'New' | 'Under Review' | 'Further Information Required' | 'Resolved' | 'Rejected' | 'Escalated';

export interface IdentityCorrectionRequest {
  requestId: string;
  memberId: string;
  memberName: string;
  requestType: 'name_correction' | 'voice_change';
  currentValue: string;
  proposedValue: string;
  reason: string;
  submissionDate: string;
  status: 'Pending Review' | 'Approved' | 'Rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

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
  residentialAddress?: string;
  occupation?: string;
  dateOfBirth?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  preferredContactMethod?: 'WhatsApp' | 'Phone Call' | 'In-Person' | 'Do Not Contact on WhatsApp';
  optOutWhatsApp?: boolean;
  archiveReason?: string;
  archivedAt?: string;
  archivedBy?: string;
}

export type ExecutiveRole = 
  | 'Choir Master' 
  | 'Assistant Choir Master' 
  | 'Provost' 
  | 'Assistant Provost' 
  | 'Secretary' 
  | 'Financial Secretary' 
  | 'Treasurer' 
  | 'Librarian'
  | string;

export interface ExecutivePosition {
  positionId: string;
  title: string;
  code: string;
  description: string;
  defaultPermissions: string[];
  isSystem: boolean;
  status: 'Active' | 'Archived' | 'Deactivated';
  createdAt: string;
  updatedAt?: string;
  assignedOfficerCount?: number;
  assignedMemberId?: string;
  assignedOfficer?: string;
  assignedDate?: string;
  assignedBy?: string;
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
  sessionStatus: 'Draft' | 'Published' | 'Updated' | 'Scheduled' | 'In Progress' | 'Finalised' | 'Completed' | 'Cancelled';
  accessCode: string;
  latePenaltyAmount: number; // ₦200 default
  absencePenaltyAmount: number; // ₦500 default
  publishedAt?: string;
  publishedBy?: string;
  revisionReason?: string;
  specialNotice?: string;
  venue?: string;
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
  paymentDate?: string;
  dueDate: string; // 21 days after assessment
}

export interface PaymentRecord {
  paymentId: string;
  fineId?: string;
  memberId: string;
  memberName: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  bankReference?: string;
  receiptNumber: string;
  receivedBy: string; // e.g. Provost / Treasurer
  recordedBy: string;
  notes?: string;
  category?: 'Monthly Dues' | 'Late Arrival Fine' | 'Absence Fine' | 'Other Approved Charge';
  targetAssessmentId?: string; // e.g. billing month "2026-11" or fineId
  status?: 'Pending Verification' | 'Verified / Paid' | 'Rejected';
  proofOfPaymentUrl?: string; // Base64 or image URL
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
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
  totalDuesAssessed?: number;
  totalDuesPaid?: number;
  outstandingDuesBalance?: number;
  grandTotalOutstanding?: number;
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
  queryCategory?: 'Attendance Fines' | 'Monthly Dues' | 'Combined Obligations';
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
  userId?: string;
  fullName?: string;
  officialPosition?: string;
  action: string;
  module?: string;
  targetEntity: string;
  recordId?: string;
  oldValue: string;
  newValue: string;
  reason: string;
  sessionOrRequestId?: string;
  user?: string;
}

// Phase 2: Individual Executive Account
export interface ExecutiveAccount {
  executiveId: string;
  memberId?: string; // Link to Chorister Membership Register (Single Source of Truth)
  fullName: string;
  name?: string; // convenient alias
  username: string;
  passwordHash?: string; // Salted cryptographic hash
  position: ExecutiveRole;
  role?: ExecutiveRole; // convenient alias
  status: 'Active' | 'Inactive' | 'Suspended';
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
  phone?: string;
  email?: string;
}

// Phase 2: Individual Chorister Account
export interface ChoristerAccount {
  memberId: string;
  username: string; // Defaults to memberId
  passwordHash: string;
  isActivated: boolean;
  activationCode?: string; // Single-use activation code
  activationCodeGeneratedAt?: string;
  activationCodeExpiresAt?: string;
  activationCodeUsedAt?: string;
  resetToken?: string; // Administrator-assisted single-use reset token
  resetTokenExpiresAt?: string;
  resetAuthorizedBy?: string;
  lastPasswordChange?: string;
  failedLoginAttempts?: number;
  lockoutUntil?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  profilePhotoUrl?: string;
}

// Phase 2: Official Bank Details with 2-Officer Approval
export interface BankDetailsChangeProposal {
  proposalId?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  paymentInstructions?: string;
  narrationInstructions?: string;
  paymentContact?: string;
  proposedBy?: string;
  proposedByOfficer?: string;
  proposedByPosition?: string;
  proposedAt?: string;
  timestamp?: string;
  status: 'Pending Approval' | 'Approved' | 'Rejected' | 'Pending Second Approval';
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  reason?: string;
  proposedDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    narrationInstructions?: string;
    paymentInstructions?: string;
  };
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  paymentInstructions?: string;
  narrationInstructions?: string;
  paymentContact?: string;
  isVerified?: boolean;
  verificationStatus?: string;
  lastUpdated: string;
  proposedChanges?: BankDetailsChangeProposal;
}

// Phase 2: Monthly Choir Dues Module
export interface MonthlyDuesConfig {
  isEnabled: boolean; // Initially disabled until configured
  amount: number; // 0 until executive enters approved amount
  currency: string; // '₦'
  effectiveCommencementMonth: string; // e.g. '2026-11'
  monthlyBillingDay: number; // 1-28
  paymentDeadlineDays: number; // e.g. 21
  gracePeriodDays: number;
  allowsPaymentArrangements: boolean;
  subjectTo21DayQuery: boolean;
  applicableCategories?: string[];
}

export interface MonthlyDuesAssessment {
  assessmentId: string; // Unique key: memberId_YYYY-MM (e.g. CHO-S01_2026-11)
  memberId: string;
  memberName: string;
  voicePart: VoicePart;
  billingMonth: string; // YYYY-MM
  billingDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  assessedAmount: number;
  amountAssessed?: number; // alias
  amountPaid: number;
  remainingBalance: number;
  balanceRemaining?: number; // alias
  status: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Exempted' | 'Waived' | 'Pending Verification';
  exemptionReason?: string;
  approvedBy?: string;
  createdAt: string;
  paymentHistory?: {
    paymentId: string;
    amount: number;
    date: string;
    receiptNumber: string;
    method: string;
    reference?: string;
  }[];
}

// Phase 2: Choir Announcements with Manual WhatsApp Share
export type AnnouncementCategory = 
  | 'Regular Rehearsal' 
  | 'Time Change' 
  | 'Special Rehearsal' 
  | 'General Meeting' 
  | 'Parish Programme' 
  | 'Special Mass' 
  | 'Liturgical Celebration' 
  | 'Music Assignment' 
  | 'Emergency Notification' 
  | 'General Choir Update';

export interface ChoirAnnouncement {
  announcementId: string;
  title: string;
  category?: AnnouncementCategory;
  messageBody?: string;
  content?: string; // alias
  authorName?: string;
  authorRole?: string;
  targetAudience?: 'All Choristers' | 'Probationers' | 'Full Members' | 'Section Leads';
  isPinned?: boolean;
  priority?: 'Standard' | 'Urgent' | 'Liturgical';
  expiryDate?: string;
  postedAt?: string;
  whatsappSharesCount?: number;
  relevantDate?: string;
  relevantTime?: string;
  venue?: string;
  specialInstructions?: string;
  publishingOfficer?: string;
  publishingPosition?: string;
  publicationTimestamp?: string;
  status?: 'Draft' | 'Published' | 'Archived';
  shareHistory?: {
    sharedBy: string;
    timestamp: string;
    channel: 'WhatsApp';
    notes: string;
  }[];
}

export interface SystemSettings {
  parishName: string;
  choirName: string;
  executivePin: string; // Legacy PIN code
  defaultLateFine: number; // 200
  defaultAbsenceFine: number; // 500
  defaultGracePeriodMinutes: number; // 5
  defaultSessionDurationHours?: number; // 4 hours default
  debtQueryThresholdDays: number; // 21
  queryResponseDays: number; // 7
  maxAccommodationMonths: number; // 3
  publicRegisterShowsFineAmount: boolean; // configurable by Choir Master
  choirMasterName: string;
  assistantChoirMasterName?: string;
  provostName: string;
  assistantProvostName: string;
  secretaryName: string;
  financialSecretaryName?: string;
  treasurerName: string;
  librarianName?: string;
  currencySymbol: string; // ₦
  diocese?: string;
  parishAbbreviation?: string;
  parishAddress?: string;
  parishContactPhone?: string;
  parishContactEmail?: string;
  patronSaint?: string;
  feastDay?: string;
  choirMotto?: string;
  parishLogoUrl?: string;
  choirEmblemUrl?: string;
  whatsappGroupInviteUrl?: string;
  whatsappGroupUrl?: string;
  bankDetails?: BankDetails;
  officialBankDetails?: BankDetails;
  monthlyDuesConfig?: MonthlyDuesConfig;
  positions?: ExecutivePosition[];
  welfareSettings?: WelfareSettings;
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
  solfaNotation?: string;
  scriptText?: string;
  lyrics?: string;
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

// -------------------------------------------------------------
// Chorister Welfare, Absence Monitoring & Follow-up Types
// -------------------------------------------------------------

export type WelfareFollowUpStatus = 
  | 'Needs Attention'
  | 'Not Yet Contacted'
  | 'Reminder Scheduled'
  | 'Contacted'
  | 'Further Support Required'
  | 'Resolved';

export type WelfareContactOutcome = 
  | 'Doing well'
  | 'Health or personal concern'
  | 'Work/school commitments'
  | 'Financial difficulty'
  | 'Personal/family matter'
  | 'Unable to reach'
  | 'Further support required'
  | 'No further action required';

export type WelfareContactMethod = 'WhatsApp' | 'Phone Call' | 'In-Person';

export interface WelfareContactLog {
  logId: string;
  contactDate: string; // ISO string
  contactMethod: WelfareContactMethod;
  outcome: WelfareContactOutcome;
  officerId: string;
  officerName: string;
  officerPosition?: string;
  notes?: string;
  nextScheduledFollowUp?: string; // ISO string or YYYY-MM-DD HH:mm
}

export interface WelfareFollowUpCase {
  caseId: string;
  memberId: string;
  memberName: string;
  voicePart: VoicePart;
  phoneNumber?: string;
  preferredContactMethod?: 'WhatsApp' | 'Phone Call' | 'In-Person' | 'Do Not Contact on WhatsApp';
  optOutWhatsApp?: boolean;
  
  // Qualifying unexcused absence details
  qualifyingAbsenceCount: number;
  qualifyingSessionIds: string[];
  qualifyingDates: string[];
  lastAttendanceDate?: string;
  lastAbsenceDate: string;
  
  // Status and assignment
  status: WelfareFollowUpStatus;
  assignedOfficerId: string;
  assignedOfficerName: string;
  assignedOfficerPosition?: string;
  
  // Scheduling & Reminders
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:mm
  reminderNotes?: string;
  reminderAcknowledged?: boolean;
  
  // Outcome & History
  latestOutcome?: WelfareContactOutcome;
  latestContactDate?: string;
  contactHistory: WelfareContactLog[];
  
  // Lifecycle
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface WelfareSettings {
  welfareMonitoringEnabled: boolean; // default true
  unexcusedAbsenceThreshold: number; // default 2
  evaluationWindowGatherings: number; // default 4 completed gatherings
  eligibleGatherings: string[]; // ['Friday Rehearsal', 'Saturday Rehearsal', 'Sunday Pre-Mass', 'Sunday Post-Mass', 'Special Programme']
  timezone: string; // 'Africa/Lagos'
  defaultOfficerPositionId: string; // 'POS-PV' (Provost)
  defaultOfficerName?: string;
}



