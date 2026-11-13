import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartHandshake,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MessageCircle,
  User,
  Shield,
  Search,
  Filter,
  Check,
  X,
  Send,
  ExternalLink,
  ChevronDown,
  Info,
  History,
  Bell,
  Sparkles,
  ArrowRight,
  UserCheck,
  CalendarClock,
  FileText
} from 'lucide-react';
import {
  Chorister,
  RehearsalSession,
  AttendanceRecord,
  AbsenceNotification,
  SystemSettings,
  ExecutiveAccount,
  WelfareFollowUpCase,
  WelfareFollowUpStatus,
  WelfareContactOutcome,
  WelfareContactMethod,
  WelfareSettings
} from '../types';
import { ChoristerAvatar } from './ChoristerAvatar';
import {
  evaluateWelfareCases,
  normalizeWhatsAppPhoneNumber,
  generateWelfareWhatsAppMessage,
  buildWhatsAppClickToChatUrl,
  isReminderDue,
  isReminderOverdue,
  getLagosCurrentTime,
  DEFAULT_WELFARE_SETTINGS
} from '../utils/welfareEvaluation';

interface WelfareManagerProps {
  members: Chorister[];
  sessions: RehearsalSession[];
  attendanceRecords: AttendanceRecord[];
  absences: AbsenceNotification[];
  settings: SystemSettings;
  currentExecutive?: ExecutiveAccount | null;
  welfareCases?: WelfareFollowUpCase[];
  onWelfareCasesChange?: (cases: WelfareFollowUpCase[]) => void;
  onOpenDossier?: (member: Chorister) => void;
  onUpdateSettings?: (newSettings: SystemSettings) => Promise<any>;
}

