import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit3, 
  QrCode, 
  Check, 
  X,
  History,
  ChevronRight,
  Printer
} from 'lucide-react';
import { RehearsalSession, ScheduleChangeAudit } from '../types';

interface ScheduleManagerProps {
  sessions: RehearsalSession[];
  scheduleAudits: ScheduleChangeAudit[];
  onUpdateSessionTime: (
    sessionId: string,
    newTime: string,
    reason: string,
    officer: string
  ) => void;
  onCreateSession: (session: RehearsalSession) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  sessions,
  scheduleAudits,
  onUpdateSessionTime,
  onCreateSession,
}) => {
  const [selectedSessionForEdit, setSelectedSessionForEdit] = useState<RehearsalSession | null>(null);
  const [selectedSessionForQR, setSelectedSessionForQR] = useState<RehearsalSession | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Edit call time state
  const [newRequiredTime, setNewRequiredTime] = useState('');
  const [changeReason, setChangeReason] = useState('');

  // New session form state
  const [newType, setNewType] = useState<any>('Friday Rehearsal');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCallTime, setNewCallTime] = useState('18:30');
  const [newAccessCode, setNewAccessCode] = useState(`SEC-${Math.floor(100 + Math.random() * 900)}`);

  const handleOpenEdit = (sess: RehearsalSession) => {
    setSelectedSessionForEdit(sess);
    setNewRequiredTime(sess.requiredArrivalTime);
    setChangeReason('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForEdit || !changeReason.trim()) return;
    onUpdateSessionTime(
      selectedSessionForEdit.sessionId,
      newRequiredTime,
      changeReason,
      'Provost Desk'
    );
    setSelectedSessionForEdit(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sessionId = `SESS-${newDate}-${Math.floor(100 + Math.random() * 900)}`;
    const newSession: RehearsalSession = {
      sessionId,
      activityType: newType,
      date: newDate,
      defaultRequiredArrivalTime: newCallTime,
      requiredArrivalTime: newCallTime,
      actualStartTime: newCallTime,
      attendanceOpeningTime: newCallTime,
      attendanceClosingTime: newCallTime,
      gracePeriodMinutes: 5,
      isCompulsory: true,
      penaltiesApply: true,
      approvingOfficer: 'Provost',
      scheduleAnnouncementTimestamp: new Date().toISOString(),
      sessionStatus: 'Scheduled',
      accessCode: newAccessCode.toUpperCase(),
      latePenaltyAmount: 200,
      absencePenaltyAmount: 500,
    };
    onCreateSession(newSession);
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Rehearsal Timetable & Schedule Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create rehearsals, adjust call times for special church programmes (Mass delays, sanitation, feast robes), and audit schedule revisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAuditModal(true)}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1"
          >
            <History className="w-3.5 h-3.5 text-slate-500" /> Audit Log ({scheduleAudits.length})
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Schedule Rehearsal
          </button>
        </div>
      </div>

      {/* Standing Timetable Reference (Quiet pale yellow box) */}
      <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-xs">
        <span className="font-bold text-slate-900 block mb-1">Standard Default Timetable:</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700">
          <div>Friday: <strong className="font-mono text-slate-900">6:30 PM</strong></div>
          <div>Saturday: <strong className="font-mono text-slate-900">8:30 AM</strong></div>
          <div>Sunday Pre-Mass: <strong className="font-mono text-slate-900">7:30 AM</strong></div>
          <div>Sunday Post-Mass: <strong className="font-mono text-slate-900">11:30 AM</strong></div>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Rehearsals Currently Scheduled</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The rehearsal timetable is currently clear. Click below to schedule a parish rehearsal or Sunday Mass call time.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
          >
            + Schedule First Rehearsal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const isOverridden = s.requiredArrivalTime !== s.defaultRequiredArrivalTime;

            return (
              <div 
                key={s.sessionId}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 hover:border-slate-300 transition"
              >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{s.activityType}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                    s.sessionStatus === 'In Progress'
                      ? 'bg-amber-100 text-slate-900 border border-amber-200'
                      : s.sessionStatus === 'Finalised'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    {s.sessionStatus}
                  </span>
                </div>

                <div className="text-xs text-slate-600 mt-1">
                  Date: <span className="font-mono font-medium text-slate-900">{s.date}</span> | Required Call: <strong className="font-mono text-slate-900">{s.requiredArrivalTime}</strong>
                  {isOverridden && (
                    <span className="ml-1.5 text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      Modified (Default: {s.defaultRequiredArrivalTime})
                    </span>
                  )}
                </div>

                {s.specialCircumstances && (
                  <p className="text-[11px] text-slate-500 italic mt-0.5">
                    Reason: {s.specialCircumstances}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedSessionForQR(s)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                  title="Display Door QR Code at Church"
                >
                  <QrCode className="w-3.5 h-3.5" /> Door Code
                </button>

                {s.sessionStatus !== 'Finalised' && (
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Adjust Time
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Adjust Rehearsal Time Modal */}
      {selectedSessionForEdit && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Adjust Call Time ({selectedSessionForEdit.activityType})
              </h3>
              <button onClick={() => setSelectedSessionForEdit(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Required Arrival Time</label>
                <input
                  type="time"
                  required
                  value={newRequiredTime}
                  onChange={(e) => setNewRequiredTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Adjustment (Mandatory Audit)
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Parish evening Mass concluded late; state sanitation delay; robe fitting..."
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSessionForEdit(null)}
                  className="px-3 py-1.5 border rounded-lg text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold"
                >
                  Save Call-Time Modification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule New Rehearsal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Schedule New Rehearsal
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Activity Type</label>
                <select
                  value={newType}
                  onChange={(e) => {
                    setNewType(e.target.value);
                    if (e.target.value === 'Friday Rehearsal') setNewCallTime('18:30');
                    else if (e.target.value === 'Saturday Rehearsal') setNewCallTime('08:30');
                    else if (e.target.value === 'Sunday Pre-Mass') setNewCallTime('07:30');
                    else if (e.target.value === 'Sunday Post-Mass') setNewCallTime('11:30');
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                >
                  <option value="Friday Rehearsal">Friday Rehearsal</option>
                  <option value="Saturday Rehearsal">Saturday Rehearsal</option>
                  <option value="Sunday Pre-Mass">Sunday Pre-Mass Gathering</option>
                  <option value="Sunday Post-Mass">Sunday Post-Mass Rehearsal</option>
                  <option value="Special Programme">Special Feast Programme</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Required Call Time</label>
                  <input
                    type="time"
                    required
                    value={newCallTime}
                    onChange={(e) => setNewCallTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Door Access Code</label>
                <input
                  type="text"
                  required
                  value={newAccessCode}
                  onChange={(e) => setNewAccessCode(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono uppercase tracking-wider font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border rounded-lg text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold"
                >
                  Add Rehearsal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confidential Door QR Placard Display Modal */}
      {selectedSessionForQR && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-start">
              <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                PROVOST DOOR DISPLAY
              </span>
              <button onClick={() => setSelectedSessionForQR(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{selectedSessionForQR.activityType}</h3>
              <p className="text-xs text-slate-500 font-mono">{selectedSessionForQR.date}</p>
            </div>

            <div className="w-40 h-40 bg-slate-50 border border-slate-300 rounded-xl p-2 mx-auto flex flex-col items-center justify-center">
              <QrCode className="w-28 h-28 text-slate-900" />
              <span className="text-[10px] text-slate-500 font-mono mt-1">St. Cecilia Choir</span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[10px] text-slate-600 uppercase tracking-widest block font-bold">
                Session Door Code
              </span>
              <span className="text-2xl font-mono font-bold tracking-widest text-slate-900">
                {selectedSessionForQR.accessCode}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-tight">
              Keep this display at the church door for arriving members.
            </p>

            <button
              onClick={() => window.print()}
              className="w-full bg-slate-900 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print Door Placard
            </button>
          </div>
        </div>
      )}

      {/* Schedule Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Schedule Change Audit Log (Sheet 20)
              </h3>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {scheduleAudits.map(a => (
                <div key={a.auditId} className="py-2.5 space-y-1">
                  <div className="flex justify-between text-slate-500 font-mono text-[11px]">
                    <span className="font-bold text-slate-800">{a.sessionId}</span>
                    <span>{a.timestamp}</span>
                  </div>
                  <div>
                    Changed from <strong className="font-mono text-slate-700">{a.oldTime}</strong> to <strong className="font-mono text-slate-900">{a.newTime}</strong>
                  </div>
                  <div className="text-[11px] text-slate-600 italic">
                    Reason: "{a.reason}"
                  </div>
                </div>
              ))}
              {scheduleAudits.length === 0 && (
                <p className="text-center py-4 text-slate-400">No schedule changes recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
