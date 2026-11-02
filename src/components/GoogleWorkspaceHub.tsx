import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  CheckCircle2, 
  Download, 
  BookOpen, 
  FileSpreadsheet, 
  Share2, 
  Layers, 
  ShieldCheck, 
  Smartphone,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { googleAppsScriptFiles, ScriptFile } from '../data/googleAppsScriptCode';
import { 
  provostOperatingManual, 
  whatsappIntegrationPlan, 
  governanceAnalysisReport 
} from '../data/documentation';

export const GoogleWorkspaceHub: React.FC = () => {
  const [hubTab, setHubTab] = useState<'scripts' | 'manual' | 'sheets' | 'whatsapp' | 'governance'>('scripts');
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copiedFile, setCopiedFile] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const currentFile = googleAppsScriptFiles[activeFileIndex];

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleDownloadAll = () => {
    const combined = googleAppsScriptFiles.map(f => `// ===== FILE: ${f.name} =====\n// ${f.description}\n\n${f.code}\n\n`).join('\n');
    const blob = new Blob([combined], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Choir_Management_GoogleAppsScript_Suite.js';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-500 text-slate-950 font-bold px-2 py-0.5 rounded font-mono uppercase">
              ZERO RECURRING COST
            </span>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-emerald-400" />
              Google Workspace Deployment Hub & Source Repository
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Complete, runnable Google Apps Script (.gs) source code, automated 20-sheet schema installer, Provost operating handbook, and future WhatsApp architecture.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadAll}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition"
          >
            <Download className="w-4 h-4" /> Download All (.gs) Files
          </button>
        </div>
      </div>

      {/* Hub Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setHubTab('scripts')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            hubTab === 'scripts'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Code2 className="w-4 h-4" /> Apps Script Code Files ({googleAppsScriptFiles.length})
        </button>

        <button
          onClick={() => setHubTab('manual')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            hubTab === 'manual'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Provost Operating Manual (Beginner-Friendly)
        </button>

        <button
          onClick={() => setHubTab('sheets')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            hubTab === 'sheets'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> 20-Sheet Master Workbook Architecture
        </button>

        <button
          onClick={() => setHubTab('whatsapp')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            hubTab === 'whatsapp'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Smartphone className="w-4 h-4" /> WhatsApp Phase 2 Integration Specification
        </button>

        <button
          onClick={() => setHubTab('governance')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 whitespace-nowrap ${
            hubTab === 'governance'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Governance Analysis & Ratification Report
        </button>
      </div>

      {/* TAB 1: CODE FILES */}
      {hubTab === 'scripts' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* File Selector Sidebar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Apps Script Files
            </h3>
            {googleAppsScriptFiles.map((file, idx) => (
              <button
                key={file.name}
                onClick={() => setActiveFileIndex(idx)}
                className={`w-full text-left p-2.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                  activeFileIndex === idx
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="truncate mr-2">
                  <span className="block truncate">{file.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal truncate block">
                    {file.type.toUpperCase()} File
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {file.type}
                </span>
              </button>
            ))}

            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 space-y-2">
              <strong>Quick Installation in Google Sheets:</strong>
              <ol className="list-decimal list-inside space-y-1 text-[10px] text-slate-600">
                <li>Create a blank Google Sheet.</li>
                <li>Go to <em>Extensions &gt; Apps Script</em>.</li>
                <li>Create files with these exact names.</li>
                <li>Paste code and save.</li>
                <li>Run <code>initializeMasterWorkbook</code>.</li>
              </ol>
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs lg:col-span-3 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="text-xs font-bold font-mono text-slate-900">{currentFile.name}</h4>
                <p className="text-[11px] text-slate-500">{currentFile.description}</p>
              </div>

              <button
                onClick={() => handleCopyCode(currentFile.code)}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-xs"
              >
                {copiedFile ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFile ? 'Copied to Clipboard!' : 'Copy Code'}
              </button>
            </div>

            <div className="p-4 bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto max-h-[550px] leading-relaxed">
              <pre>{currentFile.code}</pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROVOST MANUAL */}
      {hubTab === 'manual' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Beginner-Friendly Operating Manual for the Provost
            </h3>
            <button
              onClick={() => handleCopyCode(provostOperatingManual)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Handbook Text
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line bg-slate-50 p-5 rounded-xl border border-slate-200">
            {provostOperatingManual}
          </div>
        </div>
      )}

      {/* TAB 3: WORKBOOK ARCHITECTURE */}
      {hubTab === 'sheets' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Master Workbook A (20 Sheets) & Public Workbook B Separation
            </h3>
            <p className="text-xs text-slate-500">
              Strict access boundary preventing disclosure of private debts, balances, and sensitive medical notes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 space-y-2">
              <h4 className="font-bold text-blue-950 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                Workbook A: Private Executive Master (20 Sheets)
              </h4>
              <p className="text-slate-600 text-[11px]">
                Accessible ONLY to Provost, Choir Master, and authorized executive officers.
              </p>
              <ul className="space-y-1 list-decimal list-inside text-slate-700 text-[11px]">
                <li><strong>Executive Dashboard:</strong> Real-time KPIs & fund balances</li>
                <li><strong>Settings & Configuration:</strong> ₦200/₦500 fines, 5m grace, 21d threshold</li>
                <li><strong>Chorister Membership:</strong> 40 members, E.164 phone formats</li>
                <li><strong>Rehearsal Schedule:</strong> Flexible timetable with call-time overrides</li>
                <li><strong>Attendance Raw Responses:</strong> Automated server timestamp logs</li>
                <li><strong>Final Attendance Register:</strong> Finalised classifications & fine IDs</li>
                <li><strong>Manual Attendance Entries:</strong> Observed arrival vs record timestamps</li>
                <li><strong>Absence Notifications:</strong> Anticipated & emergency submissions</li>
                <li><strong>Accommodation Applications:</strong> Standing 3-month requests</li>
                <li><strong>Approved Accommodations:</strong> 3-member panel approvals</li>
                <li><strong>Fine Ledger:</strong> ₦200 late, ₦500 absence, 21-day due dates</li>
                <li><strong>Payment Ledger:</strong> Cash & bank transfer receipts</li>
                <li><strong>Adjustment & Waiver Ledger:</strong> Approved fine contra-entries</li>
                <li><strong>Individual Financial Accounts:</strong> Mathematical balance formulas</li>
                <li><strong>Queries & Responses:</strong> Disciplinary notices & member replies</li>
                <li><strong>Suspension & Reinstatement:</strong> Non-automated sanctions</li>
                <li><strong>Complaints & Disputes:</strong> Anti-bias confidential desk</li>
                <li><strong>Fund Movement & Expenses:</strong> Cashier cash custody vs bank</li>
                <li><strong>Monthly Reports:</strong> Financial reconciliations</li>
                <li><strong>Audit Log:</strong> Immutable tracking of schedule & attendance edits</li>
              </ul>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-2">
              <h4 className="font-bold text-emerald-950 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Workbook B: Public Attendance Register (1 Sheet)
              </h4>
              <p className="text-slate-600 text-[11px]">
                Shared with choir members as Viewers via standard Google Drive permissions.
              </p>
              <div className="p-3 bg-white rounded-lg border border-emerald-200 text-slate-700 text-[11px] space-y-1">
                <strong>Public Fields:</strong>
                <div>1. Rehearsal Date (YYYY-MM-DD)</div>
                <div>2. Rehearsal Activity (e.g. Sunday Pre-Mass)</div>
                <div>3. Required Arrival Call Time</div>
                <div>4. Chorister Name & Voice Part</div>
                <div>5. Observed Physical Arrival Time</div>
                <div>6. Attendance Classification (Present / Late / Excused / Absent)</div>
                <div>7. Session Penalty Amount (Optional, if authorized by Choir Master)</div>
              </div>

              <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-red-900 text-[11px] space-y-1">
                <strong>Strict Privacy Exclusions:</strong>
                <div>✕ Cumulative outstanding debt balances are NEVER shown</div>
                <div>✕ Payment histories and bank transactions are NEVER shown</div>
                <div>✕ Private medical or family accommodation reasons are NEVER shown</div>
                <div>✕ Disciplinary query letters and suspension minutes are NEVER shown</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WHATSAPP PLAN */}
      {hubTab === 'whatsapp' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Future WhatsApp Chatbot Integration Plan (Phase 2 Architecture)
            </h3>
            <button
              onClick={() => handleCopyCode(whatsappIntegrationPlan)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Specification
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line bg-slate-50 p-5 rounded-xl border border-slate-200">
            {whatsappIntegrationPlan}
          </div>
        </div>
      )}

      {/* TAB 5: GOVERNANCE */}
      {hubTab === 'governance' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">
              Governance Analysis & Ratification Report
            </h3>
            <button
              onClick={() => handleCopyCode(governanceAnalysisReport)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Governance Report
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-line bg-slate-50 p-5 rounded-xl border border-slate-200">
            {governanceAnalysisReport}
          </div>
        </div>
      )}
    </div>
  );
};
