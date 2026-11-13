import React from 'react';
import { 
  Users, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Calendar, 
  ShieldAlert, 
  FileCheck, 
  ArrowRight,
  Wallet,
  Building2,
  FileSpreadsheet,
  Coins,
  Bell,
  History,
  CreditCard,
  Check,
  ShieldCheck,
  HeartHandshake
} from 'lucide-react';
import { 
  Chorister, 
  RehearsalSession, 
  AttendanceRecord, 
  FineRecord, 
  PaymentRecord, 
  QueryRecord, 
  AbsenceNotification, 
  AccommodationApplication,
  SystemSettings,
  MonthlyDuesAssessment,
  BankDetailsChangeProposal,
  WelfareFollowUpCase,
  AdjustmentRecord,
  FundMovementRecord
} from '../types';
import { ChoirHeroBanner } from './ChoirHeroBanner';
import { ChoristerAvatar } from './ChoristerAvatar';
import { evaluateWelfareCases } from '../utils/welfareEvaluation';

interface ExecutiveDashboardProps {
  members: Chorister[];
  sessions: RehearsalSession[];
  activeSession?: RehearsalSession | null;
  nextSession?: RehearsalSession | null;
  attendanceRecords: AttendanceRecord[];
  fines: FineRecord[];
  payments: PaymentRecord[];
  adjustments?: AdjustmentRecord[];
  fundMovements?: FundMovementRecord[];
  queries: QueryRecord[];
  absences: AbsenceNotification[];
  accommodations: AccommodationApplication[];
  setActiveTab: (tab: string) => void;
  settings?: SystemSettings;
  monthlyDues?: MonthlyDuesAssessment[];
  bankProposal?: BankDetailsChangeProposal | null;
  welfareCases?: WelfareFollowUpCase[];
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  members,
  sessions,
  activeSession,
  nextSession,
  attendanceRecords,
  fines,
  payments,
  adjustments = [],
  fundMovements = [],
  queries,
  absences,
  accommodations,
  setActiveTab,
  settings,
  monthlyDues = [],
  bankProposal,
  welfareCases = [],
}) => {
  // Welfare Calculations
  const welfareEval = React.useMemo(() => {
    return evaluateWelfareCases(
      members,
      sessions,
      attendanceRecords,
      absences,
      settings,
      welfareCases
    );
  }, [members, sessions, attendanceRecords, absences, settings, welfareCases]);

  // Calculations
  const activeMembers = members.filter(m => m.membershipStatus === 'Active');
  const underQueryMembers = members.filter(m => m.membershipStatus === 'Under Query');
  const suspendedMembers = members.filter(m => m.membershipStatus === 'Suspended');

  // Fines metrics
  const totalFinesAssessed = fines.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalWaivers = adjustments.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const netOutstandingFines = Math.max(0, totalFinesAssessed - totalPaid - totalWaivers);

  // Monthly Dues metrics
  const duesAssessed = monthlyDues.reduce((sum, d) => sum + (d.amountAssessed ?? d.assessedAmount ?? 0), 0);
  const duesCollected = monthlyDues.reduce((sum, d) => sum + (d.amountPaid ?? 0), 0);
  const duesOutstanding = monthlyDues.reduce((sum, d) => sum + (d.balanceRemaining ?? d.remainingBalance ?? 0), 0);

  const cashCollected = payments
    .filter(p => p.paymentMethod === 'Cash')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const bankCollected = payments
    .filter(p => p.paymentMethod === 'Bank Transfer')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const cashDisbursed = fundMovements
    .filter(fm => fm.type === 'Disbursement / Expense' || fm.type === 'Bank Deposit')
    .reduce((sum, fm) => sum + (Number(fm.amount) || 0), 0);
  const cashInHand = cashCollected - cashDisbursed;

  const pendingAbsences = absences.filter(a => a.status === 'Pending Review');

  // Latest session stats
  const latestSession = sessions[0];
  const latestSessionAttendance = attendanceRecords.filter(a => latestSession && a.sessionId === latestSession.sessionId);
  const presentCount = latestSessionAttendance.filter(a => a.classification === 'Present').length;
  const lateCount = latestSessionAttendance.filter(a => a.classification === 'Late').length;
  const absentCount = latestSessionAttendance.filter(a => a.classification === 'Absent').length;
  const excusedCount = latestSessionAttendance.filter(a => a.classification === 'Excused' || a.classification === 'Not Expected').length;

  const voiceDistribution = {
    Soprano: members.filter(m => m.voicePart === 'Soprano').length,
    Alto: members.filter(m => m.voicePart === 'Alto').length,
    Tenor: members.filter(m => m.voicePart === 'Tenor').length,
    Bass: members.filter(m => m.voicePart === 'Bass').length,
  };

  return (
    <div className="w-full space-y-6">
      {/* Wide Horizontal Choir Hero Banner */}
      <ChoirHeroBanner
        settings={settings}
        totalMembers={members.length}
        activeSession={activeSession}
        nextSession={nextSession}
        mode="executive"
      />

      {/* Disciplinary & Bank Proposal Alert Banners */}
      <div className="space-y-3">
        {bankProposal && (bankProposal.status === 'Pending Approval' || bankProposal.status === 'Pending Second Approval') && (
          <div className="bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent border-l-4 border-blue-600 p-4 rounded-r-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-700 rounded-lg">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">
                  Bank Details Modification Awaiting Second Executive Approval
                </h4>
                <p className="text-xs text-slate-600">
                  Proposed: {bankProposal.proposedDetails?.bankName || bankProposal.bankName} — {bankProposal.proposedDetails?.accountNumber || bankProposal.accountNumber} ({bankProposal.proposedDetails?.accountName || bankProposal.accountName}) by {bankProposal.proposedByOfficer || bankProposal.proposedBy || 'Officer'}.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('settings')}
              className="text-xs bg-blue-700 hover:bg-blue-800 text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
            >
              Review & Approve <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 p-4 rounded-r-xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-600 rounded-lg">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">
                Disciplinary & Accountability Notice (Part 11 & Constitutional Rules)
              </h4>
              <p className="text-xs text-slate-600">
                {underQueryMembers.length} chorister(s) currently under formal 21-day debt queries. {pendingAbsences.length} excuse application(s) awaiting executive review.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('discipline')}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
            >
              Review 21-Day Queries <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CHORISTER WELFARE SUMMARY CARD */}
      <div className="bg-gradient-to-r from-rose-50 via-white to-rose-50/50 p-4 rounded-xl border border-rose-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 border border-rose-200 shadow-2xs font-bold">
            <HeartHandshake className="w-5 h-5 text-rose-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-950">Chorister Welfare</span>
              {welfareEval.summary.requiringAttention > 0 && (
                <span className="bg-rose-600 text-white text-[9px] font-bold px-2 py-0.2 rounded-full">
                  Follow-up Needed
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {welfareEval.summary.requiringAttention} {welfareEval.summary.requiringAttention === 1 ? 'member' : 'members'} requiring follow-up.
            </p>
            <p className="text-[11px] text-slate-500">
              Absence monitoring: checking in on choristers who have missed recent choir gatherings.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('welfare')}
          className="px-4 py-2 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-2xs shrink-0 cursor-pointer"
        >
          <HeartHandshake className="w-4 h-4 text-rose-300" />
          View Welfare Follow-ups
        </button>
      </div>

      {/* Primary KPI Grid (6 Cards: Membership, Attendance, Disciplinary Fines, Monthly Dues, Cashier Custody, Bank Dues Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Membership */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Membership</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{members.length}</span>
            <span className="text-[10px] text-emerald-600 font-medium">({activeMembers.length} Active)</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between">
            <span>Query: <strong className="text-amber-600">{underQueryMembers.length}</strong></span>
            <span>Suspended: <strong className="text-red-600">{suspendedMembers.length}</strong></span>
          </div>
        </div>

        {/* Card 2: Attendance Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Latest Session</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">
              {presentCount + lateCount} / {members.length || 1}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">
              ({Math.round(((presentCount + lateCount) / (presentCount + lateCount + absentCount || 1)) * 100)}%)
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between">
            <span className="text-emerald-700">P: {presentCount}</span>
            <span className="text-amber-700">L: {lateCount}</span>
            <span className="text-red-700">A: {absentCount}</span>
          </div>
        </div>

        {/* Card 3: Disciplinary Fines Assessed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Fines Assessed</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">₦{totalFinesAssessed.toLocaleString()}</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between">
            <span>Collected: <strong className="text-emerald-600">₦{totalPaid}</strong></span>
            <span>Unpaid: <strong className="text-red-600">₦{netOutstandingFines}</strong></span>
          </div>
        </div>

        {/* Card 4: Monthly Dues Assessed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Monthly Dues</span>
            <Coins className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">₦{duesAssessed.toLocaleString()}</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between">
            <span>Collected: <strong className="text-emerald-600">₦{duesCollected}</strong></span>
            <span>Balance: <strong className="text-red-600">₦{duesOutstanding}</strong></span>
          </div>
        </div>

        {/* Card 5: Net Outstanding Obligations */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Unsettled</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-red-700">
              ₦{(netOutstandingFines + duesOutstanding).toLocaleString()}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between">
            <span>Fines: ₦{netOutstandingFines}</span>
            <span>Dues: ₦{duesOutstanding}</span>
          </div>
        </div>

        {/* Card 6: Cashier Custody */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">Cash in Hand</span>
            <Wallet className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">₦{cashInHand.toLocaleString()}</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between">
            <span>Cash: ₦{cashCollected}</span>
            <span>Bank: ₦{bankCollected}</span>
          </div>
        </div>
      </div>

      {/* Quick Executive Operations Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">
          Provost & Executive Ministry Action Center
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <button
            onClick={() => setActiveTab('welfare')}
            className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-950 rounded-lg text-left transition border border-rose-200 flex flex-col justify-between cursor-pointer"
          >
            <HeartHandshake className="w-5 h-5 text-rose-700 mb-2" />
            <div>
              <div className="text-xs font-bold">Chorister Welfare</div>
              <div className="text-[10px] text-rose-800">{welfareEval.summary.requiringAttention} need follow-up</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-left transition border border-blue-200 flex flex-col justify-between"
          >
            <Clock className="w-5 h-5 text-blue-600 mb-2" />
            <div>
              <div className="text-xs font-bold">Manual Check-in</div>
              <div className="text-[10px] text-blue-700">Dual timestamps</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-lg text-left transition border border-indigo-200 flex flex-col justify-between"
          >
            <Calendar className="w-5 h-5 text-indigo-600 mb-2" />
            <div>
              <div className="text-xs font-bold">Session QR Code</div>
              <div className="text-[10px] text-indigo-700">Display at door</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('dues')}
            className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-left transition border border-emerald-200 flex flex-col justify-between"
          >
            <Coins className="w-5 h-5 text-emerald-600 mb-2" />
            <div>
              <div className="text-xs font-bold">Monthly Dues</div>
              <div className="text-[10px] text-emerald-700">Billing cycle & exemptions</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('announcements')}
            className="p-3 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-left transition border border-amber-200 flex flex-col justify-between"
          >
            <Bell className="w-5 h-5 text-amber-600 mb-2" />
            <div>
              <div className="text-xs font-bold">Choir Bulletins</div>
              <div className="text-[10px] text-amber-700">Share to WhatsApp</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('discipline')}
            className="p-3 bg-red-50 hover:bg-red-100 text-red-900 rounded-lg text-left transition border border-red-200 flex flex-col justify-between"
          >
            <ShieldAlert className="w-5 h-5 text-red-600 mb-2" />
            <div>
              <div className="text-xs font-bold">21-Day Debt Scan</div>
              <div className="text-[10px] text-red-700">Formal query issuance</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('audit-logs')}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-left transition border border-slate-300 flex flex-col justify-between"
          >
            <History className="w-5 h-5 text-slate-700 mb-2" />
            <div>
              <div className="text-xs font-bold">Audit Trail</div>
              <div className="text-[10px] text-slate-600">CSV export & actions</div>
            </div>
          </button>
        </div>
      </div>

      {/* Voice Parts & Active Rehearsal Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Voice Section Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center justify-between">
            <span>Voice Sections Breakdown</span>
            <span className="text-xs text-slate-500">{members.length} Registered</span>
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Sopranos (Treble)</span>
                <span className="font-semibold text-slate-900">{voiceDistribution.Soprano}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-pink-500 h-full rounded-full" 
                  style={{ width: `${(voiceDistribution.Soprano / (members.length || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Altos (Contralto)</span>
                <span className="font-semibold text-slate-900">{voiceDistribution.Alto}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full" 
                  style={{ width: `${(voiceDistribution.Alto / (members.length || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Tenors</span>
                <span className="font-semibold text-slate-900">{voiceDistribution.Tenor}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full" 
                  style={{ width: `${(voiceDistribution.Tenor / (members.length || 1)) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Basses</span>
                <span className="font-semibold text-slate-900">{voiceDistribution.Bass}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full" 
                  style={{ width: `${(voiceDistribution.Bass / (members.length || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
              <strong className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Current Parish Choir Executive Officers:
              </strong>
              <button
                onClick={() => setActiveTab('settings')}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold underline cursor-pointer"
              >
                Edit Roster
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              {(() => {
                const resolveOfficerMember = (posId: string, code: string): Chorister | undefined => {
                  const pos = settings?.positions?.find(
                    (p: any) => p.positionId === posId || (p.code || '').toUpperCase() === code
                  );
                  if (!pos || !pos.assignedMemberId) return undefined;
                  return members.find((m) => m.memberId === pos.assignedMemberId);
                };
                const slots = [
                  { label: 'Choir Master', member: resolveOfficerMember('POS-CM', 'CM') },
                  { label: 'Asst. Choir Master', member: resolveOfficerMember('POS-ACM', 'ACM') },
                  { label: 'Provost', member: resolveOfficerMember('POS-PV', 'PV') },
                  { label: 'Asst. Provost', member: resolveOfficerMember('POS-APV', 'APV') },
                  { label: 'Secretary', member: resolveOfficerMember('POS-SEC', 'SEC') },
                  { label: 'Financial Secretary', member: resolveOfficerMember('POS-FINSEC', 'FINSEC') },
                  { label: 'Treasurer', member: resolveOfficerMember('POS-TR', 'TR') },
                  { label: 'Choir Librarian', member: resolveOfficerMember('POS-LIB', 'LIB') },
                ];
                return slots.map((slot) => (
                  <div key={slot.label} className="flex items-center gap-2 p-1.5 bg-slate-50/80 rounded-lg border border-slate-100">
                    {slot.member ? (
                      <ChoristerAvatar
                        fullName={slot.member.fullName}
                        voicePart={slot.member.voicePart}
                        photoUrl={slot.member.profilePhotoUrl}
                        size="sm"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0">
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block truncate">{slot.label}</span>
                      {slot.member ? (
                        <span className="font-bold text-slate-900 block truncate text-xs">{slot.member.fullName}</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px] block">Vacant</span>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Middle Column: Current Rehearsal Schedule */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Rehearsal Operations & Schedule</h3>
            </div>
            <button
              onClick={() => setActiveTab('schedule')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Full Timetable <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Current Live Session Card OR No Session Notice */}
          {activeSession ? (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Live Rehearsal In Progress
                    </span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-950 font-mono font-bold px-2 py-0.5 rounded">
                      Door Code: {activeSession.accessCode}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {activeSession.activityType}
                  </h4>
                  <p className="text-xs text-emerald-900">
                    Call Time: <strong className="font-mono">{activeSession.requiredArrivalTime}</strong> · Closes automatically after 4 hours or upon Provost finalisation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('attendance')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-sm"
              >
                Open Attendance Desk
              </button>
            </div>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                <span>
                  <strong>No rehearsal currently in progress.</strong>{' '}
                  {nextSession ? (
                    <>Next scheduled: <span className="font-semibold text-slate-900">{nextSession.activityType}</span> ({nextSession.date} at {nextSession.requiredArrivalTime})</>
                  ) : (
                    'All scheduled sessions completed.'
                  )}
                </span>
              </div>
              {nextSession && (
                <button
                  onClick={() => setActiveTab('schedule')}
                  className="text-[11px] text-blue-700 hover:underline font-semibold shrink-0"
                >
                  View Details
                </button>
              )}
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {sessions.map(sess => (
              <div key={sess.sessionId} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-start gap-3">
                  <div className={`px-2 py-1 rounded text-[11px] font-bold ${
                    sess.sessionStatus === 'In Progress'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : sess.sessionStatus === 'Finalised' || sess.sessionStatus === 'Completed'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-blue-50 text-blue-800 border border-blue-200'
                  }`}>
                    {sess.sessionStatus}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{sess.activityType}</h4>
                    <p className="text-[11px] text-slate-500">
                      Date: <span className="font-mono">{sess.date}</span> | Call Time: <strong className="text-slate-800 font-mono">{sess.requiredArrivalTime}</strong>
                      {sess.requiredArrivalTime !== sess.defaultRequiredArrivalTime && (
                        <span className="ml-1 text-amber-600 font-semibold">(Default: {sess.defaultRequiredArrivalTime})</span>
                      )}
                    </p>
                    {sess.specialCircumstances && (
                      <p className="text-[11px] text-amber-700 italic mt-0.5">
                        Circumstance: {sess.specialCircumstances}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] bg-slate-100 px-2 py-1 rounded font-mono text-slate-700">
                    Code: {sess.accessCode}
                  </span>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded"
                  >
                    Open Desk
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
