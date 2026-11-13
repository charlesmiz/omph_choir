import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Eye, 
  Calendar, 
  AlertCircle, 
  Lock,
  ChevronDown,
  Camera,
  X,
  QrCode,
  Copy,
  DollarSign,
  Music,
  User,
  HeartHandshake,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Bell,
  Menu,
  Printer,
  Building2,
  LogOut
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Chorister, 
  RehearsalSession, 
  AttendanceRecord, 
  AbsenceNotification, 
  ComplaintRecord,
  ComplaintCategory,
  SystemSettings,
  FineRecord,
  PaymentRecord,
  AdjustmentRecord,
  ChoirSong,
  MonthlyDuesAssessment,
  ChoirAnnouncement
} from '../types';
import { evaluatePunctuality } from '../data/testScenarios';
import { getActiveSession, getNextScheduledSession } from '../utils/sessionLifecycle';
import { ChoirHeroBanner } from './ChoirHeroBanner';
import { MemberSidebar } from './MemberSidebar';
import { ChoristerAvatar } from './ChoristerAvatar';
import { MemberProfileView } from './MemberProfileView';
import { HelpToggle } from './HelpToggle';

interface MemberPortalProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  members: Chorister[];
  sessions: RehearsalSession[];
  activeSession?: RehearsalSession | null;
  nextSession?: RehearsalSession | null;
  attendanceRecords: AttendanceRecord[];
  fines?: FineRecord[];
  payments?: PaymentRecord[];
  adjustments?: AdjustmentRecord[];
  monthlyDues?: MonthlyDuesAssessment[];
  announcements?: ChoirAnnouncement[];
  songs?: ChoirSong[];
  onRecordAttendance: (record: AttendanceRecord) => void;
  onSubmitAbsence: (absence: AbsenceNotification) => void;
  onSubmitComplaint: (complaint: ComplaintRecord) => void;
  onSubmitPaymentTransfer?: (transfer: any) => Promise<any>;
  onChangePassword?: (currentPwd: string, newPwd: string) => Promise<any>;
  onMemberProfileUpdated?: (updated: Chorister) => void;
  settings: SystemSettings;
  currentMember?: Chorister | null;
  onLogout: () => void;
}

