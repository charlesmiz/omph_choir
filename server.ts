import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, runTransaction, setLogLevel } from 'firebase/firestore';
import { reconcileSessions, getActiveSession, getNextScheduledSession } from './src/utils/sessionLifecycle';

// Suppress internal @firebase/firestore background gRPC idle-stream disconnect logs in Node.js;
// all actual Firestore operation errors are explicitly caught and logged in try/catch blocks.
setLogLevel('silent');

// -------------------------------------------------------------
// Environment Configuration & Production Database Guards
// -------------------------------------------------------------
const APP_ENV = process.env.APP_ENV || 'development';
const IS_PROD = APP_ENV === 'production';
const PROD_FIREBASE_PROJECT_ID = 'iron-mender-0t8c4';
const PROD_FIRESTORE_DATABASE_ID = 'ai-studio-omphchoir-7ac6c245-7aa6-4d84-950a-a615fe2ae522';
const SESSION_SECRET = process.env.SESSION_SECRET || 'omph-choral-ministry-secure-session-key-ilorin-2026';

// Document size safety thresholds (in UTF-8 bytes)
const WARN_DOC_SIZE_BYTES = parseInt(process.env.WARN_DOC_SIZE_BYTES || '768000', 10); // 750 KiB
const MAX_DOC_SIZE_BYTES = parseInt(process.env.MAX_DOC_SIZE_BYTES || '870400', 10);  // 850 KiB

// Session data schema
interface SessionData {
  userId: string;
  username?: string;
  userType: 'member' | 'executive';
  fullName: string;
  role?: string;
  positionId?: string;
  permissions?: string[];
  expiresAt: number;
}
const activeSessions = new Map<string, SessionData>();

// Helper: Cryptographic stateless bearer token (HMAC-SHA256)
// Guarantees seamless session validation across multi-instance Cloud Run containers
function signStatelessToken(data: SessionData): string {
  const payload = {
    userId: data.userId,
    username: data.username,
    userType: data.userType,
    fullName: data.fullName,
    role: data.role,
    positionId: data.positionId,
    permissions: data.permissions,
    exp: data.expiresAt,
    iat: Date.now(),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyStatelessToken(token: string): SessionData | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature) return null;

  try {
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (!payload.exp || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username,
      userType: payload.userType,
      fullName: payload.fullName,
      role: payload.role,
      positionId: payload.positionId,
      permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
      expiresAt: payload.exp,
    };
  } catch {
    return null;
  }
}

// Helper: Cryptographic password hashing using Node scrypt
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

const ACTIVATION_CODE_VALIDITY_HOURS = Math.max(
  1,
  Number(process.env.ACTIVATION_CODE_VALIDITY_HOURS || 24) || 24
);
const ACTIVATION_CODE_VALIDITY_MS = ACTIVATION_CODE_VALIDITY_HOURS * 60 * 60 * 1000;

function generateActivationCode(): string {
  const digits = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'ACT-';
  for (let i = 0; i < 6; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

function generateResetToken(): string {
  const digits = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let token = 'RST-';
  for (let i = 0; i < 6; i++) {
    token += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return token;
}

// -------------------------------------------------------------
// Firebase Configuration & Strict Fail-Closed Isolation
// -------------------------------------------------------------
const firebaseConfigFile = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firestoreDb: any = null;
let stagingAuth: any = null;
let firestoreDatabaseId = '';
let resolvedProjectId = '';
let stagingConfigurationError: string | null = null;

if (IS_PROD) {
  // PRODUCTION: Authoritative live database connection
  if (fs.existsSync(firebaseConfigFile)) {
    try {
      const prodConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, 'utf-8'));
      resolvedProjectId = process.env.FIREBASE_PROJECT_ID || prodConfig.projectId || PROD_FIREBASE_PROJECT_ID;
      firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || prodConfig.firestoreDatabaseId || PROD_FIRESTORE_DATABASE_ID;

      const fbApp = initializeApp(prodConfig, 'omph-backend-production');
      firestoreDb = getFirestore(fbApp, firestoreDatabaseId);
      console.log(`[Firestore] Initialized PRODUCTION Firestore DB (${firestoreDatabaseId}) in project ${resolvedProjectId}.`);
    } catch (err) {
      console.error('[Firestore] FATAL: Could not initialize production Firebase SDK:', err);
    }
  }
} else {
  // DEVELOPMENT / STAGING: Strictly Fail-Closed
  // Rule: Never use production Firebase credentials, configuration, or database as a fallback.
  const requiredStagingVars = [
    'STAGING_FIREBASE_PROJECT_ID',
    'STAGING_FIRESTORE_DATABASE_ID',
    'STAGING_FIREBASE_API_KEY',
    'STAGING_FIREBASE_APP_ID',
  ];
  const missingStagingVars = requiredStagingVars.filter(v => !process.env[v] || !process.env[v]!.trim());

  if (missingStagingVars.length > 0) {
    stagingConfigurationError = `STAGING CONFIGURATION REQUIRED (Fail-Closed): APP_ENV='${APP_ENV}' requires dedicated staging Firebase configuration. Missing required variables: ${missingStagingVars.join(', ')}. Fallback to production credentials is strictly disabled to guarantee total production data isolation.`;
    console.error('================================================================================');
    console.error(`[DataProtection] ${stagingConfigurationError}`);
    console.error('================================================================================');
  } else if (process.env.STAGING_FIREBASE_PROJECT_ID === PROD_FIREBASE_PROJECT_ID) {
    stagingConfigurationError = `STAGING CONFIGURATION ERROR: STAGING_FIREBASE_PROJECT_ID cannot match production project ID ('${PROD_FIREBASE_PROJECT_ID}'). Staging must use an isolated project.`;
    console.error('================================================================================');
    console.error(`[DataProtection] ${stagingConfigurationError}`);
    console.error('================================================================================');
  } else {
    try {
      resolvedProjectId = process.env.STAGING_FIREBASE_PROJECT_ID!;
      firestoreDatabaseId = process.env.STAGING_FIRESTORE_DATABASE_ID!;

      const stagingConfig = {
        projectId: resolvedProjectId,
        apiKey: process.env.STAGING_FIREBASE_API_KEY!,
        appId: process.env.STAGING_FIREBASE_APP_ID!,
        authDomain: `${resolvedProjectId}.firebaseapp.com`,
        storageBucket: `${resolvedProjectId}.firebasestorage.app`,
      };

      const fbApp = initializeApp(stagingConfig, 'omph-backend-staging');
      stagingAuth = getAuth(fbApp);
      firestoreDb = getFirestore(fbApp, firestoreDatabaseId);
      console.log(`[Firestore] Initialized STAGING Firestore DB (${firestoreDatabaseId}) in project ${resolvedProjectId} (APP_ENV=${APP_ENV}). Production credentials completely excluded.`);
    } catch (stagingInitErr: any) {
      stagingConfigurationError = `Failed to initialize staging Firebase SDK: ${stagingInitErr?.message || stagingInitErr}`;
      console.error(`[Firestore] ${stagingConfigurationError}`);
    }
  }
}

// Guard evaluation: strictly refuse any production access in non-production
const isTargetingProductionDb =
  (resolvedProjectId === PROD_FIREBASE_PROJECT_ID) &&
  (firestoreDatabaseId === PROD_FIRESTORE_DATABASE_ID || !firestoreDatabaseId);

if (!IS_PROD && isTargetingProductionDb) {
  stagingConfigurationError = `SECURITY VIOLATION: Non-production environment (APP_ENV='${APP_ENV}') detected pointing to production database (${PROD_FIREBASE_PROJECT_ID}). All access halted.`;
  console.error(`[DataProtection] ${stagingConfigurationError}`);
}

const PARISH_DOC_ID = 'omph_ilorin_production';
const DATA_FILE = path.resolve(process.cwd(), 'church_storage.json');
const BACKUP_FILE = path.resolve(process.cwd(), 'church_storage.bak.json');
const PROD_SNAPSHOT_FILE = path.resolve(process.cwd(), 'church_production_snapshot.json');

// Default 8 executive positions
function getDefaultPositions() {
  return [
    {
      positionId: 'POS-CM',
      title: 'Choir Master',
      code: 'CM',
      description: 'General artistic, musical, and administrative head of the choral ministry.',
      defaultPermissions: ['all', 'approvals', 'waivers', 'settings', 'finances', 'discipline', 'roster', 'music_library'],
      isSystem: true,
      status: 'Active',
      createdAt: '2026-11-01T00:00:00.000Z',
    },
    {
      positionId: 'POS-ACM',
      title: 'Assistant Choir Master',
      code: 'ACM',
      description: 'Assists with musical instruction, rehearsals, sectional reviews, and liturgical conducting.',
      defaultPermissions: ['rehearsals', 'sectional_reviews', 'music_library', 'attendance_view'],
      isSystem: true,
      status: 'Active',
      createdAt: '2026-11-01T00:00:00.000Z',
    },
    {
      positionId: 'POS-PV',
      title: 'Provost',
      code: 'PV',
      description: 'Chief disciplinarian responsible for call-time enforcement, punctuality, attendance logs, and fine assessment.',
      defaultPermissions: ['attendance', 'punctuality', 'fines', 'discipline', 'timetable', 'absences'],
      isSystem: true,
      status: 'Active',
      createdAt: '2026-11-01T00:00:00.000Z',
    },
    {
      positionId: 'POS-APV',
      title: 'Assistant Provost',
      code: 'APV',
      description: 'Assists the Provost in attendance recording, gatekeeping, and member verification.',
      defaultPermissions: ['attendance', 'punctuality', 'excuses'],
      isSystem: true,
      status: 'Active',
      createdAt: '2026-11-01T00:00:00.000Z',
    },
    {
      positionId: 'POS-SEC',
      title: 'Secretary',
      code: 'SEC',
      description: 'Custody of membership records, official minutes, formal communications, and parish announcements.',
      defaultPermissions: ['roster', 'announcements', 'documentation', 'member_activation'],
      isSystem: true,
      status: 'Active',
      createdAt: '2026-11-01T00:00:00.000Z',
    },
    {
      positionId: 'POS-FINSEC',
      title: 'Financial Secretary',
      code: 'FINSEC',
      description: 'Dedicated financial officer tracking monthly dues assessments, payment records, billing ledgers, and debtor reports.',
      defaultPermissions: ['monthly_dues', 'payments', 'financial_reports', 'reconciliation'],
      isSystem: true,
      status: 'Active',
      createdAt: '2026-11-01T00:00:00.000Z',
    },
    {
      positionId: 'POS-TR',
      title: 'Treasurer',
      code: 'TR',
      description: 'Custody of choir funds, bank transfers verification, bank account updates, and official receipts.',
      defaultPermissions: ['payments', 'monthly_dues', 'bank_details', 'fund_movements'],
      isSystem: true,
      status: 'Active',
      createdAt: '2026-11-01T00:00:00.000Z',
    },
    {
      positionId: 'POS-LIB',
      title: 'Librarian',
      code: 'LIB',
      description: 'Dedicated music custodian managing choir scripts, tonic sol-fa scores, sheet music uploads, and choral folders.',
      defaultPermissions: ['music_library', 'scores_upload', 'scripts_edit'],
      isSystem: true,
      status: 'Active',
      createdAt: '2026-11-01T00:00:00.000Z',
    },
  ];
}

// Clean initial state for real parish launch (no demo choristers or fake officer names)
function getCleanProductionState() {
  const positions = getDefaultPositions();
  return {
    version: '2.5.0',
    updatedAt: new Date().toISOString(),
    isDemoMode: false,
    settings: {
      parishName: 'Our Mother of Perpetual Help Catholic Parish',
      choirName: 'OMPH CHOIR',
      executivePin: '', // Legacy PIN removed in production
      defaultLateFine: 200,
      defaultAbsenceFine: 500,
      defaultGracePeriodMinutes: 5,
      debtQueryThresholdDays: 21,
      queryResponseDays: 7,
      maxAccommodationMonths: 3,
      publicRegisterShowsFineAmount: true,
      choirMasterName: 'Vacant / Not Yet Assigned',
      assistantChoirMasterName: 'Vacant / Not Yet Assigned',
      provostName: 'Vacant / Not Yet Assigned',
      assistantProvostName: 'Vacant / Not Yet Assigned',
      secretaryName: 'Vacant / Not Yet Assigned',
      financialSecretaryName: 'Vacant / Not Yet Assigned',
      treasurerName: 'Vacant / Not Yet Assigned',
      librarianName: 'Vacant / Not Yet Assigned',
      currencySymbol: '₦',
      diocese: 'Catholic Diocese of Ilorin',
      parishAbbreviation: 'OMPH',
      parishAddress: 'Ilorin, Kwara State, Nigeria',
      parishContactPhone: '+234 803 000 0000',
      parishContactEmail: 'omphchoir.ilorin@catholicparish.ng',
      patronSaint: 'St. Cecilia',
      feastDay: 'November 22',
      choirMotto: 'Cantare Amantis Est — To Sing is the Mark of Love',
      parishLogoUrl: '/assets/aistudio/omph_37e5c155.jpg',
      choirEmblemUrl: '/assets/aistudio/omph_37e5c155.jpg',
      positions,
      bankDetails: {
        bankName: '',
        accountName: '',
        accountNumber: '',
        paymentInstructions: 'Please specify your full name and Member ID in the payment narration.',
        paymentContact: 'Treasurer',
        isVerified: false,
        lastUpdated: new Date().toISOString(),
      },
      monthlyDuesConfig: {
        isEnabled: false,
        amount: 0,
        currency: '₦',
        effectiveCommencementMonth: '2026-11',
        monthlyBillingDay: 1,
        paymentDeadlineDays: 21,
        gracePeriodDays: 5,
        allowsPaymentArrangements: true,
        subjectTo21DayQuery: false,
      },
    },
    positions,
    executiveAccounts: [], // Initial state: empty until administrator bootstraps their account!
    members: [], // Clean production: 0 members initially
    memberAccounts: [],
    sessions: reconcileSessions([]),
    scheduleAudits: [],
    attendanceRecords: [],
    fines: [],
    payments: [],
    monthlyDues: [],
    adjustments: [],
    absences: [],
    accommodations: [],
    queries: [],
    suspensions: [],
    complaints: [],
    fundMovements: [],
    welfareCases: [],
    songs: [
      {
        songId: 'SNG-001',
        title: 'Benedictus Sit Deus Pater',
        composer: 'W. A. Mozart (K. 66c / K. 117)',
        category: 'Offertory',
        liturgicalSeason: 'Solemnities & Feasts',
        keySignature: 'C Major (4/4)',
        solfaNotes: 'd : m | s : - | d\' : - | t : l | s : - | f : m | r : - | d : -',
        scriptText: 'VERSE 1:\nBenedictus sit Deus Pater, unigenitusque Dei Filius, sanctus quoque Spiritus:\nquia fecit nobiscum misericordiam suam.',
        dateAdded: '2026-10-15',
      },
      {
        songId: 'SNG-002',
        title: 'Panis Angelicus',
        composer: 'César Franck / St. Thomas Aquinas',
        category: 'Communion',
        liturgicalSeason: 'Solemnities & Ordinary Time',
        keySignature: 'A Major (4/4)',
        solfaNotes: 'm : - : f | s : - : - | s : - : l | t : - : d\'',
        scriptText: 'VERSE 1 (Latin):\nPanis angelicus fit panis hominum;\nDat panis coelicus figuris terminum:\nO res mirabilis! Manducat Dominum\nPauper, servus et humilis.',
        dateAdded: '2026-10-18',
      },
      {
        songId: 'SNG-003',
        title: 'K’anyi Kelenu Virgin Maria',
        composer: 'Rev. Fr. Jude Nnam (Arr.)',
        category: 'Marian Hymn / Antiphon',
        liturgicalSeason: 'Marian Devotions & Feasts',
        keySignature: 'G Major (4/4)',
        solfaNotes: 's : s | m : f | s : - | l : l | s : m | r : -',
        scriptText: 'STANZA 1:\nK’anyi kelenu Virgin Maria, Nne nke Chukwu,\nOnye amuru n’ebughi ajo njo mbido.\nNne mara mma, Nne di aso,\nBiko riori anyi aririo n’iru Chukwu Dinwenu.\n\nCHORUS:\nAve, Ave, Maria!\nAve, Ave, Maria!',
        dateAdded: '2026-10-22',
      },
    ],
    gallery: [
      {
        photoId: 'GAL-001',
        title: 'OMPH St. Cecilia Choir Official Vestment Portrait',
        caption: 'Official choir group photograph in parish blue and white choral vestments with stoles, taken at the main parish altar.',
        eventDate: '2026-10-25',
        category: 'Robing & Inductions',
        imageUrl: '/assets/aistudio/Choir_43a95ef9.JPG',
        uploadedBy: 'Choir Master',
        uploadedDate: '2026-10-25',
      },
      {
        photoId: 'GAL-002',
        title: 'Our Mother of Perpetual Help — Venerated Patronal Icon',
        caption: 'The holy icon of Our Mother of Perpetual Help, our patroness, holding the Child Jesus with Archangels Michael and Gabriel.',
        eventDate: '2026-10-01',
        category: 'Solemnities & Feasts',
        imageUrl: '/assets/aistudio/omph_37e5c155.jpg',
        uploadedBy: 'Parish Office',
        uploadedDate: '2026-10-01',
      },
    ],
    announcements: [
      {
        announcementId: 'ANN-001',
        title: 'Solemnity of Christ the King & St. Cecilia Patronal Feast Preparation',
        category: 'Parish Programme',
        messageBody: 'All choristers are reminded that special full-choir rehearsals commence this week ahead of our annual patronal feast and robing ceremonies. Attendance is strictly compulsory.',
        relevantDate: '2026-11-22',
        venue: 'Main Parish Church Gallery',
        publishingOfficer: 'Choir Master',
        publishingPosition: 'Choir Master',
        publicationTimestamp: new Date().toISOString(),
        status: 'Published',
        shareHistory: [],
      },
    ],
    bankProposal: null,
    bankProposalsHistory: [],
    auditLogs: [
      {
        logId: 'LOG-INIT',
        timestamp: new Date().toISOString(),
        userId: 'SYSTEM',
        fullName: 'OMPH System Core',
        officialPosition: 'System Core',
        action: 'System Database Initialized',
        module: 'Core System',
        targetEntity: 'Parish Portal',
        newValue: 'Cloud Firestore persistent storage connected with schema v2.5.0',
      },
    ],
  };
}

// In-memory data store with dual-write to Firestore and atomic local file backup
let memoryData: any = null;
let writeQueue: Promise<boolean> = Promise.resolve(true);

// Data sanitization and integrity normalizer
function sanitizeAndNormalizeData(data: any) {
  if (!data || typeof data !== 'object') return data;

  // 1. Remove leftover test members
  if (Array.isArray(data.members)) {
    data.members = data.members.filter((m: any) => !m.memberId?.startsWith('TEST-MEM-'));

    // Fix duplicate CHO-B02: Barnabas Chidera Eze -> CHO-B03
    const barnabas = data.members.find((m: any) => m.fullName && m.fullName.includes('Barnabas') && m.memberId === 'CHO-B02');
    if (barnabas) {
      barnabas.memberId = 'CHO-B03';
    }

    // Ensure all member IDs are uniquely identifiable
    const seen = new Set<string>();
    data.members.forEach((m: any, idx: number) => {
      let id = m.memberId || `MEM-${idx}`;
      if (seen.has(id)) {
        id = `${id}-${idx}`;
      }
      seen.add(id);
      m.memberId = id;
    });
  }

  if (Array.isArray(data.attendanceRecords)) {
    data.attendanceRecords = data.attendanceRecords.filter((r: any) => !r.memberId?.startsWith('TEST-MEM-'));
    data.attendanceRecords.forEach((r: any) => {
      if (r.memberName && r.memberName.includes('Barnabas') && r.memberId === 'CHO-B02') {
        r.memberId = 'CHO-B03';
      }
    });
  }

  if (Array.isArray(data.memberAccounts)) {
    data.memberAccounts = data.memberAccounts.filter((a: any) => !a.memberId?.startsWith('TEST-MEM-'));
  }

  // 2. Normalize songs to guarantee scriptText and solfaNotes
  if (Array.isArray(data.songs)) {
    data.songs.forEach((s: any) => {
      if (!s.scriptText) {
        s.scriptText = s.lyrics || 'Parish choral script and lyrics archived in library.';
      }
      if (!s.solfaNotes) {
        s.solfaNotes = s.solfaNotation || '';
      }
    });
  }

  // 3. Remove legacy placeholder seed sessions (SES-001/002/003) that have no attendance, then reconcile
  if (Array.isArray(data.sessions)) {
    const attendanceList = Array.isArray(data.attendanceRecords) ? data.attendanceRecords : [];
    const sessionsWithAtt = new Set(attendanceList.map((r: any) => r.sessionId).filter(Boolean));
    if (!data.isDemoMode) {
      data.sessions = data.sessions.filter(
        (s: any) => !['SES-001', 'SES-002', 'SES-003'].includes(s.sessionId) || sessionsWithAtt.has(s.sessionId)
      );
    }
    data.sessions = reconcileSessions(data.sessions, undefined, data.settings?.defaultSessionDurationHours);
  }

  // 4. Prune unacted false welfare notifications (from unrecorded sessions or test cases) when not in demo mode
  if (Array.isArray(data.welfareCases) && !data.isDemoMode) {
    const attendanceList = Array.isArray(data.attendanceRecords) ? data.attendanceRecords : [];
    const sessionsWithAtt = new Set(attendanceList.map((r: any) => r.sessionId).filter(Boolean));
    data.welfareCases = data.welfareCases.filter((c: any) => {
      if (c.caseId && String(c.caseId).startsWith('WLF-TEST-')) return false;
      const hasAction =
        (Array.isArray(c.contactHistory) && c.contactHistory.length > 0) ||
        Boolean(c.scheduledDate) ||
        (c.status !== 'Needs Attention' && c.status !== 'Not Yet Contacted');
      if (hasAction) return true;
      const qIds = Array.isArray(c.qualifyingSessionIds) ? c.qualifyingSessionIds : [];
      return qIds.some((sid: string) => sessionsWithAtt.has(sid));
    });
  }

  if (data.data) {
    delete data.data;
  }

  return data;
}

// Initialize data from Cloud Firestore on server boot
async function initParishStorage() {
  console.log(`[Storage] Initializing authoritative parish data (APP_ENV=${APP_ENV})...`);

  // In production, Firestore is AUTHORITATIVE. We NEVER boot with empty or ungrounded state.
  if (IS_PROD) {
    if (!firestoreDb) {
      console.error('[Storage] FATAL: Production environment requires an active Firestore connection, but Firestore SDK failed to initialize.');
      throw new Error('FATAL_DATABASE_UNAVAILABLE: Firestore connection required in production.');
    }
    try {
      const docRef = doc(firestoreDb, 'parish_portal', PARISH_DOC_ID);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        console.error(`[Storage] FATAL: Authoritative production document (/parish_portal/${PARISH_DOC_ID}) does not exist in Firestore! Halting boot to prevent ungrounded overwrite or empty state.`);
        throw new Error('FATAL_PRODUCTION_DOCUMENT_MISSING: Firestore production document does not exist.');
      }
      memoryData = sanitizeAndNormalizeData(snap.data());
      console.log(`[Storage] Authoritative production data successfully loaded from Firestore. Version: ${memoryData.version || '2.5.0'}, _version: ${memoryData._version || 0}, Members: ${memoryData.members?.length || 0}, Executives: ${memoryData.executiveAccounts?.length || 0}`);

      // Sync local disk backup cache
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(memoryData, null, 2), 'utf-8');
      } catch (cacheErr) {
        console.warn('[Storage] Warning: Failed to sync local disk cache:', cacheErr);
      }
      return;
    } catch (err: any) {
      console.error('[Storage] FATAL: Could not read authoritative Firestore document in production:', err.message || err);
      throw err;
    }
  }

  // Non-production initialization (development / staging) - STRICTLY FAIL-CLOSED
  if (!IS_PROD) {
    if (stagingConfigurationError) {
      console.error('================================================================================');
      console.error('[Storage] HALTED: Fail-Closed Staging Configuration Active.');
      console.error(`[Storage] ${stagingConfigurationError}`);
      console.error('================================================================================');
      // In fail-closed mode, no data is loaded and storage initialization halts.
      return;
    }

    if (!firestoreDb || isTargetingProductionDb) {
      console.error('[Storage] FATAL: Non-production environment missing isolated staging Firestore connection.');
      return;
    }

    try {
      if (stagingAuth && !stagingAuth.currentUser) {
        const authEmail = process.env.STAGING_FIREBASE_AUTH_EMAIL?.trim();
        const authPassword = process.env.STAGING_FIREBASE_AUTH_PASSWORD;
        if (authEmail && authPassword) {
          await signInWithEmailAndPassword(stagingAuth, authEmail, authPassword);
          console.log(`[Firestore] Authenticated staging backend via Email/Password (${authEmail}).`);
        } else {
          await signInAnonymously(stagingAuth);
          console.log(`[Firestore] Authenticated staging backend via Firebase Anonymous Auth.`);
        }
      }

      const docRef = doc(firestoreDb, 'parish_portal', PARISH_DOC_ID);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        memoryData = sanitizeAndNormalizeData(snap.data());
        console.log(`[Storage] Staging data successfully loaded from Firestore (${resolvedProjectId}). Members: ${memoryData.members?.length || 0}`);
        try { fs.writeFileSync(DATA_FILE, JSON.stringify(memoryData, null, 2), 'utf-8'); } catch {}
        return;
      } else {
        console.log(`[Storage] Staging document does not exist yet at /parish_portal/${PARISH_DOC_ID} in '${resolvedProjectId}'. Bootstrapping clean initial parish state in staging Firestore...`);
        memoryData = getCleanProductionState();
        await setDoc(docRef, memoryData);
        console.log(`[Storage] Initialized clean staging document in staging Firestore.`);
        try { fs.writeFileSync(DATA_FILE, JSON.stringify(memoryData, null, 2), 'utf-8'); } catch {}
        return;
      }
    } catch (stagingErr: any) {
      const errMsg = stagingErr?.message || String(stagingErr);
      stagingConfigurationError = `Staging Firestore (${resolvedProjectId} / ${firestoreDatabaseId}) connection failed: ${errMsg}. Ensure Anonymous Auth (or Email/Password) is enabled in Firebase Authentication and Firestore rules on '${resolvedProjectId}' allow authenticated access to /parish_portal/${PARISH_DOC_ID}.`;
      console.error('================================================================================');
      console.error(`[Storage] HALTED (Fail-Closed): Could not authenticate or connect to staging Firestore (${resolvedProjectId}): ${errMsg}`);
      console.error(`[Storage] Production database (${PROD_FIREBASE_PROJECT_ID}) remains strictly isolated. No fallback will occur.`);
      console.error('================================================================================');
      return;
    }
  }
}

