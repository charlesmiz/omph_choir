import React, { useState, useEffect, useRef, useMemo } from 'react';
import { reconcileSessions, getActiveSession, getNextScheduledSession } from './utils/sessionLifecycle';
import { Navbar } from './components/Navbar';
import { MemberPortal } from './components/MemberPortal';
import { AttendanceManager } from './components/AttendanceManager';
import { ScheduleManager } from './components/ScheduleManager';
import { MembershipManager } from './components/MembershipManager';
import { FinanceManager } from './components/FinanceManager';
import { DisciplineManager } from './components/DisciplineManager';
import { ChurchSettings } from './components/ChurchSettings';
import { SongLibrary } from './components/SongLibrary';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { ExecutiveSidebar } from './components/ExecutiveSidebar';
import { MonthlyDuesManager } from './components/MonthlyDuesManager';
import { AuditLogViewer } from './components/AuditLogViewer';
import { ChoirAnnouncementsManager } from './components/ChoirAnnouncementsManager';
import { PublicLandingPage } from './components/PublicLandingPage';
import { ExecutiveChangePasswordModal } from './components/ExecutiveChangePasswordModal';
import { WelfareManager } from './components/WelfareManager';
import { evaluateWelfareCases } from './utils/welfareEvaluation';
import { Menu, Key } from 'lucide-react';

import { 
  initialMembers, 
  initialSessions, 
  initialScheduleAudits,
  initialAttendanceRecords, 
  initialFines, 
  initialPayments, 
  initialAdjustments, 
  initialAbsences, 
  initialAccommodations, 
  initialQueries, 
  initialSuspensions, 
  initialComplaints, 
  initialFundMovements, 
  initialSettings,
  cleanInitialMembers,
  cleanInitialSessions,
  cleanInitialScheduleAudits,
  cleanInitialAttendanceRecords,
  cleanInitialFines,
  cleanInitialPayments,
  cleanInitialAdjustments,
  cleanInitialAbsences,
  cleanInitialAccommodations,
  cleanInitialQueries,
  cleanInitialSuspensions,
  cleanInitialComplaints,
  cleanInitialFundMovements,
  cleanInitialSongs,
  cleanInitialWelfareCases,
  initialWelfareCases,
} from './data/initialData';

import { 
  Chorister, 
  RehearsalSession, 
  AttendanceRecord, 
  FineRecord, 
  PaymentRecord, 
  AdjustmentRecord, 
  AbsenceNotification, 
  AccommodationApplication, 
  QueryRecord, 
  SuspensionRecord, 
  ComplaintRecord, 
  FundMovementRecord, 
  AuditLogEntry, 
  ScheduleChangeAudit,
  SystemSettings,
  ChoirSong,
  ExecutiveRole,
  ExecutiveAccount,
  ChoristerAccount,
  MonthlyDuesAssessment,
  BankDetailsChangeProposal,
  ChoirAnnouncement,
  BankDetails,
  WelfareFollowUpCase
} from './types';

