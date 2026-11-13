import React, { useState, useEffect } from 'react';
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
  Copy,
  Image as ImageIcon,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Save,
  Clock,
  DollarSign,
  CreditCard,
  Shield,
  Key,
  ExternalLink,
  Search,
  X,
  HeartHandshake
} from 'lucide-react';
import { 
  SystemSettings, 
  Chorister, 
  VoicePart, 
  BankDetails, 
  BankDetailsChangeProposal, 
  ExecutiveAccount,
  ExecutivePosition
} from '../types';
import { googleAppsScriptFiles } from '../data/googleAppsScriptCode';
import { initialExecutivePositions } from '../data/initialData';
import { ChoristerAvatar } from './ChoristerAvatar';
import { HelpToggle } from './HelpToggle';

interface ChurchSettingsProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => Promise<any> | void;
  members: Chorister[];
  onClearDemoData: () => void;
  onRestoreDemoData: () => void;
  onBulkAddMembers: (newMembers: Chorister[]) => void;
  onExportBackup: () => void;
  isDemoMode?: boolean;
  onUnloadDemoData?: () => void;
  onClearMainLogs?: () => void;
  onClearSessions?: () => void;
  currentExecutive?: ExecutiveAccount | null;
  bankProposal?: BankDetailsChangeProposal | null;
  onProposeBankDetails?: (details: BankDetails, reason: string) => Promise<any>;
  onApproveBankDetails?: (proposalId: string) => Promise<any>;
  onRefreshData?: () => void | Promise<any>;
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
  currentExecutive,
  bankProposal,
  onProposeBankDetails,
  onApproveBankDetails,
  onRefreshData,
}) => {
  const [formSettings, setFormSettings] = useState<SystemSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveError, setSettingsSaveError] = useState('');
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'wizard' | 'positions' | 'bank' | 'accounts' | 'data' | 'bulk' | 'script' | 'attendance-welfare'>('wizard');

  // Positions & Permissions state
  const [positionsList, setPositionsList] = useState<ExecutivePosition[]>(settings.positions || initialExecutivePositions);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState<ExecutivePosition | null>(null);

  // Synchronize form and positions when settings update from authoritative database
  useEffect(() => {
    if (settings) {
      setFormSettings(settings);
      if (Array.isArray(settings.positions) && settings.positions.length > 0) {
        setPositionsList(settings.positions);
      }
    }
  }, [settings]);

  // Confirmation dialog states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false);
  const [showClearSessionsConfirm, setShowClearSessionsConfirm] = useState(false);
  const [logsClearedMessage, setLogsClearedMessage] = useState(false);
  const [posTitle, setPosTitle] = useState('');
  const [posCode, setPosCode] = useState('');
  const [posDesc, setPosDesc] = useState('');
  const [posOfficerName, setPosOfficerName] = useState('');
  const [posMemberId, setPosMemberId] = useState('');
  const [posMemberSearch, setPosMemberSearch] = useState('');
  const [posPermissions, setPosPermissions] = useState<string[]>([]);
  const [posError, setPosError] = useState('');
  const [posSuccess, setPosSuccess] = useState('');

  // Fetch positions from server
  const fetchPositions = async () => {
    setPositionsLoading(true);
    try {
      const res = await fetch('/api/positions');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.positions)) {
        setPositionsList(data.positions);
      }
    } catch (e) {
      console.warn('Could not load positions from server:', e);
    } finally {
      setPositionsLoading(false);
    }
  };

  const fetchExecAccounts = async () => {
    const token = sessionStorage.getItem('executive_token');
    if (!token) return;
    try {
      const res = await fetch('/api/executives', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.executives)) {
        setExecAccountsList(data.executives);
      }
    } catch (e) {
      console.warn('Could not load executive accounts:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'positions') {
      fetchExecAccounts();
    }
  }, [activeTab]);

  const handleOpenAddPosition = () => {
    setEditingPos(null);
    setPosTitle('');
    setPosCode('');
    setPosDesc('');
    setPosOfficerName('');
    setPosMemberId('');
    setPosMemberSearch('');
    setPosPermissions(['attendance', 'roster']);
    setPosError('');
    setPositionModalOpen(true);
  };

  const handleOpenEditPosition = (pos: ExecutivePosition) => {
    setEditingPos(pos);
    setPosTitle(pos.title);
    setPosCode(pos.code);
    setPosDesc(pos.description);
    setPosPermissions(pos.defaultPermissions || []);
    setPosError('');
    setPosMemberSearch('');

    const linkedMember = pos.assignedMemberId
      ? members.find((m) => m.memberId === pos.assignedMemberId)
      : undefined;
    setPosMemberId(pos.assignedMemberId || '');

    let currentOfficer = linkedMember?.fullName || pos.assignedOfficer || '';
    if (!currentOfficer) {
      const c = (pos.code || '').toUpperCase();
      if (c === 'CM' || pos.positionId === 'POS-CM') currentOfficer = formSettings.choirMasterName || '';
      else if (c === 'ACM' || pos.positionId === 'POS-ACM') currentOfficer = formSettings.assistantChoirMasterName || '';
      else if (c === 'PV' || pos.positionId === 'POS-PV') currentOfficer = formSettings.provostName || '';
      else if (c === 'APV' || pos.positionId === 'POS-APV') currentOfficer = formSettings.assistantProvostName || '';
      else if (c === 'SEC' || pos.positionId === 'POS-SEC') currentOfficer = formSettings.secretaryName || '';
      else if (c === 'FINSEC' || pos.positionId === 'POS-FINSEC') currentOfficer = formSettings.financialSecretaryName || '';
      else if (c === 'TR' || pos.positionId === 'POS-TR') currentOfficer = formSettings.treasurerName || '';
      else if (c === 'LIB' || pos.positionId === 'POS-LIB') currentOfficer = formSettings.librarianName || '';
    }
    setPosOfficerName(currentOfficer);

    setPositionModalOpen(true);
  };

  const handleSavePositionModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posTitle.trim() || !posCode.trim()) {
      setPosError('Title and Code are required.');
      return;
    }
    const token = sessionStorage.getItem('executive_token');
    try {
      if (editingPos) {
        const res = await fetch(`/api/positions/${editingPos.positionId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
          },
          body: JSON.stringify({
            title: posTitle.trim(),
            description: posDesc.trim(),
            defaultPermissions: posPermissions,
            assignedMemberId: posMemberId,
            assignedOfficer: posOfficerName.trim(),
          }),
        });
        const d = await res.json();
        if (d && d.success) {
          // Synchronize church settings officer names
          const c = (posCode || editingPos.code || '').toUpperCase();
          const updated = { ...formSettings, ...(d.settings || {}) };
          if (c === 'CM' || editingPos.positionId === 'POS-CM') updated.choirMasterName = posOfficerName.trim();
          else if (c === 'ACM' || editingPos.positionId === 'POS-ACM') updated.assistantChoirMasterName = posOfficerName.trim();
          else if (c === 'PV' || editingPos.positionId === 'POS-PV') updated.provostName = posOfficerName.trim();
          else if (c === 'APV' || editingPos.positionId === 'POS-APV') updated.assistantProvostName = posOfficerName.trim();
          else if (c === 'SEC' || editingPos.positionId === 'POS-SEC') updated.secretaryName = posOfficerName.trim();
          else if (c === 'FINSEC' || editingPos.positionId === 'POS-FINSEC') updated.financialSecretaryName = posOfficerName.trim();
          else if (c === 'TR' || editingPos.positionId === 'POS-TR') updated.treasurerName = posOfficerName.trim();
          else if (c === 'LIB' || editingPos.positionId === 'POS-LIB') updated.librarianName = posOfficerName.trim();

          if (Array.isArray(d.positions)) {
            updated.positions = d.positions;
            setPositionsList(d.positions);
          }

          setFormSettings(updated);
          await onUpdateSettings(updated);

          setPositionModalOpen(false);
          setPosSuccess(posMemberId ? 'Position assigned to chorister and synchronized.' : 'Position updated (marked vacant).');
          fetchPositions();
          setTimeout(() => setPosSuccess(''), 3000);
        } else {
          setPosError(d.message || 'Failed to update position.');
        }
      } else {
        const res = await fetch('/api/positions', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token || ''}`,
          },
          body: JSON.stringify({
            title: posTitle.trim(),
            code: posCode.trim().toUpperCase(),
            description: posDesc.trim(),
            defaultPermissions: posPermissions,
            assignedOfficer: posOfficerName.trim(),
          }),
        });
        const d = await res.json();
        if (d && d.success) {
          setPositionModalOpen(false);
          setPosSuccess('New executive position created successfully.');
          await fetchPositions();
          await onRefreshData?.();
          setTimeout(() => setPosSuccess(''), 3000);
        } else {
          setPosError(d.message || 'Failed to create position.');
        }
      }
    } catch (err: any) {
      setPosError(err.message || 'Error communicating with server.');
    }
  };

  const handleArchivePosition = async (positionId: string) => {
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch(`/api/positions/${positionId}/archive`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });
      const d = await res.json();
      if (d && d.success) {
        setPosSuccess('Position archived.');
        await fetchPositions();
        await onRefreshData?.();
        setTimeout(() => setPosSuccess(''), 3000);
      } else {
        alert(d.message || 'Could not archive position.');
      }
    } catch {
      alert('Network error while archiving position.');
    }
  };

  const handleRestorePosition = async (positionId: string) => {
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch(`/api/positions/${positionId}/restore`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });
      const d = await res.json();
      if (d && d.success) {
        setPosSuccess('Position restored to active status.');
        await fetchPositions();
        await onRefreshData?.();
        setTimeout(() => setPosSuccess(''), 3000);
      } else {
        alert(d.message || 'Could not restore position.');
      }
    } catch {
      alert('Network error while restoring position.');
    }
  };

  const handleDeletePosition = async (positionId: string) => {
    if (!confirm('Are you sure you want to permanently delete this position?')) return;
    const token = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch(`/api/positions/${positionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });
      const d = await res.json();
      if (d && d.success) {
        setPosSuccess('Position deleted.');
        await fetchPositions();
        await onRefreshData?.();
        setTimeout(() => setPosSuccess(''), 3000);
      } else {
        alert(d.message || 'Could not delete position.');
      }
    } catch {
      alert('Network error while deleting position.');
    }
  };

  // Bank Proposal Form states
  const currentBank = settings.officialBankDetails || settings.bankDetails;
  const [bankName, setBankName] = useState(currentBank?.bankName || '');
  const [accountName, setAccountName] = useState(currentBank?.accountName || '');
  const [accountNumber, setAccountNumber] = useState(currentBank?.accountNumber || '');
  const [narrationInstructions, setNarrationInstructions] = useState(
    currentBank?.narrationInstructions || currentBank?.paymentInstructions || 'Include Member ID and Name in transfer narration (e.g. CHO-S01 Chioma Dues)'
  );
  const [proposalReason, setProposalReason] = useState('');
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [bankSuccessMsg, setBankSuccessMsg] = useState('');
  const [bankErrorMsg, setBankErrorMsg] = useState('');
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  // Accounts Management state
  const [accountSearch, setAccountSearch] = useState('');
  const [voiceFilter, setVoiceFilter] = useState('all');
  const [generatedTokens, setGeneratedTokens] = useState<Record<string, string>>({});
  const [generatedTokenExpiries, setGeneratedTokenExpiries] = useState<Record<string, string>>({});
  const [tokenLoading, setTokenLoading] = useState<Record<string, boolean>>({});

  // Executive Account <-> Membership Linkage state
  const [execAccountsList, setExecAccountsList] = useState<any[]>([]);
  const [linkingExec, setLinkingExec] = useState<any | null>(null);
  const [linkMode, setLinkMode] = useState<'existing' | 'register'>('existing');
  const [linkMemberId, setLinkMemberId] = useState('');
  const [linkMemberSearch, setLinkMemberSearch] = useState('');
  const [linkRegName, setLinkRegName] = useState('');
  const [linkRegVoice, setLinkRegVoice] = useState<VoicePart>('Tenor');
  const [linkRegPhone, setLinkRegPhone] = useState('');
  const [linkRegEmail, setLinkRegEmail] = useState('');
  const [linkDuplicates, setLinkDuplicates] = useState<any[]>([]);
  const [linkError, setLinkError] = useState('');
  const [linkSubmitting, setLinkSubmitting] = useState(false);

  // Bulk chorister import state
  const [bulkText, setBulkText] = useState('');
  const [bulkStatus, setBulkStatus] = useState('');

  // Apps Script code copy state
  const [copiedCode, setCopiedCode] = useState(false);

  // Logo file upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'parishLogoUrl' | 'choirEmblemUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image file is too large. Please select an image under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormSettings(prev => ({ ...prev, [field]: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSaveError('');
    try {
      const res: any = await onUpdateSettings(formSettings);
      if (res && res.success === false) {
        setSettingsSaveError(res.message || 'Failed to save settings to church database.');
      } else {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
      }
    } catch (err: any) {
      setSettingsSaveError(err.message || 'Error communicating with church database.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleProposeBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountName || !accountNumber || !proposalReason) {
      setBankErrorMsg('Please fill in all bank fields and supply an official justification.');
      return;
    }

    setBankSubmitting(true);
    setBankErrorMsg('');
    try {
      if (onProposeBankDetails) {
        const res = await onProposeBankDetails(
          {
            bankName: bankName.trim(),
            accountName: accountName.trim(),
            accountNumber: accountNumber.trim(),
            narrationInstructions: narrationInstructions.trim(),
            paymentInstructions: narrationInstructions.trim(),
            verificationStatus: 'Active',
            lastUpdated: new Date().toISOString(),
          },
          proposalReason.trim()
        );
        if (res && res.success === false) {
          setBankErrorMsg(res.message || 'Failed to log proposal.');
        } else {
          setBankSuccessMsg('Bank details proposal submitted for second executive confirmation.');
          setProposalReason('');
        }
      } else {
        // Fallback direct proposal call to server
        const execToken = sessionStorage.getItem('executive_token');
        const res = await fetch('/api/bank-details/propose', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${execToken || ''}`,
          },
          body: JSON.stringify({
            bankName: bankName.trim(),
            accountName: accountName.trim(),
            accountNumber: accountNumber.trim(),
            paymentInstructions: narrationInstructions.trim(),
            reason: proposalReason.trim(),
          }),
        });
        const result = await res.json();
        if (result.success) {
          setBankSuccessMsg('Proposal logged. Waiting for second officer approval.');
          setProposalReason('');
          await onRefreshData?.();
        } else {
          setBankErrorMsg(result.message || 'Failed to log proposal.');
        }
      }
    } catch (err: any) {
      setBankErrorMsg(err.message || 'Error communicating with server.');
    } finally {
      setBankSubmitting(false);
      setTimeout(() => setBankSuccessMsg(''), 5000);
    }
  };

  const handleApproveBank = async (proposalId: string) => {
    setBankSubmitting(true);
    setBankErrorMsg('');
    const execToken = sessionStorage.getItem('executive_token');
    try {
      if (onApproveBankDetails) {
        const res = await onApproveBankDetails(proposalId);
        if (res && res.success === false) {
          setBankErrorMsg(res.message || 'Approval rejected.');
        } else {
          setBankSuccessMsg('Official choir bank details approved and activated!');
        }
      } else {
        const res = await fetch('/api/bank-details/approve', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${execToken || ''}`,
          },
          body: JSON.stringify({
            isApproved: true,
          }),
        });
        const result = await res.json();
        if (result.success) {
          setBankSuccessMsg('Bank details updated across portal!');
          await onRefreshData?.();
        } else {
          setBankErrorMsg(result.message || 'Approval rejected.');
        }
      }
    } catch (err: any) {
      setBankErrorMsg(err.message || 'Failed to approve.');
    } finally {
      setBankSubmitting(false);
      setTimeout(() => setBankSuccessMsg(''), 5000);
    }
  };

  const generateResetTokenForChorister = async (memberId: string) => {
    setTokenLoading(prev => ({ ...prev, [memberId]: true }));
    const execToken = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/auth/member/generate-reset-token', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${execToken || ''}`,
        },
        body: JSON.stringify({ memberId, reason: 'Chorister requested password reset' }),
      });
      const result = await res.json();
      if (result.success && result.resetToken) {
        setGeneratedTokens(prev => ({ ...prev, [memberId]: result.resetToken }));
      } else {
        alert(result.message || 'Please sign in with an authorised executive account to generate password-reset tokens.');
      }
    } catch (err) {
      alert('Network error while generating reset token.');
    } finally {
      setTokenLoading(prev => ({ ...prev, [memberId]: false }));
    }
  };

  const generateActivationCodeForChorister = async (memberId: string) => {
    setTokenLoading(prev => ({ ...prev, [memberId]: true }));
    const execToken = sessionStorage.getItem('executive_token');
    try {
      const res = await fetch('/api/auth/member/generate-activation-code', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${execToken || ''}`,
        },
        body: JSON.stringify({ memberId }),
      });
      const result = await res.json();
      if (result.success && result.activationCode) {
        setGeneratedTokens(prev => ({ ...prev, [memberId]: result.activationCode }));
        if (result.expiresAt) {
          setGeneratedTokenExpiries(prev => ({ ...prev, [memberId]: result.expiresAt }));
        }
      } else {
        alert(result.message || 'Please sign in with an authorised executive account to generate activation codes.');
      }
    } catch (err) {
      alert('Network error while generating activation code.');
    } finally {
      setTokenLoading(prev => ({ ...prev, [memberId]: false }));
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBankField(fieldId);
    setTimeout(() => setCopiedBankField(null), 2500);
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
    const added: Chorister[] = [];

    const existingCount = members.length;
    lines.forEach((line, idx) => {
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

  const filteredMembers = members.filter(m => {
    const matchesSearch = !accountSearch || 
      m.fullName.toLowerCase().includes(accountSearch.toLowerCase()) || 
      m.memberId.toLowerCase().includes(accountSearch.toLowerCase());
    const matchesVoice = voiceFilter === 'all' || m.voicePart === voiceFilter;
    return matchesSearch && matchesVoice;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Parish Administration & Setup Console
            </h2>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs flex-wrap">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeTab === 'wizard' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Setup Wizard
          </button>
          <button
            onClick={() => {
              setActiveTab('positions');
              fetchPositions();
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1 ${
              activeTab === 'positions' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-600" />
            Positions & Permissions
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1 ${
              activeTab === 'bank' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
            Bank Accounts (2-Officer)
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1 ${
              activeTab === 'accounts' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            Member Logins & Tokens
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeTab === 'data' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Data & Backup
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeTab === 'bulk' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bulk Roster Import
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`px-3 py-1.5 rounded-md font-semibold transition ${
              activeTab === 'script' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Apps Script
          </button>
          <button
            onClick={() => setActiveTab('attendance-welfare')}
            className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1 cursor-pointer ${
              activeTab === 'attendance-welfare' ? 'bg-white text-slate-950 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
            Attendance & Welfare
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Parish settings and executive officer roster saved successfully to authoritative server database & Firestore!</span>
        </div>
      )}

      {settingsSaveError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-lg text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{settingsSaveError}</span>
        </div>
      )}

      {/* ========================================================
          TAB 1: GUIDED SETUP WIZARD
          ======================================================== */}
      {activeTab === 'wizard' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          {/* Step Indicator Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Parish Setup Wizard</span>
              <span className="text-slate-500 font-mono">Step {wizardStep} of 5</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 mt-2.5">
              {[
                { s: 1, label: 'Parish' },
                { s: 2, label: 'Choir Identity' },
                { s: 3, label: 'Branding & Fines' },
                { s: 4, label: 'Officers' },
                { s: 5, label: 'Review' },
              ].map((step) => (
                <button
                  key={step.s}
                  onClick={() => setWizardStep(step.s)}
                  className={`text-center py-1.5 px-2 rounded font-semibold text-[11px] transition ${
                    wizardStep === step.s
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : wizardStep > step.s
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {step.s}. {step.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveSettings} className="p-6">
            {/* STEP 1: PARISH IDENTITY */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Step 1: Parish Identity</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Full Parish Name</label>
                    <input
                      type="text"
                      required
                      value={formSettings.parishName}
                      onChange={(e) => setFormSettings({ ...formSettings, parishName: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                      placeholder="e.g. Our Mother of Perpetual Help Catholic Church"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Diocese / Arch-diocese</label>
                    <input
                      type="text"
                      required
                      value={formSettings.diocese}
                      onChange={(e) => setFormSettings({ ...formSettings, diocese: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                      placeholder="e.g. Catholic Diocese of Ilorin"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Parish Abbreviation</label>
                    <input
                      type="text"
                      value={formSettings.parishAbbreviation || ''}
                      onChange={(e) => setFormSettings({ ...formSettings, parishAbbreviation: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-mono"
                      placeholder="e.g. OMPH"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Parish Address / Location</label>
                    <input
                      type="text"
                      value={formSettings.parishAddress || ''}
                      onChange={(e) => setFormSettings({ ...formSettings, parishAddress: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
                      placeholder="e.g. Fate Road / GRA, Ilorin, Kwara State, Nigeria"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Parish Contact Telephone</label>
                    <input
                      type="text"
                      value={formSettings.parishContactPhone || ''}
                      onChange={(e) => setFormSettings({ ...formSettings, parishContactPhone: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
                      placeholder="e.g. +234 803 000 0000"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Official Contact Email</label>
                    <input
                      type="email"
                      value={formSettings.parishContactEmail || ''}
                      onChange={(e) => setFormSettings({ ...formSettings, parishContactEmail: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
                      placeholder="e.g. omphchoir.ilorin@catholicparish.ng"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: CHOIR PROFILE & COMMUNICATIONS */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Step 2: Choir Identity</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Choir / Choral Ministry Name</label>
                    <input
                      type="text"
                      required
                      value={formSettings.choirName}
                      onChange={(e) => setFormSettings({ ...formSettings, choirName: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-medium"
                      placeholder="e.g. OMPH CHOIR (St. Cecilia Choral Ministry)"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Patron Saint</label>
                    <input
                      type="text"
                      value={formSettings.patronSaint || ''}
                      onChange={(e) => setFormSettings({ ...formSettings, patronSaint: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
                      placeholder="e.g. St. Cecilia (Virgin and Martyr)"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Patronal Feast Day</label>
                    <input
                      type="text"
                      value={formSettings.feastDay || ''}
                      onChange={(e) => setFormSettings({ ...formSettings, feastDay: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900"
                      placeholder="e.g. November 22"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Choir Motto / Choral Theme</label>
                    <input
                      type="text"
                      value={formSettings.choirMotto || ''}
                      onChange={(e) => setFormSettings({ ...formSettings, choirMotto: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 italic"
                      placeholder="e.g. Cantare Amantis Est — To Sing is the Mark of Love (St. Augustine)"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: VISUAL BRANDING & FINANCIALS */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Step 3: Visual Branding & Disciplinary Fines</h3>
                  <p className="text-xs text-slate-500">Parish seal, choir emblem, currency symbol, and statutory punctuality fines.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                  {/* Parish Logo */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block font-semibold text-slate-800">Parish Seal / Logo</label>
                    <div className="flex items-center gap-3">
                      <img
                        src={formSettings.parishLogoUrl || '/assets/aistudio/omph_37e5c155.jpg'}
                        alt="Parish Logo"
                        className="w-14 h-14 rounded-full object-cover border border-amber-300 shadow-xs shrink-0"
                      />
                      <div className="space-y-1 flex-1">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs">
                          <Upload className="w-3.5 h-3.5 text-slate-500" /> Upload Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLogoUpload(e, 'parishLogoUrl')}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[10px] text-slate-400">PNG or JPG, up to 2MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Choir Emblem */}
                  <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block font-semibold text-slate-800">Choir Emblem / St. Cecilia Icon</label>
                    <div className="flex items-center gap-3">
                      <img
                        src={formSettings.choirEmblemUrl || '/assets/aistudio/omph_37e5c155.jpg'}
                        alt="Choir Emblem"
                        className="w-14 h-14 rounded-full object-cover border border-amber-300 shadow-xs shrink-0"
                      />
                      <div className="space-y-1 flex-1">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs">
                          <Upload className="w-3.5 h-3.5 text-slate-500" /> Upload Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleLogoUpload(e, 'choirEmblemUrl')}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[10px] text-slate-400">PNG or JPG, up to 2MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Currency and Fines */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Currency Symbol</label>
                    <input
                      type="text"
                      required
                      value={formSettings.currencySymbol}
                      onChange={(e) => setFormSettings({ ...formSettings, currencySymbol: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Default Late Arrival Fine</label>
                    <input
                      type="number"
                      required
                      value={formSettings.defaultLateFine}
                      onChange={(e) => setFormSettings({ ...formSettings, defaultLateFine: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Default Unexcused Absence Fine</label>
                    <input
                      type="number"
                      required
                      value={formSettings.defaultAbsenceFine}
                      onChange={(e) => setFormSettings({ ...formSettings, defaultAbsenceFine: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Grace Period (Minutes)</label>
                    <input
                      type="number"
                      required
                      value={formSettings.defaultGracePeriodMinutes}
                      onChange={(e) => setFormSettings({ ...formSettings, defaultGracePeriodMinutes: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: EXECUTIVE OFFICERS (READ-ONLY SUMMARY FROM MEMBERSHIP REGISTER) */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Step 4: Parish Executive Officers</h3>
                    <p className="text-xs text-slate-500">
                      Executive officers are assigned directly from the Chorister Membership Register. Manual typing is disabled.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('positions')}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition shadow-xs"
                  >
                    Manage Executive Roster
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {positionsList.map((pos) => {
                    const linkedMember = pos.assignedMemberId
                      ? members.find((m) => m.memberId === pos.assignedMemberId)
                      : undefined;
                    const resolvedName = linkedMember?.fullName || '';

                    return (
                      <div
                        key={pos.positionId}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {linkedMember ? (
                            <ChoristerAvatar
                              fullName={linkedMember.fullName}
                              voicePart={linkedMember.voicePart}
                              photoUrl={linkedMember.profilePhotoUrl}
                              size="sm"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold shrink-0">
                              —
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-500">{pos.title}</div>
                            {resolvedName ? (
                              <div className="font-bold text-slate-900 mt-0.5 truncate">
                                {resolvedName}{' '}
                                <span className="font-mono text-[10px] font-normal text-slate-500">
                                  ({linkedMember?.memberId})
                                </span>
                              </div>
                            ) : (
                              <div className="text-slate-400 italic mt-0.5 text-[11px]">
                                No officer assigned (Vacant)
                              </div>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            resolvedName
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {resolvedName ? 'Assigned' : 'Vacant'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 5: REVIEW & SAVE */}
            {wizardStep === 5 && (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900">Step 5: Review & Save Configuration</h3>
                  <p className="text-xs text-slate-500">Confirm all information before committing to the church database.</p>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/90 rounded-xl p-4 text-xs space-y-3">
                  <div className="flex items-center gap-3 border-b border-amber-200/60 pb-3">
                    <img
                      src={formSettings.parishLogoUrl || '/assets/aistudio/omph_37e5c155.jpg'}
                      alt="Parish Seal"
                      className="w-12 h-12 rounded-full object-cover border border-amber-300"
                    />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{formSettings.parishName}</h4>
                      <p className="text-slate-600">{formSettings.choirName} · {formSettings.diocese}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div><strong>Patron Saint:</strong> {formSettings.patronSaint || 'St. Cecilia'}</div>
                    <div><strong>Feast Day:</strong> {formSettings.feastDay || 'November 22'}</div>
                    <div><strong>Choir Master:</strong> {formSettings.choirMasterName}</div>
                    <div><strong>Provost:</strong> {formSettings.provostName}</div>
                    <div><strong>Assistant Provost:</strong> {formSettings.assistantProvostName}</div>
                    <div><strong>Secretary:</strong> {formSettings.secretaryName}</div>
                    <div><strong>Treasurer:</strong> {formSettings.treasurerName}</div>
                    <div><strong>Currency:</strong> {formSettings.currencySymbol}</div>
                    <div><strong>Late Fine:</strong> {formSettings.currencySymbol}{formSettings.defaultLateFine}</div>
                    <div><strong>Absence Fine:</strong> {formSettings.currencySymbol}{formSettings.defaultAbsenceFine}</div>
                  </div>

                  {formSettings.choirMotto && (
                    <div className="pt-2 border-t border-amber-200/60 text-slate-600 italic">
                      “{formSettings.choirMotto}”
                    </div>
                  )}
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Saving commits changes to <code className="font-mono font-bold">church_storage.json</code> on the parish server, protecting all modifications across devices.
                  </span>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Save current configuration to database immediately"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSavingSettings ? 'Saving to Database...' : 'Save Changes'}
                </button>

                {wizardStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSavingSettings}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSavingSettings ? 'Saving...' : 'Save Parish Settings'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          TAB: EXECUTIVE POSITIONS & PERMISSIONS (RBAC)
          ======================================================== */}
      {activeTab === 'positions' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Executive Positions & Role-Based Permissions (RBAC)
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchPositions}
                disabled={positionsLoading}
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${positionsLoading ? 'animate-spin text-amber-600' : 'text-slate-500'}`} />
                Refresh
              </button>

              <button
                type="button"
                onClick={handleOpenAddPosition}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Add Position
              </button>
            </div>
          </div>

          {posSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{posSuccess}</span>
            </div>
          )}

          {posError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{posError}</span>
            </div>
          )}

          {/* Unlinked Executive Accounts Banner / Panel */}
          {(() => {
            const unlinkedExecs = execAccountsList.filter(
              (ex) => !ex.memberId || !members.some((m) => m.memberId === ex.memberId)
            );
            if (unlinkedExecs.length === 0) return null;
            return (
              <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">
                      Executive Accounts Not Linked to Chorister Membership Register ({unlinkedExecs.length})
                    </h4>
                    <p className="text-[11px] text-amber-900 mt-0.5">
                      Every executive officer must have a single chorister membership record. Link each executive account to an existing chorister or register them as a chorister below.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {unlinkedExecs.map((ex) => (
                    <div
                      key={ex.executiveId || ex.username}
                      className="p-3 bg-white border border-amber-200 rounded-lg flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{ex.fullName || ex.position}</div>
                        <div className="text-[11px] text-slate-500">
                          {ex.position} • <span className="font-mono">{ex.username}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkingExec(ex);
                          setLinkMode(members.length > 0 ? 'existing' : 'register');
                          setLinkMemberId('');
                          setLinkMemberSearch('');
                          setLinkRegName(ex.fullName && ex.fullName !== ex.position ? ex.fullName : '');
                          setLinkRegVoice('Tenor');
                          setLinkRegPhone('');
                          setLinkRegEmail('');
                          setLinkDuplicates([]);
                          setLinkError('');
                        }}
                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-[11px] shrink-0 transition"
                      >
                        Register / Link Chorister
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Positions Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Position Title & Scope</th>
                  <th className="p-3">Assigned Officer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Permissions Granted</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {positionsList.map((pos) => {
                  const linkedMember = pos.assignedMemberId
                    ? members.find((m) => m.memberId === pos.assignedMemberId)
                    : undefined;
                  let assignedOfficerName = linkedMember?.fullName || pos.assignedOfficer || '';
                  if (!assignedOfficerName) {
                    if (pos.code === 'CM' || pos.positionId === 'POS-CM') assignedOfficerName = formSettings.choirMasterName || '';
                    else if (pos.code === 'ACM' || pos.positionId === 'POS-ACM') assignedOfficerName = formSettings.assistantChoirMasterName || '';
                    else if (pos.code === 'PV' || pos.positionId === 'POS-PV') assignedOfficerName = formSettings.provostName || '';
                    else if (pos.code === 'APV' || pos.positionId === 'POS-APV') assignedOfficerName = formSettings.assistantProvostName || '';
                    else if (pos.code === 'SEC' || pos.positionId === 'POS-SEC') assignedOfficerName = formSettings.secretaryName || '';
                    else if (pos.code === 'FINSEC' || pos.positionId === 'POS-FINSEC') assignedOfficerName = formSettings.financialSecretaryName || '';
                    else if (pos.code === 'TR' || pos.positionId === 'POS-TR') assignedOfficerName = formSettings.treasurerName || '';
                    else if (pos.code === 'LIB' || pos.positionId === 'POS-LIB') assignedOfficerName = formSettings.librarianName || '';
                  }

                  const isVacant = !assignedOfficerName || assignedOfficerName.toLowerCase().includes('vacant');
                  const displayOfficer = isVacant ? 'No officer currently assigned' : assignedOfficerName;

                  return (
                    <tr key={pos.positionId} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono font-bold text-slate-900">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {pos.code}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {pos.title}
                          {pos.isSystem && (
                            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded font-normal">
                              Core
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs mt-0.5">
                          {pos.description}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {linkedMember ? (
                            <ChoristerAvatar
                              fullName={linkedMember.fullName}
                              voicePart={linkedMember.voicePart}
                              photoUrl={linkedMember.profilePhotoUrl}
                              size="sm"
                            />
                          ) : !isVacant ? (
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center text-[10px] font-bold shrink-0">
                              {assignedOfficerName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                          ) : null}
                          <div className="min-w-0">
                            <div className={`font-medium ${isVacant ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                              {displayOfficer}
                            </div>
                            {linkedMember && (
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {linkedMember.memberId} • {linkedMember.voicePart}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pos.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {pos.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {(pos.defaultPermissions || []).slice(0, 4).map((perm) => (
                            <span
                              key={perm}
                              className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-1.5 py-0.5 rounded font-mono"
                            >
                              {perm}
                            </span>
                          ))}
                          {(pos.defaultPermissions || []).length > 4 && (
                            <span className="text-[10px] text-slate-400 font-semibold self-center">
                              +{pos.defaultPermissions.length - 4} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPosition(pos)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] transition shadow-2xs"
                        >
                          Edit
                        </button>
                        {pos.status === 'Active' ? (
                          !pos.isSystem && (
                            <button
                              type="button"
                              onClick={() => handleArchivePosition(pos.positionId)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-semibold rounded text-[11px] transition"
                            >
                              Archive
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRestorePosition(pos.positionId)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold rounded text-[11px] transition"
                          >
                            Restore
                          </button>
                        )}
                        {!pos.isSystem && isVacant && (
                          <button
                            type="button"
                            onClick={() => handleDeletePosition(pos.positionId)}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold rounded text-[11px] transition"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EXECUTIVE POSITION */}
      {positionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {editingPos ? `Edit Position: ${editingPos.title}` : 'Create New Executive Position'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPositionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {posError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-900 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{posError}</span>
              </div>
            )}

            <form onSubmit={handleSavePositionModal} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Position Title *</label>
                  <input
                    type="text"
                    required
                    value={posTitle}
                    onChange={(e) => setPosTitle(e.target.value)}
                    placeholder="e.g. Welfare Officer / Organist"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    disabled={editingPos?.isSystem}
                    value={posCode}
                    onChange={(e) => setPosCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WEL"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700">
                    Assigned Officer (from Chorister Membership Register)
                  </label>
                  {(posMemberId || posOfficerName) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPosMemberId('');
                        setPosOfficerName('');
                      }}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-800 underline"
                    >
                      Mark Vacant / Remove Officer
                    </button>
                  )}
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className={`font-semibold ${posOfficerName ? 'text-slate-900' : 'text-slate-400 italic'}`}>
                      {posOfficerName || 'No officer currently assigned (Vacant)'}
                    </div>
                    {posMemberId && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        Linked Chorister ID: {posMemberId}
                      </div>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={posMemberSearch}
                  onChange={(e) => setPosMemberSearch(e.target.value)}
                  placeholder="Search registered choristers by name, ID, or voice part..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                  {members.length === 0 ? (
                    <div className="p-3 text-center text-slate-500 text-[11px]">
                      No registered choristers available yet. Register members in the Membership Register first.
                    </div>
                  ) : (
                    members
                      .filter((m) => {
                        const q = posMemberSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          m.fullName.toLowerCase().includes(q) ||
                          m.memberId.toLowerCase().includes(q) ||
                          (m.voicePart || '').toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 25)
                      .map((m) => {
                        const isSelected = posMemberId === m.memberId;
                        return (
                          <button
                            key={m.memberId}
                            type="button"
                            onClick={() => {
                              setPosMemberId(m.memberId);
                              setPosOfficerName(m.fullName);
                            }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition ${
                              isSelected ? 'bg-amber-50 border-l-2 border-amber-500' : ''
                            }`}
                          >
                            <div>
                              <span className="font-semibold text-slate-900">{m.fullName}</span>
                              <span className="ml-2 text-[10px] text-slate-500 font-mono">{m.memberId}</span>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                              {m.voicePart}
                            </span>
                          </button>
                        );
                      })
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  Selecting a chorister links this office directly to the Membership Register as the single source of truth.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Role Description</label>
                <textarea
                  rows={2}
                  value={posDesc}
                  onChange={(e) => setPosDesc(e.target.value)}
                  placeholder="Outline constitutional responsibilities and authority within the choral ministry..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Functional Permissions & Duty Scopes
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50/50">
                  {[
                    { id: 'attendance', label: 'Attendance & Gatekeeping' },
                    { id: 'punctuality', label: 'Punctuality Classification' },
                    { id: 'fines', label: 'Disciplinary Fine Assessment' },
                    { id: 'discipline', label: 'Formal Queries & Sanctions' },
                    { id: 'timetable', label: 'Schedule & Call Times' },
                    { id: 'absences', label: 'Absence Excuses Review' },
                    { id: 'roster', label: 'Member Roster Custody' },
                    { id: 'announcements', label: 'Parish Notices & Directives' },
                    { id: 'monthly_dues', label: 'Monthly Dues Ledger' },
                    { id: 'payments', label: 'Payment Collection & Receipts' },
                    { id: 'bank_details', label: 'Bank Account Governance' },
                    { id: 'fund_movements', label: 'Treasury & Fund Flows' },
                    { id: 'music_library', label: 'Choral Scores & Scripts' },
                    { id: 'scores_upload', label: 'Sheet Music Uploads' },
                    { id: 'member_activation', label: 'Member Security Tokens' },
                    { id: 'security_settings', label: 'Parish Console Governance' },
                  ].map((perm) => {
                    const isChecked = posPermissions.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className={`flex items-center gap-2 p-1.5 rounded cursor-pointer border text-[11px] transition ${
                          isChecked ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPosPermissions((prev) => [...prev, perm.id]);
                            } else {
                              setPosPermissions((prev) => prev.filter((p) => p !== perm.id));
                            }
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPositionModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow-xs transition"
                >
                  {editingPos ? 'Save Changes' : 'Create Position'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register as Chorister / Link Executive Account to Membership Register */}
      {linkingExec && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Link Executive to Chorister Membership Register
                </h3>
                <p className="text-[11px] text-slate-500">
                  {linkingExec.position} ({linkingExec.username})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLinkingExec(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setLinkMode('existing'); setLinkError(''); setLinkDuplicates([]); }}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold border transition ${
                  linkMode === 'existing'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Select Existing Chorister
              </button>
              <button
                type="button"
                onClick={() => { setLinkMode('register'); setLinkError(''); setLinkDuplicates([]); }}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold border transition ${
                  linkMode === 'register'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Register as New Chorister
              </button>
            </div>

            {linkError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-900 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{linkError}</span>
              </div>
            )}

            {linkDuplicates.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-2 text-xs">
                <div className="font-bold text-amber-950">Possible Existing Chorister Match Found:</div>
                {linkDuplicates.map((dup) => (
                  <div key={dup.memberId} className="flex items-center justify-between bg-white p-2 rounded border border-amber-200">
                    <div>
                      <span className="font-semibold text-slate-900">{dup.fullName}</span>{' '}
                      <span className="font-mono text-[10px] text-slate-500">({dup.memberId})</span>
                      <div className="text-[10px] text-slate-500">{dup.voicePart} • {dup.phoneNumber}</div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setLinkSubmitting(true);
                        const token = sessionStorage.getItem('executive_token');
                        const res = await fetch(`/api/executives/${linkingExec.executiveId || linkingExec.username}/link-member`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
                          body: JSON.stringify({ memberId: dup.memberId }),
                        });
                        const d = await res.json();
                        setLinkSubmitting(false);
                        if (d.success) {
                          setLinkingExec(null);
                          setPosSuccess(`Linked ${linkingExec.position} to ${dup.fullName} (${dup.memberId}).`);
                          await fetchExecAccounts();
                          await fetchPositions();
                          if (d.settings) await onUpdateSettings({ ...formSettings, ...d.settings, positions: d.positions });
                          await onRefreshData?.();
                        } else {
                          setLinkError(d.message || 'Failed to link chorister.');
                        }
                      }}
                      className="px-2.5 py-1 bg-amber-700 text-white rounded font-semibold text-[11px]"
                    >
                      Use This Record
                    </button>
                  </div>
                ))}
              </div>
            )}

            {linkMode === 'existing' ? (
              <div className="space-y-2 text-xs">
                <input
                  type="text"
                  value={linkMemberSearch}
                  onChange={(e) => setLinkMemberSearch(e.target.value)}
                  placeholder="Search choristers by name, Member ID, or voice part..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {members.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      No choristers registered yet. Switch to "Register as New Chorister".
                    </div>
                  ) : (
                    members
                      .filter((m) => {
                        const q = linkMemberSearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          m.fullName.toLowerCase().includes(q) ||
                          m.memberId.toLowerCase().includes(q) ||
                          (m.voicePart || '').toLowerCase().includes(q)
                        );
                      })
                      .map((m) => (
                        <button
                          key={m.memberId}
                          type="button"
                          onClick={() => setLinkMemberId(m.memberId)}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 ${
                            linkMemberId === m.memberId ? 'bg-amber-50 border-l-2 border-amber-500' : ''
                          }`}
                        >
                          <div>
                            <span className="font-semibold text-slate-900">{m.fullName}</span>
                            <span className="ml-2 text-[10px] font-mono text-slate-500">{m.memberId}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {m.voicePart}
                          </span>
                        </button>
                      ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={linkRegName}
                    onChange={(e) => setLinkRegName(e.target.value)}
                    placeholder="e.g. Anthony K. Nwosu"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Voice Section *</label>
                    <select
                      value={linkRegVoice}
                      onChange={(e) => setLinkRegVoice(e.target.value as VoicePart)}
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white"
                    >
                      <option value="Soprano">Soprano</option>
                      <option value="Alto">Alto</option>
                      <option value="Tenor">Tenor</option>
                      <option value="Bass">Bass</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={linkRegPhone}
                      onChange={(e) => setLinkRegPhone(e.target.value)}
                      placeholder="+234 803 000 0000"
                      className="w-full border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={linkRegEmail}
                    onChange={(e) => setLinkRegEmail(e.target.value)}
                    placeholder="chorister@example.com"
                    className="w-full border border-slate-300 rounded-lg p-2"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLinkingExec(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={linkSubmitting || (linkMode === 'existing' && !linkMemberId) || (linkMode === 'register' && !linkRegName.trim())}
                onClick={async () => {
                  setLinkSubmitting(true);
                  setLinkError('');
                  setLinkDuplicates([]);
                  const token = sessionStorage.getItem('executive_token');
                  try {
                    const payload =
                      linkMode === 'existing'
                        ? { memberId: linkMemberId }
                        : {
                            registerNew: true,
                            fullName: linkRegName.trim(),
                            voicePart: linkRegVoice,
                            phoneNumber: linkRegPhone.trim(),
                            email: linkRegEmail.trim(),
                          };
                    const res = await fetch(
                      `/api/executives/${linkingExec.executiveId || linkingExec.username}/link-member`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token || ''}`,
                        },
                        body: JSON.stringify(payload),
                      }
                    );
                    const d = await res.json();
                    if (res.status === 409 && Array.isArray(d.duplicateCandidates)) {
                      setLinkDuplicates(d.duplicateCandidates);
                      setLinkError(d.message);
                    } else if (d.success) {
                      setLinkingExec(null);
                      setPosSuccess(
                        `Linked ${linkingExec.position} to ${d.member?.fullName} (${d.member?.memberId}).`
                      );
                      await fetchExecAccounts();
                      await fetchPositions();
                      if (d.settings) {
                        await onUpdateSettings({ ...formSettings, ...d.settings, positions: d.positions });
                      }
                      await onRefreshData?.();
                      setTimeout(() => setPosSuccess(''), 4000);
                    } else {
                      setLinkError(d.message || 'Failed to link executive account.');
                    }
                  } catch (err: any) {
                    setLinkError(err.message || 'Network error.');
                  } finally {
                    setLinkSubmitting(false);
                  }
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
              >
                {linkSubmitting ? 'Linking...' : linkMode === 'existing' ? 'Link Selected Chorister' : 'Register & Link Chorister'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: OFFICIAL CHOIR BANK DETAILS (DUAL-OFFICER WORKFLOW)
          ======================================================== */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          {/* Current Active Bank Details Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Current Authoritative Choir Bank Account</h3>
                </div>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
                Active & Verified
              </span>
            </div>

            {(() => {
              const activeBank = formSettings.officialBankDetails || formSettings.bankDetails;
              return activeBank && activeBank.bankName && activeBank.accountNumber ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Bank Name</span>
                  <span className="text-sm font-bold text-slate-900">{activeBank.bankName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Account Name</span>
                  <span className="text-sm font-bold text-slate-900">{activeBank.accountName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Account Number</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-slate-900">{activeBank.accountNumber}</span>
                    <button
                      onClick={() => copyToClipboard(activeBank.accountNumber, 'accNo')}
                      className="text-blue-600 hover:text-blue-800 text-[11px] font-semibold"
                    >
                      {copiedBankField === 'accNo' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div className="md:col-span-3 pt-2 border-t border-slate-200 text-slate-600">
                  <span className="font-semibold text-slate-800">Transfer Narration Format:</span> {activeBank.narrationInstructions || activeBank.paymentInstructions}
                </div>
              </div>
              ) : (
              <div className="p-4 bg-amber-50 text-amber-900 text-xs rounded-lg border border-amber-200">
                ⚠️ No official bank account currently configured. Submit a proposal below to establish the choir bank details.
              </div>
              );
            })()}
          </div>

          {/* Pending Proposal Box (if any) */}
          {bankProposal && (bankProposal.status === 'Pending Approval' || bankProposal.status === 'Pending Second Approval') && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <h4 className="text-sm font-bold text-amber-950">Pending Bank Account Modification Proposal</h4>
                </div>
                <span className="text-xs bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">
                  Dual-Control Required
                </span>
              </div>

              <div className="bg-white p-4 rounded-lg border border-amber-200 text-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Proposed Bank</span>
                  <span className="font-bold text-slate-900">{bankProposal.proposedDetails?.bankName || bankProposal.bankName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Proposed Account Name</span>
                  <span className="font-bold text-slate-900">{bankProposal.proposedDetails?.accountName || bankProposal.accountName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Proposed Account Number</span>
                  <span className="font-bold text-slate-900 font-mono">{bankProposal.proposedDetails?.accountNumber || bankProposal.accountNumber}</span>
                </div>
                <div className="sm:col-span-3 pt-2 border-t border-slate-100 text-slate-600">
                  <span className="font-semibold">Reason / Justification:</span> {bankProposal.reason}
                </div>
                <div className="sm:col-span-3 text-[11px] text-slate-400">
                  Proposed by: <strong>{bankProposal.proposedByOfficer || bankProposal.proposedBy}</strong> on {(bankProposal.timestamp || bankProposal.proposedAt || '').slice(0, 16)}
                </div>
              </div>

              {/* Approval Action */}
              <div className="pt-2 flex items-center justify-between">
                {(currentExecutive?.name || currentExecutive?.fullName) === (bankProposal.proposedByOfficer || bankProposal.proposedBy) ? (
                  <p className="text-xs text-amber-900 italic">
                    ℹ️ You proposed this modification. To prevent single-officer embezzlement or fraud, a *different* executive officer must log in and approve it.
                  </p>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-slate-700">
                      As an executive officer, verify these details with parish authority before approving.
                    </p>
                    <button
                      onClick={() => handleApproveBank(bankProposal.proposalId || 'prop-default')}
                      disabled={bankSubmitting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition"
                    >
                      {bankSubmitting ? 'Approving...' : 'Approve & Activate Bank Account'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Proposal Submission Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">Propose New / Updated Choir Bank Account</h3>
              <HelpToggle label="Help">
                Enforces the 2-Officer modification workflow. Any change requires confirmation from a second executive officer before becoming active.
              </HelpToggle>
            </div>

            {bankSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{bankSuccessMsg}</span>
              </div>
            )}

            {bankErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>{bankErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleProposeBank} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Zenith Bank / First Bank of Nigeria"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Account Name *</label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. OMPH CATHOLIC CHURCH CHOIR"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">10-Digit NUBAN Account Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 1012345678"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transfer Narration Instructions</label>
                <input
                  type="text"
                  value={narrationInstructions}
                  onChange={(e) => setNarrationInstructions(e.target.value)}
                  placeholder="e.g. Enter Member ID and Name in Narration (e.g. CHO-S01 Chioma Dues)"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Justification / Reason *</label>
                <textarea
                  rows={2}
                  required
                  value={proposalReason}
                  onChange={(e) => setProposalReason(e.target.value)}
                  placeholder="State the official parish reason for creating or changing this bank account (e.g. Approved by Parish Priest & Choir Executive for 2026/2027 fiscal year)"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={bankSubmitting}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50"
                >
                  {bankSubmitting ? 'Submitting...' : 'Submit Proposal for Dual Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: MEMBER ACCOUNTS & SINGLE-USE TOKENS
          ======================================================== */}
      {activeTab === 'accounts' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-slate-900">Chorister Portal Accounts & Security Management</h3>
              <HelpToggle label="Help">
                Generate single-use activation codes (ACT-XXXXXX) and password reset tokens (RST-XXXXXX) for members.
              </HelpToggle>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search chorister name or ID..."
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-56 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <select
                value={voiceFilter}
                onChange={(e) => setVoiceFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
              >
                <option value="all">All Voices</option>
                <option value="Soprano">Soprano</option>
                <option value="Alto">Alto</option>
                <option value="Tenor">Tenor</option>
                <option value="Bass">Bass</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Member ID</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Voice</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Security Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((m, idx) => {
                  const token = generatedTokens[m.memberId];
                  const isLoading = tokenLoading[m.memberId];

                  return (
                    <tr key={`${m.memberId}-${idx}`} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-800">{m.memberId}</td>
                      <td className="p-3 font-semibold text-slate-900">{m.fullName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.voicePart === 'Soprano' ? 'bg-pink-100 text-pink-800' :
                          m.voicePart === 'Alto' ? 'bg-purple-100 text-purple-800' :
                          m.voicePart === 'Tenor' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {m.voicePart}
                        </span>
                      </td>
                      <td className="p-3">
                        {token ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                                {token}
                              </span>
                              <button
                                onClick={() => copyToClipboard(token, `token-${m.memberId}`)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                {copiedBankField === `token-${m.memberId}` ? 'Copied' : 'Copy'}
                              </button>
                            </div>
                            {generatedTokenExpiries[m.memberId] && (
                              <div className="text-[10px] text-slate-500">
                                Valid until {new Date(generatedTokenExpiries[m.memberId]).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Active Roster Member</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => generateActivationCodeForChorister(m.memberId)}
                          disabled={isLoading}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] transition"
                        >
                          {isLoading ? '...' : 'Activation Code'}
                        </button>
                        <button
                          onClick={() => generateResetTokenForChorister(m.memberId)}
                          disabled={isLoading}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold rounded text-[11px] transition"
                        >
                          {isLoading ? '...' : 'Reset Token'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: DATA & BACKUP
          ======================================================== */}
      {activeTab === 'data' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Database Backup, Export & Clear Tools</h3>
          </div>

          {logsClearedMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Records successfully cleared! Authoritative database is fresh.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Backup export card */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Download className="w-4 h-4 text-blue-600" />
                <span>Export JSON Database Backup</span>
              </div>
              <p className="text-slate-500">
                Downloads complete JSON file of all {members.length} choristers, attendance records, fines, payments, and settings.
              </p>
              <button
                onClick={onExportBackup}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Full Backup
              </button>
            </div>

            {/* Clear main logs card */}
            <div className="p-4 bg-red-50/50 rounded-xl border border-red-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-red-950">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Clear Historical Logs & Fines</span>
              </div>
              <p className="text-red-700/80">
                Removes past attendance sessions, uncollected fines, and dispute logs while keeping your 54 real choristers intact.
              </p>
              <button
                onClick={() => setShowClearLogsConfirm(true)}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Logs (With Warning)
              </button>
            </div>

            {/* Clear sessions card */}
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Clear Rehearsal Timetable</span>
              </div>
              <p className="text-amber-800/80">
                Clears all scheduled rehearsal sessions. Useful when publishing a new term or liturgical calendar.
              </p>
              <button
                onClick={() => setShowClearSessionsConfirm(true)}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5" /> Clear Sessions
              </button>
            </div>

            {/* Demo dataset toggle */}
            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-3">
              <div className="flex items-center gap-2 font-bold text-indigo-950">
                <RefreshCw className="w-4 h-4 text-indigo-600" />
                <span>Demo Test Dataset</span>
              </div>
              <p className="text-indigo-800/80">
                Load 40 test choristers with sample attendance records for testing and demonstration purposes.
              </p>
              {isDemoMode ? (
                <button
                  onClick={onUnloadDemoData}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition"
                >
                  Unload Demo Data
                </button>
              ) : (
                <button
                  onClick={onRestoreDemoData}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
                >
                  Load Demo Data
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: BULK ROSTER IMPORT
          ======================================================== */}
      {activeTab === 'bulk' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Bulk Chorister Roster Import</h3>
          </div>

          {bulkStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{bulkStatus}</span>
            </div>
          )}

          <div className="space-y-2 text-xs">
            <label className="block font-semibold text-slate-700">
              Paste Format: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">Name, VoicePart, Phone</code>
            </label>
            <textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-3 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              placeholder={`Chukwuemeka Okonkwo, Tenor, +234 803 111 2233\nBlessing Adeleke, Soprano, +234 802 333 4455\nGrace Danjuma, Alto, +234 809 555 6677\nEmmanuel Eze, Bass, +234 818 777 8899`}
            />
            <p className="text-[11px] text-slate-400">One member per line. Voice parts default to Soprano if not specified.</p>
          </div>

          <button
            onClick={handleBulkImport}
            disabled={!bulkText.trim()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> Import Choristers to Database
          </button>
        </div>
      )}

      {/* ========================================================
          TAB 6: APPS SCRIPT CODE
          ======================================================== */}
      {activeTab === 'script' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">Google Apps Script Integration Code</h3>
          </div>

          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono max-h-72 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-amber-400 font-bold">{googleAppsScriptFiles[0]?.name || 'Code.gs'}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(googleAppsScriptFiles[0]?.code || '');
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2500);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[11px] rounded flex items-center gap-1"
              >
                <Copy className="w-3 h-3" /> {copiedCode ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap">{googleAppsScriptFiles[0]?.code || ''}</pre>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 7: ATTENDANCE & WELFARE CONFIGURATION
          ======================================================== */}
      {activeTab === 'attendance-welfare' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Attendance Monitoring & Chorister Welfare Settings</h3>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-semibold rounded-md border border-rose-200 shrink-0">
              Pastoral Care
            </span>
          </div>

          <div className="space-y-6">
            {/* Welfare Enabled Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-slate-900">Enable Absence Welfare Monitoring</div>
                <div className="text-xs text-slate-500">
                  When active, the portal flags members meeting the absence threshold for check-ins on the Welfare Dashboard.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSettings.welfareSettings?.welfareMonitoringEnabled !== false}
                  onChange={(e) => {
                    const currentWelfare = formSettings.welfareSettings || {
                      welfareMonitoringEnabled: true,
                      unexcusedAbsenceThreshold: 2,
                      evaluationWindowGatherings: 4,
                      eligibleGatherings: ['Rehearsal', 'Meeting', 'Special'],
                      timezone: 'Africa/Lagos',
                      defaultOfficerPositionId: 'POS-PV',
                    };
                    setFormSettings({
                      ...formSettings,
                      welfareSettings: {
                        ...currentWelfare,
                        welfareMonitoringEnabled: e.target.checked,
                      },
                    });
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {/* Threshold & Evaluation Window */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  Unexcused Absence Threshold
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formSettings.welfareSettings?.unexcusedAbsenceThreshold ?? 2}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 2);
                      const currentWelfare = formSettings.welfareSettings || {
                        welfareMonitoringEnabled: true,
                        unexcusedAbsenceThreshold: 2,
                        evaluationWindowGatherings: 4,
                        eligibleGatherings: ['Rehearsal', 'Meeting', 'Special'],
                        timezone: 'Africa/Lagos',
                        defaultOfficerPositionId: 'POS-PV',
                      };
                      setFormSettings({
                        ...formSettings,
                        welfareSettings: {
                          ...currentWelfare,
                          unexcusedAbsenceThreshold: val,
                        },
                      });
                    }}
                    className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-xs text-slate-600">unexcused absences</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Recommended default: 2. Flags a member for follow-up when they miss this number of sessions without an approved excuse.
                </p>
              </div>

              <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  Evaluation Window
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={formSettings.welfareSettings?.evaluationWindowGatherings ?? 4}
                    onChange={(e) => {
                      const val = Math.max(2, parseInt(e.target.value) || 4);
                      const currentWelfare = formSettings.welfareSettings || {
                        welfareMonitoringEnabled: true,
                        unexcusedAbsenceThreshold: 2,
                        evaluationWindowGatherings: 4,
                        eligibleGatherings: ['Rehearsal', 'Meeting', 'Special'],
                        timezone: 'Africa/Lagos',
                        defaultOfficerPositionId: 'POS-PV',
                      };
                      setFormSettings({
                        ...formSettings,
                        welfareSettings: {
                          ...currentWelfare,
                          evaluationWindowGatherings: val,
                        },
                      });
                    }}
                    className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="text-xs text-slate-600">last completed gatherings</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Default: 4. Only evaluates completed rehearsals, meetings, and choir programmes in the specified window.
                </p>
              </div>
            </div>

            {/* Eligible Gatherings */}
            <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-900">
                Eligible Gatherings for Welfare Monitoring
              </label>
              <div className="flex flex-wrap gap-4 text-xs">
                {[
                  { id: 'Rehearsal', label: 'Choir Rehearsals (Regular / Sectional)' },
                  { id: 'Meeting', label: 'General / Business Meetings' },
                  { id: 'Special', label: 'Special Liturgical Programmes / Concerts' },
                ].map((item) => {
                  const currentList = formSettings.welfareSettings?.eligibleGatherings || ['Rehearsal', 'Meeting', 'Special'];
                  const isChecked = currentList.includes(item.id);
                  return (
                    <label key={item.id} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const updatedList = e.target.checked
                            ? [...currentList, item.id]
                            : currentList.filter((g) => g !== item.id);
                          const currentWelfare = formSettings.welfareSettings || {
                            welfareMonitoringEnabled: true,
                            unexcusedAbsenceThreshold: 2,
                            evaluationWindowGatherings: 4,
                            eligibleGatherings: ['Rehearsal', 'Meeting', 'Special'],
                            timezone: 'Africa/Lagos',
                            defaultOfficerPositionId: 'POS-PV',
                          };
                          setFormSettings({
                            ...formSettings,
                            welfareSettings: {
                              ...currentWelfare,
                              eligibleGatherings: updatedList.length > 0 ? updatedList : ['Rehearsal'],
                            },
                          });
                        }}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-medium text-slate-700">{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Timezone and Default Responsible Officer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  Parish Operational Timezone
                </label>
                <div className="bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg text-xs font-mono font-bold text-slate-800 flex items-center justify-between">
                  <span>Africa/Lagos (WAT, UTC+1)</span>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-sans">Active</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  All gathering schedules, reminder countdowns, and absence evaluation windows operate in Nigerian local time.
                </p>
              </div>

              <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  Default Responsible Executive Officer
                </label>
                <select
                  value={formSettings.welfareSettings?.defaultOfficerPositionId || 'POS-PV'}
                  onChange={(e) => {
                    const currentWelfare = formSettings.welfareSettings || {
                      welfareMonitoringEnabled: true,
                      unexcusedAbsenceThreshold: 2,
                      evaluationWindowGatherings: 4,
                      eligibleGatherings: ['Rehearsal', 'Meeting', 'Special'],
                      timezone: 'Africa/Lagos',
                      defaultOfficerPositionId: 'POS-PV',
                    };
                    setFormSettings({
                      ...formSettings,
                      welfareSettings: {
                        ...currentWelfare,
                        defaultOfficerPositionId: e.target.value,
                      },
                    });
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="POS-PV">Provost (Discipline & Welfare)</option>
                  <option value="POS-APV">Assistant Provost</option>
                  <option value="POS-SEC">Secretary</option>
                  <option value="POS-CM">Choir Master</option>
                  <option value="POS-ACM">Assistant Choir Master</option>
                  <option value="POS-TR">Treasurer</option>
                  <option value="POS-FINSEC">Financial Secretary</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Newly flagged welfare follow-up cases will automatically be assigned to this officer unless reassigned manually.
                </p>
              </div>
            </div>

            {/* Note on Disciplinary vs Pastoral Separation */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Pastoral Care Separation Guarantee:</strong> Welfare follow-up actions and check-in logs are strictly confidential and do not generate fines or disciplinary sanctions. Financial accountability and dues are managed separately.
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSavingSettings ? 'Saving Settings...' : 'Save Attendance & Welfare Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR LOGS CONFIRMATION MODAL */}
      {showClearLogsConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl border border-slate-200">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Clear Attendance & Fine Records?</h3>
            <p className="text-xs text-slate-500">
              This will remove historical check-in logs and uncollected fines. Your chorister roster, song library, and settings will remain untouched.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setShowClearLogsConfirm(false)}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onClearMainLogs) onClearMainLogs();
                  setShowClearLogsConfirm(false);
                  setLogsClearedMessage(true);
                  setTimeout(() => setLogsClearedMessage(false), 3000);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
              >
                Yes, Clear Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR SESSIONS CONFIRMATION MODAL */}
      {showClearSessionsConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl border border-slate-200">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">Clear Rehearsal Sessions?</h3>
            <p className="text-xs text-slate-500">
              This will clear scheduled rehearsals. You can immediately create fresh upcoming rehearsals.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setShowClearSessionsConfirm(false)}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onClearSessions) onClearSessions();
                  setShowClearSessionsConfirm(false);
                  setLogsClearedMessage(true);
                  setTimeout(() => setLogsClearedMessage(false), 3000);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg"
              >
                Yes, Clear Sessions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