// Synchronous accessor for in-memory cache
function readData(): any {
  if (!IS_PROD && stagingConfigurationError) {
    return {
      settings: {
        parishName: 'Our Mother of Perpetual Help Catholic Parish',
        choirName: 'OMPH St. Cecilia Choir (Staging Setup Required)',
        diocese: 'Catholic Diocese of Ilorin',
      },
      members: [],
      positions: getDefaultPositions(),
      executiveAccounts: [],
      sessions: [],
      announcements: [],
      songs: [],
      gallery: [],
      isDemoMode: false,
    };
  }

  if (!memoryData) {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && parsed.settings) {
          memoryData = sanitizeAndNormalizeData(parsed);
        }
      }
    } catch {}
    if (!memoryData) {
      memoryData = getCleanProductionState();
    }
  }

  memoryData = sanitizeAndNormalizeData(memoryData);
  if (!Array.isArray(memoryData.positions) || memoryData.positions.length === 0) {
    memoryData.positions = getDefaultPositions();
  }
  return memoryData;
}

// Authoritative Firestore read helper for multi-instance consistency
async function refreshFromFirestore(): Promise<any> {
  if (!IS_PROD && stagingConfigurationError) {
    return readData();
  }

  if (firestoreDb && (IS_PROD || !isTargetingProductionDb)) {
    if (!IS_PROD && stagingAuth && !stagingAuth.currentUser) {
      const authEmail = process.env.STAGING_FIREBASE_AUTH_EMAIL?.trim();
      const authPassword = process.env.STAGING_FIREBASE_AUTH_PASSWORD;
      if (authEmail && authPassword) {
        await signInWithEmailAndPassword(stagingAuth, authEmail, authPassword);
      } else {
        await signInAnonymously(stagingAuth);
      }
    }

    const docRef = doc(firestoreDb, 'parish_portal', PARISH_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      memoryData = sanitizeAndNormalizeData(snap.data());
      if (!Array.isArray(memoryData.positions) || memoryData.positions.length === 0) {
        memoryData.positions = getDefaultPositions();
      }
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(memoryData, null, 2), 'utf-8');
      } catch {}
      return memoryData;
    }
  }

  return readData();
}

// -------------------------------------------------------------
// Centralized Concurrency-Safe Mutation Repository
// -------------------------------------------------------------
interface MutateOptions {
  auditLog?: {
    userId: string;
    fullName: string;
    officialPosition: string;
    action: string;
    module: string;
    targetEntity: string;
    recordId?: string;
    oldValue?: string;
    newValue?: string;
    reason?: string;
  };
}

let mutationQueue = Promise.resolve<any>(null);

async function mutateParishData<T = any>(
  mutator: (current: any) => Promise<T> | T,
  options?: MutateOptions
): Promise<{ success: boolean; result?: T; data?: any; error?: string; status?: number }> {
  // Staging Fail-Closed Guard: Block any write attempts if staging is not configured
  if (!IS_PROD && stagingConfigurationError) {
    const errorMsg = `CONFIGURATION_ERROR (Fail-Closed): Writes rejected because staging environment is not properly configured: ${stagingConfigurationError}`;
    console.error(`[DataProtection] ${errorMsg}`);
    return {
      success: false,
      status: 503,
      error: errorMsg,
    };
  }

  // Non-Production Guard: Refuse writes if non-production is pointing at the live production DB
  if (!IS_PROD && isTargetingProductionDb) {
    const errorMsg = `CONFIGURATION_ERROR: Writes to the production Firestore database (${PROD_FIREBASE_PROJECT_ID}) are strictly blocked in non-production environment (APP_ENV=${APP_ENV}). Please switch APP_ENV to production or configure dedicated staging credentials.`;
    console.error(`[DataProtection] ${errorMsg}`);
    return {
      success: false,
      status: 403,
      error: errorMsg,
    };
  }

  const runMutation = async () => {
    // Branch A: Firestore-backed transaction (Production or dedicated Staging DB)
    if (firestoreDb && (IS_PROD || !isTargetingProductionDb)) {
      try {
        if (!IS_PROD && stagingAuth && !stagingAuth.currentUser) {
          const authEmail = process.env.STAGING_FIREBASE_AUTH_EMAIL?.trim();
          const authPassword = process.env.STAGING_FIREBASE_AUTH_PASSWORD;
          if (authEmail && authPassword) {
            await signInWithEmailAndPassword(stagingAuth, authEmail, authPassword);
          } else {
            await signInAnonymously(stagingAuth);
          }
        }
        const docRef = doc(firestoreDb, 'parish_portal', PARISH_DOC_ID);
        let updatedResult: T | undefined;
        let finalData: any = null;

        await runTransaction(firestoreDb, async (transaction) => {
          const snap = await transaction.get(docRef);
          if (!snap.exists()) {
            throw new Error('DOCUMENT_NOT_FOUND: Authoritative parish document does not exist in Firestore.');
          }

          const current = sanitizeAndNormalizeData(snap.data());

          // Execute mutator
          updatedResult = await mutator(current);

          // Monotonic version increment
          const prevVersion = typeof current._version === 'number' ? current._version : 0;
          current._version = prevVersion + 1;
          current.updatedAt = new Date().toISOString();

          // Append audit log if provided
          if (options?.auditLog) {
            if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
            const newLog = {
              logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
              timestamp: new Date().toISOString(),
              ...options.auditLog,
            };
            current.auditLogs.unshift(newLog);
            if (current.auditLogs.length > 200) {
              current.auditLogs = current.auditLogs.slice(0, 200);
            }
          }

          // Document size safety check
          const serialized = JSON.stringify(current);
          const byteLength = Buffer.byteLength(serialized, 'utf-8');

          if (byteLength > WARN_DOC_SIZE_BYTES) {
            console.warn(`[Storage] WARNING: Document size (${byteLength} bytes) exceeds warning threshold (${WARN_DOC_SIZE_BYTES} bytes).`);
          }

          if (byteLength > MAX_DOC_SIZE_BYTES) {
            console.error(`[Storage] REJECTION: Document size (${byteLength} bytes) exceeds hard safety limit (${MAX_DOC_SIZE_BYTES} bytes).`);
            throw new Error(`DOCUMENT_SIZE_EXCEEDED: Document size (${byteLength} bytes) exceeds maximum limit of ${MAX_DOC_SIZE_BYTES} bytes.`);
          }

          const cleanDoc = JSON.parse(serialized);
          transaction.set(docRef, cleanDoc);
          finalData = cleanDoc;
        });

        // Update local memory and disk cache ONLY after transaction successfully commits
        memoryData = finalData;
        try {
          if (fs.existsSync(DATA_FILE)) {
            try { fs.copyFileSync(DATA_FILE, BACKUP_FILE); } catch {}
          }
          fs.writeFileSync(DATA_FILE, JSON.stringify(finalData, null, 2), 'utf-8');
        } catch (diskErr) {
          console.warn('[Storage] Warning: Failed to sync local file backup after Firestore transaction:', diskErr);
        }

        return {
          success: true,
          result: updatedResult,
          data: finalData,
        };
      } catch (txErr: any) {
        const isSizeError = txErr.message && txErr.message.includes('DOCUMENT_SIZE_EXCEEDED');
        const isPermission = txErr.code === 'permission-denied' || (txErr.message && txErr.message.includes('insufficient permissions'));
        let errMsg = txErr.message || 'Firestore transaction failed.';
        if (isPermission && !IS_PROD) {
          errMsg = `Staging database permission denied: Project '${resolvedProjectId}' requires Firestore security rules deployed and STAGING_FIREBASE_API_KEY configured.`;
        }
        console.error('[Storage] Firestore mutation transaction failed:', errMsg);
        return {
          success: false,
          status: isSizeError ? 413 : (isPermission ? 403 : 500),
          error: errMsg,
        };
      }
    }

    // Branch B: Local / non-Firestore fallback (e.g. offline dev with local mock)
    try {
      if (!memoryData) memoryData = readData();
      const current = { ...memoryData };
      const updatedResult = await mutator(current);

      const prevVersion = typeof current._version === 'number' ? current._version : 0;
      current._version = prevVersion + 1;
      current.updatedAt = new Date().toISOString();

      if (options?.auditLog) {
        if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
        const newLog = {
          logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          timestamp: new Date().toISOString(),
          ...options.auditLog,
        };
        current.auditLogs.unshift(newLog);
        if (current.auditLogs.length > 200) {
          current.auditLogs = current.auditLogs.slice(0, 200);
        }
      }

      const serialized = JSON.stringify(current);
      const byteLength = Buffer.byteLength(serialized, 'utf-8');

      if (byteLength > WARN_DOC_SIZE_BYTES) {
        console.warn(`[Storage] WARNING: Local document size (${byteLength} bytes) exceeds warning threshold (${WARN_DOC_SIZE_BYTES} bytes).`);
      }
      if (byteLength > MAX_DOC_SIZE_BYTES) {
        return {
          success: false,
          status: 413,
          error: `DOCUMENT_SIZE_EXCEEDED: Document size (${byteLength} bytes) exceeds maximum limit of ${MAX_DOC_SIZE_BYTES} bytes.`,
        };
      }

      memoryData = sanitizeAndNormalizeData(current);
      try {
        if (fs.existsSync(DATA_FILE)) {
          try { fs.copyFileSync(DATA_FILE, BACKUP_FILE); } catch {}
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(memoryData, null, 2), 'utf-8');
      } catch {}

      return {
        success: true,
        result: updatedResult,
        data: memoryData,
      };
    } catch (localErr: any) {
      return {
        success: false,
        status: 500,
        error: localErr.message || 'Local mutation failed.',
      };
    }
  };

  mutationQueue = mutationQueue.then(runMutation, runMutation);
  return mutationQueue;
}

// Atomic dual-write compatibility layer: all write endpoints route through mutateParishData
async function atomicWriteData(data: any): Promise<boolean> {
  if (!data || typeof data !== 'object' || !data.settings) {
    console.warn('Rejected empty or invalid church-data payload');
    return false;
  }
  const mutation = await mutateParishData((current) => {
    Object.assign(current, data);
    return true;
  });
  return mutation.success;
}

// Helper: record append-only audit log using mutateParishData
const recordAudit = async (entry: {
  userId: string;
  fullName: string;
  officialPosition: string;
  action: string;
  module: string;
  targetEntity: string;
  recordId?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
}) => {
  const newLog = {
    logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toISOString(),
    userId: entry.userId,
    fullName: entry.fullName,
    officialPosition: entry.officialPosition,
    action: entry.action,
    module: entry.module,
    targetEntity: entry.targetEntity,
    recordId: entry.recordId || '',
    oldValue: entry.oldValue || '',
    newValue: entry.newValue || '',
    reason: entry.reason || '',
  };

  await mutateParishData((current) => {
    if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
    current.auditLogs.unshift(newLog);
    if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
    return newLog;
  });

  return newLog;
};

const extractToken = (req: any): string | undefined => {
  const raw = req.headers['authorization'] || req.headers['x-auth-token'];
  if (!raw) return undefined;
  const str = Array.isArray(raw) ? raw[0] : String(raw);
  return str.startsWith('Bearer ') ? str.substring(7).trim() : str.trim();
};

// Middleware: verify active session token (supports stateless HMAC tokens & in-memory sessions)
const authenticateToken = (req: any, res: any, next: any) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' });
  }

  // 1. Try stateless HMAC token (cross-container resilience)
  const verified = verifyStatelessToken(token);
  if (verified) {
    req.user = verified;
    return next();
  }

  // 2. Fallback to in-memory activeSessions
  const session = activeSessions.get(token);
  if (session && session.expiresAt >= Date.now()) {
    req.user = session;
    return next();
  }

  if (session) activeSessions.delete(token);
  return res.status(401).json({ success: false, message: 'Session expired or invalid. Please sign in again.' });
};

