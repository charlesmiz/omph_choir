import React, { useState } from 'react';
import { 
  HelpCircle, 
  ShieldAlert, 
  Lock, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { 
  ComplaintRecord, 
  ComplaintCategory, 
  Chorister 
} from '../types';
import { HelpToggle } from './HelpToggle';

interface ComplaintsDeskProps {
  members: Chorister[];
  complaints: ComplaintRecord[];
  onSubmitComplaint: (complaint: ComplaintRecord) => void;
  onResolveComplaint: (complaintId: string, decision: string) => void;
}

export const ComplaintsDesk: React.FC<ComplaintsDeskProps> = ({
  members,
  complaints,
  onSubmitComplaint,
  onResolveComplaint,
}) => {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('Incorrect Attendance');
  const [description, setDescription] = useState('');
  const [refId, setRefId] = useState('');
  const [resolutionBoxId, setResolutionBoxId] = useState<string>('');
  const [resolutionText, setResolutionText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !description) return;

    const member = members.find(m => m.memberId === memberId);
    if (!member) return;

    const now = new Date();
    const complaintId = `CMP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    // Anti-bias assignment: If administrative conduct or attendance, route to Choir Master!
    const assignedOfficer = category === 'Administrative Conduct' || category === 'Incorrect Attendance'
      ? 'Choir Master'
      : 'Provost';

    const newComplaint: ComplaintRecord = {
      complaintId,
      memberId: member.memberId,
      memberName: member.fullName,
      complaintDate: now.toISOString().split('T')[0],
      category,
      description,
      relevantReferenceId: refId || undefined,
      assignedOfficer,
      status: 'New',
      isConfidential: true,
    };

    onSubmitComplaint(newComplaint);
    setShowSubmitModal(false);
    setMemberId('');
    setDescription('');
    setRefId('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-purple-600" />
            Confidential Complaint & Dispute Resolution Desk
          </h2>
          <HelpToggle label="How routing works">
            Choristers can challenge arrival timestamps, fines, or administrative conduct. Complaints regarding attendance or administrative conduct route directly to the Choir Master.
          </HelpToggle>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition"
        >
          <Plus className="w-4 h-4" /> File New Confidential Dispute
        </button>
      </div>

      {/* Complaints List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Registered Grievances & Adjudication Status
          </h3>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-purple-600" /> Confidential — Restricted to Executive Adjudicators
          </span>
        </div>

        <div className="space-y-4">
          {complaints.map(c => (
            <div key={c.complaintId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-purple-100 text-purple-900 px-2 py-0.5 rounded">
                    {c.complaintId}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">{c.memberName} ({c.memberId})</h4>
                  <span className="text-xs font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                    {c.category}
                  </span>
                </div>

                <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                  c.status === 'Resolved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : c.status === 'Rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {c.status}
                </span>
              </div>

              <p className="text-xs text-slate-800 leading-relaxed">
                "{c.description}"
              </p>

              <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <span>
                  Date: <strong className="font-mono">{c.complaintDate}</strong> | Assigned Adjudicator: <strong className="text-purple-700">{c.assignedOfficer}</strong>
                </span>
                {c.relevantReferenceId && (
                  <span className="font-mono text-slate-600">
                    Ref ID: {c.relevantReferenceId}
                  </span>
                )}
              </div>

              {c.decision && (
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-xs text-emerald-900">
                  <strong>Adjudication Finding ({c.resolutionDate}):</strong> {c.decision}
                </div>
              )}

              {c.status !== 'Resolved' && c.status !== 'Rejected' && (
                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => setResolutionBoxId(c.complaintId)}
                    className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1.5 rounded-lg font-medium"
                  >
                    Adjudicate & Resolve Dispute
                  </button>
                </div>
              )}

              {resolutionBoxId === c.complaintId && (
                <div className="bg-white p-3 rounded-lg border border-purple-200 space-y-2 mt-2">
                  <label className="block text-xs font-bold text-slate-700">Adjudication Finding & Rectification</label>
                  <textarea
                    rows={2}
                    placeholder="Enter ruling, attendance correction reference, or fine reversal note..."
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    className="w-full border border-slate-300 rounded p-2 text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setResolutionBoxId('')}
                      className="px-2.5 py-1 text-xs border rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onResolveComplaint(c.complaintId, resolutionText);
                        setResolutionBoxId('');
                        setResolutionText('');
                      }}
                      className="px-3 py-1 text-xs bg-purple-600 text-white rounded font-semibold"
                    >
                      Save Ruling
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* New Complaint Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                File Confidential Complaint / Dispute
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chorister</label>
                <select
                  required
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="">-- Select Member --</option>
                  {members.map((m, idx) => (
                    <option key={`${m.memberId}-${idx}`} value={m.memberId}>
                      {m.fullName} ({m.memberId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Grievance Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  <option value="Incorrect Attendance">Incorrect Attendance Entry</option>
                  <option value="Incorrect Fine">Incorrect Financial Penalty</option>
                  <option value="Payment Record Dispute">Payment Record Dispute</option>
                  <option value="Accommodation Decision">Accommodation Decision Dispute</option>
                  <option value="Administrative Conduct">Administrative Conduct of Provost/Officer</option>
                  <option value="Other">Other Management Concern</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. SESS-2026-10-30-FRI or FINE-20261030-01"
                  value={refId}
                  onChange={(e) => setRefId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description & Evidence</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain the incident, your actual arrival time, eyewitnesses, or payment receipt details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border rounded-lg text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold"
                >
                  Submit Confidential Grievance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