export const WelfareManager: React.FC<WelfareManagerProps> = ({
  members,
  sessions,
  attendanceRecords,
  absences,
  settings,
  currentExecutive,
  welfareCases: propWelfareCases,
  onWelfareCasesChange,
  onOpenDossier,
  onUpdateSettings,
}) => {
  // Navigation tabs within Welfare Module
  const [activeSubTab, setActiveSubTab] = useState<'attention' | 'scheduled' | 'history'>('attention');
  const [searchTerm, setSearchTerm] = useState('');
  const [voiceFilter, setVoiceFilter] = useState<string>('All');

  // Server-synced welfare cases state
  const [persistedCases, setPersistedCases] = useState<WelfareFollowUpCase[]>(propWelfareCases || []);
  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  // Selected case for detailed follow-up drawer/modal
  const [selectedCase, setSelectedCase] = useState<WelfareFollowUpCase | null>(null);

  // WhatsApp composer state in modal
  const [customWhatsAppMsg, setCustomWhatsAppMsg] = useState('');
  const [isCopiedToClipboard, setIsCopiedToClipboard] = useState(false);

  // Schedule Follow-up sub-form state
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('17:00');
  const [reminderNote, setReminderNote] = useState('');

  // Record outcome sub-form state
  const [contactMethod, setContactMethod] = useState<WelfareContactMethod>('WhatsApp');
  const [outcome, setOutcome] = useState<WelfareContactOutcome>('Doing well');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [markCaseResolved, setMarkCaseResolved] = useState(false);
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  // Assigned officer override state
  const [reassignOfficerId, setReassignOfficerId] = useState('');

  // Periodic timer for live Africa/Lagos reminder evaluation
  const [currentTimeLagos, setCurrentTimeLagos] = useState(getLagosCurrentTime());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeLagos(getLagosCurrentTime());
    }, 30000); // tick every 30s
    return () => clearInterval(timer);
  }, []);

  // Keep local persistedCases synced if parent updates propWelfareCases (e.g. demo load/exit)
  useEffect(() => {
    if (Array.isArray(propWelfareCases)) {
      setPersistedCases(propWelfareCases);
    }
  }, [propWelfareCases]);

  // Fetch persisted cases on mount
  useEffect(() => {
    const fetchCases = async () => {
      const token = sessionStorage.getItem('executive_token');
      if (!token) return;
      try {
        setIsLoading(true);
        const res = await fetch('/api/welfare/cases', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.welfareCases)) {
          setPersistedCases(data.welfareCases);
          onWelfareCasesChange?.(data.welfareCases);
        }
      } catch (e) {
        console.error('Failed to load welfare cases from server:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCases();
  }, []);

  // Dynamically evaluate welfare cases combining live absences with persistent history
  const { activeCases, historyCases, summary } = useMemo(() => {
    return evaluateWelfareCases(
      members,
      sessions,
      attendanceRecords,
      absences,
      settings,
      persistedCases
    );
  }, [members, sessions, attendanceRecords, absences, settings, persistedCases]);

  // Sync evaluated cases with backend if new cases detected
  useEffect(() => {
    const token = sessionStorage.getItem('executive_token');
    if (!token || activeCases.length === 0) return;

    // Check if any active case is missing from persisted cases or has changed unexcused count
    const needsSync = activeCases.some((ac) => {
      const persisted = persistedCases.find((p) => p.memberId === ac.memberId);
      return !persisted || persisted.qualifyingAbsenceCount !== ac.qualifyingAbsenceCount;
    });

    if (needsSync) {
      fetch('/api/welfare/sync-cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cases: activeCases }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.welfareCases)) {
            setPersistedCases(data.welfareCases);
            onWelfareCasesChange?.(data.welfareCases);
          }
        })
        .catch((e) => console.error('Silent welfare sync error:', e));
    }
  }, [activeCases]);

  // Handle case selection
  const handleSelectCase = (caseItem: WelfareFollowUpCase) => {
    setSelectedCase(caseItem);
    // Initialize default WhatsApp message
    const msg = generateWelfareWhatsAppMessage(
      caseItem.memberName,
      settings.parishAbbreviation || 'OMPH',
      settings.choirName || 'St. Cecilia Choir'
    );
    setCustomWhatsAppMsg(msg);
    setIsCopiedToClipboard(false);

    // Initialize schedule inputs
    const lagosNow = getLagosCurrentTime();
    setScheduleDate(caseItem.scheduledDate || lagosNow.dateStr);
    setScheduleTime(caseItem.scheduledTime || '17:00');
    setReminderNote(caseItem.reminderNotes || '');

    // Initialize reassign input
    setReassignOfficerId(caseItem.assignedOfficerId || 'POS-PV');

    // Reset outcome form
    setContactMethod(caseItem.preferredContactMethod === 'Phone Call' ? 'Phone Call' : 'WhatsApp');
    setOutcome('Doing well');
    setOutcomeNotes('');
    setMarkCaseResolved(false);
    setNextFollowUpDate('');
    setActionSuccessMsg(null);
    setActionErrorMsg(null);
  };

  // Action: Schedule follow-up
  const handleScheduleFollowUp = async () => {
    if (!selectedCase) return;
    if (!scheduleDate || !scheduleTime) {
      setActionErrorMsg('Please specify both a date and time.');
      return;
    }

    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch(`/api/welfare/cases/${selectedCase.caseId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          scheduledDate: scheduleDate,
          scheduledTime: scheduleTime,
          reminderNotes: reminderNote,
        }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setPersistedCases((prev) =>
          prev.map((c) => (c.caseId === data.case.caseId ? data.case : c))
        );
        setSelectedCase(data.case);
        setActionSuccessMsg(`Follow-up scheduled for ${scheduleDate} at ${scheduleTime} (Africa/Lagos).`);
      } else {
        setActionErrorMsg(data.message || 'Failed to schedule reminder.');
      }
    } catch (e: any) {
      setActionErrorMsg(e?.message || 'Network error while scheduling reminder.');
    }
  };

  // Action: Reassign officer
  const handleReassignOfficer = async () => {
    if (!selectedCase || !reassignOfficerId) return;
    const targetPos = settings?.positions?.find((p) => p.positionId === reassignOfficerId);
    const officerName = targetPos?.assignedOfficer || targetPos?.title || 'Executive Officer';

    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch(`/api/welfare/cases/${selectedCase.caseId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          officerId: reassignOfficerId,
          officerName,
          officerPosition: targetPos?.title || 'Executive',
        }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setPersistedCases((prev) =>
          prev.map((c) => (c.caseId === data.case.caseId ? data.case : c))
        );
        setSelectedCase(data.case);
        setActionSuccessMsg(`Responsibility assigned to ${officerName}.`);
      } else {
        setActionErrorMsg(data.message || 'Failed to assign officer.');
      }
    } catch (e: any) {
      setActionErrorMsg(e?.message || 'Network error assigning officer.');
    }
  };

  // Action: Record contact outcome
  const handleRecordOutcome = async () => {
    if (!selectedCase) return;
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch(`/api/welfare/cases/${selectedCase.caseId}/contact-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          contactMethod,
          outcome,
          notes: outcomeNotes,
          nextScheduledFollowUp: nextFollowUpDate || undefined,
          markResolved: markCaseResolved,
        }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setPersistedCases((prev) =>
          prev.map((c) => (c.caseId === data.case.caseId ? data.case : c))
        );
        setSelectedCase(data.case);
        setActionSuccessMsg(`Contact recorded successfully (${contactMethod} — ${outcome}).`);
        setOutcomeNotes('');
      } else {
        setActionErrorMsg(data.message || 'Failed to record contact outcome.');
      }
    } catch (e: any) {
      setActionErrorMsg(e?.message || 'Network error recording outcome.');
    }
  };

  // Action: Directly resolve case
  const handleResolveCase = async () => {
    if (!selectedCase) return;
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch(`/api/welfare/cases/${selectedCase.caseId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          resolutionNotes: outcomeNotes || 'Chorister confirmed well and engaged. Case closed.',
        }),
      });
      const data = await res.json();
      if (data.success && data.case) {
        setPersistedCases((prev) =>
          prev.map((c) => (c.caseId === data.case.caseId ? data.case : c))
        );
        setSelectedCase(data.case);
        setActionSuccessMsg(`Case resolved and moved to historical follow-up records.`);
      } else {
        setActionErrorMsg(data.message || 'Failed to resolve case.');
      }
    } catch (e: any) {
      setActionErrorMsg(e?.message || 'Network error resolving case.');
    }
  };

  // Action: Update contact preference for member
  const handleUpdatePreference = async (method: 'WhatsApp' | 'Phone Call' | 'In-Person' | 'Do Not Contact on WhatsApp', optOut: boolean) => {
    if (!selectedCase) return;
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/welfare/member-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          memberId: selectedCase.memberId,
          preferredContactMethod: method,
          optOutWhatsApp: optOut,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedCase((prev) => prev ? { ...prev, preferredContactMethod: method, optOutWhatsApp: optOut } : null);
        setPersistedCases((prev) =>
          prev.map((c) => (c.memberId === selectedCase.memberId ? { ...c, preferredContactMethod: method, optOutWhatsApp: optOut } : c))
        );
        setActionSuccessMsg(`Contact preference updated to: ${method}`);
      }
    } catch (e: any) {
      console.error('Error updating preference:', e);
    }
  };

  // Filter cases based on search and voice section
  const filteredActiveCases = useMemo(() => {
    return activeCases.filter((c) => {
      const matchesSearch =
        c.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phoneNumber && c.phoneNumber.includes(searchTerm));
      const matchesVoice = voiceFilter === 'All' || c.voicePart === voiceFilter;
      return matchesSearch && matchesVoice;
    });
  }, [activeCases, searchTerm, voiceFilter]);

  const scheduledCases = useMemo(() => {
    return activeCases.filter((c) => Boolean(c.scheduledDate && c.scheduledTime));
  }, [activeCases]);

  const filteredHistoryCases = useMemo(() => {
    return historyCases.filter((c) => {
      const matchesSearch =
        c.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.memberId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVoice = voiceFilter === 'All' || c.voicePart === voiceFilter;
      return matchesSearch && matchesVoice;
    });
  }, [historyCases, searchTerm, voiceFilter]);

  // Selected chorister lookup from members list
  const selectedMember = useMemo(() => {
    if (!selectedCase) return null;
    return members.find((m) => m.memberId === selectedCase.memberId) || null;
  }, [selectedCase, members]);

  // WhatsApp click-to-chat URL evaluation
  const phoneNormalization = useMemo(() => {
    if (!selectedCase?.phoneNumber) return { valid: false, formatted: '', raw: '', error: 'No phone number registered' };
    return normalizeWhatsAppPhoneNumber(selectedCase.phoneNumber);
  }, [selectedCase]);

  const whatsAppUrl = useMemo(() => {
    if (!phoneNormalization.valid || !customWhatsAppMsg) return '';
    return buildWhatsAppClickToChatUrl(phoneNormalization.formatted, customWhatsAppMsg);
  }, [phoneNormalization, customWhatsAppMsg]);

  return (
    <div className="space-y-6">
      {/* SECTION A: WELFARE OVERVIEW & PASTORAL CARE BANNER */}
      <section className="bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 rounded-2xl p-6 text-white shadow-md border border-rose-800/40 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-rose-500/30 text-rose-200 border border-rose-400/30 px-2.5 py-0.5 rounded-full">
              Pastoral Care & Fellowship Monitoring
            </span>
            <span className="text-rose-300/60">·</span>
            <span className="text-xs text-rose-200/90 font-mono">OMPH Choral Ministry · Africa/Lagos</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <HeartHandshake className="w-7 h-7 text-rose-400" />
            Chorister Welfare & Absence Follow-up Desk
          </h2>
        </div>

        {/* Ambient liturgical glow */}
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-rose-500/10 to-transparent pointer-events-none" />
      </section>

      {/* OVERDUE REMINDER ALERT BANNER (If any reminders are currently due in Lagos) */}
      {summary.overdueCount > 0 && (
        <div className="bg-amber-500 text-slate-950 p-4 rounded-xl border border-amber-600 shadow-sm flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-950 text-amber-300 flex items-center justify-center shrink-0 font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-950">
                Scheduled Welfare Reminders Due Now ({summary.overdueCount})
              </h4>
              <p className="text-xs text-slate-900">
                You have scheduled chorister wellbeing check-ins that are due for follow-up today.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveSubTab('scheduled')}
            className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition shadow-2xs shrink-0 cursor-pointer"
          >
            View Scheduled Follow-ups
          </button>
        </div>
      )}

      {/* 4 OVERVIEW KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div 
          onClick={() => setActiveSubTab('attention')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeSubTab === 'attention'
              ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-rose-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Requiring Attention</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary.requiringAttention}</span>
            <span className="text-[10px] font-semibold text-rose-700">Members</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">≥ {settings.welfareSettings?.unexcusedAbsenceThreshold || 2} unexcused absences</p>
        </div>

        <div 
          onClick={() => setActiveSubTab('scheduled')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeSubTab === 'scheduled'
              ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Scheduled Check-ins</span>
            <CalendarClock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary.scheduledCount}</span>
            {summary.overdueCount > 0 && (
              <span className="text-[10px] font-bold bg-rose-600 text-white px-1.5 py-0.2 rounded-full">
                {summary.overdueCount} Due
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Pending follow-up times</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Further Support Needed</span>
            <HeartHandshake className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary.furtherSupportCount}</span>
            <span className="text-[10px] text-purple-700 font-semibold">Active Cases</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Health, personal or family</p>
        </div>

        <div 
          onClick={() => setActiveSubTab('history')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Resolved / In Good Standing</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{summary.resolvedCount}</span>
            <span className="text-[10px] text-emerald-700 font-semibold">Past Cases</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Completed care contacts</p>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveSubTab('attention')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'attention'
                ? 'bg-white text-slate-950 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Requiring Attention ({summary.requiringAttention})
          </button>
          <button
            onClick={() => setActiveSubTab('scheduled')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'scheduled'
                ? 'bg-white text-slate-950 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Scheduled Reminders ({summary.scheduledCount})
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
              activeSubTab === 'history'
                ? 'bg-white text-slate-950 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Contact History ({historyCases.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search member, ID, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900 w-52"
            />
          </div>

          <select
            value={voiceFilter}
            onChange={(e) => setVoiceFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden"
          >
            <option value="All">All Voice Parts</option>
            <option value="Soprano">Soprano</option>
            <option value="Alto">Alto</option>
            <option value="Tenor">Tenor</option>
            <option value="Bass">Bass</option>
          </select>
        </div>
      </div>

      {/* SUB-TAB 1: REQUIRING ATTENTION TABLE */}
      {activeSubTab === 'attention' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Choristers with Repeated Unexcused Absences
              </h3>
              <p className="text-[11px] text-slate-500">
                Triggered by accumulating ≥ {settings.welfareSettings?.unexcusedAbsenceThreshold || 2} unexcused absences within the last {settings.welfareSettings?.evaluationWindowGatherings || 4} completed gatherings.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {filteredActiveCases.length} Members Listed
            </span>
          </div>

          {filteredActiveCases.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">All Active Choristers are in Regular Attendance</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No chorister has reached the unexcused absence threshold. Everyone is attending or accounted for with approved excuses.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3.5">Chorister</th>
                    <th className="py-2.5 px-3">Voice Section</th>
                    <th className="py-2.5 px-3">Unexcused Absences</th>
                    <th className="py-2.5 px-3">Last Attendance</th>
                    <th className="py-2.5 px-3">Last Missed</th>
                    <th className="py-2.5 px-3">Follow-up Status</th>
                    <th className="py-2.5 px-3">Assigned Officer</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredActiveCases.map((caseItem) => {
                    const norm = normalizeWhatsAppPhoneNumber(caseItem.phoneNumber);
                    const isDue = isReminderDue(caseItem.scheduledDate, caseItem.scheduledTime);

                    return (
                      <tr 
                        key={caseItem.caseId}
                        className="hover:bg-rose-50/30 transition group"
                      >
                        <td className="py-2.5 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <ChoristerAvatar
                              fullName={caseItem.memberName}
                              voicePart={caseItem.voicePart}
                              size="md"
                            />
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{caseItem.memberName}</span>
                                {caseItem.optOutWhatsApp && (
                                  <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-1 py-0.2 rounded font-normal" title="Prefers phone call / in-person check-in">
                                    No WhatsApp
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-slate-500">{caseItem.memberId}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-800">{caseItem.voicePart}</span>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full font-bold font-mono text-[11px] bg-rose-100 text-rose-950 border border-rose-300">
                              {caseItem.qualifyingAbsenceCount} Missed
                            </span>
                            <span className="text-[10px] text-slate-400">in last {settings.welfareSettings?.evaluationWindowGatherings || 4}</span>
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          {caseItem.lastAttendanceDate ? (
                            <span className="font-mono text-slate-700 text-[11px]">{caseItem.lastAttendanceDate}</span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No recent record</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-mono text-slate-800 text-[11px]">
                          {caseItem.lastAbsenceDate}
                        </td>

                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                            caseItem.status === 'Needs Attention'
                              ? 'bg-rose-100 text-rose-900 border border-rose-300'
                              : caseItem.status === 'Reminder Scheduled'
                              ? isDue
                                ? 'bg-amber-100 text-amber-950 border border-amber-300 animate-pulse'
                                : 'bg-blue-50 text-blue-900 border border-blue-200'
                              : caseItem.status === 'Contacted'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : caseItem.status === 'Further Support Required'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {caseItem.status}
                            {isDue && caseItem.status === 'Reminder Scheduled' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            )}
                          </span>
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="text-slate-800 font-medium text-[11px]">
                            {caseItem.assignedOfficerName || 'Provost'}
                          </div>
                          <span className="text-[10px] text-slate-400 block">{caseItem.assignedOfficerPosition || 'Officer'}</span>
                        </td>

                        <td className="py-2.5 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSelectCase(caseItem)}
                              className="px-2.5 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded-md text-[11px] font-semibold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="Open Follow-up Workspace"
                            >
                              <HeartHandshake className="w-3.5 h-3.5 text-rose-300" />
                              <span>Follow Up</span>
                            </button>

                            {selectedMember && (
                              <button
                                onClick={() => onOpenDossier?.(selectedMember)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition"
                                title="Open 360° Chorister Dossier"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: SCHEDULED FOLLOW-UPS */}
      {activeSubTab === 'scheduled' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-600" />
                Scheduled Welfare Reminders & Upcoming Check-ins
              </h3>
              <p className="text-[11px] text-slate-500">
                Executives' planned follow-up appointments evaluated in real-time according to Africa/Lagos timezone ({currentTimeLagos.timeStr} Lagos Time).
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {scheduledCases.length} Scheduled
            </span>
          </div>

          {scheduledCases.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No Scheduled Reminders</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select any chorister under "Requiring Attention" and click "Schedule Follow-up" to plan future pastoral check-ins.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {scheduledCases.map((caseItem) => {
                const isOverdue = isReminderOverdue(caseItem.scheduledDate, caseItem.scheduledTime);
                const isDue = isReminderDue(caseItem.scheduledDate, caseItem.scheduledTime);

                return (
                  <div 
                    key={caseItem.caseId}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      isOverdue ? 'bg-rose-50/40 border-l-4 border-rose-500' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <ChoristerAvatar
                        fullName={caseItem.memberName}
                        voicePart={caseItem.voicePart}
                        size="md"
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs">{caseItem.memberName}</span>
                          <span className="text-[10px] font-mono text-slate-500">{caseItem.memberId}</span>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded font-semibold text-slate-700">
                            {caseItem.voicePart}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                          <span className="font-mono font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                            {caseItem.scheduledDate} at {caseItem.scheduledTime} (WAT)
                          </span>
                          <span>Assigned: <strong>{caseItem.assignedOfficerName}</strong></span>
                        </div>
                        {caseItem.reminderNotes && (
                          <p className="text-xs text-slate-600 italic bg-white/80 p-1.5 rounded border border-slate-200/80 max-w-lg mt-1">
                            "{caseItem.reminderNotes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      {isOverdue && (
                        <span className="text-[10px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                          Due Now
                        </span>
                      )}
                      <button
                        onClick={() => handleSelectCase(caseItem)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <HeartHandshake className="w-3.5 h-3.5 text-amber-300" />
                        Execute Follow-up
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: CONTACT HISTORY & COMPLETED OUTCOMES */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                Pastoral Contact History & Welfare Logs
              </h3>
              <p className="text-[11px] text-slate-500">
                Audit trail of completed check-in calls, WhatsApp interactions, and resolved welfare cases.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {filteredHistoryCases.length} Resolved Cases
            </span>
          </div>

          {filteredHistoryCases.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No Resolved History Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Completed and resolved cases will automatically be archived here with their recorded outcomes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredHistoryCases.map((caseItem) => (
                <div key={caseItem.caseId} className="p-4 hover:bg-slate-50/50 transition space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <ChoristerAvatar
                        fullName={caseItem.memberName}
                        voicePart={caseItem.voicePart}
                        size="sm"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-900">{caseItem.memberName}</span>
                        <span className="font-mono text-[10px] text-slate-400 ml-1.5">({caseItem.memberId})</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Resolved: {caseItem.resolvedAt ? caseItem.resolvedAt.slice(0, 10) : 'Completed'}
                    </span>
                  </div>

                  {caseItem.resolutionNotes && (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                      <strong>Resolution Note:</strong> {caseItem.resolutionNotes}
                    </div>
                  )}

                  {caseItem.contactHistory && caseItem.contactHistory.length > 0 && (
                    <div className="space-y-1.5 pl-2 border-l-2 border-emerald-200 mt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Contact Interactions ({caseItem.contactHistory.length}):
                      </span>
                      {caseItem.contactHistory.map((log) => (
                        <div key={log.logId} className="text-[11px] text-slate-600 flex items-baseline gap-2">
                          <span className="font-mono text-slate-400 text-[10px]">{log.contactDate.slice(0, 16).replace('T', ' ')}</span>
                          <span className="font-semibold text-slate-800">[{log.contactMethod}]</span>
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded font-medium text-slate-700">{log.outcome}</span>
                          <span className="text-slate-400">· By {log.officerName}</span>
                          {log.notes && <span className="italic text-slate-500">"{log.notes}"</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: INTERACTIVE WELFARE FOLLOW-UP WORKSPACE */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-2xs z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90dvh] overflow-y-auto overscroll-contain my-auto text-xs">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <ChoristerAvatar
                  fullName={selectedCase.memberName}
                  voicePart={selectedCase.voicePart}
                  size="xl"
                  ring
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{selectedCase.memberName}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                      {selectedCase.voicePart}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5">
                    <span className="font-mono">{selectedCase.memberId}</span>
                    <span>·</span>
                    <span>Status: <strong>{selectedCase.status}</strong></span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCase(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification messages */}
            {actionSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{actionSuccessMsg}</span>
              </div>
            )}
            {actionErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-950 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>{actionErrorMsg}</span>
              </div>
            )}

            {/* Absence Trigger Details Box */}
            <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-950 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                  Welfare Absence Trigger Summary
                </span>
                <span className="font-mono font-bold text-rose-950 text-xs">
                  {selectedCase.qualifyingAbsenceCount} Unexcused Absences
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Missed gatherings within evaluation window:{' '}
                <strong>{selectedCase.qualifyingDates?.join(', ') || 'Recent Gatherings'}</strong>.
              </p>
              <div className="text-[10px] text-slate-500 flex items-center gap-3 pt-1 border-t border-rose-200/60">
                <span>Last Attended: <strong>{selectedCase.lastAttendanceDate || 'None recorded recently'}</strong></span>
                <span>·</span>
                <span>Last Missed: <strong>{selectedCase.lastAbsenceDate}</strong></span>
              </div>
            </div>

            {/* Contact Details & Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Registered Telephone
                </span>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-600" />
                  <span className="font-mono font-bold text-slate-900 text-xs">
                    {selectedCase.phoneNumber || 'No phone registered'}
                  </span>
                </div>
                {selectedCase.phoneNumber && (
                  <span className={`text-[10px] block ${phoneNormalization.valid ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {phoneNormalization.valid ? `✓ WhatsApp normalized: +${phoneNormalization.formatted}` : `⚠️ ${phoneNormalization.error}`}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Contact Preference
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-900">
                    {selectedCase.preferredContactMethod || 'WhatsApp'}
                  </span>
                  {selectedCase.optOutWhatsApp && (
                    <span className="text-[9px] bg-rose-100 text-rose-900 font-bold px-1.5 py-0.2 rounded">
                      Prefers Call / In-Person
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleUpdatePreference('WhatsApp', false)}
                    className="text-[10px] text-blue-700 hover:underline"
                  >
                    Set WhatsApp
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => handleUpdatePreference('Phone Call', true)}
                    className="text-[10px] text-blue-700 hover:underline"
                  >
                    Opt-out WhatsApp
                  </button>
                </div>
              </div>
            </div>

            {/* ACTION 1: WHATSAPP CLICK-TO-CHAT COMPOSER */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  WhatsApp Click-to-Chat (Pre-filled Message)
                </h4>
                <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                  Official wa.me Link
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Review and edit the warm, non-accusatory welfare message below. Clicking <strong>Contact on WhatsApp</strong> will open the conversation in your WhatsApp app or WhatsApp Web.
              </p>

              <textarea
                rows={4}
                value={customWhatsAppMsg}
                onChange={(e) => setCustomWhatsAppMsg(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                placeholder="Type your friendly welfare message..."
              />

              {/* Strict transparency disclaimer */}
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-950 leading-relaxed space-y-1">
                <strong>Important Notice on WhatsApp Communication:</strong>
                <p>
                  1. Clicking the button opens WhatsApp with your prefilled text. You must personally inspect and press <strong>Send</strong>.
                </p>
                <p>
                  2. Opening WhatsApp does <strong>not</strong> automatically mark this chorister as contacted or resolve the case.
                </p>
                <p>
                  3. After reaching out, please record the contact outcome using the form below.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {whatsAppUrl ? (
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Open WhatsApp Chat with {selectedCase.memberName.split(' ')[0]}
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                ) : (
                  <button
                    disabled
                    className="px-4 py-2 bg-slate-200 text-slate-500 rounded-lg text-xs font-bold cursor-not-allowed flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Invalid Phone Number for WhatsApp
                  </button>
                )}

                {selectedCase.phoneNumber && (
                  <a
                    href={`tel:${selectedCase.phoneNumber.replace(/\s+/g, '')}`}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 rounded-lg text-xs transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    Direct Phone Call
                  </a>
                )}
              </div>
            </div>

            {/* ACTION 2: SCHEDULE FOLLOW-UP REMINDER (AFRICA/LAGOS TIME) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-amber-600" />
                Schedule Follow-up Reminder (Africa/Lagos)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Scheduled Time (WAT)
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Optional Reminder Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Check in regarding university exams or family health..."
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <button
                type="button"
                onClick={handleScheduleFollowUp}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <CalendarClock className="w-3.5 h-3.5 text-amber-300" />
                Save Scheduled Reminder
              </button>
            </div>

            {/* ACTION 3: ASSIGN RESPONSIBLE EXECUTIVE OFFICER */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Responsible Welfare Officer
              </h4>
              <p className="text-[11px] text-slate-500">
                Default assigned officer is the Provost ({settings.provostName || 'Engr. Emmanuel O. Adeleke'}). You can reassign responsibility to avoid duplicate check-ins.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={reassignOfficerId}
                  onChange={(e) => setReassignOfficerId(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden min-w-[200px]"
                >
                  {(settings.positions || []).map((pos) => (
                    <option key={pos.positionId} value={pos.positionId}>
                      {pos.title}: {pos.assignedOfficer || 'Vacant'}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleReassignOfficer}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold border border-slate-300 rounded-lg text-xs transition shadow-2xs cursor-pointer"
                >
                  Update Assignment
                </button>
              </div>
            </div>

            {/* ACTION 4: RECORD CONTACT OUTCOME & WELFARE HISTORY */}
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3">
              <h4 className="text-xs font-bold text-purple-950 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-700" />
                Record Follow-up Outcome & Progress
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Contact Method Used
                  </label>
                  <select
                    value={contactMethod}
                    onChange={(e) => setContactMethod(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                  >
                    <option value="WhatsApp">WhatsApp Conversation</option>
                    <option value="Phone Call">Direct Phone Call</option>
                    <option value="In-Person">In-Person Meeting / After Mass</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Contact Outcome
                  </label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                  >
                    <option value="Doing well">Doing well (confirmed attending next session)</option>
                    <option value="Health or personal concern">Health or personal concern</option>
                    <option value="Work/school commitments">Work / Academic commitments</option>
                    <option value="Financial difficulty">Financial difficulty</option>
                    <option value="Personal/family matter">Personal / Family matter</option>
                    <option value="Unable to reach">Unable to reach (no response yet)</option>
                    <option value="Further support required">Further support required (follow up again)</option>
                    <option value="No further action required">No further action required (resolved)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Private Pastoral Notes (Strictly Confidential to Executives)
                </label>
                <textarea
                  rows={2}
                  placeholder="Record summary of conversation (avoid recording unnecessary private medical details)..."
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="markResolvedCheck"
                  checked={markCaseResolved}
                  onChange={(e) => setMarkCaseResolved(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="markResolvedCheck" className="text-xs text-slate-800 font-medium cursor-pointer">
                  Mark this welfare case as fully resolved (Chorister in good standing)
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRecordOutcome}
                  className="px-4 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-purple-300" />
                  Save Follow-up Outcome
                </button>

                <button
                  type="button"
                  onClick={handleResolveCase}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-emerald-800 font-bold border border-emerald-300 rounded-lg text-xs transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Mark Case as Resolved
                </button>
              </div>
            </div>

            {/* PREVIOUS CONTACT LOGS FOR THIS CHORISTER */}
            {selectedCase.contactHistory && selectedCase.contactHistory.length > 0 && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Pastoral History for {selectedCase.memberName} ({selectedCase.contactHistory.length})
                </span>
                <div className="space-y-1.5 divide-y divide-slate-100 max-h-40 overflow-y-auto">
                  {selectedCase.contactHistory.map((log) => (
                    <div key={log.logId} className="pt-1.5 text-xs text-slate-700">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{log.contactDate.slice(0, 16).replace('T', ' ')}</span>
                        <span>Recorded by {log.officerName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-slate-900">[{log.contactMethod}]</span>
                        <span className="font-bold text-purple-900 bg-purple-100 px-1.5 py-0.2 rounded text-[10px]">
                          {log.outcome}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-[11px] text-slate-600 italic mt-0.5">"{log.notes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 italic">
                OMPH St. Cecilia Choir · Pastoral Welfare Ministry
              </span>
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Close Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
