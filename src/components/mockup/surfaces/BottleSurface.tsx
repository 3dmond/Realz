import React from 'react';
import type { MockupVariant, MockupColor } from '../types';

interface BottleSurfaceProps {
  variant: MockupVariant;
  color: MockupColor;
  children?: React.ReactNode;
}

export default function BottleSurface({ variant, color, children }: BottleSurfaceProps) {
  return (
    <div className="relative w-full h-full select-none flex flex-col items-center justify-between">
      {/* 1. Steel Cap with Grip Ridges */}
      <div
        className="w-1/2 h-[12%] rounded-t-lg flex flex-col justify-around py-1 shrink-0 z-10"
        style={{
          backgroundColor: '#27272a',
          border: '1.5px solid #52525b',
          boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
        }}
      >
        <div className="w-full h-[1px] bg-white/20" />
        <div className="w-full h-[1px] bg-white/20" />
      </div>

      {/* 2. Narrow Steel Neck Collar */}
      <div
        className="w-1/3 h-[4%] shrink-0 z-10"
        style={{
          backgroundColor: '#3f3f46',
          borderLeft: '1px solid #71717a',
          borderRight: '1px solid #71717a',
        }}
      />

      {/* 3. Cylindrical Insulated Body */}
      <div
        className="relative w-full flex-1 rounded-b-[28px] overflow-hidden transition-colors duration-300 flex items-center justify-center"
        style={{
          backgroundColor: color.bodyHex,
          border: `2px solid ${color.borderHex}`,
          boxShadow: `0 20px 45px -10px rgba(0,0,0,0.7), inset 0 2px 4px rgba(255,255,255,0.2), inset 0 -4px 8px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Subtle Cylindrical Specular Highlight */}
        <div className="absolute inset-y-0 left-[20%] w-[18%] bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none z-0" />

        {/* Usable Placement Layer Container */}
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
