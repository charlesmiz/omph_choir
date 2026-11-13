import { RehearsalSession } from '../types';

export const TIMEZONE = 'Africa/Lagos';
export const DEFAULT_SESSION_DURATION_HOURS = 4;

export interface StandingRehearsalSlot {
  id: string;
  activityType: 'Friday Rehearsal' | 'Saturday Rehearsal' | 'Sunday Pre-Mass' | 'Sunday Post-Mass' | string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
  dayName: string;
  defaultRequiredArrivalTime: string; // HH:mm in Africa/Lagos
  isCompulsory: boolean;
  venue?: string;
  accessCode: string;
}

/**
 * Authoritative standing timetable slots for St. Cecilia Choir.
 * Used to automatically project weekly date-specific occurrences.
 */
export const STANDING_REHEARSAL_SLOTS: StandingRehearsalSlot[] = [
  {
    id: 'SLOT-FRI',
    activityType: 'Friday Rehearsal',
    dayOfWeek: 5, // Friday
    dayName: 'Friday',
    defaultRequiredArrivalTime: '18:30',
    isCompulsory: true,
    venue: 'Parish Choir Gallery / Hall',
    accessCode: 'OMPH-FR',
  },
  {
    id: 'SLOT-SAT',
    activityType: 'Saturday Rehearsal',
    dayOfWeek: 6, // Saturday
    dayName: 'Saturday',
    defaultRequiredArrivalTime: '08:30',
    isCompulsory: true,
    venue: 'Parish Choir Gallery',
    accessCode: 'OMPH-SA',
  },
  {
    id: 'SLOT-SUN-AM',
    activityType: 'Sunday Pre-Mass',
    dayOfWeek: 0, // Sunday
    dayName: 'Sunday',
    defaultRequiredArrivalTime: '07:30',
    isCompulsory: true,
    venue: 'Parish Choir Gallery',
    accessCode: 'OMPH-SU-AM',
  },
  {
    id: 'SLOT-SUN-PM',
    activityType: 'Sunday Post-Mass',
    dayOfWeek: 0, // Sunday
    dayName: 'Sunday',
    defaultRequiredArrivalTime: '11:30',
    isCompulsory: false,
    venue: 'Parish Choir Gallery',
    accessCode: 'OMPH-SU-PM',
  },
];

/**
 * Returns date and time components in Africa/Lagos (UTC+1, no DST).
 */
export function getLagosParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';

  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const second = Number(get('second'));
  const dateStr = `${get('year')}-${get('month')}-${get('day')}`;
  const timeStr = `${get('hour')}:${get('minute')}`;

  const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short' });
  const weekdayShort = dayFormatter.format(date);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = dayMap[weekdayShort] ?? date.getDay();

  return { year, month, day, dateStr, timeStr, hour, minute, second, dayOfWeek, weekdayShort };
}

/**
 * Converts a session's date (YYYY-MM-DD) and call time (HH:mm) in Africa/Lagos to a UTC millisecond timestamp.
 * In Africa/Lagos (UTC+1), standard ISO format is YYYY-MM-DDTHH:mm:00+01:00.
 */
