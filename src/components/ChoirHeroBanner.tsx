import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2, X, Download, Clock, ShieldCheck, Users } from 'lucide-react';
import { SystemSettings, RehearsalSession } from '../types';

interface ChoirHeroBannerProps {
  settings?: SystemSettings;
  totalMembers?: number;
  activeSession?: RehearsalSession | null;
  nextSession?: RehearsalSession | null;
  mode?: 'executive' | 'member';
  className?: string;
}

export const ChoirHeroBanner: React.FC<ChoirHeroBannerProps> = ({
  settings,
  totalMembers = 0,
  activeSession,
  nextSession,
  mode = 'member',
  className = '',
}) => {
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Keyboard navigation for modal dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPhotoModal) {
        setShowPhotoModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPhotoModal]);

  return (
    <>
      {/* Choir Hero Banner Container */}
      <div 
        className={`relative overflow-hidden rounded-2xl border border-slate-200/90 shadow-sm bg-slate-950 w-full select-none ${className}`}
      >
        <div className="relative w-full aspect-[1.69/1]">
          {/* 
            Wide horizontal choir photograph:
            Uses the 1.69:1 central crop (3666x2166) of the original parish photograph.
            100% horizontal breadth is preserved so no choristers on left or right are cut off.
          */}
          <img
            src="/assets/aistudio/Choir_hero_banner.jpg"
            alt="OMPH Choir in vestments"
            className="w-full h-full object-cover object-center block"
          />

          {/* Top gradient for legibility */}
          <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-slate-950/75 via-slate-950/25 to-transparent pointer-events-none" />

          {/* Bottom gradient for typography legibility */}
          <div className="absolute inset-x-0 bottom-0 h-32 sm:h-40 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-transparent pointer-events-none" />

          {/* Top Bar: Parish Emblem & Full Photo Action */}
          <div className="absolute top-2.5 inset-x-2.5 sm:top-4 sm:inset-x-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <img
                src="/assets/aistudio/omph_37e5c155.jpg"
                alt="OMPH Crest"
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-amber-300 shadow-sm shrink-0"
              />
              <span className="text-[10px] sm:text-xs font-semibold text-amber-200 bg-black/70 backdrop-blur-md px-2 sm:px-2.5 py-1 rounded-md border border-white/10 tracking-wide">
                {settings?.parishName || 'Our Mother of Perpetual Help Catholic Parish'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-black/75 hover:bg-black/90 backdrop-blur-md text-white text-[11px] sm:text-xs font-semibold border border-white/20 transition shadow-sm cursor-pointer"
              title="View full original choir photograph"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">View Full Photo</span>
            </button>
          </div>

          {/* Bottom Content: Choir Name, Details, Session Status */}
          <div className="absolute bottom-0 inset-x-0 p-3 sm:p-5 md:p-6 z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 text-white">
            <div className="space-y-0.5 sm:space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-amber-200/90 font-medium">
                <span>St. Cecilia Choral Ministry</span>
                <span aria-hidden="true">·</span>
                <span>{totalMembers} Choristers Enrolled</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-400/20 text-amber-200 px-1.5 py-0.5 rounded border border-amber-400/30">
                  {mode === 'executive' ? (
                    <>
                      <ShieldCheck className="w-3 h-3 text-amber-300" />
                      Executive Console
                    </>
                  ) : (
                    <>
                      <Users className="w-3 h-3 text-amber-300" />
                      Member Portal
                    </>
                  )}
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                {settings?.choirName || 'OMPH CHOIR'}
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-200 line-clamp-1 italic">
                "Sing to the Lord a new song, for He has done marvelous deeds." — Psalm 98:1
              </p>
            </div>

            {/* Quick Session Call-time Badge */}
            {activeSession && activeSession.sessionStatus === 'In Progress' ? (
              <div className="bg-emerald-950/85 backdrop-blur-md border border-emerald-400/40 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2.5 shrink-0 sm:text-right shadow-lg">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-emerald-300 flex items-center sm:justify-end gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Rehearsal In Progress
                </span>
                <div className="flex items-center sm:justify-end gap-1.5 text-white font-bold mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="font-mono text-sm sm:text-base">{activeSession.requiredArrivalTime}</span>
                  <span className="text-xs text-emerald-200/90 font-medium">({activeSession.activityType})</span>
                </div>
              </div>
            ) : nextSession ? (
              <div className="bg-black/70 backdrop-blur-md border border-white/20 rounded-xl px-3 py-1.5 sm:px-4 sm:py-2.5 shrink-0 sm:text-right">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-amber-200 block">
                  Next Rehearsal Call Time
                </span>
                <div className="flex items-center sm:justify-end gap-1.5 text-white font-bold">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span className="font-mono text-sm sm:text-base">{nextSession.requiredArrivalTime}</span>
                  <span className="text-xs text-slate-300 font-normal">· {nextSession.activityType}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Full Choir Photo Modal Viewer */}
      {showPhotoModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setShowPhotoModal(false)}
        >
          {/* Top Control Bar */}
          <div 
            className="w-full max-w-6xl flex items-center justify-between pb-2 border-b border-slate-800 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <img
                src="/assets/aistudio/omph_37e5c155.jpg"
                alt="OMPH Crest"
                className="w-7 h-7 rounded-full object-cover border border-amber-300"
              />
              <div>
                <span className="text-xs sm:text-sm font-bold text-white block">
                  {settings?.choirName || 'OMPH CHOIR'} · Official Group Portrait
                </span>
                <span className="text-[11px] text-amber-200/80 hidden sm:inline">
                  {settings?.parishName || 'Our Mother of Perpetual Help Catholic Parish'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/assets/aistudio/Choir_43a95ef9.JPG"
                download="OMPH_Choir_Official_Portrait.jpg"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Original</span>
              </a>

              {/* High-visibility Minimize Button */}
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition shadow-sm cursor-pointer"
                title="Minimize / Exit Full Screen (ESC)"
              >
                <Minimize2 className="w-4 h-4 text-slate-950" />
                <span>Minimize</span>
              </button>

              {/* Standard Close X Button */}
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition border border-slate-700 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Image Viewport (Original Full-Resolution Image) */}
          <div 
            className="overflow-hidden rounded-xl border border-slate-700/80 max-h-[75vh] flex items-center justify-center bg-black/60 shadow-2xl my-auto cursor-pointer"
            onClick={() => setShowPhotoModal(false)}
            title="Click photo to minimize / exit"
          >
            <img
              src="/assets/aistudio/Choir_43a95ef9.JPG"
              alt="Full Choir Group Portrait"
              className="w-full h-auto max-h-[75vh] object-contain rounded-lg"
            />
          </div>

          {/* Bottom Bar: Subtitle and Floating Minimize Action Pill */}
          <div 
            className="w-full max-w-6xl pt-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] text-slate-400">
              {settings?.parishName || 'Our Mother of Perpetual Help Catholic Parish'} · St. Cecilia Choir Official Archive (Original Resolution)
            </span>

            {/* Prominent Floating Pill to Minimize anytime */}
            <button
              type="button"
              onClick={() => setShowPhotoModal(false)}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-100 hover:text-white border border-slate-600 text-xs font-semibold backdrop-blur-md transition shadow-lg cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Tap to Minimize (or press ESC)</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
