import React, { useState } from 'react';
import { 
  Eye, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Calendar, 
  Search, 
  AlertCircle 
} from 'lucide-react';
import { AttendanceRecord, RehearsalSession } from '../types';

interface PublicRegisterViewProps {
  sessions: RehearsalSession[];
  attendanceRecords: AttendanceRecord[];
}

export const PublicRegisterView: React.FC<PublicRegisterViewProps> = ({
  sessions,
  attendanceRecords,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions[0]?.sessionId || ''
  );
  const [searchQuery, setSearchQuery] = useState('');

  const activeSession = sessions.find(s => s.sessionId === selectedSessionId) || sessions[0];
  const sessionAttendance = attendanceRecords.filter(a => a.sessionId === selectedSessionId);

  const filteredRecords = sessionAttendance.filter(r =>
    r.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.voicePart.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Privacy Guarantee Banner */}
      <div className="bg-emerald-950 text-white p-5 rounded-xl border border-emerald-800 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-800/80 rounded-xl text-emerald-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded font-mono font-bold uppercase">
                  WORKBOOK B
                </span>
                <h2 className="text-base font-bold text-white">
                  Public Attendance Register (Sanitized Member Portal)
                </h2>
              </div>
              <p className="text-xs text-emerald-300/90 mt-1 max-w-2xl">
                This public workbook contains only finalized attendance entries. As mandated by Part 3 & Part 14, it strictly protects member privacy.
              </p>
            </div>
          </div>
        </div>

        {/* Security Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs bg-emerald-900/60 p-3 rounded-lg border border-emerald-800/80 text-emerald-200">
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cumulative debts & balances: <strong>Hidden</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Payment histories & bank refs: <strong>Hidden</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Private medical reasons & notes: <strong>Hidden</strong></span>
          </div>
        </div>
      </div>

      {/* Controls & Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700">Select Finalised Session:</span>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="border border-slate-300 rounded-lg p-2 text-xs font-semibold bg-slate-50 focus:ring-2 focus:ring-emerald-500"
          >
            {sessions.map(s => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.date} — {s.activityType} ({s.sessionStatus})
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search your name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Session Details Box */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-semibold text-slate-900 text-sm">{activeSession.activityType}</span>
          <span className="text-slate-500 block">
            Date: <strong className="font-mono">{activeSession.date}</strong> | Required Call: <strong className="font-mono text-emerald-700">{activeSession.requiredArrivalTime}</strong>
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Showing <strong>{filteredRecords.length}</strong> chorister entries for this session.
        </div>
      </div>

      {/* Sanitized Public Register Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-emerald-900 text-white font-semibold">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Rehearsal Activity</th>
                <th className="py-3 px-4">Chorister Name</th>
                <th className="py-3 px-4">Voice Section</th>
                <th className="py-3 px-4">Observed Arrival</th>
                <th className="py-3 px-4">Attendance Status</th>
                <th className="py-3 px-4 text-right">Session Fine (₦)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r) => (
                <tr key={r.attendanceId} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono text-slate-600">{activeSession.date}</td>
                  <td className="py-2.5 px-4 text-slate-800">{activeSession.activityType}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{r.memberName}</td>
                  <td className="py-2.5 px-4">{r.voicePart}</td>
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">{r.actualArrivalTime}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      r.classification === 'Present'
                        ? 'bg-emerald-100 text-emerald-800'
                        : r.classification === 'Late'
                        ? 'bg-amber-100 text-amber-800'
                        : r.classification === 'Excused'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {r.classification}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                    {r.fineAssessed ? `₦${r.fineAssessed}` : '₦0'}
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No finalized attendance entries found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 py-2">
        If you notice an error in your observed arrival time, please file a challenge via the confidential Complaints & Disputes desk.
      </div>
    </div>
  );
};
