import React, { useState } from 'react';
import { 
  DollarSign, 
  Calendar, 
  Plus, 
  Check, 
  X, 
  AlertTriangle, 
  FileCheck2, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  CheckCircle2, 
  CreditCard,
  Building2,
  ShieldAlert,
  Percent
} from 'lucide-react';
import { 
  MonthlyDuesAssessment, 
  MonthlyDuesConfig, 
  SystemSettings, 
  Chorister, 
  ExecutiveAccount 
} from '../types';

interface MonthlyDuesManagerProps {
  monthlyDues: MonthlyDuesAssessment[];
  members: Chorister[];
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
  onGenerateCycle: (billingMonth: string, amount?: number) => Promise<any>;
  onRecordDuesPayment: (assessmentId: string, amount: number, method: string, reference?: string) => Promise<any>;
  onExemptDues: (assessmentId: string, reason: string) => Promise<any>;
  currentExecutive?: ExecutiveAccount | null;
}

export const MonthlyDuesManager: React.FC<MonthlyDuesManagerProps> = ({
  monthlyDues,
  members,
  settings,
  onUpdateSettings,
  onGenerateCycle,
  onRecordDuesPayment,
  onExemptDues,
  currentExecutive,
}) => {
  const duesConfig = settings.monthlyDuesConfig || {
    isEnabled: false,
    amount: 0,
    currency: '₦',
    effectiveCommencementMonth: '2026-11',
    monthlyBillingDay: 1,
    paymentDeadlineDays: 21,
    gracePeriodDays: 5,
    allowsPaymentArrangements: true,
    subjectTo21DayQuery: false,
  };

  // State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchMember, setSearchMember] = useState<string>('');

  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedAssessmentForPayment, setSelectedAssessmentForPayment] = useState<MonthlyDuesAssessment | null>(null);
  const [selectedAssessmentForExemption, setSelectedAssessmentForExemption] = useState<MonthlyDuesAssessment | null>(null);

  // Form states
  const [tempConfig, setTempConfig] = useState<MonthlyDuesConfig>({ ...duesConfig });
  const [genMonth, setGenMonth] = useState(selectedMonth);
  const [genAmount, setGenAmount] = useState<number>(duesConfig.amount || 0);
  const [genStatusMsg, setGenStatusMsg] = useState<string>('');

  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentReference, setPaymentReference] = useState<string>('');

  const [exemptionReason, setExemptionReason] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Filtering
  const filteredDues = monthlyDues.filter((d) => {
    const matchesMonth = selectedMonth === 'all' || d.billingMonth === selectedMonth;
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesSearch = !searchMember || 
      d.memberName.toLowerCase().includes(searchMember.toLowerCase()) || 
      d.memberId.toLowerCase().includes(searchMember.toLowerCase());
    return matchesMonth && matchesStatus && matchesSearch;
  });

  // Financial Stats for selected month
  const monthAssessments = monthlyDues.filter(d => selectedMonth === 'all' || d.billingMonth === selectedMonth);
  const totalAssessed = monthAssessments
    .filter(d => d.status !== 'Exempted' && d.status !== 'Waived')
    .reduce((sum, d) => sum + (d.assessedAmount || 0), 0);
  const totalCollected = monthAssessments
    .reduce((sum, d) => sum + (d.amountPaid || 0), 0);
  const totalOutstanding = Math.max(0, totalAssessed - totalCollected);
  const totalExempted = monthAssessments.filter(d => d.status === 'Exempted').length;
  const fullyPaidCount = monthAssessments.filter(d => d.status === 'Paid').length;
  const partiallyPaidCount = monthAssessments.filter(d => d.status === 'Partially Paid').length;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      monthlyDuesConfig: tempConfig,
    });
    setShowConfigModal(false);
    setActionSuccessMsg('Monthly dues configuration saved successfully.');
    setTimeout(() => setActionSuccessMsg(''), 3000);
  };

  const handleGenerateCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenStatusMsg('Generating dues cycle...');
    try {
      const res = await onGenerateCycle(genMonth, genAmount);
      setGenStatusMsg(res?.message || 'Monthly dues generated successfully!');
      setTimeout(() => {
        setGenStatusMsg('');
        setShowGenerateModal(false);
      }, 2000);
    } catch (err: any) {
      setGenStatusMsg(err?.message || 'Failed to generate monthly cycle.');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessmentForPayment || paymentAmount <= 0) return;
    try {
      await onRecordDuesPayment(
        selectedAssessmentForPayment.assessmentId,
        paymentAmount,
        paymentMethod,
        paymentReference
      );
      setSelectedAssessmentForPayment(null);
      setPaymentAmount(0);
      setPaymentReference('');
      setActionSuccessMsg('Monthly dues payment recorded and credited successfully.');
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to record dues payment.');
    }
  };

  const handleExemptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssessmentForExemption || !exemptionReason.trim()) return;
    try {
      await onExemptDues(selectedAssessmentForExemption.assessmentId, exemptionReason);
      setSelectedAssessmentForExemption(null);
      setExemptionReason('');
      setActionSuccessMsg('Formally approved exemption recorded.');
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to record exemption.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Monthly Choir Dues Management
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTempConfig({ ...duesConfig });
              setShowConfigModal(true);
            }}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-600" /> Dues Settings
          </button>

          <button
            onClick={() => {
              setGenMonth(selectedMonth === 'all' ? '2026-11' : selectedMonth);
              setGenAmount(duesConfig.amount || 0);
              setShowGenerateModal(true);
            }}
            className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" /> Generate Monthly Cycle
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Dues Status Banner if not enabled */}
      {!duesConfig.isEnabled && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong>Monthly Dues Currently Unconfigured:</strong> The monthly contribution policy has not been activated. Click <strong>Dues Settings</strong> above to configure the approved monthly amount, billing cycle day, and activation status.
          </div>
        </div>
      )}

      {/* KPI Cards for Selected Month */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-slate-500 text-[11px] block">Expected Dues ({selectedMonth})</span>
          <strong className="text-xl font-bold font-mono text-slate-900">
            {settings.currencySymbol || '₦'}{totalAssessed.toLocaleString()}
          </strong>
          <span className="text-slate-400 text-[10px] block">{monthAssessments.length} Choristers Assessed</span>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl shadow-xs space-y-1">
          <span className="text-emerald-800 text-[11px] block font-semibold">Total Dues Collected</span>
          <strong className="text-xl font-bold font-mono text-emerald-950">
            {settings.currencySymbol || '₦'}{totalCollected.toLocaleString()}
          </strong>
          <span className="text-emerald-700 text-[10px] block">{fullyPaidCount} Fully Paid · {partiallyPaidCount} Partial</span>
        </div>

        <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl shadow-xs space-y-1">
          <span className="text-red-800 text-[11px] block font-semibold">Outstanding Dues</span>
          <strong className="text-xl font-bold font-mono text-red-950">
            {settings.currencySymbol || '₦'}{totalOutstanding.toLocaleString()}
          </strong>
          <span className="text-red-700 text-[10px] block">
            {monthAssessments.filter(d => d.remainingBalance > 0).length} Choristers with Balance
          </span>
        </div>

        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl shadow-xs space-y-1">
          <span className="text-blue-800 text-[11px] block font-semibold">Approved Exemptions</span>
          <strong className="text-xl font-bold font-mono text-blue-950">{totalExempted}</strong>
          <span className="text-blue-700 text-[10px] block">Formal Waivers Granted</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <label className="text-[11px] text-slate-500 block mb-0.5">Billing Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-slate-300 rounded-lg p-1.5 text-xs font-mono text-slate-800 bg-white"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-500 block mb-0.5">Payment Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-lg p-1.5 text-xs text-slate-800 bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Fully Paid</option>
              <option value="Exempted">Exempted</option>
              <option value="Pending Verification">Pending Verification</option>
            </select>
          </div>
        </div>

        <div className="w-full sm:w-64">
          <label className="text-[11px] text-slate-500 block mb-0.5">Search Chorister</label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Name or Member ID..."
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Assessments Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
            <tr>
              <th className="p-3">Chorister</th>
              <th className="p-3">Billing Month</th>
              <th className="p-3">Assessed</th>
              <th className="p-3">Paid</th>
              <th className="p-3">Remaining Balance</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDues.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No dues assessments found for the selected month or filter.
                </td>
              </tr>
            ) : (
              filteredDues.map((due) => (
                <tr key={due.assessmentId} className="hover:bg-slate-50/80 transition">
                  <td className="p-3">
                    <strong className="text-slate-900 block">{due.memberName}</strong>
                    <span className="text-[11px] text-slate-500">{due.voicePart} · <span className="font-mono">{due.memberId}</span></span>
                  </td>
                  <td className="p-3 font-mono text-slate-700">{due.billingMonth}</td>
                  <td className="p-3 font-mono font-medium text-slate-900">
                    {settings.currencySymbol || '₦'}{due.assessedAmount.toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-emerald-700 font-semibold">
                    {settings.currencySymbol || '₦'}{due.amountPaid.toLocaleString()}
                  </td>
                  <td className="p-3 font-mono font-bold text-red-700">
                    {settings.currencySymbol || '₦'}{due.remainingBalance.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      due.status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-900'
                        : due.status === 'Partially Paid'
                        ? 'bg-amber-100 text-amber-900'
                        : due.status === 'Exempted'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-red-100 text-red-900'
                    }`}>
                      {due.status}
                    </span>
                    {due.exemptionReason && (
                      <span className="text-[10px] text-slate-500 block mt-0.5 italic truncate max-w-xs">
                        {due.exemptionReason}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1 whitespace-nowrap">
                    {due.status !== 'Paid' && due.status !== 'Exempted' && (
                      <button
                        onClick={() => {
                          setSelectedAssessmentForPayment(due);
                          setPaymentAmount(due.remainingBalance);
                        }}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition"
                      >
                        Record Payment
                      </button>
                    )}

                    {due.status !== 'Exempted' && (
                      <button
                        onClick={() => setSelectedAssessmentForExemption(due)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
                      >
                        Exempt
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Monthly Choir Dues Configuration
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3.5 text-xs">
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="enableDues"
                  checked={tempConfig.isEnabled}
                  onChange={(e) => setTempConfig({ ...tempConfig, isEnabled: e.target.checked })}
                  className="rounded text-slate-900 focus:ring-slate-900 w-4 h-4"
                />
                <label htmlFor="enableDues" className="font-bold text-slate-800 cursor-pointer">
                  Activate Monthly Dues Contributions
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Approved Monthly Dues Amount ({tempConfig.currency || '₦'})
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  required
                  value={tempConfig.amount}
                  onChange={(e) => setTempConfig({ ...tempConfig, amount: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="e.g. 1000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Commencement Month
                  </label>
                  <input
                    type="month"
                    required
                    value={tempConfig.effectiveCommencementMonth}
                    onChange={(e) => setTempConfig({ ...tempConfig, effectiveCommencementMonth: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Billing Cycle Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={tempConfig.monthlyBillingDay}
                    onChange={(e) => setTempConfig({ ...tempConfig, monthlyBillingDay: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Deadline (Days)
                  </label>
                  <input
                    type="number"
                    min="7"
                    value={tempConfig.paymentDeadlineDays}
                    onChange={(e) => setTempConfig({ ...tempConfig, paymentDeadlineDays: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tempConfig.gracePeriodDays}
                    onChange={(e) => setTempConfig({ ...tempConfig, gracePeriodDays: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempConfig.allowsPaymentArrangements}
                    onChange={(e) => setTempConfig({ ...tempConfig, allowsPaymentArrangements: e.target.checked })}
                    className="rounded text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                  />
                  <span className="text-slate-700">Allow partial payments & payment arrangements</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer block">
                  <input
                    type="checkbox"
                    checked={tempConfig.subjectTo21DayQuery}
                    onChange={(e) => setTempConfig({ ...tempConfig, subjectTo21DayQuery: e.target.checked })}
                    className="rounded text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                  />
                  <span className="text-slate-700">Subject overdue monthly dues to 21-day debt query process</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-2xs"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATE CYCLE MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Generate Monthly Dues Cycle
              </h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateCycleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Billing Month</label>
                <input
                  type="month"
                  required
                  value={genMonth}
                  onChange={(e) => setGenMonth(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Amount per Chorister ({settings.currencySymbol || '₦'})
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  step="50"
                  value={genAmount}
                  onChange={(e) => setGenAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs text-slate-900"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Will assess all active registered choristers. Duplicate entries for the same month are automatically prevented.
                </p>
              </div>

              {genStatusMsg && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-[11px] font-semibold">
                  {genStatusMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-2xs"
                >
                  Generate Assessments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {selectedAssessmentForPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Dues Payment</h3>
                <span className="text-[11px] text-slate-500">
                  {selectedAssessmentForPayment.memberName} ({selectedAssessmentForPayment.billingMonth})
                </span>
              </div>
              <button
                onClick={() => setSelectedAssessmentForPayment(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-3.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between">
                <span>Remaining Balance:</span>
                <strong className="font-mono text-red-700">
                  {settings.currencySymbol || '₦'}{selectedAssessmentForPayment.remainingBalance.toLocaleString()}
                </strong>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount ({settings.currencySymbol || '₦'})</label>
                <input
                  type="number"
                  required
                  min="100"
                  max={selectedAssessmentForPayment.remainingBalance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 bg-white"
                >
                  <option value="Cash">Cash (to Provost / Treasurer)</option>
                  <option value="Bank Transfer">Bank Transfer (Choir Account)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bank / Receipt Reference</label>
                <input
                  type="text"
                  placeholder="Optional teller or transaction ref"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAssessmentForPayment(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-2xs"
                >
                  Confirm & Credit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXEMPTION MODAL */}
      {selectedAssessmentForExemption && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Approve Dues Exemption</h3>
                <span className="text-[11px] text-slate-500">
                  {selectedAssessmentForExemption.memberName} ({selectedAssessmentForExemption.billingMonth})
                </span>
              </div>
              <button
                onClick={() => setSelectedAssessmentForExemption(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExemptionSubmit} className="space-y-3.5 text-xs">
              <p className="text-slate-600">
                Attendance accommodation does not automatically waive dues. Please record the official pastoral or financial reason for this exemption.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Reason for Exemption</label>
                <textarea
                  required
                  rows={3}
                  value={exemptionReason}
                  onChange={(e) => setExemptionReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                  placeholder="e.g. Student member financial hardship exemption approved by Choir Master"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAssessmentForExemption(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg shadow-2xs"
                >
                  Approve Exemption
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
