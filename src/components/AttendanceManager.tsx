import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  UserCheck, 
  Lock, 
  Calendar,
  X,
  Maximize2,
  Printer
} from 'lucide-react';
import { 
  Chorister, 
  RehearsalSession, 
  AttendanceRecord, 
  AttendanceClassification 
} from '../types';
import { evaluatePunctuality } from '../data/testScenarios';
import { getActiveSession, getNextScheduledSession } from '../utils/sessionLifecycle';

interface AttendanceManagerProps {
  sessions: RehearsalSession[];
  members: Chorister[];
  attendanceRecords: AttendanceRecord[];
  onRecordAttendance: (record: AttendanceRecord) => void;
  onFinaliseSession: (sessionId: string) => void;
  onCorrectAttendance: (attendanceId: string, newTime: string, reason: string) => void;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  sessions,
  members,
  attendanceRecords,
  onRecordAttendance,
  onFinaliseSession,
  onCorrectAttendance,
}) => {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    return getActiveSession(sessions)?.sessionId || getNextScheduledSession(sessions)?.sessionId || sessions[0]?.sessionId || '';
  });

  // Keep selectedSessionId synced when sessions list reconciles
  useEffect(() => {
    if (!selectedSessionId || !sessions.some(s => s.sessionId === selectedSessionId)) {
      const target = getActiveSession(sessions)?.sessionId || getNextScheduledSession(sessions)?.sessionId || sessions[0]?.sessionId || '';
      if (target) setSelectedSessionId(target);
    }
  }, [sessions, selectedSessionId]);

  // Manual Check-in Form State
  const [searchChorister, setSearchChorister] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [observedTime, setObservedTime] = useState('07:15');
  const [manualNotes, setManualNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [entryError, setEntryError] = useState('');
  const [showDoorQRModal, setShowDoorQRModal] = useState(false);

  // Active Session
  const activeSession = sessions.find(s => s.sessionId === selectedSessionId) || sessions[0];
  const sessionRecords = attendanceRecords.filter(a => a.sessionId === selectedSessionId);

  const isMemberCheckedIn = (mId: string) => sessionRecords.some(r => r.memberId === mId);

  const currentPunctuality = evaluatePunctuality(
    activeSession?.requiredArrivalTime || '07:30',
    observedTime,
    activeSession?.gracePeriodMinutes || 5
  );

  const filteredChoristers = members.filter(m => 
    m.membershipStatus !== 'Archived' && m.membershipStatus !== 'Inactive' &&
    (m.fullName.toLowerCase().includes(searchChorister.toLowerCase()) ||
     m.memberId.toLowerCase().includes(searchChorister.toLowerCase()))
  );

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError('');
    if (!selectedMemberId) return;

    const member = members.find(m => m.memberId === selectedMemberId);
    if (!member) return;

    if (member.membershipStatus === 'Archived' || member.membershipStatus === 'Inactive') {
      setEntryError(`Cannot record check-in: Member ${member.fullName} (${member.memberId}) is currently ${member.membershipStatus.toLowerCase()}.`);
      return;
    }

    if (isMemberCheckedIn(selectedMemberId)) {
      setEntryError(`Member ${selectedMemberId} is already recorded for this rehearsal.`);
      return;
    }

    let classification: AttendanceClassification = currentPunctuality.classification;
    if (classification === 'Late' && member.attendanceArrangement.includes('Music Instruction')) {
      classification = 'Present'; // Accommodated
    }

    const now = new Date();
    const entryTimestamp = now.toISOString().replace('T', ' ').substring(0, 19);
    const newRecordId = `ATT-${Date.now()}`;

    const newRecord: AttendanceRecord = {
      attendanceId: newRecordId,
      sessionId: activeSession.sessionId,
      memberId: member.memberId,
      memberName: member.fullName,
      voicePart: member.voicePart,
      actualArrivalTime: observedTime,
      entryTimestamp,
      entryMethod: 'Manual_Provost',
      recordedBy: 'Provost Desk',
      classification,
      isVerified: true,
      notes: manualNotes || 'Observed at entrance',
    };

    onRecordAttendance(newRecord);
    setSuccessMessage(`${member.fullName} marked as ${classification} (${observedTime}).`);
    setSelectedMemberId('');
    setManualNotes('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Session Header Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              Provost Attendance Operations Desk
            </h2>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded ${
              activeSession.sessionStatus === 'In Progress' 
                ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 animate-pulse' 
                : activeSession.sessionStatus === 'Finalised' || activeSession.sessionStatus === 'Completed'
                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {activeSession.sessionStatus}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeSession.activityType} ({activeSession.date}) | Call: <strong className="font-mono text-slate-900">{activeSession.requiredArrivalTime}</strong> | Grace Cutoff: <strong className="font-mono text-slate-900">{currentPunctuality.cutoffStr}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Target session dropdown */}
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 font-medium text-slate-800"
          >
            {sessions.map(s => (
              <option key={s.sessionId} value={s.sessionId}>
                {s.date} - {s.activityType} ({s.sessionStatus})
              </option>
            ))}
          </select>

          {/* Door QR Display Button (Confidential to Provost) */}
          <button
            onClick={() => setShowDoorQRModal(true)}
            className="bg-amber-100 hover:bg-amber-200 text-slate-900 border border-amber-300 text-xs font-bold px-3 py-2 rounded-lg transition flex items-center gap-1.5"
            title="Display Door QR Code at Church Entrance"
          >
            <QrCode className="w-4 h-4 text-slate-900" />
            Display Door Placard
          </button>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Fast Manual Entry */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Fast Manual Check-in
            </h3>
          </div>

          {successMessage && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 text-slate-900 rounded-lg text-xs font-medium">
              ✓ {successMessage}
            </div>
          )}

          {entryError && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-900 rounded-lg text-xs font-medium">
              ⚠️ {entryError}
            </div>
          )}

          <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Search Chorister</label>
              <input
                type="text"
                placeholder="Filter by name..."
                value={searchChorister}
                onChange={(e) => setSearchChorister(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs mb-1.5 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />

              <select
                required
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="">-- Select Arriving Chorister --</option>
                {filteredChoristers.map((m, idx) => {
                  const done = isMemberCheckedIn(m.memberId);
                  return (
                    <option key={`${m.memberId}-${idx}`} value={m.memberId} disabled={done}>
                      {m.fullName} ({m.voicePart}) {done ? '✓ Logged' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Observed Physical Arrival Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  required
                  value={observedTime}
                  onChange={(e) => setObservedTime(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setObservedTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
                  }}
                  className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-[11px]"
                >
                  Set Now
                </button>
              </div>
            </div>

            {/* Punctuality Indicator */}
            <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
              currentPunctuality.classification === 'Present'
                ? 'bg-slate-50 border-slate-200 text-slate-800'
                : 'bg-amber-50 border-amber-200 text-amber-900 font-semibold'
            }`}>
              <span>Punctuality:</span>
              <span className="font-bold">{currentPunctuality.classification}</span>
            </div>

            <button
              type="submit"
              disabled={!selectedMemberId || activeSession.sessionStatus === 'Finalised'}
              className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-lg transition"
            >
              Save Manual Attendance
            </button>
          </form>
        </div>

        {/* Right Column: Attendance Roster for this Session */}
        <div className="bg-white rounded-xl border border-slate-200 lg:col-span-2 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Logged Check-ins ({sessionRecords.length} / {members.length})
              </h3>
              <p className="text-[11px] text-slate-500">Live rehearsal attendance log</p>
            </div>

            {activeSession.sessionStatus !== 'Finalised' ? (
              <button
                onClick={() => onFinaliseSession(activeSession.sessionId)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" /> Finalise & Assess Fines
              </button>
            ) : (
              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-semibold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Finalised & Closed
              </span>
            )}
          </div>

          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Chorister</th>
                  <th className="py-2 px-3">Voice</th>
                  <th className="py-2 px-3">Arrival Time</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Fine (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessionRecords.map(r => (
                  <tr key={r.attendanceId} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium text-slate-900">{r.memberName}</td>
                    <td className="py-2 px-3 text-slate-600">{r.voicePart}</td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-800">{r.actualArrivalTime}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">{r.entryMethod}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        r.classification === 'Present'
                          ? 'bg-amber-100 text-slate-900'
                          : r.classification === 'Late'
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : r.classification === 'Excused'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-red-50 text-red-800'
                      }`}>
                        {r.classification}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                      {r.fineAssessed ? `₦${r.fineAssessed}` : '₦0'}
                    </td>
                  </tr>
                ))}
                {sessionRecords.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No check-ins recorded yet for this session.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CONFIDENTIAL DOOR QR PLACARD MODAL (Provost Display at Church Entrance) */}
      {showDoorQRModal && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                ENTRANCE PLACARD
              </span>
              <button
                onClick={() => setShowDoorQRModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{activeSession.activityType}</h3>
              <p className="text-xs text-slate-500">
                Required Call Time: <strong className="font-mono text-slate-900">{activeSession.requiredArrivalTime}</strong>
              </p>
            </div>

            {/* QR Visual */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 inline-block">
              <div className="w-44 h-44 bg-white border border-slate-300 rounded-lg p-2 flex flex-col items-center justify-center mx-auto">
                <QrCode className="w-32 h-32 text-slate-900" />
                <span className="text-[10px] text-slate-400 font-mono mt-1">St. Cecilia Choir</span>
              </div>
            </div>

            {/* Door Code Banner */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest block font-bold">
                Today's Door Access Code
              </span>
              <span className="text-2xl font-mono font-bold tracking-widest text-slate-900 block mt-0.5">
                {activeSession.accessCode}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-tight">
              Display this on a tablet/screen at the church entrance or print it on paper. Choristers at church scan this QR code or enter the door code to confirm presence.
            </p>

            <button
              onClick={() => window.print()}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print Door Placard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
