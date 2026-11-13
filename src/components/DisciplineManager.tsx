import React, { useState } from 'react';
import { 
  ShieldAlert, 
  FileText, 
  Printer, 
  Check, 
  X,
  Send,
  AlertTriangle
} from 'lucide-react';
import { 
  Chorister, 
  FineRecord, 
  QueryRecord, 
  SuspensionRecord 
} from '../types';
import { HelpToggle } from './HelpToggle';

interface DisciplineManagerProps {
  members: Chorister[];
  fines: FineRecord[];
  queries: QueryRecord[];
  suspensions: SuspensionRecord[];
  onIssueQuery: (query: QueryRecord) => void;
  onRecordQueryResponse: (queryId: string, responseText: string) => void;
  onExecutiveDecision: (queryId: string, decision: any, notes: string) => void;
  onApproveSuspension: (suspension: SuspensionRecord) => void;
  onReinstateMember: (suspensionId: string, memberId: string) => void;
}

export const DisciplineManager: React.FC<DisciplineManagerProps> = ({
  members,
  fines,
  queries,
  suspensions,
  onIssueQuery,
  onRecordQueryResponse,
  onExecutiveDecision,
  onApproveSuspension,
  onReinstateMember,
}) => {
  const [selectedQueryForNotice, setSelectedQueryForNotice] = useState<QueryRecord | null>(null);
  const [respondingQueryId, setRespondingQueryId] = useState<string>('');
  const [memberResponseText, setMemberResponseText] = useState('');

  // 21-Day Debt Scanner
  const today = new Date();
  const overdueDebtScan = members.map(m => {
    const memberFines = fines.filter(f => f.memberId === m.memberId && f.paymentStatus !== 'Paid' && f.paymentStatus !== 'Waived');
    const overdueFines = memberFines.filter(f => {
      const fineDate = new Date(f.date);
      const diffDays = Math.floor((today.getTime() - fineDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 21;
    });

    const overdueTotal = overdueFines.reduce((sum, f) => sum + f.amount, 0);
    const existingActiveQuery = queries.find(q => q.memberId === m.memberId && (q.status === 'Issued' || q.status === 'Response Received'));

    return {
      member: m,
      overdueFines,
      overdueTotal,
      isFlagged: overdueFines.length > 0,
      existingQuery: existingActiveQuery,
    };
  }).filter(item => item.isFlagged);

  const handleCreateQuery = (item: typeof overdueDebtScan[0]) => {
    const now = new Date();
    const queryId = `QRY-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    const newQuery: QueryRecord = {
      queryId,
      memberId: item.member.memberId,
      memberName: item.member.fullName,
      issueDate: now.toISOString().split('T')[0],
      responseDeadline: deadline.toISOString().split('T')[0],
      outstandingAmount: item.overdueTotal,
      fineIds: item.overdueFines.map(f => f.fineId),
      status: 'Issued',
      issuedBy: 'Choir Master & Provost Office',
      officialNoticeText: `OFFICIAL DISCIPLINARY QUERY: In accordance with Part 11 of the Choir Accountability Policy, your outstanding disciplinary fines totaling ₦${item.overdueTotal.toLocaleString()} have remained unsettled beyond the 21-calendar-day threshold. You are required to submit an explanation or proposed installment plan on or before ${deadline.toISOString().split('T')[0]}.`,
    };

    onIssueQuery(newQuery);
    setSelectedQueryForNotice(newQuery);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-slate-900">
            Three-Week (21-Day) Debt Query & Disciplinary Accountability
          </h2>
          <HelpToggle label="Policy rules">
            Fines unpaid after 21 calendar days are flagged for an official query notice carrying a 7-day response window.
          </HelpToggle>
        </div>

        <span className="text-xs font-semibold px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg">
          {overdueDebtScan.length} Overdue Account(s)
        </span>
      </div>

      {/* SECTION 1: 21-DAY OVERDUE SCANNER */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Accounts Exceeding 21-Day Threshold
          </h3>
        </div>

        <div className="space-y-3">
          {overdueDebtScan.map((item, idx) => (
            <div 
              key={`${item.member.memberId}-${idx}`}
              className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-wrap items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  {item.member.fullName} <span className="font-mono text-xs text-slate-500 font-normal">({item.member.memberId} - {item.member.voicePart})</span>
                </div>
                <div className="mt-1 text-slate-700">
                  Overdue Debt: <strong className="font-mono text-red-700 font-bold">₦{item.overdueTotal.toLocaleString()}</strong> across {item.overdueFines.length} violation(s).
                </div>
              </div>

              <div>
                {item.existingQuery ? (
                  <span className="bg-white border border-slate-300 text-slate-700 font-medium px-3 py-1.5 rounded-lg text-xs">
                    Query Issued ({item.existingQuery.queryId})
                  </span>
                ) : (
                  <button
                    onClick={() => handleCreateQuery(item)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition"
                  >
                    Issue Official Query Notice
                  </button>
                )}
              </div>
            </div>
          ))}

          {overdueDebtScan.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-xs">
              No chorister fines currently exceed the 21-day threshold.
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: QUERIES LOG */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Issued Queries & Responses
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Query ID</th>
                <th className="py-2 px-3">Chorister</th>
                <th className="py-2 px-3">Issued Date</th>
                <th className="py-2 px-3">Deadline (7d)</th>
                <th className="py-2 px-3">Amount (₦)</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queries.map(q => (
                <tr key={q.queryId} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-600">{q.queryId}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{q.memberName}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{q.issueDate}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{q.responseDeadline}</td>
                  <td className="py-2.5 px-3 font-mono font-bold">₦{q.outstandingAmount}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      q.status === 'Resolved'
                        ? 'bg-amber-100 text-slate-900'
                        : q.status === 'Response Received'
                        ? 'bg-slate-100 text-slate-800'
                        : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedQueryForNotice(q)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded"
                      >
                        Notice
                      </button>
                      {q.status === 'Issued' && (
                        <button
                          onClick={() => {
                            setRespondingQueryId(q.queryId);
                            setMemberResponseText('');
                          }}
                          className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2 py-1 rounded font-medium"
                        >
                          Log Reply
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {queries.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No active disciplinary queries on file.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Member Response Input Box */}
        {respondingQueryId && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
            <h4 className="font-bold text-slate-800">
              Record Member Written Reply for Query: <span className="font-mono">{respondingQueryId}</span>
            </h4>
            <textarea
              rows={3}
              placeholder="Record member's explanation, reason for delay, or proposed installment payment schedule..."
              value={memberResponseText}
              onChange={(e) => setMemberResponseText(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRespondingQueryId('')}
                className="px-3 py-1.5 border rounded-lg text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRecordQueryResponse(respondingQueryId, memberResponseText);
                  setRespondingQueryId('');
                }}
                className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg font-semibold"
              >
                Save Reply to Executive Record
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Query Notice Modal */}
      {selectedQueryForNotice && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                  DISCIPLINARY NOTICE: {selectedQueryForNotice.queryId}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Official Query Notice Letter
                </h3>
              </div>
              <button onClick={() => setSelectedQueryForNotice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 font-serif leading-relaxed text-slate-800 space-y-2">
              <div className="text-right font-sans text-slate-500 text-[11px]">
                Date: {selectedQueryForNotice.issueDate}
              </div>
              <p>
                <strong>To:</strong> {selectedQueryForNotice.memberName} ({selectedQueryForNotice.memberId})<br />
                <strong>From:</strong> Choir Executive Disciplinary Panel<br />
                <strong>Subject:</strong> OVERDUE DISCIPLINARY FINES EXCEEDING 21 DAYS
              </p>
              <p className="border-t border-slate-200 pt-2">
                {selectedQueryForNotice.officialNoticeText}
              </p>
              <div className="bg-amber-50 p-2.5 rounded border border-amber-200 font-sans text-[11px] text-amber-900">
                <strong>Response Deadline:</strong> {selectedQueryForNotice.responseDeadline} (7 Days)<br />
                <strong>Total Overdue Indebtedness:</strong> ₦{selectedQueryForNotice.outstandingAmount.toLocaleString()}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
              >
                <Printer className="w-3.5 h-3.5" /> Print Letter
              </button>
              <button
                onClick={() => setSelectedQueryForNotice(null)}
                className="bg-slate-900 text-white text-xs font-semibold px-4 py-1.5 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
