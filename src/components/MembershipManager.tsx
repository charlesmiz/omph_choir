import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  DollarSign, 
  Clock, 
  Check, 
  X,
  Phone,
  Camera,
  Upload,
  Image as ImageIcon,
  Archive,
  RotateCcw,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  FolderArchive,
  UserX,
  ShieldCheck,
  AlertCircle,
  Edit3,
  Mail,
  Calendar,
  Award
} from 'lucide-react';
import { 
  Chorister, 
  VoicePart, 
  MembershipStatus, 
  AttendanceArrangement,
  AttendanceRecord,
  FineRecord,
  PaymentRecord,
  ExecutiveAccount,
  MonthlyDuesAssessment,
  QueryRecord,
  SuspensionRecord,
  ComplaintRecord,
  AccommodationApplication,
  AbsenceNotification,
  SystemSettings
} from '../types';
import { ChoristerAvatar } from './ChoristerAvatar';
import { compressAvatarImageFile } from '../utils/imageUpload';

interface MembershipManagerProps {
  members: Chorister[];
  onAddMember: (member: Chorister) => void;
  onUpdateMember: (member: Chorister) => Promise<{ success?: boolean; message?: string; member?: Chorister } | void> | void;
  onArchiveMember?: (memberId: string, reason: string) => Promise<{ success: boolean; message?: string }>;
  onReactivateMember?: (memberId: string, reason?: string) => Promise<{ success: boolean; message?: string }>;
  onDeleteMember?: (memberId: string, reason: string) => Promise<{ success: boolean; message?: string; blocked?: boolean; counts?: any }>;
  currentExecutive?: ExecutiveAccount | null;
  attendanceRecords: AttendanceRecord[];
  fines: FineRecord[];
  payments: PaymentRecord[];
  monthlyDues?: MonthlyDuesAssessment[];
  queries?: QueryRecord[];
  suspensions?: SuspensionRecord[];
  complaints?: ComplaintRecord[];
  accommodations?: AccommodationApplication[];
  absences?: AbsenceNotification[];
  settings?: SystemSettings;
}

const buildDossierForm = (member: Chorister) => ({
  fullName: member.fullName || '',
  phoneNumber: member.phoneNumber || '',
  email: member.email || '',
  voicePart: (member.voicePart || 'Soprano') as VoicePart,
  attendanceArrangement: (member.attendanceArrangement || 'Standard') as AttendanceArrangement,
  residentialAddress: member.residentialAddress || '',
  occupation: member.occupation || '',
  dateOfBirth: member.dateOfBirth || '',
  nextOfKinName: member.nextOfKinName || '',
  nextOfKinPhone: member.nextOfKinPhone || '',
  notes: member.notes || '',
});

