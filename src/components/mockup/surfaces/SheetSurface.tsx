import React from 'react';
import type { MockupVariant, MockupColor } from '../types';

interface SheetSurfaceProps {
  variant: MockupVariant;
  color: MockupColor;
  children?: React.ReactNode;
}

export default function SheetSurface({ variant, color, children }: SheetSurfaceProps) {
  const isHolo = color.id === 'sheet-holo';
  const isClear = color.id === 'sheet-clear';
  const isKraft = color.id === 'sheet-kraft';

  return (
    <div
      className="relative w-full h-full select-none flex items-center justify-center transition-colors duration-300 rounded-xl overflow-hidden shadow-2xl"
      style={{
        backgroundColor: color.bodyHex,
        border: `2px solid ${color.borderHex}`,
        backgroundImage: isHolo
          ? 'linear-gradient(135deg, rgba(255,0,128,0.15), rgba(0,255,255,0.15), rgba(255,255,0,0.15), rgba(128,0,255,0.15))'
          : isClear
          ? 'repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, transparent 0% 50%) 50% / 20px 20px'
          : isKraft
          ? 'linear-gradient(rgba(0,0,0,0.03), rgba(0,0,0,0.06))'
          : 'none',
      }}
    >
      {/* Subtle Vinyl Sheet Measurement Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '8% 8%',
        }}
      />

      {/* Outer Bleed / Cut Safe Margin Line */}
      <div
        className="absolute pointer-events-none rounded-lg border border-dashed border-white/20"
        style={{
          inset: '4%',
        }}
      />

      {/* Production Registration Marks (Corner Crop Marks) */}
      {/* Top Left */}
      <div className="absolute top-2 left-2 pointer-events-none flex items-center gap-1 opacity-40">
        <div className="w-2.5 h-2.5 rounded-full border border-current flex items-center justify-center">
          <div className="w-1 h-1 bg-current rounded-full" />
        </div>
        <span className="text-[7px] font-mono tracking-tighter">0.0m</span>
      </div>

      {/* Top Right */}
      <div className="absolute top-2 right-2 pointer-events-none flex items-center gap-1 opacity-40">
        <span className="text-[7px] font-mono tracking-tighter">{variant.sizeLabel}</span>
        <div className="w-2.5 h-2.5 rounded-full border border-current flex items-center justify-center">
          <div className="w-1 h-1 bg-current rounded-full" />
        </div>
      </div>

      {/* Bottom Left */}
      <div className="absolute bottom-2 left-2 pointer-events-none flex items-center gap-1 opacity-40">
        <div className="w-2.5 h-2.5 rounded-full border border-current flex items-center justify-center">
          <div className="w-1 h-1 bg-current rounded-full" />
        </div>
        <span className="text-[7px] font-mono tracking-tighter">CUT LINE</span>
      </div>

      {/* Bottom Center Watermark & Sheet Specs */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-30 flex items-center gap-2">
        <span className="text-[8px] font-black uppercase tracking-widest">
          REALZ VINYL SHEET • {variant.dimensionNote}
        </span>
      </div>

      {/* Bottom Right Registration Mark */}
      <div className="absolute bottom-2 right-2 pointer-events-none flex items-center gap-1 opacity-40">
        <span className="text-[7px] font-mono tracking-tighter">DIE-CUT SAFE</span>
        <div className="w-2.5 h-2.5 rounded-full border border-current flex items-center justify-center">
          <div className="w-1 h-1 bg-current rounded-full" />
        </div>
      </div>

      {/* Usable Placement Layer Container */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
