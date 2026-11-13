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
  LayoutDashboard,
  User,
  Shield,
  Key,
  ChevronRight
} from 'lucide-react';
import { SystemSettings, ChoristerAccount, ExecutiveAccount } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isExecutiveUnlocked: boolean;
  onUnlockExecutive: (pin: string) => boolean;
  onLockExecutive: () => void;
  settings: SystemSettings;
  activeSessionName?: string;
  overdueCount: number;
  currentMember?: ChoristerAccount | null;
  currentExecutive?: ExecutiveAccount | null;
  onMemberLogin?: (credentials: { memberId: string; password: string }) => Promise<boolean>;
  onMemberActivate?: (data: { memberId: string; activationCode: string; newPassword: string }) => Promise<boolean | { success: boolean; message?: string }>;
  onMemberResetPassword?: (data: { memberId: string; resetToken: string; newPassword: string }) => Promise<boolean>;
  onMemberLogout?: () => void;
  onExecutiveLogin?: (credentials: { username: string; password: string }) => Promise<boolean>;
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
  currentMember,
  currentExecutive,
  onMemberLogin,
  onMemberActivate,
  onMemberResetPassword,
  onMemberLogout,
  onExecutiveLogin,
}) => {
  // Executive Modal state
  const [showExecutiveModal, setShowExecutiveModal] = useState(false);
  const [execLoginMode, setExecLoginMode] = useState<'account' | 'pin'>('account');
  const [execUsername, setExecUsername] = useState('provost');
  const [execPassword, setExecPassword] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [execError, setExecError] = useState('');
  const [execLoading, setExecLoading] = useState(false);

  // Member Modal state
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberTab, setMemberTab] = useState<'login' | 'activate' | 'reset'>('login');
  const [memberIdInput, setMemberIdInput] = useState('');
  const [memberPasswordInput, setMemberPasswordInput] = useState('');
  const [activationCodeInput, setActivationCodeInput] = useState('');
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);

  // Executive Login Handler
  const handleExecutiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExecError('');
    setExecLoading(true);

    try {
      if (execLoginMode === 'pin') {
        const ok = onUnlockExecutive(pinInput);
        if (ok) {
          setShowExecutiveModal(false);
          setPinInput('');
          setActiveTab('dashboard');
        } else {
          setExecError('Incorrect PIN.');
        }
      } else {
        if (onExecutiveLogin) {
          const success = await onExecutiveLogin({
            username: execUsername,
            password: execPassword,
          });
          if (success) {
            setShowExecutiveModal(false);
            setExecPassword('');
            setActiveTab('dashboard');
          } else {
            setExecError('Invalid officer credentials. Please verify your confidential password.');
          }
        } else {
          // Fallback check
          const ok = onUnlockExecutive(execPassword);
          if (ok) {
            setShowExecutiveModal(false);
            setExecPassword('');
            setActiveTab('dashboard');
          } else {
            setExecError('Invalid password or PIN.');
          }
        }
      }
    } catch (err: any) {
      setExecError(err.message || 'Authentication error.');
    } finally {
      setExecLoading(false);
    }
  };

  // Member Login Handler
  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberError('');
    setMemberSuccess('');
    setMemberLoading(true);

    try {
      if (memberTab === 'login') {
        if (!onMemberLogin) {
          setMemberError('Login service is starting up.');
          return;
        }
        const success = await onMemberLogin({
          memberId: memberIdInput.trim().toUpperCase(),
          password: memberPasswordInput,
        });
        if (success) {
          setShowMemberModal(false);
          setMemberPasswordInput('');
        } else {
          setMemberError('Invalid Member ID or password. If this is your first time, click "Activate Account" above.');
        }
      } else if (memberTab === 'activate') {
        if (!newPasswordInput || newPasswordInput.length < 6) {
          setMemberError('New password must be at least 6 characters long.');
          return;
        }
        if (newPasswordInput !== confirmPasswordInput) {
          setMemberError('Passwords do not match.');
          return;
        }
        if (!onMemberActivate) return;

        const result = await onMemberActivate({
          memberId: memberIdInput.trim().toUpperCase(),
          activationCode: activationCodeInput.trim().toUpperCase(),
          newPassword: newPasswordInput,
        });
        const success = typeof result === 'boolean' ? result : result?.success;
        const msg = typeof result === 'object' ? result?.message : undefined;

        if (success) {
          setMemberSuccess('Account activated successfully! You are now logged in.');
          setTimeout(() => {
            setShowMemberModal(false);
            setActivationCodeInput('');
            setNewPasswordInput('');
            setConfirmPasswordInput('');
          }, 1500);
        } else {
          setMemberError(msg || 'Activation failed. Please confirm your Member ID and single-use activation code (`ACT-XXXXXX`).');
        }
      } else if (memberTab === 'reset') {
        if (!newPasswordInput || newPasswordInput.length < 6) {
          setMemberError('Password must be at least 6 characters.');
          return;
        }
        if (newPasswordInput !== confirmPasswordInput) {
          setMemberError('Passwords do not match.');
          return;
        }
        if (!onMemberResetPassword) return;

        const success = await onMemberResetPassword({
          memberId: memberIdInput.trim().toUpperCase(),
          resetToken: resetTokenInput.trim().toUpperCase(),
          newPassword: newPasswordInput,
        });

        if (success) {
          setMemberSuccess('Password reset successfully! Please sign in with your new password.');
          setTimeout(() => {
            setMemberTab('login');
            setMemberSuccess('');
            setResetTokenInput('');
            setNewPasswordInput('');
            setConfirmPasswordInput('');
          }, 1500);
        } else {
          setMemberError('Reset failed. Token may be invalid or expired (tokens expire after 1 hour). Contact your Provost.');
        }
      }
    } catch (err: any) {
      setMemberError(err.message || 'An error occurred during authentication.');
    } finally {
      setMemberLoading(false);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        {/* Subtle top notification bar */}
        <div className="bg-amber-50/80 border-b border-amber-100 px-4 py-1.5 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
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
            {/* Member Auth status */}
            {currentMember ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  <User className="w-3 h-3 text-blue-600" />
                  {currentMember.fullName} ({currentMember.memberId})
                </span>
                {onMemberLogout && (
                  <button
                    onClick={onMemberLogout}
                    className="text-xs text-slate-500 hover:text-slate-900 font-medium underline transition"
                  >
                    Log Out
                  </button>
                )}
              </div>
            ) : (
              !isExecutiveUnlocked && (
                <button
                  onClick={() => {
                    setMemberTab('login');
                    setShowMemberModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded transition shadow-2xs"
                >
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Chorister Portal Sign In
                </button>
              )
            )}

            {/* Executive Access status (only shown when Executive Console is unlocked) */}
            {isExecutiveUnlocked && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  <Unlock className="w-3 h-3 text-emerald-600" />
                  Executive Active: {currentExecutive ? `${currentExecutive.name} (${currentExecutive.role})` : 'Console Unlocked'}
                </span>
                <button
                  onClick={onLockExecutive}
                  className="text-xs text-slate-500 hover:text-slate-900 font-medium underline transition"
                >
                  Lock
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Title & Brand Bar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img
                src={settings.parishLogoUrl || '/assets/aistudio/omph_37e5c155.jpg'}
                alt="Parish Seal"
                className="w-9 h-9 rounded-full object-cover border border-amber-300 shadow-xs"
              />
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  {settings.choirName}
                </h1>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  {isExecutiveUnlocked ? 'Provost & Executive Ministry Management' : 'Chorister Ministry & Parish Choral Portal'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="hidden md:flex items-center gap-2 text-slate-600">
                <span className="text-slate-400">Diocese:</span>
                <span className="font-semibold text-slate-800">{settings.diocese || 'Catholic Diocese of Ilorin'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================
          EXECUTIVE LOGIN MODAL (Individual Accounts + PIN Fallback)
          ======================================================== */}
      {showExecutiveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Executive Console Login</h3>
              </div>
              <button 
                onClick={() => setShowExecutiveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutiveSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Executive Official Position / Username *
                </label>
                <div className="space-y-1.5">
                  <select
                    value={execUsername}
                    onChange={(e) => setExecUsername(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    <option value="choirmaster">Choir Master — {settings.choirMasterName || 'Unassigned'}</option>
                    <option value="provost">Provost — {settings.provostName || 'Unassigned'}</option>
                    <option value="asstchoirmaster">Asst. Choir Master — {settings.assistantChoirMasterName || 'Unassigned'}</option>
                    <option value="asstprovost">Asst. Provost — {settings.assistantProvostName || 'Unassigned'}</option>
                    <option value="secretary">Secretary — {settings.secretaryName || 'Unassigned'}</option>
                    <option value="financialsecretary">Financial Secretary — {settings.financialSecretaryName || 'Unassigned'}</option>
                    <option value="treasurer">Treasurer — {settings.treasurerName || 'Unassigned'}</option>
                    <option value="librarian">Choir Librarian — {settings.librarianName || 'Unassigned'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Individual Officer Password *
                </label>
                <input
                  type="password"
                  required
                  value={execPassword}
                  onChange={(e) => setExecPassword(e.target.value)}
                  placeholder="Enter your confidential password"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExecutiveModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={execLoading}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
                >
                  {execLoading ? 'Verifying...' : 'Unlock Console'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MEMBER AUTHENTICATION MODAL (Login, Activation, Reset)
          ======================================================== */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90dvh] overflow-y-auto overscroll-contain my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Chorister Personal Portal</h3>
              </div>
              <button 
                onClick={() => setShowMemberModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => {
                  setMemberTab('login');
                  setMemberError('');
                  setMemberSuccess('');
                }}
                className={`flex-1 py-1.5 rounded font-semibold transition ${
                  memberTab === 'login' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMemberTab('activate');
                  setMemberError('');
                  setMemberSuccess('');
                }}
                className={`flex-1 py-1.5 rounded font-semibold transition ${
                  memberTab === 'activate' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Activate Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMemberTab('reset');
                  setMemberError('');
                  setMemberSuccess('');
                }}
                className={`flex-1 py-1.5 rounded font-semibold transition ${
                  memberTab === 'reset' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Reset Password
              </button>
            </div>

            {memberError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-900 rounded-lg text-xs font-medium flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{memberError}</span>
              </div>
            )}

            {memberSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{memberSuccess}</span>
              </div>
            )}

            <form onSubmit={handleMemberSubmit} className="space-y-4 text-xs">
              {/* TAB 1: SIGN IN */}
              {memberTab === 'login' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Member ID or Registered Phone *
                    </label>
                    <input
                      type="text"
                      required
                      value={memberIdInput}
                      onChange={(e) => setMemberIdInput(e.target.value)}
                      placeholder="e.g. CHO-S01 or +234 803 123 4567"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700">
                        Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => setMemberTab('reset')}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <input
                      type="password"
                      required
                      value={memberPasswordInput}
                      onChange={(e) => setMemberPasswordInput(e.target.value)}
                      placeholder="Enter your personal password"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </>
              )}

              {/* TAB 2: FIRST-TIME ACTIVATION */}
              {memberTab === 'activate' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Your Member ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={memberIdInput}
                      onChange={(e) => setMemberIdInput(e.target.value)}
                      placeholder="e.g. CHO-S01"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Single-Use Activation Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={activationCodeInput}
                      onChange={(e) => setActivationCodeInput(e.target.value)}
                      placeholder="e.g. ACT-49A8F2"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Provided by the Choir Secretary or Provost. Single-use only.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Choose Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Min. 6 chars"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TAB 3: RESET PASSWORD */}
              {memberTab === 'reset' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Your Member ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={memberIdInput}
                      onChange={(e) => setMemberIdInput(e.target.value)}
                      placeholder="e.g. CHO-S01"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono uppercase focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Single-Use Reset Token *
                    </label>
                    <input
                      type="text"
                      required
                      value={resetTokenInput}
                      onChange={(e) => setResetTokenInput(e.target.value)}
                      placeholder="e.g. RST-8B3C19"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Request this token from your Provost or Choir Master. Valid for 1 hour.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        New Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="Min. 6 chars"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={memberLoading}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs transition disabled:opacity-50"
                >
                  {memberLoading ? 'Processing...' : memberTab === 'login' ? 'Sign In to Portal' : memberTab === 'activate' ? 'Activate My Account' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
