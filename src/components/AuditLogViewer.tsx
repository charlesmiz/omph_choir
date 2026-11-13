import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  History, 
  Clock, 
  FileText,
  Download,
  AlertCircle
} from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditLogViewerProps {
  logs: AuditLogEntry[];
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ logs = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [officerFilter, setOfficerFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Extract distinct officers and modules for filter dropdowns
  const distinctOfficers = Array.from(new Set(logs.map(l => l.fullName).filter(Boolean)));
  const distinctModules = Array.from(new Set(logs.map(l => l.module).filter(Boolean)));

  const filteredLogs = logs.filter((log) => {
    const officerName = log.fullName || log.user || 'Officer';
    const matchesSearch = !searchTerm || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetEntity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.newValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOfficer = officerFilter === 'all' || officerName === officerFilter;
    const matchesModule = moduleFilter === 'all' || (log.module || '') === moduleFilter;

    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && log.timestamp.slice(0, 10) >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && log.timestamp.slice(0, 10) <= endDate;
    }

    return matchesSearch && matchesOfficer && matchesModule && matchesDate;
  });

  const exportAuditLogCSV = () => {
    const headers = ['Timestamp', 'Officer', 'Position', 'Module', 'Action', 'Target Entity', 'Old Value', 'New Value', 'Reason'];
    const rows = filteredLogs.map(l => [
      `"${l.timestamp}"`,
      `"${l.fullName}"`,
      `"${l.officialPosition}"`,
      `"${l.module}"`,
      `"${l.action}"`,
      `"${l.targetEntity}"`,
      `"${(l.oldValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
      `"${(l.reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `OMPH_Choir_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Executive Accountability & Audit Trail
            </h2>
          </div>
        </div>

        <button
          onClick={exportAuditLogCSV}
          disabled={filteredLogs.length === 0}
          className="text-xs bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" /> Export Audit Trail (CSV)
        </button>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 block mb-0.5">Filter by Officer</label>
            <select
              value={officerFilter}
              onChange={(e) => setOfficerFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 bg-white"
            >
              <option value="all">All Officers</option>
              {distinctOfficers.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-500 block mb-0.5">Filter by Module</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-800 bg-white"
            >
              <option value="all">All Modules</option>
              {distinctModules.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-500 block mb-0.5">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-500 block mb-0.5">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800 font-mono"
            />
          </div>
        </div>

        <div className="relative pt-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-4" />
          <input
            type="text"
            placeholder="Search action, officer, description, or target entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="p-3">Date & Time</th>
              <th className="p-3">Acting Officer</th>
              <th className="p-3">Action & Module</th>
              <th className="p-3">Details / Changes</th>
              <th className="p-3">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No audit log entries match the current search or filters.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.logId} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 text-slate-600 font-mono whitespace-nowrap align-top">
                    <span className="block font-bold text-slate-800">
                      {log.timestamp?.slice(0, 10)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {log.timestamp?.slice(11, 19)}
                    </span>
                  </td>

                  <td className="p-3 align-top">
                    <strong className="text-slate-900 block truncate max-w-44">
                      {log.fullName || 'System'}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">
                      {log.officialPosition || 'Officer'}
                    </span>
                  </td>

                  <td className="p-3 align-top">
                    <span className="font-semibold text-slate-900 block">
                      {log.action}
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded inline-block mt-0.5">
                      {log.module}
                    </span>
                  </td>

                  <td className="p-3 align-top text-slate-700 space-y-1">
                    <div className="text-xs">
                      <strong>Target:</strong> <span className="font-mono text-slate-900">{log.targetEntity}</span>
                    </div>
                    {log.oldValue && (
                      <div className="text-[11px] text-slate-500">
                        <span className="text-red-700 font-medium line-through">{log.oldValue}</span>
                      </div>
                    )}
                    {log.newValue && (
                      <div className="text-[11px] text-emerald-800 font-medium">
                        {log.newValue}
                      </div>
                    )}
                  </td>

                  <td className="p-3 align-top text-slate-500 italic max-w-xs">
                    {log.reason || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
