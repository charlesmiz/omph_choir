import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Plus, 
  HelpCircle,
  Briefcase
} from 'lucide-react';
import { 
  AbsenceNotification, 
  AccommodationApplication, 
  Chorister 
} from '../types';

interface AccommodationsAndExcusesProps {
  members: Chorister[];
  absences: AbsenceNotification[];
  accommodations: AccommodationApplication[];
  onReviewAbsence: (notificationId: string, status: 'Approved' | 'Rejected', notes: string) => void;
  onReviewAccommodation: (applicationId: string, status: 'Approved' | 'Rejected', notes: string) => void;
}

export const AccommodationsAndExcuses: React.FC<AccommodationsAndExcusesProps> = ({
  members,
  absences,
  accommodations,
  onReviewAbsence,
  onReviewAccommodation,
}) => {
  const [activeTab, setActiveTab] = useState<'absences' | 'accommodations'>('absences');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Excuses & Approved Attendance Accommodations (Parts 7 & 8)
          </h2>
          <p className="text-xs text-slate-500">
            Formal reviews of absence notifications and standing 3-month accommodations (Employment, Distance, Music Instruction).
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('absences')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'absences'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" /> Absence Notifications (Sheet 8) ({absences.length})
        </button>

        <button
          onClick={() => setActiveTab('accommodations')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'accommodations'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Briefcase className="w-4 h-4" /> Approved Accommodations (Sheet 10) ({accommodations.length})
        </button>
      </div>

      {/* TAB 1: ABSENCES */}
      {activeTab === 'absences' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Absence Notifications Register (Part 7 - Sheet 8)
              </h3>
              <p className="text-xs text-slate-500">
                Submissions are not auto-approvals. Approval results in "Excused" classification with ₦0 fine. Rejection incurs ₦500 unexcused fine.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {absences.map(a => (
              <div 
                key={a.notificationId}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                      {a.notificationId}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{a.memberName}</h4>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      a.isAnticipated ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {a.isAnticipated ? 'Anticipated' : 'Emergency'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1">
                    <strong>Reason:</strong> {a.reason}
                  </p>
                  {a.supportingExplanation && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      <strong>Explanation:</strong> {a.supportingExplanation}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Rehearsal Date: {a.rehearsalDate} | Submitted: {a.submissionTimestamp}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {a.status === 'Pending Review' ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onReviewAbsence(a.notificationId, 'Approved', 'Approved by Choir Leadership')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve (₦0)
                      </button>
                      <button
                        onClick={() => onReviewAbsence(a.notificationId, 'Rejected', 'Reason does not meet church criteria')}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject (₦500)
                      </button>
                    </div>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      a.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {a.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ACCOMMODATIONS */}
      {activeTab === 'accommodations' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Approved Attendance Accommodations Register (Part 8 - Sheet 10)
            </h3>
            <p className="text-xs text-slate-500">
              Requires 3-member panel approval (Choir Master + 2 Executive Reps). Max 3-month term. No indefinite exemptions. Full reasons never exposed in public register.
            </p>
          </div>

          <div className="space-y-4">
            {accommodations.map(acc => (
              <div 
                key={acc.applicationId}
                className={`p-4 rounded-xl border ${
                  acc.status === 'Approved'
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : acc.status === 'Rejected'
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-amber-200 bg-amber-50/30'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                      {acc.applicationId}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{acc.memberName} ({acc.memberId})</h4>
                    <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {acc.category}
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                    acc.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : acc.status === 'Rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {acc.status}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>Explanation:</strong> {acc.explanation}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px] bg-white/80 p-2.5 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Affected Days:</span>
                    <span className="font-medium text-slate-800">{acc.affectedDays.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Duration / Expiry:</span>
                    <span className="font-mono font-semibold text-slate-800">{acc.expiryDate} (3 Mos)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Exemptions:</span>
                    <span className="font-medium text-emerald-700">
                      Late: {acc.exemptLatePenalties ? 'Yes' : 'No'} | Abs: {acc.exemptAbsencePenalties ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Approvers:</span>
                    <span className="font-medium text-slate-700 truncate block">
                      {acc.firstApprover ? 'CM + 2 Execs' : 'Pending'}
                    </span>
                  </div>
                </div>

                {acc.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-2">
                    Review notes: {acc.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