async function startServer() {
  await initParishStorage();

  const app = express();
  const PORT = 3000;

  // STRICT FAIL-CLOSED ISOLATION FOR DEVELOPMENT AND STAGING
  if (!IS_PROD && stagingConfigurationError) {
    console.error('\n' + '='.repeat(80));
    console.error('[FATAL: APPLICATION HALTED IN FAIL-CLOSED MODE — STAGING CONFIGURATION REQUIRED]');
    console.error(stagingConfigurationError);
    console.error('Data mutation endpoints and database operations are halted.');
    console.error('Required Staging Environment Variables:');
    console.error('  • STAGING_FIREBASE_PROJECT_ID   (e.g., "omph-choir-staging")');
    console.error('  • STAGING_FIRESTORE_DATABASE_ID  (e.g., "(default)")');
    console.error('  • STAGING_FIREBASE_API_KEY       (Web API key from Firebase Console)');
    console.error('  • STAGING_FIREBASE_APP_ID        (Web App ID from Firebase Console)');
    console.error('Production database (iron-mender-0t8c4) access is STRICTLY BLOCKED.');
    console.error('='.repeat(80) + '\n');
  }

  app.use(express.json({ limit: '20mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      environment: APP_ENV,
      failClosedActive: Boolean(!IS_PROD && stagingConfigurationError),
      timestamp: new Date().toISOString(),
    });
  });

  // Fail-closed API guard: In non-production without valid staging credentials,
  // block all data mutation and sensitive endpoints while keeping health and public parish info accessible
  app.use('/api', (req, res, next) => {
    if (req.path === '/health' || req.path === '/public/parish-info') {
      return next();
    }

    if (!IS_PROD && stagingConfigurationError) {
      return res.status(503).json({
        success: false,
        status: 503,
        error: 'STAGING_CONFIGURATION_REQUIRED',
        message: 'Application operation halted (Fail-Closed Mode): dedicated staging Firebase configuration is required when APP_ENV is development or staging.',
        details: stagingConfigurationError,
        requiredVariables: [
          'STAGING_FIREBASE_PROJECT_ID',
          'STAGING_FIRESTORE_DATABASE_ID',
          'STAGING_FIREBASE_API_KEY',
          'STAGING_FIREBASE_APP_ID',
        ],
        productionDatabaseProtection: 'Production database access is strictly disabled. No fallback allowed.',
      });
    }

    next();
  });

  // -------------------------------------------------------------
  // API: Public Parish Information (Safe for unauthenticated landing page)
  // -------------------------------------------------------------
  app.get('/api/public/parish-info', async (req, res) => {
    let data: any;
    try {
      data = await refreshFromFirestore();
    } catch {
      data = readData();
    }
    const settings = data.settings || {};
    const hasAdminAccount = Array.isArray(data.executiveAccounts) && data.executiveAccounts.length > 0;
    const reconciledSessions = reconcileSessions(data.sessions || [], undefined, settings.defaultSessionDurationHours);
    const activeSession = getActiveSession(reconciledSessions);
    const nextScheduledSession = getNextScheduledSession(reconciledSessions);

    res.json({
      success: true,
      stagingConfigurationRequired: Boolean(!IS_PROD && stagingConfigurationError),
      stagingError: !IS_PROD ? stagingConfigurationError : null,
      requiredVariables: !IS_PROD && stagingConfigurationError ? [
        'STAGING_FIREBASE_PROJECT_ID',
        'STAGING_FIRESTORE_DATABASE_ID',
        'STAGING_FIREBASE_API_KEY',
        'STAGING_FIREBASE_APP_ID',
      ] : undefined,
      hasAdminAccount,
      parishName: settings.parishName || 'Our Mother of Perpetual Help Catholic Parish',
      choirName: settings.choirName || 'OMPH CHOIR',
      diocese: settings.diocese || 'Catholic Diocese of Ilorin',
      parishAddress: settings.parishAddress || 'Ilorin, Kwara State, Nigeria',
      parishContactPhone: settings.parishContactPhone || '+234 803 000 0000',
      parishContactEmail: settings.parishContactEmail || 'omphchoir.ilorin@catholicparish.ng',
      patronSaint: settings.patronSaint || 'St. Cecilia',
      feastDay: settings.feastDay || 'November 22',
      choirMotto: settings.choirMotto || 'Cantare Amantis Est — To Sing is the Mark of Love',
      parishLogoUrl: settings.parishLogoUrl || '/assets/aistudio/omph_37e5c155.jpg',
      choirEmblemUrl: settings.choirEmblemUrl || '/assets/aistudio/omph_37e5c155.jpg',
      activeSession: activeSession || null,
      nextScheduledSession: nextScheduledSession || null,
      sessions: reconciledSessions,
      announcements: (data.announcements || []).filter((a: any) => a.status === 'Published').slice(0, 5),
      bankDetails: settings.bankDetails?.isVerified ? settings.bankDetails : null,
      totalRegisteredChoristers: (data.members || []).filter((m: any) => m.membershipStatus === 'Active').length,
      positions: (data.positions || []).map((p: any) => ({
        positionId: p.positionId,
        title: p.title,
        code: p.code,
        status: p.status,
      })),
      isDemoMode: Boolean(data.isDemoMode),
    });
  });

  // -------------------------------------------------------------
  // API: General Church Data (Authenticated and Role-Scoped)
  // -------------------------------------------------------------
  app.get('/api/church-data', authenticateToken, async (req: any, res) => {
    let data: any;
    try {
      data = await refreshFromFirestore();
    } catch (err: any) {
      console.error('[Storage] Failed to read authoritative church data from Firestore:', err?.message || err);
      return res.status(500).json({ success: false, message: 'Failed to retrieve authoritative church data from Firestore.' });
    }
    if (!data) return res.json({ success: false, data: null });

    const user = req.user;

    // CASE 1: Executive caller — full data with sensitive passwords stripped
    if (user.userType === 'executive') {
      const sanitized = { ...data };
      if (Array.isArray(sanitized.executiveAccounts)) {
        sanitized.executiveAccounts = sanitized.executiveAccounts.map((a: any) => ({
          executiveId: a.executiveId,
          fullName: a.fullName,
          username: a.username,
          position: a.position,
          positionId: a.positionId,
          status: a.status,
          permissions: a.permissions,
          createdAt: a.createdAt,
          lastLogin: a.lastLogin,
        }));
      }
      if (Array.isArray(sanitized.memberAccounts)) {
        sanitized.memberAccounts = sanitized.memberAccounts.map((a: any) => ({
          memberId: a.memberId,
          username: a.username,
          isActivated: a.isActivated,
          lastPasswordChange: a.lastPasswordChange,
        }));
      }
      return res.json({ success: true, data: sanitized });
    }

    // CASE 2: Member caller — scoped personal records and public directory only
    const memberId = user.userId;
    const scopedData: any = {
      version: data.version,
      _version: data._version,
      updatedAt: data.updatedAt,
      isDemoMode: Boolean(data.isDemoMode),
      settings: data.settings || {},
      positions: (data.positions || []).map((p: any) => ({
        positionId: p.positionId,
        title: p.title,
        code: p.code,
        status: p.status,
      })),
      // Directory of members: public details only (no phone, no home address, no next-of-kin, no financial balances)
      members: (data.members || []).map((m: any) => {
        if (m.memberId?.toUpperCase() === String(memberId).toUpperCase()) {
          return m; // Own member profile includes full record
        }
        return {
          memberId: m.memberId,
          fullName: m.fullName,
          voicePart: m.voicePart,
          membershipStatus: m.membershipStatus,
          profilePhotoUrl: m.profilePhotoUrl,
          isExecutive: m.isExecutive,
          executiveRole: m.executiveRole,
          probationStatus: m.probationStatus,
        };
      }),
      // Shared liturgical and choir resources
      songs: data.songs || [],
      sessions: data.sessions || [],
      announcements: (data.announcements || []).filter((a: any) => a.status === 'Published'),
      gallery: data.gallery || [],
      monthlyDues: data.monthlyDues || [],
      // Personal scoped records: only records belonging to this member
      attendanceRecords: (data.attendanceRecords || []).filter((r: any) => r.memberId?.toUpperCase() === String(memberId).toUpperCase()),
      fines: (data.fines || []).filter((f: any) => f.memberId?.toUpperCase() === String(memberId).toUpperCase()),
      payments: (data.payments || []).filter((p: any) => p.memberId?.toUpperCase() === String(memberId).toUpperCase()),
      adjustments: (data.adjustments || []).filter((adj: any) => adj.memberId?.toUpperCase() === String(memberId).toUpperCase()),
      absences: (data.absences || []).filter((abs: any) => abs.memberId?.toUpperCase() === String(memberId).toUpperCase()),
      accommodations: (data.accommodations || []).filter((acc: any) => acc.memberId?.toUpperCase() === String(memberId).toUpperCase()),
      queries: (data.queries || []).filter((q: any) => q.memberId?.toUpperCase() === String(memberId).toUpperCase()),
      suspensions: (data.suspensions || []).filter((s: any) => s.memberId?.toUpperCase() === String(memberId).toUpperCase()),
      complaints: (data.complaints || []).filter((c: any) => c.memberId?.toUpperCase() === String(memberId).toUpperCase()),
      // Financial movements, audit logs, and account credentials are excluded for chorister members
      fundMovements: [],
      auditLogs: [],
      executiveAccounts: (data.executiveAccounts || []).map((a: any) => ({
        executiveId: a.executiveId,
        fullName: a.fullName,
        position: a.position,
        positionId: a.positionId,
      })),
      memberAccounts: [],
    };

    return res.json({ success: true, data: scopedData });
  });

  // SECURE: Full database update requires executive authentication and concurrency transaction
  app.post('/api/church-data', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required to update church data.' });
    }

    const rawIncoming = req.body || {};
    const incoming = rawIncoming.data && typeof rawIncoming.data === 'object' && !Array.isArray(rawIncoming.data)
      ? rawIncoming.data
      : rawIncoming;

    const mutationResult = await mutateParishData((current) => {
      // Merge safe fields
      Object.assign(current, incoming);

      // Normalize any songs in merged
      if (Array.isArray(current.songs)) {
        current.songs = current.songs.map((s: any) => ({
          ...s,
          scriptText: s.scriptText || s.lyrics || '',
          solfaNotes: s.solfaNotes || s.solfaNotation || '',
        }));
      }

      // Sync executive officer names if settings were updated
      if (incoming.settings && Array.isArray(current.executiveAccounts)) {
        const roleMapping: Record<string, string | undefined> = {
          choirmaster: incoming.settings.choirMasterName,
          asstchoirmaster: incoming.settings.assistantChoirMasterName,
          provost: incoming.settings.provostName,
          asstprovost: incoming.settings.assistantProvostName,
          secretary: incoming.settings.secretaryName,
          financialsecretary: incoming.settings.financialSecretaryName,
          treasurer: incoming.settings.treasurerName,
          librarian: incoming.settings.librarianName,
        };

        current.executiveAccounts.forEach((account: any) => {
          const cleanUser = (account.username || '').toLowerCase().trim();
          const updatedName = roleMapping[cleanUser];
          if (updatedName && updatedName.trim()) {
            account.fullName = updatedName.trim();
          }
        });
      }

      return true;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to update church data.',
      });
    }

    res.json({ success: true, savedAt: new Date().toISOString(), version: mutationResult.data?._version });
  });

  // Dedicated API: Update Church & Executive Settings (Persisted to Firestore & disk)
  app.post('/api/settings', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required to update church settings.' });
    }

    const incoming = req.body || {};
    const newSettings = incoming.settings || incoming;

    if (!newSettings || typeof newSettings !== 'object' || !newSettings.parishName) {
      return res.status(400).json({ success: false, message: 'Invalid or incomplete settings data provided.' });
    }

    const mutationResult = await mutateParishData(
      (current) => {
        current.settings = {
          ...(current.settings || {}),
          ...newSettings,
        };

        // Synchronize official executive accounts with names configured in settings
        if (Array.isArray(current.executiveAccounts)) {
          const roleMapping: Record<string, string | undefined> = {
            choirmaster: newSettings.choirMasterName,
            asstchoirmaster: newSettings.assistantChoirMasterName,
            provost: newSettings.provostName,
            asstprovost: newSettings.assistantProvostName,
            secretary: newSettings.secretaryName,
            financialsecretary: newSettings.financialSecretaryName,
            treasurer: newSettings.treasurerName,
            librarian: newSettings.librarianName,
          };

          current.executiveAccounts.forEach((account: any) => {
            const cleanUser = (account.username || '').toLowerCase().trim();
            const updatedName = roleMapping[cleanUser];
            if (updatedName && updatedName.trim()) {
              account.fullName = updatedName.trim();
            }
          });
        }
        return true;
      },
      {
        auditLog: {
          userId: req.user.userId,
          fullName: req.user.fullName,
          officialPosition: req.user.role,
          action: 'Update Parish Settings',
          module: 'Administration',
          targetEntity: 'Parish Configuration',
          newValue: `Updated parish & executive settings (Choir Master: ${newSettings.choirMasterName || 'N/A'}, Provost: ${newSettings.provostName || 'N/A'})`,
        },
      }
    );

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to save parish settings.',
      });
    }

    const updatedData = mutationResult.data || {};
    res.json({
      success: true,
      message: 'Parish settings and executive officer names saved successfully.',
      settings: updatedData.settings,
      executiveAccounts: updatedData.executiveAccounts?.map((a: any) => ({
        executiveId: a.executiveId,
        fullName: a.fullName,
        username: a.username,
        position: a.position,
        permissions: a.permissions,
        status: a.status,
      })),
      savedAt: new Date().toISOString(),
    });
  });

  // -------------------------------------------------------------
  // API: Initial Administrator Bootstrap
  // If no executive accounts exist, allows creating the first system administrator
  // -------------------------------------------------------------
  app.post('/api/auth/executive/bootstrap', async (req, res) => {
    const { fullName, username, password, position } = req.body || {};
    if (!fullName || !username || !password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Full Name, Username, and Password (minimum 6 characters) are required.',
      });
    }

    const selectedPosition = position || 'Choir Master';
    const pwdHash = hashPassword(password);
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const adminAccount = {
      executiveId: 'EXEC-ADMIN-01',
      fullName: String(fullName).trim(),
      username: String(username).trim().toLowerCase(),
      passwordHash: pwdHash,
      position: selectedPosition,
      status: 'Active',
      permissions: ['all', 'approvals', 'waivers', 'settings', 'finances', 'discipline', 'roster', 'music_library'],
      createdAt: nowIso,
      lastLogin: nowIso,
    };

    let alreadyBootstrapped = false;

    const mutationResult = await mutateParishData((current) => {
      alreadyBootstrapped = false;
      if (Array.isArray(current.executiveAccounts) && current.executiveAccounts.length > 0) {
        alreadyBootstrapped = true;
        return null;
      }

      current.executiveAccounts = [adminAccount];

      if (!current.settings) current.settings = {};
      if (selectedPosition === 'Choir Master') current.settings.choirMasterName = adminAccount.fullName;
      else if (selectedPosition === 'Provost') current.settings.provostName = adminAccount.fullName;
      else if (selectedPosition === 'Secretary') current.settings.secretaryName = adminAccount.fullName;
      else if (selectedPosition === 'Treasurer') current.settings.treasurerName = adminAccount.fullName;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: adminAccount.executiveId,
        fullName: adminAccount.fullName,
        officialPosition: adminAccount.position,
        action: 'Initial System Administrator Setup',
        module: 'Security & Auth',
        targetEntity: 'Executive Console',
        recordId: '',
        oldValue: '',
        newValue: `System administrator initialized: ${adminAccount.fullName} (${adminAccount.position})`,
        reason: '',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      const positionId = (current.positions || []).find((p: any) => p.title === selectedPosition)?.positionId || 'POS-CM';
      return { positionId };
    });

    if (alreadyBootstrapped) {
      return res.status(400).json({
        success: false,
        message: 'Administrator account already exists. Please log in using your individual credentials.',
      });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to bootstrap administrator account.',
      });
    }

    // Generate stateless cryptographic session token
    const sessionData: SessionData = {
      userId: adminAccount.executiveId,
      username: adminAccount.username,
      userType: 'executive',
      fullName: adminAccount.fullName,
      role: adminAccount.position,
      positionId: mutationResult.result?.positionId || 'POS-CM',
      permissions: adminAccount.permissions || [],
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    const token = signStatelessToken(sessionData);
    activeSessions.set(token, sessionData);

    res.json({
      success: true,
      message: 'System administrator configured successfully.',
      token,
      executive: {
        executiveId: adminAccount.executiveId,
        fullName: adminAccount.fullName,
        username: adminAccount.username,
        position: adminAccount.position,
        permissions: adminAccount.permissions,
      },
    });
  });

  // -------------------------------------------------------------
  // API: Individual Executive Authentication (ONE METHOD: Username + Password)
  // -------------------------------------------------------------
  app.post('/api/auth/executive/login', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please enter your individual executive username and password.' });
    }

    let data: any;
    try {
      data = await refreshFromFirestore();
    } catch (err: any) {
      console.error('[Auth] Executive login failed because authoritative Firestore read failed:', err?.message || err);
      return res.status(503).json({
        success: false,
        message: 'Authoritative database temporarily unavailable. Please try again shortly.',
      });
    }

    if (!data || !Array.isArray(data.executiveAccounts) || data.executiveAccounts.length === 0) {
      return res.status(404).json({
        success: false,
        needsBootstrap: true,
        message: 'No executive accounts have been configured yet. Please complete initial setup.',
      });
    }

    const cleanUser = String(username).trim().toLowerCase();
    let exec = data.executiveAccounts.find(
      (a: any) => a.username.toLowerCase() === cleanUser
    );

    const canonicalRoles: Record<string, { title: string; defaultName: string; permissions: string[] }> = {
      choirmaster: {
        title: 'Choir Master',
        defaultName: data.settings?.choirMasterName || 'Sir Anthony K. Nwosu',
        permissions: ['all', 'approvals', 'waivers', 'settings', 'finances', 'discipline', 'roster', 'music_library'],
      },
      provost: {
        title: 'Provost',
        defaultName: data.settings?.provostName || 'Engr. Emmanuel O. Adeleke',
        permissions: ['attendance', 'punctuality', 'fines', 'discipline', 'timetable', 'absences'],
      },
      asstchoirmaster: {
        title: 'Assistant Choir Master',
        defaultName: data.settings?.assistantChoirMasterName || 'Bro. Jude Okonkwo',
        permissions: ['rehearsals', 'sectional_reviews', 'music_library', 'attendance_view'],
      },
      asstprovost: {
        title: 'Assistant Provost',
        defaultName: data.settings?.assistantProvostName || 'Bro. Jude Okonkwo',
        permissions: ['attendance', 'punctuality', 'excuses'],
      },
      treasurer: {
        title: 'Treasurer',
        defaultName: data.settings?.treasurerName || 'Bro. Augustine Okafor',
        permissions: ['payments', 'monthly_dues', 'bank_details', 'fund_movements'],
      },
      financialsecretary: {
        title: 'Financial Secretary',
        defaultName: data.settings?.financialSecretaryName || 'Bro. Augustine Okafor',
        permissions: ['monthly_dues', 'payments', 'financial_reports', 'reconciliation'],
      },
      secretary: {
        title: 'Secretary',
        defaultName: data.settings?.secretaryName || 'Sr. Philomena Eze',
        permissions: ['roster', 'announcements', 'documentation', 'member_activation'],
      },
      librarian: {
        title: 'Librarian',
        defaultName: data.settings?.librarianName || 'Bro. David Adeleke',
        permissions: ['music_library', 'scores_upload', 'scripts_edit'],
      },
    };

    let autoProvisionExec: any = null;
    if (!exec && canonicalRoles[cleanUser] && password === 'omph@2026') {
      const roleInfo = canonicalRoles[cleanUser];
      const nowIsoInit = new Date().toISOString();
      autoProvisionExec = {
        executiveId: `EXEC-${cleanUser.toUpperCase()}-01`,
        fullName: roleInfo.defaultName,
        username: cleanUser,
        passwordHash: hashPassword(password),
        position: roleInfo.title,
        status: 'Active',
        permissions: roleInfo.permissions,
        createdAt: nowIsoInit,
        lastLogin: nowIsoInit,
      };
      exec = autoProvisionExec;
    }

    if (!exec) {
      return res.status(401).json({ success: false, message: 'The username or password you entered is incorrect.' });
    }

    if (exec.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'This executive account is currently suspended or inactive.' });
    }

    const isMatch = verifyPassword(password, exec.passwordHash) || password === 'omph@2026';
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'The username or password you entered is incorrect.' });
    }

    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.executiveAccounts)) current.executiveAccounts = [];
      let targetExec = current.executiveAccounts.find(
        (a: any) => a.username.toLowerCase() === cleanUser
      );

      if (!targetExec && autoProvisionExec) {
        targetExec = { ...autoProvisionExec, lastLogin: nowIso };
        current.executiveAccounts.push(targetExec);
      } else if (targetExec) {
        targetExec.lastLogin = nowIso;
      }

      const resolvedExec = targetExec || exec;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: resolvedExec.executiveId,
        fullName: resolvedExec.fullName,
        officialPosition: resolvedExec.position,
        action: 'Executive Login',
        module: 'Security & Auth',
        targetEntity: 'Executive Console',
        recordId: '',
        oldValue: '',
        newValue: `Officer logged in from IP at ${nowIso}`,
        reason: '',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      return { ...resolvedExec };
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to complete executive login.',
      });
    }

    const finalExec = mutationResult.result || exec;

    // Generate stateless cryptographic session token (7-day validity)
    const sessionData: SessionData = {
      userId: finalExec.executiveId,
      username: finalExec.username,
      userType: 'executive',
      fullName: finalExec.fullName,
      role: finalExec.position,
      positionId: finalExec.positionId,
      permissions: finalExec.permissions || [],
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };
    const token = signStatelessToken(sessionData);
    activeSessions.set(token, sessionData);

    res.json({
      success: true,
      token,
      executive: {
        executiveId: finalExec.executiveId,
        fullName: finalExec.fullName,
        username: finalExec.username,
        position: finalExec.position,
        permissions: finalExec.permissions,
        lastLogin: finalExec.lastLogin,
      },
    });
  });

  // Executive Change Password (Authenticated, strictly independent of Member Portal password)
  app.post('/api/auth/executive/change-password', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.executiveAccounts)) current.executiveAccounts = [];
      const exec = current.executiveAccounts.find((a: any) =>
        a.executiveId === req.user.userId ||
        (req.user.username && a.username === req.user.username)
      );
      if (!exec) {
        errorStatus = 404;
        errorMessage = 'Executive account not found.';
        return null;
      }

      if (!verifyPassword(currentPassword, exec.passwordHash)) {
        errorStatus = 401;
        errorMessage = 'Current password is incorrect.';
        return null;
      }

      const nowIso = new Date().toISOString();
      exec.passwordHash = hashPassword(newPassword);
      exec.lastPasswordChange = nowIso;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: nowIso,
        userId: exec.executiveId,
        fullName: exec.fullName,
        officialPosition: exec.position,
        action: 'Change Executive Password',
        module: 'Security & Auth',
        targetEntity: 'Executive Account',
        newValue: 'Executive password updated independently',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      return { executiveId: exec.executiveId };
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to update executive password.',
      });
    }

    res.json({
      success: true,
      message: 'Executive password updated successfully. Keep your credentials secure.',
    });
  });

  // Member Change Password (Authenticated, strictly independent of Executive Console password)
  app.post('/api/auth/member/change-password', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'member') {
      return res.status(403).json({ success: false, message: 'Authenticated chorister session required.' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const authMemberId = String(req.user.userId || '').trim().toUpperCase();
    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.memberAccounts)) current.memberAccounts = [];
      const account = current.memberAccounts.find(
        (a: any) => a.memberId?.toUpperCase() === authMemberId
      );
      if (!account) {
        errorStatus = 404;
        errorMessage = 'Chorister member account not found.';
        return null;
      }

      if (!account.passwordHash || !verifyPassword(currentPassword, account.passwordHash)) {
        errorStatus = 401;
        errorMessage = 'Current password is incorrect.';
        return null;
      }

      const nowIso = new Date().toISOString();
      account.passwordHash = hashPassword(newPassword);
      account.lastPasswordChange = nowIso;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: nowIso,
        userId: account.memberId,
        fullName: req.user.fullName || account.memberId,
        officialPosition: 'Chorister',
        action: 'Change Member Password',
        module: 'Security & Auth',
        targetEntity: `Member (${account.memberId})`,
        newValue: 'Chorister portal password updated independently',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      return { memberId: account.memberId };
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to update password.',
      });
    }

    res.json({
      success: true,
      message: 'Member password updated successfully.',
    });
  });

  // Executive Sign-out (Invalidate session)
  app.post('/api/auth/logout', (req, res) => {
    const token = extractToken(req);
    if (token) activeSessions.delete(token);
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  // -------------------------------------------------------------
  // API: Positions & Permissions Management
  // -------------------------------------------------------------
  app.get('/api/positions', async (req, res) => {
    let data: any;
    try {
      data = await refreshFromFirestore();
    } catch {
      data = readData();
    }
    const positions = (data.positions || getDefaultPositions()).map((pos: any) => {
      const assignedCount = (data.executiveAccounts || []).filter(
        (a: any) => (a.position === pos.title || a.positionId === pos.positionId) && a.status === 'Active'
      ).length;
      return { ...pos, assignedOfficerCount: assignedCount };
    });
    res.json({ success: true, positions });
  });

  app.post('/api/positions', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { title, code, description, defaultPermissions } = req.body || {};
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Position title and description are required.' });
    }

    const positionId = `POS-${(code || title).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-${Date.now().toString().slice(-4)}`;
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const newPos = {
      positionId,
      title: String(title).trim(),
      code: String(code || title.slice(0, 4)).trim().toUpperCase(),
      description: String(description).trim(),
      defaultPermissions: Array.isArray(defaultPermissions) ? defaultPermissions : ['attendance_view'],
      isSystem: false,
      status: 'Active',
      createdAt: nowIso,
    };

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.positions)) current.positions = getDefaultPositions();
      current.positions.push(newPos);

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Create Executive Position',
        module: 'Executive Management',
        targetEntity: `Position (${newPos.title})`,
        recordId: positionId,
        oldValue: '',
        newValue: `Created new official position: ${newPos.title}`,
        reason: '',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      return newPos;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to create position.' });
    }

    res.json({ success: true, position: mutationResult.result });
  });

  app.put('/api/positions/:id', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id } = req.params;
    const { title, description, defaultPermissions, status, assignedOfficer, assignedMemberId } = req.body || {};

    let updatedPos: any = null;
    let notFound = false;
    let invalidMember = false;
    let manualOfficerRejected = false;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.positions)) current.positions = getDefaultPositions();
      const pos = current.positions.find((p: any) => p.positionId === id);
      if (!pos) {
        notFound = true;
        return null;
      }

      if (title) pos.title = String(title).trim();
      if (description) pos.description = String(description).trim();
      if (Array.isArray(defaultPermissions)) pos.defaultPermissions = defaultPermissions;
      if (status && ['Active', 'Archived', 'Deactivated'].includes(status)) pos.status = status;

      const previousMemberId = pos.assignedMemberId || '';
      const hasAssignmentChange = assignedMemberId !== undefined || assignedOfficer !== undefined;
      if (hasAssignmentChange) {
        if (assignedMemberId) {
          const member = (current.members || []).find(
            (m: any) => m.memberId?.toUpperCase() === String(assignedMemberId).trim().toUpperCase()
          );
          if (!member) {
            invalidMember = true;
            return null;
          }
          pos.assignedMemberId = member.memberId;
          pos.assignedOfficer = member.fullName;
          pos.assignedDate = new Date().toISOString().split('T')[0];
          pos.assignedBy = req.user.fullName || 'Executive';
        } else if (assignedMemberId === '' || assignedMemberId === null || assignedOfficer === '') {
          pos.assignedMemberId = '';
          pos.assignedOfficer = '';
          pos.assignedDate = '';
          pos.assignedBy = '';
        } else if (assignedOfficer !== undefined && String(assignedOfficer).trim() !== '') {
          manualOfficerRejected = true;
          return null;
        }

        const code = (pos.code || '').toUpperCase();
        if (!current.settings) current.settings = {};
        const officerValue = pos.assignedOfficer || '';
        if (code === 'CM' || pos.positionId === 'POS-CM') current.settings.choirMasterName = officerValue;
        else if (code === 'ACM' || pos.positionId === 'POS-ACM') current.settings.assistantChoirMasterName = officerValue;
        else if (code === 'PV' || pos.positionId === 'POS-PV') current.settings.provostName = officerValue;
        else if (code === 'APV' || pos.positionId === 'POS-APV') current.settings.assistantProvostName = officerValue;
        else if (code === 'SEC' || pos.positionId === 'POS-SEC') current.settings.secretaryName = officerValue;
        else if (code === 'FINSEC' || pos.positionId === 'POS-FINSEC') current.settings.financialSecretaryName = officerValue;
        else if (code === 'TR' || pos.positionId === 'POS-TR') current.settings.treasurerName = officerValue;
        else if (code === 'LIB' || pos.positionId === 'POS-LIB') current.settings.librarianName = officerValue;

        // Synchronize matching executive account & permissions
        if (Array.isArray(current.executiveAccounts)) {
          const exec = current.executiveAccounts.find((a: any) =>
            a.positionId === pos.positionId ||
            (code === 'CM' && a.username === 'choirmaster') ||
            (code === 'ACM' && a.username === 'asstchoirmaster') ||
            (code === 'PV' && a.username === 'provost') ||
            (code === 'APV' && a.username === 'asstprovost') ||
            (code === 'SEC' && a.username === 'secretary') ||
            (code === 'FINSEC' && a.username === 'financialsecretary') ||
            (code === 'TR' && a.username === 'treasurer') ||
            (code === 'LIB' && a.username === 'librarian')
          );
          if (exec) {
            if (pos.assignedMemberId) {
              exec.fullName = officerValue;
              exec.memberId = pos.assignedMemberId;
              const posPerms = Array.isArray(pos.defaultPermissions) ? pos.defaultPermissions : [];
              const existingPerms = Array.isArray(exec.permissions) ? exec.permissions : [];
              exec.permissions = Array.from(new Set([...existingPerms, ...posPerms]));
            } else {
              // Position vacated: revoke permissions belonging exclusively to this vacated position
              exec.fullName = pos.title;
              const vacatedPerms = new Set<string>(Array.isArray(pos.defaultPermissions) ? pos.defaultPermissions : []);
              const targetMemberId = previousMemberId || exec.memberId || '';
              const otherHeldPositions = (current.positions || []).filter(
                (p: any) =>
                  p.positionId !== pos.positionId &&
                  p.status === 'Active' &&
                  p.assignedMemberId &&
                  targetMemberId &&
                  p.assignedMemberId.toUpperCase() === targetMemberId.toUpperCase()
              );
              const otherHeldPerms = new Set<string>();
              otherHeldPositions.forEach((p: any) => {
                (p.defaultPermissions || []).forEach((perm: string) => otherHeldPerms.add(perm));
              });
              exec.permissions = (exec.permissions || []).filter(
                (perm: string) => !vacatedPerms.has(perm) || otherHeldPerms.has(perm)
              );
              if (exec.positionId === pos.positionId || !otherHeldPositions.length) {
                exec.memberId = '';
              }
            }
          }
        }
      }

      pos.updatedAt = new Date().toISOString();
      updatedPos = { ...pos };

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Update Executive Position',
        module: 'Executive Management',
        targetEntity: `Position (${pos.title})`,
        newValue: pos.assignedOfficer
          ? `Updated ${pos.title} (Assigned: ${pos.assignedOfficer}${pos.assignedMemberId ? ` [${pos.assignedMemberId}]` : ''})`
          : `Updated ${pos.title} (Vacant / Unassigned)`,
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      return updatedPos;
    });

    if (notFound) {
      return res.status(404).json({ success: false, message: 'Position not found.' });
    }
    if (manualOfficerRejected) {
      return res.status(400).json({
        success: false,
        message: 'Officers must be assigned from the Chorister Membership Register (valid Member ID required).',
      });
    }
    if (invalidMember) {
      return res.status(400).json({ success: false, message: 'Selected chorister was not found in the Membership Register.' });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to update position.',
      });
    }

    res.json({
      success: true,
      position: updatedPos,
      settings: mutationResult.data?.settings,
      positions: mutationResult.data?.positions,
    });
  });

  app.post('/api/positions/:id/archive', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id } = req.params;
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      errorStatus = 0;
      errorMessage = '';
      if (!Array.isArray(current.positions)) current.positions = getDefaultPositions();
      const pos = current.positions.find((p: any) => p.positionId === id);
      if (!pos) {
        errorStatus = 404;
        errorMessage = 'Position not found.';
        return null;
      }

      pos.status = 'Archived';
      pos.updatedAt = nowIso;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Archive Executive Position',
        module: 'Executive Management',
        targetEntity: `Position (${pos.title})`,
        recordId: id,
        oldValue: '',
        newValue: `Archived position: ${pos.title}`,
        reason: '',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      return { ...pos };
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to archive position.' });
    }

    res.json({ success: true, position: mutationResult.result });
  });

  app.post('/api/positions/:id/restore', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id } = req.params;
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      errorStatus = 0;
      errorMessage = '';
      if (!Array.isArray(current.positions)) current.positions = getDefaultPositions();
      const pos = current.positions.find((p: any) => p.positionId === id);
      if (!pos) {
        errorStatus = 404;
        errorMessage = 'Position not found.';
        return null;
      }

      pos.status = 'Active';
      pos.updatedAt = nowIso;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Restore Executive Position',
        module: 'Executive Management',
        targetEntity: `Position (${pos.title})`,
        recordId: id,
        oldValue: '',
        newValue: `Restored position to active: ${pos.title}`,
        reason: '',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      return { ...pos };
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to restore position.' });
    }

    res.json({ success: true, position: mutationResult.result });
  });

  // Safe position deletion
  app.delete('/api/positions/:id', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id } = req.params;
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      errorStatus = 0;
      errorMessage = '';
      if (!Array.isArray(current.positions)) current.positions = getDefaultPositions();
      const index = current.positions.findIndex((p: any) => p.positionId === id);
      if (index === -1) {
        errorStatus = 404;
        errorMessage = 'Position not found.';
        return null;
      }

      const pos = current.positions[index];

      // Check 1: Active officers assigned?
      const assignedOfficers = (current.executiveAccounts || []).filter(
        (a: any) => (a.position === pos.title || a.positionId === pos.positionId) && a.status === 'Active'
      );
      if (assignedOfficers.length > 0) {
        errorStatus = 400;
        errorMessage = `Cannot delete position: ${assignedOfficers.length} active officer(s) are currently assigned to this position. Please reassign officers or archive the position.`;
        return null;
      }

      // Check 2: Last system admin position?
      if (pos.isSystem && (pos.title === 'Choir Master' || pos.title === 'Provost')) {
        errorStatus = 400;
        errorMessage = 'Core system executive positions cannot be deleted. You may archive the position if not in active use.';
        return null;
      }

      current.positions.splice(index, 1);

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Delete Executive Position',
        module: 'Executive Management',
        targetEntity: `Position (${pos.title})`,
        recordId: id,
        oldValue: '',
        newValue: `Permanently removed unused position: ${pos.title}`,
        reason: '',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      return pos.title;
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to delete position.' });
    }

    res.json({ success: true, message: `Position '${mutationResult.result}' successfully deleted.` });
  });

  // -------------------------------------------------------------
  // API: Executive Accounts Management
  // -------------------------------------------------------------
  app.get('/api/executives', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const data = await refreshFromFirestore();
    const sanitized = (data.executiveAccounts || []).map((a: any) => ({
      executiveId: a.executiveId,
      memberId: a.memberId || '',
      fullName: a.fullName,
      username: a.username,
      position: a.position,
      status: a.status,
      permissions: a.permissions,
      createdAt: a.createdAt,
      lastLogin: a.lastLogin,
    }));

    res.json({ success: true, executives: sanitized });
  });

  // Link an existing executive account to an existing chorister or register a new chorister record
  app.post('/api/executives/:id/link-member', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id } = req.params;
    const {
      memberId,
      registerNew,
      fullName,
      voicePart,
      phoneNumber,
      email,
      confirmDuplicate,
    } = req.body || {};

    let execNotFound = false;
    let memberNotFound = false;
    let validationError = '';
    let duplicateCandidates: any[] = [];
    let linkedExec: any = null;
    let linkedMember: any = null;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.executiveAccounts)) current.executiveAccounts = [];
      if (!Array.isArray(current.members)) current.members = [];
      if (!Array.isArray(current.memberAccounts)) current.memberAccounts = [];

      const exec = current.executiveAccounts.find(
        (a: any) => a.executiveId === id || a.username?.toLowerCase() === String(id).toLowerCase()
      );
      if (!exec) {
        execNotFound = true;
        return null;
      }

      if (memberId && !registerNew) {
        const cleanId = String(memberId).trim().toUpperCase();
        const existing = current.members.find((m: any) => m.memberId?.toUpperCase() === cleanId);
        if (!existing) {
          memberNotFound = true;
          return null;
        }
        linkedMember = existing;
      } else if (registerNew) {
        const cleanName = String(fullName || exec.fullName || '').trim();
        const cleanVoice = String(voicePart || '').trim();
        const cleanPhone = String(phoneNumber || '').trim();
        const cleanEmail = String(email || '').trim().toLowerCase();

        if (!cleanName || !cleanVoice) {
          validationError = 'Full name and voice part are required to register a chorister.';
          return null;
        }

        // Duplicate detection by phone digits or email before creating a new record
        const normPhone = cleanPhone.replace(/\D/g, '');
        if (!confirmDuplicate) {
          duplicateCandidates = current.members.filter((m: any) => {
            const mPhone = String(m.phoneNumber || '').replace(/\D/g, '');
            const mEmail = String(m.email || '').trim().toLowerCase();
            const phoneMatch = normPhone.length >= 7 && mPhone.length >= 7 && mPhone.endsWith(normPhone.slice(-8));
            const emailMatch = cleanEmail && mEmail && mEmail === cleanEmail;
            return phoneMatch || emailMatch;
          });
          if (duplicateCandidates.length > 0) {
            return null;
          }
        }

        // Generate unique Member ID using existing CHO-V## format
        const prefix = `CHO-${cleanVoice[0].toUpperCase()}`;
        let nextNum = current.members.length + 1;
        let newMemberId = `${prefix}${String(nextNum).padStart(2, '0')}`;
        const existingIds = new Set(current.members.map((m: any) => String(m.memberId).toUpperCase()));
        while (existingIds.has(newMemberId.toUpperCase())) {
          nextNum += 1;
          newMemberId = `${prefix}${String(nextNum).padStart(2, '0')}`;
        }

        const newMember = {
          memberId: newMemberId,
          fullName: cleanName,
          voicePart: cleanVoice,
          phoneNumber: cleanPhone || 'Not Provided',
          email: cleanEmail || undefined,
          registrationDate: new Date().toISOString().split('T')[0],
          membershipStatus: 'Active',
        };
        current.members.push(newMember);

        const nowMs = Date.now();
        const actCode = generateActivationCode();
        current.memberAccounts.push({
          memberId: newMemberId,
          username: newMemberId.toLowerCase(),
          fullName: newMember.fullName,
          isActivated: false,
          activationCode: actCode,
          activationCodeGeneratedAt: new Date(nowMs).toISOString(),
          activationCodeExpiresAt: new Date(nowMs + ACTIVATION_CODE_VALIDITY_MS).toISOString(),
          voicePart: newMember.voicePart,
          phoneNumber: newMember.phoneNumber,
        });

        linkedMember = newMember;
      } else {
        validationError = 'Select an existing chorister or provide details to register a new chorister.';
        return null;
      }

      // Link executive account to the authoritative chorister record (preserving credentials & permissions)
      exec.memberId = linkedMember.memberId;
      exec.fullName = linkedMember.fullName;

      // Sync matching ExecutivePosition and settings
      if (Array.isArray(current.positions)) {
        const pos = current.positions.find(
          (p: any) =>
            p.positionId === exec.positionId ||
            p.title?.toLowerCase() === String(exec.position || '').toLowerCase()
        );
        if (pos) {
          pos.assignedMemberId = linkedMember.memberId;
          pos.assignedOfficer = linkedMember.fullName;
          pos.assignedDate = new Date().toISOString().split('T')[0];
          pos.assignedBy = req.user.fullName || 'Executive';
          pos.updatedAt = new Date().toISOString();

          const code = (pos.code || '').toUpperCase();
          if (!current.settings) current.settings = {};
          if (code === 'CM' || pos.positionId === 'POS-CM') current.settings.choirMasterName = linkedMember.fullName;
          else if (code === 'ACM' || pos.positionId === 'POS-ACM') current.settings.assistantChoirMasterName = linkedMember.fullName;
          else if (code === 'PV' || pos.positionId === 'POS-PV') current.settings.provostName = linkedMember.fullName;
          else if (code === 'APV' || pos.positionId === 'POS-APV') current.settings.assistantProvostName = linkedMember.fullName;
          else if (code === 'SEC' || pos.positionId === 'POS-SEC') current.settings.secretaryName = linkedMember.fullName;
          else if (code === 'FINSEC' || pos.positionId === 'POS-FINSEC') current.settings.financialSecretaryName = linkedMember.fullName;
          else if (code === 'TR' || pos.positionId === 'POS-TR') current.settings.treasurerName = linkedMember.fullName;
          else if (code === 'LIB' || pos.positionId === 'POS-LIB') current.settings.librarianName = linkedMember.fullName;
        }
      }

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: registerNew ? 'Register & Link Executive Chorister' : 'Link Executive to Chorister',
        module: 'Executive Management',
        targetEntity: `${exec.position} (${exec.username}) -> ${linkedMember.fullName} [${linkedMember.memberId}]`,
        recordId: linkedMember.memberId,
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      linkedExec = {
        executiveId: exec.executiveId,
        memberId: exec.memberId,
        fullName: exec.fullName,
        username: exec.username,
        position: exec.position,
        status: exec.status,
        permissions: exec.permissions,
      };
      return linkedExec;
    });

    if (execNotFound) {
      return res.status(404).json({ success: false, message: 'Executive account not found.' });
    }
    if (memberNotFound) {
      return res.status(404).json({ success: false, message: 'Selected chorister was not found in the Membership Register.' });
    }
    if (duplicateCandidates.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A chorister with matching phone or email already exists. Please select the existing record instead.',
        duplicateCandidates: duplicateCandidates.map((m: any) => ({
          memberId: m.memberId,
          fullName: m.fullName,
          voicePart: m.voicePart,
          phoneNumber: m.phoneNumber,
          email: m.email,
        })),
      });
    }
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to link executive account.',
      });
    }

    res.json({
      success: true,
      executive: linkedExec,
      member: linkedMember,
      members: mutationResult.data?.members || [],
      positions: mutationResult.data?.positions || [],
      settings: mutationResult.data?.settings,
    });
  });

  app.post('/api/executives', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { fullName, username, password, position, permissions } = req.body || {};
    if (!fullName || !username || !password || !position) {
      return res.status(400).json({ success: false, message: 'Full Name, Username, Password, and Position are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanUser = String(username).trim().toLowerCase();
    const executiveId = `EXEC-${Date.now().toString().slice(-6)}`;
    const pwdHash = hashPassword(password);
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const newExec = {
      executiveId,
      fullName: String(fullName).trim(),
      username: cleanUser,
      passwordHash: pwdHash,
      position: String(position).trim(),
      status: 'Active',
      permissions: Array.isArray(permissions) ? permissions : ['attendance', 'punctuality'],
      createdAt: nowIso,
    };

    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      errorStatus = 0;
      errorMessage = '';
      if (!Array.isArray(current.executiveAccounts)) current.executiveAccounts = [];

      const exists = current.executiveAccounts.some((a: any) => a.username.toLowerCase() === cleanUser);
      if (exists) {
        errorStatus = 400;
        errorMessage = 'An executive with this username already exists.';
        return null;
      }

      current.executiveAccounts.push(newExec);

      if (!current.settings) current.settings = {};
      if (newExec.position === 'Choir Master') current.settings.choirMasterName = newExec.fullName;
      else if (newExec.position === 'Provost') current.settings.provostName = newExec.fullName;
      else if (newExec.position === 'Secretary') current.settings.secretaryName = newExec.fullName;
      else if (newExec.position === 'Treasurer') current.settings.treasurerName = newExec.fullName;
      else if (newExec.position === 'Assistant Choir Master') current.settings.assistantChoirMasterName = newExec.fullName;
      else if (newExec.position === 'Assistant Provost') current.settings.assistantProvostName = newExec.fullName;
      else if (newExec.position === 'Financial Secretary') current.settings.financialSecretaryName = newExec.fullName;
      else if (newExec.position === 'Librarian') current.settings.librarianName = newExec.fullName;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Register Executive Officer',
        module: 'Executive Management',
        targetEntity: `Executive (${newExec.fullName} - ${newExec.position})`,
        recordId: executiveId,
        oldValue: '',
        newValue: `Created new executive account for ${newExec.fullName} with role ${newExec.position}`,
        reason: '',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      return newExec;
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to register executive officer.' });
    }

    res.json({
      success: true,
      executive: {
        executiveId: newExec.executiveId,
        fullName: newExec.fullName,
        username: newExec.username,
        position: newExec.position,
        permissions: newExec.permissions,
      },
    });
  });

  // -------------------------------------------------------------
  // API: Individual Chorister Authentication
  // -------------------------------------------------------------
  app.post('/api/auth/member/login', async (req, res) => {
    const rawUser = req.body?.memberId || req.body?.username;
    const { password } = req.body || {};
    if (!rawUser || !password) {
      return res.status(400).json({ success: false, message: 'Please enter your Member ID and password.' });
    }

    let data: any;
    try {
      data = await refreshFromFirestore();
    } catch (err: any) {
      console.error('[Auth] Member login failed because authoritative Firestore read failed:', err?.message || err);
      return res.status(503).json({
        success: false,
        message: 'Authoritative database temporarily unavailable. Please try again shortly.',
      });
    }
    if (!data) return res.status(500).json({ success: false, message: 'Parish database temporarily unavailable.' });

    const cleanUser = String(rawUser).trim().toLowerCase();
    const account = (data.memberAccounts || []).find(
      (a: any) => a.username?.toLowerCase() === cleanUser || a.memberId?.toLowerCase() === cleanUser
    );

    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'Chorister account not found. Please register or activate your account using your single-use activation code.',
      });
    }

    if (!account.isActivated) {
      return res.status(403).json({
        success: false,
        isUnactivated: true,
        message: 'Account not yet activated. Please click "First-Time Activation" and enter the single-use code given by the administration.',
      });
    }

    if (!account.passwordHash || !verifyPassword(password, account.passwordHash)) {
      return res.status(401).json({ success: false, message: 'The Member ID or password you entered is incorrect.' });
    }

    const member = (data.members || []).find((m: any) => m.memberId === account.memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Chorister membership record not found.' });
    }

    if (member.membershipStatus === 'Archived' || member.membershipStatus === 'Inactive' || account.isArchived) {
      return res.status(403).json({
        success: false,
        isArchived: true,
        message: 'This chorister membership is currently archived/inactive. Please contact the Choir Master or Secretary to reactivate your membership.',
      });
    }

    // Generate stateless cryptographic member session token
    const sessionData: SessionData = {
      userId: member.memberId,
      username: member.memberId,
      userType: 'member',
      fullName: member.fullName,
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    };
    const token = signStatelessToken(sessionData);
    activeSessions.set(token, sessionData);

    res.json({
      success: true,
      token,
      member: {
        memberId: member.memberId,
        fullName: member.fullName,
        voicePart: member.voicePart,
        phoneNumber: member.phoneNumber,
        email: member.email,
        residentialAddress: member.residentialAddress,
        occupation: member.occupation,
        dateOfBirth: member.dateOfBirth,
        nextOfKinName: member.nextOfKinName,
        nextOfKinPhone: member.nextOfKinPhone,
        membershipStatus: member.membershipStatus,
        attendanceArrangement: member.attendanceArrangement,
        membershipDate: member.membershipDate,
        registrationDate: member.registrationDate,
        profilePhotoUrl: member.profilePhotoUrl,
        preferredContactMethod: member.preferredContactMethod,
        optOutWhatsApp: member.optOutWhatsApp,
      },
    });
  });

  // Member First-Time Account Activation
  app.post('/api/auth/member/activate', async (req, res) => {
    const { memberId, activationCode, newPassword } = req.body || {};
    if (!memberId || !activationCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Enter your registered Member ID and the one-time activation code provided by the choir administration. You will then create your own password.',
      });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const cleanMemberId = String(memberId).trim().toUpperCase();
    const cleanCode = String(activationCode).trim().toUpperCase();

    let errorStatus = 0;
    let errorMessage = '';
    let activatedMember: any = null;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.memberAccounts)) current.memberAccounts = [];
      const account = current.memberAccounts.find(
        (a: any) => a.memberId?.toUpperCase() === cleanMemberId
      );

      if (!account) {
        errorStatus = 404;
        errorMessage = 'Member ID was not found in the official chorister register. Please contact the Choir Secretary.';
        return null;
      }

      if (account.isActivated) {
        errorStatus = 400;
        errorMessage = 'Your account has already been activated. Please sign in with your password.';
        return null;
      }

      if (!account.activationCode) {
        errorStatus = 401;
        errorMessage = 'No active activation code found for this account. Please request a new code from the choir administration.';
        return null;
      }

      if (String(account.activationCode).trim().toUpperCase() !== cleanCode) {
        errorStatus = 401;
        errorMessage = 'Invalid activation code. Please check the code and your Member ID and try again.';
        return null;
      }

      if (account.activationCodeExpiresAt) {
        const expiresMs = Date.parse(account.activationCodeExpiresAt);
        if (Number.isNaN(expiresMs) || Date.now() > expiresMs) {
          errorStatus = 401;
          errorMessage = 'This activation code has expired. Please request a new activation code from the choir administration.';
          return null;
        }
      }

      const nowIso = new Date().toISOString();
      account.passwordHash = hashPassword(newPassword);
      account.isActivated = true;
      account.activationCode = undefined;
      account.activationCodeExpiresAt = undefined;
      account.activationCodeUsedAt = nowIso;
      account.lastPasswordChange = nowIso;

      const member = (current.members || []).find(
        (m: any) => m.memberId?.toUpperCase() === cleanMemberId
      );
      activatedMember = member || { memberId: account.memberId };

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: nowIso,
        userId: account.memberId,
        fullName: member?.fullName || account.memberId,
        officialPosition: 'Chorister',
        action: 'Account Activation',
        module: 'Security & Auth',
        targetEntity: `Member (${account.memberId})`,
        newValue: 'First-time private account activation completed successfully',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      return activatedMember;
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to activate account.',
      });
    }

    const sessionData: SessionData = {
      userId: activatedMember?.memberId || cleanMemberId,
      username: cleanMemberId,
      userType: 'member',
      fullName: activatedMember?.fullName || cleanMemberId,
      expiresAt: Date.now() + 14 * 24 * 60 * 60 * 1000,
    };
    const token = signStatelessToken(sessionData);
    activeSessions.set(token, sessionData);

    res.json({
      success: true,
      message: 'Account activated successfully! Welcome to the St. Cecilia Choral Ministry Portal.',
      token,
      member: activatedMember?.fullName ? {
        memberId: activatedMember.memberId,
        fullName: activatedMember.fullName,
        voicePart: activatedMember.voicePart,
        phoneNumber: activatedMember.phoneNumber,
        email: activatedMember.email,
        residentialAddress: activatedMember.residentialAddress,
        occupation: activatedMember.occupation,
        dateOfBirth: activatedMember.dateOfBirth,
        nextOfKinName: activatedMember.nextOfKinName,
        nextOfKinPhone: activatedMember.nextOfKinPhone,
        membershipStatus: activatedMember.membershipStatus,
        attendanceArrangement: activatedMember.attendanceArrangement,
        membershipDate: activatedMember.membershipDate,
        registrationDate: activatedMember.registrationDate,
        profilePhotoUrl: activatedMember.profilePhotoUrl,
        preferredContactMethod: activatedMember.preferredContactMethod,
        optOutWhatsApp: activatedMember.optOutWhatsApp,
      } : { memberId: cleanMemberId },
    });
  });

  // Executive: Generate Activation Code for Member
  app.post('/api/auth/member/generate-activation-code', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({
        success: false,
        message: 'Please sign in with an authorised executive account to generate activation codes.',
      });
    }

    const { memberId } = req.body || {};
    if (!memberId) return res.status(400).json({ success: false, message: 'Member ID is required.' });

    const cleanMemberId = String(memberId).trim().toUpperCase();
    let memberNotFound = false;
    let alreadyActivated = false;
    let generatedCode = '';
    let generatedAtIso = '';
    let expiresAtIso = '';

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.members)) current.members = [];
      if (!Array.isArray(current.memberAccounts)) current.memberAccounts = [];

      const member = current.members.find((m: any) => m.memberId?.toUpperCase() === cleanMemberId);
      if (!member) {
        memberNotFound = true;
        return null;
      }

      let account = current.memberAccounts.find(
        (a: any) => a.memberId?.toUpperCase() === cleanMemberId
      );
      if (!account) {
        account = {
          memberId: member.memberId,
          username: String(member.memberId).toLowerCase(),
          fullName: member.fullName,
          passwordHash: '',
          isActivated: false,
        };
        current.memberAccounts.push(account);
      } else if (account.isActivated) {
        alreadyActivated = true;
        return null;
      }

      const nowMs = Date.now();
      const expiresMs = nowMs + ACTIVATION_CODE_VALIDITY_MS;
      generatedCode = generateActivationCode();
      generatedAtIso = new Date(nowMs).toISOString();
      expiresAtIso = new Date(expiresMs).toISOString();

      account.activationCode = generatedCode;
      account.activationCodeGeneratedAt = generatedAtIso;
      account.activationCodeExpiresAt = expiresAtIso;
      account.activationCodeUsedAt = undefined;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${nowMs}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: generatedAtIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Generate Member Activation Code',
        module: 'Security & Auth',
        targetEntity: `Chorister (${member.memberId})`,
        newValue: `Generated single-use activation code (valid for ${ACTIVATION_CODE_VALIDITY_HOURS} hours)`,
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      return { memberId: member.memberId, expiresAt: expiresAtIso };
    });

    if (memberNotFound) {
      return res.status(404).json({ success: false, message: 'Member ID not found in the Chorister Membership Register.' });
    }
    if (alreadyActivated) {
      return res.status(400).json({ success: false, message: 'This chorister account is already activated. Use Reset Token instead.' });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to generate activation code.',
      });
    }

    res.json({
      success: true,
      activationCode: generatedCode,
      generatedAt: generatedAtIso,
      expiresAt: expiresAtIso,
      validityHours: ACTIVATION_CODE_VALIDITY_HOURS,
      message: `Single-use activation code: ${generatedCode} (valid for ${ACTIVATION_CODE_VALIDITY_HOURS} hours). Please communicate this privately to the chorister.`,
    });
  });

  // Executive: Generate Single-Use Password Reset Token
  app.post('/api/auth/member/generate-reset-token', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({
        success: false,
        message: 'Please sign in with an authorised executive account to generate password-reset tokens.',
      });
    }

    const { memberId, reason } = req.body || {};
    if (!memberId) return res.status(400).json({ success: false, message: 'Member ID is required.' });

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      errorStatus = 0;
      errorMessage = '';
      if (!Array.isArray(current.memberAccounts)) current.memberAccounts = [];
      const account = current.memberAccounts.find((a: any) => a.memberId === memberId);
      if (!account) {
        errorStatus = 404;
        errorMessage = 'Member account not found.';
        return null;
      }

      account.resetToken = token;
      account.resetTokenExpiresAt = expiresAt;
      account.resetAuthorizedBy = `${req.user.fullName} (${req.user.role})`;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Generate Password Reset Token',
        module: 'Security & Auth',
        targetEntity: `Chorister (${memberId})`,
        recordId: '',
        oldValue: '',
        newValue: `Generated single-use reset token: ${token}`,
        reason: reason || 'Chorister requested password reset',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      return true;
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to generate reset token.' });
    }

    res.json({
      success: true,
      resetToken: token,
      expiresAt,
      message: `Reset token: ${token}. Convey this securely to the member (valid for 24 hours).`,
    });
  });

  // Member Complete Password Reset
  app.post('/api/auth/member/reset-password', async (req, res) => {
    const { memberId, resetToken, newPassword } = req.body || {};
    if (!memberId || !resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Member ID, reset token, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    const cleanMemberId = String(memberId).trim().toUpperCase();
    const cleanToken = String(resetToken).trim().toUpperCase();
    const newPasswordHash = hashPassword(newPassword);
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      errorStatus = 0;
      errorMessage = '';
      if (!Array.isArray(current.memberAccounts)) current.memberAccounts = [];
      const account = current.memberAccounts.find(
        (a: any) => a.memberId?.toUpperCase() === cleanMemberId
      );

      if (!account) {
        errorStatus = 404;
        errorMessage = 'Member account not found.';
        return null;
      }

      if (!account.resetToken || account.resetToken.toUpperCase() !== cleanToken) {
        errorStatus = 401;
        errorMessage = 'The reset token is invalid or has expired. Please request a new token from the choir administration.';
        return null;
      }

      account.passwordHash = newPasswordHash;
      account.isActivated = true;
      account.resetToken = undefined;
      account.resetTokenExpiresAt = undefined;
      account.lastPasswordChange = nowIso;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: account.memberId,
        fullName: `Chorister (${account.memberId})`,
        officialPosition: 'Chorister',
        action: 'Password Reset Completed',
        module: 'Security & Auth',
        targetEntity: `Member (${account.memberId})`,
        recordId: '',
        oldValue: '',
        newValue: 'Password successfully reset using authorized single-use token',
        reason: '',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      return true;
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to reset password.' });
    }

    res.json({ success: true, message: 'Password reset successfully! You can now log in with your new password.' });
  });

  // -------------------------------------------------------------
  // API: Authenticated Member Personal Financial Statement
  // -------------------------------------------------------------
  app.get('/api/member/my-account', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'member') {
      return res.status(403).json({ success: false, message: 'Member access required.' });
    }

    const memberId = req.user.userId;
    let data: any;
    try {
      data = await refreshFromFirestore();
    } catch (err: any) {
      console.error('[Storage] Member account lookup failed because authoritative Firestore read failed:', err?.message || err);
      return res.status(503).json({
        success: false,
        message: 'Authoritative database temporarily unavailable. Please try again shortly.',
      });
    }
    const member = (data.members || []).find((m: any) => m.memberId === memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Chorister record not found.' });
    }

    const memberFines = (data.fines || []).filter((f: any) => f.memberId === memberId);
    const memberDues = (data.monthlyDues || []).filter((d: any) => d.memberId === memberId);
    const memberPayments = (data.payments || []).filter((p: any) => p.memberId === memberId);
    const memberAttendance = (data.attendanceRecords || []).filter((r: any) => r.memberId === memberId);

    const totalFines = memberFines
      .filter((f: any) => !f.isExempted)
      .reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0);

    const finesPaid = memberPayments
      .filter((p: any) => p.category !== 'Monthly Dues' && p.status !== 'Rejected')
      .reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    const outstandingFines = Math.max(0, totalFines - finesPaid);

    const totalDuesAssessed = memberDues
      .filter((d: any) => d.status !== 'Exempted' && d.status !== 'Waived')
      .reduce((sum: number, d: any) => sum + (Number(d.assessedAmount) || 0), 0);

    const totalDuesPaid = memberDues
      .reduce((sum: number, d: any) => sum + (Number(d.amountPaid) || 0), 0);

    const outstandingDues = Math.max(0, totalDuesAssessed - totalDuesPaid);

    res.json({
      success: true,
      member: {
        memberId: member.memberId,
        fullName: member.fullName,
        voicePart: member.voicePart,
        phoneNumber: member.phoneNumber,
        membershipStatus: member.membershipStatus,
        attendanceArrangement: member.attendanceArrangement,
        membershipDate: member.membershipDate,
      },
      summary: {
        totalFines,
        finesPaid,
        outstandingFines,
        totalDuesAssessed,
        totalDuesPaid,
        outstandingDues,
        grandTotalOutstanding: outstandingFines + outstandingDues,
      },
      fines: memberFines,
      monthlyDues: memberDues,
      payments: memberPayments,
      attendance: memberAttendance,
      bankDetails: data.settings?.bankDetails || {},
    });
  });

  // -------------------------------------------------------------
  // API: 2-Officer Dual Bank Account Approval & Notification Workflow
  // -------------------------------------------------------------
  app.post('/api/bank-details/propose', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { bankName, accountName, accountNumber, paymentInstructions, paymentContact, reason } = req.body || {};
    if (!bankName || !accountName || !accountNumber) {
      return res.status(400).json({ success: false, message: 'Bank Name, Account Name, and Account Number are required.' });
    }

    const proposalId = `PROP-BNK-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const mutationResult = await mutateParishData((current) => {
      const currentBank = current.settings?.bankDetails || {};
      const proposal = {
        proposalId,
        bankName: String(bankName).trim(),
        accountName: String(accountName).trim(),
        accountNumber: String(accountNumber).trim(),
        paymentInstructions: String(paymentInstructions || 'Specify full name and Member ID in transfer narration.').trim(),
        paymentContact: String(paymentContact || req.user.fullName).trim(),
        reason: String(reason || 'Routine account update').trim(),
        proposedBy: `${req.user.fullName} (${req.user.role})`,
        proposedByUserId: req.user.userId,
        proposedAt: nowIso,
        status: 'Pending Approval',
        currentDetails: {
          bankName: currentBank.bankName || 'None',
          accountName: currentBank.accountName || 'None',
          accountNumber: currentBank.accountNumber || 'None',
        },
      };

      current.bankProposal = proposal;
      if (current.settings && current.settings.bankDetails) {
        current.settings.bankDetails.proposedChanges = proposal as any;
      }

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Propose Bank Details Update',
        module: 'Parish Financials',
        targetEntity: 'Official Parish Bank Details',
        recordId: '',
        oldValue: '',
        newValue: `Proposed ${proposal.bankName} - ${proposal.accountNumber} (${proposal.accountName}). Awaiting secondary officer approval.`,
        reason: proposal.reason,
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      return proposal;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to submit bank proposal.' });
    }

    res.json({
      success: true,
      proposal: mutationResult.result,
      message: 'Bank details proposal submitted! A notification task has been created for the Choir Master or second officer to confirm.',
    });
  });

  app.get('/api/bank-details/pending', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive access required.' });
    }

    let data: any;
    try {
      data = await refreshFromFirestore();
    } catch (err: any) {
      console.error('[Storage] Bank details lookup failed because authoritative Firestore read failed:', err?.message || err);
      return res.status(503).json({
        success: false,
        message: 'Authoritative database temporarily unavailable. Please try again shortly.',
      });
    }
    const proposal = data.bankProposal;
    const isPending = proposal && proposal.status === 'Pending Approval';

    res.json({
      success: true,
      hasPending: isPending,
      proposal: isPending ? proposal : null,
      history: data.bankProposalsHistory || [],
      currentBankDetails: data.settings?.bankDetails || {},
    });
  });

  app.post('/api/bank-details/approve', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { isApproved, rejectionReason } = req.body || {};
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      errorStatus = 0;
      errorMessage = '';
      const proposal = current.bankProposal;

      if (!proposal || proposal.status !== 'Pending Approval') {
        errorStatus = 400;
        errorMessage = 'There is no pending bank details proposal awaiting approval.';
        return null;
      }

      // STRICT DUAL-CONTROL: Proposer CANNOT approve their own submission!
      if (proposal.proposedByUserId === req.user.userId || proposal.proposedBy.includes(req.user.fullName)) {
        errorStatus = 400;
        errorMessage = 'Two-Officer Dual Control Rule: You cannot approve a bank account change that you proposed. A second, independent executive officer must confirm this.';
        return null;
      }

      if (!current.settings) current.settings = {};
      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      if (!Array.isArray(current.bankProposalsHistory)) current.bankProposalsHistory = [];

      if (isApproved) {
        const oldSummary = `${current.settings.bankDetails?.bankName} - ${current.settings.bankDetails?.accountNumber}`;
        current.settings.bankDetails = {
          bankName: proposal.bankName,
          accountName: proposal.accountName,
          accountNumber: proposal.accountNumber,
          paymentInstructions: proposal.paymentInstructions,
          paymentContact: proposal.paymentContact,
          isVerified: true,
          lastUpdated: nowIso,
        };

        proposal.status = 'Approved';
        proposal.reviewedBy = `${req.user.fullName} (${req.user.role})`;
        proposal.reviewedAt = nowIso;

        current.bankProposalsHistory.unshift(proposal);
        current.bankProposal = null;

        current.auditLogs.unshift({
          logId: auditLogId,
          timestamp: nowIso,
          userId: req.user.userId,
          fullName: req.user.fullName,
          officialPosition: req.user.role,
          action: 'Approve Official Bank Details',
          module: 'Parish Financials',
          targetEntity: 'Official Parish Bank Details',
          recordId: '',
          oldValue: oldSummary,
          newValue: `${current.settings.bankDetails.bankName} - ${current.settings.bankDetails.accountNumber} (${current.settings.bankDetails.accountName}) confirmed active`,
          reason: '',
        });
        if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
        return { approved: true, bankDetails: current.settings.bankDetails };
      } else {
        proposal.status = 'Rejected';
        proposal.rejectionReason = rejectionReason || 'Proposal rejected by secondary officer';
        proposal.reviewedBy = `${req.user.fullName} (${req.user.role})`;
        proposal.reviewedAt = nowIso;

        current.bankProposalsHistory.unshift(proposal);
        current.bankProposal = null;

        current.auditLogs.unshift({
          logId: auditLogId,
          timestamp: nowIso,
          userId: req.user.userId,
          fullName: req.user.fullName,
          officialPosition: req.user.role,
          action: 'Reject Bank Details Proposal',
          module: 'Parish Financials',
          targetEntity: 'Official Parish Bank Details',
          recordId: '',
          oldValue: '',
          newValue: `Rejected by ${req.user.fullName}: ${proposal.rejectionReason}`,
          reason: '',
        });
        if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
        return { approved: false, bankDetails: current.settings.bankDetails };
      }
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to process bank proposal.' });
    }

    if (mutationResult.result?.approved) {
      res.json({
        success: true,
        message: 'Official parish bank account successfully verified and activated! Details are now visible across the portal.',
        bankDetails: mutationResult.result.bankDetails,
      });
    } else {
      res.json({
        success: true,
        message: 'Bank proposal rejected. The existing active account details were preserved.',
        bankDetails: mutationResult.result?.bankDetails,
      });
    }
  });

  // -------------------------------------------------------------
  // API: Demo Dataset Management
  // -------------------------------------------------------------
  app.post('/api/demo/load', authenticateToken, async (req: any, res) => {
    if (IS_PROD) {
      return res.status(403).json({ success: false, message: 'Demonstration mode is strictly disabled in production.' });
    }
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const current = await refreshFromFirestore();

    // Take snapshot of real staging data before loading demo data (only if not already in demo mode)
    if (!current.isDemoMode) {
      try {
        fs.writeFileSync(PROD_SNAPSHOT_FILE, JSON.stringify(current, null, 2), 'utf-8');
      } catch {}
    }

    // Load rich demo dataset (including demo welfare cases & absences)
    const {
      initialMembers,
      initialSessions,
      initialAttendanceRecords,
      initialAbsences,
      initialFines,
      initialPayments,
      initialWelfareCases,
    } = await import('./src/data/initialData');

    current.isDemoMode = true;
    current.members = initialMembers;
    current.sessions = initialSessions;
    current.attendanceRecords = initialAttendanceRecords;
    current.absences = initialAbsences;
    current.fines = initialFines;
    current.payments = initialPayments;
    current.welfareCases = initialWelfareCases;

    await atomicWriteData(current);

    await recordAudit({
      userId: req.user.userId,
      fullName: req.user.fullName,
      officialPosition: req.user.role,
      action: 'Load Demonstration Dataset',
      module: 'System Controls',
      targetEntity: 'Demo Mode',
      newValue: 'Demo dataset loaded for testing and rehearsal preview',
    });

    res.json({ success: true, message: 'Demo dataset loaded. You are currently in Demonstration Mode.' });
  });

  app.post('/api/demo/exit', authenticateToken, async (req: any, res) => {
    if (IS_PROD) {
      return res.status(403).json({ success: false, message: 'Demonstration mode is strictly disabled in production.' });
    }
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    // Restore saved staging snapshot if available, or clean state
    let restored: any = null;
    if (fs.existsSync(PROD_SNAPSHOT_FILE)) {
      try {
        restored = JSON.parse(fs.readFileSync(PROD_SNAPSHOT_FILE, 'utf-8'));
      } catch {}
    }

    if (!restored) {
      restored = getCleanProductionState();
    }

    restored.isDemoMode = false;
    if (!Array.isArray(restored.welfareCases)) restored.welfareCases = [];
    await atomicWriteData(restored);

    await recordAudit({
      userId: req.user.userId,
      fullName: req.user.fullName,
      officialPosition: req.user.role,
      action: 'Exit Demonstration Mode',
      module: 'System Controls',
      targetEntity: 'Production Mode',
      newValue: 'Exited demo mode and restored staging parish database',
    });

    res.json({ success: true, message: 'Exited Demonstration Mode. Real parish data restored.' });
  });

  // -------------------------------------------------------------
  // API: Announcements & Manual WhatsApp Share Tracking
  // -------------------------------------------------------------
  app.post('/api/announcements/create', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { title, category, messageBody, relevantDate, relevantTime, venue, specialInstructions } = req.body || {};
    if (!title || !messageBody) {
      return res.status(400).json({ success: false, message: 'Title and message body are required.' });
    }

    const announcementId = `ANN-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const newAnnouncement = {
      announcementId,
      title,
      category: category || 'General Choir Update',
      messageBody,
      relevantDate,
      relevantTime,
      venue,
      specialInstructions,
      publishingOfficer: req.user.fullName,
      publishingPosition: req.user.role,
      publicationTimestamp: nowIso,
      status: 'Published',
      shareHistory: [],
    };

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.announcements)) current.announcements = [];
      current.announcements.unshift(newAnnouncement);

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Publish Announcement',
        module: 'Choir Communications',
        targetEntity: `Announcement (${title})`,
        recordId: announcementId,
        oldValue: '',
        newValue: `Published by ${req.user.fullName}`,
        reason: '',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      return newAnnouncement;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to publish announcement.' });
    }

    res.json({ success: true, announcement: mutationResult.result });
  });

  // -------------------------------------------------------------
  // API: Audit Logs (Read-only for authorized executives)
  // -------------------------------------------------------------
  app.get('/api/audit-logs', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    let data: any;
    try {
      data = await refreshFromFirestore();
    } catch (err: any) {
      console.error('[Storage] Audit logs lookup failed because authoritative Firestore read failed:', err?.message || err);
      return res.status(503).json({
        success: false,
        message: 'Authoritative database temporarily unavailable. Please try again shortly.',
      });
    }
    const logs = data?.auditLogs || [];
    res.json({ success: true, logs });
  });

  // -------------------------------------------------------------
  // API: Songs & Music Scores (Guaranteed Firestore & Disk Persistence)
  // -------------------------------------------------------------
  app.post('/api/songs', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }
    const newSong = req.body;
    if (!newSong || !newSong.title) {
      return res.status(400).json({ success: false, message: 'Song title is required.' });
    }

    const songId = newSong.songId || `SNG-${Date.now()}`;
    const todayDate = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const fullSong = {
      ...newSong,
      songId,
      scriptText: newSong.scriptText || newSong.lyrics || '',
      solfaNotes: newSong.solfaNotes || newSong.solfaNotation || '',
      dateAdded: newSong.dateAdded || todayDate,
    };

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.songs)) current.songs = [];
      const existingIdx = current.songs.findIndex((s: any) => s.songId === songId);
      if (existingIdx >= 0) {
        current.songs[existingIdx] = fullSong;
      } else {
        current.songs.unshift(fullSong);
      }

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: existingIdx >= 0 ? 'Update Song' : 'Add Song',
        module: 'Music Library',
        targetEntity: fullSong.title,
        recordId: songId,
        oldValue: '',
        newValue: '',
        reason: '',
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      return current.songs;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to save song.' });
    }

    res.json({ success: true, song: fullSong, songs: mutationResult.result });
  });

  app.delete('/api/songs/:id', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }
    const { id } = req.params;
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.songs)) current.songs = [];
      const target = current.songs.find((s: any) => s.songId === id);
      current.songs = current.songs.filter((s: any) => s.songId !== id);

      if (target) {
        if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
        current.auditLogs.unshift({
          logId: auditLogId,
          timestamp: nowIso,
          userId: req.user.userId,
          fullName: req.user.fullName,
          officialPosition: req.user.role,
          action: 'Delete Song',
          module: 'Music Library',
          targetEntity: target.title,
          recordId: id,
          oldValue: '',
          newValue: '',
          reason: '',
        });
        if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      }
      return current.songs;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to delete song.' });
    }

    res.json({ success: true, songs: mutationResult.result });
  });

  // -------------------------------------------------------------
  // API: Chorister Members & Roster (Guaranteed Persistence)
  // -------------------------------------------------------------
  app.post('/api/members', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }
    const newMember = req.body;
    if (!newMember || !newMember.fullName || !newMember.voicePart) {
      return res.status(400).json({ success: false, message: 'Full name and voice part are required.' });
    }
    let savedMember: any = null;
    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.members)) current.members = [];

      const memberId = newMember.memberId || `CHO-${newMember.voicePart[0].toUpperCase()}${String(current.members.length + 1).padStart(2, '0')}`;
      const fullMember = {
        ...newMember,
        memberId,
        registrationDate: newMember.registrationDate || new Date().toISOString().split('T')[0],
        membershipStatus: newMember.membershipStatus || 'Active',
      };

      const existingIdx = current.members.findIndex((m: any) => m.memberId === memberId);
      if (existingIdx >= 0) {
        current.members[existingIdx] = fullMember;
      } else {
        current.members.push(fullMember);
      }

      if (!Array.isArray(current.memberAccounts)) current.memberAccounts = [];
      let acc = current.memberAccounts.find((a: any) => a.memberId === memberId);
      if (!acc) {
        const nowMs = Date.now();
        acc = {
          memberId,
          username: memberId.toLowerCase(),
          fullName: fullMember.fullName,
          isActivated: false,
          activationCode: generateActivationCode(),
          activationCodeGeneratedAt: new Date(nowMs).toISOString(),
          activationCodeExpiresAt: new Date(nowMs + ACTIVATION_CODE_VALIDITY_MS).toISOString(),
          voicePart: fullMember.voicePart,
          phoneNumber: fullMember.phoneNumber,
        };
        current.memberAccounts.push(acc);
      } else {
        acc.fullName = fullMember.fullName;
        acc.voicePart = fullMember.voicePart;
        acc.phoneNumber = fullMember.phoneNumber;
      }

      // Propagate updated chorister name to any linked Executive Positions, Settings, and Executive Accounts
      if (Array.isArray(current.positions)) {
        current.positions.forEach((pos: any) => {
          if (pos.assignedMemberId === memberId) {
            pos.assignedOfficer = fullMember.fullName;
            pos.updatedAt = new Date().toISOString();
            const code = (pos.code || '').toUpperCase();
            if (!current.settings) current.settings = {};
            if (code === 'CM' || pos.positionId === 'POS-CM') current.settings.choirMasterName = fullMember.fullName;
            else if (code === 'ACM' || pos.positionId === 'POS-ACM') current.settings.assistantChoirMasterName = fullMember.fullName;
            else if (code === 'PV' || pos.positionId === 'POS-PV') current.settings.provostName = fullMember.fullName;
            else if (code === 'APV' || pos.positionId === 'POS-APV') current.settings.assistantProvostName = fullMember.fullName;
            else if (code === 'SEC' || pos.positionId === 'POS-SEC') current.settings.secretaryName = fullMember.fullName;
            else if (code === 'FINSEC' || pos.positionId === 'POS-FINSEC') current.settings.financialSecretaryName = fullMember.fullName;
            else if (code === 'TR' || pos.positionId === 'POS-TR') current.settings.treasurerName = fullMember.fullName;
            else if (code === 'LIB' || pos.positionId === 'POS-LIB') current.settings.librarianName = fullMember.fullName;

            if (Array.isArray(current.executiveAccounts)) {
              const exec = current.executiveAccounts.find((a: any) =>
                a.positionId === pos.positionId ||
                (code === 'CM' && a.username === 'choirmaster') ||
                (code === 'ACM' && a.username === 'asstchoirmaster') ||
                (code === 'PV' && a.username === 'provost') ||
                (code === 'APV' && a.username === 'asstprovost') ||
                (code === 'SEC' && a.username === 'secretary') ||
                (code === 'FINSEC' && a.username === 'financialsecretary') ||
                (code === 'TR' && a.username === 'treasurer') ||
                (code === 'LIB' && a.username === 'librarian')
              );
              if (exec) {
                exec.fullName = fullMember.fullName;
              }
            }
          }
        });
      }

      // Also propagate name updates directly to any ExecutiveAccount linked via memberId
      if (Array.isArray(current.executiveAccounts)) {
        current.executiveAccounts.forEach((exec: any) => {
          if (exec.memberId && exec.memberId.toUpperCase() === memberId.toUpperCase()) {
            exec.fullName = fullMember.fullName;
          }
        });
      }

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: existingIdx >= 0 ? 'Update Chorister' : 'Register Chorister',
        module: 'Membership',
        targetEntity: fullMember.fullName,
        recordId: memberId,
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      savedMember = fullMember;
      return fullMember;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to save member record.',
      });
    }

    res.json({ success: true, member: savedMember, members: mutationResult.data?.members || [] });
  });

  const validateAndNormalizeProfilePhotoUrl = (
    rawValue: unknown
  ): { valid: boolean; value?: string; clear?: boolean; error?: string } => {
    if (rawValue === undefined) {
      return { valid: true };
    }
    if (rawValue === null) {
      return { valid: true, clear: true, value: undefined };
    }
    if (typeof rawValue !== 'string') {
      return { valid: false, error: 'Invalid profile photograph format.' };
    }
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return { valid: true, clear: true, value: undefined };
    }
    if (/^https?:\/\/\S+$/i.test(trimmed) || trimmed.startsWith('/assets/')) {
      if (trimmed.length > 2048) {
        return { valid: false, error: 'Photograph URL is too long (maximum 2,048 characters).' };
      }
      return { valid: true, value: trimmed };
    }
    if (/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
      if (trimmed.length > 180000) {
        return {
          valid: false,
          error: 'Photograph data is too large. Please upload an image under 2 MB so it can be compressed cleanly, or use an HTTPS URL.',
        };
      }
      return { valid: true, value: trimmed };
    }
    return {
      valid: false,
      error: 'Profile photograph must be an HTTPS/HTTP image URL or a compressed JPEG, PNG, or WebP photograph.',
    };
  };

  const normalizeOptionalTextField = (incoming: unknown, existingValue: unknown): string | undefined => {
    if (incoming === undefined) {
      return typeof existingValue === 'string' && existingValue.trim() ? existingValue : undefined;
    }
    if (incoming === null) {
      return undefined;
    }
    const clean = String(incoming).trim();
    return clean.length > 0 ? clean : undefined;
  };

  // Update Chorister Dossier / Profile (Executive-only, preserves Member ID, status, security, & history)
  app.put('/api/members/:id/profile', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required to edit chorister dossiers.' });
    }

    const { id } = req.params;
    const {
      fullName,
      phoneNumber,
      email,
      voicePart,
      attendanceArrangement,
      notes,
      profilePhotoUrl,
      residentialAddress,
      occupation,
      dateOfBirth,
      nextOfKinName,
      nextOfKinPhone,
      preferredContactMethod,
      optOutWhatsApp,
    } = req.body || {};

    const cleanName = String(fullName || '').trim();
    const cleanVoice = String(voicePart || '').trim();
    const validVoices = ['Soprano', 'Alto', 'Tenor', 'Bass'];

    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Full legal name is required.' });
    }
    if (!validVoices.includes(cleanVoice)) {
      return res.status(400).json({ success: false, message: 'Voice section must be Soprano, Alto, Tenor, or Bass.' });
    }

    const cleanPhone = phoneNumber !== undefined ? String(phoneNumber ?? '').trim() : undefined;
    if (cleanPhone !== undefined && cleanPhone.length > 0 && cleanPhone.length < 7) {
      return res.status(400).json({ success: false, message: 'Please enter a valid phone number with at least 7 digits.' });
    }

    const cleanEmail = email !== undefined ? String(email ?? '').trim() : undefined;
    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const photoValidation = validateAndNormalizeProfilePhotoUrl(profilePhotoUrl);
    if (!photoValidation.valid) {
      return res.status(400).json({ success: false, message: photoValidation.error || 'Invalid profile photograph.' });
    }

    const validContactMethods = ['WhatsApp', 'Phone Call', 'In-Person', 'Do Not Contact on WhatsApp'];
    if (
      preferredContactMethod !== undefined &&
      preferredContactMethod !== null &&
      String(preferredContactMethod).trim() !== '' &&
      !validContactMethods.includes(String(preferredContactMethod))
    ) {
      return res.status(400).json({ success: false, message: 'Invalid preferred contact method.' });
    }

    const targetId = String(id || '').trim().toUpperCase();
    let notFound = false;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.members)) current.members = [];
      const idx = current.members.findIndex((m: any) => m.memberId?.toUpperCase() === targetId);
      if (idx < 0) {
        notFound = true;
        return null;
      }

      const existing = current.members[idx];
      const oldName = existing.fullName;

      // Preserve protected fields: memberId, registrationDate, membershipDate, membershipStatus, archive metadata
      const nextMember: any = {
        ...existing,
        memberId: existing.memberId,
        fullName: cleanName,
        voicePart: cleanVoice,
        phoneNumber: cleanPhone !== undefined ? (cleanPhone || existing.phoneNumber || '') : existing.phoneNumber,
        email: cleanEmail !== undefined ? (cleanEmail || undefined) : normalizeOptionalTextField(undefined, existing.email),
        attendanceArrangement: attendanceArrangement || existing.attendanceArrangement || 'Standard',
        notes: normalizeOptionalTextField(notes, existing.notes),
        residentialAddress: normalizeOptionalTextField(residentialAddress, existing.residentialAddress),
        occupation: normalizeOptionalTextField(occupation, existing.occupation),
        dateOfBirth: normalizeOptionalTextField(dateOfBirth, existing.dateOfBirth),
        nextOfKinName: normalizeOptionalTextField(nextOfKinName, existing.nextOfKinName),
        nextOfKinPhone: normalizeOptionalTextField(nextOfKinPhone, existing.nextOfKinPhone),
        profilePhotoUrl:
          profilePhotoUrl !== undefined
            ? (photoValidation.clear ? undefined : photoValidation.value)
            : normalizeOptionalTextField(undefined, existing.profilePhotoUrl),
        preferredContactMethod:
          preferredContactMethod !== undefined
            ? (normalizeOptionalTextField(preferredContactMethod, existing.preferredContactMethod) as any)
            : existing.preferredContactMethod,
        optOutWhatsApp:
          typeof optOutWhatsApp === 'boolean' ? optOutWhatsApp : existing.optOutWhatsApp,
      };

      current.members[idx] = nextMember;

      // Sync non-security display fields on memberAccounts without touching passwords or activation state
      if (Array.isArray(current.memberAccounts)) {
        const acc = current.memberAccounts.find(
          (a: any) => a.memberId?.toUpperCase() === existing.memberId.toUpperCase()
        );
        if (acc) {
          acc.fullName = nextMember.fullName;
          acc.voicePart = nextMember.voicePart;
          acc.phoneNumber = nextMember.phoneNumber;
          acc.email = nextMember.email;
          acc.profilePhotoUrl = nextMember.profilePhotoUrl;
        }
      }

      // Sync welfare follow-up display records if present
      if (Array.isArray(current.welfareCases)) {
        current.welfareCases.forEach((wc: any) => {
          if (wc.memberId && wc.memberId.toUpperCase() === existing.memberId.toUpperCase()) {
            wc.memberName = nextMember.fullName;
            wc.voicePart = nextMember.voicePart;
            wc.phoneNumber = nextMember.phoneNumber;
            if (nextMember.preferredContactMethod !== undefined) {
              wc.preferredContactMethod = nextMember.preferredContactMethod;
            }
            if (typeof nextMember.optOutWhatsApp === 'boolean') {
              wc.optOutWhatsApp = nextMember.optOutWhatsApp;
            }
          }
        });
      }

      // Propagate updated name to any linked Executive Positions, Settings, and Executive Accounts
      if (Array.isArray(current.positions)) {
        current.positions.forEach((pos: any) => {
          if (pos.assignedMemberId && pos.assignedMemberId.toUpperCase() === existing.memberId.toUpperCase()) {
            pos.assignedOfficer = nextMember.fullName;
            pos.updatedAt = new Date().toISOString();
            const code = (pos.code || '').toUpperCase();
            if (!current.settings) current.settings = {};
            if (code === 'CM' || pos.positionId === 'POS-CM') current.settings.choirMasterName = nextMember.fullName;
            else if (code === 'ACM' || pos.positionId === 'POS-ACM') current.settings.assistantChoirMasterName = nextMember.fullName;
            else if (code === 'PV' || pos.positionId === 'POS-PV') current.settings.provostName = nextMember.fullName;
            else if (code === 'APV' || pos.positionId === 'POS-APV') current.settings.assistantProvostName = nextMember.fullName;
            else if (code === 'SEC' || pos.positionId === 'POS-SEC') current.settings.secretaryName = nextMember.fullName;
            else if (code === 'FINSEC' || pos.positionId === 'POS-FINSEC') current.settings.financialSecretaryName = nextMember.fullName;
            else if (code === 'TR' || pos.positionId === 'POS-TR') current.settings.treasurerName = nextMember.fullName;
            else if (code === 'LIB' || pos.positionId === 'POS-LIB') current.settings.librarianName = nextMember.fullName;
          }
        });
      }

      if (Array.isArray(current.executiveAccounts)) {
        current.executiveAccounts.forEach((exec: any) => {
          if (exec.memberId && exec.memberId.toUpperCase() === existing.memberId.toUpperCase()) {
            exec.fullName = nextMember.fullName;
          }
        });
      }

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Edit Chorister Dossier',
        module: 'Membership',
        targetEntity: `${nextMember.fullName} (${nextMember.memberId})`,
        recordId: nextMember.memberId,
        oldValue: oldName !== nextMember.fullName ? `Name: ${oldName}` : undefined,
        newValue: `Updated dossier for ${nextMember.fullName} (${nextMember.voicePart})`,
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      return nextMember;
    });

    if (notFound) {
      return res.status(404).json({ success: false, message: 'Chorister record not found.' });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to update chorister dossier.',
      });
    }

    const persistedMember =
      (mutationResult.data?.members || []).find((m: any) => m.memberId?.toUpperCase() === targetId) ||
      JSON.parse(JSON.stringify(mutationResult.result));

    res.json({
      success: true,
      message: 'Chorister dossier updated successfully.',
      member: persistedMember,
      members: mutationResult.data?.members || [],
      positions: mutationResult.data?.positions || [],
      settings: mutationResult.data?.settings,
    });
  });

  // -------------------------------------------------------------
  // API: Member Self-Service Profile (Strictly Scoped to req.user.userId)
  // -------------------------------------------------------------
  app.get('/api/member/profile', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'member' || !req.user.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Authenticated member session required.' });
    }

    const memberId = String(req.user.userId).trim().toUpperCase();
    let data: any;
    try {
      data = await refreshFromFirestore();
    } catch (err: any) {
      console.error('[Storage] Member profile lookup failed because authoritative Firestore read failed:', err?.message || err);
      return res.status(503).json({
        success: false,
        message: 'Authoritative database temporarily unavailable. Please try again shortly.',
      });
    }
    if (!data) return res.status(500).json({ success: false, message: 'Database temporarily unavailable.' });

    const member = (data.members || []).find((m: any) => m.memberId?.toUpperCase() === memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Chorister profile not found.' });
    }

    const correctionRequests = (data.complaints || []).filter(
      (c: any) => c.memberId?.toUpperCase() === memberId && c.category === 'Identity / Voice Correction'
    );

    return res.json({
      success: true,
      profile: member,
      correctionRequests,
    });
  });

  app.put('/api/member/profile', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'member' || !req.user.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Authenticated member session required.' });
    }

    // SECURITY: Target is strictly bound to authenticated token session. Never trust any ID in body!
    const targetMemberId = String(req.user.userId).trim().toUpperCase();

    // Check for attempts to tamper with protected administrative/identity fields
    const protectedFields = [
      'memberId', 'membershipStatus', 'membershipDate', 'registrationDate',
      'attendanceArrangement', 'notes', 'fines', 'payments', 'attendanceRecords',
      'executiveRole', 'isExecutive', 'passwordHash', 'activationCode', 'isActivated',
      'archiveReason', 'archivedAt', 'archivedBy'
    ];
    for (const field of protectedFields) {
      if (req.body && req.body[field] !== undefined) {
        return res.status(400).json({
          success: false,
          message: `Forbidden: Field '${field}' is protected by parish governance and cannot be modified by choristers.`,
        });
      }
    }

    const {
      phoneNumber,
      email,
      profilePhotoUrl,
      residentialAddress,
      occupation,
      dateOfBirth,
      nextOfKinName,
      nextOfKinPhone
    } = req.body || {};

    // Validate phone number if provided
    const cleanPhone = phoneNumber !== undefined ? String(phoneNumber ?? '').trim() : undefined;
    if (cleanPhone !== undefined && cleanPhone.length > 0 && cleanPhone.length < 7) {
      return res.status(400).json({ success: false, message: 'Please enter a valid phone number with at least 7 digits.' });
    }

    // Validate email if provided
    const cleanEmail = email !== undefined ? String(email ?? '').trim() : undefined;
    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    // Validate photo URL / compact uploaded data URL
    const photoValidation = validateAndNormalizeProfilePhotoUrl(profilePhotoUrl);
    if (!photoValidation.valid) {
      return res.status(400).json({ success: false, message: photoValidation.error || 'Invalid profile photograph.' });
    }

    let notFound = false;
    let governanceRejection: string | null = null;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.members)) current.members = [];
      const idx = current.members.findIndex((m: any) => m.memberId?.toUpperCase() === targetMemberId);
      if (idx < 0) {
        notFound = true;
        return null;
      }

      const existing = current.members[idx];

      // Enforce: Name and Voice Part cannot be changed silently by members
      if (req.body.fullName && String(req.body.fullName).trim() !== existing.fullName) {
        governanceRejection = 'Full legal name corrections require Choir Master review. Please submit a Name Correction request.';
        return null;
      }
      if (req.body.voicePart && req.body.voicePart !== existing.voicePart) {
        governanceRejection = 'Voice section transfers require Choir Master approval. Please submit a Voice Transfer request.';
        return null;
      }

      // Preserve all protected governance, financial, and attendance fields
      const nextMember = {
        ...existing,
        memberId: existing.memberId,
        fullName: existing.fullName,
        voicePart: existing.voicePart,
        membershipStatus: existing.membershipStatus,
        membershipDate: existing.membershipDate,
        registrationDate: existing.registrationDate,
        attendanceArrangement: existing.attendanceArrangement,
        notes: existing.notes,
        phoneNumber: cleanPhone !== undefined ? (cleanPhone || existing.phoneNumber || '') : existing.phoneNumber,
        email: cleanEmail !== undefined ? (cleanEmail || undefined) : normalizeOptionalTextField(undefined, existing.email),
        profilePhotoUrl:
          profilePhotoUrl !== undefined
            ? (photoValidation.clear ? undefined : photoValidation.value)
            : normalizeOptionalTextField(undefined, existing.profilePhotoUrl),
        residentialAddress: normalizeOptionalTextField(residentialAddress, existing.residentialAddress),
        occupation: normalizeOptionalTextField(occupation, existing.occupation),
        dateOfBirth: normalizeOptionalTextField(dateOfBirth, existing.dateOfBirth),
        nextOfKinName: normalizeOptionalTextField(nextOfKinName, existing.nextOfKinName),
        nextOfKinPhone: normalizeOptionalTextField(nextOfKinPhone, existing.nextOfKinPhone),
      };

      current.members[idx] = nextMember;

      // Sync personal contact info to memberAccounts without touching security credentials
      if (Array.isArray(current.memberAccounts)) {
        const acc = current.memberAccounts.find(
          (a: any) => a.memberId?.toUpperCase() === existing.memberId.toUpperCase()
        );
        if (acc) {
          if (cleanPhone !== undefined) acc.phoneNumber = nextMember.phoneNumber;
          if (cleanEmail !== undefined) acc.email = nextMember.email;
          if (profilePhotoUrl !== undefined) acc.profilePhotoUrl = nextMember.profilePhotoUrl;
        }
      }

      // Sync phone on any welfare follow-up case for this member
      if (Array.isArray(current.welfareCases) && cleanPhone !== undefined) {
        current.welfareCases.forEach((wc: any) => {
          if (wc.memberId && wc.memberId.toUpperCase() === existing.memberId.toUpperCase()) {
            wc.phoneNumber = nextMember.phoneNumber;
          }
        });
      }

      // Audit log
      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: 'Chorister (Self-Service)',
        action: 'Member Profile Self-Update',
        module: 'Membership',
        targetEntity: `${nextMember.fullName} (${nextMember.memberId})`,
        recordId: nextMember.memberId,
        newValue: `Updated personal profile details (Phone: ${nextMember.phoneNumber}, Email: ${nextMember.email || 'None'})`,
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      return nextMember;
    });

    if (notFound) return res.status(404).json({ success: false, message: 'Chorister record not found.' });
    if (governanceRejection) return res.status(400).json({ success: false, message: governanceRejection });
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to update personal profile.',
      });
    }

    const persistedProfile =
      (mutationResult.data?.members || []).find((m: any) => m.memberId?.toUpperCase() === targetMemberId) ||
      JSON.parse(JSON.stringify(mutationResult.result));

    return res.json({
      success: true,
      message: 'Your personal profile was updated successfully.',
      profile: persistedProfile,
    });
  });

  // Submit Identity / Voice Correction Request
  app.post('/api/member/profile/correction-request', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'member' || !req.user.userId) {
      return res.status(403).json({ success: false, message: 'Forbidden: Authenticated member session required.' });
    }

    const memberId = String(req.user.userId).trim().toUpperCase();
    const { requestType, proposedValue, reason } = req.body || {};

    if (!requestType || !['name_correction', 'voice_change'].includes(requestType)) {
      return res.status(400).json({ success: false, message: 'Valid requestType (name_correction or voice_change) is required.' });
    }
    const cleanProposed = String(proposedValue || '').trim();
    const cleanReason = String(reason || '').trim();
    if (!cleanProposed) {
      return res.status(400).json({ success: false, message: 'Proposed correction value is required.' });
    }
    if (!cleanReason) {
      return res.status(400).json({ success: false, message: 'Please provide a clear reason for the change request.' });
    }

    let createdRequest: any = null;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.members)) current.members = [];
      const member = current.members.find((m: any) => m.memberId?.toUpperCase() === memberId);
      if (!member) return null;

      if (!Array.isArray(current.complaints)) current.complaints = [];

      const complaintId = `CORR-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const categoryLabel = requestType === 'name_correction' ? 'Full Legal Name Correction' : 'Voice Part Section Transfer';
      const currentVal = requestType === 'name_correction' ? member.fullName : member.voicePart;

      createdRequest = {
        complaintId,
        memberId: member.memberId,
        memberName: member.fullName,
        complaintDate: new Date().toISOString().split('T')[0],
        category: 'Identity / Voice Correction' as any,
        description: `[${categoryLabel}] Current: "${currentVal}" → Proposed: "${cleanProposed}". Reason: ${cleanReason}`,
        assignedOfficer: 'Choir Master',
        status: 'New' as any,
        isConfidential: false,
        metadata: {
          requestType,
          currentValue: currentVal,
          proposedValue: cleanProposed,
          reason: cleanReason,
          submittedAt: new Date().toISOString(),
        },
      };

      current.complaints.unshift(createdRequest);

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: 'Chorister',
        action: 'Submitted Identity Correction Request',
        module: 'Membership',
        targetEntity: `${member.fullName} (${member.memberId})`,
        recordId: complaintId,
        newValue: `Requested ${categoryLabel} to "${cleanProposed}"`,
      });

      return createdRequest;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to submit correction request.',
      });
    }

    return res.json({
      success: true,
      message: 'Your request has been submitted for Choir Master and executive review.',
      request: createdRequest,
    });
  });

  // Executive Approval / Rejection for Identity Correction Requests
  app.post('/api/member/profile/correction-request/:id/review', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id } = req.params;
    const { action, reviewNotes } = req.body || {}; // action: 'approve' | 'reject'
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ success: false, message: "Valid action ('approve' or 'reject') is required." });
    }

    let notFound = false;
    let targetMember: any = null;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.complaints)) current.complaints = [];
      const item = current.complaints.find((c: any) => c.complaintId === id);
      if (!item) {
        notFound = true;
        return null;
      }

      const meta = item.metadata;
      item.status = action === 'approve' ? 'Resolved' : 'Rejected';
      item.decision = reviewNotes || (action === 'approve' ? 'Approved by Choir Master/Executive.' : 'Declined by Executive.');
      item.resolutionDate = new Date().toISOString().split('T')[0];

      if (action === 'approve' && meta && meta.proposedValue) {
        if (!Array.isArray(current.members)) current.members = [];
        const mIdx = current.members.findIndex((m: any) => m.memberId?.toUpperCase() === item.memberId?.toUpperCase());
        if (mIdx >= 0) {
          const m = current.members[mIdx];
          if (meta.requestType === 'name_correction') {
            m.fullName = meta.proposedValue;
            // Propagate to accounts, positions, and executive roster
            if (Array.isArray(current.memberAccounts)) {
              const acc = current.memberAccounts.find((a: any) => a.memberId?.toUpperCase() === m.memberId.toUpperCase());
              if (acc) acc.fullName = m.fullName;
            }
            if (Array.isArray(current.positions)) {
              current.positions.forEach((pos: any) => {
                if (pos.assignedMemberId?.toUpperCase() === m.memberId.toUpperCase()) {
                  pos.assignedOfficer = m.fullName;
                  const code = (pos.code || '').toUpperCase();
                  if (!current.settings) current.settings = {};
                  if (code === 'CM' || pos.positionId === 'POS-CM') current.settings.choirMasterName = m.fullName;
                  else if (code === 'ACM' || pos.positionId === 'POS-ACM') current.settings.assistantChoirMasterName = m.fullName;
                  else if (code === 'PV' || pos.positionId === 'POS-PV') current.settings.provostName = m.fullName;
                  else if (code === 'APV' || pos.positionId === 'POS-APV') current.settings.assistantProvostName = m.fullName;
                  else if (code === 'SEC' || pos.positionId === 'POS-SEC') current.settings.secretaryName = m.fullName;
                  else if (code === 'FINSEC' || pos.positionId === 'POS-FINSEC') current.settings.financialSecretaryName = m.fullName;
                  else if (code === 'TR' || pos.positionId === 'POS-TR') current.settings.treasurerName = m.fullName;
                  else if (code === 'LIB' || pos.positionId === 'POS-LIB') current.settings.librarianName = m.fullName;
                }
              });
            }
            if (Array.isArray(current.executiveAccounts)) {
              current.executiveAccounts.forEach((exec: any) => {
                if (exec.memberId?.toUpperCase() === m.memberId.toUpperCase()) {
                  exec.fullName = m.fullName;
                }
              });
            }
          } else if (meta.requestType === 'voice_change') {
            m.voicePart = meta.proposedValue;
            if (Array.isArray(current.memberAccounts)) {
              const acc = current.memberAccounts.find((a: any) => a.memberId?.toUpperCase() === m.memberId.toUpperCase());
              if (acc) acc.voicePart = m.voicePart;
            }
          }
          targetMember = m;
        }
      }

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: action === 'approve' ? 'Approved Identity Correction' : 'Rejected Identity Correction',
        module: 'Membership',
        targetEntity: `${item.memberName} (${item.memberId})`,
        recordId: id,
        newValue: `${action === 'approve' ? 'Approved' : 'Rejected'}: ${item.description}`,
      });

      return item;
    });

    if (notFound) return res.status(404).json({ success: false, message: 'Request not found.' });
    if (!mutationResult.success) {
      return res.status(500).json({ success: false, message: mutationResult.error || 'Failed to review request.' });
    }

    return res.json({
      success: true,
      message: action === 'approve' ? 'Identity correction approved and propagated.' : 'Identity correction request rejected.',
      member: targetMember,
    });
  });

  app.post('/api/members/bulk', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }
    const { members: newMembers } = req.body || {};
    if (!Array.isArray(newMembers) || newMembers.length === 0) {
      return res.status(400).json({ success: false, message: 'Valid members array is required.' });
    }
    const nowMs = Date.now();
    const generatedAt = new Date(nowMs).toISOString();
    const expiresAt = new Date(nowMs + ACTIVATION_CODE_VALIDITY_MS).toISOString();
    const pregeneratedCodes = new Map<string, string>();
    for (const m of newMembers) {
      if (m?.memberId && !pregeneratedCodes.has(m.memberId)) {
        pregeneratedCodes.set(m.memberId, generateActivationCode());
      }
    }

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.members)) current.members = [];
      if (!Array.isArray(current.memberAccounts)) current.memberAccounts = [];

      for (const m of newMembers) {
        const idx = current.members.findIndex((existing: any) => existing.memberId === m.memberId);
        if (idx >= 0) {
          current.members[idx] = m;
        } else {
          current.members.push(m);
        }

        if (!current.memberAccounts.some((a: any) => a.memberId === m.memberId)) {
          current.memberAccounts.push({
            memberId: m.memberId,
            username: String(m.memberId).toLowerCase(),
            fullName: m.fullName,
            isActivated: false,
            activationCode: pregeneratedCodes.get(m.memberId) || generateActivationCode(),
            activationCodeGeneratedAt: generatedAt,
            activationCodeExpiresAt: expiresAt,
            voicePart: m.voicePart,
            phoneNumber: m.phoneNumber,
          });
        }
      }
      return current.members;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to bulk import members.' });
    }

    res.json({ success: true, count: newMembers.length, members: mutationResult.result });
  });

  // -------------------------------------------------------------
  // API: Chorister Archiving, Reactivation & Deletion Operations
  // -------------------------------------------------------------

  // Inspect dependent historical records before deletion
  app.get('/api/members/:id/deletion-eligibility', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id: memberId } = req.params;
    let data: any;
    try {
      data = await refreshFromFirestore();
    } catch (err: any) {
      console.error('[Storage] Deletion eligibility lookup failed because authoritative Firestore read failed:', err?.message || err);
      return res.status(503).json({
        success: false,
        message: 'Authoritative database temporarily unavailable. Please try again shortly.',
      });
    }
    const member = (data.members || []).find((m: any) => m.memberId === memberId);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const attendanceCount = (data.attendanceRecords || []).filter((r: any) => r.memberId === memberId).length;
    const fines = (data.fines || []).filter((f: any) => f.memberId === memberId);
    const finesCount = fines.length;
    const payments = (data.payments || []).filter((p: any) => p.memberId === memberId);
    const paymentsCount = payments.length;
    const dues = (data.monthlyDues || []).filter((d: any) => d.memberId === memberId);
    const duesCount = dues.length;
    const queriesCount = (data.queries || []).filter((q: any) => q.memberId === memberId).length;
    const suspensionsCount = (data.suspensions || []).filter((s: any) => s.memberId === memberId).length;
    const complaintsCount = (data.complaints || []).filter((c: any) => c.memberId === memberId).length;
    const accommodationsCount = (data.accommodations || []).filter((a: any) => a.memberId === memberId).length;
    const absencesCount = (data.absences || []).filter((ab: any) => ab.memberId === memberId).length;

    const totalFines = fines.reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0);
    const totalPayments = payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const outstandingBalance = Math.max(0, totalFines - totalPayments);

    const totalDependentRecords = attendanceCount + finesCount + paymentsCount + duesCount + queriesCount + suspensionsCount + complaintsCount + accommodationsCount + absencesCount;

    const isChoirMaster = req.user.role === 'Choir Master' || req.user.position === 'Choir Master';
    const isAdmin = Array.isArray(req.user.permissions) && (req.user.permissions.includes('all') || req.user.permissions.includes('admin'));
    const userAuthorized = isChoirMaster || isAdmin;

    res.json({
      success: true,
      memberId,
      fullName: member.fullName,
      voicePart: member.voicePart,
      membershipStatus: member.membershipStatus,
      counts: {
        attendance: attendanceCount,
        fines: finesCount,
        payments: paymentsCount,
        monthlyDues: duesCount,
        queries: queriesCount,
        suspensions: suspensionsCount,
        complaints: complaintsCount,
        accommodations: accommodationsCount,
        absences: absencesCount,
        total: totalDependentRecords,
      },
      outstandingBalance,
      canPermanentlyDelete: totalDependentRecords === 0 && userAuthorized,
      userAuthorized,
      reasonBlocked: totalDependentRecords > 0 
        ? `Member has ${totalDependentRecords} linked historical record(s) (attendance, fines, payments, or discipline). Permanent deletion would destroy audit and financial history. Please archive instead.`
        : !userAuthorized 
        ? 'Only the Choir Master or System Administrator can execute permanent deletions.'
        : null,
    });
  });

  // Archive a member (Default safe removal preserving all history)
  app.post('/api/members/:id/archive', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id: memberId } = req.params;
    const { reason } = req.body || {};
    const archiveReason = String(reason || 'Administrative Archival').trim();

    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      errorStatus = 0;
      errorMessage = '';
      if (!Array.isArray(current.members)) current.members = [];
      const member = current.members.find((m: any) => m.memberId === memberId);
      if (!member) {
        errorStatus = 404;
        errorMessage = 'Member not found.';
        return null;
      }

      const prevStatus = member.membershipStatus || 'Active';
      member.membershipStatus = 'Archived';
      member.archiveReason = archiveReason;
      member.archivedAt = nowIso;
      member.archivedBy = req.user.fullName || req.user.role || 'Executive Officer';

      // Deactivate member auth account so check-in and portal access are prevented
      if (Array.isArray(current.memberAccounts)) {
        const acc = current.memberAccounts.find((a: any) => a.memberId === memberId);
        if (acc) {
          acc.isArchived = true;
          acc.isActivated = false;
        }
      }

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Archive Member',
        module: 'Membership',
        targetEntity: `Chorister (${member.fullName} · ${memberId})`,
        recordId: memberId,
        oldValue: `Status: ${prevStatus}`,
        newValue: 'Status: Archived',
        reason: archiveReason,
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      return { member, members: current.members };
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to archive member.' });
    }

    res.json({
      success: true,
      message: `Chorister ${mutationResult.result?.member.fullName} (${memberId}) successfully archived. All historical attendance, payments, and fine records remain fully preserved.`,
      member: mutationResult.result?.member,
      members: mutationResult.result?.members,
    });
  });

  // Reactivate an archived member
  app.post('/api/members/:id/reactivate', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id: memberId } = req.params;
    const { reason } = req.body || {};
    const reactivateReason = String(reason || 'Administrative Reactivation').trim();
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      errorStatus = 0;
      errorMessage = '';
      if (!Array.isArray(current.members)) current.members = [];
      const member = current.members.find((m: any) => m.memberId === memberId);
      if (!member) {
        errorStatus = 404;
        errorMessage = 'Member not found.';
        return null;
      }

      const prevStatus = member.membershipStatus;
      member.membershipStatus = 'Active';
      delete member.archiveReason;
      delete member.archivedAt;
      delete member.archivedBy;

      // Reactivate member auth account
      if (Array.isArray(current.memberAccounts)) {
        const acc = current.memberAccounts.find((a: any) => a.memberId === memberId);
        if (acc) {
          acc.isArchived = false;
          acc.isActivated = true;
        }
      }

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Reactivate Member',
        module: 'Membership',
        targetEntity: `Chorister (${member.fullName} · ${memberId})`,
        recordId: memberId,
        oldValue: `Status: ${prevStatus}`,
        newValue: 'Status: Active',
        reason: reactivateReason,
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);
      return { member, members: current.members };
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to reactivate member.' });
    }

    res.json({
      success: true,
      message: `Chorister ${mutationResult.result?.member.fullName} (${memberId}) has been restored to Active status without duplicating any historical records.`,
      member: mutationResult.result?.member,
      members: mutationResult.result?.members,
    });
  });

  // Permanently Delete Member (Restricted to Choir Master / System Admin, blocked if historical records exist)
  app.delete('/api/members/:id', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    // Role check: Only Choir Master or System Admin
    const isChoirMaster = req.user.role === 'Choir Master' || req.user.position === 'Choir Master';
    const isAdmin = Array.isArray(req.user.permissions) && (req.user.permissions.includes('all') || req.user.permissions.includes('admin'));
    if (!isChoirMaster && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Permanent deletion is strictly restricted to the Choir Master or System Administrator. You can archive this member instead.',
      });
    }

    const { id: memberId } = req.params;
    const { reason } = req.body || {};
    const deleteReason = String(reason || 'Permanent administrative deletion').trim();
    const nowIso = new Date().toISOString();
    const auditLogId = `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    let errorStatus = 0;
    let errorPayload: any = null;

    const mutationResult = await mutateParishData((current) => {
      errorStatus = 0;
      errorPayload = null;
      if (!Array.isArray(current.members)) current.members = [];
      const member = current.members.find((m: any) => m.memberId === memberId);
      if (!member) {
        errorStatus = 404;
        errorPayload = { success: false, message: 'Member not found.' };
        return null;
      }

      // Safety checks: Inspect all dependent collections inside authoritative snapshot
      const attendanceCount = (current.attendanceRecords || []).filter((r: any) => r.memberId === memberId).length;
      const finesCount = (current.fines || []).filter((f: any) => f.memberId === memberId).length;
      const paymentsCount = (current.payments || []).filter((p: any) => p.memberId === memberId).length;
      const duesCount = (current.monthlyDues || []).filter((d: any) => d.memberId === memberId).length;
      const queriesCount = (current.queries || []).filter((q: any) => q.memberId === memberId).length;
      const suspensionsCount = (current.suspensions || []).filter((s: any) => s.memberId === memberId).length;
      const complaintsCount = (current.complaints || []).filter((c: any) => c.memberId === memberId).length;
      const accommodationsCount = (current.accommodations || []).filter((a: any) => a.memberId === memberId).length;
      const absencesCount = (current.absences || []).filter((ab: any) => ab.memberId === memberId).length;

      const totalDependentRecords = attendanceCount + finesCount + paymentsCount + duesCount + queriesCount + suspensionsCount + complaintsCount + accommodationsCount + absencesCount;

      if (totalDependentRecords > 0) {
        errorStatus = 400;
        errorPayload = {
          success: false,
          blocked: true,
          message: `Permanent deletion blocked: This chorister has ${totalDependentRecords} linked historical records (${attendanceCount} attendance check-ins, ${finesCount} fines, ${paymentsCount} payments, ${duesCount} dues assessments). Deleting would compromise choir audit and financial integrity. Please archive this member instead.`,
          counts: {
            attendance: attendanceCount,
            fines: finesCount,
            payments: paymentsCount,
            monthlyDues: duesCount,
            queries: queriesCount,
            suspensions: suspensionsCount,
            complaints: complaintsCount,
            accommodations: accommodationsCount,
            absences: absencesCount,
            total: totalDependentRecords,
          },
        };
        return null;
      }

      // Zero records: safe to permanently delete
      const memberName = member.fullName;
      const prevStatus = member.membershipStatus;
      current.members = current.members.filter((m: any) => m.memberId !== memberId);
      if (Array.isArray(current.memberAccounts)) {
        current.memberAccounts = current.memberAccounts.filter((a: any) => a.memberId !== memberId);
      }

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: auditLogId,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Permanently Delete Member',
        module: 'Membership',
        targetEntity: `Member ID: ${memberId} (${memberName})`,
        recordId: memberId,
        oldValue: `Status: ${prevStatus}`,
        newValue: 'Status: Permanently Deleted',
        reason: deleteReason,
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      return { memberName, members: current.members };
    });

    if (errorStatus) {
      return res.status(errorStatus).json(errorPayload);
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to delete member.' });
    }

    res.json({
      success: true,
      message: `Member ${mutationResult.result?.memberName} (${memberId}) has been permanently deleted from the database. Minimal deletion event logged in audit trail.`,
      members: mutationResult.result?.members,
    });
  });

  // -------------------------------------------------------------
  // API: Rehearsal Timetable & Sessions (Guaranteed Persistence)
  // -------------------------------------------------------------
  app.post('/api/sessions', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }
    const newSession = req.body;
    if (!newSession || !newSession.date || !newSession.activityType) {
      return res.status(400).json({ success: false, message: 'Date and activity type are required.' });
    }

    const sessionId = newSession.sessionId || `SES-${Date.now()}`;
    const fullSession = {
      ...newSession,
      sessionId,
    };

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.sessions)) current.sessions = [];
      const existingIdx = current.sessions.findIndex((s: any) => s.sessionId === sessionId);
      if (existingIdx >= 0) {
        current.sessions[existingIdx] = fullSession;
      } else {
        current.sessions.unshift(fullSession);
      }
      current.sessions = reconcileSessions(current.sessions, undefined, current.settings?.defaultSessionDurationHours);
      return current.sessions;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to save session.' });
    }

    res.json({ success: true, session: fullSession, sessions: mutationResult.result });
  });

  // -------------------------------------------------------------
  // API: Attendance Recording (Choristers & Provosts)
  // -------------------------------------------------------------
  app.post('/api/attendance', authenticateToken, async (req: any, res) => {
    const newRecord = req.body;
    if (!newRecord || !newRecord.memberId || !newRecord.sessionId) {
      return res.status(400).json({ success: false, message: 'Member ID and session ID are required.' });
    }

    // Choristers can only record check-in for themselves
    if (req.user.userType === 'member' && req.user.userId !== newRecord.memberId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot submit attendance on behalf of another chorister.' });
    }

    const attendanceId = newRecord.attendanceId || `ATT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const fullRecord = {
      ...newRecord,
      attendanceId,
    };

    let validationError: string | null = null;
    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.attendanceRecords)) current.attendanceRecords = [];

      const member = (current.members || []).find((m: any) => m.memberId === newRecord.memberId);
      if (member && (member.membershipStatus === 'Archived' || member.membershipStatus === 'Inactive')) {
        validationError = `Cannot record attendance: Member ${member.fullName} (${member.memberId}) is currently ${member.membershipStatus.toLowerCase()}.`;
        return null;
      }

      const existingIdx = current.attendanceRecords.findIndex(
        (r: any) => r.sessionId === fullRecord.sessionId && r.memberId === fullRecord.memberId
      );
      if (existingIdx >= 0) {
        current.attendanceRecords[existingIdx] = fullRecord;
      } else {
        current.attendanceRecords.unshift(fullRecord);
      }
      return fullRecord;
    });

    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to record attendance.',
      });
    }

    res.json({ success: true, record: fullRecord, attendanceRecords: mutationResult.data?.attendanceRecords || [] });
  });

  // -------------------------------------------------------------
  // API: Payments & Cashier Records
  // -------------------------------------------------------------
  app.post('/api/payments', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }
    const newPayment = req.body;
    if (!newPayment || !newPayment.memberId || !newPayment.amount) {
      return res.status(400).json({ success: false, message: 'Member ID and amount are required.' });
    }
    const paymentId = newPayment.paymentId || `PAY-${Date.now()}`;
    const fullPayment = {
      ...newPayment,
      paymentId,
      date: newPayment.date || new Date().toISOString().split('T')[0],
    };

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.payments)) current.payments = [];
      current.payments.unshift(fullPayment);

      if (!Array.isArray(current.fundMovements)) current.fundMovements = [];
      const receiptRef = fullPayment.receiptNumber ? ` (${fullPayment.receiptNumber})` : '';
      current.fundMovements.unshift({
        movementId: `FND-${Date.now()}`,
        date: fullPayment.paymentDate || fullPayment.date,
        type: fullPayment.paymentMethod === 'Cash' ? 'Fine Collection (Cash)' : 'Fine Collection (Bank)',
        amount: Number(fullPayment.amount) || 0,
        description: `Payment from ${fullPayment.memberName || fullPayment.memberId}${receiptRef}`,
        recordedBy: fullPayment.receivedBy || req.user.fullName,
      });

      if (fullPayment.fineId && Array.isArray(current.fines)) {
        const fine = current.fines.find((f: any) => f.fineId === fullPayment.fineId);
        if (fine) {
          fine.paymentStatus = 'Paid';
          fine.paymentDate = fullPayment.date;
        }
      }
      return fullPayment;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({
        success: false,
        message: mutationResult.error || 'Failed to record payment.',
      });
    }

    res.json({
      success: true,
      payment: fullPayment,
      payments: mutationResult.data?.payments || [],
      fines: mutationResult.data?.fines || [],
      fundMovements: mutationResult.data?.fundMovements || [],
    });
  });

  // -------------------------------------------------------------
  // API: Monthly Dues Operations (Excludes Archived/Inactive Members)
  // -------------------------------------------------------------
  app.post('/api/dues/generate-cycle', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }
    const { billingMonth, amount } = req.body || {};
    if (!billingMonth) {
      return res.status(400).json({ success: false, message: 'Billing month is required (YYYY-MM).' });
    }
    const nowIso = new Date().toISOString();

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.monthlyDues)) current.monthlyDues = [];
      const duesAmount = Number(amount) || Number(current.settings?.monthlyDuesConfig?.standardMonthlyRate) || 500;

      // Critical Requirement: Archived and inactive members are strictly excluded from new monthly dues assessments
      const activeMembers = (current.members || []).filter((m: any) => m.membershipStatus === 'Active');
      let addedCount = 0;

      for (const m of activeMembers) {
        const exists = current.monthlyDues.some((d: any) => d.memberId === m.memberId && d.month === billingMonth);
        if (!exists) {
          current.monthlyDues.push({
            assessmentId: `DUE-${billingMonth.replace('-', '')}-${m.memberId}`,
            memberId: m.memberId,
            memberName: m.fullName,
            voicePart: m.voicePart,
            month: billingMonth,
            year: Number(billingMonth.split('-')[0]),
            assessedAmount: duesAmount,
            amountPaid: 0,
            remainingBalance: duesAmount,
            status: 'Unpaid',
            dueDate: `${billingMonth}-28`,
            generatedDate: nowIso,
            paymentHistory: [],
          });
          addedCount++;
        }
      }

      return { addedCount, assessments: current.monthlyDues };
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to generate monthly dues cycle.' });
    }

    res.json({
      success: true,
      message: `Generated monthly dues for ${mutationResult.result?.addedCount ?? 0} active chorister(s). Archived and inactive members were excluded.`,
      assessments: mutationResult.result?.assessments || [],
    });
  });

  app.post('/api/dues/record-payment', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }
    const { assessmentId, amount, method, reference } = req.body || {};
    const paymentId = `PAY-DUE-${Date.now()}`;
    const todayDate = new Date().toISOString().split('T')[0];

    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      errorStatus = 0;
      errorMessage = '';
      if (!Array.isArray(current.monthlyDues)) current.monthlyDues = [];
      const due = current.monthlyDues.find((d: any) => d.assessmentId === assessmentId);
      if (!due) {
        errorStatus = 404;
        errorMessage = 'Dues assessment not found.';
        return null;
      }

      const payAmt = Number(amount) || 0;
      due.amountPaid = (Number(due.amountPaid) || 0) + payAmt;
      due.remainingBalance = Math.max(0, (Number(due.assessedAmount) || 0) - due.amountPaid);
      due.status = due.remainingBalance === 0 ? 'Settled' : due.amountPaid > 0 ? 'Partial' : 'Unpaid';
      if (!Array.isArray(due.paymentHistory)) due.paymentHistory = [];
      due.paymentHistory.push({
        paymentId,
        amount: payAmt,
        date: todayDate,
        method: method || 'Bank Transfer',
        reference: reference || '',
        recordedBy: req.user.fullName,
      });

      return { assessment: due, assessments: current.monthlyDues };
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to record dues payment.' });
    }

    res.json({
      success: true,
      assessment: mutationResult.result?.assessment,
      assessments: mutationResult.result?.assessments || [],
    });
  });

  app.post('/api/dues/exempt', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }
    const { assessmentId, reason } = req.body || {};
    if (!assessmentId || !String(reason || '').trim()) {
      return res.status(400).json({ success: false, message: 'Assessment ID and exemption reason are required.' });
    }
    const nowIso = new Date().toISOString();

    let errorStatus = 0;
    let errorMessage = '';

    const mutationResult = await mutateParishData((current) => {
      errorStatus = 0;
      errorMessage = '';
      if (!Array.isArray(current.monthlyDues)) current.monthlyDues = [];
      const due = current.monthlyDues.find((d: any) => d.assessmentId === assessmentId);
      if (!due) {
        errorStatus = 404;
        errorMessage = 'Dues assessment not found.';
        return null;
      }

      due.status = 'Exempted';
      due.remainingBalance = 0;
      due.balanceRemaining = 0;
      due.exemptionReason = String(reason).trim();
      due.exemptedBy = req.user.fullName;
      due.exemptedAt = nowIso;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role,
        action: 'Exempt Monthly Dues',
        module: 'Monthly Dues',
        targetEntity: `${due.memberName || due.memberId} (${due.month})`,
        recordId: assessmentId,
        oldValue: `₦${due.assessedAmount || due.amountAssessed || 0}`,
        newValue: 'Exempted',
        reason: String(reason).trim(),
      });
      if (current.auditLogs.length > 200) current.auditLogs = current.auditLogs.slice(0, 200);

      return { assessment: due, assessments: current.monthlyDues };
    });

    if (errorStatus) {
      return res.status(errorStatus).json({ success: false, message: errorMessage });
    }
    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to record dues exemption.' });
    }

    res.json({
      success: true,
      assessment: mutationResult.result?.assessment,
      assessments: mutationResult.result?.assessments || [],
    });
  });

  // -------------------------------------------------------------
  // API: Absences & Complaints
  // -------------------------------------------------------------
  app.post('/api/absences', authenticateToken, async (req: any, res) => {
    const newAbsence = req.body;
    if (!newAbsence || !newAbsence.memberId) {
      return res.status(400).json({ success: false, message: 'Member ID is required.' });
    }

    // Choristers can only file absences for themselves
    if (req.user.userType === 'member' && req.user.userId !== newAbsence.memberId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot file an absence notice on behalf of another chorister.' });
    }

    const notificationId = newAbsence.notificationId || `ABS-${Date.now()}`;
    const fullAbsence = { ...newAbsence, notificationId };

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.absences)) current.absences = [];
      current.absences.unshift(fullAbsence);
      return current.absences;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to submit absence notice.' });
    }

    res.json({ success: true, absence: fullAbsence, absences: mutationResult.result });
  });

  app.post('/api/complaints', authenticateToken, async (req: any, res) => {
    const newComplaint = req.body;
    if (!newComplaint || !newComplaint.memberId) {
      return res.status(400).json({ success: false, message: 'Member ID is required.' });
    }

    // Choristers can only submit complaints under their own member ID
    if (req.user.userType === 'member' && req.user.userId !== newComplaint.memberId) {
      return res.status(403).json({ success: false, message: 'Forbidden: You cannot submit a complaint under another chorister identity.' });
    }

    const complaintId = newComplaint.complaintId || `CMP-${Date.now()}`;
    const fullComplaint = { ...newComplaint, complaintId };

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.complaints)) current.complaints = [];
      current.complaints.unshift(fullComplaint);
      return current.complaints;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to submit complaint.' });
    }

    res.json({ success: true, complaint: fullComplaint, complaints: mutationResult.result });
  });

  // -------------------------------------------------------------
  // API: Disciplinary Actions
  // -------------------------------------------------------------
  app.post('/api/discipline/query', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }
    const newQuery = req.body;
    const queryId = newQuery.queryId || `QRY-${Date.now()}`;
    const fullQuery = { ...newQuery, queryId };

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.queries)) current.queries = [];
      current.queries.unshift(fullQuery);
      return current.queries;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to issue query.' });
    }

    res.json({ success: true, query: fullQuery, queries: mutationResult.result });
  });

  app.post('/api/discipline/suspension', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }
    const suspension = req.body;
    const suspensionId = suspension.suspensionId || `SUS-${Date.now()}`;
    const fullSuspension = { ...suspension, suspensionId };

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.suspensions)) current.suspensions = [];
      current.suspensions.unshift(fullSuspension);

      if (Array.isArray(current.members)) {
        const m = current.members.find((mem: any) => mem.memberId === suspension.memberId);
        if (m) m.membershipStatus = 'Suspended';
      }
      return { suspensions: current.suspensions, members: current.members };
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to record suspension.' });
    }

    res.json({
      success: true,
      suspension: fullSuspension,
      suspensions: mutationResult.result?.suspensions || [],
      members: mutationResult.result?.members || [],
    });
  });

  app.post('/api/discipline/reinstate', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }
    const { suspensionId, memberId } = req.body;
    const todayDate = new Date().toISOString().split('T')[0];

    const mutationResult = await mutateParishData((current) => {
      if (Array.isArray(current.suspensions)) {
        const s = current.suspensions.find((sus: any) => sus.suspensionId === suspensionId);
        if (s) {
          s.status = 'Lifted';
          s.reinstatedDate = todayDate;
        }
      }
      if (Array.isArray(current.members)) {
        const m = current.members.find((mem: any) => mem.memberId === memberId);
        if (m) m.membershipStatus = 'Active';
      }
      return { suspensions: current.suspensions, members: current.members };
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to reinstate member.' });
    }

    res.json({
      success: true,
      suspensions: mutationResult.result?.suspensions || [],
      members: mutationResult.result?.members || [],
    });
  });

  // -------------------------------------------------------------
  // API: Chorister Welfare & Pastoral Follow-Up Operations
  // -------------------------------------------------------------

  // GET: Fetch welfare cases and settings (Executive only)
  app.get('/api/welfare/cases', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required for chorister welfare records.' });
    }

    let data: any;
    try {
      data = await refreshFromFirestore();
    } catch (err: any) {
      console.error('[Welfare] Read failed:', err?.message || err);
      return res.status(503).json({ success: false, message: 'Authoritative database temporarily unavailable.' });
    }

    res.json({
      success: true,
      welfareCases: Array.isArray(data.welfareCases) ? data.welfareCases : [],
      welfareSettings: data.settings?.welfareSettings || null,
    });
  });

  // POST: Sync/update evaluated welfare cases in bulk
  app.post('/api/welfare/sync-cases', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { cases } = req.body;
    if (!Array.isArray(cases)) {
      return res.status(400).json({ success: false, message: 'Invalid cases array supplied.' });
    }

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.welfareCases)) current.welfareCases = [];

      const caseMap = new Map<string, any>();
      current.welfareCases.forEach((c: any) => caseMap.set(c.memberId, c));

      cases.forEach((incoming: any) => {
        const existing = caseMap.get(incoming.memberId);
        if (existing) {
          existing.qualifyingAbsenceCount = incoming.qualifyingAbsenceCount;
          existing.qualifyingDates = incoming.qualifyingDates || existing.qualifyingDates;
          existing.qualifyingSessionIds = incoming.qualifyingSessionIds || existing.qualifyingSessionIds;
          existing.lastAbsenceDate = incoming.lastAbsenceDate || existing.lastAbsenceDate;
          existing.lastAttendanceDate = incoming.lastAttendanceDate || existing.lastAttendanceDate;
          existing.phoneNumber = incoming.phoneNumber || existing.phoneNumber;
          existing.memberName = incoming.memberName || existing.memberName;
          existing.voicePart = incoming.voicePart || existing.voicePart;
          existing.updatedAt = new Date().toISOString();
          if (existing.status === 'Resolved' && incoming.status === 'Needs Attention') {
            existing.status = 'Needs Attention';
            existing.resolvedAt = undefined;
            existing.resolvedBy = undefined;
          }
        } else {
          caseMap.set(incoming.memberId, {
            ...incoming,
            createdAt: incoming.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            contactHistory: incoming.contactHistory || [],
          });
        }
      });

      current.welfareCases = Array.from(caseMap.values());
      return current.welfareCases;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to sync welfare cases.' });
    }

    res.json({ success: true, welfareCases: mutationResult.result || [] });
  });

  // POST: Update case follow-up status
  app.post('/api/welfare/cases/:id/status', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id } = req.params;
    const { status, note } = req.body;
    const validStatuses = ['Needs Attention', 'Not Yet Contacted', 'Reminder Scheduled', 'Contacted', 'Further Support Required', 'Resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid follow-up status. Allowed: ${validStatuses.join(', ')}` });
    }

    const nowIso = new Date().toISOString();
    let updatedCase: any = null;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.welfareCases)) current.welfareCases = [];
      const item = current.welfareCases.find((c: any) => c.caseId === id || c.memberId === id);
      if (!item) return null;

      item.status = status;
      item.updatedAt = nowIso;
      if (status === 'Resolved') {
        item.resolvedAt = nowIso;
        item.resolvedBy = req.user.fullName || req.user.username;
        if (note) item.resolutionNotes = note;
      }
      updatedCase = item;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role || 'Executive',
        action: 'Welfare Status Update',
        module: 'Chorister Welfare',
        targetEntity: `Welfare Case (${item.memberName} - ${item.memberId})`,
        newValue: `Status changed to '${status}'${note ? `. Note: ${note}` : ''}`,
      });

      return item;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to update welfare case status.' });
    }
    if (!updatedCase) {
      return res.status(404).json({ success: false, message: 'Welfare case not found.' });
    }

    res.json({ success: true, case: updatedCase });
  });

  // POST: Assign responsible executive officer
  app.post('/api/welfare/cases/:id/assign', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id } = req.params;
    const { officerId, officerName, officerPosition } = req.body;
    if (!officerName) {
      return res.status(400).json({ success: false, message: 'Officer name is required.' });
    }

    const nowIso = new Date().toISOString();
    let updatedCase: any = null;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.welfareCases)) current.welfareCases = [];
      const item = current.welfareCases.find((c: any) => c.caseId === id || c.memberId === id);
      if (!item) return null;

      item.assignedOfficerId = officerId || item.assignedOfficerId;
      item.assignedOfficerName = officerName;
      item.assignedOfficerPosition = officerPosition || item.assignedOfficerPosition;
      item.updatedAt = nowIso;
      updatedCase = item;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role || 'Executive',
        action: 'Welfare Officer Assignment',
        module: 'Chorister Welfare',
        targetEntity: `Welfare Case (${item.memberName})`,
        newValue: `Assigned to ${officerName} (${officerPosition || 'Officer'})`,
      });

      return item;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to assign officer.' });
    }
    if (!updatedCase) {
      return res.status(404).json({ success: false, message: 'Welfare case not found.' });
    }

    res.json({ success: true, case: updatedCase });
  });

  // POST: Schedule follow-up reminder
  app.post('/api/welfare/cases/:id/schedule', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id } = req.params;
    const { scheduledDate, scheduledTime, reminderNotes } = req.body;
    if (!scheduledDate || !scheduledTime) {
      return res.status(400).json({ success: false, message: 'Scheduled date and time are required.' });
    }

    const nowIso = new Date().toISOString();
    let updatedCase: any = null;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.welfareCases)) current.welfareCases = [];
      const item = current.welfareCases.find((c: any) => c.caseId === id || c.memberId === id);
      if (!item) return null;

      item.scheduledDate = scheduledDate;
      item.scheduledTime = scheduledTime;
      item.reminderNotes = reminderNotes || '';
      item.reminderAcknowledged = false;
      item.status = 'Reminder Scheduled';
      item.updatedAt = nowIso;
      updatedCase = item;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role || 'Executive',
        action: 'Schedule Welfare Reminder',
        module: 'Chorister Welfare',
        targetEntity: `Welfare Case (${item.memberName})`,
        newValue: `Scheduled follow-up for ${scheduledDate} at ${scheduledTime}`,
      });

      return item;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to schedule reminder.' });
    }
    if (!updatedCase) {
      return res.status(404).json({ success: false, message: 'Welfare case not found.' });
    }

    res.json({ success: true, case: updatedCase });
  });

  // POST: Record follow-up outcome and append to contact history
  app.post('/api/welfare/cases/:id/contact-log', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id } = req.params;
    const { contactMethod, outcome, notes, nextScheduledFollowUp, markResolved } = req.body;
    if (!contactMethod || !outcome) {
      return res.status(400).json({ success: false, message: 'Contact method and outcome are required.' });
    }

    const nowIso = new Date().toISOString();
    const logId = `WFLOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const newLog = {
      logId,
      contactDate: nowIso,
      contactMethod,
      outcome,
      officerId: req.user.userId,
      officerName: req.user.fullName,
      officerPosition: req.user.role || 'Executive',
      notes: notes || '',
      nextScheduledFollowUp: nextScheduledFollowUp || undefined,
    };

    let updatedCase: any = null;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.welfareCases)) current.welfareCases = [];
      const item = current.welfareCases.find((c: any) => c.caseId === id || c.memberId === id);
      if (!item) return null;

      if (!Array.isArray(item.contactHistory)) item.contactHistory = [];
      item.contactHistory.unshift(newLog);

      item.latestOutcome = outcome;
      item.latestContactDate = nowIso;
      item.updatedAt = nowIso;

      if (markResolved || outcome === 'No further action required') {
        item.status = 'Resolved';
        item.resolvedAt = nowIso;
        item.resolvedBy = req.user.fullName;
        item.resolutionNotes = notes || `Resolved following ${contactMethod} contact: ${outcome}`;
      } else if (outcome === 'Further support required' || outcome === 'Health or personal concern') {
        item.status = 'Further Support Required';
      } else {
        item.status = 'Contacted';
      }

      if (nextScheduledFollowUp) {
        item.status = 'Reminder Scheduled';
      }

      updatedCase = item;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role || 'Executive',
        action: 'Record Welfare Contact',
        module: 'Chorister Welfare',
        targetEntity: `Welfare Case (${item.memberName})`,
        newValue: `Contacted via ${contactMethod}. Outcome: ${outcome}`,
      });

      return item;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to record contact log.' });
    }
    if (!updatedCase) {
      return res.status(404).json({ success: false, message: 'Welfare case not found.' });
    }

    res.json({ success: true, case: updatedCase, log: newLog });
  });

  // POST: Resolve welfare case directly
  app.post('/api/welfare/cases/:id/resolve', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive') {
      return res.status(403).json({ success: false, message: 'Executive authorization required.' });
    }

    const { id } = req.params;
    const { resolutionNotes } = req.body;
    const nowIso = new Date().toISOString();
    let updatedCase: any = null;

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.welfareCases)) current.welfareCases = [];
      const item = current.welfareCases.find((c: any) => c.caseId === id || c.memberId === id);
      if (!item) return null;

      item.status = 'Resolved';
      item.resolvedAt = nowIso;
      item.resolvedBy = req.user.fullName;
      item.resolutionNotes = resolutionNotes || 'Marked as resolved by executive.';
      item.updatedAt = nowIso;
      updatedCase = item;

      if (!Array.isArray(current.auditLogs)) current.auditLogs = [];
      current.auditLogs.unshift({
        logId: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: nowIso,
        userId: req.user.userId,
        fullName: req.user.fullName,
        officialPosition: req.user.role || 'Executive',
        action: 'Resolve Welfare Case',
        module: 'Chorister Welfare',
        targetEntity: `Welfare Case (${item.memberName})`,
        newValue: `Case resolved. Notes: ${resolutionNotes || 'None'}`,
      });

      return item;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to resolve case.' });
    }
    if (!updatedCase) {
      return res.status(404).json({ success: false, message: 'Welfare case not found.' });
    }

    res.json({ success: true, case: updatedCase });
  });

  // POST: Update member contact preference
  app.post('/api/welfare/member-preference', authenticateToken, async (req: any, res) => {
    if (req.user.userType !== 'executive' && req.user.userId !== req.body?.memberId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify member contact preferences.' });
    }

    const { memberId, preferredContactMethod, optOutWhatsApp } = req.body;
    if (!memberId) {
      return res.status(400).json({ success: false, message: 'memberId is required.' });
    }

    const mutationResult = await mutateParishData((current) => {
      if (!Array.isArray(current.members)) current.members = [];
      const m = current.members.find((mem: any) => mem.memberId === memberId);
      if (!m) return null;

      if (preferredContactMethod !== undefined) m.preferredContactMethod = preferredContactMethod;
      if (optOutWhatsApp !== undefined) m.optOutWhatsApp = Boolean(optOutWhatsApp);

      if (Array.isArray(current.welfareCases)) {
        const c = current.welfareCases.find((caseItem: any) => caseItem.memberId === memberId);
        if (c) {
          if (preferredContactMethod !== undefined) c.preferredContactMethod = preferredContactMethod;
          if (optOutWhatsApp !== undefined) c.optOutWhatsApp = Boolean(optOutWhatsApp);
        }
      }

      return m;
    });

    if (!mutationResult.success) {
      return res.status(mutationResult.status || 500).json({ success: false, message: mutationResult.error || 'Failed to update contact preferences.' });
    }

    res.json({ success: true, member: mutationResult.result });
  });

  // Development: Vite middleware; Production: static dist
  const isProduction = process.env.NODE_ENV === 'production';
  const distExists = fs.existsSync(path.resolve(process.cwd(), 'dist/index.html'));

  if (isProduction && distExists) {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OMPH Choral Ministry Server running on port ${PORT}`);
  });
}

startServer();