export const MembershipManager: React.FC<MembershipManagerProps> = ({
  members,
  onAddMember,
  onUpdateMember,
  onArchiveMember,
  onReactivateMember,
  onDeleteMember,
  currentExecutive,
  attendanceRecords = [],
  fines = [],
  payments = [],
  monthlyDues = [],
  queries = [],
  suspensions = [],
  complaints = [],
  accommodations = [],
  absences = [],
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('Active');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeChorister, setActiveChorister] = useState<Chorister | null>(null);

  // Editable Dossier State
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [dossierForm, setDossierForm] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    voicePart: 'Soprano' as VoicePart,
    attendanceArrangement: 'Standard' as AttendanceArrangement,
    residentialAddress: '',
    occupation: '',
    dateOfBirth: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    notes: '',
  });
  const [dossierSaving, setDossierSaving] = useState(false);
  const [dossierError, setDossierError] = useState('');
  const [dossierSuccess, setDossierSuccess] = useState('');

  // Keep open Dossier modal synchronized with fresh members prop
  useEffect(() => {
    if (!activeChorister) return;
    const latest = members.find(
      (m) => m.memberId?.toUpperCase() === activeChorister.memberId?.toUpperCase()
    );
    if (latest) {
      setActiveChorister(latest);
      if (!isEditingDossier) {
        setDossierForm(buildDossierForm(latest));
      }
    }
  }, [members]);

  // Archiving & Deletion State
  const [memberToArchive, setMemberToArchive] = useState<Chorister | null>(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState('');

  const [memberToReactivate, setMemberToReactivate] = useState<Chorister | null>(null);
  const [reactivateReason, setReactivateReason] = useState('');
  const [reactivateLoading, setReactivateLoading] = useState(false);
  const [reactivateError, setReactivateError] = useState('');

  const [memberToDelete, setMemberToDelete] = useState<Chorister | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [photoError, setPhotoError] = useState('');

  // Form State for New Member
  const [formData, setFormData] = useState({
    fullName: '',
    voicePart: 'Soprano' as VoicePart,
    phoneNumber: '+234 ',
    attendanceArrangement: 'Standard' as AttendanceArrangement,
    notes: '',
    profilePhotoUrl: '',
  });

  // Role permissions: Only Choir Master or Admin can permanently delete
  const isChoirMaster = currentExecutive?.position === 'Choir Master' || currentExecutive?.role === 'Choir Master';
  const isAdmin = Boolean(currentExecutive?.permissions?.includes('all') || currentExecutive?.permissions?.includes('admin'));
  const canPermanentlyDelete = isChoirMaster || isAdmin;

  // Counts summary by status
  const activeCount = members.filter(m => m.membershipStatus === 'Active').length;
  const underQueryCount = members.filter(m => m.membershipStatus === 'Under Query').length;
  const suspendedCount = members.filter(m => m.membershipStatus === 'Suspended').length;
  const inactiveCount = members.filter(m => m.membershipStatus === 'Inactive').length;
  const archivedCount = members.filter(m => m.membershipStatus === 'Archived').length;
  const totalCount = members.length;

  // Helper: Calculate dependent historical records for a given member
  const getMemberRecordCounts = (memberId: string) => {
    const mAttendance = attendanceRecords.filter(r => r.memberId === memberId).length;
    const mFinesList = fines.filter(f => f.memberId === memberId);
    const mFines = mFinesList.length;
    const mPaymentsList = payments.filter(p => p.memberId === memberId);
    const mPayments = mPaymentsList.length;
    const mDues = (monthlyDues || []).filter(d => d.memberId === memberId).length;
    const mQueries = (queries || []).filter(q => q.memberId === memberId).length;
    const mSuspensions = (suspensions || []).filter(s => s.memberId === memberId).length;
    const mComplaints = (complaints || []).filter(c => c.memberId === memberId).length;
    const mAccommodations = (accommodations || []).filter(a => a.memberId === memberId).length;
    const mAbsences = (absences || []).filter(ab => ab.memberId === memberId).length;

    const totalFinesAmt = mFinesList.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
    const totalPaymentsAmt = mPaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const outstandingBalance = Math.max(0, totalFinesAmt - totalPaymentsAmt);

    const totalDependentRecords = mAttendance + mFines + mPayments + mDues + mQueries + mSuspensions + mComplaints + mAccommodations + mAbsences;

    return {
      attendance: mAttendance,
      fines: mFines,
      payments: mPayments,
      monthlyDues: mDues,
      queries: mQueries,
      suspensions: mSuspensions,
      complaints: mComplaints,
      accommodations: mAccommodations,
      absences: mAbsences,
      total: totalDependentRecords,
      outstandingBalance,
      isEligibleForPermanentDeletion: totalDependentRecords === 0,
    };
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isDossier = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    setDossierError('');
    setDossierSuccess('');

    const compressed = await compressAvatarImageFile(file);
    if (!compressed.ok) {
      if (isDossier) {
        setDossierError(compressed.error);
      } else {
        setPhotoError(compressed.error);
      }
      return;
    }

    if (isDossier && activeChorister) {
      setDossierSaving(true);
      try {
        const updated: Chorister = { ...activeChorister, profilePhotoUrl: compressed.dataUrl };
        const res = await onUpdateMember(updated);
        if (res && typeof res === 'object' && res.success === false) {
          setDossierError(res.message || 'Failed to update profile photograph.');
          return;
        }
        const saved = (res && typeof res === 'object' && res.member) ? res.member : updated;
        setActiveChorister(saved);
        setDossierSuccess('Profile photograph updated successfully.');
      } catch (err: any) {
        setDossierError(err?.message || 'Failed to update profile photograph.');
      } finally {
        setDossierSaving(false);
      }
    } else {
      setFormData(prev => ({ ...prev, profilePhotoUrl: compressed.dataUrl }));
    }
  };

  const handleRemoveDossierPhoto = async () => {
    if (!activeChorister) return;
    setDossierError('');
    setDossierSuccess('');
    setDossierSaving(true);
    try {
      const payload = {
        ...activeChorister,
        profilePhotoUrl: '',
      };
      const res = await onUpdateMember(payload);
      if (res && typeof res === 'object' && res.success === false) {
        setDossierError(res.message || 'Failed to remove profile photograph.');
        return;
      }
      const saved = (res && typeof res === 'object' && res.member) ? res.member : { ...activeChorister, profilePhotoUrl: undefined };
      setActiveChorister(saved);
      setDossierSuccess('Profile photograph removed.');
    } catch (err: any) {
      setDossierError(err?.message || 'Failed to remove profile photograph.');
    } finally {
      setDossierSaving(false);
    }
  };

  const openDossier = (member: Chorister) => {
    setActiveChorister(member);
    setIsEditingDossier(false);
    setDossierError('');
    setDossierSuccess('');
    setDossierForm(buildDossierForm(member));
  };

  const handleSaveDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChorister) return;
    setDossierError('');
    setDossierSuccess('');

    if (!dossierForm.fullName.trim()) {
      setDossierError('Full legal name is required.');
      return;
    }
    if (!dossierForm.phoneNumber.trim() || dossierForm.phoneNumber.trim().length < 7) {
      setDossierError('Please enter a valid phone number (at least 7 digits).');
      return;
    }
    const cleanEmail = dossierForm.email.trim();
    if (cleanEmail && (!cleanEmail.includes('@') || !cleanEmail.includes('.'))) {
      setDossierError('Please enter a valid email address.');
      return;
    }

    setDossierSaving(true);
    try {
      const updatedPayload: Chorister = {
        ...activeChorister,
        fullName: dossierForm.fullName.trim(),
        phoneNumber: dossierForm.phoneNumber.trim(),
        email: cleanEmail,
        voicePart: dossierForm.voicePart,
        attendanceArrangement: dossierForm.attendanceArrangement,
        residentialAddress: dossierForm.residentialAddress.trim(),
        occupation: dossierForm.occupation.trim(),
        dateOfBirth: dossierForm.dateOfBirth.trim(),
        nextOfKinName: dossierForm.nextOfKinName.trim(),
        nextOfKinPhone: dossierForm.nextOfKinPhone.trim(),
        notes: dossierForm.notes.trim(),
      };
      const result = await onUpdateMember(updatedPayload);
      if (result && typeof result === 'object' && result.success === false) {
        setDossierError(result.message || 'Failed to save chorister dossier.');
        return;
      }
      const savedMember = (result && typeof result === 'object' && result.member) ? result.member : updatedPayload;
      setActiveChorister(savedMember);
      setDossierForm(buildDossierForm(savedMember));
      setIsEditingDossier(false);
      setDossierSuccess('Chorister dossier updated successfully.');
    } catch (err: any) {
      setDossierError(err?.message || 'Failed to update chorister dossier.');
    } finally {
      setDossierSaving(false);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phoneNumber.includes(searchTerm);

    const matchesVoice = selectedVoice === 'All' || m.voicePart === selectedVoice;

    let matchesStatus = true;
    if (statusFilter === 'Active') {
      matchesStatus = m.membershipStatus === 'Active';
    } else if (statusFilter === 'Archived') {
      matchesStatus = m.membershipStatus === 'Archived';
    } else if (statusFilter === 'Inactive') {
      matchesStatus = m.membershipStatus === 'Inactive';
    } else if (statusFilter === 'Under Query') {
      matchesStatus = m.membershipStatus === 'Under Query';
    } else if (statusFilter === 'Suspended') {
      matchesStatus = m.membershipStatus === 'Suspended';
    } else if (statusFilter === 'All') {
      matchesStatus = true;
    }

    return matchesSearch && matchesVoice && matchesStatus;
  });

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = formData.voicePart[0];
    const sectionMembers = members.filter(m => m.voicePart === formData.voicePart);
    const nextNum = String(sectionMembers.length + 1).padStart(2, '0');
    const newMemberId = `CHO-${prefix}${nextNum}`;

    const newMember: Chorister = {
      memberId: newMemberId,
      fullName: formData.fullName,
      voicePart: formData.voicePart,
      phoneNumber: formData.phoneNumber,
      membershipDate: new Date().toISOString().split('T')[0],
      membershipStatus: 'Active',
      attendanceArrangement: formData.attendanceArrangement,
      registrationDate: new Date().toISOString().split('T')[0],
      notes: formData.notes || undefined,
      profilePhotoUrl: formData.profilePhotoUrl || undefined,
    };

    onAddMember(newMember);
    setShowAddModal(false);
    setActionSuccessMsg(`Chorister ${newMember.fullName} (${newMember.memberId}) registered successfully.`);
    setTimeout(() => setActionSuccessMsg(''), 4000);
    setFormData({
      fullName: '',
      voicePart: 'Soprano',
      phoneNumber: '+234 ',
      attendanceArrangement: 'Standard',
      notes: '',
      profilePhotoUrl: '',
    });
  };

  // Submit Archive Member
  const handleArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToArchive) return;
    if (!archiveReason.trim()) {
      setArchiveError('Please provide an official reason for archiving this member.');
      return;
    }

    setArchiveLoading(true);
    setArchiveError('');
    try {
      if (onArchiveMember) {
        const res = await onArchiveMember(memberToArchive.memberId, archiveReason);
        if (res && res.success) {
          setActionSuccessMsg(res.message || `Chorister ${memberToArchive.fullName} successfully archived.`);
          setTimeout(() => setActionSuccessMsg(''), 4000);
          setMemberToArchive(null);
          setArchiveReason('');
          if (activeChorister?.memberId === memberToArchive.memberId) {
            setActiveChorister(null);
          }
        } else {
          setArchiveError(res?.message || 'Failed to archive member.');
        }
      } else {
        // Fallback local update
        onUpdateMember({
          ...memberToArchive,
          membershipStatus: 'Archived',
          archiveReason: archiveReason.trim(),
          archivedAt: new Date().toISOString(),
          archivedBy: currentExecutive?.fullName || 'Executive',
        });
        setMemberToArchive(null);
        setArchiveReason('');
      }
    } catch (err: any) {
      setArchiveError(err?.message || 'Error communicating with server.');
    } finally {
      setArchiveLoading(false);
    }
  };

  // Submit Reactivate Member
  const handleReactivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToReactivate) return;

    setReactivateLoading(true);
    setReactivateError('');
    try {
      if (onReactivateMember) {
        const res = await onReactivateMember(memberToReactivate.memberId, reactivateReason);
        if (res && res.success) {
          setActionSuccessMsg(res.message || `Chorister ${memberToReactivate.fullName} restored to Active membership status.`);
          setTimeout(() => setActionSuccessMsg(''), 4000);
          setMemberToReactivate(null);
          setReactivateReason('');
          if (activeChorister?.memberId === memberToReactivate.memberId) {
            setActiveChorister(null);
          }
        } else {
          setReactivateError(res?.message || 'Failed to reactivate member.');
        }
      } else {
        onUpdateMember({
          ...memberToReactivate,
          membershipStatus: 'Active',
        });
        setMemberToReactivate(null);
        setReactivateReason('');
      }
    } catch (err: any) {
      setReactivateError(err?.message || 'Error communicating with server.');
    } finally {
      setReactivateLoading(false);
    }
  };

  // Submit Permanent Delete Member
  const handleDeleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToDelete) return;

    const counts = getMemberRecordCounts(memberToDelete.memberId);
    if (counts.total > 0) {
      setDeleteError(`Permanent deletion blocked: Member has ${counts.total} linked historical records. Archive this member instead.`);
      return;
    }

    if (!canPermanentlyDelete) {
      setDeleteError('Permanent deletion is strictly restricted to the Choir Master or System Administrator.');
      return;
    }

    if (!deleteReason.trim()) {
      setDeleteError('Please provide an official justification for permanent deletion.');
      return;
    }

    const cleanInput = deleteConfirmText.trim();
    if (cleanInput !== memberToDelete.memberId && cleanInput.toUpperCase() !== 'DELETE') {
      setDeleteError(`Please type "${memberToDelete.memberId}" or "DELETE" exactly to confirm.`);
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');
    try {
      if (onDeleteMember) {
        const res = await onDeleteMember(memberToDelete.memberId, deleteReason);
        if (res && res.success) {
          setActionSuccessMsg(res.message || `Member ${memberToDelete.fullName} (${memberToDelete.memberId}) permanently deleted.`);
          setTimeout(() => setActionSuccessMsg(''), 5000);
          setMemberToDelete(null);
          setDeleteReason('');
          setDeleteConfirmText('');
          if (activeChorister?.memberId === memberToDelete.memberId) {
            setActiveChorister(null);
          }
        } else {
          setDeleteError(res?.message || 'Failed to permanently delete member.');
        }
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Error communicating with server.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Chorister Membership Roster ({members.length})
            </h2>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Chorister
        </button>
      </div>

      {/* Primary Status Categorization Tabs */}
      <div className="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1 overflow-x-auto text-xs border border-slate-200">
        <button
          onClick={() => setStatusFilter('Active')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'Active'
              ? 'bg-white text-slate-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Active Roster</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            statusFilter === 'Active' ? 'bg-amber-100 text-slate-900' : 'bg-slate-200 text-slate-600'
          }`}>
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('Archived')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'Archived'
              ? 'bg-amber-700 text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Archived Members</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            statusFilter === 'Archived' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
          }`}>
            {archivedCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('Under Query')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'Under Query'
              ? 'bg-white text-slate-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Under Query</span>
          <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.2 rounded-full font-bold">
            {underQueryCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('Suspended')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'Suspended'
              ? 'bg-white text-slate-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Suspended</span>
          <span className="text-[10px] bg-red-100 text-red-900 px-1.5 py-0.2 rounded-full font-bold">
            {suspendedCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('Inactive')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'Inactive'
              ? 'bg-white text-slate-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Inactive</span>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full font-bold">
            {inactiveCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('All')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
            statusFilter === 'All'
              ? 'bg-white text-slate-950 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>All Records</span>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-full font-bold">
            {totalCount}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {['All', 'Soprano', 'Alto', 'Tenor', 'Bass'].map((voice) => (
            <button
              key={voice}
              onClick={() => setSelectedVoice(voice)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                selectedVoice === voice
                  ? 'bg-amber-100 text-slate-900 font-bold border border-amber-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {voice}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-auto sm:min-w-[240px] flex-1 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, Member ID, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Archived Members Banner when viewing Archived Register */}
      {statusFilter === 'Archived' && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl text-xs flex items-start gap-2.5">
          <FolderArchive className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold block text-slate-900">Archived Members Archive ({archivedCount})</span>
            Archived choristers are kept safe in the parish records. Their past attendance, payments, and fine balances are preserved intact. They are excluded from future dues generation and call-time check-in lists until an authorized executive reactivates them.
          </div>
        </div>
      )}

      {/* Roster Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Member ID</th>
                <th className="py-2.5 px-3">Full Legal Name</th>
                <th className="py-2.5 px-3">Voice Section</th>
                <th className="py-2.5 px-3">Contact Phone</th>
                <th className="py-2.5 px-3">Status</th>
                {statusFilter === 'Archived' && (
                  <th className="py-2.5 px-3">Archival Reason</th>
                )}
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member, idx) => {
                const isArchived = member.membershipStatus === 'Archived';
                const isInactive = member.membershipStatus === 'Inactive';

                return (
                  <tr key={`${member.memberId || 'mem'}-${idx}`} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-600">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                        {member.memberId}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2.5">
                        <ChoristerAvatar
                          fullName={member.fullName}
                          voicePart={member.voicePart}
                          photoUrl={member.profilePhotoUrl}
                          size="md"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 block">{member.fullName}</span>
                          {isArchived && member.archivedAt && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Archived: {member.archivedAt.slice(0, 10)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-700">{member.voicePart}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {member.phoneNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        member.membershipStatus === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : member.membershipStatus === 'Archived'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : member.membershipStatus === 'Under Query'
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : member.membershipStatus === 'Suspended'
                          ? 'bg-red-50 text-red-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {member.membershipStatus}
                      </span>
                    </td>
                    {statusFilter === 'Archived' && (
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate text-[11px]" title={member.archiveReason || 'Administrative Archival'}>
                        {member.archiveReason || 'Administrative Archival'}
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => openDossier(member)}
                          className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-2.5 py-1 rounded transition cursor-pointer shadow-2xs"
                          title="View Profile / Edit Dossier"
                        >
                          View Profile / Edit Dossier
                        </button>

                        {/* Quick Archival / Reactivate Action */}
                        {!isArchived && !isInactive ? (
                          <button
                            type="button"
                            onClick={() => {
                              setMemberToArchive(member);
                              setArchiveReason('');
                              setArchiveError('');
                            }}
                            className="text-[11px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-semibold px-2 py-1 rounded transition cursor-pointer shadow-2xs flex items-center gap-1"
                            title="Deactivate and archive chorister without deleting historical records"
                          >
                            <Archive className="w-3 h-3 text-amber-700" />
                            <span>Archive</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setMemberToReactivate(member);
                              setReactivateReason('');
                              setReactivateError('');
                            }}
                            className="text-[11px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold px-2 py-1 rounded transition cursor-pointer shadow-2xs flex items-center gap-1"
                            title="Reactivate chorister to Active membership"
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-600" />
                            <span>Reactivate</span>
                          </button>
                        )}

                        {/* Permanent Delete Action Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setMemberToDelete(member);
                            setDeleteReason('');
                            setDeleteConfirmText('');
                            setDeleteError('');
                          }}
                          className="text-[11px] hover:bg-red-50 text-red-600 hover:text-red-800 border border-transparent hover:border-red-200 px-1.5 py-1 rounded transition cursor-pointer"
                          title={canPermanentlyDelete ? "Permanently delete chorister (safety checks apply)" : "Permanent deletion requires Choir Master or Admin"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={statusFilter === 'Archived' ? 7 : 6} className="py-12 text-center text-slate-400">
                    <Users className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No choristers found matching the active filters.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try switching voice sections or membership status tabs.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Dossier 360° Modal (Progressive Disclosure) */}
      {activeChorister && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain text-xs my-auto">
            <div className="flex flex-wrap items-center gap-3.5 border-b border-slate-100 pb-3">
              <div className="relative group shrink-0">
                <ChoristerAvatar
                  fullName={activeChorister.fullName}
                  voicePart={activeChorister.voicePart}
                  photoUrl={activeChorister.profilePhotoUrl}
                  size="xl"
                  ring
                />
                <label className="absolute -bottom-1 -right-1 bg-slate-900 hover:bg-slate-800 text-white p-1.5 rounded-full cursor-pointer shadow-xs border border-white" title="Change profile photo">
                  <Camera className="w-3 h-3 text-amber-300" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handlePhotoFileChange(e, true)}
                  />
                </label>
              </div>

              <div className="flex-1 min-w-0">
                <span className="font-mono text-[11px] text-slate-500">{activeChorister.memberId}</span>
                <h3 className="text-base font-bold text-slate-900 truncate">{activeChorister.fullName}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-slate-600">{activeChorister.voicePart} Section</span>
                  <span className="text-slate-300">·</span>
                  <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                    activeChorister.membershipStatus === 'Active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeChorister.membershipStatus === 'Archived'
                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                      : activeChorister.membershipStatus === 'Under Query'
                      ? 'bg-amber-50 text-amber-900'
                      : activeChorister.membershipStatus === 'Suspended'
                      ? 'bg-red-50 text-red-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {activeChorister.membershipStatus}
                  </span>
                </div>
                {activeChorister.profilePhotoUrl && (
                  <button
                    type="button"
                    disabled={dossierSaving}
                    onClick={handleRemoveDossierPhoto}
                    className="mt-1 text-[11px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!isEditingDossier && (
                  <button
                    type="button"
                    onClick={() => {
                      setDossierError('');
                      setDossierSuccess('');
                      setDossierForm(buildDossierForm(activeChorister));
                      setIsEditingDossier(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit Profile
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveChorister(null);
                    setIsEditingDossier(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {dossierSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{dossierSuccess}</span>
              </div>
            )}

            {dossierError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-900 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{dossierError}</span>
              </div>
            )}

            {/* Archival Status Banner if archived */}
            {activeChorister.membershipStatus === 'Archived' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <FolderArchive className="w-4 h-4 text-amber-700" />
                  <span>Archived Membership Profile</span>
                </div>
                <div className="text-[11px] text-slate-700">
                  <strong>Reason:</strong> {activeChorister.archiveReason || 'Administrative Archival'}
                </div>
                {activeChorister.archivedAt && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Archived on {activeChorister.archivedAt.slice(0, 10)} by {activeChorister.archivedBy || 'Executive Desk'}
                  </div>
                )}
              </div>
            )}

            {isEditingDossier ? (
              <form onSubmit={handleSaveDossier} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900">Edit Chorister Membership Dossier</span>
                  <span className="font-mono text-[10px] text-slate-500">ID: {activeChorister.memberId} (Protected)</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={dossierForm.fullName}
                    onChange={(e) => setDossierForm({ ...dossierForm, fullName: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={dossierForm.phoneNumber}
                      onChange={(e) => setDossierForm({ ...dossierForm, phoneNumber: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={dossierForm.email}
                      onChange={(e) => setDossierForm({ ...dossierForm, email: e.target.value })}
                      placeholder="Optional"
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Voice Section *</label>
                    <select
                      value={dossierForm.voicePart}
                      onChange={(e) => setDossierForm({ ...dossierForm, voicePart: e.target.value as VoicePart })}
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                    >
                      <option value="Soprano">Soprano</option>
                      <option value="Alto">Alto</option>
                      <option value="Tenor">Tenor</option>
                      <option value="Bass">Bass</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Attendance Arrangement</label>
                    <select
                      value={dossierForm.attendanceArrangement}
                      onChange={(e) => setDossierForm({ ...dossierForm, attendanceArrangement: e.target.value as AttendanceArrangement })}
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                    >
                      <option value="Standard">Standard</option>
                      <option value="Approved Accommodation - Work">Approved Accommodation - Work</option>
                      <option value="Approved Accommodation - Distance">Approved Accommodation - Distance</option>
                      <option value="Approved Accommodation - Music Instruction">Approved Accommodation - Music Instruction</option>
                      <option value="Approved Accommodation - Other">Approved Accommodation - Other</option>
                      <option value="Special Dispensation">Special Dispensation</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                    <input
                      type="text"
                      value={dossierForm.residentialAddress}
                      onChange={(e) => setDossierForm({ ...dossierForm, residentialAddress: e.target.value })}
                      placeholder="Optional"
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Occupation</label>
                    <input
                      type="text"
                      value={dossierForm.occupation}
                      onChange={(e) => setDossierForm({ ...dossierForm, occupation: e.target.value })}
                      placeholder="Optional"
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Birthday / Feast Day</label>
                    <input
                      type="text"
                      value={dossierForm.dateOfBirth}
                      onChange={(e) => setDossierForm({ ...dossierForm, dateOfBirth: e.target.value })}
                      placeholder="e.g. Nov 22"
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Next of Kin Name</label>
                    <input
                      type="text"
                      value={dossierForm.nextOfKinName}
                      onChange={(e) => setDossierForm({ ...dossierForm, nextOfKinName: e.target.value })}
                      placeholder="Optional"
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Next of Kin Phone</label>
                    <input
                      type="tel"
                      value={dossierForm.nextOfKinPhone}
                      onChange={(e) => setDossierForm({ ...dossierForm, nextOfKinPhone: e.target.value })}
                      placeholder="Optional"
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Membership Notes</label>
                  <textarea
                    rows={2}
                    value={dossierForm.notes}
                    onChange={(e) => setDossierForm({ ...dossierForm, notes: e.target.value })}
                    placeholder="Optional pastoral or choir administration notes..."
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-900"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingDossier(false);
                      setDossierError('');
                      setDossierForm(buildDossierForm(activeChorister));
                    }}
                    disabled={dossierSaving}
                    className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={dossierSaving}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-bold"
                  >
                    {dossierSaving ? 'Saving...' : 'Save Dossier'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Contact Phone</span>
                    <span className="font-mono font-medium text-slate-900">{activeChorister.phoneNumber || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Email Address</span>
                    <span className="font-medium text-slate-900 break-all">{activeChorister.email || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Residential Address</span>
                    <span className="font-medium text-slate-900">{activeChorister.residentialAddress || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Occupation</span>
                    <span className="font-medium text-slate-900">{activeChorister.occupation || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Birthday / Feast Day</span>
                    <span className="font-medium text-slate-900">{activeChorister.dateOfBirth || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Next of Kin</span>
                    <span className="font-medium text-slate-900">
                      {activeChorister.nextOfKinName || 'Not provided'}
                      {activeChorister.nextOfKinPhone ? ` (${activeChorister.nextOfKinPhone})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Registration Date</span>
                    <span className="font-mono font-medium text-slate-900">
                      {activeChorister.registrationDate || activeChorister.membershipDate || 'Not recorded'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Attendance Arrangement</span>
                    <span className="font-medium text-slate-800">{activeChorister.attendanceArrangement || 'Standard'}</span>
                  </div>
                </div>

                {(() => {
                  const heldPositions = (settings?.positions || []).filter(
                    (p) =>
                      p.assignedMemberId &&
                      p.assignedMemberId.toUpperCase() === activeChorister.memberId.toUpperCase()
                  );
                  if (heldPositions.length === 0) return null;
                  return (
                    <div className="pt-2 border-t border-slate-200 flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500 text-[11px] flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-amber-600" />
                        Executive Position:
                      </span>
                      {heldPositions.map((p) => (
                        <span
                          key={p.positionId}
                          className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-[11px]"
                        >
                          {p.title}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                {activeChorister.notes && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-500 block text-[11px]">Notes</span>
                    <span className="text-slate-700">{activeChorister.notes}</span>
                  </div>
                )}
              </div>
            )}

            {/* Financial Summary */}
            {(() => {
              const counts = getMemberRecordCounts(activeChorister.memberId);
              return (
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block">Financial & Disciplinary Summary:</span>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">Attendance Check-ins</span>
                      <span className="font-bold text-slate-900 font-mono">{counts.attendance}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">Fines Assessed</span>
                      <span className="font-bold text-slate-900 font-mono">{counts.fines}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <span className="text-slate-600 text-[10px] block">Outstanding Balance</span>
                      <span className="font-bold text-slate-900 font-mono">₦{counts.outstandingBalance}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Quick Actions in Dossier Footer */}
            <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2 justify-between items-center">
              <div className="flex items-center gap-1.5">
                {/* Permanent Delete Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    const target = activeChorister;
                    setActiveChorister(null);
                    setMemberToDelete(target);
                    setDeleteReason('');
                    setDeleteConfirmText('');
                    setDeleteError('');
                  }}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                  title="Permanent deletion (Safety checked)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete...</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {activeChorister.membershipStatus === 'Archived' ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeChorister;
                      setActiveChorister(null);
                      setMemberToReactivate(target);
                      setReactivateReason('');
                      setReactivateError('');
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reactivate Member</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeChorister;
                      setActiveChorister(null);
                      setMemberToArchive(target);
                      setArchiveReason('');
                      setArchiveError('');
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive Member</span>
                  </button>
                )}

                <span className="text-[11px] text-slate-500">
                  Disciplinary status changes are managed in the 21-Day Debt Discipline tab.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: DEACTIVATE / ARCHIVE MEMBER MODAL
          ======================================================== */}
      {memberToArchive && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[90dvh] overflow-y-auto overscroll-contain my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-lg">
                  <Archive className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Archive Chorister Member</h3>
                  <p className="text-[11px] text-slate-500">Safe deactivation preserving all historical data</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMemberToArchive(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Member Summary Card */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{memberToArchive.fullName}</span>
                <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                  {memberToArchive.memberId}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                {memberToArchive.voicePart} Section · Current Status: <strong className="text-slate-800">{memberToArchive.membershipStatus}</strong>
              </div>
            </div>

            {/* Policy Clarification Box */}
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-950 text-[11px] space-y-1 leading-relaxed">
              <span className="font-bold block flex items-center gap-1.5 text-blue-900">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                Data Preservation Guarantee:
              </span>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
                <li>Removes the chorister from new attendance session call-times.</li>
                <li>Excludes this member from future monthly dues generation.</li>
                <li>Prevents chorister portal self-service check-in.</li>
                <li><strong>Strictly preserves</strong> all previous attendance, payments, outstanding fines, and disciplinary history in the parish archive.</li>
              </ul>
            </div>

            {archiveError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{archiveError}</span>
              </div>
            )}

            <form onSubmit={handleArchiveSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Archival / Deactivation *
                </label>
                <textarea
                  required
                  rows={2}
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="e.g. Relocated out of state, university academic semester, voluntary sabbatical leave, personal withdrawal..."
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMemberToArchive(null)}
                  disabled={archiveLoading}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={archiveLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Archive className="w-3.5 h-3.5" />
                  {archiveLoading ? 'Archiving...' : 'Confirm Archive Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: REACTIVATE MEMBER MODAL
          ======================================================== */}
      {memberToReactivate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[90dvh] overflow-y-auto overscroll-contain my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-900 rounded-lg">
                  <RotateCcw className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reactivate Chorister Member</h3>
                  <p className="text-[11px] text-slate-500">Restore member to Active register</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMemberToReactivate(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Member Details */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{memberToReactivate.fullName}</span>
                <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                  {memberToReactivate.memberId}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                {memberToReactivate.voicePart} Section · Previously Archived: {memberToReactivate.archiveReason || 'Administrative Archival'}
              </div>
            </div>

            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-950 text-[11px] leading-relaxed">
              <span className="font-bold block text-emerald-900 flex items-center gap-1.5 mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Zero Record Duplication:
              </span>
              Reactivation restores this member to active rehearsal participant lists and dues eligibility. All previous attendance and financial obligations remain preserved without duplicating historical records.
            </div>

            {reactivateError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{reactivateError}</span>
              </div>
            )}

            <form onSubmit={handleReactivateSubmit} className="space-y-3.5 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reactivation Notes / Terms (Optional)
                </label>
                <input
                  type="text"
                  value={reactivateReason}
                  onChange={(e) => setReactivateReason(e.target.value)}
                  placeholder="e.g. Resumed after academic break, cleared by choir executive..."
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMemberToReactivate(null)}
                  disabled={reactivateLoading}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reactivateLoading}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {reactivateLoading ? 'Reactivating...' : 'Confirm Reactivation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: PERMANENT DELETE MEMBER (SAFETY-CHECKED)
          ======================================================== */}
      {memberToDelete && (() => {
        const counts = getMemberRecordCounts(memberToDelete.memberId);
        const hasLinkedRecords = counts.total > 0;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-xs max-h-[90dvh] overflow-y-auto overscroll-contain my-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${hasLinkedRecords ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900'}`}>
                    <ShieldAlert className="w-5 h-5 text-red-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Permanently Delete Member</h3>
                    <p className="text-[11px] text-slate-500">Administrative Data Integrity Check</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMemberToDelete(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Member Summary Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{memberToDelete.fullName}</span>
                  <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">
                    {memberToDelete.memberId}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600">
                  {memberToDelete.voicePart} Section · Current Status: <strong className="text-slate-800">{memberToDelete.membershipStatus}</strong>
                </div>
              </div>

              {/* Dependent Records Inspection Breakdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span>Linked Historical Records Audit:</span>
                  <span className={`px-2 py-0.5 rounded font-mono ${hasLinkedRecords ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {counts.total} record(s) found
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                  <div className="flex items-center justify-between p-1 bg-white rounded border border-slate-100">
                    <span className="text-slate-500">Attendance Logs:</span>
                    <strong className="font-mono text-slate-900">{counts.attendance}</strong>
                  </div>
                  <div className="flex items-center justify-between p-1 bg-white rounded border border-slate-100">
                    <span className="text-slate-500">Fines Assessed:</span>
                    <strong className="font-mono text-slate-900">{counts.fines}</strong>
                  </div>
                  <div className="flex items-center justify-between p-1 bg-white rounded border border-slate-100">
                    <span className="text-slate-500">Payments Recorded:</span>
                    <strong className="font-mono text-slate-900">{counts.payments}</strong>
                  </div>
                  <div className="flex items-center justify-between p-1 bg-white rounded border border-slate-100">
                    <span className="text-slate-500">Monthly Dues Cycles:</span>
                    <strong className="font-mono text-slate-900">{counts.monthlyDues}</strong>
                  </div>
                  <div className="flex items-center justify-between p-1 bg-white rounded border border-slate-100">
                    <span className="text-slate-500">Formal Queries:</span>
                    <strong className="font-mono text-slate-900">{counts.queries}</strong>
                  </div>
                  <div className="flex items-center justify-between p-1 bg-white rounded border border-slate-100">
                    <span className="text-slate-500">Outstanding Balance:</span>
                    <strong className="font-mono text-slate-900">₦{counts.outstandingBalance}</strong>
                  </div>
                </div>
              </div>

              {/* DECISION BRANCH A: BLOCKED DUE TO DEPENDENT RECORDS */}
              {hasLinkedRecords ? (
                <div className="space-y-3">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-950 text-[11px] leading-relaxed space-y-1">
                    <div className="font-bold text-red-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Permanent Deletion Blocked (Audit Rules)</span>
                    </div>
                    <p className="text-slate-700">
                      This chorister has <strong>{counts.total} linked historical records</strong>. Deleting this chorister is prohibited because removing the record would corrupt parish financial records, fine ledgers, and rehearsal attendance audits.
                    </p>
                    <p className="text-amber-900 font-medium pt-1">
                      <strong>Required Action:</strong> Please use <strong>Deactivate / Archive Member</strong> instead to safely remove the member from active duty while protecting historical records.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setMemberToDelete(null)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = memberToDelete;
                        setMemberToDelete(null);
                        setMemberToArchive(target);
                        setArchiveReason('');
                        setArchiveError('');
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive Member Instead</span>
                    </button>
                  </div>
                </div>
              ) : !canPermanentlyDelete ? (
                /* DECISION BRANCH B: ZERO RECORDS, BUT OFFICER NOT AUTHORIZED */
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-[11px] leading-relaxed">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Choir Master or Administrator Authorization Required</span>
                    </div>
                    <p className="text-slate-700 mt-1">
                      While this member has zero linked records, permanent deletion is constitutionally restricted to the <strong>Choir Master</strong> or an authorized <strong>System Administrator</strong>.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setMemberToDelete(null)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = memberToDelete;
                        setMemberToDelete(null);
                        setMemberToArchive(target);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Archive Member Instead
                    </button>
                  </div>
                </div>
              ) : (
                /* DECISION BRANCH C: ELIGIBLE FOR PERMANENT DELETION */
                <form onSubmit={handleDeleteSubmit} className="space-y-3 pt-1">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-[11px] leading-relaxed">
                    <span className="font-bold block text-emerald-900">
                      ✓ Zero Historical Records Detected — Eligible for Permanent Deletion
                    </span>
                    This chorister has no associated attendance, financial, or disciplinary records. Permanent deletion will remove the registration and authentication account entirely.
                  </div>

                  {deleteError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-900 rounded-xl flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{deleteError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Reason for Permanent Deletion *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="e.g. Registered in error, duplicate entry, candidate never joined..."
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Type <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-red-700">{memberToDelete.memberId}</code> or <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-red-700">DELETE</code> to confirm *
                    </label>
                    <input
                      type="text"
                      required
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={`Type ${memberToDelete.memberId} or DELETE`}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-red-600 uppercase"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setMemberToDelete(null)}
                      disabled={deleteLoading}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        deleteLoading || 
                        !deleteReason.trim() || 
                        (deleteConfirmText.trim() !== memberToDelete.memberId && deleteConfirmText.trim().toUpperCase() !== 'DELETE')
                      }
                      className="px-4 py-2 bg-red-700 hover:bg-red-800 disabled:bg-slate-300 text-white font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deleteLoading ? 'Deleting...' : 'Permanently Delete Member'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );
      })()}

      {/* Add New Chorister Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add New Chorister</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chukwuma Charles Okoye"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Voice Section</label>
                  <select
                    value={formData.voicePart}
                    onChange={(e) => setFormData({ ...formData, voicePart: e.target.value as VoicePart })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
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
                    required
                    placeholder="+234 803 123 4567"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Profile Picture (Optional)
                </label>
                <div className="flex items-center gap-3">
                  {formData.profilePhotoUrl ? (
                    <div className="relative">
                      <img
                        src={formData.profilePhotoUrl}
                        alt="Preview"
                        className="w-11 h-11 rounded-full object-cover border-2 border-amber-300"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, profilePhotoUrl: '' })}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full p-0.5"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Photo from Device</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handlePhotoFileChange(e, false)}
                    />
                  </label>
                </div>
                {photoError && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">{photoError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border rounded-lg text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-semibold"
                >
                  Save Chorister
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