export const MemberPortal: React.FC<MemberPortalProps> = ({
  activeTab,
  setActiveTab,
  members,
  sessions,
  activeSession: propActiveSession,
  nextSession: propNextSession,
  attendanceRecords,
  fines = [],
  payments = [],
  adjustments = [],
  monthlyDues = [],
  announcements = [],
  songs = [],
  onRecordAttendance,
  onSubmitAbsence,
  onSubmitComplaint,
  onSubmitPaymentTransfer,
  onChangePassword,
  onMemberProfileUpdated,
  settings,
  currentMember,
  onLogout,
}) => {
  // Mobile drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // User Profile Dropdown state
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [localMember, setLocalMember] = useState<Chorister | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Sync or derive active chorister
  useEffect(() => {
    setLocalMember(currentMember || null);
  }, [currentMember]);

  const activeChorister = localMember || currentMember || null;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Safety net: normalize retired or legacy tab IDs
  useEffect(() => {
    if (!activeTab || activeTab === 'member-checkin' || activeTab === 'gallery' || activeTab === 'whatsapp-group') {
      setActiveTab('dashboard');
    } else if (activeTab === 'payment-details') {
      setActiveTab('finance');
    } else if (activeTab === 'security' || activeTab === 'password') {
      setActiveTab('profile');
    }
  }, [activeTab, setActiveTab]);

  // Authoritative session states: active (currently running) vs next (upcoming scheduled)
  const liveSession = propActiveSession !== undefined ? propActiveSession : getActiveSession(sessions);
  const nextUpcoming = propNextSession !== undefined ? propNextSession : getNextScheduledSession(sessions);
  const displaySession = liveSession || nextUpcoming;

  // 1. Check-in State
  const [selectedMemberId, setSelectedMemberId] = useState(activeChorister?.memberId || '');
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [checkinMessage, setCheckinMessage] = useState<{ success: boolean; text: string } | null>(null);

  // QR Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // 2. Excuse Form State
  const [excuseReason, setExcuseReason] = useState('');
  const [excuseDetails, setExcuseDetails] = useState('');
  const [excuseSuccess, setExcuseSuccess] = useState(false);

  // 3. Dispute Form State
  const [disputeCategory, setDisputeCategory] = useState<ComplaintCategory>('Incorrect Attendance');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  // 4. Bank Transfer Submission Form State
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferCategory, setTransferCategory] = useState<'Monthly Dues' | 'Late Arrival Fine' | 'Absence Fine'>('Monthly Dues');
  const [transferRef, setTransferRef] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Trigger to open Change Password modal inside My Profile when selected from top-right menu
  const [passwordModalTrigger, setPasswordModalTrigger] = useState(0);

  // Copy toast states
  const [copiedBankAcc, setCopiedBankAcc] = useState(false);
  const [copiedAnnouncementId, setCopiedAnnouncementId] = useState<string | null>(null);

  useEffect(() => {
    if (activeChorister) {
      setSelectedMemberId(activeChorister.memberId);
    }
  }, [activeChorister]);

  // Manage Camera QR Scanner
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (isScanning) {
      setCameraError('');
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
              let code = decodedText.trim();
              if (code.includes('OMPH_CHECKIN:')) {
                const parts = code.split(':');
                if (parts[2]) code = parts[2];
              } else if (code.includes('code=')) {
                const match = code.match(/[?&]code=([^&]+)/);
                if (match && match[1]) code = decodeURIComponent(match[1]);
              }
              setAccessCodeInput(code);
              setScanSuccess(true);
              setIsScanning(false);
              setTimeout(() => setScanSuccess(false), 3000);

              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(() => {});
              }
            },
            () => {}
          ).catch((err) => {
            console.warn('Camera failed to start', err);
            setCameraError('Camera access unavailable or permission denied. Please enter the door access code manually.');
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

    if (!liveSession) {
      setCheckinMessage({
        success: false,
        text: nextUpcoming 
          ? `No rehearsal is currently in progress. Attendance check-in opens at scheduled call time (${nextUpcoming.activityType} on ${nextUpcoming.date} at ${nextUpcoming.requiredArrivalTime}).`
          : 'No rehearsal is currently in progress. Attendance check-in opens when a rehearsal begins.',
      });
      return;
    }

    if (accessCodeInput.trim().toUpperCase() !== liveSession.accessCode.trim().toUpperCase()) {
      setCheckinMessage({
        success: false,
        text: `Invalid door access code "${accessCodeInput}". Please check the placard displayed at the choir entrance.`,
      });
      return;
    }

    const member = members.find(m => m.memberId === selectedMemberId);
    if (!member) {
      setCheckinMessage({ success: false, text: 'Chorister record not found.' });
      return;
    }

    const alreadyCheckedIn = attendanceRecords.find(
      r => r.sessionId === liveSession.sessionId && r.memberId === selectedMemberId
    );

    if (alreadyCheckedIn) {
      setCheckinMessage({
        success: false,
        text: `You have already checked in for this session (${alreadyCheckedIn.classification} at ${alreadyCheckedIn.actualArrivalTime}).`,
      });
      return;
    }

    const now = new Date();
    const actualArrivalTime = now.toTimeString().slice(0, 5); // HH:mm
    const entryTimestamp = now.toISOString().replace('T', ' ').slice(0, 19);

    const isAccommodated = member.attendanceArrangement && member.attendanceArrangement !== 'Standard';
    const punctuality = evaluatePunctuality(
      liveSession.requiredArrivalTime,
      actualArrivalTime,
      liveSession.gracePeriodMinutes || 5
    );

    const isLate = punctuality.classification === 'Late';
    const fineAssessed = isLate && !isAccommodated ? (liveSession.latePenaltyAmount || 200) : 0;

    const newRecord: AttendanceRecord = {
      attendanceId: `ATT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      sessionId: liveSession.sessionId,
      memberId: member.memberId,
      memberName: member.fullName,
      voicePart: member.voicePart,
      actualArrivalTime,
      entryTimestamp,
      entryMethod: 'QR_Self',
      recordedBy: 'Self Check-in (Door QR)',
      classification: punctuality.classification,
      isVerified: true,
      fineAssessed,
    };

    onRecordAttendance(newRecord);

    const msg = punctuality.classification === 'Present'
      ? `Welcome, ${member.fullName}! You are checked in ON TIME (${actualArrivalTime}). Have a prayerful rehearsal!`
      : `Checked in at ${actualArrivalTime}. Classification: ${punctuality.classification}. Arrived ${punctuality.diffMinutes} mins after call time.`;

    setCheckinMessage({ success: punctuality.classification === 'Present', text: msg });
    setAccessCodeInput('');
  };

  // Excuse submit handler
  const handleExcuseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChorister || !excuseReason) return;

    const targetSession = displaySession;
    const newAbsence: AbsenceNotification = {
      notificationId: `ABS-${Date.now()}`,
      memberId: activeChorister.memberId,
      memberName: activeChorister.fullName,
      sessionId: targetSession?.sessionId || 'UPCOMING',
      rehearsalDate: targetSession?.date || new Date().toISOString().split('T')[0],
      reason: excuseReason,
      isAnticipated: true,
      supportingExplanation: excuseDetails,
      submissionTimestamp: new Date().toISOString(),
      status: 'Pending Review',
    };

    onSubmitAbsence(newAbsence);
    setExcuseSuccess(true);
    setExcuseReason('');
    setExcuseDetails('');
    setTimeout(() => setExcuseSuccess(false), 4000);
  };

  // Dispute submit handler
  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChorister || !disputeDescription) return;

    const newComplaint: ComplaintRecord = {
      complaintId: `CMP-${Date.now()}`,
      memberId: activeChorister.memberId,
      memberName: activeChorister.fullName,
      complaintDate: new Date().toISOString().split('T')[0],
      category: disputeCategory,
      description: disputeDescription,
      assignedOfficer: settings?.choirMasterName ? `${settings.choirMasterName} (Choir Master)` : 'Choir Master',
      status: 'New',
      isConfidential: true,
    };

    onSubmitComplaint(newComplaint);
    setDisputeSuccess(true);
    setDisputeDescription('');
    setTimeout(() => setDisputeSuccess(false), 4000);
  };

  // Transfer payment submit handler
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChorister || transferAmount <= 0) return;
    if (onSubmitPaymentTransfer) {
      await onSubmitPaymentTransfer({
        amount: transferAmount,
        category: transferCategory,
        bankReference: transferRef,
        notes: transferNotes,
      });
      setTransferSuccess(true);
      setTransferAmount(0);
      setTransferRef('');
      setTransferNotes('');
      setTimeout(() => setTransferSuccess(false), 4000);
    }
  };

  // Financial calculations for active member
  const memberFines = activeChorister ? fines.filter(f => f.memberId === activeChorister.memberId) : [];
  const memberDues = activeChorister ? monthlyDues.filter(d => d.memberId === activeChorister.memberId) : [];
  const memberPayments = activeChorister ? payments.filter(p => p.memberId === activeChorister.memberId) : [];
  const memberAttendance = activeChorister ? attendanceRecords.filter(r => r.memberId === activeChorister.memberId) : [];

  // Fine breakdown
  const lateFinesTotal = memberFines
    .filter(f => f.violationType === 'Late Arrival' && !f.isExempted)
    .reduce((s, f) => s + f.amount, 0);
  const absenceFinesTotal = memberFines
    .filter(f => f.violationType === 'Unexcused Absence' && !f.isExempted)
    .reduce((s, f) => s + f.amount, 0);
  const totalFinesAssessed = lateFinesTotal + absenceFinesTotal;

  const finesPaid = memberPayments
    .filter(p => p.category !== 'Monthly Dues' && p.status !== 'Rejected')
    .reduce((s, p) => s + p.amount, 0);
  const outstandingFines = Math.max(0, totalFinesAssessed - finesPaid);

  // Monthly Dues breakdown
  const totalDuesAssessed = memberDues
    .filter(d => d.status !== 'Exempted' && d.status !== 'Waived')
    .reduce((s, d) => s + d.assessedAmount, 0);
  const totalDuesPaid = memberDues
    .reduce((s, d) => s + d.amountPaid, 0);
  const outstandingDues = Math.max(0, totalDuesAssessed - totalDuesPaid);

  const grandTotalOutstanding = outstandingFines + outstandingDues;

  // Attendance rate
  const totalAttended = memberAttendance.length;
  const onTimeCount = memberAttendance.filter(r => r.classification === 'Present').length;
  const attendanceRate = totalAttended > 0 ? Math.round((onTimeCount / totalAttended) * 100) : 100;

  // Copy Account Number
  const activeBankDetails = settings.bankDetails || settings.officialBankDetails;
  const handleCopyAccount = () => {
    if (activeBankDetails?.accountNumber) {
      navigator.clipboard.writeText(activeBankDetails.accountNumber);
      setCopiedBankAcc(true);
      setTimeout(() => setCopiedBankAcc(false), 3000);
    }
  };

  // WhatsApp announcement sharing generator
  const formatWhatsAppAnnouncement = (ann: ChoirAnnouncement) => {
    return [
      `🎵 *${settings.parishName?.toUpperCase() || 'OMPH CATHOLIC PARISH CHOIR'}* 🎵`,
      `*${settings.choirName?.toUpperCase() || 'ST. CECILIA CHORAL MINISTRY'}*`,
      ``,
      `📢 *${ann.title.toUpperCase()}* 📢`,
      `*Category:* ${ann.category}`,
      ann.relevantDate ? `*Date:* ${ann.relevantDate}` : '',
      ann.relevantTime ? `*Time:* ${ann.relevantTime}` : '',
      ann.venue ? `*Venue:* ${ann.venue}` : '',
      ``,
      ann.messageBody,
      ``,
      ann.specialInstructions ? `*Special Note:* ${ann.specialInstructions}\n` : '',
      `_“${settings.choirMotto || 'Cantare Amantis Est — To Sing is the Mark of Love'}”_`,
      `— ${ann.publishingOfficer} (${ann.publishingPosition})`,
    ].filter(Boolean).join('\n');
  };

  const handleShareWhatsApp = (ann: ChoirAnnouncement) => {
    const text = formatWhatsAppAnnouncement(ann);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyAnnouncementText = (ann: ChoirAnnouncement) => {
    const text = formatWhatsAppAnnouncement(ann);
    navigator.clipboard.writeText(text);
    setCopiedAnnouncementId(ann.announcementId);
    setTimeout(() => setCopiedAnnouncementId(null), 3000);
  };

  return (
    <div className="flex-1 flex min-h-dvh bg-slate-100/70">
      {/* Persistent Left Sidebar for Member Experience */}
      <MemberSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
        settings={settings}
        currentMember={activeChorister}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeSessionName={liveSession ? `${liveSession.activityType} (${liveSession.requiredArrivalTime})` : undefined}
        outstandingBalance={grandTotalOutstanding}
      />

      {/* Main Content Area (Vertical Information Flow) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-slate-900"></span>
              <div>
                <h1 className="text-sm font-bold text-slate-900">
                  {activeTab === 'dashboard'
                    ? 'Member Portal'
                    : activeTab === 'profile'
                    ? 'My Profile'
                    : activeTab === 'finance'
                    ? 'My Financial Account'
                    : activeTab === 'checkin'
                    ? "Today's Check-in"
                    : activeTab === 'attendance'
                    ? 'My Attendance'
                    : activeTab === 'schedule'
                    ? 'Rehearsal Schedule'
                    : activeTab === 'announcements'
                    ? 'Choir Announcements'
                    : activeTab === 'songs'
                    ? 'Parish Songs & Scripts'
                    : activeTab === 'excuse'
                    ? 'Submit Absence Excuse'
                    : activeTab === 'complaint'
                    ? 'Lodge Complaint / Dispute'
                    : 'Member Portal'}
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  {settings.parishName} · St. Cecilia Choral Ministry
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeChorister ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(prev => !prev)}
                  className="flex items-center gap-2.5 p-1 -m-1 rounded-full hover:bg-slate-100 transition focus:outline-hidden cursor-pointer"
                  aria-expanded={showUserDropdown}
                  aria-haspopup="true"
                >
                  <ChoristerAvatar
                    fullName={activeChorister.fullName}
                    voicePart={activeChorister.voicePart}
                    photoUrl={activeChorister.profilePhotoUrl}
                    size="md"
                    ring
                  />
                  <div className="hidden sm:block text-left text-xs leading-tight">
                    <div className="font-bold text-slate-800 flex items-center gap-1">
                      <span className="truncate max-w-[120px]">{activeChorister.fullName}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <span className="font-semibold text-amber-900">{activeChorister.voicePart}</span>
                      <span>·</span>
                      <span className="font-mono">{activeChorister.memberId}</span>
                    </div>
                  </div>
                </button>

                {/* User Dropdown Menu */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/70">
                      <div className="flex items-center gap-2">
                        <ChoristerAvatar
                          fullName={activeChorister.fullName}
                          voicePart={activeChorister.voicePart}
                          photoUrl={activeChorister.profilePhotoUrl}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{activeChorister.fullName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{activeChorister.memberId} · {activeChorister.voicePart}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('profile');
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-950 font-medium flex items-center gap-2.5 cursor-pointer"
                    >
                      <User className="w-4 h-4 text-slate-500" />
                      <span>My Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('profile');
                        setPasswordModalTrigger((prev) => prev + 1);
                        setShowUserDropdown(false);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-950 font-medium flex items-center gap-2.5 cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-slate-500" />
                      <span>Change Password</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-red-600 hover:bg-red-50 font-medium flex items-center gap-2.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </header>

        {/* Content Body with Vertical Information Flow */}
        <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">

          {/* TAB 1: MY DASHBOARD (Vertical Newspaper / Reading Flow) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Preserved Wide Horizontal Choir Hero Banner */}
              <ChoirHeroBanner
                settings={settings}
                totalMembers={members.length}
                activeSession={liveSession}
                nextSession={nextUpcoming}
                mode="member"
              />

              {/* 1. Welcome Card with Member's Registered Name and 80px Profile Avatar */}
              <section className="bg-gradient-to-r from-amber-50/90 via-white to-amber-50/60 rounded-xl border border-amber-200/90 p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    {activeChorister && (
                      <div 
                        onClick={() => setActiveTab('profile')}
                        className="relative group cursor-pointer shrink-0"
                        title="Click to view or edit your profile"
                      >
                        <ChoristerAvatar
                          fullName={activeChorister.fullName}
                          voicePart={activeChorister.voicePart}
                          photoUrl={activeChorister.profilePhotoUrl}
                          size="xl"
                          ring
                        />
                        <div className="absolute inset-0 bg-slate-950/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition">
                          Profile
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-amber-900 uppercase tracking-widest bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                          {settings.parishAbbreviation || 'OMPH'} Choral Ministry
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600">Patron Saint: <strong>{settings.patronSaint || 'St. Cecilia'}</strong></span>
                        {activeChorister && (
                          <>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600">ID: <strong className="font-mono text-slate-800">{activeChorister.memberId}</strong></span>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                              {activeChorister.voicePart}
                            </span>
                          </>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Welcome, {activeChorister?.fullName || 'Parish Chorister'}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <button
                      onClick={() => setActiveTab('profile')}
                      className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-slate-500" /> View / Edit Profile
                    </button>
                    <button
                      onClick={() => setActiveTab('checkin')}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-amber-300" /> Check In for Rehearsal
                    </button>
                  </div>
                </div>
              </section>

              {/* 2. Next Scheduled Choir Activity / Live Rehearsal (Full-width content block) */}
              {displaySession && (
                <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        {liveSession ? 'Active Rehearsal In Progress' : 'Next Scheduled Choir Activity & Call Time'}
                      </h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      liveSession
                        ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 animate-pulse'
                        : displaySession.sessionStatus === 'Updated'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}>
                      {liveSession ? 'In Progress' : (displaySession.sessionStatus || 'Scheduled')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <span className="text-slate-500 text-[11px] block">Activity Type & Date</span>
                      <strong className="text-slate-900 text-sm block">{displaySession.activityType}</strong>
                      <span className="text-slate-600 font-mono">{displaySession.date}</span>
                    </div>

                    <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 space-y-1">
                      <span className="text-amber-900 text-[11px] block font-semibold">Required Call Time</span>
                      <strong className="text-slate-900 text-base font-mono block">{displaySession.requiredArrivalTime}</strong>
                      <span className="text-slate-600 text-[11px]">Late fines assessed after call time + 5 mins</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                      <span className="text-slate-500 text-[11px] block">Venue & Discipline</span>
                      <strong className="text-slate-800 text-xs block">{displaySession.venue || 'Parish Choir Gallery'}</strong>
                      <span className="text-[11px] text-slate-500 block">
                        {displaySession.isCompulsory ? 'Compulsory (₦200 Late / ₦500 Absent)' : 'Sectional / Optional'}
                      </span>
                    </div>
                  </div>

                  {displaySession.revisionReason && (
                    <div className="p-2.5 bg-amber-100/70 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong>Notice of Call Time Revision:</strong> {displaySession.revisionReason}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* 3. Latest Official Announcement (Prominent full-width block) */}
              {announcements.length > 0 && (
                <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Latest Official Announcement
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyAnnouncementText(announcements[0])}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1 rounded flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3 text-slate-500" /> 
                        {copiedAnnouncementId === announcements[0].announcementId ? 'Copied!' : 'Copy'}
                      </button>

                      <button
                        onClick={() => handleShareWhatsApp(announcements[0])}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded flex items-center gap-1 shadow-2xs"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        {announcements[0].category}
                      </span>
                      <strong className="text-sm text-slate-900">{announcements[0].title}</strong>
                      <span className="text-slate-400 text-[11px] ml-auto">
                        {announcements[0].publicationTimestamp?.slice(0, 10)}
                      </span>
                    </div>

                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs">
                      {announcements[0].messageBody}
                    </p>

                    {announcements[0].specialInstructions && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-600 italic">
                        Note: {announcements[0].specialInstructions}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400 pt-1">
                      Published by: {announcements[0].publishingOfficer} ({announcements[0].publishingPosition})
                    </div>
                  </div>
                </section>
              )}

              {/* 4. Personal Attendance Summary (Full-width vertical block) */}
              <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      My Personal Attendance Summary
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('attendance')}
                    className="text-xs text-amber-900 font-semibold hover:underline flex items-center gap-1"
                  >
                    View Full Attendance History <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block text-[11px]">Sessions Attended</span>
                    <strong className="text-base font-bold text-slate-900">{totalAttended}</strong>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-emerald-800 block text-[11px]">On-Time Arrivals</span>
                    <strong className="text-base font-bold text-emerald-900">{onTimeCount}</strong>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-blue-900 block text-[11px]">Punctuality Rate</span>
                    <strong className="text-base font-bold text-blue-950">{attendanceRate}%</strong>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block text-[11px]">Arrangement</span>
                    <strong className="text-xs font-semibold text-slate-800 truncate block">
                      {activeChorister?.attendanceArrangement?.replace('Approved Accommodation - ', '') || 'Standard'}
                    </strong>
                  </div>
                </div>
              </section>

              {/* 5. Personal Financial Summary (Distinct Monthly Dues vs Disciplinary Fines) */}
              <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      My Financial Standing & Dues
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('finance')}
                    className="text-xs text-emerald-900 font-semibold hover:underline flex items-center gap-1"
                  >
                    View Detailed Statement <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <span className="text-slate-500 text-[11px] block">Monthly Choir Dues</span>
                    <div className="flex items-baseline justify-between font-mono">
                      <span className="text-slate-600">Assessed: ₦{totalDuesAssessed.toLocaleString()}</span>
                      <strong className={`text-sm ${outstandingDues > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        Bal: ₦{outstandingDues.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                    <span className="text-slate-500 text-[11px] block">Attendance Fines (Late/Absent)</span>
                    <div className="flex items-baseline justify-between font-mono">
                      <span className="text-slate-600">Assessed: ₦{totalFinesAssessed.toLocaleString()}</span>
                      <strong className={`text-sm ${outstandingFines > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                        Bal: ₦{outstandingFines.toLocaleString()}
                      </strong>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border space-y-1 ${
                    grandTotalOutstanding > 0 ? 'bg-red-50/80 border-red-200' : 'bg-emerald-50/80 border-emerald-200'
                  }`}>
                    <span className="text-slate-600 text-[11px] block font-semibold">Total Outstanding Obligations</span>
                    <strong className="text-base font-bold font-mono text-slate-900 block">
                      {settings.currencySymbol || '₦'}{grandTotalOutstanding.toLocaleString()}
                    </strong>
                  </div>
                </div>
              </section>

              {/* 6. Quick Access to Liturgical Scores & Sol-fa */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-bold text-slate-900">Liturgical Scores & Sol-fa</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('songs')}
                    className="text-xs text-amber-900 font-semibold hover:underline"
                  >
                    Library ({songs.length})
                  </button>
                </div>

                {songs.length === 0 ? (
                  <p className="text-xs text-slate-500">No liturgical scores uploaded yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {songs.slice(0, 2).map((s) => (
                      <div key={s.songId} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-slate-900 truncate">{s.title}</strong>
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold shrink-0">{s.category}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{s.solfaNotes || s.scriptText || (s as any).lyrics || 'Score & solfa in archive'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: MY PROFILE (Self-Service Dossier) */}
          {activeTab === 'profile' && activeChorister && (
            <MemberProfileView
              currentMember={activeChorister}
              settings={settings}
              onProfileUpdated={(updated) => {
                setLocalMember(updated);
                onMemberProfileUpdated?.(updated);
              }}
              onChangePassword={onChangePassword}
              openPasswordTrigger={passwordModalTrigger}
            />
          )}

          {/* TAB 2: TODAY'S CHECK-IN */}
          {activeTab === 'checkin' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="border-b border-slate-100 pb-4 text-center">
                <h2 className="text-base font-bold text-slate-900">
                  Rehearsal Attendance Check-in
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {liveSession ? (
                    <>
                      Live Rehearsal: <strong className="text-emerald-700">{liveSession.activityType}</strong> ({liveSession.date}) | Call Time: <strong className="font-mono text-slate-800">{liveSession.requiredArrivalTime}</strong>
                    </>
                  ) : nextUpcoming ? (
                    <>
                      Next Scheduled: <strong>{nextUpcoming.activityType}</strong> ({nextUpcoming.date}) | Call Time: <strong className="font-mono text-slate-800">{nextUpcoming.requiredArrivalTime}</strong>
                      <span className="block text-[11px] text-amber-700 font-medium mt-0.5">
                        Attendance desk opens when rehearsal commences at {nextUpcoming.requiredArrivalTime}
                      </span>
                    </>
                  ) : (
                    'No rehearsal currently scheduled.'
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

              {/* QR Scanner View */}
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
                    Hold your camera steady in front of the door placard.
                  </p>
                </div>
              )}

              <form onSubmit={handleCheckinSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chorister Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${activeChorister?.fullName || ''} (${activeChorister?.voicePart || ''}) - ${activeChorister?.memberId || ''}`}
                    className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-xs text-slate-700 font-semibold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      Door Access Code
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsScanning(prev => !prev)}
                      className="text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition"
                    >
                      <QrCode className="w-3.5 h-3.5 text-slate-700" />
                      {isScanning ? 'Close Camera' : 'Scan Placard QR'}
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    value={accessCodeInput}
                    onChange={(e) => setAccessCodeInput(e.target.value)}
                    placeholder="Enter code from the rehearsal door placard"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 uppercase font-mono tracking-wider focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-2xs"
                >
                  Submit Check-in
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: MY ATTENDANCE */}
          {activeTab === 'attendance' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  My Attendance History & Punctuality
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block text-[11px]">Sessions Recorded</span>
                  <strong className="text-base font-bold text-slate-900">{totalAttended}</strong>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-emerald-800 block text-[11px]">On-Time</span>
                  <strong className="text-base font-bold text-emerald-900">{onTimeCount}</strong>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-amber-900 block text-[11px]">Late Arrivals</span>
                  <strong className="text-base font-bold text-amber-950">
                    {memberAttendance.filter(r => r.classification === 'Late').length}
                  </strong>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-blue-900 block text-[11px]">Punctuality Rate</span>
                  <strong className="text-base font-bold text-blue-950">{attendanceRate}%</strong>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-2.5">Date & Session</th>
                      <th className="p-2.5">Arrival Time</th>
                      <th className="p-2.5">Classification</th>
                      <th className="p-2.5">Entry Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {memberAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500">
                          No attendance records found for your account yet.
                        </td>
                      </tr>
                    ) : (
                      memberAttendance.map((rec) => (
                        <tr key={rec.attendanceId} className="hover:bg-slate-50">
                          <td className="p-2.5 font-medium text-slate-900">
                            {rec.entryTimestamp?.slice(0, 10)}
                          </td>
                          <td className="p-2.5 font-mono">{rec.actualArrivalTime}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.classification === 'Present'
                                ? 'bg-emerald-100 text-emerald-900'
                                : rec.classification === 'Late'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {rec.classification}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500">{rec.entryMethod}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: REHEARSAL SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Parish Choir Rehearsal Timetable & Call Times
                </h3>
              </div>

              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div
                    key={sess.sessionId}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2 hover:bg-slate-50 transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-sm">{sess.activityType}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sess.sessionStatus === 'Updated'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : sess.sessionStatus === 'In Progress'
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-blue-50 text-blue-800'
                      }`}>
                        {sess.sessionStatus}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>Date: <strong className="text-slate-900">{sess.date}</strong></span>
                      <span>·</span>
                      <span>Call Time: <strong className="font-mono text-slate-900 font-bold">{sess.requiredArrivalTime}</strong></span>
                      <span>·</span>
                      <span>Venue: {sess.venue || 'Parish Choir Gallery'}</span>
                      <span>·</span>
                      <span>{sess.isCompulsory ? 'Compulsory' : 'Optional'}</span>
                    </div>

                    {sess.revisionReason && (
                      <div className="p-2 bg-amber-100/60 border border-amber-200 rounded text-xs text-amber-950">
                        <strong>Notice:</strong> {sess.revisionReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CHOIR ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Official Choir Announcements & Notices
                </h3>
              </div>

              {announcements.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No published announcements at this time.
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((ann) => (
                    <div key={ann.announcementId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            {ann.category}
                          </span>
                          <h4 className="font-bold text-sm text-slate-900">{ann.title}</h4>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyAnnouncementText(ann)}
                            className="text-xs bg-white hover:bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded border border-slate-300 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3 text-slate-500" />
                            {copiedAnnouncementId === ann.announcementId ? 'Copied!' : 'Copy'}
                          </button>

                          <button
                            onClick={() => handleShareWhatsApp(ann)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded flex items-center gap-1 shadow-2xs"
                          >
                            <MessageSquare className="w-3 h-3" /> Share to WhatsApp
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {ann.messageBody}
                      </p>

                      {ann.specialInstructions && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-950 italic">
                          Special Instructions: {ann.specialInstructions}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Published by: {ann.publishingOfficer} ({ann.publishingPosition})</span>
                        <span>{ann.publicationTimestamp?.slice(0, 10)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SONGS & SCRIPTS */}
          {activeTab === 'songs' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Parish Songs, Scores & Tonic Sol-fa
                </h3>
              </div>

              {songs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No songs uploaded yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {songs.map((song) => (
                    <div key={song.songId} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                          {song.category}
                        </span>
                        {song.keySignature && (
                          <span className="text-[10px] font-mono text-slate-500">Key: {song.keySignature}</span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-slate-900">{song.title}</h4>
                      {song.composer && (
                        <p className="text-[11px] text-slate-500">Composer: {song.composer}</p>
                      )}

                      {song.solfaNotes && (
                        <div className="bg-white p-2.5 rounded border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap">
                          <span className="text-[10px] text-slate-400 block font-sans">Tonic Sol-fa:</span>
                          {song.solfaNotes}
                        </div>
                      )}

                      {(song.scriptText || (song as any).lyrics) && (
                        <p className="text-xs text-slate-700 whitespace-pre-wrap italic">
                          “{song.scriptText || (song as any).lyrics}”
                        </p>
                      )}

                      {song.audioGuideUrl && (
                        <div className="pt-1">
                          <span className="text-[10px] text-slate-500 font-semibold block mb-1">Audio Practice Guide:</span>
                          <audio controls className="w-full h-8" src={song.audioGuideUrl}>
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}

                      {song.sheetMusicUrl && (
                        <div className="pt-1">
                          <img
                            src={song.sheetMusicUrl}
                            alt={`${song.title} sheet music`}
                            className="max-h-48 w-auto rounded border border-slate-200 object-contain bg-white"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: MY FINANCIAL ACCOUNT (Dues, Fines, History & Official Bank Payment Details) */}
          {activeTab === 'finance' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    My Financial Account
                  </h3>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Statement
                </button>
              </div>

              {/* Categorized Summary Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-3">Financial Category</th>
                      <th className="p-3 text-right">Assessed</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-medium text-slate-900">Monthly Choir Dues</td>
                      <td className="p-3 text-right font-mono text-slate-700">{settings.currencySymbol || '₦'}{totalDuesAssessed.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-emerald-700">{settings.currencySymbol || '₦'}{totalDuesPaid.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono font-bold text-red-700">{settings.currencySymbol || '₦'}{outstandingDues.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-900">Late Arrival Fines (₦200)</td>
                      <td className="p-3 text-right font-mono text-slate-700">{settings.currencySymbol || '₦'}{lateFinesTotal.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-emerald-700">—</td>
                      <td className="p-3 text-right font-mono text-slate-700">—</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-slate-900">Unexcused Absence Fines (₦500)</td>
                      <td className="p-3 text-right font-mono text-slate-700">{settings.currencySymbol || '₦'}{absenceFinesTotal.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-emerald-700">—</td>
                      <td className="p-3 text-right font-mono text-slate-700">—</td>
                    </tr>
                    <tr className="bg-slate-50/70 font-semibold">
                      <td className="p-3 text-slate-800">Fine Debt Subtotal</td>
                      <td className="p-3 text-right font-mono text-slate-800">{settings.currencySymbol || '₦'}{totalFinesAssessed.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-emerald-700">{settings.currencySymbol || '₦'}{finesPaid.toLocaleString()}</td>
                      <td className="p-3 text-right font-mono text-red-700">{settings.currencySymbol || '₦'}{outstandingFines.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-amber-50/80 font-bold border-t-2 border-amber-200">
                      <td className="p-3 text-slate-900">Total Outstanding Balance</td>
                      <td className="p-3 text-right font-mono text-slate-900">
                        {settings.currencySymbol || '₦'}{(totalDuesAssessed + totalFinesAssessed).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-800">
                        {settings.currencySymbol || '₦'}{(totalDuesPaid + finesPaid).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-mono text-red-800 text-sm">
                        {settings.currencySymbol || '₦'}{grandTotalOutstanding.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Monthly Dues Billing Cycles Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" /> Monthly Dues Billing History
                </h4>

                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-2.5">Billing Period</th>
                        <th className="p-2.5">Assessed</th>
                        <th className="p-2.5">Paid</th>
                        <th className="p-2.5">Balance</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {memberDues.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500">
                            No monthly dues assessments generated for your account yet.
                          </td>
                        </tr>
                      ) : (
                        memberDues.map((due) => (
                          <tr key={due.assessmentId} className="hover:bg-slate-50">
                            <td className="p-2.5 font-medium font-mono text-slate-900">{due.billingMonth}</td>
                            <td className="p-2.5 font-mono">{settings.currencySymbol || '₦'}{due.assessedAmount.toLocaleString()}</td>
                            <td className="p-2.5 font-mono text-emerald-700">{settings.currencySymbol || '₦'}{due.amountPaid.toLocaleString()}</td>
                            <td className="p-2.5 font-mono font-bold text-red-700">{settings.currencySymbol || '₦'}{due.remainingBalance.toLocaleString()}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                due.status === 'Paid'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : due.status === 'Partially Paid'
                                  ? 'bg-amber-100 text-amber-900'
                                  : due.status === 'Exempted'
                                  ? 'bg-blue-100 text-blue-900'
                                  : 'bg-red-100 text-red-900'
                              }`}>
                                {due.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History & Verification Status */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" /> Payment History & Verification Status
                </h4>

                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Category</th>
                        <th className="p-2.5">Method / Ref</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {memberPayments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-500">
                            No payments recorded for your account yet.
                          </td>
                        </tr>
                      ) : (
                        memberPayments.map((pay) => (
                          <tr key={pay.paymentId} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono text-slate-700">{pay.paymentDate}</td>
                            <td className="p-2.5 font-medium text-slate-900">{pay.category || 'Fine Payment'}</td>
                            <td className="p-2.5 text-slate-600">
                              {pay.paymentMethod}
                              {pay.bankReference ? ` · ${pay.bankReference}` : pay.receiptNumber ? ` · ${pay.receiptNumber}` : ''}
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold text-slate-900">
                              {settings.currencySymbol || '₦'}{Number(pay.amount || 0).toLocaleString()}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                pay.status === 'Rejected'
                                  ? 'bg-red-100 text-red-900'
                                  : pay.status === 'Pending Verification'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}>
                                {pay.status || 'Verified'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Official Parish Choir Bank Payment Details + Transfer Notification Form */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                {/* Official Bank Account Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-600" /> Official Choir Bank Account
                    </h4>
                  </div>

                  {copiedBankAcc && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Account Number copied to clipboard!</span>
                    </div>
                  )}

                  {activeBankDetails?.bankName && activeBankDetails?.accountNumber ? (
                    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 shadow-md space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 block">
                            Official Parish Choir Account
                          </span>
                          <h5 className="text-sm font-bold text-white mt-0.5">
                            {settings.parishName}
                          </h5>
                        </div>
                        <Building2 className="w-5 h-5 text-amber-400" />
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Bank Name</span>
                          <strong className="text-sm text-white">{activeBankDetails.bankName}</strong>
                        </div>

                        <div>
                          <span className="text-[11px] text-slate-400 block">Account Name</span>
                          <strong className="text-sm text-slate-100 font-mono tracking-wide">
                            {activeBankDetails.accountName}
                          </strong>
                        </div>

                        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Account Number</span>
                            <span className="text-base font-mono font-bold text-amber-300 tracking-wider">
                              {activeBankDetails.accountNumber}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyAccount}
                            className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </button>
                        </div>

                        {(activeBankDetails.paymentInstructions || activeBankDetails.narrationInstructions) && (
                          <div className="pt-2 border-t border-slate-700 text-[11px] text-slate-300 leading-relaxed">
                            <strong className="text-amber-300">Narration Instructions:</strong> {activeBankDetails.paymentInstructions || activeBankDetails.narrationInstructions}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                      <CreditCard className="w-7 h-7 text-slate-400 mx-auto" />
                      <h5 className="text-xs font-bold text-slate-800">Bank Details Not Configured Yet</h5>
                      <p className="text-xs text-slate-500">
                        Contact the Treasurer or Provost for payment instructions.
                      </p>
                    </div>
                  )}
                </div>

                {/* Submit Bank Transfer Notification */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs self-start">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-slate-700" /> Notify Treasurer of Bank Transfer
                    </h4>
                    <span className="text-[11px] text-slate-500">Subject to Treasurer verification</span>
                  </div>

                  {transferSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Transfer logged as Pending Verification! The Treasurer will confirm against the choir bank statement.</span>
                    </div>
                  )}

                  <form onSubmit={handleTransferSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Amount Paid ({settings.currencySymbol || '₦'})</label>
                        <input
                          type="number"
                          required
                          min="100"
                          value={transferAmount}
                          onChange={(e) => setTransferAmount(Number(e.target.value))}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900 bg-white"
                          placeholder="e.g. 1000"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Category</label>
                        <select
                          value={transferCategory}
                          onChange={(e) => setTransferCategory(e.target.value as any)}
                          className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 bg-white"
                        >
                          <option value="Monthly Dues">Monthly Choir Dues</option>
                          <option value="Late Arrival Fine">Late Arrival Fine</option>
                          <option value="Absence Fine">Unexcused Absence Fine</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Bank Narration / Reference</label>
                      <input
                        type="text"
                        value={transferRef}
                        onChange={(e) => setTransferRef(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 bg-white"
                        placeholder="e.g. Session ref or teller #"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={transferAmount <= 0}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs transition shadow-2xs cursor-pointer"
                      >
                        Submit Transfer for Verification
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: SUBMIT ABSENCE EXCUSE */}
          {activeTab === 'excuse' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Submit Absence Excuse Notice
                </h3>
                <HelpToggle label="Help">
                  Notify the Provost before call time when unable to attend rehearsal to request an excused absence.
                </HelpToggle>
              </div>

              {excuseSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Your excuse has been recorded and transmitted to the Provost Desk for review.</span>
                </div>
              )}

              <form onSubmit={handleExcuseSubmit} className="space-y-4 text-xs max-w-lg">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason for Absence</label>
                  <input
                    type="text"
                    required
                    value={excuseReason}
                    onChange={(e) => setExcuseReason(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
                    placeholder="e.g. Official night shift duty; University examination; Bereavement"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Additional Explanation (Optional)</label>
                  <textarea
                    rows={3}
                    value={excuseDetails}
                    onChange={(e) => setExcuseDetails(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
                    placeholder="Provide further context or expected date of return."
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-2xs"
                >
                  Submit Absence Notice
                </button>
              </form>
            </div>
          )}

          {/* TAB 10: LODGE COMPLAINT / DISPUTE */}
          {activeTab === 'complaint' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Lodge Confidential Complaint or Dispute
                </h3>
                <HelpToggle label="Help">
                  Submit a confidential dispute directly to the Choir Master if you need an attendance record, fine, or payment entry reviewed.
                </HelpToggle>
              </div>

              {disputeSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Your grievance has been confidentially logged and assigned to the Choir Master for review.</span>
                </div>
              )}

              <form onSubmit={handleDisputeSubmit} className="space-y-4 text-xs max-w-lg">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dispute Category</label>
                  <select
                    value={disputeCategory}
                    onChange={(e) => setDisputeCategory(e.target.value as ComplaintCategory)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 bg-white"
                  >
                    <option value="Incorrect Attendance">Incorrect Attendance Record</option>
                    <option value="Incorrect Fine">Incorrect Fine Assessed</option>
                    <option value="Payment Record Dispute">Payment Record Not Credited</option>
                    <option value="Accommodation Decision">Attendance Accommodation Grievance</option>
                    <option value="Administrative Conduct">Administrative Conduct</option>
                    <option value="Other">Other Parish Grievance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Details of Dispute</label>
                  <textarea
                    required
                    rows={4}
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
                    placeholder="State the date, session, and exact details of why this should be reviewed."
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-2xs"
                >
                  Submit Confidential Dispute
                </button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
