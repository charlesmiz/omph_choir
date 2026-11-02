import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Plus, 
  Calendar, 
  Maximize2, 
  Minimize2, 
  X, 
  Trash2, 
  Upload, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Tag
} from 'lucide-react';
import { ChoirGalleryItem, SystemSettings } from '../types';

interface ChoirGalleryProps {
  galleryItems: ChoirGalleryItem[];
  onAddPhoto: (item: ChoirGalleryItem) => void;
  onDeletePhoto: (photoId: string) => void;
  isExecutive: boolean;
  settings?: SystemSettings;
}

const CATEGORIES = [
  'All',
  'Solemnities & Feasts',
  'Robing & Inductions',
  'Rehearsals & Practices',
  'Choir Competitions',
  'Parish Events',
  'Retreats & Community'
] as const;

export const ChoirGallery: React.FC<ChoirGalleryProps> = ({
  galleryItems,
  onAddPhoto,
  onDeletePhoto,
  isExecutive,
  settings,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form state
  const [photoTitle, setPhotoTitle] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ChoirGalleryItem['category']>('Solemnities & Feasts');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const filteredPhotos = galleryItems.filter(item => {
    if (selectedCategory === 'All') return true;
    return item.category === selectedCategory;
  });

  // Global Escape key listener to close lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activePhotoIndex !== null) {
        if (e.key === 'Escape') {
          setActivePhotoIndex(null);
        } else if (e.key === 'ArrowRight') {
          handleNextPhoto();
        } else if (e.key === 'ArrowLeft') {
          handlePrevPhoto();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIndex, filteredPhotos.length]);

  const handleNextPhoto = () => {
    if (activePhotoIndex === null) return;
    setActivePhotoIndex((activePhotoIndex + 1) % filteredPhotos.length);
  };

  const handlePrevPhoto = () => {
    if (activePhotoIndex === null) return;
    setActivePhotoIndex((activePhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Photo size is too large (max 10MB). Please select a compressed image.');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageDataUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError('');
    if (!photoTitle.trim() || !imageDataUrl) {
      setUploadError('Please provide a photo title and select an image to upload.');
      return;
    }

    const newItem: ChoirGalleryItem = {
      photoId: `GAL-${Date.now()}`,
      title: photoTitle.trim(),
      caption: photoCaption.trim() || undefined,
      eventDate,
      category,
      imageUrl: imageDataUrl,
      uploadedBy: settings?.choirMasterName || 'Executive Desk',
      uploadedDate: new Date().toISOString().split('T')[0],
    };

    onAddPhoto(newItem);
    setShowUploadModal(false);
    setPhotoTitle('');
    setPhotoCaption('');
    setImageDataUrl('');
    setFileName('');
  };

  const currentActivePhoto = activePhotoIndex !== null ? filteredPhotos[activePhotoIndex] : null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-slate-900 border border-amber-200">
            <Camera className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Parish Choir Media & Photo Gallery
            </h2>
            <p className="text-xs text-slate-500">
              Visual archives, feast day liturgical vestments, ceremonies & celebrations of {settings?.choirName || 'OMPH Choir'}
            </p>
          </div>
        </div>

        {isExecutive && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            Upload Choir Photo
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
              selectedCategory === cat 
                ? 'bg-slate-900 text-white font-bold' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Photo Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
          <Camera className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No photos in this category</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Select another category or upload photos from recent parish masses, feasts, or rehearsals.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPhotos.map((photo, idx) => (
            <div
              key={photo.photoId}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col group"
            >
              <div 
                className="relative aspect-4/3 overflow-hidden bg-slate-900 cursor-pointer"
                onClick={() => setActivePhotoIndex(idx)}
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 bg-black/70 backdrop-blur-xs text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/20">
                    <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
                    View Full Photo
                  </span>
                </div>
                <div className="absolute top-2.5 left-2.5">
                  <span className="text-[10px] font-bold text-slate-900 bg-amber-300/90 backdrop-blur-xs px-2 py-0.5 rounded shadow-xs">
                    {photo.category}
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{photo.eventDate}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-900 transition line-clamp-1">
                    {photo.title}
                  </h3>
                  {photo.caption && (
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                      {photo.caption}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setActivePhotoIndex(idx)}
                    className="text-slate-900 font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    Open Gallery View →
                  </button>

                  {isExecutive && (
                    deletingPhotoId !== photo.photoId ? (
                      <button
                        onClick={() => setDeletingPhotoId(photo.photoId)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-red-100 p-0.5 rounded">
                        <button
                          onClick={() => {
                            onDeletePhoto(photo.photoId);
                            setDeletingPhotoId(null);
                          }}
                          className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeletingPhotoId(null)}
                          className="text-slate-600 text-[10px] px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Photo Lightbox Modal with Comprehensive Minimize Options */}
      {currentActivePhoto && activePhotoIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 select-none animate-in fade-in duration-200"
          onClick={() => setActivePhotoIndex(null)} // Click outside closes / minimizes
        >
          {/* Top Bar inside Lightbox */}
          <div 
            className="w-full max-w-6xl flex items-center justify-between text-white pb-3 z-10"
            onClick={(e) => e.stopPropagation()} // Don't trigger backdrop click
          >
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/aistudio/omph_37e5c155.jpg"
                alt="OMPH"
                className="w-6 h-6 rounded-full object-cover border border-amber-300"
              />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                  {currentActivePhoto.title}
                </h3>
                <span className="text-[11px] text-amber-200/80">
                  {currentActivePhoto.category} · {currentActivePhoto.eventDate} ({activePhotoIndex + 1} of {filteredPhotos.length})
                </span>
              </div>
            </div>

            {/* Top Minimize and Close Buttons */}
            <div className="flex items-center gap-2">
              <a
                href={currentActivePhoto.imageUrl}
                download={`${currentActivePhoto.title}.jpg`}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
                title="Download full quality photo"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </a>

              {/* Dedicated Minimize Button */}
              <button
                type="button"
                onClick={() => setActivePhotoIndex(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition shadow-sm"
                title="Minimize / Exit Full Screen (or press ESC)"
              >
                <Minimize2 className="w-4 h-4 text-slate-950" />
                <span>Minimize</span>
              </button>

              {/* Standard Close X Button */}
              <button
                type="button"
                onClick={() => setActivePhotoIndex(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition border border-slate-700"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Image Viewport with Previous & Next navigation */}
          <div 
            className="relative flex-1 w-full max-w-6xl flex items-center justify-center overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {filteredPhotos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevPhoto(); }}
                className="absolute left-2 sm:left-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/20 transition backdrop-blur-xs"
                title="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <div className="relative max-h-[75vh] max-w-full flex items-center justify-center">
              <img
                src={currentActivePhoto.imageUrl}
                alt={currentActivePhoto.title}
                className="max-h-[75vh] max-w-full w-auto h-auto object-contain rounded-xl shadow-2xl border border-white/10"
              />
            </div>

            {filteredPhotos.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNextPhoto(); }}
                className="absolute right-2 sm:right-4 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/85 text-white border border-white/20 transition backdrop-blur-xs"
                title="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Bar: Caption & Floating Minimize Pill */}
          <div 
            className="w-full max-w-6xl pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-slate-300 max-w-2xl line-clamp-2">
              {currentActivePhoto.caption || `${settings?.parishName || 'OMPH Catholic Parish'} · St. Cecilia Choir Official Archive`}
            </p>

            {/* Prominent Floating Pill to Minimize anytime */}
            <button
              onClick={() => setActivePhotoIndex(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-100 hover:text-white border border-slate-600 text-xs font-semibold backdrop-blur-md transition shadow-lg cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Tap to Minimize / Exit (ESC)</span>
            </button>
          </div>
        </div>
      )}

      {/* Upload Photo Modal (Executive Only) */}
      {showUploadModal && isExecutive && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-slate-900" />
                <h3 className="text-sm font-bold text-slate-900">Upload Choir Photo</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-medium">
                ⚠️ {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Photo Title *</label>
                <input
                  type="text"
                  required
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  placeholder="e.g. Easter Vigil Choral Ministration"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Event Date</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Album Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                  >
                    <option value="Solemnities & Feasts">Solemnities & Feasts</option>
                    <option value="Robing & Inductions">Robing & Inductions</option>
                    <option value="Rehearsals & Practices">Rehearsals & Practices</option>
                    <option value="Choir Competitions">Choir Competitions</option>
                    <option value="Parish Events">Parish Events</option>
                    <option value="Retreats & Community">Retreats & Community</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Caption / Description</label>
                <textarea
                  rows={2}
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Describe the occasion, vestment color, or context..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Photo Upload Picker */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block font-semibold text-slate-700">Select Image File *</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    Browse Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  {fileName && (
                    <span className="text-xs text-slate-600 truncate max-w-[180px]">
                      {fileName}
                    </span>
                  )}
                </div>

                {imageDataUrl && (
                  <div className="pt-2">
                    <img
                      src={imageDataUrl}
                      alt="Upload preview"
                      className="h-28 w-full object-cover rounded-lg border border-slate-200"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!imageDataUrl}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2 rounded-lg transition"
                >
                  Upload Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
