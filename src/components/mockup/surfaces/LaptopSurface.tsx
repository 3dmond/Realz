import React from 'react';
import type { MockupVariant, MockupColor } from '../types';

interface LaptopSurfaceProps {
  variant: MockupVariant;
  color: MockupColor;
  children?: React.ReactNode;
}

export default function LaptopSurface({ variant, color, children }: LaptopSurfaceProps) {
  return (
    <div
      className="relative w-full h-full select-none rounded-[24px] sm:rounded-[28px] transition-colors duration-300 flex items-center justify-center"
      style={{
        backgroundColor: color.bodyHex,
        border: `3px solid ${color.borderHex}`,
        boxShadow: `0 25px 50px -12px rgba(0,0,0,0.7), inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Top Hinge Recess Bar */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-1.5 rounded-b-md pointer-events-none z-10"
        style={{
          backgroundColor: color.accentHex,
          borderBottom: `1px solid ${color.borderHex}`,
        }}
      />

      {/* Subtle Center Monogram Emblem */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center pointer-events-none z-0"
        style={{
          backgroundColor: `${color.accentHex}50`,
          border: `1px solid ${color.borderHex}40`,
        }}
      >
        <span className="text-xs font-black tracking-widest text-white/20 select-none">
          RZ
        </span>
      </div>

      {/* Bottom Lip Indentation */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-t-sm pointer-events-none opacity-40"
        style={{ backgroundColor: color.accentHex }}
      />

      {/* Usable Placement Layer Container */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {children}
      </div>
    </div>
  );
}
