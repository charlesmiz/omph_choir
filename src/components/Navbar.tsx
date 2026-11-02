import React, { useState } from 'react';
import { 
  Users, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  Lock, 
  Unlock, 
  Settings, 
  Eye, 
  CheckCircle2,
  AlertTriangle,
  X,
  KeyRound,
  Music,
  Camera,
  LayoutDashboard
} from 'lucide-react';
import { SystemSettings } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isExecutiveUnlocked: boolean;
  onUnlockExecutive: (pin: string) => boolean;
  onLockExecutive: () => void;
  settings: SystemSettings;
  activeSessionName?: string;
  overdueCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isExecutiveUnlocked,
  onUnlockExecutive,
  onLockExecutive,
  settings,
  activeSessionName,
  overdueCount,
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onUnlockExecutive(pinInput);
    if (success) {
      setShowLoginModal(false);
      setPinInput('');
      setPinError(false);
      setActiveTab('attendance');
    } else {
      setPinError(true);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        {/* Subtle top notification bar */}
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-900"></span>
            <span className="font-semibold text-slate-900">{settings.parishName}</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">{settings.choirName}</span>
            {activeSessionName && (
              <span className="hidden sm:inline-block ml-2 text-[11px] bg-white border border-amber-200 px-2 py-0.5 rounded text-amber-900 font-medium">
                {activeSessionName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs">
            {isExecutiveUnlocked ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  <Unlock className="w-3 h-3 text-emerald-600" /> Executive Access Active
                </span>
                <button
                  onClick={onLockExecutive}
                  className="text-xs text-slate-500 hover:text-slate-900 font-medium underline transition"
                >
                  Lock
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:border-slate-400 px-2.5 py-1 rounded transition shadow-2xs"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                Executive Login
              </button>
            )}
          </div>
        </div>

        {/* Main Title & Navigation */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/omph_37e5c155.jpg"
                alt="Our Mother of Perpetual Help"
                className="w-9 h-9 rounded-full object-cover border border-amber-300 shadow-xs"
              />
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {settings.choirName}
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  {isExecutiveUnlocked ? 'Provost & Executive Management System' : 'Chorister Attendance & Public Register'}
                </p>
              </div>
            </div>

            {/* Quick Officer Badge if executive */}
            {isExecutiveUnlocked && (
              <div className="hidden md:flex items-center gap-2 text-xs text-slate-600">
                <span className="text-slate-400">Provost:</span>
                <span className="font-semibold text-slate-800">{settings.provostName}</span>
              </div>
            )}
          </div>

          {/* Navigation Bar */}
          <nav className="flex space-x-1 overflow-x-auto border-t border-slate-100 py-1 text-xs sm:text-sm">
            {isExecutiveUnlocked ? (
              // EXECUTIVE NAV ITEMS (Clean, focused, no AI fluff)
              <>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'dashboard'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-700" />
                  Executive Dashboard
                </button>

                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'attendance'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4 text-slate-700" />
                  Attendance Desk
                </button>

                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'schedule'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-slate-700" />
                  Rehearsal Timetable
                </button>

                <button
                  onClick={() => setActiveTab('roster')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'roster'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4 text-slate-700" />
                  Chorister Roster
                </button>

                <button
                  onClick={() => setActiveTab('finance')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'finance'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-slate-700" />
                  Fines & Cashier
                </button>

                <button
                  onClick={() => setActiveTab('discipline')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap relative ${
                    activeTab === 'discipline'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-slate-700" />
                  21-Day Debt Discipline
                  {overdueCount > 0 && (
                    <span className="ml-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {overdueCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('songs')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'songs'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Music className="w-4 h-4 text-slate-700" />
                  Songs & Scores
                </button>

                <button
                  onClick={() => setActiveTab('gallery')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'gallery'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Camera className="w-4 h-4 text-slate-700" />
                  Choir Gallery
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ml-auto ${
                    activeTab === 'settings'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="w-4 h-4 text-slate-700" />
                  Church Setup & Data
                </button>
              </>
            ) : (
              // PUBLIC MEMBER NAV ITEMS (Simple, calm, zero administrative exposure)
              <>
                <button
                  onClick={() => setActiveTab('member-checkin')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'member-checkin'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4 text-slate-700" />
                  Today's Check-in
                </button>

                <button
                  onClick={() => setActiveTab('member-register')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'member-register'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Eye className="w-4 h-4 text-slate-700" />
                  Attendance Register
                </button>

                <button
                  onClick={() => setActiveTab('member-songs')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'member-songs'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Music className="w-4 h-4 text-slate-700" />
                  Parish Songs & Scripts
                </button>

                <button
                  onClick={() => setActiveTab('member-gallery')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'member-gallery'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Camera className="w-4 h-4 text-slate-700" />
                  Choir Gallery
                </button>

                <button
                  onClick={() => setActiveTab('member-excuse')}
                  className={`px-3 py-2 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'member-excuse'
                      ? 'bg-amber-100/70 text-slate-900 font-bold border border-amber-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-700" />
                  Excuse / Dispute
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Executive Passcode Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">Executive Passcode Required</h3>
              </div>
              <button 
                onClick={() => {
                  setShowLoginModal(false);
                  setPinError(false);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Only authorized choir executives (Provost, Choir Master, Secretary, Treasurer) are granted access to manage attendance, records, fines, and schedules.
            </p>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter Executive PIN
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  maxLength={10}
                  placeholder="Enter 4-digit PIN"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  className="w-full text-center text-lg tracking-widest font-mono border border-slate-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {pinError ? (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    Incorrect Passcode. Default PIN is <span className="font-mono font-bold">1234</span> (changeable in Settings).
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Default executive PIN is <span className="font-mono text-slate-600">1234</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition"
                >
                  Unlock Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