export default function App() {
  // Persistence Helpers
  const loadStored = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };

  const saveStored = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed saving to localStorage', e);
    }
  };

  // Defensive helpers for unique React keys and complete song models
  const deduplicateMembers = (raw: Chorister[]): Chorister[] => {
    if (!Array.isArray(raw)) return [];
    const seenIds = new Set<string>();
    const res: Chorister[] = [];
    raw.forEach((m, idx) => {
      let id = m.memberId || `MEM-${idx}`;
      if (seenIds.has(id)) {
        id = `${id}-${idx}`;
      }
      seenIds.add(id);
      res.push({ ...m, memberId: id });
    });
    return res;
  };

  const normalizeSongs = (raw: any[]): ChoirSong[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map((s: any) => ({
      ...s,
      scriptText: s.scriptText || s.lyrics || '',
      solfaNotes: s.solfaNotes || s.solfaNotation || '',
    }));
  };

  // Demo Mode state
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => 
    loadStored('choir_is_demo_mode', false)
  );

  // Real Church Default States (Clean placeholders, no demo noise)
  const [settings, setSettings] = useState<SystemSettings>(() => 
    loadStored('choir_settings', initialSettings)
  );

  const [members, setMembers] = useState<Chorister[]>(() => 
    deduplicateMembers(loadStored('choir_members', cleanInitialMembers))
  );

  const [sessions, setSessions] = useState<RehearsalSession[]>(() => 
    loadStored('choir_sessions', cleanInitialSessions)
  );

  const [scheduleAudits, setScheduleAudits] = useState<ScheduleChangeAudit[]>(() => 
    loadStored('choir_schedule_audits', cleanInitialScheduleAudits)
  );

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => 
    loadStored('choir_attendance', cleanInitialAttendanceRecords)
  );

  const [fines, setFines] = useState<FineRecord[]>(() => 
    loadStored('choir_fines', cleanInitialFines)
  );

  const [payments, setPayments] = useState<PaymentRecord[]>(() => 
    loadStored('choir_payments', cleanInitialPayments)
  );

  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>(() => 
    loadStored('choir_adjustments', cleanInitialAdjustments)
  );

  const [absences, setAbsences] = useState<AbsenceNotification[]>(() => 
    loadStored('choir_absences', cleanInitialAbsences)
  );

  const [accommodations, setAccommodations] = useState<AccommodationApplication[]>(() => 
    loadStored('choir_accommodations', cleanInitialAccommodations)
  );

  const [queries, setQueries] = useState<QueryRecord[]>(() => 
    loadStored('choir_queries', cleanInitialQueries)
  );

  const [suspensions, setSuspensions] = useState<SuspensionRecord[]>(() => 
    loadStored('choir_suspensions', cleanInitialSuspensions)
  );

  const [complaints, setComplaints] = useState<ComplaintRecord[]>(() => 
    loadStored('choir_complaints', cleanInitialComplaints)
  );

  const [fundMovements, setFundMovements] = useState<FundMovementRecord[]>(() => 
    loadStored('choir_funds', cleanInitialFundMovements)
  );

  const [songs, setSongs] = useState<ChoirSong[]>(() => 
    normalizeSongs(loadStored('choir_songs', cleanInitialSongs))
  );

  // New Phase 2 Datasets
  const [monthlyDues, setMonthlyDues] = useState<MonthlyDuesAssessment[]>(() => 
    loadStored('choir_monthly_dues', [])
  );

  const [announcements, setAnnouncements] = useState<ChoirAnnouncement[]>(() => 
    loadStored('choir_announcements', [])
  );

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => 
    loadStored('choir_audit_logs', [])
  );

  const [bankProposal, setBankProposal] = useState<BankDetailsChangeProposal | null>(() => 
    loadStored('choir_bank_proposal', null)
  );

  const [welfareCases, setWelfareCases] = useState<WelfareFollowUpCase[]>(() => 
    loadStored('choir_welfare_cases', [])
  );

  // Authentication State
  const [currentMember, setCurrentMember] = useState<ChoristerAccount | null>(() => {
    try {
      const saved = sessionStorage.getItem('current_member');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentExecutive, setCurrentExecutive] = useState<ExecutiveAccount | null>(() => {
    try {
      const saved = sessionStorage.getItem('current_executive');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('executive_unlocked') === 'true';
  });

  const [hasAdminAccount, setHasAdminAccount] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showExecPasswordModal, setShowExecPasswordModal] = useState(false);
  const [currentExecutiveRole, setCurrentExecutiveRole] = useState<ExecutiveRole>(() => {
    return (currentExecutive?.role as ExecutiveRole) || 'Provost';
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    return 'dashboard';
  });

  // Staging Fail-Closed state
  const [stagingConfigInfo, setStagingConfigInfo] = useState<{
    required: boolean;
    error?: string;
    requiredVariables?: string[];
  } | null>(null);

  // Cross-device & cross-tab zero-cost synchronization guards
  const isHydratedFromServer = useRef(false);
  const tabIdRef = useRef<string>(`tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const syncInFlightRef = useRef(false);
  const lastSyncAtRef = useRef(0);

  const broadcastParishSync = (source: string) => {
    const payload = {
      type: 'parish-data-updated',
      source,
      tabId: tabIdRef.current,
      ts: Date.now(),
    };
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('omph_choir_parish_sync');
        ch.postMessage(payload);
        ch.close();
      }
    } catch {
      // Ignore BroadcastChannel restriction
    }
    try {
      localStorage.setItem('omph_choir_sync_ping', JSON.stringify(payload));
    } catch {
      // Ignore storage error
    }
  };

  const hydrateParishData = (d: any) => {
    if (!d || typeof d !== 'object') return;
    if (d.settings || Array.isArray(d.positions)) {
      setSettings(prev => {
        const baseSettings = d.settings || prev;
        const resolvedBank = baseSettings.bankDetails || baseSettings.officialBankDetails;
        const mergedSettings: SystemSettings = {
          ...prev,
          ...baseSettings,
          ...(resolvedBank ? { bankDetails: resolvedBank, officialBankDetails: resolvedBank } : {}),
          ...(Array.isArray(d.positions) ? { positions: d.positions } : {}),
        };
        saveStored('choir_settings', mergedSettings);
        return mergedSettings;
      });

      // Re-sync currentExecutive with authoritative settings & executive accounts on sync
      const settingsObj = d.settings || {};
      try {
        const rawExec = sessionStorage.getItem('current_executive');
        if (rawExec) {
          const current = JSON.parse(rawExec);
          const cleanUser = (current.username || '').toLowerCase().trim();
          let latestName = current.fullName || current.name || '';

          if (Array.isArray(d.executiveAccounts)) {
            const match = d.executiveAccounts.find((a: any) => (a.username || '').toLowerCase().trim() === cleanUser);
            if (match && match.fullName) latestName = match.fullName;
          }

          if (cleanUser === 'choirmaster' && settingsObj.choirMasterName) latestName = settingsObj.choirMasterName;
          else if (cleanUser === 'provost' && settingsObj.provostName) latestName = settingsObj.provostName;
          else if (cleanUser === 'secretary' && settingsObj.secretaryName) latestName = settingsObj.secretaryName;
          else if (cleanUser === 'treasurer' && settingsObj.treasurerName) latestName = settingsObj.treasurerName;
          else if (cleanUser === 'financialsecretary' && settingsObj.financialSecretaryName) latestName = settingsObj.financialSecretaryName;
          else if (cleanUser === 'asstchoirmaster' && settingsObj.assistantChoirMasterName) latestName = settingsObj.assistantChoirMasterName;
          else if (cleanUser === 'asstprovost' && settingsObj.assistantProvostName) latestName = settingsObj.assistantProvostName;
          else if (cleanUser === 'librarian' && settingsObj.librarianName) latestName = settingsObj.librarianName;

          if (latestName && (latestName !== current.fullName || latestName !== current.name)) {
            const updatedExec = { ...current, fullName: latestName, name: latestName };
            setCurrentExecutive(updatedExec);
            sessionStorage.setItem('current_executive', JSON.stringify(updatedExec));
          }
        }
      } catch {
        // Ignore session parse error
      }
    }
    if (Array.isArray(d.members)) {
      const dedupedMembers = deduplicateMembers(d.members);
      setMembers(dedupedMembers);
      saveStored('choir_members', dedupedMembers);

      // Keep active member session aligned with latest authoritative server member record
      try {
        const rawMember = sessionStorage.getItem('current_member');
        if (rawMember) {
          const parsedMember = JSON.parse(rawMember);
          const targetId = String(parsedMember?.memberId || '').trim().toUpperCase();
          if (targetId) {
            const matched = dedupedMembers.find(
              (m: Chorister) => String(m.memberId || '').trim().toUpperCase() === targetId
            );
            if (matched) {
              const syncedMember = { ...parsedMember, ...matched };
              setCurrentMember(syncedMember);
              sessionStorage.setItem('current_member', JSON.stringify(syncedMember));
            }
          }
        }
      } catch {
        // Ignore session parse error
      }
    }
    if (Array.isArray(d.sessions)) {
      setSessions(d.sessions);
      saveStored('choir_sessions', d.sessions);
    }
    if (Array.isArray(d.attendanceRecords)) {
      setAttendanceRecords(d.attendanceRecords);
      saveStored('choir_attendance', d.attendanceRecords);
    }
    if (Array.isArray(d.fines)) {
      setFines(d.fines);
      saveStored('choir_fines', d.fines);
    }
    if (Array.isArray(d.payments)) {
      setPayments(d.payments);
      saveStored('choir_payments', d.payments);
    }
    if (Array.isArray(d.adjustments)) {
      setAdjustments(d.adjustments);
      saveStored('choir_adjustments', d.adjustments);
    }
    if (Array.isArray(d.absences)) {
      setAbsences(d.absences);
      saveStored('choir_absences', d.absences);
    }
    if (Array.isArray(d.accommodations)) {
      setAccommodations(d.accommodations);
      saveStored('choir_accommodations', d.accommodations);
    }
    if (Array.isArray(d.queries)) {
      setQueries(d.queries);
      saveStored('choir_queries', d.queries);
    }
    if (Array.isArray(d.suspensions)) {
      setSuspensions(d.suspensions);
      saveStored('choir_suspensions', d.suspensions);
    }
    if (Array.isArray(d.complaints)) {
      setComplaints(d.complaints);
      saveStored('choir_complaints', d.complaints);
    }
    if (Array.isArray(d.fundMovements)) {
      setFundMovements(d.fundMovements);
      saveStored('choir_funds', d.fundMovements);
    }
    if (Array.isArray(d.songs)) {
      const normalizedSongs = normalizeSongs(d.songs);
      setSongs(normalizedSongs);
      saveStored('choir_songs', normalizedSongs);
    }
    if (Array.isArray(d.monthlyDues)) {
      setMonthlyDues(d.monthlyDues);
      saveStored('choir_monthly_dues', d.monthlyDues);
    }
    if (Array.isArray(d.announcements)) {
      setAnnouncements(d.announcements);
      saveStored('choir_announcements', d.announcements);
    }
    if (Array.isArray(d.auditLogs)) {
      setAuditLogs(d.auditLogs);
      saveStored('choir_audit_logs', d.auditLogs);
    }
    if (Array.isArray(d.welfareCases)) {
      setWelfareCases(d.welfareCases);
      saveStored('choir_welfare_cases', d.welfareCases);
    }
    if (d.bankProposal !== undefined) {
      setBankProposal(d.bankProposal);
      saveStored('choir_bank_proposal', d.bankProposal);
    }
    if (d.isDemoMode !== undefined) setIsDemoMode(d.isDemoMode);
  };

  const persistPartialUpdate = async (partialPayload: Record<string, any>) => {
    if (!isHydratedFromServer.current) return;
    const token = sessionStorage.getItem('executive_token');
    if (!token) return;
    try {
      const res = await fetch('/api/church-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(partialPayload),
      });
      if (res.ok) {
        broadcastParishSync('partial-update');
      }
    } catch (e) {
      console.warn('Failed persisting partial update to server:', e);
    }
  };

  const loadChurchData = async (customToken?: string) => {
    const isExecSession = sessionStorage.getItem('executive_unlocked') === 'true';
    const execToken = sessionStorage.getItem('executive_token');
    const memberToken = sessionStorage.getItem('member_token');
    const token =
      customToken ||
      (isExecSession && execToken ? execToken : memberToken) ||
      execToken ||
      memberToken;
    if (!token) {
      isHydratedFromServer.current = false;
      return;
    }
    if (syncInFlightRef.current && !customToken) return;
    syncInFlightRef.current = true;

    try {
      const res = await fetch('/api/church-data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        if (execToken && token === execToken) {
          sessionStorage.removeItem('executive_token');
          sessionStorage.removeItem('executive_unlocked');
          sessionStorage.removeItem('current_executive');
        }
        if (memberToken && token === memberToken) {
          sessionStorage.removeItem('member_token');
          sessionStorage.removeItem('current_member');
        }
        isHydratedFromServer.current = false;
        return;
      }

      if (!res.ok) {
        isHydratedFromServer.current = false;
        return;
      }

      const result = await res.json();
      if (result && result.success && result.data && Object.keys(result.data).length > 0) {
        hydrateParishData(result.data);
        isHydratedFromServer.current = true;
        lastSyncAtRef.current = Date.now();
      }
    } catch (e) {
      isHydratedFromServer.current = false;
      console.warn('Could not sync from server (offline):', e);
    } finally {
      syncInFlightRef.current = false;
    }
  };

  // Fetch persisted data from Express server on load + zero-cost cross-tab/focus sync
  useEffect(() => {
    // Check if initial admin account exists & staging status
    fetch('/api/public/parish-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && typeof data.hasAdminAccount === 'boolean') {
          setHasAdminAccount(data.hasAdminAccount);
        }
        if (data && data.stagingConfigurationRequired) {
          setStagingConfigInfo({
            required: true,
            error: data.stagingError,
            requiredVariables: data.requiredVariables,
          });
        }
      })
      .catch(() => {});

    // Authenticated data hydration
    loadChurchData();

    // Also fetch initial audit logs from server if executive token present
    const execToken = sessionStorage.getItem('executive_token');
    if (execToken) {
      fetch('/api/audit-logs', {
        headers: { 'Authorization': `Bearer ${execToken}` }
      })
        .then(res => res.json())
        .then(result => {
          if (result && result.success && Array.isArray(result.logs)) {
            setAuditLogs(result.logs);
            saveStored('choir_audit_logs', result.logs);
          }
        })
        .catch(() => {});
    }

    // Immediate cross-tab sync when another tab in the same browser commits a change (zero polling cost)
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('omph_choir_parish_sync');
        bc.onmessage = (event) => {
          const msg = event?.data;
          if (msg && msg.type === 'parish-data-updated' && msg.tabId !== tabIdRef.current) {
            void loadChurchData();
          }
        };
      }
    } catch {
      bc = null;
    }

    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === 'omph_choir_sync_ping' && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue);
          if (msg && msg.tabId !== tabIdRef.current) {
            void loadChurchData();
          }
        } catch {
          // Ignore parse error
        }
      }
    };

    // Throttled focus/visibility sync (>= 15s cooldown) so returning to an open tab catches updates without polling
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastSyncAtRef.current < 15000) return;
      const hasToken =
        sessionStorage.getItem('executive_token') || sessionStorage.getItem('member_token');
      if (hasToken) {
        void loadChurchData();
      }
    };

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  // Sync to localStorage
  useEffect(() => saveStored('choir_is_demo_mode', isDemoMode), [isDemoMode]);
  useEffect(() => saveStored('choir_settings', settings), [settings]);
  useEffect(() => saveStored('choir_members', members), [members]);
  useEffect(() => saveStored('choir_sessions', sessions), [sessions]);
  useEffect(() => saveStored('choir_schedule_audits', scheduleAudits), [scheduleAudits]);
  useEffect(() => saveStored('choir_attendance', attendanceRecords), [attendanceRecords]);
  useEffect(() => saveStored('choir_fines', fines), [fines]);
  useEffect(() => saveStored('choir_payments', payments), [payments]);
  useEffect(() => saveStored('choir_adjustments', adjustments), [adjustments]);
  useEffect(() => saveStored('choir_absences', absences), [absences]);
  useEffect(() => saveStored('choir_accommodations', accommodations), [accommodations]);
  useEffect(() => saveStored('choir_queries', queries), [queries]);
  useEffect(() => saveStored('choir_suspensions', suspensions), [suspensions]);
  useEffect(() => saveStored('choir_complaints', complaints), [complaints]);
  useEffect(() => saveStored('choir_funds', fundMovements), [fundMovements]);
  useEffect(() => saveStored('choir_songs', songs), [songs]);
  useEffect(() => saveStored('choir_monthly_dues', monthlyDues), [monthlyDues]);
  useEffect(() => saveStored('choir_announcements', announcements), [announcements]);
  useEffect(() => saveStored('choir_audit_logs', auditLogs), [auditLogs]);
  useEffect(() => saveStored('choir_bank_proposal', bankProposal), [bankProposal]);

  // Full-document debounced POST /api/church-data sync removed:
  // All mutations save directly via their dedicated backend endpoints or targeted partial updates,
  // preventing stale browser localStorage or initialData.ts defaults from overwriting Firestore.

  // Executive Authentication Handlers
  const handleExecutiveLogin = async (credentials: { username: string; password: string }): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/executive/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      const execUser = data?.executive || data?.account;
      if (data && data.success && execUser) {
        const normalizedExec: ExecutiveAccount = {
          executiveId: execUser.executiveId || 'EXEC-01',
          fullName: execUser.fullName || execUser.name || 'Executive Officer',
          name: execUser.fullName || execUser.name || 'Executive Officer',
          username: execUser.username,
          position: (execUser.position || execUser.role || 'Choir Master') as ExecutiveRole,
          role: (execUser.position || execUser.role || 'Choir Master') as ExecutiveRole,
          status: execUser.status || 'Active',
          permissions: execUser.permissions || ['all'],
          createdAt: execUser.createdAt || new Date().toISOString(),
          lastLogin: execUser.lastLogin || new Date().toISOString(),
        };

        setCurrentExecutive(normalizedExec);
        setCurrentExecutiveRole(normalizedExec.role || 'Choir Master');
        setIsExecutiveUnlocked(true);
        sessionStorage.setItem('current_executive', JSON.stringify(normalizedExec));
        sessionStorage.setItem('executive_unlocked', 'true');
        if (data.token) {
          sessionStorage.setItem('executive_token', data.token);
          loadChurchData(data.token);
        }
        setActiveTab('dashboard');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Executive login error:', e);
      return false;
    }
  };

  const handleExecutiveBootstrap = async (data: { fullName: string; username: string; password: string; position: string }): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/executive/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      const execUser = result?.executive || result?.account;
      if (result && result.success && execUser) {
        const normalizedExec: ExecutiveAccount = {
          executiveId: execUser.executiveId || 'EXEC-01',
          fullName: execUser.fullName || execUser.name || data.fullName,
          name: execUser.fullName || execUser.name || data.fullName,
          username: execUser.username || data.username,
          position: (execUser.position || execUser.role || data.position || 'Choir Master') as ExecutiveRole,
          role: (execUser.position || execUser.role || data.position || 'Choir Master') as ExecutiveRole,
          status: 'Active',
          permissions: execUser.permissions || ['all'],
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };

        setCurrentExecutive(normalizedExec);
        setCurrentExecutiveRole(normalizedExec.role || 'Choir Master');
        setIsExecutiveUnlocked(true);
        setHasAdminAccount(true);
        sessionStorage.setItem('current_executive', JSON.stringify(normalizedExec));
        sessionStorage.setItem('executive_unlocked', 'true');
        if (result.token) {
          sessionStorage.setItem('executive_token', result.token);
          loadChurchData(result.token);
        }
        setActiveTab('dashboard');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Executive bootstrap error:', e);
      return false;
    }
  };

  const handleUnlockExecutive = (pin: string): boolean => {
    // Legacy compatibility for any remaining caller
    if (pin.trim() && pin.trim() === settings.executivePin?.trim()) {
      setIsExecutiveUnlocked(true);
      sessionStorage.setItem('executive_unlocked', 'true');
      setActiveTab('dashboard');
      return true;
    }
    return false;
  };

  const handleLockExecutive = () => {
    setIsExecutiveUnlocked(false);
    setCurrentExecutive(null);
    sessionStorage.removeItem('executive_unlocked');
    sessionStorage.removeItem('current_executive');
    sessionStorage.removeItem('executive_token');
    setActiveTab('dashboard');
  };

  // Member Authentication Handlers
  const handleMemberLogin = async (credentials: { memberId: string; password: string }): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: credentials.memberId,
          username: credentials.memberId,
          password: credentials.password,
        }),
      });
      const data = await res.json();
      const userAccount = data?.account || data?.member;
      if (data && data.success && userAccount) {
        setCurrentMember(userAccount);
        sessionStorage.setItem('current_member', JSON.stringify(userAccount));
        if (data.token) {
          sessionStorage.setItem('member_token', data.token);
          loadChurchData(data.token);
        }
        setActiveTab('dashboard');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Member login error:', e);
      return false;
    }
  };

  const handleMemberActivate = async (data: { memberId: string; activationCode: string; newPassword: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/auth/member/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      const userAccount = resData?.account || resData?.member;
      if (resData && resData.success && userAccount) {
        setCurrentMember(userAccount);
        sessionStorage.setItem('current_member', JSON.stringify(userAccount));
        if (resData.token) {
          sessionStorage.setItem('member_token', resData.token);
          loadChurchData(resData.token);
        }
        setActiveTab('dashboard');
        return { success: true, message: resData.message };
      }
      return { success: false, message: resData?.message || 'Invalid or expired activation code.' };
    } catch (e) {
      console.error('Member activate error:', e);
      return { success: false, message: 'Network error while activating account. Please try again.' };
    }
  };

  const handleMemberResetPassword = async (data: { memberId: string; resetToken: string; newPassword: string }): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/member/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      return resData && resData.success;
    } catch (e) {
      console.error('Member reset password error:', e);
      return false;
    }
  };

  const handleMemberLogout = () => {
    setCurrentMember(null);
    sessionStorage.removeItem('current_member');
    sessionStorage.removeItem('member_token');
    setActiveTab('dashboard');
  };

  const handleMemberProfileUpdated = (updated: Chorister) => {
    const targetId = String(updated.memberId || '').trim().toUpperCase();
    setMembers(prev => {
      const nextMembers = prev.map(m =>
        String(m.memberId || '').trim().toUpperCase() === targetId ? { ...m, ...updated } : m
      );
      saveStored('choir_members', nextMembers);
      return nextMembers;
    });
    setCurrentMember(prev => {
      if (!prev || String(prev.memberId || '').trim().toUpperCase() !== targetId) return prev;
      const nextMember = {
        ...prev,
        ...updated,
      };
      sessionStorage.setItem('current_member', JSON.stringify(nextMember));
      return nextMember;
    });
    broadcastParishSync('member-profile');
  };

  const handleMemberChangePassword = async (currentPwd: string, newPwd: string) => {
    const token = sessionStorage.getItem('member_token');
    const res = await fetch('/api/auth/member/change-password', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`
      },
      body: JSON.stringify({
        memberId: currentMember?.memberId,
        currentPassword: currentPwd,
        newPassword: newPwd,
      }),
    });
    return res.json();
  };

  const handleExecutiveChangePassword = async (currentPwd: string, newPwd: string) => {
    const token = sessionStorage.getItem('executive_token');
    const res = await fetch('/api/auth/executive/change-password', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`
      },
      body: JSON.stringify({
        currentPassword: currentPwd,
        newPassword: newPwd,
      }),
    });
    return res.json();
  };

  // Parish Settings Management with Server Database & Firestore Persistence
  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    // 1. Optimistically update local React state and local storage
    setSettings(newSettings);
    saveStored('choir_settings', newSettings);

    // 2. Synchronize current executive profile if currently logged-in officer's name was updated
    if (currentExecutive) {
      const cleanUser = (currentExecutive.username || '').toLowerCase().trim();
      let updatedName: string = currentExecutive.fullName || currentExecutive.name || '';
      if (cleanUser === 'choirmaster' && newSettings.choirMasterName) {
        updatedName = newSettings.choirMasterName;
      } else if (cleanUser === 'provost' && newSettings.provostName) {
        updatedName = newSettings.provostName;
      } else if (cleanUser === 'secretary' && newSettings.secretaryName) {
        updatedName = newSettings.secretaryName;
      } else if (cleanUser === 'treasurer' && newSettings.treasurerName) {
        updatedName = newSettings.treasurerName;
      } else if (cleanUser === 'financialsecretary' && newSettings.financialSecretaryName) {
        updatedName = newSettings.financialSecretaryName;
      } else if (cleanUser === 'asstchoirmaster' && newSettings.assistantChoirMasterName) {
        updatedName = newSettings.assistantChoirMasterName;
      } else if (cleanUser === 'asstprovost' && newSettings.assistantProvostName) {
        updatedName = newSettings.assistantProvostName;
      } else if (cleanUser === 'librarian' && newSettings.librarianName) {
        updatedName = newSettings.librarianName;
      }

      const updatedExec: ExecutiveAccount = {
        ...currentExecutive,
        fullName: updatedName,
        name: updatedName,
      };
      setCurrentExecutive(updatedExec);
      sessionStorage.setItem('current_executive', JSON.stringify(updatedExec));
    }

    // 3. Post to authoritative server database (persisted to Firestore & disk)
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ settings: newSettings }),
      });
      const data = await res.json();
      if (data && data.success && data.settings) {
        setSettings(data.settings);
        saveStored('choir_settings', data.settings);
        broadcastParishSync('settings');
      }
      return data;
    } catch (e) {
      console.error('Failed persisting settings to server database:', e);
      return { success: false, message: 'Server communication error' };
    }
  };

  // Launch Controls: Demo Data Management
  const handleClearDemoData = () => {
    setIsDemoMode(false);
    setMembers(cleanInitialMembers);
    setSessions(cleanInitialSessions);
    setScheduleAudits(cleanInitialScheduleAudits);
    setAttendanceRecords(cleanInitialAttendanceRecords);
    setFines(cleanInitialFines);
    setPayments(cleanInitialPayments);
    setAdjustments(cleanInitialAdjustments);
    setAbsences(cleanInitialAbsences);
    setAccommodations(cleanInitialAccommodations);
    setQueries(cleanInitialQueries);
    setSuspensions(cleanInitialSuspensions);
    setComplaints(cleanInitialComplaints);
    setFundMovements(cleanInitialFundMovements);
    setMonthlyDues([]);
    setAnnouncements([]);
    setWelfareCases(cleanInitialWelfareCases);
    localStorage.removeItem('choir_welfare_cases');
    localStorage.removeItem('church_real_backup');
  };

  const handleRestoreDemoData = async () => {
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/demo/load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
      });
      const data = await res.json();
      if (data && data.success) {
        setIsDemoMode(true);
        setMembers(initialMembers);
        setSessions(initialSessions);
        setScheduleAudits(initialScheduleAudits);
        setAttendanceRecords(initialAttendanceRecords);
        setFines(initialFines);
        setPayments(initialPayments);
        setAdjustments(initialAdjustments);
        setAbsences(initialAbsences);
        setAccommodations(initialAccommodations);
        setQueries(initialQueries);
        setSuspensions(initialSuspensions);
        setComplaints(initialComplaints);
        setFundMovements(initialFundMovements);
        setWelfareCases(initialWelfareCases);
        saveStored('choir_welfare_cases', initialWelfareCases);
        broadcastParishSync('demo-load');
        return;
      }
    } catch (err) {
      console.warn('Backend demo load error, applying local dataset:', err);
    }

    setIsDemoMode(true);
    setMembers(initialMembers);
    setSessions(initialSessions);
    setScheduleAudits(initialScheduleAudits);
    setAttendanceRecords(initialAttendanceRecords);
    setFines(initialFines);
    setPayments(initialPayments);
    setAbsences(initialAbsences);
    setWelfareCases(initialWelfareCases);
    saveStored('choir_welfare_cases', initialWelfareCases);
  };

  const handleUnloadDemoData = async () => {
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/demo/exit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
      });
      const data = await res.json();
      if (data && data.success) {
        setIsDemoMode(false);
        const refRes = await fetch('/api/church-data', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        });
        const refData = await refRes.json();
        const d = (refData && (refData.data || refData)) || null;
        if (refData && refData.success && d) {
          hydrateParishData(d);
        }
        broadcastParishSync('demo-exit');
        return;
      }
    } catch (err) {
      console.warn('Backend demo exit error, applying clean production state:', err);
    }

    setIsDemoMode(false);
    setMembers(cleanInitialMembers);
    setSessions(cleanInitialSessions);
    setAttendanceRecords(cleanInitialAttendanceRecords);
    setFines(cleanInitialFines);
    setPayments(cleanInitialPayments);
    setAdjustments(cleanInitialAdjustments);
    setAbsences(cleanInitialAbsences);
    setAccommodations(cleanInitialAccommodations);
    setQueries(cleanInitialQueries);
    setSuspensions(cleanInitialSuspensions);
    setComplaints(cleanInitialComplaints);
    setFundMovements(cleanInitialFundMovements);
    setWelfareCases(cleanInitialWelfareCases);
    saveStored('choir_welfare_cases', cleanInitialWelfareCases);
  };

  const handleBulkAddMembers = async (newMembers: Chorister[]) => {
    setMembers(prev => [...prev, ...newMembers]);
    saveStored('choir_members', [...members, ...newMembers]);
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/members/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify({ members: newMembers }),
      });
      if (res.ok) broadcastParishSync('members-bulk');
    } catch (e) {
      console.warn('Failed bulk adding members to server:', e);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      settings,
      members,
      sessions,
      attendanceRecords,
      fines,
      payments,
      adjustments,
      absences,
      queries,
      suspensions,
      monthlyDues,
      announcements,
      auditLogs,
      bankProposal,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OMPH_Choir_Database_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Activity Logs & Timetable Deletion Handlers
  const handleClearMainLogs = () => {
    setAttendanceRecords([]);
    setScheduleAudits([]);
    setFines([]);
    setPayments([]);
    setAdjustments([]);
    setAbsences([]);
    setAccommodations([]);
    setQueries([]);
    setSuspensions([]);
    setComplaints([]);
    setFundMovements([]);
    saveStored('choir_attendance', []);
    saveStored('choir_schedule_audits', []);
    saveStored('choir_fines', []);
    saveStored('choir_payments', []);
    saveStored('choir_adjustments', []);
    saveStored('choir_absences', []);
    saveStored('choir_accommodations', []);
    saveStored('choir_queries', []);
    saveStored('choir_suspensions', []);
    saveStored('choir_complaints', []);
    saveStored('choir_funds', []);
  };

  const handleClearSessions = () => {
    setSessions([]);
    saveStored('choir_sessions', []);
  };

  // Parish Song Library Handlers (Instant Server & Firestore Persistence)
  const handleAddSong = async (newSong: ChoirSong) => {
    setSongs(prev => [newSong, ...prev]);
    saveStored('choir_songs', [newSong, ...songs]);
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify(newSong),
      });
      if (res.ok) broadcastParishSync('songs');
    } catch (e) {
      console.warn('Failed adding song to server:', e);
    }
  };

  const handleUpdateSong = async (updatedSong: ChoirSong) => {
    const updated = songs.map(s => s.songId === updatedSong.songId ? updatedSong : s);
    setSongs(updated);
    saveStored('choir_songs', updated);
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify(updatedSong),
      });
      if (res.ok) broadcastParishSync('songs');
    } catch (e) {
      console.warn('Failed updating song on server:', e);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    const filtered = songs.filter(s => s.songId !== songId);
    setSongs(filtered);
    saveStored('choir_songs', filtered);
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });
      if (res.ok) broadcastParishSync('songs');
    } catch (e) {
      console.warn('Failed deleting song on server:', e);
    }
  };

  // Membership Handlers (Instant Server & Firestore Persistence)
  const handleAddMember = async (newMember: Chorister) => {
    setMembers(prev => [...prev, newMember]);
    saveStored('choir_members', [...members, newMember]);
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify(newMember),
      });
      if (res.ok) broadcastParishSync('members');
    } catch (e) {
      console.warn('Failed registering member on server:', e);
    }
  };

  const handleUpdateMember = async (updated: Chorister): Promise<{ success: boolean; message?: string; member?: Chorister }> => {
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch(`/api/members/${encodeURIComponent(updated.memberId)}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data && data.success) {
        const persistedMember: Chorister = data.member || updated;
        const targetId = String(persistedMember.memberId || updated.memberId || '').trim().toUpperCase();
        if (Array.isArray(data.members)) {
          const deduped = deduplicateMembers(data.members);
          setMembers(deduped);
          saveStored('choir_members', deduped);
        } else {
          setMembers(prev => {
            const updatedList = prev.map(m =>
              String(m.memberId || '').trim().toUpperCase() === targetId ? persistedMember : m
            );
            saveStored('choir_members', updatedList);
            return updatedList;
          });
        }
        setCurrentMember(prev => {
          if (!prev || String(prev.memberId || '').trim().toUpperCase() !== targetId) return prev;
          const nextMember = { ...prev, ...persistedMember };
          sessionStorage.setItem('current_member', JSON.stringify(nextMember));
          return nextMember;
        });
        if (data.settings || Array.isArray(data.positions)) {
          const nextSettings = {
            ...settings,
            ...(data.settings || {}),
            ...(Array.isArray(data.positions) ? { positions: data.positions } : {}),
          };
          setSettings(nextSettings);
          saveStored('choir_settings', nextSettings);

          if (currentExecutive) {
            const cleanUser = (currentExecutive.username || '').toLowerCase().trim();
            let latestName = currentExecutive.fullName || currentExecutive.name || '';
            if (cleanUser === 'choirmaster' && nextSettings.choirMasterName) latestName = nextSettings.choirMasterName;
            else if (cleanUser === 'provost' && nextSettings.provostName) latestName = nextSettings.provostName;
            else if (cleanUser === 'secretary' && nextSettings.secretaryName) latestName = nextSettings.secretaryName;
            else if (cleanUser === 'treasurer' && nextSettings.treasurerName) latestName = nextSettings.treasurerName;
            else if (cleanUser === 'financialsecretary' && nextSettings.financialSecretaryName) latestName = nextSettings.financialSecretaryName;
            else if (cleanUser === 'asstchoirmaster' && nextSettings.assistantChoirMasterName) latestName = nextSettings.assistantChoirMasterName;
            else if (cleanUser === 'asstprovost' && nextSettings.assistantProvostName) latestName = nextSettings.assistantProvostName;
            else if (cleanUser === 'librarian' && nextSettings.librarianName) latestName = nextSettings.librarianName;
            if (latestName && (latestName !== currentExecutive.fullName || latestName !== currentExecutive.name)) {
              const updatedExec = { ...currentExecutive, fullName: latestName, name: latestName };
              setCurrentExecutive(updatedExec);
              sessionStorage.setItem('current_executive', JSON.stringify(updatedExec));
            }
          }
        }
        broadcastParishSync('member-dossier');
        return { success: true, message: data.message, member: persistedMember };
      }
      return { success: false, message: data?.message || 'Failed to update chorister dossier.' };
    } catch (e: any) {
      console.warn('Failed updating member on server:', e);
      return { success: false, message: e?.message || 'Network error while updating dossier.' };
    }
  };

  const handleArchiveMember = async (memberId: string, reason: string): Promise<{ success: boolean; message?: string }> => {
    const archiveReason = reason.trim() || 'Administrative Archival';
    const now = new Date().toISOString();
    const officerName = currentExecutive?.fullName || currentExecutive?.name || 'Executive Officer';

    // Optimistic update
    const updatedList = members.map(m => m.memberId === memberId ? {
      ...m,
      membershipStatus: 'Archived' as const,
      archiveReason,
      archivedAt: now,
      archivedBy: officerName,
    } : m);
    setMembers(updatedList);
    saveStored('choir_members', updatedList);

    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch(`/api/members/${memberId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ reason: archiveReason }),
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.members)) {
        setMembers(data.members);
        saveStored('choir_members', data.members);
      }
      if (data?.success) broadcastParishSync('members');
      return data;
    } catch (e: any) {
      console.warn('Failed archiving member on server:', e);
      return { success: false, message: e.message || 'Network error communicating with server' };
    }
  };

  const handleReactivateMember = async (memberId: string, reason?: string): Promise<{ success: boolean; message?: string }> => {
    const reactivateReason = reason?.trim() || 'Administrative Reactivation';

    // Optimistic update
    const updatedList = members.map(m => {
      if (m.memberId === memberId) {
        const copy = { ...m, membershipStatus: 'Active' as const };
        delete copy.archiveReason;
        delete copy.archivedAt;
        delete copy.archivedBy;
        return copy;
      }
      return m;
    });
    setMembers(updatedList);
    saveStored('choir_members', updatedList);

    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch(`/api/members/${memberId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ reason: reactivateReason }),
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.members)) {
        setMembers(data.members);
        saveStored('choir_members', data.members);
      }
      if (data?.success) broadcastParishSync('members');
      return data;
    } catch (e: any) {
      console.warn('Failed reactivating member on server:', e);
      return { success: false, message: e.message || 'Network error communicating with server' };
    }
  };

  const handleDeleteMember = async (memberId: string, reason: string): Promise<{ success: boolean; message?: string; blocked?: boolean; counts?: any }> => {
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data && data.success) {
        const remaining = members.filter(m => m.memberId !== memberId);
        setMembers(remaining);
        saveStored('choir_members', remaining);
        broadcastParishSync('members');
      }
      return data;
    } catch (e: any) {
      console.warn('Failed deleting member on server:', e);
      return { success: false, message: e.message || 'Network error communicating with server' };
    }
  };

  // Schedule Call-time Override & Audit
  const handleUpdateSessionTime = (
    sessionId: string,
    newTime: string,
    reason: string,
    officer: string,
    newStatus?: 'Published' | 'Updated'
  ) => {
    const target = sessions.find(s => s.sessionId === sessionId);
    if (!target) return;

    const oldTime = target.requiredArrivalTime;
    const auditId = `AUD-SCH-${Date.now()}`;
    const newAudit: ScheduleChangeAudit = {
      auditId,
      sessionId,
      oldTime,
      newTime,
      reason,
      modifiedBy: officer,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    const updatedAudits = [newAudit, ...scheduleAudits];
    const updatedSessions = sessions.map(s => s.sessionId === sessionId ? { 
      ...s, 
      requiredArrivalTime: newTime,
      revisionReason: reason,
      sessionStatus: newStatus || 'Updated'
    } : s);
    setScheduleAudits(updatedAudits);
    setSessions(updatedSessions);
    void persistPartialUpdate({ scheduleAudits: updatedAudits, sessions: updatedSessions });
  };

  const handleCreateSession = async (newSession: RehearsalSession) => {
    setSessions(prev => [newSession, ...prev]);
    saveStored('choir_sessions', [newSession, ...sessions]);
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify(newSession),
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        saveStored('choir_sessions', data.sessions);
      }
      if (data?.success) broadcastParishSync('sessions');
    } catch (e) {
      console.warn('Failed creating session on server:', e);
    }
  };

  // Attendance Handlers (Instant Server & Firestore Persistence)
  const handleRecordAttendance = async (record: AttendanceRecord) => {
    setAttendanceRecords(prev => [record, ...prev]);
    saveStored('choir_attendance', [record, ...attendanceRecords]);
    const token = sessionStorage.getItem('executive_token') || sessionStorage.getItem('member_token');
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify(record),
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.attendanceRecords)) {
        setAttendanceRecords(data.attendanceRecords);
        saveStored('choir_attendance', data.attendanceRecords);
      }
      if (data?.success) broadcastParishSync('attendance');
    } catch (e) {
      console.warn('Failed recording attendance on server:', e);
    }
  };

  const handleCorrectAttendance = (attendanceId: string, newTime: string, reason: string) => {
    const updatedRecords = attendanceRecords.map(r => {
      if (r.attendanceId === attendanceId) {
        return { ...r, actualArrivalTime: newTime, notes: `${r.notes || ''} [Corrected: ${reason}]` };
      }
      return r;
    });
    setAttendanceRecords(updatedRecords);
    void persistPartialUpdate({ attendanceRecords: updatedRecords });
  };

  // Finalise Session & Assess Fines
  const handleFinaliseSession = (sessionId: string) => {
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 21);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const newFines: FineRecord[] = [];

    const updatedRecords = attendanceRecords.map(r => {
      if (r.sessionId === sessionId) {
        let fine = 0;
        let violationType: any = '';

        if (r.classification === 'Late') {
          fine = session.latePenaltyAmount || settings.defaultLateFine;
          violationType = 'Late Arrival';
        } else if (r.classification === 'Absent') {
          fine = session.absencePenaltyAmount || settings.defaultAbsenceFine;
          violationType = 'Unexcused Absence';
        }

        if (fine > 0) {
          const fineId = `FINE-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
          newFines.push({
            fineId,
            memberId: r.memberId,
            memberName: r.memberName,
            sessionId,
            date: todayStr,
            violationType,
            amount: fine,
            assessmentTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            assessmentOfficer: settings.provostName,
            isExempted: false,
            paymentStatus: 'Unpaid',
            dueDate: dueDateStr,
          });

          return { ...r, fineAssessed: fine, fineId };
        }
      }
      return r;
    });

    const updatedFines = [...newFines, ...fines];
    const updatedSessions = sessions.map(s => s.sessionId === sessionId ? { ...s, sessionStatus: 'Finalised' as const } : s);
    setAttendanceRecords(updatedRecords);
    setFines(updatedFines);
    setSessions(updatedSessions);
    void persistPartialUpdate({
      attendanceRecords: updatedRecords,
      fines: updatedFines,
      sessions: updatedSessions,
    });
  };

  // Payment Handlers (Instant Server & Firestore Persistence)
  const handleRecordPayment = async (payment: PaymentRecord) => {
    setPayments(prev => [payment, ...prev]);
    saveStored('choir_payments', [payment, ...payments]);
    if (payment.fineId) {
      setFines(prev => {
        const updated = prev.map(f =>
          f.fineId === payment.fineId
            ? { ...f, paymentStatus: 'Paid' as const, paymentDate: payment.paymentDate }
            : f
        );
        saveStored('choir_fines', updated);
        return updated;
      });
    }
    const movement: FundMovementRecord = {
      movementId: `FND-${Date.now()}`,
      date: payment.paymentDate,
      type: payment.paymentMethod === 'Cash' ? 'Fine Collection (Cash)' : 'Fine Collection (Bank)',
      amount: payment.amount,
      description: `Payment from ${payment.memberName} (${payment.receiptNumber})`,
      recordedBy: payment.receivedBy,
    };
    setFundMovements(prev => [movement, ...prev]);
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify(payment),
      });
      const data = await res.json();
      if (data && data.success) {
        if (Array.isArray(data.payments)) {
          setPayments(data.payments);
          saveStored('choir_payments', data.payments);
        }
        if (Array.isArray(data.fines)) {
          setFines(data.fines);
          saveStored('choir_fines', data.fines);
        }
        if (Array.isArray(data.fundMovements)) {
          setFundMovements(data.fundMovements);
          saveStored('choir_funds', data.fundMovements);
        }
        broadcastParishSync('payments');
      }
    } catch (e) {
      console.warn('Failed recording payment on server:', e);
    }
  };

  // Disciplinary Handlers (21-Day Debt)
  const handleIssueQuery = async (query: QueryRecord) => {
    setQueries(prev => [query, ...prev]);
    setMembers(prev => prev.map(m => m.memberId === query.memberId ? { ...m, membershipStatus: 'Under Query' } : m));
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/discipline/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify(query),
      });
      if (res.ok) broadcastParishSync('discipline');
    } catch (e) {
      console.warn('Failed issuing query on server:', e);
    }
  };

  const handleRecordQueryResponse = (queryId: string, responseText: string) => {
    const updatedQueries = queries.map(q => {
      if (q.queryId === queryId) {
        return {
          ...q,
          status: 'Response Received' as const,
          memberResponseDate: new Date().toISOString().split('T')[0],
          memberResponseText: responseText,
        };
      }
      return q;
    });
    setQueries(updatedQueries);
    void persistPartialUpdate({ queries: updatedQueries });
  };

  const handleExecutiveDecision = (queryId: string, decision: any, notes: string) => {
    const updatedQueries = queries.map(q => {
      if (q.queryId === queryId) {
        return {
          ...q,
          status: (decision === 'Suspension Recommended' ? 'Suspension Recommended' : 'Resolved') as QueryRecord['status'],
          executiveReviewDate: new Date().toISOString().split('T')[0],
          executiveDecision: decision,
          decisionNotes: notes,
        };
      }
      return q;
    });
    setQueries(updatedQueries);
    void persistPartialUpdate({ queries: updatedQueries });
  };

  const handleApproveSuspension = async (suspension: SuspensionRecord) => {
    setSuspensions(prev => [suspension, ...prev]);
    setMembers(prev => prev.map(m => m.memberId === suspension.memberId ? { ...m, membershipStatus: 'Suspended' } : m));
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/discipline/suspension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify(suspension),
      });
      if (res.ok) broadcastParishSync('discipline');
    } catch (e) {
      console.warn('Failed approving suspension on server:', e);
    }
  };

  const handleReinstateMember = async (suspensionId: string, memberId: string) => {
    setSuspensions(prev => prev.map(s => {
      if (s.suspensionId === suspensionId) {
        return {
          ...s,
          isReinstated: true,
          reinstatementDate: new Date().toISOString().split('T')[0],
          reinstatedBy: settings.choirMasterName,
        };
      }
      return s;
    }));
    setMembers(prev => prev.map(m => m.memberId === memberId ? { ...m, membershipStatus: 'Active' } : m));
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/discipline/reinstate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify({ suspensionId, memberId }),
      });
      if (res.ok) broadcastParishSync('discipline');
    } catch (e) {
      console.warn('Failed reinstating member on server:', e);
    }
  };

  const handleSubmitAbsence = async (absence: AbsenceNotification) => {
    setAbsences(prev => [absence, ...prev]);
    const token = sessionStorage.getItem('member_token') || sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify(absence),
      });
      if (res.ok) broadcastParishSync('absences');
    } catch (e) {
      console.warn('Failed submitting absence on server:', e);
    }
  };

  const handleSubmitComplaint = async (complaint: ComplaintRecord) => {
    setComplaints(prev => [complaint, ...prev]);
    const token = sessionStorage.getItem('member_token') || sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify(complaint),
      });
      if (res.ok) broadcastParishSync('complaints');
    } catch (e) {
      console.warn('Failed submitting complaint on server:', e);
    }
  };

  // Phase 2 Handlers: Monthly Dues Operations
  const handleGenerateDuesCycle = async (billingMonth: string, amount?: number) => {
    try {
      const token = sessionStorage.getItem('executive_token');
      const res = await fetch('/api/dues/generate-cycle', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ billingMonth, amount }),
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.assessments)) {
        setMonthlyDues(data.assessments);
        saveStored('choir_monthly_dues', data.assessments);
        broadcastParishSync('dues');
      }
      return data;
    } catch (e) {
      console.error('Failed generating cycle:', e);
      return { success: false, message: 'Server error' };
    }
  };

  const handleRecordDuesPayment = async (assessmentId: string, amount: number, method: string, reference?: string) => {
    try {
      const token = sessionStorage.getItem('executive_token');
      const res = await fetch('/api/dues/record-payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ assessmentId, amount, method, reference }),
      });
      const data = await res.json();
      if (data && data.success) {
        if (Array.isArray(data.assessments)) {
          setMonthlyDues(data.assessments);
          saveStored('choir_monthly_dues', data.assessments);
        } else if (data.assessment) {
          setMonthlyDues(prev => {
            const next = prev.map(a => a.assessmentId === assessmentId ? data.assessment : a);
            saveStored('choir_monthly_dues', next);
            return next;
          });
        }
        broadcastParishSync('dues');
      }
      return data;
    } catch (e) {
      console.error('Failed recording dues payment:', e);
      return { success: false, message: 'Server error' };
    }
  };

  const handleExemptDues = async (assessmentId: string, reason: string) => {
    try {
      const token = sessionStorage.getItem('executive_token');
      const res = await fetch('/api/dues/exempt', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ assessmentId, reason }),
      });
      const data = await res.json();
      if (data && data.success) {
        if (Array.isArray(data.assessments)) {
          setMonthlyDues(data.assessments);
          saveStored('choir_monthly_dues', data.assessments);
        } else if (data.assessment) {
          setMonthlyDues(prev => {
            const next = prev.map(a => a.assessmentId === assessmentId ? data.assessment : a);
            saveStored('choir_monthly_dues', next);
            return next;
          });
        }
        broadcastParishSync('dues');
      }
      return data;
    } catch (e) {
      console.error('Failed exempting dues:', e);
      return { success: false, message: 'Server error' };
    }
  };

  // Phase 2 Handlers: Dual-Officer Bank Details Operations
  const handleProposeBankDetails = async (newDetails: BankDetails, reason: string) => {
    try {
      const token = sessionStorage.getItem('executive_token');
      const res = await fetch('/api/bank-details/propose', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          bankName: newDetails.bankName,
          accountName: newDetails.accountName,
          accountNumber: newDetails.accountNumber,
          paymentInstructions: newDetails.narrationInstructions || newDetails.paymentInstructions,
          paymentContact: newDetails.paymentContact,
          reason,
          proposedByOfficer: currentExecutive?.name || settings.provostName,
          proposedByPosition: currentExecutive?.role || currentExecutiveRole,
        }),
      });
      const data = await res.json();
      if (data && data.success && data.proposal) {
        setBankProposal(data.proposal);
        saveStored('choir_bank_proposal', data.proposal);
        broadcastParishSync('bank-proposal');
      }
      return data;
    } catch (e) {
      console.error('Failed proposing bank details:', e);
      return { success: false, message: 'Server error' };
    }
  };

  const handleApproveBankDetails = async (proposalId: string) => {
    try {
      const token = sessionStorage.getItem('executive_token');
      const res = await fetch('/api/bank-details/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          isApproved: true,
          proposalId,
          approvedByOfficer: currentExecutive?.name || settings.choirMasterName,
          approvedByPosition: currentExecutive?.role || currentExecutiveRole,
        }),
      });
      const data = await res.json();
      const activatedBank = data?.bankDetails || data?.officialBankDetails;
      if (data && data.success && activatedBank) {
        setSettings(prev => {
          const nextSettings = {
            ...prev,
            bankDetails: activatedBank,
            officialBankDetails: activatedBank,
          };
          saveStored('choir_settings', nextSettings);
          return nextSettings;
        });
        setBankProposal(null);
        saveStored('choir_bank_proposal', null);
        broadcastParishSync('bank-approve');
      }
      return data;
    } catch (e) {
      console.error('Failed approving bank details:', e);
      return { success: false, message: 'Server error' };
    }
  };

  // Phase 2 Handlers: Announcements & Directives
  const handleAddAnnouncement = async (announcementData: any) => {
    try {
      const token = sessionStorage.getItem('executive_token');
      const res = await fetch('/api/announcements/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify(announcementData),
      });
      const data = await res.json();
      if (data && data.success && data.announcement) {
        setAnnouncements(prev => {
          const next = [data.announcement, ...prev];
          saveStored('choir_announcements', next);
          return next;
        });
        broadcastParishSync('announcements');
      }
      return data;
    } catch (e) {
      console.error('Failed creating announcement:', e);
      return { success: false, message: 'Server error' };
    }
  };

  // Phase 2 Handlers: Member Submitting Bank Transfer
  const handleSubmitPaymentTransfer = async (transferData: any) => {
    try {
      const res = await fetch('/api/payments/submit-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferData),
      });
      return await res.json();
    } catch (e) {
      console.error('Failed submitting transfer:', e);
      return { success: false, message: 'Server error' };
    }
  };

  // 21-Day Debt Count for Disciplinary Badge
  const today = new Date();
  const overdueDebtCount = members.filter(m => {
    const memberFines = fines.filter(f => f.memberId === m.memberId && f.paymentStatus !== 'Paid' && f.paymentStatus !== 'Waived');
    return memberFines.some(f => {
      const fineDate = new Date(f.date);
      const diffDays = Math.floor((today.getTime() - fineDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 21;
    });
  }).length;

  const [sessionTick, setSessionTick] = useState(0);

  // 30-second interval to guarantee real-time session lifecycle transitions (Scheduled -> In Progress -> Finalised)
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTick(t => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const reconciledSessions = useMemo(() => {
    return reconcileSessions(sessions, undefined, settings.defaultSessionDurationHours);
  }, [sessions, settings.defaultSessionDurationHours, sessionTick]);

  const inProgressSession = useMemo(() => getActiveSession(reconciledSessions), [reconciledSessions]);
  const nextUpcomingSession = useMemo(() => getNextScheduledSession(reconciledSessions), [reconciledSessions]);
  const activeSessionName = inProgressSession ? `${inProgressSession.activityType} (${inProgressSession.requiredArrivalTime})` : undefined;

  // Normalize retired executive/member tabs cleanly to dashboard
  useEffect(() => {
    if (isExecutiveUnlocked && activeTab === 'gallery') {
      setActiveTab('dashboard');
    }
  }, [isExecutiveUnlocked, activeTab]);

  // Derive evaluated welfare cases requiring attention for badge & dashboard
  const welfareAttentionCount = useMemo(() => {
    if (settings.welfareSettings?.welfareMonitoringEnabled === false) return 0;
    const welfareEval = evaluateWelfareCases(members, reconciledSessions, attendanceRecords, absences, settings, welfareCases);
    return welfareEval.summary.requiringAttention;
  }, [members, reconciledSessions, attendanceRecords, absences, settings, welfareCases]);

  // Derive logged in member's full record from members list (case-insensitive ID match with safe fallback)
  const activeChoristerRecord: Chorister | null = currentMember
    ? (members.find(m => String(m.memberId || '').trim().toUpperCase() === String(currentMember.memberId || '').trim().toUpperCase()) || {
        voicePart: 'Soprano',
        membershipDate: '',
        membershipStatus: 'Active',
        attendanceArrangement: 'Standard',
        registrationDate: '',
        ...(currentMember as unknown as Partial<Chorister>),
        memberId: currentMember.memberId,
        fullName: currentMember.fullName || '',
        phoneNumber: currentMember.phoneNumber || '',
      })
    : null;

  return (
    <div className="min-h-dvh bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Demo Test Mode Banner */}
      {isDemoMode && (
        <div className="bg-amber-400 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-2xs z-50">
          <span>⚠️ DEMO TEST MODE ACTIVE — Displaying sample test choristers and simulated fines.</span>
          <button
            onClick={handleUnloadDemoData}
            className="bg-slate-950 hover:bg-slate-800 text-white text-[11px] px-2.5 py-0.5 rounded font-semibold transition"
          >
            Unload Demo Data
          </button>
        </div>
      )}

      {/* Staging Fail-Closed Mode Banner */}
      {stagingConfigInfo?.required && (
        <aside aria-label="Staging configuration warning" className="bg-rose-950 border-b border-rose-800 text-rose-100 px-4 py-3 shadow-md z-50">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0" aria-hidden="true">🔒</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Staging Fail-Closed Protection Active — Production Database Isolated
                </p>
                <p className="text-xs text-rose-200 mt-0.5 leading-relaxed">
                  {stagingConfigInfo.error
                    ? stagingConfigInfo.error
                    : <>The application is in development/staging mode with live production Firestore (<code className="bg-rose-900/80 px-1 py-0.5 rounded text-amber-300 font-mono">iron-mender-0t8c4</code>) strictly isolated. Data writes and private records are halted until dedicated staging credentials are provided.</>}
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono bg-black/40 border border-rose-800/60 rounded px-2.5 py-1.5 text-rose-300 shrink-0">
              {stagingConfigInfo.error && stagingConfigInfo.error.includes('connection failed')
                ? 'Action: Update Firestore Rules in omph-choir-staging'
                : 'Required: STAGING_FIREBASE_PROJECT_ID, STAGING_FIRESTORE_DATABASE_ID, STAGING_FIREBASE_API_KEY, STAGING_FIREBASE_APP_ID'}
            </div>
          </div>
        </aside>
      )}

      {isExecutiveUnlocked ? (
        /* ========================================================
           EXPERIENCE 1: EXECUTIVE MANAGEMENT CONSOLE
           Persistent left sidebar, role management, KPI dashboards, dues & audit trail
           ======================================================== */
        <div className="flex-1 flex min-h-dvh">
          {/* Persistent Left Sidebar */}
          <ExecutiveSidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onLockExecutive={handleLockExecutive}
            settings={settings}
            overdueCount={overdueDebtCount}
            welfareCount={welfareAttentionCount}
            activeSessionName={activeSessionName}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            currentExecutive={currentExecutive}
            onOpenChangePassword={() => setShowExecPasswordModal(true)}
          />

          {/* Main Executive Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-100/70">
            {/* Top Executive Header Bar */}
            <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-2xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                  aria-label="Open sidebar navigation"
                >
                  <Menu className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2.5">
                  <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                  <div>
                    <h1 className="text-sm font-bold text-slate-900 capitalize">
                      {activeTab.replace('-', ' ')}
                    </h1>
                    <p className="text-[11px] text-slate-500 hidden sm:block">
                      {settings.parishName} · Executive Console
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {activeSessionName && (
                  <span className="hidden md:inline-flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-md font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {activeSessionName}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 text-slate-800 font-semibold px-2.5 py-1 rounded-md border border-slate-200 hidden sm:inline-block">
                    {currentExecutive ? `${currentExecutive.name} (${currentExecutive.role})` : currentExecutiveRole}
                  </span>

                  <button
                    onClick={() => setShowExecPasswordModal(true)}
                    className="text-xs bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 px-2.5 py-1 rounded-md transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    title="Change your individual officer password"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Change Password</span>
                  </button>

                  <button
                    onClick={handleLockExecutive}
                    className="text-xs bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 px-3 py-1 rounded-md transition shadow-2xs"
                  >
                    Lock
                  </button>
                </div>
              </div>
            </header>

            {/* Management Body */}
            <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
              {activeTab === 'dashboard' && (
                <ExecutiveDashboard
                  members={members}
                  sessions={reconciledSessions}
                  activeSession={inProgressSession}
                  nextSession={nextUpcomingSession}
                  attendanceRecords={attendanceRecords}
                  fines={fines}
                  payments={payments}
                  adjustments={adjustments}
                  fundMovements={fundMovements}
                  queries={queries}
                  absences={absences}
                  accommodations={accommodations}
                  setActiveTab={setActiveTab}
                  settings={settings}
                  monthlyDues={monthlyDues}
                  bankProposal={bankProposal}
                  welfareCases={welfareCases}
                />
              )}

              {activeTab === 'attendance' && (
                <AttendanceManager
                  sessions={reconciledSessions}
                  members={members}
                  attendanceRecords={attendanceRecords}
                  onRecordAttendance={handleRecordAttendance}
                  onFinaliseSession={handleFinaliseSession}
                  onCorrectAttendance={handleCorrectAttendance}
                />
              )}

              {activeTab === 'schedule' && (
                <ScheduleManager
                  sessions={reconciledSessions}
                  scheduleAudits={scheduleAudits}
                  onUpdateSessionTime={handleUpdateSessionTime}
                  onCreateSession={handleCreateSession}
                  onDeleteSession={handleClearSessions}
                />
              )}

              {activeTab === 'roster' && (
                <MembershipManager
                  members={members}
                  onAddMember={handleAddMember}
                  onUpdateMember={handleUpdateMember}
                  onArchiveMember={handleArchiveMember}
                  onReactivateMember={handleReactivateMember}
                  onDeleteMember={handleDeleteMember}
                  currentExecutive={currentExecutive}
                  attendanceRecords={attendanceRecords}
                  fines={fines}
                  payments={payments}
                  monthlyDues={monthlyDues}
                  queries={queries}
                  suspensions={suspensions}
                  complaints={complaints}
                  accommodations={accommodations}
                  absences={absences}
                  settings={settings}
                />
              )}

              {activeTab === 'finance' && (
                <FinanceManager
                  members={members}
                  fines={fines}
                  payments={payments}
                  adjustments={adjustments}
                  fundMovements={fundMovements}
                  onRecordPayment={handleRecordPayment}
                  onRecordAdjustment={(adj) => {
                    const updatedAdjustments = [adj, ...adjustments];
                    setAdjustments(updatedAdjustments);
                    void persistPartialUpdate({ adjustments: updatedAdjustments });
                  }}
                />
              )}

              {activeTab === 'dues' && (
                <MonthlyDuesManager
                  monthlyDues={monthlyDues}
                  members={members}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onGenerateCycle={handleGenerateDuesCycle}
                  onRecordDuesPayment={handleRecordDuesPayment}
                  onExemptDues={handleExemptDues}
                  currentExecutive={currentExecutive}
                />
              )}

              {activeTab === 'discipline' && (
                <DisciplineManager
                  members={members}
                  fines={fines}
                  queries={queries}
                  suspensions={suspensions}
                  onIssueQuery={handleIssueQuery}
                  onRecordQueryResponse={handleRecordQueryResponse}
                  onExecutiveDecision={handleExecutiveDecision}
                  onApproveSuspension={handleApproveSuspension}
                  onReinstateMember={handleReinstateMember}
                />
              )}

              {activeTab === 'announcements' && (
                <ChoirAnnouncementsManager
                  announcements={announcements}
                  onAddAnnouncement={handleAddAnnouncement}
                  settings={settings}
                  currentExecutive={currentExecutive}
                />
              )}

              {activeTab === 'songs' && (
                <SongLibrary
                  songs={songs}
                  onAddSong={handleAddSong}
                  onUpdateSong={handleUpdateSong}
                  onDeleteSong={handleDeleteSong}
                  isExecutive={true}
                  settings={settings}
                />
              )}

              {activeTab === 'settings' && (
                <ChurchSettings
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  members={members}
                  onClearDemoData={handleClearDemoData}
                  onRestoreDemoData={handleRestoreDemoData}
                  onBulkAddMembers={handleBulkAddMembers}
                  onExportBackup={handleExportBackup}
                  isDemoMode={isDemoMode}
                  onUnloadDemoData={handleUnloadDemoData}
                  onClearMainLogs={handleClearMainLogs}
                  onClearSessions={handleClearSessions}
                  currentExecutive={currentExecutive}
                  bankProposal={bankProposal}
                  onProposeBankDetails={handleProposeBankDetails}
                  onApproveBankDetails={handleApproveBankDetails}
                  onRefreshData={async () => {
                    await loadChurchData();
                    broadcastParishSync('settings-refresh');
                  }}
                />
              )}

              {activeTab === 'welfare' && (
                <WelfareManager
                  members={members}
                  sessions={reconciledSessions}
                  attendanceRecords={attendanceRecords}
                  absences={absences}
                  settings={settings}
                  currentExecutive={currentExecutive}
                  welfareCases={welfareCases}
                  onWelfareCasesChange={(updated) => {
                    setWelfareCases(updated);
                    saveStored('choir_welfare_cases', updated);
                    broadcastParishSync('welfare');
                  }}
                  onOpenDossier={(member) => {
                    // Navigate to roster tab where dossier can be viewed/edited
                    setActiveTab('roster');
                  }}
                  onUpdateSettings={handleUpdateSettings}
                />
              )}

              {activeTab === 'audit-logs' && (
                <AuditLogViewer logs={auditLogs} />
              )}
            </main>

            {/* Officer Change Password Modal */}
            <ExecutiveChangePasswordModal
              isOpen={showExecPasswordModal}
              onClose={() => setShowExecPasswordModal(false)}
              currentExecutive={currentExecutive}
              onChangePassword={handleExecutiveChangePassword}
            />

            <footer className="bg-white/95 border-t border-slate-200 py-3 text-center text-xs text-slate-500 mt-auto">
              <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
                <span>{settings.parishName} — Executive Management System</span>
                <span className="text-[11px] text-slate-400">
                  Provost & Disciplinary Ministry Console
                </span>
              </div>
            </footer>
          </div>
        </div>
      ) : currentMember ? (
        /* ========================================================
           EXPERIENCE 2: AUTHENTICATED CHORISTER MEMBER PORTAL
           Quiet, dignified, individual member dashboard & activities
           ======================================================== */
        <>
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isExecutiveUnlocked={isExecutiveUnlocked}
            onUnlockExecutive={handleUnlockExecutive}
            onLockExecutive={handleLockExecutive}
            settings={settings}
            activeSessionName={activeSessionName}
            overdueCount={overdueDebtCount}
            currentMember={currentMember}
            currentExecutive={currentExecutive}
            onMemberLogin={handleMemberLogin}
            onMemberActivate={handleMemberActivate}
            onMemberResetPassword={handleMemberResetPassword}
            onMemberLogout={handleMemberLogout}
            onExecutiveLogin={handleExecutiveLogin}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
            <MemberPortal
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              members={members}
              sessions={reconciledSessions}
              activeSession={inProgressSession}
              nextSession={nextUpcomingSession}
              attendanceRecords={attendanceRecords}
              fines={fines}
              payments={payments}
              adjustments={adjustments}
              monthlyDues={monthlyDues}
              announcements={announcements}
              songs={songs}
              onRecordAttendance={handleRecordAttendance}
              onSubmitAbsence={handleSubmitAbsence}
              onSubmitComplaint={handleSubmitComplaint}
              onSubmitPaymentTransfer={handleSubmitPaymentTransfer}
              onChangePassword={handleMemberChangePassword}
              onMemberProfileUpdated={handleMemberProfileUpdated}
              settings={settings}
              currentMember={activeChoristerRecord}
              onLogout={handleMemberLogout}
            />
          </main>

          <footer className="bg-white/95 backdrop-blur-xs border-t border-slate-200 py-3.5 text-center text-xs text-slate-500 mt-auto">
            <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
              <span>{settings.parishName} — {settings.choirName}</span>
              <span className="text-[11px] text-slate-400">
                Chorister Ministry Portal · {settings.diocese || 'Catholic Diocese of Ilorin'}
              </span>
            </div>
          </footer>
        </>
      ) : (
        /* ========================================================
           EXPERIENCE 3: PUBLIC LANDING PAGE (UNAUTHENTICATED VISITORS)
           Wide horizontal hero banner (1.69:1) & Central Member Login Card
           No check-in container or member dashboard before logging in.
           Discreet executive access link to /office-access
           ======================================================== */
        <PublicLandingPage
          settings={settings}
          activeSession={inProgressSession || undefined}
          nextSession={nextUpcomingSession || undefined}
          totalMembers={members.length}
          hasAdminAccount={hasAdminAccount}
          onMemberLogin={handleMemberLogin}
          onMemberActivate={handleMemberActivate}
          onMemberResetPassword={handleMemberResetPassword}
          onExecutiveLogin={handleExecutiveLogin}
          onExecutiveBootstrap={handleExecutiveBootstrap}
          initialOfficeAccess={
            typeof window !== 'undefined' && (
              window.location.pathname.includes('office-access') || 
              window.location.hash.includes('office-access') ||
              window.location.search.includes('office-access')
            )
          }
        />
      )}
    </div>
  );
}
