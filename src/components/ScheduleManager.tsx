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
  Printer,
  Share2,
  Copy,
  MessageSquare,
  AlertTriangle,
  Send,
  Eye,
  CheckCircle2,
  MapPin
} from 'lucide-react';
import { RehearsalSession, ScheduleChangeAudit } from '../types';

interface ScheduleManagerProps {
  sessions: RehearsalSession[];
  scheduleAudits: ScheduleChangeAudit[];
  onUpdateSessionTime: (
    sessionId: string,
    newTime: string,
    reason: string,
    officer: string,
    newStatus?: 'Published' | 'Updated'
  ) => void;
  onCreateSession: (session: RehearsalSession) => void;
  onDeleteSession?: (sessionId: string) => void;
}

export const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  sessions,
  scheduleAudits,
  onUpdateSessionTime,
  onCreateSession,
  onDeleteSession,
}) => {
  const [selectedSessionForEdit, setSelectedSessionForEdit] = useState<RehearsalSession | null>(null);
  const [selectedSessionForQR, setSelectedSessionForQR] = useState<RehearsalSession | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedSessionForAnnouncement, setSelectedSessionForAnnouncement] = useState<RehearsalSession | null>(null);

  // Edit call time state
  const [newRequiredTime, setNewRequiredTime] = useState('');
  const [newVenue, setNewVenue] = useState('Parish Choir Gallery / Hall');
  const [changeReason, setChangeReason] = useState('');
  const [specialNotice, setSpecialNotice] = useState('');

  // New session form state
  const [newType, setNewType] = useState<any>('Friday Rehearsal');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCallTime, setNewCallTime] = useState('18:30');
  const [newVenueInput, setNewVenueInput] = useState('Parish Choir Gallery');
  const [newAccessCode, setNewAccessCode] = useState(`SEC-${Math.floor(100 + Math.random() * 900)}`);
  const [newIsCompulsory, setNewIsCompulsory] = useState(true);
  const [newSpecialNotice, setNewSpecialNotice] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(true);

  // Announcement copy notification state
  const [copiedAnnouncement, setCopiedAnnouncement] = useState(false);

  const handleOpenEdit = (sess: RehearsalSession) => {
    setSelectedSessionForEdit(sess);
    setNewRequiredTime(sess.requiredArrivalTime);
    setNewVenue(sess.venue || 'Parish Choir Gallery');
    setChangeReason(sess.revisionReason || '');
    setSpecialNotice(sess.specialNotice || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForEdit) return;
    if (selectedSessionForEdit.sessionStatus !== 'Draft' && !changeReason.trim()) {
      alert('A specific reason for the schedule revision is required for parish auditing.');
      return;
    }

    onUpdateSessionTime(
      selectedSessionForEdit.sessionId,
      newRequiredTime,
      changeReason,
      'Provost Desk',
      'Updated'
    );
    setSelectedSessionForEdit(null);
  };

  const handleCreateSubmit = (asDraft: boolean) => {
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
      isCompulsory: newIsCompulsory,
      penaltiesApply: newIsCompulsory,
      approvingOfficer: 'Provost',
      scheduleAnnouncementTimestamp: new Date().toISOString(),
      sessionStatus: asDraft ? 'Draft' : 'Published',
      accessCode: newAccessCode.toUpperCase(),
      latePenaltyAmount: 200,
      absencePenaltyAmount: 500,
      venue: newVenueInput,
      specialNotice: newSpecialNotice.trim() || undefined,
      publishedAt: asDraft ? undefined : new Date().toISOString(),
      publishedBy: asDraft ? undefined : 'Provost & Choir Master',
    };
    onCreateSession(newSession);
    setShowCreateModal(false);
  };

  // Generate WhatsApp Announcement Format
  const generateAnnouncementText = (sess: RehearsalSession) => {
    const isUpdated = sess.sessionStatus === 'Updated';
    const lines = [
      `🎵 *OUR MOTHER OF PERPETUAL HELP (OMPH) CATHOLIC PARISH CHOIR* 🎵`,
      `*ST. CECILIA CHORAL MINISTRY, ILORIN*`,
      ``,
      isUpdated ? `⚠️ *NOTICE OF REVISED REHEARSAL SCHEDULE* ⚠️` : `📢 *OFFICIAL REHEARSAL ANNOUNCEMENT* 📢`,
      ``,
      `*Activity:* ${sess.activityType}`,
      `*Date:* ${sess.date}`,
      `*Call Time / Required Arrival:* ${sess.requiredArrivalTime}`,
      `*Venue:* ${sess.venue || 'Parish Choir Gallery / Hall'}`,
      `*Status:* ${sess.isCompulsory ? 'Compulsory for All Choristers' : 'Optional / Sectional'}`,
      ``,
    ];

    if (sess.revisionReason) {
      lines.push(`*Reason for Adjustment:* ${sess.revisionReason}`);
      lines.push(``);
    }

    if (sess.specialNotice) {
      lines.push(`*Special Instructions:* ${sess.specialNotice}`);
      lines.push(``);
    }

    lines.push(`*Punctuality Notice:*`);
    lines.push(`• Arrival after ${sess.requiredArrivalTime} attracts standard late fine (₦${sess.latePenaltyAmount}).`);
    lines.push(`• Door QR code check-in closes promptly at call time + 45 mins.`);
    lines.push(`• If unable to attend, submit your written excuse on the chorister portal before rehearsal starts.`);
    lines.push(``);
    lines.push(`_“Cantare Amantis Est — To Sing is the Mark of Love”_`);
    lines.push(`— Office of the Provost & Choir Master`);

    return lines.join('\n');
  };

  const handleCopyAnnouncement = (sess: RehearsalSession) => {
    const text = generateAnnouncementText(sess);
    navigator.clipboard.writeText(text);
    setCopiedAnnouncement(true);
    setTimeout(() => setCopiedAnnouncement(false), 3000);
  };

  const handleShareWhatsApp = (sess: RehearsalSession) => {
    const text = generateAnnouncementText(sess);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Rehearsal Timetable & Announcement System
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAuditModal(true)}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
          >
            <History className="w-3.5 h-3.5 text-slate-500" /> Audit Log ({scheduleAudits.length})
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" /> Schedule Rehearsal
          </button>
        </div>
      </div>

      {/* Copy Alert Toast */}
      {copiedAnnouncement && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Parish Rehearsal Announcement copied to clipboard! Ready to paste into WhatsApp groups or SMS.</span>
        </div>
      )}

      {/* Standing Timetable Reference (Quiet pale amber box) */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-900 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-800" /> Standing Parish Choir Timetable Reference
          </span>
          <span className="text-[11px] text-amber-900 font-medium">Standard Hours</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
          <div className="bg-white/80 p-2 rounded border border-amber-200/60">
            <span className="text-[11px] text-slate-500 block">Friday General</span>
            <strong className="font-mono text-slate-900 text-xs">6:30 PM (18:30)</strong>
          </div>
          <div className="bg-white/80 p-2 rounded border border-amber-200/60">
            <span className="text-[11px] text-slate-500 block">Saturday Sectionals</span>
            <strong className="font-mono text-slate-900 text-xs">8:30 AM (08:30)</strong>
          </div>
          <div className="bg-white/80 p-2 rounded border border-amber-200/60">
            <span className="text-[11px] text-slate-500 block">Sunday Pre-Mass</span>
            <strong className="font-mono text-slate-900 text-xs">7:30 AM (07:30)</strong>
          </div>
          <div className="bg-white/80 p-2 rounded border border-amber-200/60">
            <span className="text-[11px] text-slate-500 block">Sunday Post-Mass</span>
            <strong className="font-mono text-slate-900 text-xs">11:30 AM (11:30)</strong>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Rehearsals Currently Scheduled</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The rehearsal timetable is currently clear. Click "Schedule Rehearsal" above to schedule a practice or Sunday Mass call time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((sess) => {
            const isLive = sess.sessionStatus === 'In Progress';
            const isUpdated = sess.sessionStatus === 'Updated';
            const isDraft = sess.sessionStatus === 'Draft';
            const isCancelled = sess.sessionStatus === 'Cancelled';

            return (
              <div
                key={sess.sessionId}
                className={`bg-white rounded-xl border p-4 sm:p-5 transition shadow-2xs ${
                  isLive
                    ? 'border-emerald-400 bg-emerald-50/20'
                    : isUpdated
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {sess.activityType}
                      </span>

                      {/* Status Badges */}
                      {isDraft && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                          DRAFT
                        </span>
                      )}
                      {sess.sessionStatus === 'Published' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          PUBLISHED
                        </span>
                      )}
                      {isUpdated && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          REVISED / UPDATED
                        </span>
                      )}
                      {isLive && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 animate-pulse">
                          LIVE IN PROGRESS
                        </span>
                      )}
                      {sess.sessionStatus === 'Finalised' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          COMPLETED
                        </span>
                      )}
                      {isCancelled && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          CANCELLED
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-600">
                      <span>Date: <strong className="font-mono text-slate-800">{sess.date}</strong></span>
                      <span>·</span>
                      <span>Call Time: <strong className="font-mono text-slate-900 font-bold">{sess.requiredArrivalTime}</strong></span>
                      {sess.venue && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" /> {sess.venue}
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span>Door Code: <strong className="font-mono text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded font-bold">{sess.accessCode}</strong></span>
                    </div>

                    {/* Revision Reason banner if adjusted */}
                    {sess.revisionReason && (
                      <div className="mt-2 p-2 bg-amber-50/80 border border-amber-200 rounded text-xs text-amber-950 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">Revision Reason:</strong> {sess.revisionReason}
                        </div>
                      </div>
                    )}

                    {/* Special Notice if any */}
                    {sess.specialNotice && (
                      <div className="text-[11px] text-slate-600 italic">
                        Notice: {sess.specialNotice}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button
                      onClick={() => setSelectedSessionForAnnouncement(sess)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                      title="View & Share Announcement"
                    >
                      <Share2 className="w-3.5 h-3.5 text-slate-500" /> Share
                    </button>

                    <button
                      onClick={() => handleShareWhatsApp(sess)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 shadow-2xs"
                      title="Share directly to WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                    </button>

                    <button
                      onClick={() => setSelectedSessionForQR(sess)}
                      className="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5 text-slate-600" /> Placard QR
                    </button>

                    <button
                      onClick={() => handleOpenEdit(sess)}
                      className="text-xs bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium px-2.5 py-1.5 rounded-lg transition flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-600" /> Adjust Call Time
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ANNOUNCEMENT MODAL */}
      {selectedSessionForAnnouncement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Parish Rehearsal Announcement
                </h3>
              </div>
              <button
                onClick={() => setSelectedSessionForAnnouncement(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Formatted ready for parish choir WhatsApp groups, church bulletin, and SMS broadcast.
            </p>

            <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto border border-slate-800">
              {generateAnnouncementText(selectedSessionForAnnouncement)}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleCopyAnnouncement(selectedSessionForAnnouncement)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5 text-slate-600" /> Copy Text
              </button>

              <button
                onClick={() => handleShareWhatsApp(selectedSessionForAnnouncement)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5" /> Share to WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CALL TIME MODAL */}
      {selectedSessionForEdit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Adjust Rehearsal Call Time
                </h3>
                <span className="text-xs text-slate-500">
                  {selectedSessionForEdit.activityType} ({selectedSessionForEdit.date})
                </span>
              </div>
              <button
                onClick={() => setSelectedSessionForEdit(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Required Arrival Time (HH:mm)
                </label>
                <input
                  type="time"
                  required
                  value={newRequiredTime}
                  onChange={(e) => setNewRequiredTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rehearsal Venue
                </label>
                <input
                  type="text"
                  value={newVenue}
                  onChange={(e) => setNewVenue(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="e.g. Parish Choir Gallery / Parish Hall"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Adjustment <span className="text-red-500">* (Required)</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="e.g., Delay due to Benediction / Novena Mass; Rain delay; Bishop's visitation choir robe preparation."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedSessionForEdit(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs"
                >
                  Confirm & Update Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW REHEARSAL MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Schedule New Rehearsal or Mass
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Activity Type</label>
                <select
                  value={newType}
                  onChange={(e) => {
                    const t = e.target.value;
                    setNewType(t);
                    if (t.includes('Friday')) setNewCallTime('18:30');
                    else if (t.includes('Saturday')) setNewCallTime('08:30');
                    else if (t.includes('Pre-Mass')) setNewCallTime('07:30');
                    else if (t.includes('Post-Mass')) setNewCallTime('11:30');
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 bg-white"
                >
                  <option value="Friday Rehearsal">Friday Rehearsal (Standard General)</option>
                  <option value="Saturday Rehearsal">Saturday Rehearsal (Sectional)</option>
                  <option value="Sunday Pre-Mass">Sunday Pre-Mass (Vocal Warm-up)</option>
                  <option value="Sunday Post-Mass">Sunday Post-Mass (Practice)</option>
                  <option value="Special Programme">Special Programme (Feast / Vigil / Wedding)</option>
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
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Call Time</label>
                  <input
                    type="time"
                    required
                    value={newCallTime}
                    onChange={(e) => setNewCallTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Venue</label>
                <input
                  type="text"
                  value={newVenueInput}
                  onChange={(e) => setNewVenueInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                  placeholder="e.g. Parish Choir Gallery"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Door Access Code</label>
                  <input
                    type="text"
                    required
                    value={newAccessCode}
                    onChange={(e) => setNewAccessCode(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 font-mono font-bold"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsCompulsory}
                      onChange={(e) => setNewIsCompulsory(e.target.checked)}
                      className="rounded text-slate-900 focus:ring-slate-900 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700">Compulsory (Fines Apply)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Special Notice (Optional)</label>
                <input
                  type="text"
                  value={newSpecialNotice}
                  onChange={(e) => setNewSpecialNotice(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                  placeholder="e.g., Please bring your Gloria & Sanctus sol-fa scripts."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateSubmit(true)}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateSubmit(false)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-2xs"
                >
                  Publish Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLACARD QR CODE MODAL */}
      {selectedSessionForQR && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-700">Door Placard QR Code</span>
              <button
                onClick={() => setSelectedSessionForQR(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-900 uppercase block tracking-wider">
                Our Mother of Perpetual Help Catholic Parish
              </span>
              <span className="text-xs text-slate-600 font-medium block">
                {selectedSessionForQR.activityType} — {selectedSessionForQR.date}
              </span>
              <div className="py-2 flex justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    `OMPH_CHECKIN:${selectedSessionForQR.sessionId}:${selectedSessionForQR.accessCode}`
                  )}`}
                  alt="Door Check-in QR"
                  className="w-44 h-44 rounded border border-slate-300 p-1 bg-white shadow-2xs"
                />
              </div>
              <div className="text-xs font-mono font-bold text-slate-900 bg-amber-100/80 py-1 px-3 rounded">
                Code: {selectedSessionForQR.accessCode}
              </div>
              <p className="text-[11px] text-slate-500">
                Call time: <strong>{selectedSessionForQR.requiredArrivalTime}</strong>
              </p>
            </div>

            <div className="flex justify-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 hover:bg-slate-800"
              >
                <Printer className="w-3.5 h-3.5" /> Print Placard
              </button>
              <button
                onClick={() => setSelectedSessionForQR(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG MODAL */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Schedule Revision Audit Log
                </h3>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {scheduleAudits.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                No schedule modifications recorded yet. Call time changes will appear here.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                {scheduleAudits.map((a) => (
                  <div key={a.auditId} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span>Call Time Changed: <span className="font-mono text-red-600">{a.oldTime}</span> → <span className="font-mono text-emerald-600">{a.newTime}</span></span>
                      <span className="text-[10px] text-slate-400">{a.timestamp.replace('T', ' ').slice(0, 16)}</span>
                    </div>
                    <div className="text-slate-600">
                      <strong>Reason:</strong> {a.reason}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Authorized by: {a.modifiedBy}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-right pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