export function getSessionStartTimeMs(session: { date: string; requiredArrivalTime?: string; defaultRequiredArrivalTime?: string }): number {
  if (!session || !session.date) return 0;
  const time = (session.requiredArrivalTime || session.defaultRequiredArrivalTime || '18:30').trim();
  const date = session.date.trim();
  const [hStr, mStr] = time.split(':');
  const pad = (n: string | number) => String(n || '0').padStart(2, '0');
  const isoWithOffset = `${date}T${pad(hStr)}:${pad(mStr)}:00+01:00`;
  const parsed = Date.parse(isoWithOffset);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculates start and end timestamps (in UTC ms) for a rehearsal session.
 * scheduledEndTime = scheduledStartTime + (durationHours || 4) hours.
 */
export function getSessionTiming(
  session: { date: string; requiredArrivalTime?: string; defaultRequiredArrivalTime?: string },
  durationHours: number = DEFAULT_SESSION_DURATION_HOURS
) {
  const startMs = getSessionStartTimeMs(session);
  const endMs = startMs > 0 ? startMs + durationHours * 60 * 60 * 1000 : 0;
  return { startMs, endMs, durationHours };
}

/**
 * Evaluates the authoritative lifecycle status for a session at a given point in time.
 * - 'Cancelled': remains Cancelled.
 * - 'Finalised': remains Finalised (manually closed sessions never reopen).
 * - 'Draft': remains Draft.
 * - If now < startMs: 'Scheduled' (or preserves 'Updated' / 'Published').
 * - If now >= startMs and now < endMs: 'In Progress'.
 * - If now >= endMs: 'Finalised' (automatically completed after 4 hours).
 */
export function evaluateSessionStatus(
  session: RehearsalSession,
  nowMs: number = Date.now(),
  durationHours: number = DEFAULT_SESSION_DURATION_HOURS
): RehearsalSession['sessionStatus'] {
  if (!session) return 'Scheduled';
  if (session.sessionStatus === 'Cancelled') return 'Cancelled';
  if (session.sessionStatus === 'Finalised') return 'Finalised';
  if (session.sessionStatus === 'Draft') return 'Draft';

  const { startMs, endMs } = getSessionTiming(session, durationHours);
  if (startMs === 0) return session.sessionStatus || 'Scheduled';

  if (nowMs < startMs) {
    if (session.sessionStatus === 'Updated') return 'Updated';
    if (session.sessionStatus === 'Published') return 'Published';
    return 'Scheduled';
  }

  if (nowMs >= startMs && nowMs < endMs) {
    return 'In Progress';
  }

  // 4 hours have elapsed since start: automatically completed
  return 'Finalised';
}

/**
 * Returns the single rehearsal session that is genuinely live (In Progress) right now in Africa/Lagos.
 * Returns null if no rehearsal is in progress. NEVER falls back to an upcoming session.
 */
export function getActiveSession(
  sessions: RehearsalSession[] = [],
  nowMs: number = Date.now(),
  durationHours: number = DEFAULT_SESSION_DURATION_HOURS
): RehearsalSession | null {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;

  for (const s of sessions) {
    const status = evaluateSessionStatus(s, nowMs, durationHours);
    if (status === 'In Progress') {
      return { ...s, sessionStatus: 'In Progress' };
    }
  }
  return null;
}

/**
 * Returns the next upcoming scheduled rehearsal session whose start time is in the future.
 * Sorted chronologically (nearest upcoming first). Returns null if none found.
 */
export function getNextScheduledSession(
  sessions: RehearsalSession[] = [],
  nowMs: number = Date.now(),
  durationHours: number = DEFAULT_SESSION_DURATION_HOURS
): RehearsalSession | null {
  if (!Array.isArray(sessions) || sessions.length === 0) return null;

  const upcoming = sessions
    .filter(s => {
      if (s.sessionStatus === 'Cancelled' || s.sessionStatus === 'Finalised') return false;
      const { startMs } = getSessionTiming(s, durationHours);
      return startMs > nowMs;
    })
    .sort((a, b) => getSessionStartTimeMs(a) - getSessionStartTimeMs(b));

  if (upcoming.length === 0) return null;
  const next = upcoming[0];
  const evaluated = evaluateSessionStatus(next, nowMs, durationHours);
  return { ...next, sessionStatus: evaluated };
}

/**
 * Generates future occurrences for standing weekly rehearsals (for the current week and next week)
 * without duplicating any existing session for the same date and activity.
 */
export function generateStandingOccurrences(
  existingSessions: RehearsalSession[] = [],
  nowMs: number = Date.now(),
  standingSlots: StandingRehearsalSlot[] = STANDING_REHEARSAL_SLOTS
): RehearsalSession[] {
  const lagosNow = getLagosParts(new Date(nowMs));
  const newOccurrences: RehearsalSession[] = [];

  // Look ahead over next 14 days
  for (let offset = 0; offset <= 14; offset++) {
    const targetDate = new Date(nowMs + offset * 86400000);
    const targetParts = getLagosParts(targetDate);

    for (const slot of standingSlots) {
      if (slot.dayOfWeek === targetParts.dayOfWeek) {
        const dateStr = targetParts.dateStr;

        // Check if session already exists for this date and slot
        const exists = existingSessions.some(
          s => s.date === dateStr && (s.activityType === slot.activityType || s.activityType.includes(slot.dayName))
        ) || newOccurrences.some(
          s => s.date === dateStr && s.activityType === slot.activityType
        );

        if (!exists) {
          const sessionId = `SESS-${dateStr}-${slot.id.replace('SLOT-', '')}`;
          const occurrence: RehearsalSession = {
            sessionId,
            activityType: slot.activityType as any,
            date: dateStr,
            defaultRequiredArrivalTime: slot.defaultRequiredArrivalTime,
            requiredArrivalTime: slot.defaultRequiredArrivalTime,
            actualStartTime: slot.defaultRequiredArrivalTime,
            attendanceOpeningTime: slot.defaultRequiredArrivalTime,
            attendanceClosingTime: slot.defaultRequiredArrivalTime,
            gracePeriodMinutes: 5,
            isCompulsory: slot.isCompulsory,
            penaltiesApply: slot.isCompulsory,
            approvingOfficer: 'Provost',
            scheduleAnnouncementTimestamp: new Date().toISOString(),
            sessionStatus: 'Scheduled',
            accessCode: `${slot.accessCode}-${targetParts.day.toString().padStart(2, '0')}`,
            latePenaltyAmount: 200,
            absencePenaltyAmount: 500,
            venue: slot.venue || 'Parish Choir Gallery',
          };
          newOccurrences.push(occurrence);
        }
      }
    }
  }

  return newOccurrences;
}

/**
 * Full reconciliation pipeline:
 * 1. Evaluates all existing sessions against current Lagos time (marks past sessions Finalised, active sessions In Progress, future sessions Scheduled).
 * 2. Injects any missing upcoming occurrences from the standing timetable.
 * 3. Sorts sessions: live/upcoming first, followed by recent past sessions.
 */
export function reconcileSessions(
  sessions: RehearsalSession[] = [],
  nowMs: number = Date.now(),
  durationHours: number = DEFAULT_SESSION_DURATION_HOURS
): RehearsalSession[] {
  const currentList = Array.isArray(sessions) ? [...sessions] : [];

  // 1. Evaluate lifecycle status for all sessions
  const evaluatedList = currentList.map(sess => {
    const updatedStatus = evaluateSessionStatus(sess, nowMs, durationHours);
    if (sess.sessionStatus !== updatedStatus) {
      return { ...sess, sessionStatus: updatedStatus };
    }
    return sess;
  });

  // 2. Generate missing standing occurrences for upcoming days and evaluate their lifecycle status
  const newOccurrences = generateStandingOccurrences(evaluatedList, nowMs).map(sess => {
    const updatedStatus = evaluateSessionStatus(sess, nowMs, durationHours);
    return { ...sess, sessionStatus: updatedStatus };
  });

  const combined = [...evaluatedList, ...newOccurrences];

  // 3. Deduplicate by sessionId or (date + activityType)
  const deduped: RehearsalSession[] = [];
  const seenKeys = new Set<string>();

  for (const s of combined) {
    const key = `${s.date}_${s.activityType}`;
    if (!seenKeys.has(key) && !seenKeys.has(s.sessionId)) {
      seenKeys.add(key);
      seenKeys.add(s.sessionId);
      deduped.push(s);
    }
  }

  // 4. Sort: Upcoming & Live sessions chronologically (nearest first), past sessions by date desc
  deduped.sort((a, b) => {
    const timeA = getSessionStartTimeMs(a);
    const timeB = getSessionStartTimeMs(b);

    const isLiveA = a.sessionStatus === 'In Progress';
    const isLiveB = b.sessionStatus === 'In Progress';
    if (isLiveA && !isLiveB) return -1;
    if (!isLiveA && isLiveB) return 1;

    const isUpcomingA = timeA > nowMs;
    const isUpcomingB = timeB > nowMs;
    if (isUpcomingA && !isUpcomingB) return -1;
    if (!isUpcomingA && isUpcomingB) return 1;

    if (isUpcomingA && isUpcomingB) {
      return timeA - timeB; // Ascending for upcoming
    }
    return timeB - timeA; // Descending (newest first) for past
  });

  return deduped;
}
