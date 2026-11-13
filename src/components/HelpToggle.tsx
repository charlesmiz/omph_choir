import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface HelpToggleProps {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export const HelpToggle: React.FC<HelpToggleProps> = ({
  label = 'Help',
  children,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition cursor-pointer"
      >
        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
        <span>{label}</span>
        {isOpen ? (
          <ChevronUp className="w-3 h-3 text-slate-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
};
