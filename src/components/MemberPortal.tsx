import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Eye, 
  FileText, 
  Calendar, 
  Search, 
  Send, 
  AlertCircle, 
  Lock,
  ChevronDown,
  ChevronUp,
  Camera,
  X,
  QrCode,
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Chorister, 
  RehearsalSession, 
  AttendanceRecord, 
  AbsenceNotification, 
  ComplaintRecord,
  ComplaintCategory,
  SystemSettings
} from '../types';
import { evaluatePunctuality } from '../data/testScenarios';
import { ChoirHeroBanner } from './ChoirHeroBanner';

interface MemberPortalProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  members: Chorister[];
  sessions: RehearsalSession[];
  attendanceRecords: AttendanceRecord[];
  onRecordAttendance: (record: AttendanceRecord) => void;
  onSubmitAbsence: (absence: AbsenceNotification) => void;
  onSubmitComplaint: (complaint: ComplaintRecord) => void;
  settings?: SystemSettings;
}

export const MemberPortal: React.FC<MemberPortalProps> = ({
  activeTab,
  setActiveTab,
  members,
  sessions,
  attendanceRecords,
  onRecordAttendance,
  onSubmitAbsence,
  onSubmitComplaint,
  settings,
}) => {
  // Check-in state
  const activeSession = sessions.find(s => s.sessionStatus === 'In Progress') || sessions[0];
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [checkinMessage, setCheckinMessage] = useState<{ success: boolean; text: string } | null>(null);

  // QR Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Register filter state
  const [searchMember, setSearchMember] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(sessions[0]?.sessionId || null);

  // Excuse Form State
  const [excuseMemberId, setExcuseMemberId] = useState('');
  const [excuseSessionId, setExcuseSessionId] = useState(activeSession?.sessionId || '');
  const [excuseReason, setExcuseReason] = useState('');
  const [excuseDetails, setExcuseDetails] = useState('');
  const [excuseSuccess, setExcuseSuccess] = useState(false);

  // Dispute Form State
  const [disputeMemberId, setDisputeMemberId] = useState('');
  const [disputeCategory, setDisputeCategory] = useState<ComplaintCategory>('Incorrect Attendance');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  // Manage Camera QR Scanner
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (isScanning) {
      setCameraError('');
      // Small delay to ensure container element is mounted in DOM
      const timer = setTimeout(() => {
        try {
          html5QrCode = new Html5Qrcode('qr-reader-target');
          scannerRef.current = html5QrCode;

          html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
            },
            (decodedText) => {
              // Extract door code if scanned as URL or direct code
              let code = decodedText.trim();
              if (code.includes('code=')) {
                const match = code.match(/[?&]code=([^&]+)/);
                if (match && match[1]) {
                  code = decodeURIComponent(match[1]);
                }
              }
              setAccessCodeInput(code);
              setScanSuccess(true);
              setIsScanning(false);
              setTimeout(() => setScanSuccess(false), 3000);

              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(() => {});
              }
            },
            () => {
              // Scanning frames...
            }
          ).catch((err) => {
            console.warn('Camera failed to start', err);
            setCameraError('Camera access unavailable or permission denied. You can enter the code manually.');
            setIsScanning(false);
          });
        } catch (err) {
          console.error('QR scanner instantiation error', err);
          setCameraError('Could not initialize camera scanner.');
          setIsScanning(false);
        }
      }, 200);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current && scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
      };
    }
  }, [isScanning]);

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    setIsScanning(false);
  };

  // Check-in submit handler
  const handleCheckinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !accessCodeInput) return;

    if (!activeSession) {
      setCheckinMessage({ success: false, text: 'No active rehearsal session found.' });
      return;
    }

    if (activeSession.sessionStatus === 'Finalised') {
      setCheckinMessage({ success: false, text: 'Attendance for this rehearsal has been closed and finalised.' });
      return;
    }

    // Code verification
    if (accessCodeInput.trim().toUpperCase() !== activeSession.accessCode.trim().toUpperCase()) {
      setCheckinMessage({ 
        success: false, 
        text: 'Incorrect session access code. Please scan the QR code on the church door or check the entrance placard.' 
      });
      return;
    }

    // Duplicate check
    const existing = attendanceRecords.find(
      r => r.sessionId === activeSession.sessionId && r.memberId === selectedMemberId
    );
    if (existing) {
      setCheckinMessage({ 
        success: false, 
        text: `You have already checked in for this rehearsal at ${existing.actualArrivalTime}.` 
      });
      return;
    }

    const member = members.find(m => m.memberId === selectedMemberId);
    if (!member) return;

    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const punctuality = evaluatePunctuality(
      activeSession.requiredArrivalTime,
      currentTimeStr,
      activeSession.gracePeriodMinutes
    );

    const newRecordId = `ATT-${Date.now()}`;
    const newRecord: AttendanceRecord = {
      attendanceId: newRecordId,
      sessionId: activeSession.sessionId,
      memberId: member.memberId,
      memberName: member.fullName,
      voicePart: member.voicePart,
      actualArrivalTime: currentTimeStr,
      entryTimestamp: now.toISOString().replace('T', ' ').substring(0, 19),
      entryMethod: 'QR_Self',
      recordedBy: 'Chorister Door Scan',
      classification: punctuality.classification,
      isVerified: true,
      notes: 'Verified via entrance door check-in',
    };

    onRecordAttendance(newRecord);
    setCheckinMessage({
      success: true,
      text: `Welcome, ${member.fullName}! Your attendance was recorded as "${punctuality.classification}" at ${currentTimeStr}.`
    });
    setSelectedMemberId('');
    setAccessCodeInput('');
  };

  // Excuse submit handler
  const handleExcuseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excuseMemberId || !excuseReason) return;
    const member = members.find(m => m.memberId === excuseMemberId);
    if (!member) return;

    const newAbsence: AbsenceNotification = {
      notificationId: `ABS-${Date.now()}`,
      memberId: member.memberId,
      memberName: member.fullName,
      sessionId: excuseSessionId,
      rehearsalDate: activeSession?.date || new Date().toISOString().split('T')[0],
      reason: excuseReason,
      isAnticipated: true,
      supportingExplanation: excuseDetails,
      submissionTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'Pending Review',
    };

    onSubmitAbsence(newAbsence);
    setExcuseSuccess(true);
    setExcuseReason('');
    setExcuseDetails('');
    setTimeout(() => setExcuseSuccess(false), 3000);
  };

  // Dispute submit handler
  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeMemberId || !disputeDescription) return;
    const member = members.find(m => m.memberId === disputeMemberId);
    if (!member) return;

    const newComplaint: ComplaintRecord = {
      complaintId: `CMP-${Date.now()}`,
      memberId: member.memberId,
      memberName: member.fullName,
      complaintDate: new Date().toISOString().split('T')[0],
      category: disputeCategory,
      description: disputeDescription,
      assignedOfficer: 'Sir Anthony K. Nwosu (Choir Master)',
      status: 'New',
      isConfidential: true,
    };

    onSubmitComplaint(newComplaint);
    setDisputeSuccess(true);
    setDisputeDescription('');
    setTimeout(() => setDisputeSuccess(false), 3000);
  };

  return (
    <div className="w-full space-y-6 relative z-10">
      {/* Wide Horizontal Choir Hero Banner */}
      <ChoirHeroBanner
        settings={settings}
        totalMembers={members.length}
        activeSession={activeSession}
        mode="member"
      />

      {/* TAB 1: CHECK-IN */}
      {activeTab === 'member-checkin' && (
        <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-slate-200/90 p-6 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-4 text-center">
            <h2 className="text-base font-bold text-slate-900">
              Rehearsal Attendance Check-in
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {activeSession ? (
                <>
                  Active Session: <strong>{activeSession.activityType}</strong> ({activeSession.date}) | Call Time: <strong className="font-mono text-slate-800">{activeSession.requiredArrivalTime}</strong>
                </>
              ) : (
                'No session currently scheduled.'
              )}
            </p>
          </div>

          {checkinMessage && (
            <div className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              checkinMessage.success
                ? 'bg-amber-50 text-slate-900 border border-amber-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {checkinMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
              <span>{checkinMessage.text}</span>
            </div>
          )}

          {scanSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Door QR Code scanned successfully! Access code filled.</span>
            </div>
          )}

          {cameraError && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-slate-800 rounded-lg text-xs">
              {cameraError}
            </div>
          )}

          {/* Interactive Door QR Scanner Modal / View */}
          {isScanning && (
            <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5 text-amber-200">
                  <Camera className="w-4 h-4" /> Point camera at door placard QR code
                </span>
                <button
                  type="button"
                  onClick={stopScanner}
                  className="text-slate-400 hover:text-white text-xs bg-slate-800 px-2 py-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div id="qr-reader-target" className="overflow-hidden rounded-lg bg-black mx-auto max-w-sm aspect-square" />

              <p className="text-[11px] text-slate-400 text-center">
                Hold your camera steady in front of the rehearsal door placard.
              </p>
            </div>
          )}

          <form onSubmit={handleCheckinSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Your Name
              </label>
              <select
                required
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="">-- Choose your name from roster --</option>
                {members.map(m => (
                  <option key={m.memberId} value={m.memberId}>
                    {m.fullName} ({m.voicePart})
                  </option>
                ))}
              </select>

              {/* Selected Chorister Card Preview with Profile Photo */}
              {selectedMemberId && (() => {
                const sel = members.find(m => m.memberId === selectedMemberId);
                if (!sel) return null;
                return (
                  <div className="mt-2.5 flex items-center gap-3 p-2.5 bg-amber-50/70 border border-amber-200/90 rounded-lg">
                    {sel.profilePhotoUrl ? (
                      <img
                        src={sel.profilePhotoUrl}
                        alt={sel.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-amber-300 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-200 font-bold text-xs flex items-center justify-center shrink-0">
                        {sel.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                    )}
                    <div className="text-xs">
                      <span className="font-bold text-slate-900">{sel.fullName}</span>
                      <div className="text-[11px] text-slate-600 flex items-center gap-2">
                        <span>Section: <strong>{sel.voicePart}</strong></span>
                        <span>·</span>
                        <span>ID: <strong className="font-mono">{sel.memberId}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">
                  Rehearsal Entrance Access Code
                </label>
                {!isScanning && (
                  <button
                    type="button"
                    onClick={() => setIsScanning(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1 rounded-md transition"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-900" />
                    Scan Door QR with Camera
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Scan door QR or enter code"
                  value={accessCodeInput}
                  onChange={(e) => setAccessCodeInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono tracking-widest text-slate-900 uppercase bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-slate-400" />
                Tap <strong>"Scan Door QR with Camera"</strong> at church entrance, or enter the code from the door placard.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600 text-[11px]">
              <strong>Punctuality Rule:</strong> Your arrival time is verified and stamped automatically upon submission.
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg transition text-xs shadow-xs"
            >
              Confirm My Attendance
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: PUBLIC ATTENDANCE REGISTER */}
      {activeTab === 'member-register' && (
        <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-slate-200/90 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Public Attendance Register
              </h2>
              <p className="text-xs text-slate-500">
                Official finalised attendance register. Personal finances and private debts are strictly confidential and not published.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search your name..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Session Cards with Progressive Disclosure */}
          <div className="space-y-3">
            {sessions.map(s => {
              const sessionRecords = attendanceRecords.filter(r => r.sessionId === s.sessionId);
              const filtered = sessionRecords.filter(r => 
                r.memberName.toLowerCase().includes(searchMember.toLowerCase()) ||
                r.voicePart.toLowerCase().includes(searchMember.toLowerCase())
              );
              const isExpanded = expandedSessionId === s.sessionId;

              return (
                <div key={s.sessionId} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  {/* Clickable Header for Progressive Disclosure */}
                  <button
                    onClick={() => setExpandedSessionId(isExpanded ? null : s.sessionId)}
                    className="w-full p-3.5 bg-slate-50/70 hover:bg-slate-100/70 text-left flex items-center justify-between transition text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{s.activityType}</span>
                        <span className="font-mono text-slate-500 font-normal">({s.date})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Required Call: <strong className="font-mono text-slate-800">{s.requiredArrivalTime}</strong> | Status: <span className="font-medium">{s.sessionStatus}</span> | Entries: {sessionRecords.length}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">
                        {isExpanded ? 'Hide Details' : 'View Attendance'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                    </div>
                  </button>

                  {/* Expanded Attendance List */}
                  {isExpanded && (
                    <div className="p-3 border-t border-slate-200 bg-white overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Chorister</th>
                            <th className="py-2 px-3">Voice Section</th>
                            <th className="py-2 px-3">Arrival Time</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.map(r => (
                            <tr key={r.attendanceId} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-medium text-slate-900">{r.memberName}</td>
                              <td className="py-2 px-3 text-slate-600">{r.voicePart}</td>
                              <td className="py-2 px-3 font-mono text-slate-800">{r.actualArrivalTime}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                  r.classification === 'Present'
                                    ? 'bg-amber-100 text-slate-900'
                                    : r.classification === 'Late'
                                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                    : r.classification === 'Excused'
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-red-50 text-red-800 border border-red-200'
                                }`}>
                                  {r.classification}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {filtered.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-slate-400 text-xs">
                                No records found matching search.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SUBMIT EXCUSE OR DISPUTE */}
      {activeTab === 'member-excuse' && (
        <div className="space-y-6">
          {/* Absence Notification Form */}
          <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Submit Rehearsal Absence Notification
              </h2>
              <p className="text-xs text-slate-500">
                Notify the Provost and Choir Master of unavoidable absence (bereavement, travel, official duty). Submissions are reviewed for formal excuse.
              </p>
            </div>

            {excuseSuccess && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-900" />
                Absence notice submitted for executive review.
              </div>
            )}

            <form onSubmit={handleExcuseSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Your Name</label>
                  <select
                    required
                    value={excuseMemberId}
                    onChange={(e) => setExcuseMemberId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">-- Choose your name --</option>
                    {members.map(m => (
                      <option key={m.memberId} value={m.memberId}>
                        {m.fullName} ({m.voicePart})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Rehearsal</label>
                  <select
                    value={excuseSessionId}
                    onChange={(e) => setExcuseSessionId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    {sessions.map(s => (
                      <option key={s.sessionId} value={s.sessionId}>
                        {s.activityType} ({s.date})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Absence</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Family bereavement, academic exam, official work duty"
                  value={excuseReason}
                  onChange={(e) => setExcuseReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supporting Explanation</label>
                <textarea
                  rows={2}
                  placeholder="Brief explanation for leadership review..."
                  value={excuseDetails}
                  onChange={(e) => setExcuseDetails(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
                >
                  Submit Notice
                </button>
              </div>
            </form>
          </div>

          {/* Confidential Dispute / Challenge Form */}
          <div className="bg-white/95 backdrop-blur-xs rounded-xl border border-slate-200/90 p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Confidential Inquiry or Dispute
              </h2>
              <p className="text-xs text-slate-500">
                Question an attendance timestamp, penalty, or administrative concern. Disputes are routed directly to the Choir Master for independent review.
              </p>
            </div>

            {disputeSuccess && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-slate-900" />
                Confidential dispute submitted to the Choir Master.
              </div>
            )}

            <form onSubmit={handleDisputeSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Your Name</label>
                  <select
                    required
                    value={disputeMemberId}
                    onChange={(e) => setDisputeMemberId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="">-- Choose your name --</option>
                    {members.map(m => (
                      <option key={m.memberId} value={m.memberId}>
                        {m.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Issue Category</label>
                  <select
                    value={disputeCategory}
                    onChange={(e) => setDisputeCategory(e.target.value as ComplaintCategory)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="Incorrect Attendance">Incorrect Attendance Entry</option>
                    <option value="Incorrect Fine">Incorrect Penalty Calculation</option>
                    <option value="Payment Record Dispute">Payment Receipt Issue</option>
                    <option value="Accommodation Decision">Accommodation Decision</option>
                    <option value="Administrative Conduct">Administrative Conduct</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain the circumstance clearly..."
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
                >
                  Send Confidential Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};
