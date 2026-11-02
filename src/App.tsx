import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { MemberPortal } from './components/MemberPortal';
import { AttendanceManager } from './components/AttendanceManager';
import { ScheduleManager } from './components/ScheduleManager';
import { MembershipManager } from './components/MembershipManager';
import { FinanceManager } from './components/FinanceManager';
import { DisciplineManager } from './components/DisciplineManager';
import { ChurchSettings } from './components/ChurchSettings';
import { SongLibrary } from './components/SongLibrary';
import { ChoirGallery } from './components/ChoirGallery';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';

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
  cleanInitialGallery,
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
  ChoirGalleryItem
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

  // Demo Mode state
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => 
    loadStored('choir_is_demo_mode', false)
  );

  // Real Church Default States (Clean placeholders, no demo noise)
  const [settings, setSettings] = useState<SystemSettings>(() => 
    loadStored('choir_settings', initialSettings)
  );

  const [members, setMembers] = useState<Chorister[]>(() => 
    loadStored('choir_members', cleanInitialMembers)
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
    loadStored('choir_songs', cleanInitialSongs)
  );

  const [gallery, setGallery] = useState<ChoirGalleryItem[]>(() => 
    loadStored('choir_gallery', cleanInitialGallery)
  );

  // Cross-device synchronization hydration guard
  const isHydratedFromServer = useRef(false);

  // Authentication & Access Control
  const [isExecutiveUnlocked, setIsExecutiveUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('executive_unlocked') === 'true';
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    return isExecutiveUnlocked ? 'dashboard' : 'member-checkin';
  });

  // Fetch persisted data from Express server on load for cross-browser synchronization
  useEffect(() => {
    fetch('/api/church-data')
      .then(res => res.json())
      .then(result => {
        if (result && result.success && result.data && Object.keys(result.data).length > 0) {
          const d = result.data;
          if (d.settings) {
            setSettings(d.settings);
            saveStored('choir_settings', d.settings);
          }
          if (Array.isArray(d.members)) {
            setMembers(d.members);
            saveStored('choir_members', d.members);
          }
          if (Array.isArray(d.sessions)) {
            setSessions(d.sessions);
            saveStored('choir_sessions', d.sessions);
          }
          if (Array.isArray(d.attendanceRecords)) {
            setAttendanceRecords(d.attendanceRecords);
            saveStored('choir_attendance', d.attendanceRecords);
          }
          if (Array.isArray(d.fines)) setFines(d.fines);
          if (Array.isArray(d.payments)) setPayments(d.payments);
          if (Array.isArray(d.adjustments)) setAdjustments(d.adjustments);
          if (Array.isArray(d.absences)) setAbsences(d.absences);
          if (Array.isArray(d.accommodations)) setAccommodations(d.accommodations);
          if (Array.isArray(d.queries)) setQueries(d.queries);
          if (Array.isArray(d.suspensions)) setSuspensions(d.suspensions);
          if (Array.isArray(d.complaints)) setComplaints(d.complaints);
          if (Array.isArray(d.fundMovements)) setFundMovements(d.fundMovements);
          if (Array.isArray(d.songs) && d.songs.length > 0) {
            setSongs(d.songs);
            saveStored('choir_songs', d.songs);
          }
          if (Array.isArray(d.gallery) && d.gallery.length > 0) {
            setGallery(d.gallery);
            saveStored('choir_gallery', d.gallery);
          }
          if (d.isDemoMode !== undefined) setIsDemoMode(d.isDemoMode);
        }
        isHydratedFromServer.current = true;
      })
      .catch(e => {
        console.warn('Could not sync from server (offline):', e);
        isHydratedFromServer.current = true;
      });
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
  useEffect(() => saveStored('choir_gallery', gallery), [gallery]);

  // Debounced sync to Express server (persists across all browsers, phones & tabs)
  useEffect(() => {
    // CRITICAL: NEVER write to server before the initial fetch has hydrated this client!
    if (!isHydratedFromServer.current) return;

    const timer = setTimeout(() => {
      fetch('/api/church-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings,
          members,
          sessions,
          attendanceRecords,
          fines,
          payments,
          adjustments,
          absences,
          accommodations,
          queries,
          suspensions,
          complaints,
          fundMovements,
          songs,
          gallery,
          isDemoMode,
        }),
      }).catch(err => console.warn('Server sync error:', err));
    }, 700);

    return () => clearTimeout(timer);
  }, [settings, members, sessions, attendanceRecords, fines, payments, adjustments, absences, accommodations, queries, suspensions, complaints, fundMovements, songs, gallery, isDemoMode]);

  // Executive Unlock Handlers
  const handleUnlockExecutive = (pin: string): boolean => {
    if (pin.trim() === settings.executivePin.trim()) {
      setIsExecutiveUnlocked(true);
      sessionStorage.setItem('executive_unlocked', 'true');
      setActiveTab('dashboard');
      return true;
    }
    return false;
  };

  const handleLockExecutive = () => {
    setIsExecutiveUnlocked(false);
    sessionStorage.removeItem('executive_unlocked');
    setActiveTab('member-checkin');
  };

  // Launch Controls: Clear Records / Demo Data Management
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
    localStorage.removeItem('church_real_backup');
  };

  const handleRestoreDemoData = () => {
    // Preserve current real data in backup before switching to demo view
    const realBackup = {
      settings,
      members,
      sessions,
      scheduleAudits,
      attendanceRecords,
      fines,
      payments,
      adjustments,
      absences,
      accommodations,
      queries,
      suspensions,
      complaints,
      fundMovements,
    };
    saveStored('church_real_backup', realBackup);
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
  };

  const handleUnloadDemoData = () => {
    setIsDemoMode(false);
    const realBackup = loadStored<any>('church_real_backup', null);
    if (realBackup) {
      if (realBackup.settings) setSettings(realBackup.settings);
      setMembers(realBackup.members || cleanInitialMembers);
      setSessions(realBackup.sessions || cleanInitialSessions);
      setScheduleAudits(realBackup.scheduleAudits || cleanInitialScheduleAudits);
      setAttendanceRecords(realBackup.attendanceRecords || cleanInitialAttendanceRecords);
      setFines(realBackup.fines || cleanInitialFines);
      setPayments(realBackup.payments || cleanInitialPayments);
      setAdjustments(realBackup.adjustments || cleanInitialAdjustments);
      setAbsences(realBackup.absences || cleanInitialAbsences);
      setAccommodations(realBackup.accommodations || cleanInitialAccommodations);
      setQueries(realBackup.queries || cleanInitialQueries);
      setSuspensions(realBackup.suspensions || cleanInitialSuspensions);
      setComplaints(realBackup.complaints || cleanInitialComplaints);
      setFundMovements(realBackup.fundMovements || cleanInitialFundMovements);
    } else {
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
    }
  };

  const handleBulkAddMembers = (newMembers: Chorister[]) => {
    setMembers(prev => [...prev, ...newMembers]);
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
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Choir_Database_Backup_${new Date().toISOString().split('T')[0]}.json`;
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

  // Parish Song Library Handlers
  const handleAddSong = (newSong: ChoirSong) => {
    setSongs(prev => [newSong, ...prev]);
  };

  const handleUpdateSong = (updatedSong: ChoirSong) => {
    setSongs(prev => prev.map(s => s.songId === updatedSong.songId ? updatedSong : s));
  };

  const handleDeleteSong = (songId: string) => {
    setSongs(prev => prev.filter(s => s.songId !== songId));
  };

  // Choir Gallery Handlers
  const handleAddPhoto = (newPhoto: ChoirGalleryItem) => {
    setGallery(prev => [newPhoto, ...prev]);
  };

  const handleDeletePhoto = (photoId: string) => {
    setGallery(prev => prev.filter(p => p.photoId !== photoId));
  };

  // Membership Handlers
  const handleAddMember = (newMember: Chorister) => {
    setMembers(prev => [...prev, newMember]);
  };

  const handleUpdateMember = (updated: Chorister) => {
    setMembers(prev => prev.map(m => m.memberId === updated.memberId ? updated : m));
  };

  // Schedule Call-time Override
  const handleUpdateSessionTime = (
    sessionId: string,
    newTime: string,
    reason: string,
    officer: string
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

    setScheduleAudits(prev => [newAudit, ...prev]);
    setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, requiredArrivalTime: newTime } : s));
  };

  const handleCreateSession = (newSession: RehearsalSession) => {
    setSessions(prev => [newSession, ...prev]);
  };

  // Attendance Handlers
  const handleRecordAttendance = (record: AttendanceRecord) => {
    setAttendanceRecords(prev => [record, ...prev]);
  };

  const handleCorrectAttendance = (attendanceId: string, newTime: string, reason: string) => {
    setAttendanceRecords(prev => prev.map(r => {
      if (r.attendanceId === attendanceId) {
        return { ...r, actualArrivalTime: newTime, notes: `${r.notes || ''} [Corrected: ${reason}]` };
      }
      return r;
    }));
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

    setAttendanceRecords(updatedRecords);
    setFines(prev => [...newFines, ...prev]);
    setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, sessionStatus: 'Finalised' } : s));
  };

  // Payment Handlers
  const handleRecordPayment = (payment: PaymentRecord) => {
    setPayments(prev => [payment, ...prev]);
    const movement: FundMovementRecord = {
      movementId: `FND-${Date.now()}`,
      date: payment.paymentDate,
      type: payment.paymentMethod === 'Cash' ? 'Fine Collection (Cash)' : 'Fine Collection (Bank)',
      amount: payment.amount,
      description: `Payment from ${payment.memberName} (${payment.receiptNumber})`,
      recordedBy: payment.receivedBy,
    };
    setFundMovements(prev => [movement, ...prev]);
  };

  // Disciplinary Handlers (21-Day Debt)
  const handleIssueQuery = (query: QueryRecord) => {
    setQueries(prev => [query, ...prev]);
    setMembers(prev => prev.map(m => m.memberId === query.memberId ? { ...m, membershipStatus: 'Under Query' } : m));
  };

  const handleRecordQueryResponse = (queryId: string, responseText: string) => {
    setQueries(prev => prev.map(q => {
      if (q.queryId === queryId) {
        return {
          ...q,
          status: 'Response Received',
          memberResponseDate: new Date().toISOString().split('T')[0],
          memberResponseText: responseText,
        };
      }
      return q;
    }));
  };

  const handleExecutiveDecision = (queryId: string, decision: any, notes: string) => {
    setQueries(prev => prev.map(q => {
      if (q.queryId === queryId) {
        return {
          ...q,
          status: decision === 'Suspension Recommended' ? 'Suspension Recommended' : 'Resolved',
          executiveReviewDate: new Date().toISOString().split('T')[0],
          executiveDecision: decision,
          decisionNotes: notes,
        };
      }
      return q;
    }));
  };

  const handleApproveSuspension = (suspension: SuspensionRecord) => {
    setSuspensions(prev => [suspension, ...prev]);
    setMembers(prev => prev.map(m => m.memberId === suspension.memberId ? { ...m, membershipStatus: 'Suspended' } : m));
  };

  const handleReinstateMember = (suspensionId: string, memberId: string) => {
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
  };

  const handleSubmitAbsence = (absence: AbsenceNotification) => {
    setAbsences(prev => [absence, ...prev]);
  };

  const handleSubmitComplaint = (complaint: ComplaintRecord) => {
    setComplaints(prev => [complaint, ...prev]);
  };

  // Overdue count for badge
  const today = new Date();
  const overdueDebtCount = members.filter(m => {
    const memberFines = fines.filter(f => f.memberId === m.memberId && f.paymentStatus !== 'Paid' && f.paymentStatus !== 'Waived');
    return memberFines.some(f => {
      const fineDate = new Date(f.date);
      const diffDays = Math.floor((today.getTime() - fineDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 21;
    });
  }).length;

  const inProgressSession = sessions.find(s => s.sessionStatus === 'In Progress') || sessions[0];
  const activeSessionName = inProgressSession ? `${inProgressSession.activityType} (${inProgressSession.requiredArrivalTime})` : undefined;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
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

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isExecutiveUnlocked={isExecutiveUnlocked}
        onUnlockExecutive={handleUnlockExecutive}
        onLockExecutive={handleLockExecutive}
        settings={settings}
        activeSessionName={activeSessionName}
        overdueCount={overdueDebtCount}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* If Executive is LOCKED -> Member Portal or Public Features */}
        {!isExecutiveUnlocked ? (
          <>
            {activeTab === 'member-songs' ? (
              <SongLibrary
                songs={songs}
                onAddSong={handleAddSong}
                onUpdateSong={handleUpdateSong}
                onDeleteSong={handleDeleteSong}
                isExecutive={false}
                settings={settings}
              />
            ) : activeTab === 'member-gallery' ? (
              <ChoirGallery
                galleryItems={gallery}
                onAddPhoto={handleAddPhoto}
                onDeletePhoto={handleDeletePhoto}
                isExecutive={false}
                settings={settings}
              />
            ) : (
              <MemberPortal
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                members={members}
                sessions={sessions}
                attendanceRecords={attendanceRecords}
                onRecordAttendance={handleRecordAttendance}
                onSubmitAbsence={handleSubmitAbsence}
                onSubmitComplaint={handleSubmitComplaint}
                settings={settings}
              />
            )}
          </>
        ) : (
            // If Executive is UNLOCKED -> Full Executive Management Console
            <>
              {activeTab === 'dashboard' && (
                <ExecutiveDashboard
                  members={members}
                  sessions={sessions}
                  attendanceRecords={attendanceRecords}
                  fines={fines}
                  payments={payments}
                  queries={queries}
                  absences={absences}
                  accommodations={accommodations}
                  setActiveTab={setActiveTab}
                  settings={settings}
                />
              )}

              {activeTab === 'attendance' && (
                <AttendanceManager
                  sessions={sessions}
                  members={members}
                  attendanceRecords={attendanceRecords}
                  onRecordAttendance={handleRecordAttendance}
                  onFinaliseSession={handleFinaliseSession}
                  onCorrectAttendance={handleCorrectAttendance}
                />
              )}

              {activeTab === 'schedule' && (
                <ScheduleManager
                  sessions={sessions}
                  scheduleAudits={scheduleAudits}
                  onUpdateSessionTime={handleUpdateSessionTime}
                  onCreateSession={handleCreateSession}
                />
              )}

              {activeTab === 'roster' && (
                <MembershipManager
                  members={members}
                  onAddMember={handleAddMember}
                  onUpdateMember={handleUpdateMember}
                  attendanceRecords={attendanceRecords}
                  fines={fines}
                  payments={payments}
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
                  onRecordAdjustment={(adj) => setAdjustments(prev => [adj, ...prev])}
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

              {activeTab === 'gallery' && (
                <ChoirGallery
                  galleryItems={gallery}
                  onAddPhoto={handleAddPhoto}
                  onDeletePhoto={handleDeletePhoto}
                  isExecutive={true}
                  settings={settings}
                />
              )}

              {activeTab === 'settings' && (
                <ChurchSettings
                  settings={settings}
                  onUpdateSettings={setSettings}
                  members={members}
                  onClearDemoData={handleClearDemoData}
                  onRestoreDemoData={handleRestoreDemoData}
                  onBulkAddMembers={handleBulkAddMembers}
                  onExportBackup={handleExportBackup}
                  isDemoMode={isDemoMode}
                  onUnloadDemoData={handleUnloadDemoData}
                  onClearMainLogs={handleClearMainLogs}
                  onClearSessions={handleClearSessions}
                />
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white/95 backdrop-blur-xs border-t border-slate-200 py-3.5 text-center text-xs text-slate-500 mt-auto">
          <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
            <span>{settings.parishName} — {settings.choirName}</span>
            <span className="text-[11px] text-slate-400">
              {isExecutiveUnlocked ? 'Executive Management Console' : 'Chorister Portal'}
            </span>
          </div>
        </footer>
    </div>
  );
}
