import React from "react";

export default function PaperBlogSection() {
  return (
    <section className="relative mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-8">
      {/* Paper Notebook Sheet Wrapper */}
      <div className="relative w-full rounded-2xl bg-[#FAF8F5] text-slate-800 shadow-2xl overflow-hidden border border-[#E6E1DA] p-6 sm:p-10 md:p-14">
        {/* Notebook Horizontal Lines Texture */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_27px,#E8E2D9_28px)] bg-[size:100%_28px] opacity-70" />

        {/* Red Vertical Notebook Margin Line */}
        <div className="absolute left-8 sm:left-12 md:left-16 top-0 bottom-0 w-[2px] bg-red-500/40 pointer-events-none z-10" />

        {/* Paper Header / Metadata */}
        <div className="relative z-20 flex items-center justify-between border-b border-[#D8CEBE] pb-4 mb-6 pl-10 md:pl-12">
          <div>
            <span className="font-mono text-xs font-bold text-[#B8975A] uppercase tracking-widest">
              VOL. 01 — PAPER JOURNAL
            </span>
            <h3 className="font-marker text-2xl sm:text-3xl text-slate-900 tracking-tight mt-1">
              DESIGN PHILOSOPHY & STREET CULTURE
            </h3>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline-block">
            ISSUE #04
          </span>
        </div>

        {/* Main Text Content (Generous Left Padding pl-10 md:pl-12 prevents crowding red line) */}
        <div className="relative z-20 pl-10 md:pl-12 text-sm sm:text-base text-slate-700 leading-relaxed font-sans space-y-4">
          <p>
            Stickers aren't just vinyl cutouts. They are micro-canvases of personal expression slapped onto laptops, skateboards, and street corners. Every drop is curated to resonate with subcultures, brutalist aesthetics, and raw creativity.
          </p>

          {/* Pure Handwritten Blue Ballpoint Ink Quote (No Blue Highlight Rectangle) */}
          <blockquote className="font-['Caveat',cursive] text-2xl text-blue-700 font-bold my-6 pl-4 border-l-2 border-[#B8975A]/60 italic leading-snug">
            "Simplicity is not the absence of complexity, but the absolute mastery of raw visual expression."
          </blockquote>

          <p>
            Whether you choose anime icons, code snippets, or street art motifs, your placement tells a story before you even speak. Quality matters — waterproof vinyl, UV resistance, and crisp die-cut borders make all the difference.
          </p>
        </div>

        {/* Signature & Unfiltered Thoughts Footer */}
        <div className="relative z-20 flex items-end justify-between border-t border-[#D8CEBE] pt-6 mt-8 pl-10 md:pl-12">
          {/* Vivid Handwritten Blue Pen Signature */}
          <div className="font-['Caveat',cursive] text-2xl font-bold text-blue-700 leading-none">
            — 3dm0nd
          </div>

          {/* Brass Mono Typography */}
          <div className="font-mono text-xs font-bold text-[#B8975A] uppercase tracking-widest">
            UNFILTERED THOUGHTS
          </div>
        </div>
      </div>
    </section>
  );
}
