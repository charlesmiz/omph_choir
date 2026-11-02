import React, { useState } from 'react';
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
  Image as ImageIcon
} from 'lucide-react';
import { 
  Chorister, 
  VoicePart, 
  MembershipStatus, 
  AttendanceArrangement,
  AttendanceRecord,
  FineRecord,
  PaymentRecord
} from '../types';

interface MembershipManagerProps {
  members: Chorister[];
  onAddMember: (member: Chorister) => void;
  onUpdateMember: (member: Chorister) => void;
  attendanceRecords: AttendanceRecord[];
  fines: FineRecord[];
  payments: PaymentRecord[];
}

export const MembershipManager: React.FC<MembershipManagerProps> = ({
  members,
  onAddMember,
  onUpdateMember,
  attendanceRecords,
  fines,
  payments,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeChorister, setActiveChorister] = useState<Chorister | null>(null);

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

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>, isDossier = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Image must be under 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (isDossier && activeChorister) {
        const updated = { ...activeChorister, profilePhotoUrl: result };
        onUpdateMember(updated);
        setActiveChorister(updated);
      } else {
        setFormData(prev => ({ ...prev, profilePhotoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.memberId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phoneNumber.includes(searchTerm);
    const matchesVoice = selectedVoice === 'All' || m.voicePart === selectedVoice;
    return matchesSearch && matchesVoice;
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
    setFormData({
      fullName: '',
      voicePart: 'Soprano',
      phoneNumber: '+234 ',
      attendanceArrangement: 'Standard',
      notes: '',
      profilePhotoUrl: '',
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Chorister Membership Roster ({members.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered active choristers with permanent Member IDs and standardized phone numbers.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition shadow-xs"
        >
          <Plus className="w-4 h-4" /> Add Chorister
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {['All', 'Soprano', 'Alto', 'Tenor', 'Bass'].map((voice) => (
            <button
              key={voice}
              onClick={() => setSelectedVoice(voice)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                selectedVoice === voice
                  ? 'bg-amber-100 text-slate-900 font-bold border border-amber-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {voice}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search name, ID or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Roster Table (Clean & uncluttered) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Member ID</th>
                <th className="py-2.5 px-3">Full Name</th>
                <th className="py-2.5 px-3">Voice Section</th>
                <th className="py-2.5 px-3">Phone Number</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <tr key={member.memberId} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-600">
                    {member.memberId}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2.5">
                      {member.profilePhotoUrl ? (
                        <img
                          src={member.profilePhotoUrl}
                          alt={member.fullName}
                          className="w-7 h-7 rounded-full object-cover border border-amber-300 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-900 text-amber-200 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {member.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                      )}
                      <span className="font-medium text-slate-900">{member.fullName}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-semibold text-slate-700">{member.voicePart}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {member.phoneNumber}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      member.membershipStatus === 'Active'
                        ? 'bg-amber-100 text-slate-900'
                        : member.membershipStatus === 'Under Query'
                        ? 'bg-amber-50 text-amber-900 border border-amber-200'
                        : member.membershipStatus === 'Suspended'
                        ? 'bg-red-50 text-red-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {member.membershipStatus}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => setActiveChorister(member)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium px-2.5 py-1 rounded transition"
                    >
                      View Dossier
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No choristers found. Click "Add Chorister" or use Bulk Import in Church Setup.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Dossier 360° Modal (Progressive Disclosure) */}
      {activeChorister && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto text-xs">
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-3">
              <div className="relative group shrink-0">
                {activeChorister.profilePhotoUrl ? (
                  <img
                    src={activeChorister.profilePhotoUrl}
                    alt={activeChorister.fullName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-amber-300 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-900 text-amber-200 font-bold text-base flex items-center justify-center shadow-xs">
                    {activeChorister.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 bg-slate-900 hover:bg-slate-800 text-white p-1.5 rounded-full cursor-pointer shadow-xs border border-white" title="Change profile photo">
                  <Camera className="w-3 h-3 text-amber-300" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoFileChange(e, true)}
                  />
                </label>
              </div>

              <div className="flex-1 min-w-0">
                <span className="font-mono text-[11px] text-slate-500">{activeChorister.memberId}</span>
                <h3 className="text-base font-bold text-slate-900 truncate">{activeChorister.fullName}</h3>
                <p className="text-[11px] text-slate-500">{activeChorister.voicePart} Section · Joined {activeChorister.membershipDate}</p>
              </div>
              <button onClick={() => setActiveChorister(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Contact Phone:</span>
                <span className="font-mono font-medium text-slate-900">{activeChorister.phoneNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Attendance Arrangement:</span>
                <span className="font-medium text-slate-800">{activeChorister.attendanceArrangement}</span>
              </div>
            </div>

            {/* Financial Summary */}
            {(() => {
              const mFines = fines.filter(f => f.memberId === activeChorister.memberId);
              const mPaid = payments.filter(p => p.memberId === activeChorister.memberId);
              const totalFines = mFines.reduce((s, f) => s + f.amount, 0);
              const totalPaid = mPaid.reduce((s, p) => s + p.amount, 0);
              const balance = totalFines - totalPaid;

              return (
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 block">Financial Account Summary:</span>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">Fines Assessed</span>
                      <span className="font-bold text-slate-900 font-mono">₦{totalFines}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 text-[10px] block">Settled</span>
                      <span className="font-bold text-slate-900 font-mono">₦{totalPaid}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <span className="text-slate-600 text-[10px] block">Outstanding Balance</span>
                      <span className="font-bold text-slate-900 font-mono">₦{balance}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Quick Status Toggles for Provost */}
            <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2 justify-end">
              {activeChorister.membershipStatus !== 'Active' && (
                <button
                  onClick={() => {
                    onUpdateMember({ ...activeChorister, membershipStatus: 'Active' });
                    setActiveChorister({ ...activeChorister, membershipStatus: 'Active' });
                  }}
                  className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                >
                  Set to Active Status
                </button>
              )}
              {activeChorister.membershipStatus === 'Active' && (
                <button
                  onClick={() => {
                    onUpdateMember({ ...activeChorister, membershipStatus: 'Under Query' });
                    setActiveChorister({ ...activeChorister, membershipStatus: 'Under Query' });
                  }}
                  className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1.5 rounded-lg text-xs font-semibold"
                >
                  Mark Under Query
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add New Chorister Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
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
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoFileChange(e, false)}
                    />
                  </label>
                </div>
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
