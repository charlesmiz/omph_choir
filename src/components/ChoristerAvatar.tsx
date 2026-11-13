import React, { useState, useEffect } from 'react';
import { VoicePart } from '../types';

interface ChoristerAvatarProps {
  fullName?: string;
  voicePart?: VoicePart | string;
  profilePhotoUrl?: string | null;
  photoUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showVoiceBadge?: boolean;
  ring?: boolean;
}

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'CH';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
}

export function getVoiceTheme(voicePart?: string) {
  switch (voicePart) {
    case 'Soprano':
      return {
        bg: 'bg-rose-900',
        text: 'text-rose-100',
        ring: 'ring-rose-500/30',
        badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
      };
    case 'Alto':
      return {
        bg: 'bg-amber-900',
        text: 'text-amber-100',
        ring: 'ring-amber-500/30',
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
      };
    case 'Tenor':
      return {
        bg: 'bg-blue-900',
        text: 'text-blue-100',
        ring: 'ring-blue-500/30',
        badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
      };
    case 'Bass':
      return {
        bg: 'bg-emerald-950',
        text: 'text-emerald-100',
        ring: 'ring-emerald-500/30',
        badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      };
    default:
      return {
        bg: 'bg-slate-900',
        text: 'text-slate-100',
        ring: 'ring-slate-500/30',
        badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
      };
  }
}

const sizeClasses: Record<string, { box: string; font: string; badge: string }> = {
  xs: { box: 'w-6 h-6', font: 'text-[10px]', badge: 'text-[8px] px-1' },
  sm: { box: 'w-8 h-8', font: 'text-xs', badge: 'text-[9px] px-1' },
  md: { box: 'w-10 h-10', font: 'text-sm font-semibold', badge: 'text-[10px] px-1.5' },
  lg: { box: 'w-14 h-14', font: 'text-base font-bold', badge: 'text-xs px-2' },
  xl: { box: 'w-20 h-20', font: 'text-xl font-extrabold', badge: 'text-xs px-2.5 py-0.5' },
  '2xl': { box: 'w-24 h-24', font: 'text-2xl font-extrabold', badge: 'text-xs px-2.5 py-0.5' },
};

export const ChoristerAvatar: React.FC<ChoristerAvatarProps> = ({
  fullName = '',
  voicePart,
  profilePhotoUrl,
  photoUrl,
  size = 'md',
  className = '',
  showVoiceBadge = false,
  ring = true,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const theme = getVoiceTheme(voicePart);
  const sizeConfig = sizeClasses[size] || sizeClasses.md;
  const initials = getInitials(fullName);
  const effectivePhotoUrl = photoUrl || profilePhotoUrl;

  useEffect(() => {
    setImageFailed(false);
  }, [effectivePhotoUrl]);

  const hasValidPhoto = Boolean(effectivePhotoUrl && effectivePhotoUrl.trim() && !imageFailed);

  return (
    <div className={`relative inline-block shrink-0 select-none ${className}`}>
      <div
        className={`${sizeConfig.box} rounded-full flex items-center justify-center overflow-hidden ${ring ? `ring-2 ${theme.ring}` : ''} shadow-xs border border-white/40 ${
          hasValidPhoto ? 'bg-slate-100' : theme.bg
        }`}
      >
        {hasValidPhoto ? (
          <img
            src={effectivePhotoUrl!}
            alt={fullName ? `${fullName}'s portrait` : 'Chorister portrait'}
            className="w-full h-full object-cover object-center block"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className={`${theme.text} ${sizeConfig.font} tracking-wider font-mono`}>
            {initials}
          </span>
        )}
      </div>

      {showVoiceBadge && voicePart && (
        <span
          className={`absolute -bottom-1 -right-1 rounded-full border ${theme.badgeBg} font-bold shadow-2xs ${sizeConfig.badge}`}
        >
          {voicePart.charAt(0)}
        </span>
      )}
    </div>
  );
};
