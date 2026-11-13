import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Clock, 
  Calendar, 
  Music, 
  DollarSign, 
  User, 
  HeartHandshake, 
  Bell, 
  Eye, 
  LogOut, 
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';
import { SystemSettings, Chorister } from '../types';
import { ChoristerAvatar } from './ChoristerAvatar';

interface MemberSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  settings: SystemSettings;
  currentMember?: Chorister | null;
  isOpen: boolean;
  onClose: () => void;
  activeSessionName?: string;
  outstandingBalance?: number;
}

interface MemberNavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

interface MemberSection {
  id: string;
  title: string;
  items: MemberNavItem[];
}

export const MemberSidebar: React.FC<MemberSidebarProps> = ({
  activeTab,
  setActiveTab,
  onLogout,
  settings,
  currentMember,
  isOpen,
  onClose,
  activeSessionName,
  outstandingBalance = 0,
}) => {
  // Always-visible sections
  const primarySections: { title: string; items: MemberNavItem[] }[] = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'CHOIR ACTIVITIES',
      items: [
        { id: 'checkin', label: "Today's Check-in", icon: Clock },
        { id: 'attendance', label: 'My Attendance', icon: Eye },
        { id: 'schedule', label: 'Rehearsal Schedule', icon: Calendar },
        { id: 'announcements', label: 'Choir Announcements', icon: Bell },
      ],
    },
  ];

  // Collapsible dropdown sections (collapsed by default)
  const collapsibleSections: MemberSection[] = [
    {
      id: 'media',
      title: 'MEDIA & MUSIC',
      items: [
        { id: 'songs', label: 'Parish Songs & Scripts', icon: Music },
      ],
    },
    {
      id: 'account',
      title: 'PERSONAL ACCOUNT',
      items: [
        { 
          id: 'finance', 
          label: 'My Financial Account', 
          icon: DollarSign,
          badge: outstandingBalance > 0 ? `${settings.currencySymbol || '₦'}${outstandingBalance.toLocaleString()}` : undefined,
          badgeColor: 'bg-red-50 text-red-700 border border-red-200'
        },
        { id: 'profile', label: 'My Profile', icon: User },
      ],
    },
    {
      id: 'support',
      title: 'SUPPORT',
      items: [
        { id: 'excuse', label: 'Submit Absence Excuse', icon: CheckCircle2 },
        { id: 'complaint', label: 'Lodge Complaint / Dispute', icon: HeartHandshake },
      ],
    },
  ];

  // Track expanded state for collapsible dropdowns (all collapsed by default)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    media: false,
    account: false,
    support: false,
  });

  // Auto-expand section if an item within it is currently active
  useEffect(() => {
    collapsibleSections.forEach(section => {
      if (section.items.some(item => item.id === activeTab)) {
        setExpandedSections(prev => ({ ...prev, [section.id]: true }));
      }
    });
  }, [activeTab]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const handleItemClick = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

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
        {/* Parish Branding Header */}
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
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Rehearsal Indicator */}
          {activeSessionName && (
            <div className="mt-3 p-2 bg-amber-100/70 border border-amber-200 rounded-lg text-xs text-amber-950 flex items-center justify-between">
              <span className="font-semibold truncate">Active Rehearsal</span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded font-mono font-bold text-slate-900">
                LIVE
              </span>
            </div>
          )}
        </div>

        {/* Member Identity Profile Box */}
        {currentMember ? (
          <div 
            onClick={() => handleItemClick('profile')}
            className="px-4 py-3 bg-slate-50 hover:bg-amber-50/60 border-b border-slate-200/80 cursor-pointer transition group"
            title="Click to view & edit your profile"
          >
            <div className="flex items-center gap-2.5">
              <ChoristerAvatar
                fullName={currentMember.fullName}
                voicePart={currentMember.voicePart}
                photoUrl={currentMember.profilePhotoUrl}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 group-hover:text-amber-950 block truncate">
                  {currentMember.fullName}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">{currentMember.voicePart}</span>
                  <span>·</span>
                  <span className="font-mono text-slate-600">{currentMember.memberId}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 text-xs text-slate-600">
            Chorister Ministry Portal
          </div>
        )}

        {/* Vertical Navigation Sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 text-xs">
          {/* 1. Fully Visible Primary Sections (Overview & Choir Activities) */}
          {primarySections.map((section) => (
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition text-left cursor-pointer ${
                        isActive
                          ? 'bg-amber-100/80 text-slate-950 font-bold border border-amber-200/80 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 2. Expandable Dropdowns (Media & Music, Personal Account, Support) */}
          {collapsibleSections.map((section) => {
            const isExpanded = Boolean(expandedSections[section.id]);
            const hasActiveChild = section.items.some(item => item.id === activeTab);

            return (
              <div key={section.id} className="border-t border-slate-100 pt-3">
                {/* Collapsible Dropdown Header Button */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wider uppercase transition cursor-pointer select-none ${
                    hasActiveChild ? 'text-amber-900 bg-amber-50/60' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {section.title}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 transition-transform" />
                  )}
                </button>

                {/* Submenu items */}
                {isExpanded && (
                  <div className="space-y-0.5 mt-1 pl-1 transition-all duration-150 animate-in fade-in slide-in-from-top-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleItemClick(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium transition text-left cursor-pointer ${
                            isActive
                              ? 'bg-amber-100/80 text-slate-950 font-bold border border-amber-200/80 shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-slate-950' : 'text-slate-500'
                            }`} />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge !== undefined && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${item.badgeColor || 'bg-slate-200 text-slate-800'}`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer / Sign Out */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-2">
          <button
            onClick={onLogout}
            className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            Sign Out
          </button>

          <p className="text-[10px] text-center text-slate-400 italic">
            St. Cecilia Choral Ministry · OMPH Parish
          </p>
        </div>
      </aside>
    </>
  );
};
