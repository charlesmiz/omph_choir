import React from 'react';
import { 
  LayoutDashboard, 
  Clock, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  Calendar, 
  Music, 
  Settings, 
  Lock, 
  Database,
  FileCheck2,
  AlertCircle,
  X,
  ChevronRight,
  Shield,
  Church,
  Coins,
  Bell,
  History,
  CreditCard,
  KeyRound,
  HeartHandshake
} from 'lucide-react';
import { SystemSettings, ExecutiveRole, ExecutiveAccount } from '../types';

interface ExecutiveSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLockExecutive: () => void;
  settings: SystemSettings;
  overdueCount: number;
  pendingBankApprovalsCount?: number;
  welfareCount?: number;
  activeSessionName?: string;
  isOpen: boolean;
  onClose: () => void;
  currentRole?: ExecutiveRole;
  currentExecutive?: ExecutiveAccount | null;
  onOpenChangePassword?: () => void;
}

export const ExecutiveSidebar: React.FC<ExecutiveSidebarProps> = ({
  activeTab,
  setActiveTab,
  onLockExecutive,
  settings,
  overdueCount,
  pendingBankApprovalsCount = 0,
  welfareCount = 0,
  activeSessionName,
  isOpen,
  onClose,
  currentExecutive,
  onOpenChangePassword,
}) => {
  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'CHOIR OPERATIONS',
      items: [
        { id: 'attendance', label: 'Attendance Desk', icon: Clock },
        { id: 'schedule', label: 'Rehearsal Timetable', icon: Calendar },
        { id: 'roster', label: 'Chorister Roster', icon: Users },
        { 
          id: 'welfare', 
          label: 'Chorister Welfare & Follow-up', 
          icon: HeartHandshake,
          badge: welfareCount > 0 ? `${welfareCount} Follow-up` : undefined,
          badgeColor: 'bg-rose-600 text-white animate-pulse'
        },
        { id: 'announcements', label: 'Choir Bulletins & Directives', icon: Bell },
      ],
    },
    {
      title: 'FINANCIAL MANAGEMENT',
      items: [
        { id: 'finance', label: 'Fines & Cashier Desk', icon: DollarSign },
        { id: 'dues', label: 'Monthly Choir Dues', icon: Coins },
        { 
          id: 'discipline', 
          label: '21-Day Debt Discipline', 
          icon: ShieldCheck, 
          badge: overdueCount > 0 ? overdueCount : undefined,
          badgeColor: 'bg-red-600 text-white'
        },
      ],
    },
    {
      title: 'MUSIC & MEDIA',
      items: [
        { id: 'songs', label: 'Parish Songs & Scores', icon: Music },
      ],
    },
    {
      title: 'ADMINISTRATION & SECURITY',
      items: [
        { 
          id: 'settings', 
          label: 'Parish Setup & Bank Accounts', 
          icon: Settings,
          badge: pendingBankApprovalsCount > 0 ? `${pendingBankApprovalsCount} Approval` : undefined,
          badgeColor: 'bg-amber-500 text-white animate-pulse'
        },
        { id: 'audit-logs', label: 'Audit Trail & Accountability', icon: History },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const activeOfficerName = currentExecutive?.fullName || (currentExecutive as any)?.name || 'Executive Officer';
  const activeOfficerPosition = currentExecutive?.position || currentExecutive?.role || 'Executive';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Persistent Left Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 shadow-sm flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-10 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Parish Header */}
        <div className="p-4 border-b border-slate-200/80 bg-gradient-to-b from-amber-50/70 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={settings.parishLogoUrl || '/assets/aistudio/omph_37e5c155.jpg'}
                alt="Parish Seal"
                className="w-10 h-10 rounded-full object-cover border border-amber-300 shadow-xs shrink-0"
              />
              <div className="min-w-0">
                <span className="text-[10px] font-bold tracking-wider text-amber-900 uppercase block truncate">
                  {settings.diocese || 'Catholic Diocese of Ilorin'}
                </span>
                <h2 className="text-sm font-bold text-slate-900 truncate">
                  {settings.parishName}
                </h2>
                <p className="text-[11px] text-slate-500 truncate">
                  {settings.choirName}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Rehearsal Indicator in Sidebar */}
          {activeSessionName && (
            <div className="mt-3 p-2 bg-amber-100/70 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-center justify-between">
              <span className="font-semibold truncate">Active Rehearsal</span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded font-mono font-bold text-slate-900">
                LIVE
              </span>
            </div>
          )}
        </div>

        {/* Executive Identity & Role Badge — "WELCOME, [NAME] — [POSITION]" */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-600" /> Executive Console
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">
              VERIFIED
            </span>
          </div>

          <div className="bg-white p-2 rounded-lg border border-slate-200/90 shadow-2xs">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
              WELCOME,
            </div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {activeOfficerName}
            </div>
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide truncate">
              — {activeOfficerPosition}
            </div>
          </div>

          <div className="pt-0.5 flex items-center justify-between text-[11px] text-slate-500">
            <span>Official Assignment:</span>
            <span className="font-semibold text-slate-800">{activeOfficerPosition}</span>
          </div>

          {onOpenChangePassword && (
            <button
              type="button"
              onClick={onOpenChangePassword}
              className="w-full text-left text-[11px] text-amber-800 hover:text-amber-950 font-semibold flex items-center justify-between pt-1.5 border-t border-slate-200/80 cursor-pointer transition"
            >
              <span className="flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-amber-600" />
                Change Officer Password
              </span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 text-xs">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <span className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase block">
                {section.title}
              </span>

              <div className="space-y-0.5 mt-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition text-left ${
                        isActive
                          ? 'bg-amber-100/80 text-slate-950 font-bold border border-amber-200/80 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge !== undefined && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full shrink-0 ${item.badgeColor || 'bg-slate-200 text-slate-800'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Console Footer / Lock Action */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2">
          <button
            onClick={onLockExecutive}
            className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center justify-center gap-2 shadow-2xs"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            Lock Executive Console
          </button>

          <p className="text-[10px] text-center text-slate-400">
            Provost & Executive Ministry Desk
          </p>
        </div>
      </aside>
    </>
  );
};
