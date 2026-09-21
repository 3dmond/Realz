import React from 'react';
import type { MockupVariant, MockupColor } from '../types';

interface PhoneSurfaceProps {
  variant: MockupVariant;
  color: MockupColor;
  children?: React.ReactNode;
}

export default function PhoneSurface({ variant, color, children }: PhoneSurfaceProps) {
  const isFoldable = variant.formFactor === 'foldable' || variant.id.includes('fold');
  const isFlip = variant.formFactor === 'flip' || variant.id.includes('flip');
  const brand = variant.brand || 'Apple';

  return (
    <div
      className={`relative w-full h-full select-none flex items-center justify-center transition-colors duration-300 ${
        isFoldable ? 'rounded-[26px]' : isFlip ? 'rounded-[28px]' : 'rounded-[34px]'
      }`}
      style={{
        backgroundColor: color.bodyHex,
        border: `3px solid ${color.borderHex}`,
        boxShadow: `0 20px 40px -10px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Phone Outer Edge Bevel / Antenna Accent */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          isFoldable ? 'rounded-[23px]' : 'rounded-[31px]'
        }`}
        style={{
          boxShadow: `inset 0 0 0 1px ${color.accentHex}40`,
        }}
      />

      {/* Foldable / Flip Hinge Spine Line */}
      {(isFoldable || isFlip) && (
        <div
          className={`absolute pointer-events-none z-10 ${
            isFlip
              ? 'inset-x-0 top-1/2 -translate-y-1/2 h-1'
              : 'inset-y-0 left-1/2 -translate-x-1/2 w-1'
          }`}
          style={{
            background: `linear-gradient(${
              isFlip ? 'to bottom' : 'to right'
            }, rgba(0,0,0,0.4), rgba(255,255,255,0.15), rgba(0,0,0,0.4))`,
          }}
        />
      )}

      {/* Camera Module (Brand Adaptive) */}
      {brand === 'Samsung' ? (
        // Samsung Vertical Lenses
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
          <div className="w-5 h-5 rounded-full bg-black/85 border border-white/20 shadow-sm" />
          <div className="w-5 h-5 rounded-full bg-black/85 border border-white/20 shadow-sm" />
          <div className="w-5 h-5 rounded-full bg-black/85 border border-white/20 shadow-sm" />
          {variant.id.includes('ultra') && (
            <div className="w-3.5 h-3.5 rounded-full bg-black/80 border border-white/15 ml-0.5" />
          )}
        </div>
      ) : brand === 'Google' ? (
        // Pixel Camera Visor Bar
        <div
          className="absolute top-5 inset-x-2 h-7 z-10 rounded-full flex items-center justify-start px-3 gap-2 pointer-events-none border border-black/30"
          style={{
            backgroundColor: color.accentHex,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <div className="w-4.5 h-4.5 rounded-full bg-black/90 border border-white/20" />
          <div className="w-4.5 h-4.5 rounded-full bg-black/90 border border-white/20" />
          <div className="w-2 h-2 rounded-full bg-amber-100/90 ml-auto" />
        </div>
      ) : brand === 'Huawei' || brand === 'Xiaomi' ? (
        // Circular / Deco Camera Ring
        <div
          className="absolute top-4 left-4 z-10 w-14 h-14 rounded-full pointer-events-none flex items-center justify-center p-1.5"
          style={{
            backgroundColor: color.accentHex,
            border: `1.5px solid ${color.borderHex}`,
            boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
          }}
        >
          <div className="grid grid-cols-2 gap-1">
            <div className="w-4 h-4 rounded-full bg-black/85 border border-white/20" />
            <div className="w-4 h-4 rounded-full bg-black/85 border border-white/20" />
            <div className="w-4 h-4 rounded-full bg-black/85 border border-white/20" />
            <div className="w-2 h-2 rounded-full bg-amber-100/80 self-center justify-self-center" />
          </div>
        </div>
      ) : (
        // Apple / Tecno / Infinix / Standard Rounded Island
        <div
          className="absolute top-4 left-4 z-10 w-16 h-16 rounded-2xl pointer-events-none flex items-center justify-center p-2"
          style={{
            backgroundColor: color.accentHex,
            border: `1.5px solid ${color.borderHex}`,
            boxShadow: '0 4px 10px rgba(0,0,0,0.35)',
          }}
        >
          <div className="grid grid-cols-2 gap-1.5">
            <div className="w-5 h-5 rounded-full bg-black/85 border border-white/20" />
            <div className="w-5 h-5 rounded-full bg-black/85 border border-white/20" />
            <div className="w-5 h-5 rounded-full bg-black/85 border border-white/20" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-100/90 self-center justify-self-center" />
          </div>
        </div>
      )}

      {/* Subtle Monogram in center bottom */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none opacity-20 text-[10px] font-mono font-bold tracking-widest uppercase">
        {variant.name}
      </div>

      {/* Usable Placement Layer Container */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
