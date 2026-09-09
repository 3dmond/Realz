import { Link } from "react-router-dom";
import type { Product } from "@/lib/queries";

export type PutThemEverywhereProps = {
  stickers: Product[];
};

export default function PutThemEverywhere({ stickers }: PutThemEverywhereProps) {
  // If no stickers available yet, gracefully return null
  if (!stickers || stickers.length === 0) return null;

  // Selected stickers for the physical objects
  const laptopHeroSticker = stickers[0];
  const laptopEdgeSticker = stickers[1] || stickers[0];
  const notebookSticker = stickers[2] || stickers[0];
  const tumblerSticker = stickers[3] || stickers[1] || stickers[0];

  return (
    <section className="relative mx-auto w-full max-w-[1600px] px-4 pt-12 pb-20 sm:px-8 overflow-hidden">
      {/* Soft atmospheric background glow connecting smoothly from above */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1300px] h-[500px] pointer-events-none -z-10 blur-3xl opacity-35"
        style={{
          background: "radial-gradient(ellipse 80% 60% at center, rgba(124, 58, 237, 0.12) 0%, rgba(49, 46, 129, 0.05) 50%, transparent 80%)",
        }}
      />

      {/* Section Header — Integrated Editorial Typography */}
      <div className="relative z-10 max-w-2xl mb-12 sm:mb-16">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary-glow)]" />
          <span className="text-micro text-primary font-bold uppercase tracking-[0.3em]">
            Objects In The Wild
          </span>
        </div>
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white leading-[0.95]">
          PUT THEM <span className="text-primary">EVERYWHERE</span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-muted-foreground font-medium leading-relaxed max-w-lg">
          Laptops. Notebooks. Bottles. Built to live in the physical world and turn everyday gear into personal canvases.
        </p>
      </div>

      {/* Editorial Physical Arrangement (Laptop + Notebook + Tumbler) */}
      <div className="relative z-10 w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 xl:gap-16">
        
        {/* 1. Primary Hero Object: Space-Gray Aluminum Laptop Lid */}
        <div className="relative w-full max-w-[660px] aspect-[16/10] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 flex items-center justify-center overflow-hidden border border-white/[0.12] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.22),inset_0_-2px_6px_rgba(0,0,0,0.7)] transition-transform duration-500 hover:scale-[1.01] bg-gradient-to-br from-[#221f35] via-[#151324] to-[#0c0a18]">
          {/* Milled Aluminum Diagonal Light Reflection */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(115deg,transparent_25%,rgba(255,255,255,0.06)_42%,rgba(255,255,255,0)_60%)]" />

          {/* Precision Top Edge Hinge Indentation */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-1.5 bg-black/60 rounded-b-md border-b border-white/[0.08]" />

          {/* Minimalist Center Logo Recess */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/25 border border-white/[0.04] flex items-center justify-center pointer-events-none">
            <span className="realz-logo text-xs text-white/20 tracking-tighter select-none">RZ</span>
          </div>

          {/* Slapped Sticker 1 (Center-Left Hero Placement) */}
          <Link
            to={`/product/${laptopHeroSticker.id}`}
            aria-label={`View ${laptopHeroSticker.title}`}
            className="group absolute top-[20%] left-[16%] w-28 sm:w-36 md:w-40 aspect-square z-20 transition-all duration-300 ease-out origin-center -rotate-[6deg] hover:-rotate-2 hover:scale-105 hover:-translate-y-1"
          >
            {/* White die-cut vinyl sticker with contact shadow onto aluminum */}
            <img
              src={laptopHeroSticker.image_url}
              alt={laptopHeroSticker.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain filter drop-shadow-[0_8px_14px_rgba(0,0,0,0.9)] group-hover:drop-shadow-[0_14px_22px_rgba(0,0,0,0.95)] transition-all duration-300"
            />
            {/* Subtle gloss highlight on the sticker surface */}
            <div className="absolute inset-0 pointer-events-none rounded-full bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>

          {/* Slapped Sticker 2 (Bottom-Right Angle Placement) */}
          <Link
            to={`/product/${laptopEdgeSticker.id}`}
            aria-label={`View ${laptopEdgeSticker.title}`}
            className="group absolute bottom-[14%] right-[14%] w-24 sm:w-32 md:w-36 aspect-square z-20 transition-all duration-300 ease-out origin-center rotate-[8deg] hover:rotate-3 hover:scale-105 hover:-translate-y-1"
          >
            <img
              src={laptopEdgeSticker.image_url}
              alt={laptopEdgeSticker.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.85)] group-hover:drop-shadow-[0_12px_20px_rgba(0,0,0,0.95)] transition-all duration-300"
            />
          </Link>
        </div>

        {/* 2 & 3. Secondary Group: Hardcover Journal & Insulated Tumbler */}
        <div className="relative flex items-center justify-center gap-6 sm:gap-8 w-full max-w-[500px] lg:w-auto">
          
          {/* Secondary Object: Textured Dark Hardcover Journal / Sketchbook */}
          <div className="relative w-[190px] sm:w-[230px] md:w-[250px] aspect-[3/4] rounded-xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden border border-white/[0.09] shadow-[0_24px_50px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.1)] transition-transform duration-500 hover:scale-[1.01] -rotate-2 hover:rotate-0 bg-[#141221]">
            {/* Debossed cover perimeter line */}
            <div className="absolute inset-2.5 rounded-lg border border-white/[0.04] pointer-events-none" />

            {/* Elastic Ribbon Bookmark Band in Realz Purple */}
            <div className="absolute right-5 top-0 bottom-0 w-3 bg-primary/75 border-x border-primary/40 shadow-sm pointer-events-none" />

            {/* Journal Header Monogram */}
            <div className="relative z-10">
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/30 font-semibold">
                NOTEBOOK 01
              </span>
            </div>

            {/* Slapped Sticker 3 on Journal Cover */}
            <Link
              to={`/product/${notebookSticker.id}`}
              aria-label={`View ${notebookSticker.title}`}
              className="group relative self-center w-24 sm:w-32 aspect-square z-20 my-auto transition-all duration-300 ease-out origin-center rotate-[6deg] hover:rotate-1 hover:scale-105 hover:-translate-y-1"
            >
              <img
                src={notebookSticker.image_url}
                alt={notebookSticker.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)] group-hover:drop-shadow-[0_12px_20px_rgba(0,0,0,0.95)] transition-all duration-300"
              />
            </Link>

            {/* Journal Footer Deboss */}
            <div className="relative z-10 flex items-center justify-between border-t border-white/[0.06] pt-2">
              <span className="font-mono text-[8px] uppercase tracking-widest text-white/20 font-bold">
                REALZ ARCHIVE
              </span>
            </div>
          </div>

          {/* Tertiary Object: Matte Insulated Steel Flask / Tumbler */}
          <div className="relative w-[80px] sm:w-[96px] md:w-[104px] h-[260px] sm:h-[310px] flex flex-col items-center justify-between transition-transform duration-500 hover:scale-[1.01] rotate-3 hover:rotate-1">
            {/* Flask Steel Cap with Milled Grip Rings */}
            <div className="w-12 sm:w-14 h-8 rounded-t-lg bg-[#27233f] border-t border-white/[0.2] border-x border-white/[0.08] shadow-md flex flex-col justify-around py-1">
              <div className="w-full h-[1px] bg-white/[0.1]" />
              <div className="w-full h-[1px] bg-white/[0.1]" />
            </div>

            {/* Flask Neck Transition */}
            <div className="w-8 sm:w-10 h-2 bg-[#1b182d] border-x border-white/[0.06]" />

            {/* Flask Main Cylindrical Body */}
            <div className="relative w-full flex-1 rounded-b-[24px] sm:rounded-b-[28px] overflow-hidden border-b border-x border-white/[0.1] shadow-[0_24px_50px_rgba(0,0,0,0.92),inset_0_1px_1px_rgba(255,255,255,0.18)] bg-gradient-to-r from-[#171526] via-[#2a2646] to-[#12101f] flex items-center justify-center p-2">
              {/* Cylindrical Metallic Specular Highlight */}
              <div className="absolute inset-y-0 left-[22%] w-[18%] bg-gradient-to-r from-transparent via-white/[0.1] to-transparent pointer-events-none" />

              {/* Slapped Sticker 4 on Flask (Curved hug placement) */}
              <Link
                to={`/product/${tumblerSticker.id}`}
                aria-label={`View ${tumblerSticker.title}`}
                className="group relative w-16 sm:w-20 aspect-square z-20 transition-all duration-300 ease-out origin-center -rotate-[3deg] hover:rotate-0 hover:scale-105 hover:-translate-y-1"
              >
                <img
                  src={tumblerSticker.image_url}
                  alt={tumblerSticker.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain filter drop-shadow-[0_5px_10px_rgba(0,0,0,0.85)] group-hover:drop-shadow-[0_10px_16px_rgba(0,0,0,0.95)] transition-all duration-300"
                />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
