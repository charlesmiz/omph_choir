import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Users, 
  ShieldCheck, 
  Edit3, 
  Check, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Camera, 
  Trash2, 
  Link as LinkIcon, 
  Info, 
  Lock, 
  Clock, 
  Send,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { Chorister, SystemSettings } from '../types';
import { ChoristerAvatar } from './ChoristerAvatar';
import { compressAvatarImageFile } from '../utils/imageUpload';
import { HelpToggle } from './HelpToggle';

interface MemberProfileViewProps {
  currentMember: Chorister | null;
  settings: SystemSettings;
  onProfileUpdated?: (updated: Chorister) => void;
  onChangePassword?: (currentPassword: string, newPassword: string) => Promise<any>;
  openPasswordTrigger?: number;
}

interface IdentityRequestForm {
  requestType: 'name_correction' | 'voice_change';
  proposedValue: string;
  reason: string;
}

const buildFormStateFromMember = (member: Chorister | null) => ({
  phoneNumber: member?.phoneNumber || '',
  email: member?.email || '',
  residentialAddress: member?.residentialAddress || '',
  occupation: member?.occupation || '',
  dateOfBirth: member?.dateOfBirth || '',
  nextOfKinName: member?.nextOfKinName || '',
  nextOfKinPhone: member?.nextOfKinPhone || '',
});

