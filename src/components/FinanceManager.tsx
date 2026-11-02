import React, { useState } from 'react';
import { 
  DollarSign, 
  Receipt, 
  Plus, 
  Search, 
  Printer, 
  Check, 
  X,
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';
import { 
  Chorister, 
  FineRecord, 
  PaymentRecord, 
  AdjustmentRecord, 
  FundMovementRecord, 
  PaymentMethod 
} from '../types';

interface FinanceManagerProps {
  members: Chorister[];
  fines: FineRecord[];
  payments: PaymentRecord[];
  adjustments: AdjustmentRecord[];
  fundMovements: FundMovementRecord[];
  onRecordPayment: (payment: PaymentRecord) => void;
  onRecordAdjustment: (adjustment: AdjustmentRecord) => void;
}

export const FinanceManager: React.FC<FinanceManagerProps> = ({
  members,
  fines,
  payments,
  adjustments,
  fundMovements,
  onRecordPayment,
  onRecordAdjustment,
}) => {
  const [subTab, setSubTab] = useState<'cashier' | 'accounts' | 'fines'>('cashier');
  const [searchAccount, setSearchAccount] = useState('');

  // Cashier Form State
  const [payerId, setPayerId] = useState('');
  const [amountInput, setAmountInput] = useState<number>(200);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [bankRef, setBankRef] = useState('');
  const [notes, setNotes] = useState('');
  const [lastReceipt, setLastReceipt] = useState<PaymentRecord | null>(null);

  // Financial Totals
  const totalFines = fines.reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalWaivers = adjustments.reduce((sum, a) => sum + a.amount, 0);
  const netDebt = totalFines - totalPaid - totalWaivers;

  const cashCollected = payments
    .filter(p => p.paymentMethod === 'Cash')
    .reduce((sum, p) => sum + p.amount, 0);
  const bankCollected = payments
    .filter(p => p.paymentMethod === 'Bank Transfer')
    .reduce((sum, p) => sum + p.amount, 0);

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerId || amountInput <= 0) return;

    const member = members.find(m => m.memberId === payerId);
    if (!member) return;

    const now = new Date();
    const paymentId = `PAY-${Date.now()}`;
    const receiptNumber = `RCP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newPayment: PaymentRecord = {
      paymentId,
      memberId: member.memberId,
      memberName: member.fullName,
      paymentDate: now.toISOString().split('T')[0],
      amount: Number(amountInput),
      paymentMethod: method,
      bankReference: method === 'Bank Transfer' ? bankRef : undefined,
      receiptNumber,
      receivedBy: 'Brother Emmanuel Okoli (Provost)',
      recordedBy: 'Provost Desk',
      notes: notes || 'Fine settlement payment',
    };

    onRecordPayment(newPayment);
    setLastReceipt(newPayment);
    setPayerId('');
    setAmountInput(200);
    setBankRef('');
    setNotes('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Provost Cashier & Financial Ledgers
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Collect fine settlements (Cash or Bank Transfer), issue sequential receipts, and inspect individual account balances.
          </p>
        </div>

        {/* Clean summary pills */}
        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
            Assessed: <strong className="font-mono text-slate-900">₦{totalFines.toLocaleString()}</strong>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
            Collected: <strong className="font-mono text-slate-900">₦{totalPaid.toLocaleString()}</strong>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-amber-900">
            Outstanding: <strong className="font-mono text-slate-900">₦{netDebt.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setSubTab('cashier')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
            subTab === 'cashier'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4 text-slate-700" /> Receive Payment (Cashier)
        </button>

        <button
          onClick={() => setSubTab('accounts')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
            subTab === 'accounts'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <DollarSign className="w-4 h-4 text-slate-700" /> Individual Member Accounts
        </button>

        <button
          onClick={() => setSubTab('fines')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
            subTab === 'fines'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-slate-700" /> Fine Ledger
        </button>
      </div>

      {/* TAB 1: CASHIER & PAYMENTS */}
      {subTab === 'cashier' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Record Payment
              </h3>
              <p className="text-[11px] text-slate-500">Provost penalty settlement desk</p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Paying Chorister</label>
                <select
                  required
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map(m => {
                    const mFines = fines.filter(f => f.memberId === m.memberId).reduce((s, f) => s + f.amount, 0);
                    const mPaid = payments.filter(p => p.memberId === m.memberId).reduce((s, p) => s + p.amount, 0);
                    const bal = mFines - mPaid;
                    return (
                      <option key={m.memberId} value={m.memberId}>
                        {m.fullName} (Owes: ₦{bal})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₦)</label>
                  <input
                    type="number"
                    min={50}
                    step={50}
                    required
                    value={amountInput}
                    onChange={(e) => setAmountInput(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                  >
                    <option value="Cash">Cash (In Hand)</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {method === 'Bank Transfer' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Reference</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ZENITH-TX-992182741"
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Partial settlement for late fine"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg transition text-xs shadow-xs"
              >
                Issue Receipt & Record Payment
              </button>
            </form>
          </div>

          {/* Right Column: Recent Payments & Last Receipt */}
          <div className="lg:col-span-2 space-y-4">
            {lastReceipt && (
              <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl flex items-start justify-between text-xs">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Receipt Generated: <span className="font-mono">{lastReceipt.receiptNumber}</span>
                  </div>
                  <p className="text-slate-700 mt-1">
                    Received <strong>₦{lastReceipt.amount.toLocaleString()}</strong> from <strong>{lastReceipt.memberName}</strong> ({lastReceipt.paymentMethod}).
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Recent Payment Transactions (Sheet 12)
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Cash: ₦{cashCollected.toLocaleString()} | Bank: ₦{bankCollected.toLocaleString()}
                </span>
              </div>

              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Receipt</th>
                      <th className="py-2 px-3">Chorister</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3 text-right">Amount (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map(p => (
                      <tr key={p.paymentId} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{p.memberName}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{p.paymentDate}</td>
                        <td className="py-2 px-3 text-slate-600">{p.paymentMethod}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          ₦{p.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No payments recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INDIVIDUAL MEMBER ACCOUNTS */}
      {subTab === 'accounts' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Individual Chorister Balances (Sheet 14)
              </h3>
              <p className="text-[11px] text-slate-500">
                Calculated strictly: Outstanding = Total Approved Fines - Total Payments - Waivers.
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search member..."
                value={searchAccount}
                onChange={(e) => setSearchAccount(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Member ID</th>
                  <th className="py-2 px-3">Chorister Name</th>
                  <th className="py-2 px-3">Voice</th>
                  <th className="py-2 px-3 text-right">Fines Assessed</th>
                  <th className="py-2 px-3 text-right">Paid</th>
                  <th className="py-2 px-3 text-right">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members
                  .filter(m => m.fullName.toLowerCase().includes(searchAccount.toLowerCase()))
                  .map(m => {
                    const mFines = fines.filter(f => f.memberId === m.memberId).reduce((s, f) => s + f.amount, 0);
                    const mPaid = payments.filter(p => p.memberId === m.memberId).reduce((s, p) => s + p.amount, 0);
                    const mWaivers = adjustments.filter(a => a.memberId === m.memberId).reduce((s, a) => s + a.amount, 0);
                    const balance = mFines - mPaid - mWaivers;

                    return (
                      <tr key={m.memberId} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-500">{m.memberId}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{m.fullName}</td>
                        <td className="py-2 px-3 text-slate-600">{m.voicePart}</td>
                        <td className="py-2 px-3 text-right font-mono">₦{mFines}</td>
                        <td className="py-2 px-3 text-right font-mono">₦{mPaid}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          <span className={balance > 0 ? 'text-red-700' : 'text-slate-800'}>
                            {balance < 0 ? `-₦${Math.abs(balance)} (Credit)` : `₦${balance}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FINE LEDGER */}
      {subTab === 'fines' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Fine Ledger Records (Sheet 11)
            </h3>
            <p className="text-[11px] text-slate-500">
              Assessed fines with 21-calendar-day due dates.
            </p>
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Fine ID</th>
                  <th className="py-2 px-3">Chorister</th>
                  <th className="py-2 px-3">Violation</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Due Date (21d)</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Amount (₦)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fines.map(f => (
                  <tr key={f.fineId} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-medium text-slate-600">{f.fineId}</td>
                    <td className="py-2 px-3 font-medium text-slate-900">{f.memberName}</td>
                    <td className="py-2 px-3 text-slate-700">{f.violationType}</td>
                    <td className="py-2 px-3 font-mono text-slate-500">{f.date}</td>
                    <td className="py-2 px-3 font-mono text-slate-700">{f.dueDate}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        f.paymentStatus === 'Paid'
                          ? 'bg-amber-100 text-slate-900'
                          : 'bg-red-50 text-red-800'
                      }`}>
                        {f.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                      ₦{f.amount}
                    </td>
                  </tr>
                ))}
                {fines.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No fines on record.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
