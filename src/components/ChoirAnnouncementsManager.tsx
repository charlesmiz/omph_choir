import React, { useState } from 'react';
import { 
  Bell, 
  Share2, 
  Pin, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Plus
} from 'lucide-react';
import { ChoirAnnouncement, SystemSettings, ExecutiveAccount } from '../types';
import { HelpToggle } from './HelpToggle';

interface ChoirAnnouncementsManagerProps {
  announcements: ChoirAnnouncement[];
  onAddAnnouncement: (announcement: Omit<ChoirAnnouncement, 'announcementId' | 'postedAt' | 'whatsappSharesCount'>) => Promise<any>;
  settings: SystemSettings;
  currentExecutive?: ExecutiveAccount | null;
}

export const ChoirAnnouncementsManager: React.FC<ChoirAnnouncementsManagerProps> = ({
  announcements = [],
  onAddAnnouncement,
  settings,
  currentExecutive,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'All Choristers' | 'Probationers' | 'Full Members' | 'Section Leads'>('All Choristers');
  const [isPinned, setIsPinned] = useState(false);
  const [priority, setPriority] = useState<'Standard' | 'Urgent' | 'Liturgical'>('Standard');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      await onAddAnnouncement({
        title: title.trim(),
        content: content.trim(),
        authorName: currentExecutive?.name || settings.provostName || 'Executive Desk',
        authorRole: currentExecutive?.role || 'Provost',
        targetAudience,
        isPinned,
        priority,
        expiryDate: expiryDate || undefined,
      });

      setTitle('');
      setContent('');
      setIsPinned(false);
      setPriority('Standard');
      setExpiryDate('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create announcement:', err);
    } finally {
      setLoading(false);
    }
  };

  const shareToWhatsApp = (item: ChoirAnnouncement) => {
    const formattedMessage = `📢 *${settings.choirName.toUpperCase()} — OFFICIAL ANNOUNCEMENT*\n` +
      `*${item.title.toUpperCase()}*\n\n` +
      `${item.content}\n\n` +
      `📅 Posted: ${(item.postedAt || item.publicationTimestamp || new Date().toISOString()).slice(0, 10)} | By: ${item.authorName || 'Executive Desk'} (${item.authorRole || 'Officer'})\n` +
      `⛪ *${settings.parishName}*`;

    const encoded = encodeURIComponent(formattedMessage);
    const waUrl = `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');

    // Notify backend tracking
    fetch('/api/announcements/share-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcementId: item.announcementId }),
    }).catch(() => {});
  };

  const copyAnnouncementText = (item: ChoirAnnouncement) => {
    const formatted = `${item.title.toUpperCase()}\n\n${item.content}\n\n— ${item.authorName} (${item.authorRole}), ${settings.choirName}`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(item.announcementId);
    setTimeout(() => setCopiedId(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-700">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Parish Choir Official Communications Desk
              </h2>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </button>
        </div>
      </div>

      <HelpToggle label="About WhatsApp sharing">
        Announcements can be formatted and shared to WhatsApp using click-to-chat dispatch without automated messaging fees.
      </HelpToggle>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Announcements Published Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Click the "New Announcement" button above to publish liturgical notices, rehearsal requirements, or official directives for choristers.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-4 h-4" /> Create First Notice
            </button>
          </div>
        ) : (
          announcements.map((item) => {
            const isUrgent = item.priority === 'Urgent';
            const isLiturgical = item.priority === 'Liturgical';

            return (
              <div 
                key={item.announcementId}
                className={`bg-white rounded-xl border p-5 transition shadow-xs ${
                  item.isPinned 
                    ? 'border-amber-300 ring-1 ring-amber-200/80' 
                    : isUrgent 
                      ? 'border-red-300 bg-red-50/20' 
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                        <Pin className="w-2.5 h-2.5" /> PINNED DIRECTIVE
                      </span>
                    )}

                    {isUrgent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full border border-red-200">
                        <AlertCircle className="w-2.5 h-2.5" /> URGENT
                      </span>
                    )}

                    {isLiturgical && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                        <Sparkles className="w-2.5 h-2.5" /> LITURGICAL
                      </span>
                    )}

                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      Audience: {item.targetAudience}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {(item.postedAt || item.publicationTimestamp || new Date().toISOString()).slice(0, 16).replace('T', ' ')}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-slate-600">
                      By: {item.authorName} ({item.authorRole})
                    </span>
                  </div>
                </div>

                {/* Title & Body */}
                <div className="py-3">
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {item.content}
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    {item.expiryDate && (
                      <span>Expires: {item.expiryDate}</span>
                    )}
                    {item.whatsappSharesCount !== undefined && item.whatsappSharesCount > 0 && (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                        Shared {item.whatsappSharesCount} time(s) on WhatsApp
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyAnnouncementText(item)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium text-xs transition flex items-center gap-1"
                    >
                      {copiedId === item.announcementId ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Copied!
                        </>
                      ) : (
                        'Copy Text'
                      )}
                    </button>

                    <button
                      onClick={() => shareToWhatsApp(item)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share to WhatsApp Group
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xs z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-y-auto max-h-[90dvh] overscroll-contain my-auto">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Compose Official Parish Choir Announcement
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Solemnity of Christ the King — Mandatory Choir Robing & Rehearsal Schedule"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Directive Body / Liturgical Notice *
                </label>
                <textarea
                  required
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter full announcement details, call times, required robes, tonic sol-fa scores to revise, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Target Chorister Group
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e: any) => setTargetAudience(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="All Choristers">All Choristers</option>
                    <option value="Full Members">Full Members Only</option>
                    <option value="Probationers">Probationers Only</option>
                    <option value="Section Leads">Section Leads / Conductors</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Priority Classification
                  </label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Standard">Standard Directive</option>
                    <option value="Liturgical">Liturgical / Feast Day</option>
                    <option value="Urgent">Urgent / Action Required</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Optional Expiry Date
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPinned}
                      onChange={(e) => setIsPinned(e.target.checked)}
                      className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                    />
                    <span className="font-semibold text-slate-700">
                      Pin to Top of Member Portal
                    </span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition disabled:opacity-50"
                >
                  {loading ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