export const MemberProfileView: React.FC<MemberProfileViewProps> = ({
  currentMember,
  settings,
  onProfileUpdated,
  onChangePassword,
  openPasswordTrigger = 0,
}) => {
  const [profile, setProfile] = useState<Chorister | null>(currentMember);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  // Editable fields form state
  const [formData, setFormData] = useState(() => buildFormStateFromMember(currentMember));

  // Photo management modal / sub-state
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState(
    currentMember?.profilePhotoUrl?.startsWith('data:') ? '' : (currentMember?.profilePhotoUrl || '')
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(currentMember?.profilePhotoUrl || null);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');

  // Identity correction modal state
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionForm, setCorrectionForm] = useState<IdentityRequestForm>({
    requestType: 'name_correction',
    proposedValue: '',
    reason: '',
  });
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionSuccess, setCorrectionSuccess] = useState('');
  const [correctionError, setCorrectionError] = useState('');
  const [correctionHistory, setCorrectionHistory] = useState<any[]>([]);

  // Change password modal state (handled directly inside My Profile)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (openPasswordTrigger > 0) {
      setPasswordStatus(null);
      setCurrPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordModal(true);
    }
  }, [openPasswordTrigger]);

  const applyServerProfile = (memberData: Chorister, notifyParent = false) => {
    setProfile(memberData);
    setFormData(buildFormStateFromMember(memberData));
    const photoUrl = memberData.profilePhotoUrl || '';
    setPhotoUrlInput(photoUrl.startsWith('data:') ? '' : photoUrl);
    setPhotoPreview(photoUrl || null);
    if (notifyParent && onProfileUpdated) {
      onProfileUpdated(memberData);
    }
  };

  // Sync profile when prop changes (when not actively editing)
  useEffect(() => {
    if (currentMember) {
      setProfile(currentMember);
      if (!isEditing) {
        setFormData(buildFormStateFromMember(currentMember));
      }
      if (!showPhotoModal) {
        const photoUrl = currentMember.profilePhotoUrl || '';
        setPhotoUrlInput(photoUrl.startsWith('data:') ? '' : photoUrl);
        setPhotoPreview(photoUrl || null);
      }
    }
  }, [currentMember]);

  // Fetch latest profile & correction history from backend on mount
  useEffect(() => {
    let cancelled = false;
    const fetchProfile = async () => {
      const token = sessionStorage.getItem('member_token');
      if (!token) return;
      try {
        const res = await fetch('/api/member/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.success && data.profile) {
          applyServerProfile(data.profile, true);
          if (data.correctionRequests) {
            setCorrectionHistory(data.correctionRequests);
          }
        }
      } catch {
        // Fallback to prop
      }
    };
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle direct personal fields save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    const trimmedPhone = formData.phoneNumber.trim();
    const trimmedEmail = formData.email.trim();

    if (!trimmedPhone || trimmedPhone.length < 7) {
      setSaveError('Please enter a valid phone number (at least 7 digits).');
      return;
    }
    if (trimmedEmail && (!trimmedEmail.includes('@') || !trimmedEmail.includes('.'))) {
      setSaveError('Please enter a valid email address.');
      return;
    }

    const token = sessionStorage.getItem('member_token');
    if (!token) {
      setSaveError('Your member session has expired. Please sign out and sign in again.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phoneNumber: trimmedPhone,
          email: trimmedEmail,
          residentialAddress: formData.residentialAddress.trim(),
          occupation: formData.occupation.trim(),
          dateOfBirth: formData.dateOfBirth.trim(),
          nextOfKinName: formData.nextOfKinName.trim(),
          nextOfKinPhone: formData.nextOfKinPhone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.profile) {
        setSaveError(data.message || 'Failed to update profile.');
        return;
      }

      applyServerProfile(data.profile, true);
      setIsEditing(false);
      setSaveSuccess('Your personal profile was updated successfully.');
      setTimeout(() => setSaveSuccess(''), 5000);
    } catch (err: any) {
      setSaveError(err?.message || 'Network error saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  // Client-side file validation, compression & preview
  const handleLocalFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError('');
    setPhotoSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;

    const compressed = await compressAvatarImageFile(file);
    if (!compressed.ok) {
      setPhotoError(compressed.error);
      return;
    }

    setPhotoUrlInput('');
    setPhotoPreview(compressed.dataUrl);
    setPhotoSuccess(
      `Photograph ready (${compressed.originalKb} KB compressed to ${compressed.compressedKb} KB). Click "Save Photograph" to apply.`
    );
  };

  // Save photograph reference (supports both HTTPS URL and compressed local upload)
  const handleSavePhoto = async () => {
    setPhotoError('');
    setPhotoSuccess('');

    const targetUrl = photoUrlInput.trim() || photoPreview || '';
    const token = sessionStorage.getItem('member_token');
    if (!token) {
      setPhotoError('Your member session has expired. Please sign out and sign in again.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          profilePhotoUrl: targetUrl || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.profile) {
        setPhotoError(data.message || 'Failed to update photograph.');
        return;
      }

      applyServerProfile(data.profile, true);
      setShowPhotoModal(false);
      setSaveSuccess(targetUrl ? 'Profile photograph updated successfully.' : 'Profile photograph removed. Initials avatar restored.');
      setTimeout(() => setSaveSuccess(''), 5000);
    } catch (err: any) {
      setPhotoError(err?.message || 'Network error updating photograph.');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove photo action
  const handleRemovePhoto = async () => {
    setPhotoError('');
    setPhotoSuccess('');
    const token = sessionStorage.getItem('member_token');
    if (!token) {
      setPhotoError('Your member session has expired. Please sign out and sign in again.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ profilePhotoUrl: null }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.profile) {
        setPhotoError(data.message || 'Failed to remove photograph.');
        return;
      }
      applyServerProfile(data.profile, true);
      setShowPhotoModal(false);
      setSaveSuccess('Photograph removed. Initials avatar restored.');
      setTimeout(() => setSaveSuccess(''), 5000);
    } catch (err: any) {
      setPhotoError(err?.message || 'Network error removing photograph.');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit identity / voice correction request for Choir Master / Exec approval
  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    setCorrectionError('');
    setCorrectionSuccess('');

    if (!correctionForm.proposedValue.trim()) {
      setCorrectionError('Please enter the proposed correction.');
      return;
    }
    if (!correctionForm.reason.trim()) {
      setCorrectionError('Please provide an explanatory reason for the executive review audit.');
      return;
    }

    setIsSubmittingCorrection(true);
    const token = sessionStorage.getItem('member_token') || sessionStorage.getItem('executive_token');

    try {
      const res = await fetch('/api/member/profile/correction-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestType: correctionForm.requestType,
          proposedValue: correctionForm.proposedValue.trim(),
          reason: correctionForm.reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCorrectionError(data.message || 'Failed to submit correction request.');
        setIsSubmittingCorrection(false);
        return;
      }

      setCorrectionSuccess('Your request has been submitted to the Choir Master and Provost for official review.');
      if (data.request) {
        setCorrectionHistory(prev => [data.request, ...prev]);
      }
      setTimeout(() => {
        setShowCorrectionModal(false);
        setCorrectionSuccess('');
        setCorrectionForm({ requestType: 'name_correction', proposedValue: '', reason: '' });
      }, 2500);
    } catch (err: any) {
      setCorrectionError(err?.message || 'Error submitting correction request.');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (!currPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ success: false, message: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ success: false, message: 'Password must be at least 6 characters long.' });
      return;
    }
    if (!onChangePassword) {
      setPasswordStatus({ success: false, message: 'Password update handler is unavailable.' });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await onChangePassword(currPassword, newPassword);
      setPasswordStatus({ success: true, message: res?.message || 'Password changed successfully.' });
      setCurrPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordStatus({ success: false, message: err?.message || 'Failed to update password.' });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const active = profile || currentMember;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Toast notifications */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-semibold text-emerald-950 flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {saveError && (
        <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs font-semibold text-rose-950 flex items-center gap-2 shadow-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 1. Main Header Profile Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Decorative Top Accent Bar */}
        <div className="h-24 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 relative">
          <div className="absolute top-3 right-4 flex items-center gap-2">
            <span className="text-[11px] font-semibold text-amber-200/90 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
              {settings.parishName || 'Our Mother of Perpetual Help Catholic Parish'}
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4">
            {/* Avatar & Photo Action */}
            <div className="flex items-end gap-4">
              <div className="relative group">
                <ChoristerAvatar
                  fullName={active?.fullName}
                  voicePart={active?.voicePart}
                  profilePhotoUrl={active?.profilePhotoUrl}
                  size="2xl"
                  className="ring-4 ring-white shadow-md cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoError('');
                    setPhotoSuccess('');
                    const currentPhoto = active?.profilePhotoUrl || '';
                    setPhotoUrlInput(currentPhoto.startsWith('data:') ? '' : currentPhoto);
                    setPhotoPreview(currentPhoto || null);
                    setShowPhotoModal(true);
                  }}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-amber-300 shadow-md border-2 border-white transition cursor-pointer"
                  title="Update profile photograph"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-0.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight break-words">
                    {active?.fullName || 'Chorister Member'}
                  </h1>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    {active?.memberId}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    Voice Part: {active?.voicePart}
                  </span>
                  <span>·</span>
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    active?.membershipStatus === 'Active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {active?.membershipStatus || 'Active'}
                  </span>
                  <span>·</span>
                  <span>Enrolled: {active?.membershipDate || active?.registrationDate || 'Parish Choir Register'}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setSaveError('');
                    setFormData(buildFormStateFromMember(active));
                    setIsEditing(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Edit Personal Details</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setSaveError('');
                    setFormData(buildFormStateFromMember(active));
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}

              {onChangePassword && (
                <button
                  type="button"
                  onClick={() => {
                    setPasswordStatus(null);
                    setCurrPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setShowPasswordModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold transition shadow-2xs cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                  <span>Change Password</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Editable Personal Information Section */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-600" />
              <span>Personal Contact & Profile Details</span>
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            Self-Service Permitted
          </span>
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phone Number (E.164 format) *
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="+234 803 000 0000"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="chorister@example.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Residential / Home Address in Ilorin
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={formData.residentialAddress}
                    onChange={(e) => setFormData({ ...formData, residentialAddress: e.target.value })}
                    placeholder="e.g. Tanke, University Road, Ilorin"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Profession / Occupation
                </label>
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    placeholder="e.g. Educator, Student, Medical Officer"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Birthday / Feast Day (Month & Day)
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    placeholder="e.g. November 22"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Next of Kin / Emergency Contact Name
                </label>
                <div className="relative">
                  <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={formData.nextOfKinName}
                    onChange={(e) => setFormData({ ...formData, nextOfKinName: e.target.value })}
                    placeholder="Contact Name & Relationship"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Next of Kin / Emergency Phone
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={formData.nextOfKinPhone}
                    onChange={(e) => setFormData({ ...formData, nextOfKinPhone: e.target.value })}
                    placeholder="+234 803 000 0000"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSaveError('');
                  setFormData(buildFormStateFromMember(active));
                }}
                disabled={isSaving}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <span>Saving Changes...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Save Personal Information</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-slate-500 text-[11px] block font-medium">Registered Phone Number</span>
              <strong className="text-slate-900 font-mono text-sm block">
                {active?.phoneNumber || 'Not specified'}
              </strong>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-slate-500 text-[11px] block font-medium">Email Address</span>
              <strong className="text-slate-900 text-sm block break-all">
                {active?.email || 'No email registered'}
              </strong>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-slate-500 text-[11px] block font-medium">Residential / Home Location</span>
              <span className="text-slate-800 font-medium block">
                {active?.residentialAddress || 'Not specified'}
              </span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-slate-500 text-[11px] block font-medium">Vocation / Occupation</span>
              <span className="text-slate-800 font-medium block">
                {active?.occupation || 'Not specified'}
              </span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-slate-500 text-[11px] block font-medium">Patronal Feast / Birthday</span>
              <span className="text-slate-800 font-medium block">
                {active?.dateOfBirth || 'Not specified'}
              </span>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-slate-500 text-[11px] block font-medium">Emergency / Next of Kin</span>
              <span className="text-slate-800 font-medium block">
                {active?.nextOfKinName || 'Not specified'}
                {active?.nextOfKinPhone ? (
                  <span className="block font-mono text-[11px] text-slate-600 mt-0.5">{active.nextOfKinPhone}</span>
                ) : null}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 3. Sensitive Identity & Voice Part Section (Governed / Approval Required) */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Official Register Identity & Voice Section</span>
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            Approval Required
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">Official Registered Full Name</span>
              <strong className="text-base text-slate-900 block mt-0.5">{active?.fullName}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setCorrectionForm({
                  requestType: 'name_correction',
                  proposedValue: active?.fullName || '',
                  reason: '',
                });
                setShowCorrectionModal(true);
              }}
              className="text-xs text-blue-700 hover:text-blue-800 font-bold inline-flex items-center gap-1 cursor-pointer pt-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Request Name Correction</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">Assigned Choral Voice Section</span>
              <strong className="text-base text-slate-900 block mt-0.5">{active?.voicePart}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setCorrectionForm({
                  requestType: 'voice_change',
                  proposedValue: active?.voicePart || 'Soprano',
                  reason: '',
                });
                setShowCorrectionModal(true);
              }}
              className="text-xs text-blue-700 hover:text-blue-800 font-bold inline-flex items-center gap-1 cursor-pointer pt-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Request Voice Section Transfer</span>
            </button>
          </div>
        </div>

        {/* History of Submitted Identity Requests */}
        {correctionHistory.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Submitted Identity & Section Requests
            </h4>
            <div className="divide-y divide-slate-100">
              {correctionHistory.map((req) => (
                <div key={req.complaintId || req.requestId} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {req.description?.split(']')[0]?.replace('[', '') || req.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'Resolved' || req.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{req.description || req.reason}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    {req.complaintDate || req.submissionDate}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. Protected Parish Governance Details (Read-Only) */}
      <section className="bg-slate-50 rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
            <Lock className="w-4 h-4 text-slate-500" />
            <span>Official Membership Record (Read-Only)</span>
          </div>
          <HelpToggle label="More details">
            These fields are maintained by the Choir Master, Secretary, and Provost desks under parish rules.
          </HelpToggle>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Member ID</span>
            <strong className="text-slate-900 font-mono">{active?.memberId}</strong>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
            <strong className="text-slate-900">{active?.membershipStatus || 'Active'}</strong>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance Tier</span>
            <strong className="text-slate-900 truncate block">{active?.attendanceArrangement || 'Standard'}</strong>
          </div>
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Enrolled Date</span>
            <strong className="text-slate-900 font-mono">{active?.membershipDate || active?.registrationDate || '2026-11-01'}</strong>
          </div>
        </div>
      </section>

      {/* MODAL 1: Photograph Management Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 text-xs max-h-[90dvh] overflow-y-auto overscroll-contain my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Manage Profile Photograph</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current / Preview Image Display */}
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <ChoristerAvatar
                fullName={active?.fullName}
                voicePart={active?.voicePart}
                profilePhotoUrl={photoPreview || active?.profilePhotoUrl}
                size="2xl"
                className="ring-4 ring-amber-400/40 shadow-lg"
              />
              <span className="text-[11px] text-slate-500 font-medium">
                {photoPreview ? 'Live Image Preview' : 'Current Liturgical Initials Avatar'}
              </span>
            </div>

            {photoError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold">
                {photoError}
              </div>
            )}
            {photoSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
                {photoSuccess}
              </div>
            )}

            {/* Option A: Link Hosted Photo URL */}
            <div className="space-y-1.5 pt-2">
              <label className="block font-semibold text-slate-700">
                Option A: Link Hosted Image URL
              </label>
              <div className="relative">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="url"
                  value={photoUrlInput}
                  onChange={(e) => {
                    setPhotoError('');
                    setPhotoUrlInput(e.target.value);
                    setPhotoPreview(e.target.value.trim() || null);
                  }}
                  placeholder="https://example.com/my-photo.jpg"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 text-xs text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-400">Paste any public direct image URL (e.g. from parish drive or portfolio).</p>
            </div>

            {/* Option B: Upload & Optimize Local File */}
            <div className="space-y-1.5 pt-1">
              <label className="block font-semibold text-slate-700">
                Option B: Upload Photo from Device
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleLocalFileSelect}
                className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">Supported: JPEG, PNG, WebP (Max: 2.0 MB, automatically resized for fast portal loading).</p>
            </div>

            <HelpToggle label="Photo guidelines">
              Paste a direct public HTTPS image URL or upload JPEG, PNG, or WebP (max 2.0 MB; resized automatically).
            </HelpToggle>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              {active?.profilePhotoUrl ? (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={isSaving}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSavePhoto}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Photograph'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Identity / Voice Section Correction Request */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 text-xs max-h-[90dvh] overflow-y-auto overscroll-contain my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {correctionForm.requestType === 'name_correction' ? 'Request Name Correction' : 'Request Voice Section Transfer'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <HelpToggle label="More information">
              Name and voice section changes require Choir Master review and approval.
            </HelpToggle>

            {correctionError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold">
                ⚠️ {correctionError}
              </div>
            )}
            {correctionSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
                ✓ {correctionSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitCorrection} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Request Type
                </label>
                <select
                  value={correctionForm.requestType}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, requestType: e.target.value as any })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                >
                  <option value="name_correction">Full Legal Name Correction</option>
                  <option value="voice_change">Voice Section Transfer (e.g. Alto → Soprano)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Current Value on Record
                </label>
                <input
                  type="text"
                  disabled
                  value={correctionForm.requestType === 'name_correction' ? active?.fullName : active?.voicePart}
                  className="w-full border border-slate-200 bg-slate-100 rounded-lg p-2 text-xs text-slate-600 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Proposed New Value *
                </label>
                {correctionForm.requestType === 'name_correction' ? (
                  <input
                    type="text"
                    required
                    value={correctionForm.proposedValue}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, proposedValue: e.target.value })}
                    placeholder="Enter corrected full legal name"
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                ) : (
                  <select
                    value={correctionForm.proposedValue}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, proposedValue: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900"
                  >
                    <option value="Soprano">Soprano</option>
                    <option value="Alto">Alto</option>
                    <option value="Tenor">Tenor</option>
                    <option value="Bass">Bass</option>
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Request *
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  placeholder="Explain why this change is needed (e.g. typographical error in maiden name, voice audition result)..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingCorrection ? 'Submitting...' : 'Submit Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Change Password Modal (Inside My Profile) */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 text-xs max-h-[90dvh] overflow-y-auto overscroll-contain my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordStatus && (
              <div className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                passwordStatus.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-red-50 text-red-900 border border-red-200'
              }`}>
                {passwordStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                <span>{passwordStatus.message}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currPassword}
                  onChange={(e) => setCurrPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-mono"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Password (Min. 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-mono"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-mono"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
