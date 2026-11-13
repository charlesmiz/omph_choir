import { 
  Chorister, 
  RehearsalSession, 
  AttendanceRecord, 
  AbsenceNotification, 
  WelfareSettings, 
  WelfareFollowUpCase,
  WelfareFollowUpStatus,
  SystemSettings
} from '../types';

export const DEFAULT_WELFARE_SETTINGS: WelfareSettings = {
  welfareMonitoringEnabled: true,
  unexcusedAbsenceThreshold: 2,
  evaluationWindowGatherings: 4,
  eligibleGatherings: [
    'Friday Rehearsal', 
    'Saturday Rehearsal', 
    'Sunday Pre-Mass', 
    'Sunday Post-Mass', 
    'Special Programme'
  ],
  timezone: 'Africa/Lagos',
  defaultOfficerPositionId: 'POS-PV',
  defaultOfficerName: 'Provost',
};

/**
 * Normalizes phone numbers to standard WhatsApp format without plus or formatting symbols.
 * Handles Nigerian local numbers (e.g. 080..., 081...) by converting to international format (23480...).
 */
export function normalizeWhatsAppPhoneNumber(phone?: string): { 
  valid: boolean; 
  formatted: string; 
  raw: string; 
  error?: string 
} {
  if (!phone || !phone.trim()) {
    return { 
      valid: false, 
      formatted: '', 
      raw: '', 
      error: 'No phone number registered for this chorister.' 
    };
  }

  const raw = phone.trim();
  // Strip non-digit characters
  let digits = raw.replace(/\D/g, '');

  if (!digits) {
    return { 
      valid: false, 
      formatted: '', 
      raw, 
      error: 'Phone number contains no numeric digits.' 
    };
  }

  // Handle Nigerian numbers
  if (digits.startsWith('0') && digits.length === 11) {
    // 08031234567 -> 2348031234567
    digits = '234' + digits.slice(1);
  } else if (digits.startsWith('234') && (digits.length === 13 || digits.length === 14)) {
    // Already Nigerian international without plus
  } else if (raw.startsWith('+')) {
    // International number with explicit plus (e.g. +1..., +44..., +234...)
    // digits already contains country code
  } else if (digits.length === 10 && !digits.startsWith('0')) {
    // 10 digits without leading 0 for Nigeria
    digits = '234' + digits;
  }

  // Length check (E.164 phone numbers have between 8 and 15 digits)
  if (digits.length < 8 || digits.length > 15) {
    return {
      valid: false,
      formatted: digits,
      raw,
      error: `Phone number '${raw}' does not appear to be a complete telephone number.`
    };
  }

  return { valid: true, formatted: digits, raw };
}

/**
 * Generates the friendly, non-accusatory prefilled welfare message template.
 */
export function generateWelfareWhatsAppMessage(
  choristerName: string,
  parishAbbr: string = 'OMPH',
  choirName: string = 'St. Cecilia Choir'
): string {
  const firstName = choristerName.trim().split(/\s+/)[0] || choristerName;
  
  return `Good day, ${firstName}. I hope you're doing well.

We noticed you haven't been around for some of our recent ${parishAbbr} ${choirName} gatherings, and I just wanted to reach out and check that everything is okay with you.

Is everything alright? Please let us know if there is anything we or the choir community can do to support you.

We truly miss having you in choir! Peace and blessings.`;
}

/**
 * Builds the official WhatsApp Click-to-Chat URL.
 * https://wa.me/NUMBER?text=ENCODED_MESSAGE
 */
