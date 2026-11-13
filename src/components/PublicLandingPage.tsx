import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  ShieldCheck, 
  KeyRound, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Music, 
  Sparkles,
  ChevronRight,
  Shield
} from 'lucide-react';
import { SystemSettings, RehearsalSession } from '../types';
import { ChoirHeroBanner } from './ChoirHeroBanner';
import { HelpToggle } from './HelpToggle';

interface PublicLandingPageProps {
  settings: SystemSettings;
  activeSession?: RehearsalSession | null;
  nextSession?: RehearsalSession | null;
  totalMembers?: number;
  onMemberLogin: (credentials: { memberId: string; password: string }) => Promise<boolean>;
  onMemberActivate: (data: { memberId: string; activationCode: string; newPassword: string }) => Promise<boolean | { success: boolean; message?: string }>;
  onMemberResetPassword: (data: { memberId: string; resetToken: string; newPassword: string }) => Promise<boolean>;
  onExecutiveLogin: (credentials: { username: string; password: string }) => Promise<boolean>;
  onExecutiveBootstrap: (data: { fullName: string; username: string; password: string; position: string }) => Promise<boolean>;
  hasAdminAccount?: boolean;
  initialOfficeAccess?: boolean;
}

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({
  settings,
  activeSession,
  nextSession,
  totalMembers = 0,
  onMemberLogin,
  onMemberActivate,
  onMemberResetPassword,
  onExecutiveLogin,
  onExecutiveBootstrap,
  hasAdminAccount = true,
  initialOfficeAccess = false,
}) => {
  // Member Card Tab
  const [memberView, setMemberView] = useState<'login' | 'activate' | 'reset'>('login');

  // Member Login state
  const [memberId, setMemberId] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [showMemberPassword, setShowMemberPassword] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  // Activation & Reset states
  const [activationCode, setActivationCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Executive Office Access Modal state
  const [showExecModal, setShowExecModal] = useState(initialOfficeAccess);
  const [execUsername, setExecUsername] = useState('');
  const [execPassword, setExecPassword] = useState('');
  const [showExecPassword, setShowExecPassword] = useState(false);
  const [execLoading, setExecLoading] = useState(false);
  const [execError, setExecError] = useState('');

  // Bootstrap state (if no admin account exists yet)
  const [bootstrapFullName, setBootstrapFullName] = useState('');
  const [bootstrapUsername, setBootstrapUsername] = useState('choirmaster');
  const [bootstrapPosition, setBootstrapPosition] = useState('Choir Master');
  const [bootstrapPassword, setBootstrapPassword] = useState('');
  const [bootstrapConfirmPassword, setBootstrapConfirmPassword] = useState('');
  const [showBootstrapPassword, setShowBootstrapPassword] = useState(false);

  // URL hash check for /office-access
  useEffect(() => {
    if (
      window.location.pathname.includes('office-access') || 
      window.location.hash.includes('office-access') ||
      window.location.search.includes('office-access')
    ) {
      setShowExecModal(true);
    }
  }, []);

  // Handle Member Login
  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    setMemberSuccess('');
    setMemberLoading(true);

    try {
      if (memberView === 'login') {
        const ok = await onMemberLogin({
          memberId: memberId.trim().toUpperCase(),
          password: memberPassword,
        });
        if (!ok) {
          setMemberError('Invalid Member ID or password. If this is your first time, click "First-Time Activation" below.');
        }
      } else if (memberView === 'activate') {
        if (newPassword.length < 6) {
          setMemberError('Password must be at least 6 characters long.');
          setMemberLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setMemberError('Passwords do not match.');
          setMemberLoading(false);
          return;
        }
        const result = await onMemberActivate({
          memberId: memberId.trim().toUpperCase(),
          activationCode: activationCode.trim().toUpperCase(),
          newPassword,
        });
        const ok = typeof result === 'boolean' ? result : result?.success;
        const msg = typeof result === 'object' ? result?.message : undefined;
        if (ok) {
          setMemberSuccess('Account activated successfully! Logging you into the Member Portal...');
        } else {
          setMemberError(msg || 'Invalid or expired activation code. Request a code from the Choir Secretary or Provost.');
        }
      } else if (memberView === 'reset') {
        if (newPassword.length < 6) {
          setMemberError('Password must be at least 6 characters long.');
          setMemberLoading(false);
          return;
        }
        if (newPassword !== confirmPassword) {
          setMemberError('Passwords do not match.');
          setMemberLoading(false);
          return;
        }
        const ok = await onMemberResetPassword({
          memberId: memberId.trim().toUpperCase(),
          resetToken: resetToken.trim().toUpperCase(),
          newPassword,
        });
        if (ok) {
          setMemberSuccess('Password reset successfully! Please sign in with your new password.');
          setMemberView('login');
          setMemberPassword('');
        } else {
          setMemberError('Invalid or expired reset token. Please obtain a fresh reset token from an executive officer.');
        }
      }
    } catch (err: any) {
      setMemberError(err.message || 'Error communicating with server.');
    } finally {
      setMemberLoading(false);
    }
  };

  // Handle Executive Login
  const handleExecSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExecError('');
    setExecLoading(true);

    try {
      if (!hasAdminAccount) {
        // Bootstrap Mode
        if (bootstrapPassword.length < 6) {
          setExecError('Administrator password must be at least 6 characters.');
          setExecLoading(false);
          return;
        }
        if (bootstrapPassword !== bootstrapConfirmPassword) {
          setExecError('Passwords do not match.');
          setExecLoading(false);
          return;
        }

        const ok = await onExecutiveBootstrap({
          fullName: bootstrapFullName.trim(),
          username: bootstrapUsername.trim().toLowerCase(),
          password: bootstrapPassword,
          position: bootstrapPosition,
        });

        if (ok) {
          setShowExecModal(false);
        } else {
          setExecError('Failed to register initial administrator.');
        }
      } else {
        // Standard Officer Username + Password Login
        const ok = await onExecutiveLogin({
          username: execUsername.trim().toLowerCase(),
          password: execPassword,
        });

        if (ok) {
          setShowExecModal(false);
        } else {
          setExecError('Invalid username or password. Please verify your officer credentials.');
        }
      }
    } catch (err: any) {
      setExecError(err.message || 'Authentication failed.');
    } finally {
      setExecLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Liturgical Parish Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={settings.parishLogoUrl || '/assets/aistudio/omph_37e5c155.jpg'}
              alt="OMPH Parish Seal"
              className="w-10 h-10 rounded-full object-cover border border-amber-300 shadow-xs shrink-0"
            />
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight leading-tight">
                {settings.parishName || 'Our Mother of Perpetual Help Catholic Parish'}
              </div>
              <div className="text-[11px] text-amber-900/80 font-medium flex items-center gap-2">
                <span>{settings.choirName || 'OMPH CHOIR'}</span>
                <span className="text-slate-300">·</span>
                <span className="hidden sm:inline text-slate-500">{settings.diocese || 'Catholic Diocese of Ilorin'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Public Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Full-width Responsive Choir Hero Banner (1.69:1 aspect ratio) */}
        <ChoirHeroBanner
          settings={settings}
          totalMembers={totalMembers}
          activeSession={activeSession}
          nextSession={nextSession}
          mode="member"
        />

        {/* Central Member Portal Login Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Parish & Ministry Profile Information */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                <Music className="w-4 h-4 text-amber-600" />
                <span>St. Cecilia Choral Ministry</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Welcome to the Parish Choir Portal
              </h2>

              {/* Liturgical Patron & Motto */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Patron Saint:</span>{' '}
                    <span className="text-slate-600">{settings.patronSaint || 'St. Cecilia'} (Virgin & Martyr, Feast Day: {settings.feastDay || 'Nov 22'})</span>
                  </div>
                </div>

                {settings.choirMotto && (
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">Motto:</span>{' '}
                      <span className="text-slate-600 italic">“{settings.choirMotto}”</span>
                    </div>
                  </div>
                )}

                {activeSession && activeSession.sessionStatus === 'In Progress' ? (
                  <div className="flex items-start gap-2.5 p-3 bg-emerald-50 border border-emerald-300 rounded-xl">
                    <Clock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Rehearsal In Progress: {activeSession.activityType}
                      </div>
                      <div className="text-[11px] text-emerald-900 mt-0.5">
                        Call Time was {activeSession.requiredArrivalTime} ({activeSession.date}) · Currently underway in Parish Choir Gallery.
                      </div>
                    </div>
                  </div>
                ) : nextSession ? (
                  <div className="flex items-start gap-2.5 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-950 text-xs">
                        Next Call-Time: {nextSession.activityType}
                      </div>
                      <div className="text-[11px] text-amber-900/80 mt-0.5">
                        {nextSession.date} at {nextSession.requiredArrivalTime}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Column: Central Member Sign In & Registration Card */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
              {/* Card Header & Tabs */}
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Chorister Member Access
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                    {memberView === 'login' ? 'Sign In' : memberView === 'activate' ? 'Activation' : 'Reset'}
                  </span>
                </div>

                {/* Sub-tab selection */}
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMemberView('login');
                      setMemberError('');
                      setMemberSuccess('');
                    }}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition text-center ${
                      memberView === 'login' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Member Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMemberView('activate');
                      setMemberError('');
                      setMemberSuccess('');
                    }}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition text-center ${
                      memberView === 'activate' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    First-Time Activation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMemberView('reset');
                      setMemberError('');
                      setMemberSuccess('');
                    }}
                    className={`py-1.5 px-2 rounded-lg font-semibold transition text-center ${
                      memberView === 'reset' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Forgot Password
                  </button>
                </div>
              </div>

              {/* Status & Error Messages */}
              {memberError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{memberError}</span>
                </div>
              )}

              {memberSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{memberSuccess}</span>
                </div>
              )}

              {/* Form Body */}
              <form onSubmit={handleMemberSubmit} className="space-y-4 text-xs">
                {/* 1. MEMBER LOGIN VIEW */}
                {memberView === 'login' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Chorister Member ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value.toUpperCase())}
                        placeholder="e.g. CHO-S01 or CHO-T04"
                        className="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      <HelpToggle label="Help" className="mt-1.5">
                        Enter the Member ID issued by the Choir Secretary (for example, <span className="font-mono">CHO-S01</span>).
                      </HelpToggle>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700">Password *</label>
                        <button
                          type="button"
                          onClick={() => setMemberView('reset')}
                          className="text-[11px] text-blue-700 hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showMemberPassword ? 'text' : 'password'}
                          required
                          value={memberPassword}
                          onChange={(e) => setMemberPassword(e.target.value)}
                          placeholder="Enter your confidential password"
                          className="w-full border border-slate-300 rounded-xl p-3 pr-10 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMemberPassword(!showMemberPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          aria-label="Toggle password visibility"
                        >
                          {showMemberPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={memberLoading}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {memberLoading ? 'Authenticating...' : 'Sign In to Member Portal'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* 2. FIRST-TIME MEMBER ACTIVATION VIEW */}
                {memberView === 'activate' && (
                  <>
                    <HelpToggle label="Help: First-time activation">
                      Enter your Member ID and the single-use activation code (<code className="font-mono font-bold">ACT-XXXXXX</code>) issued by the Choir Provost or Secretary.
                    </HelpToggle>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Chorister Member ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value.toUpperCase())}
                        placeholder="e.g. CHO-S01"
                        className="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Single-Use Activation Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={activationCode}
                        onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                        placeholder="e.g. ACT-A1B2C3"
                        className="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Create Password * (min 6 chars)
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            className="w-full border border-slate-300 rounded-xl p-3 pr-10 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Confirm Password *
                        </label>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={memberLoading}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {memberLoading ? 'Activating Account...' : 'Complete Activation & Sign In'}
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* 3. FORGOT PASSWORD / RESET TOKEN VIEW */}
                {memberView === 'reset' && (
                  <>
                    <HelpToggle label="Help: Password reset">
                      Request a single-use reset token (<code className="font-mono font-bold">RST-XXXXXX</code>) from an executive officer, then enter your Member ID and new password below.
                    </HelpToggle>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Chorister Member ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value.toUpperCase())}
                        placeholder="e.g. CHO-S01"
                        className="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Single-Use Reset Token *
                      </label>
                      <input
                        type="text"
                        required
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value.toUpperCase())}
                        placeholder="e.g. RST-X8Y9Z0"
                        className="w-full border border-slate-300 rounded-xl p-3 text-xs font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          New Password * (min 6 chars)
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password"
                            className="w-full border border-slate-300 rounded-xl p-3 pr-10 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Confirm New Password *
                        </label>
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={memberLoading}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {memberLoading ? 'Resetting Password...' : 'Save New Password & Sign In'}
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Discreet Public Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-bold text-slate-800">
              {settings.parishName || 'Our Mother of Perpetual Help Catholic Parish'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {settings.choirName} · {settings.diocese || 'Catholic Diocese of Ilorin, Kwara State, Nigeria'}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Discreet Executive Entrance in footer */}
            <button
              type="button"
              onClick={() => {
                setExecError('');
                setShowExecModal(true);
              }}
              className="text-slate-400 hover:text-slate-800 inline-flex items-center gap-1 transition text-[11px] font-semibold cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              Office Access
            </button>
          </div>
        </div>
      </footer>

      {/* ========================================================
          EXECUTIVE OFFICE LOGIN / BOOTSTRAP MODAL
          Strictly single authentication: Individual Username + Password
          No shared PIN login fallback.
          ======================================================== */}
      {showExecModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[90dvh] overflow-y-auto overscroll-contain my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-lg">
                  <Shield className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {hasAdminAccount ? 'Executive Office Console Access' : 'Initial Administrator Setup'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExecModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {execError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{execError}</span>
              </div>
            )}

            <form onSubmit={handleExecSubmit} className="space-y-4 text-xs">
              {!hasAdminAccount ? (
                /* BOOTSTRAP INITIAL ADMIN REGISTRATION */
                <>
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      First-Time System Initialization
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      No executive accounts are currently provisioned in production. Create the master officer account below.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Administrator Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={bootstrapFullName}
                      onChange={(e) => setBootstrapFullName(e.target.value)}
                      placeholder="e.g. Sir Anthony K. Nwosu / Engr. Emmanuel Adeleke"
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Executive Position *
                      </label>
                      <select
                        value={bootstrapPosition}
                        onChange={(e) => setBootstrapPosition(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-white text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value="Choir Master">Choir Master</option>
                        <option value="Provost">Provost</option>
                        <option value="Secretary">Secretary</option>
                        <option value="Treasurer">Treasurer</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        value={bootstrapUsername}
                        onChange={(e) => setBootstrapUsername(e.target.value.toLowerCase())}
                        placeholder="e.g. choirmaster"
                        className="w-full border border-slate-300 rounded-xl p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Password * (min 6 chars)
                      </label>
                      <div className="relative">
                        <input
                          type={showBootstrapPassword ? 'text' : 'password'}
                          required
                          value={bootstrapPassword}
                          onChange={(e) => setBootstrapPassword(e.target.value)}
                          placeholder="Confidential password"
                          className="w-full border border-slate-300 rounded-xl p-2.5 pr-9 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowBootstrapPassword(!showBootstrapPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showBootstrapPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type={showBootstrapPassword ? 'text' : 'password'}
                        required
                        value={bootstrapConfirmPassword}
                        onChange={(e) => setBootstrapConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowExecModal(false)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={execLoading}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {execLoading ? 'Initializing...' : 'Bootstrap Administrator Account'}
                    </button>
                  </div>
                </>
              ) : (
                /* STANDARD OFFICER USERNAME + PASSWORD LOGIN */
                <>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">
                        Executive Username *
                      </label>
                      <span className="text-[10px] text-slate-400">Quick Select:</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        { u: 'choirmaster', label: 'Choir Master' },
                        { u: 'provost', label: 'Provost' },
                        { u: 'treasurer', label: 'Treasurer' },
                        { u: 'secretary', label: 'Secretary' },
                      ].map((item) => (
                        <button
                          key={item.u}
                          type="button"
                          onClick={() => {
                            setExecUsername(item.u);
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer ${
                            execUsername === item.u 
                              ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      required
                      value={execUsername}
                      onChange={(e) => setExecUsername(e.target.value.toLowerCase())}
                      placeholder="e.g. choirmaster / provost / secretary / treasurer"
                      className="w-full border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Individual Officer Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showExecPassword ? 'text' : 'password'}
                        required
                        value={execPassword}
                        onChange={(e) => setExecPassword(e.target.value)}
                        placeholder="Enter your confidential officer password"
                        className="w-full border border-slate-300 rounded-xl p-3 pr-10 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowExecPassword(!showExecPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label="Toggle password visibility"
                      >
                        {showExecPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowExecModal(false)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={execLoading}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {execLoading ? 'Authenticating...' : 'Unlock Executive Console'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
