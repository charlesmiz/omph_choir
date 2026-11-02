import React, { useState } from 'react';
import { 
  Music, 
  Search, 
  Plus, 
  BookOpen, 
  FileText, 
  Upload, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Copy, 
  Printer, 
  Download, 
  Tag, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { ChoirSong, LiturgicalCategory, SystemSettings } from '../types';

interface SongLibraryProps {
  songs: ChoirSong[];
  onAddSong: (song: ChoirSong) => void;
  onUpdateSong: (song: ChoirSong) => void;
  onDeleteSong: (songId: string) => void;
  isExecutive: boolean;
  settings?: SystemSettings;
}

const CATEGORIES: LiturgicalCategory[] = [
  'Entrance Hymn',
  'Kyrie & Gloria',
  'Responsorial Psalm',
  'Gospel Acclamation / Alleluia',
  'Offertory',
  'Sanctus & Benedictus',
  'Agnus Dei',
  'Communion',
  'Marian Hymn / Antiphon',
  'Recessional / Dismissal',
  'Solemn Feast / Easter / Christmas',
  'Lent & Holy Week',
  'Choral Anthem'
];

export const SongLibrary: React.FC<SongLibraryProps> = ({
  songs,
  onAddSong,
  onUpdateSong,
  onDeleteSong,
  isExecutive,
  settings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSong, setSelectedSong] = useState<ChoirSong | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSong, setEditingSong] = useState<ChoirSong | null>(null);
  const [copiedType, setCopiedType] = useState<'lyrics' | 'solfa' | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [category, setCategory] = useState<LiturgicalCategory>('Marian Hymn / Antiphon');
  const [liturgicalSeason, setLiturgicalSeason] = useState('Ordinary Time');
  const [keySignature, setKeySignature] = useState('G Major');
  const [solfaNotes, setSolfaNotes] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [sheetMusicUrl, setSheetMusicUrl] = useState('');
  const [sheetFileName, setSheetFileName] = useState('');
  const [formError, setFormError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const filteredSongs = songs.filter(s => {
    const matchesSearch = 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.composer && s.composer.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.scriptText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.solfaNotes && s.solfaNotes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');

    if (file.size > 8 * 1024 * 1024) {
      setFormError('File size exceeds 8MB. Please select an image or score under 8MB.');
      return;
    }

    setSheetFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSheetMusicUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenAdd = () => {
    setEditingSong(null);
    setTitle('');
    setComposer('');
    setCategory('Marian Hymn / Antiphon');
    setLiturgicalSeason('Ordinary Time');
    setKeySignature('G Major');
    setSolfaNotes('');
    setScriptText('');
    setSheetMusicUrl('');
    setSheetFileName('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (song: ChoirSong) => {
    setEditingSong(song);
    setTitle(song.title);
    setComposer(song.composer || '');
    setCategory(song.category);
    setLiturgicalSeason(song.liturgicalSeason || 'Ordinary Time');
    setKeySignature(song.keySignature || '');
    setSolfaNotes(song.solfaNotes || '');
    setScriptText(song.scriptText);
    setSheetMusicUrl(song.sheetMusicUrl || '');
    setSheetFileName(song.sheetMusicUrl ? 'Uploaded score attached' : '');
    setShowAddModal(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scriptText.trim()) return;

    if (editingSong) {
      const updated: ChoirSong = {
        ...editingSong,
        title: title.trim(),
        composer: composer.trim() || undefined,
        category,
        liturgicalSeason: liturgicalSeason.trim() || undefined,
        keySignature: keySignature.trim() || undefined,
        solfaNotes: solfaNotes.trim() || undefined,
        scriptText: scriptText.trim(),
        sheetMusicUrl: sheetMusicUrl || undefined,
      };
      onUpdateSong(updated);
      if (selectedSong?.songId === updated.songId) {
        setSelectedSong(updated);
      }
    } else {
      const newSong: ChoirSong = {
        songId: `SNG-${Date.now()}`,
        title: title.trim(),
        composer: composer.trim() || undefined,
        category,
        liturgicalSeason: liturgicalSeason.trim() || undefined,
        keySignature: keySignature.trim() || undefined,
        solfaNotes: solfaNotes.trim() || undefined,
        scriptText: scriptText.trim(),
        sheetMusicUrl: sheetMusicUrl || undefined,
        uploadedBy: settings?.choirMasterName || 'Choir Executive',
        dateAdded: new Date().toISOString().split('T')[0],
      };
      onAddSong(newSong);
    }

    setShowAddModal(false);
  };

  const handleCopy = (text: string, type: 'lyrics' | 'solfa') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-100 text-amber-900">
              <Music className="w-5 h-5 text-slate-900" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Parish Choir Song Library & Music Scripts
              </h2>
              <p className="text-xs text-slate-500">
                Official liturgical repertoire, tonic sol-fa notations, stanzas & sheet scores of {settings?.choirName || 'OMPH Choir'}
              </p>
            </div>
          </div>
        </div>

        {isExecutive && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            Add Parish Song / Script
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hymns by title, composer, lyric phrase, or solfa notes..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="sm:w-64">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              aria-label="Filter by Liturgical Part"
              className="w-full py-2 px-3 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
            >
              <option value="All">All Liturgical Parts ({songs.length})</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick category pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition ${
              selectedCategory === 'All' 
                ? 'bg-slate-900 text-white font-bold' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Repertoire
          </button>
          {CATEGORIES.slice(0, 6).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition ${
                selectedCategory === cat 
                  ? 'bg-slate-900 text-white font-bold' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Song Grid */}
      {filteredSongs.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No hymns or songs match your search</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try searching with a different hymn title, composer name, or reset the category filter.
          </p>
          {isExecutive && (
            <button
              onClick={handleOpenAdd}
              className="bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg"
            >
              Add This Song Now
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSongs.map((song) => (
            <div
              key={song.songId}
              onClick={() => setSelectedSong(song)}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-400 transition cursor-pointer shadow-2xs hover:shadow-sm flex flex-col justify-between group"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200/70">
                    {song.category}
                  </span>
                  {song.sheetMusicUrl && (
                    <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-medium">
                      Score Attached
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-900 transition line-clamp-1">
                  {song.title}
                </h3>

                <p className="text-[11px] text-slate-500 line-clamp-1">
                  Composer: <span className="font-medium text-slate-700">{song.composer || 'Traditional Catholic'}</span>
                </p>

                {/* Excerpt of lyrics */}
                <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-md font-serif italic border border-slate-100">
                  {song.scriptText.split('\n')[0]}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{song.keySignature ? `Key: ${song.keySignature}` : 'Score & Solfa'}</span>
                <span className="text-slate-900 font-semibold group-hover:underline flex items-center gap-1">
                  Open Song Script →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Song Detail & Script Reader Modal */}
      {selectedSong && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 my-auto">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between gap-3 bg-slate-50">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-200 px-2.5 py-0.5 rounded">
                    {selectedSong.category}
                  </span>
                  {selectedSong.liturgicalSeason && (
                    <span className="text-[11px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {selectedSong.liturgicalSeason}
                    </span>
                  )}
                  {selectedSong.keySignature && (
                    <span className="text-[11px] font-mono text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      Key: {selectedSong.keySignature}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  {selectedSong.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Composer: <span className="font-semibold text-slate-800">{selectedSong.composer || 'Traditional Catholic Hymnal'}</span> · Added to parish archive: {selectedSong.dateAdded}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isExecutive && (
                  <>
                    <button
                      onClick={() => handleOpenEdit(selectedSong)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
                      title="Edit song script"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                        title="Delete song"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-red-100 p-1 rounded-lg">
                        <button
                          onClick={() => {
                            onDeleteSong(selectedSong.songId);
                            setSelectedSong(null);
                            setShowDeleteConfirm(false);
                          }}
                          className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="text-slate-600 text-[10px] px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                )}
                <button
                  onClick={() => setSelectedSong(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
                  title="Close reader"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">
              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs">
                <div className="text-slate-500 text-[11px]">
                  Parish Choral Repertoire Script
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(selectedSong.scriptText, 'lyrics')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                  >
                    {copiedType === 'lyrics' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedType === 'lyrics' ? 'Copied Lyrics!' : 'Copy Script'}
                  </button>

                  {selectedSong.solfaNotes && (
                    <button
                      onClick={() => handleCopy(selectedSong.solfaNotes || '', 'solfa')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                    >
                      {copiedType === 'solfa' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedType === 'solfa' ? 'Copied Solfa!' : 'Copy Solfa'}
                    </button>
                  )}

                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                    title="Print sheet"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                </div>
              </div>

              {/* Tonic Sol-fa Section */}
              {selectedSong.solfaNotes && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-amber-700" />
                      Tonic Sol-fa Notation
                    </h4>
                    <span className="text-[11px] text-slate-500">Choir Part Pitch</span>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-amber-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner border border-slate-800">
                    {selectedSong.solfaNotes}
                  </pre>
                </div>
              )}

              {/* Script & Lyrics Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-700" />
                  Liturgical Text & Lyrics
                </h4>
                <div className="p-4 sm:p-5 rounded-xl bg-amber-50/40 border border-amber-200/60 text-slate-900 font-serif text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {selectedSong.scriptText}
                </div>
              </div>

              {/* Uploaded Sheet Music Score Viewer */}
              {selectedSong.sheetMusicUrl && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-700" />
                      Attached Sheet Music / Score
                    </h4>
                    <a
                      href={selectedSong.sheetMusicUrl}
                      download={`${selectedSong.title}_Sheet_Score.png`}
                      className="text-xs text-amber-900 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Download Sheet
                    </a>
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2 flex justify-center">
                    <img
                      src={selectedSong.sheetMusicUrl}
                      alt={`${selectedSong.title} score`}
                      className="max-h-[500px] w-auto object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedSong(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2 rounded-lg transition"
              >
                Close Song
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Song Modal (Executive Only) */}
      {showAddModal && isExecutive && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto my-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-slate-900" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {editingSong ? 'Edit Parish Choir Song' : 'Add New Parish Choir Song & Script'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Song / Hymn Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Benedictus Sit Deus"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Composer / Arranger</label>
                  <input
                    type="text"
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    placeholder="e.g. G.F. Handel / Rev. Fr. Jude Nnam"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Liturgical Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as LiturgicalCategory)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Liturgical Season</label>
                  <input
                    type="text"
                    value={liturgicalSeason}
                    onChange={(e) => setLiturgicalSeason(e.target.value)}
                    placeholder="e.g. Ordinary Time / Easter"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Key Signature</label>
                  <input
                    type="text"
                    value={keySignature}
                    onChange={(e) => setKeySignature(e.target.value)}
                    placeholder="e.g. G Major (4/4)"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Tonic Solfa input */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tonic Sol-fa Notation (Optional)
                </label>
                <textarea
                  rows={3}
                  value={solfaNotes}
                  onChange={(e) => setSolfaNotes(e.target.value)}
                  placeholder="e.g. d : m | s : - : s | l : s | m : - : r"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Full Lyrics / Script */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Song Script / Lyrics (Verses & Chorus) *
                </label>
                <textarea
                  required
                  rows={6}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="Enter full text of the hymn, arranged in stanzas and chorus..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-serif text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* File upload for Sheet Music */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block font-semibold text-slate-700">
                  Upload Sheet Music Score Image (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    Choose Score Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {sheetFileName && (
                    <span className="text-xs text-slate-600 truncate max-w-xs">
                      {sheetFileName}
                    </span>
                  )}
                  {sheetMusicUrl && (
                    <button
                      type="button"
                      onClick={() => { setSheetMusicUrl(''); setSheetFileName(''); }}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2 rounded-lg transition"
                >
                  {editingSong ? 'Save Changes' : 'Save Song to Library'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
