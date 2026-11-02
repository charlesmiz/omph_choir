import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Trash2, 
  RefreshCw, 
  Download, 
  KeyRound, 
  ShieldCheck, 
  FileSpreadsheet, 
  Check, 
  AlertTriangle,
  Upload,
  Code2,
  Copy
} from 'lucide-react';
import { SystemSettings, Chorister, VoicePart } from '../types';
import { googleAppsScriptFiles } from '../data/googleAppsScriptCode';

interface ChurchSettingsProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  members: Chorister[];
  onClearDemoData: () => void;
  onRestoreDemoData: () => void;
  onBulkAddMembers: (newMembers: Chorister[]) => void;
  onExportBackup: () => void;
  isDemoMode?: boolean;
  onUnloadDemoData?: () => void;
  onClearMainLogs?: () => void;
  onClearSessions?: () => void;
}

export const ChurchSettings: React.FC<ChurchSettingsProps> = ({
  settings,
  onUpdateSettings,
  members,
  onClearDemoData,
  onRestoreDemoData,
  onBulkAddMembers,
  onExportBackup,
  isDemoMode = false,
  onUnloadDemoData,
  onClearMainLogs,
  onClearSessions,
}) => {
  const [formSettings, setFormSettings] = useState<SystemSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false);
  const [showClearSessionsConfirm, setShowClearSessionsConfirm] = useState(false);
  const [logsClearedMessage, setLogsClearedMessage] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const added: Chorister[] = [];

    const existingCount = members.length;
    lines.forEach((line, idx) => {
      // Formats supported: "Name, Voice, Phone" or "Name, Voice"
      const parts = line.split(',').map(p => p.trim());
      const name = parts[0] || `Chorister ${existingCount + idx + 1}`;
      let voice: VoicePart = 'Soprano';
      const rawVoice = (parts[1] || '').toLowerCase();
      if (rawVoice.includes('alto')) voice = 'Alto';
      else if (rawVoice.includes('tenor')) voice = 'Tenor';
      else if (rawVoice.includes('bass')) voice = 'Bass';

      const phone = parts[2] || '+234 800 000 0000';
      const prefix = voice[0];
      const memberId = `CHO-${prefix}${String(existingCount + idx + 1).padStart(2, '0')}`;

      added.push({
        memberId,
        fullName: name,
        voicePart: voice,
        phoneNumber: phone,
        membershipDate: new Date().toISOString().split('T')[0],
        membershipStatus: 'Active',
        attendanceArrangement: 'Standard',
        registrationDate: new Date().toISOString().split('T')[0],
      });
    });

    if (added.length > 0) {
      onBulkAddMembers(added);
      setBulkStatus(`Successfully added ${added.length} real chorister(s) to the roster!`);
      setBulkText('');
      setTimeout(() => setBulkStatus(''), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900">
          Church Administration & Real Data Setup
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure real church and officer names, manage database records (wipe demo data or bulk import real choristers), and adjust disciplinary fines.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-slate-900" />
          Settings saved successfully!
        </div>
      )}

      {/* SECTION 1: PARISH & CHOIR DETAILS */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
          1. Church & Choir Profile
        </h3>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Parish / Church Name</label>
              <input
                type="text"
                required
                value={formSettings.parishName}
                onChange={(e) => setFormSettings({ ...formSettings, parishName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="e.g. St. Cecilia Catholic Church"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Choir Name</label>
              <input
                type="text"
                required
                value={formSettings.choirName}
                onChange={(e) => setFormSettings({ ...formSettings, choirName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                placeholder="e.g. St. Cecilia Main Choir"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Choir Master Name</label>
              <input
                type="text"
                required
                value={formSettings.choirMasterName}
                onChange={(e) => setFormSettings({ ...formSettings, choirMasterName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Provost Name (Attendance & Discipline)</label>
              <input
                type="text"
                required
                value={formSettings.provostName}
                onChange={(e) => setFormSettings({ ...formSettings, provostName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assistant Provost Name</label>
              <input
                type="text"
                value={formSettings.assistantProvostName}
                onChange={(e) => setFormSettings({ ...formSettings, assistantProvostName: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Executive Passcode PIN (for unlocking)</label>
              <input
                type="text"
                required
                maxLength={6}
                value={formSettings.executivePin}
                onChange={(e) => setFormSettings({ ...formSettings, executivePin: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <span className="text-[10px] text-slate-400">Default PIN is 1234</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Late Fine (₦)</label>
              <input
                type="number"
                min={0}
                step={50}
                value={formSettings.defaultLateFine}
                onChange={(e) => setFormSettings({ ...formSettings, defaultLateFine: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Absence Fine (₦)</label>
              <input
                type="number"
                min={0}
                step={50}
                value={formSettings.defaultAbsenceFine}
                onChange={(e) => setFormSettings({ ...formSettings, defaultAbsenceFine: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Grace Period (Minutes)</label>
              <input
                type="number"
                min={0}
                max={30}
                value={formSettings.defaultGracePeriodMinutes}
                onChange={(e) => setFormSettings({ ...formSettings, defaultGracePeriodMinutes: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2 rounded-lg transition"
            >
              Save Profile & Fine Settings
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: REAL DATA & LAUNCH TRANSITION */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
          2. Database Launch Controls (Real Choir vs Demo Data)
        </h3>

        {isDemoMode ? (
          <div className="p-3.5 bg-amber-100 border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <div>
                <span>Demo Test Mode is currently ACTIVE.</span>
                <p className="text-[11px] font-normal text-slate-700">
                  You are viewing simulated sample choristers and test fines. Real church data is stored safely.
                </p>
              </div>
            </div>
            {onUnloadDemoData && (
              <button
                type="button"
                onClick={onUnloadDemoData}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs whitespace-nowrap"
              >
                Unload Demo Data & Restore Real Church Records
              </button>
            )}
          </div>
        ) : (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-900 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span>Real Church Database Active</span>
                <p className="text-[11px] font-normal text-slate-600">
                  All names, officers, roster, and attendance records are live and synchronized across devices.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div>
            <div className="font-bold text-slate-900">Current Members in Roster: {members.length}</div>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Manage database records. You can load demo data anytime to train officers, or clear records to start fresh.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Wipe Records (Start Fresh)
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-red-100 p-1.5 rounded-lg border border-red-200">
                <span className="text-[11px] text-red-800 font-bold px-1">Are you sure?</span>
                <button
                  onClick={() => {
                    onClearDemoData();
                    setShowClearConfirm(false);
                  }}
                  className="bg-red-600 text-white text-[11px] font-bold px-2 py-1 rounded"
                >
                  Yes, Wipe
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-slate-600 text-[11px] px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            )}

            {isDemoMode ? (
              <button
                onClick={onUnloadDemoData}
                className="bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-700" /> Unload Demo Data
              </button>
            ) : (
              <button
                onClick={onRestoreDemoData}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Load Demo Data (Testing)
              </button>
            )}
          </div>
        </div>

        {/* BULK ADD REAL CHORISTERS */}
        <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-200/80 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-slate-700" />
              Quick Bulk Import Real Choristers
            </h4>
            <span className="text-[11px] text-slate-500">Fast roster setup</span>
          </div>
          <p className="text-[11px] text-slate-600">
            Paste your choir member names, voice part, and phone number (one per line). Format: <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">Full Name, Voice (Soprano/Alto/Tenor/Bass), Phone</span>
          </p>
          <textarea
            rows={4}
            placeholder={`Chukwuma Charles, Tenor, +234 803 123 4567\nChioma Grace, Soprano, +234 802 987 6543\nMichael Eze, Bass, +234 805 111 2233\nSister Chidera, Alto, +234 809 444 5566`}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full p-2.5 font-mono text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
          />

          {bulkStatus && (
            <p className="text-xs font-semibold text-emerald-700">{bulkStatus}</p>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleBulkImport}
              disabled={!bulkText.trim()}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-xs px-4 py-2 rounded-lg transition"
            >
              Import Members to Roster
            </button>
          </div>
        </div>

        {/* LOGS & TIMETABLE DELETION CONTROLS (WITH WARNING) */}
        <div className="p-4 rounded-xl bg-red-50/60 border border-red-200/80 text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-red-200/60 pb-2">
            <h4 className="font-bold text-red-950 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Activity Logs & Timetable Maintenance (Deletable with Warning)
            </h4>
            <span className="text-[11px] font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded">
              High Discretion Area
            </span>
          </div>

          <p className="text-[11px] text-slate-700 leading-relaxed">
            As requested by the choir administration, historical attendance logs and the rehearsal timetable can be cleared independently without touching the chorister roster or church officer setup.
          </p>

          {logsClearedMessage && (
            <div className="p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-700" />
              Operation completed successfully.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Delete Main Logs */}
            <div className="p-3 bg-white rounded-lg border border-red-200 flex flex-col justify-between space-y-2">
              <div>
                <span className="font-bold text-slate-900 block">Delete Main Activity & Attendance Logs</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Clears all recorded attendance entries, disciplinary fines, payments, and complaint audits.
                </p>
              </div>

              {!showClearLogsConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowClearLogsConfirm(true)}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition self-start flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  Delete Main Logs...
                </button>
              ) : (
                <div className="bg-red-100 p-2.5 rounded-lg border border-red-300 space-y-2">
                  <p className="text-[11px] font-bold text-red-900">
                    ⚠️ WARNING: This will permanently erase all attendance records, fines, payments, and audit logs. Active choristers and settings will NOT be touched.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onClearMainLogs) onClearMainLogs();
                        setShowClearLogsConfirm(false);
                        setLogsClearedMessage(true);
                        setTimeout(() => setLogsClearedMessage(false), 3000);
                      }}
                      className="bg-red-700 hover:bg-red-800 text-white text-[11px] font-bold px-3 py-1 rounded transition"
                    >
                      Confirm Delete Logs
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearLogsConfirm(false)}
                      className="text-slate-600 hover:text-slate-900 text-[11px] px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Clear Rehearsal Timetable */}
            <div className="p-3 bg-white rounded-lg border border-red-200 flex flex-col justify-between space-y-2">
              <div>
                <span className="font-bold text-slate-900 block">Clear Rehearsal Timetable (Schedule)</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Clears all demo or past scheduled sessions so the executive can define a fresh calendar.
                </p>
              </div>

              {!showClearSessionsConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowClearSessionsConfirm(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition self-start flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-600" />
                  Clear Timetable...
                </button>
              ) : (
                <div className="bg-amber-100 p-2.5 rounded-lg border border-amber-300 space-y-2">
                  <p className="text-[11px] font-bold text-amber-900">
                    ⚠️ Clear all sessions in the timetable? You can add real parish rehearsals immediately after.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onClearSessions) onClearSessions();
                        setShowClearSessionsConfirm(false);
                        setLogsClearedMessage(true);
                        setTimeout(() => setLogsClearedMessage(false), 3000);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold px-3 py-1 rounded transition"
                    >
                      Confirm Clear Timetable
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearSessionsConfirm(false)}
                      className="text-slate-600 hover:text-slate-900 text-[11px] px-2 py-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: BACKUP & GOOGLE SHEETS SCRIPT */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
          3. Backup & Google Sheets Integration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-slate-700" />
              Local Database Backup
            </h4>
            <p className="text-[11px] text-slate-500">
              Download complete JSON backup containing all choristers, attendance logs, and financial records.
            </p>
            <button
              onClick={onExportBackup}
              className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs px-3 py-1.5 rounded-lg transition"
            >
              Download Backup File (.json)
            </button>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-slate-700" />
              Google Apps Script Source Code
            </h4>
            <p className="text-[11px] text-slate-500">
              View or copy the complete 1-click Google Apps Script code to connect directly with your church's Google Sheet.
            </p>
            <button
              onClick={() => setShowScriptModal(true)}
              className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs px-3 py-1.5 rounded-lg transition"
            >
              View Google Apps Script (.gs) Code
            </button>
          </div>
        </div>
      </div>

      {/* Google Apps Script Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Google Apps Script Suite for Google Sheets
              </h3>
              <button 
                onClick={() => setShowScriptModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Paste this setup code into your Google Sheet (via <em>Extensions &gt; Apps Script</em>) to automatically create all 20 sheets and formulas.
            </p>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-[11px] max-h-72 overflow-y-auto leading-relaxed">
              <pre>{googleAppsScriptFiles[0]?.code}</pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-slate-400">01_Setup_and_Schema.gs</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(googleAppsScriptFiles[0]?.code || '');
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="bg-slate-900 text-white font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5"
              >
                {copiedCode ? <Check className="w-4 h-4 text-amber-200" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? 'Copied to Clipboard!' : 'Copy Setup Script'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
