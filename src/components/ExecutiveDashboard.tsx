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
  FileSpreadsheet
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
  SystemSettings
} from '../types';
import { ChoirHeroBanner } from './ChoirHeroBanner';

interface ExecutiveDashboardProps {
  members: Chorister[];
  sessions: RehearsalSession[];
  attendanceRecords: AttendanceRecord[];
  fines: FineRecord[];
  payments: PaymentRecord[];
  queries: QueryRecord[];
  absences: AbsenceNotification[];
  accommodations: AccommodationApplication[];
  setActiveTab: (tab: string) => void;
  settings?: SystemSettings;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  members,
  sessions,
  attendanceRecords,
  fines,
  payments,
  queries,
  absences,
  accommodations,
  setActiveTab,
  settings,
}) => {
  // Calculations
  const activeMembers = members.filter(m => m.membershipStatus === 'Active');
  const underQueryMembers = members.filter(m => m.membershipStatus === 'Under Query');
  const suspendedMembers = members.filter(m => m.membershipStatus === 'Suspended');

  const totalFinesAssessed = fines.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalWaivers = 200; // from initial adjustments
  const netOutstanding = totalFinesAssessed - totalPaid - totalWaivers;

  const cashCollected = payments
    .filter(p => p.paymentMethod === 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);
  const bankCollected = payments
    .filter(p => p.paymentMethod === 'Bank Transfer')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAbsences = absences.filter(a => a.status === 'Pending Review');
  const pendingAccommodations = accommodations.filter(a => a.status === 'Pending Review');

  // Latest session stats (Sunday Pre-Mass or Friday)
  const latestSession = sessions[0];
  const latestSessionAttendance = attendanceRecords.filter(a => a.sessionId === latestSession.sessionId);
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
        activeSession={sessions[0]}
        mode="executive"
      />

      {/* Alert Banner if 21-day debt or pending queries */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 p-4 rounded-r-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-600 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">
              Disciplinary & Accountability Notice (Part 11 Compliance)
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

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Membership */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Choir Membership</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{members.length}</span>
            <span className="text-xs text-emerald-600 font-medium">({activeMembers.length} Active)</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex justify-between border-t border-slate-100 pt-2">
            <span>Query: <strong className="text-amber-600">{underQueryMembers.length}</strong></span>
            <span>Suspended: <strong className="text-red-600">{suspendedMembers.length}</strong></span>
            <span>Accommodated: <strong className="text-indigo-600">3</strong></span>
          </div>
        </div>

        {/* Card 2: Latest Attendance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Latest Session Attendance</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {presentCount + lateCount} / {members.length}
            </span>
            <span className="text-xs text-emerald-600 font-medium">
              ({Math.round(((presentCount + lateCount) / (presentCount + lateCount + absentCount || 1)) * 100)}% Rate)
            </span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex justify-between border-t border-slate-100 pt-2">
            <span className="text-emerald-700 font-medium">Present: {presentCount}</span>
            <span className="text-amber-700 font-medium">Late: {lateCount}</span>
            <span className="text-red-700 font-medium">Absent: {absentCount}</span>
            <span className="text-slate-600 font-medium">Excused: {excusedCount}</span>
          </div>
        </div>

        {/* Card 3: Fines & Debt */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Fines & Debt Overview</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">₦{netOutstanding.toLocaleString()}</span>
            <span className="text-xs text-red-600 font-medium">Unsettled</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex justify-between border-t border-slate-100 pt-2">
            <span>Assessed: <strong>₦{totalFinesAssessed.toLocaleString()}</strong></span>
            <span>Collected: <strong>₦{totalPaid.toLocaleString()}</strong></span>
            <span>Waivers: <strong>₦{totalWaivers}</strong></span>
          </div>
        </div>

        {/* Card 4: Cashier Funds */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cashier Custody</span>
            <Wallet className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">₦{(cashCollected - 400).toLocaleString()}</span>
            <span className="text-xs text-purple-700 font-medium">Cash in Hand</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex justify-between border-t border-slate-100 pt-2">
            <span>Cash Rcvd: <strong>₦{cashCollected}</strong></span>
            <span>Bank Rcvd: <strong>₦{bankCollected}</strong></span>
            <span>Disbursed: <strong>₦400</strong></span>
          </div>
        </div>
      </div>

      {/* Quick Operational Actions */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span>Provost Rehearsal Action Center</span>
          <span className="text-xs font-normal text-slate-500">Quick sequence of common rehearsal duties</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
            onClick={() => setActiveTab('attendance')}
            className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-left transition border border-emerald-200 flex flex-col justify-between"
          >
            <FileCheck className="w-5 h-5 text-emerald-600 mb-2" />
            <div>
              <div className="text-xs font-bold">Finalise Session</div>
              <div className="text-[10px] text-emerald-700">Assess ₦200 / ₦500</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className="p-3 bg-purple-50 hover:bg-purple-100 text-purple-900 rounded-lg text-left transition border border-purple-200 flex flex-col justify-between"
          >
            <DollarSign className="w-5 h-5 text-purple-600 mb-2" />
            <div>
              <div className="text-xs font-bold">Record Payment</div>
              <div className="text-[10px] text-purple-700">Cash or Bank Tx</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('discipline')}
            className="p-3 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-left transition border border-amber-200 flex flex-col justify-between"
          >
            <ShieldAlert className="w-5 h-5 text-amber-600 mb-2" />
            <div>
              <div className="text-xs font-bold">21-Day Debt Scan</div>
              <div className="text-[10px] text-amber-700">Disciplinary query</div>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-left transition border border-slate-300 flex flex-col justify-between"
          >
            <CheckCircle2 className="w-5 h-5 text-slate-700 mb-2" />
            <div>
              <div className="text-xs font-bold">35 Test Suite</div>
              <div className="text-[10px] text-slate-600">Prompt compliance</div>
            </div>
          </button>
        </div>
      </div>

      {/* Voice Parts & Financial Transparency Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Voice Section Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center justify-between">
            <span>Voice Sections Breakdown</span>
            <span className="text-xs text-slate-500">40 Registered</span>
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Sopranos (Treble)</span>
                <span className="font-semibold text-slate-900">{voiceDistribution.Soprano} (25%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-pink-500 h-full rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Altos (Contralto)</span>
                <span className="font-semibold text-slate-900">{voiceDistribution.Alto} (25%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Tenors</span>
                <span className="font-semibold text-slate-900">{voiceDistribution.Tenor} (25%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">Basses</span>
                <span className="font-semibold text-slate-900">{voiceDistribution.Bass} (25%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600">
            <strong>Section Leadership:</strong>
            <ul className="mt-1 space-y-0.5 list-disc list-inside text-slate-500">
              <li>Alto Section Leader: Sr. Chidera Obi (Asst. Provost)</li>
              <li>Tenor Section Leader: Bro. Emmanuel Okoli (Provost)</li>
              <li>Bass Section Leader: Bro. Michael Eze (Secretary)</li>
            </ul>
          </div>
        </div>

        {/* Middle Column: Current Rehearsal Schedule */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Active & Upcoming Rehearsal Sessions</h3>
              <p className="text-xs text-slate-500">Flexible call times with audit reason tracking</p>
            </div>
            <button
              onClick={() => setActiveTab('schedule')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              Full Timetable <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {sessions.map(sess => (
              <div key={sess.sessionId} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg text-xs font-bold ${
                    sess.sessionStatus === 'In Progress'
                      ? 'bg-emerald-100 text-emerald-800'
                      : sess.sessionStatus === 'Finalised'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {sess.sessionStatus}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900">{sess.activityType}</h4>
                    <p className="text-[11px] text-slate-500">
                      Date: <span className="font-mono">{sess.date}</span> | Required Call: <strong className="text-blue-700 font-mono">{sess.requiredArrivalTime}</strong>
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