export function buildWhatsAppClickToChatUrl(phone: string, message: string): string {
  const norm = normalizeWhatsAppPhoneNumber(phone);
  if (!norm.valid) return '';
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${norm.formatted}?text=${encoded}`;
}

/**
 * Evaluates whether a scheduled follow-up reminder is due or overdue based on Africa/Lagos time.
 */
export function getLagosCurrentTime(): { dateStr: string; timeStr: string; timestamp: number } {
  try {
    const now = new Date();
    // Format to Africa/Lagos
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const dateStr = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
    const timeStr = `${getPart('hour')}:${getPart('minute')}`;
    return { dateStr, timeStr, timestamp: now.getTime() };
  } catch {
    const now = new Date();
    return {
      dateStr: now.toISOString().split('T')[0],
      timeStr: now.toISOString().split('T')[1].slice(0, 5),
      timestamp: now.getTime(),
    };
  }
}

export function isReminderDue(scheduledDate?: string, scheduledTime?: string): boolean {
  if (!scheduledDate || !scheduledTime) return false;
  const current = getLagosCurrentTime();
  if (scheduledDate < current.dateStr) return true;
  if (scheduledDate === current.dateStr && scheduledTime <= current.timeStr) return true;
  return false;
}

export function isReminderOverdue(scheduledDate?: string, scheduledTime?: string): boolean {
  if (!scheduledDate) return false;
  const current = getLagosCurrentTime();
  if (scheduledDate < current.dateStr) return true;
  if (scheduledDate === current.dateStr && scheduledTime && scheduledTime < current.timeStr) return true;
  return false;
}

/**
 * Core Welfare Evaluation Algorithm:
 * 1. Filters completed eligible gatherings.
 * 2. Takes the evaluation window (e.g. last 4 completed gatherings).
 * 3. Identifies choristers with unexcused absences >= threshold.
 * 4. Integrates with existing persistent welfare cases.
 */
export function evaluateWelfareCases(
  members: Chorister[],
  sessions: RehearsalSession[],
  attendanceRecords: AttendanceRecord[],
  absences: AbsenceNotification[],
  settings?: SystemSettings,
  existingCases: WelfareFollowUpCase[] = []
): {
  activeCases: WelfareFollowUpCase[];
  historyCases: WelfareFollowUpCase[];
  summary: {
    requiringAttention: number;
    scheduledCount: number;
    overdueCount: number;
    furtherSupportCount: number;
    resolvedCount: number;
    totalCases: number;
  };
} {
  const config = { ...DEFAULT_WELFARE_SETTINGS, ...(settings?.welfareSettings || {}) };

  if (!config.welfareMonitoringEnabled) {
    return {
      activeCases: [],
      historyCases: existingCases,
      summary: {
        requiringAttention: 0,
        scheduledCount: 0,
        overdueCount: 0,
        furtherSupportCount: 0,
        resolvedCount: existingCases.filter(c => c.status === 'Resolved').length,
        totalCases: existingCases.length,
      },
    };
  }

  // Pre-compute which sessions actually have attendance recorded so unrecorded/placeholder sessions
  // never falsely mark the entire choir as unexcused absent.
  const sessionsWithAttendance = new Set<string>(
    attendanceRecords.map((r) => r.sessionId).filter(Boolean)
  );

  // 1. Identify completed eligible gatherings that actually have recorded attendance
  const eligibleSessions = sessions
    .filter((s) => {
      // Must be completed / finalised
      const isCompleted = s.sessionStatus === 'Completed' || s.sessionStatus === 'Finalised';
      if (!isCompleted) return false;

      // Must have actual attendance records taken for this gathering
      if (!sessionsWithAttendance.has(s.sessionId)) return false;

      // Must be in eligible gatherings list (supports both exact activityType and category labels)
      if (Array.isArray(config.eligibleGatherings) && config.eligibleGatherings.length > 0) {
        if (config.eligibleGatherings.includes('All')) return true;
        const typeLower = (s.activityType || '').toLowerCase();
        return config.eligibleGatherings.some((g) => {
          const gLower = g.toLowerCase();
          if (typeLower === gLower) return true;
          if (gLower === 'rehearsal' && (typeLower.includes('rehearsal') || typeLower.includes('mass'))) return true;
          if (gLower === 'meeting' && typeLower.includes('meeting')) return true;
          if (gLower === 'special' && typeLower.includes('special')) return true;
          return false;
        });
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date)); // descending: newest completed gatherings first

  // 2. Take evaluation window
  const windowSessions = eligibleSessions.slice(0, Math.max(1, config.evaluationWindowGatherings));

  // Resolved officer name fallback
  const defaultOfficer = settings?.positions?.find(
    (p) => p.positionId === config.defaultOfficerPositionId || p.code === 'PV'
  );
  const defaultOfficerName = defaultOfficer?.assignedOfficer || settings?.provostName || 'Provost';

  // Map of active members (excluding Archived or Resigned)
  const activeMembers = members.filter(
    (m) => m.membershipStatus !== 'Archived' && m.membershipStatus !== 'Resigned'
  );

  const updatedCasesMap = new Map<string, WelfareFollowUpCase>();
  // Index existing cases by memberId
  existingCases.forEach((c) => {
    updatedCasesMap.set(c.memberId, { ...c });
  });

  // 3. Evaluate each chorister
  activeMembers.forEach((member) => {
    // Find unexcused absences within window
    const unexcusedDates: string[] = [];
    const unexcusedSessionIds: string[] = [];

    const joinDateRaw = member.registrationDate || member.membershipDate || '';
    const joinDate = /^\d{4}-\d{2}-\d{2}/.test(joinDateRaw) ? joinDateRaw.slice(0, 10) : '';

    windowSessions.forEach((session) => {
      // Do not evaluate gatherings that occurred before the chorister joined
      if (joinDate && session.date < joinDate) return;

      // A. Check attendance records
      const record = attendanceRecords.find(
        (r) => r.sessionId === session.sessionId && r.memberId === member.memberId
      );

      let isAttended = false;
      let isExcused = false;

      if (record) {
        if (record.classification === 'Present' || record.classification === 'Late') {
          isAttended = true;
        } else if (record.classification === 'Excused' || record.classification === 'Not Expected') {
          isExcused = true;
        }
      }

      // B. Check approved absence notifications
      if (!isAttended && !isExcused) {
        const approvedExcuse = absences.find(
          (a) =>
            a.memberId === member.memberId &&
            (a.sessionId === session.sessionId || a.rehearsalDate === session.date) &&
            a.status === 'Approved'
        );
        if (approvedExcuse) {
          isExcused = true;
        }
      }

      // C. If not attended and not excused, it's an unexcused absence
      if (!isAttended && !isExcused) {
        unexcusedDates.push(session.date);
        unexcusedSessionIds.push(session.sessionId);
      }
    });

    const unexcusedCount = unexcusedDates.length;

    // Find last attendance date across all completed gatherings
    const memberAttendanceRecords = attendanceRecords
      .filter((r) => r.memberId === member.memberId && (r.classification === 'Present' || r.classification === 'Late'))
      .map((r) => {
        const sess = sessions.find((s) => s.sessionId === r.sessionId);
        return sess?.date || r.entryTimestamp.slice(0, 10);
      })
      .sort((a, b) => b.localeCompare(a));
    const lastAttendanceDate = memberAttendanceRecords[0] || undefined;

    const lastAbsenceDate = unexcusedDates[0] || (windowSessions[0]?.date || 'Recent Gathering');

    // Check threshold
    const meetsThreshold = unexcusedCount >= config.unexcusedAbsenceThreshold;

    const existingCase = updatedCasesMap.get(member.memberId);

    if (meetsThreshold) {
      if (existingCase) {
        // Update existing case
        existingCase.qualifyingAbsenceCount = unexcusedCount;
        existingCase.qualifyingDates = unexcusedDates;
        existingCase.qualifyingSessionIds = unexcusedSessionIds;
        existingCase.lastAbsenceDate = lastAbsenceDate;
        existingCase.lastAttendanceDate = lastAttendanceDate;
        existingCase.phoneNumber = member.phoneNumber;
        existingCase.preferredContactMethod = member.preferredContactMethod || existingCase.preferredContactMethod;
        existingCase.optOutWhatsApp = member.optOutWhatsApp || existingCase.optOutWhatsApp;
        existingCase.voicePart = member.voicePart;
        existingCase.memberName = member.fullName;
        existingCase.updatedAt = new Date().toISOString();

        // If it was resolved earlier but new absences triggered it again, reopen as Needs Attention
        if (existingCase.status === 'Resolved') {
          existingCase.status = 'Needs Attention';
          existingCase.resolvedAt = undefined;
          existingCase.resolvedBy = undefined;
        }
      } else {
        // Create new active case
        const newCase: WelfareFollowUpCase = {
          caseId: `WLF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          memberId: member.memberId,
          memberName: member.fullName,
          voicePart: member.voicePart,
          phoneNumber: member.phoneNumber,
          preferredContactMethod: member.preferredContactMethod || 'WhatsApp',
          optOutWhatsApp: member.optOutWhatsApp || false,
          qualifyingAbsenceCount: unexcusedCount,
          qualifyingDates: unexcusedDates,
          qualifyingSessionIds: unexcusedSessionIds,
          lastAttendanceDate,
          lastAbsenceDate,
          status: 'Needs Attention',
          assignedOfficerId: config.defaultOfficerPositionId,
          assignedOfficerName: defaultOfficerName,
          assignedOfficerPosition: 'Provost',
          contactHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updatedCasesMap.set(member.memberId, newCase);
      }
    } else if (existingCase && existingCase.status !== 'Resolved') {
      const hasExecutiveAction =
        (existingCase.contactHistory && existingCase.contactHistory.length > 0) ||
        Boolean(existingCase.scheduledDate) ||
        (existingCase.status !== 'Needs Attention' && existingCase.status !== 'Not Yet Contacted');

      if (!hasExecutiveAction) {
        updatedCasesMap.delete(member.memberId);
      } else {
        // Keep executive-tracked case but update qualifying absence counts
        existingCase.qualifyingAbsenceCount = unexcusedCount;
        existingCase.qualifyingDates = unexcusedDates;
        existingCase.qualifyingSessionIds = unexcusedSessionIds;
        existingCase.updatedAt = new Date().toISOString();
      }
    }
  });

  const allCases = Array.from(updatedCasesMap.values());
  const activeCases = allCases.filter((c) => c.status !== 'Resolved');
  const historyCases = allCases.filter((c) => c.status === 'Resolved');

  let scheduledCount = 0;
  let overdueCount = 0;
  let furtherSupportCount = 0;
  let requiringAttention = 0;

  activeCases.forEach((c) => {
    if (c.status === 'Needs Attention' || c.status === 'Not Yet Contacted') {
      requiringAttention++;
    }
    if (c.status === 'Further Support Required') {
      furtherSupportCount++;
      requiringAttention++;
    }
    if (c.status === 'Reminder Scheduled' || (c.scheduledDate && c.scheduledTime)) {
      scheduledCount++;
      if (isReminderOverdue(c.scheduledDate, c.scheduledTime)) {
        overdueCount++;
      }
    }
  });

  return {
    activeCases,
    historyCases,
    summary: {
      requiringAttention,
      scheduledCount,
      overdueCount,
      furtherSupportCount,
      resolvedCount: historyCases.length,
      totalCases: allCases.length,
    },
  };
}
