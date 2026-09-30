import React, { useState, useEffect, useRef, useMemo } from "react";
import type { Product } from "@/lib/queries";
import { cn } from "@/lib/utils";

export type PutThemEverywhereProps = {
  stickers: Product[];
};

interface GalleryItem {
  id: number;
  image_url: string;
}

// Built-in fallback list using local assets to guarantee instant rendering
const FALLBACK_GALLERY_IMAGES: GalleryItem[] = [
  { id: 10598, image_url: "/your_designs/anime-stickerbomb-thinkbook-laptop.jpg" },
  { id: 10599, image_url: "/your_designs/star-pattern-airpods-case.jpg" },
  { id: 10600, image_url: "/your_designs/monarch-butterfly-airpods-case.jpg" },
  { id: 10601, image_url: "/your_designs/goku-dbz-mjolnir-power-adapters.jpg" },
  { id: 10602, image_url: "/your_designs/silhouette-men-wall-switch-sticker.jpg" },
  { id: 10603, image_url: "/your_designs/rick-and-morty-lighter-wraps.jpg" },
  { id: 10604, image_url: "/your_designs/joker-hahaha-red-iphone-case.jpg" },
  { id: 10605, image_url: "/your_designs/rick-morty-gravity-falls-car-subwoofer.jpg" },
  { id: 10606, image_url: "/your_designs/bart-simpson-peeking-car-window-decals.jpg" },
  { id: 10607, image_url: "/your_designs/monochrome-stickerbomb-laptop-deck.jpg" },
  { id: 10608, image_url: "/your_designs/persona-5-ps4-console-controller-skin.jpg" },
  { id: 10609, image_url: "/your_designs/arcane-jinx-matte-splatter-ps5-controller.jpg" },
  { id: 10610, image_url: "/your_designs/spiderman-black-red-ps5-dualsense.jpg" },
  { id: 10611, image_url: "/your_designs/spiderman-casio-scientific-calculator.jpg" },
  { id: 10612, image_url: "/your_designs/dell-latitude-bw-comic-stickerbomb.jpg" },
  { id: 10613, image_url: "/your_designs/plankton-krabby-patty-car-subwoofer.jpg" },
];

const TOTAL_BOXES = 9;

const TRANSITION_EFFECTS = [
  "gallery-zoom-in",
  "gallery-zoom-out",
  "gallery-slide-up",
  "gallery-slide-down",
  "gallery-slide-left",
  "gallery-slide-right",
  "gallery-blur-dissolve",
  "gallery-gentle-drift",
] as const;

type TransitionEffect = (typeof TRANSITION_EFFECTS)[number];

// Reduced viewing seconds and fast initial delays for a lively, modern cadence
const BOX_CONFIGS: {
  interval: number;
  delay: number;
  zoomOrigin: string;
}[] = [
  // 5 Main FIFA Bento Tiles (Fast, cinematic cadence: 2.7s - 3.4s)
  { interval: 3100, delay: 400, zoomOrigin: "origin-top-left" },
  { interval: 2700, delay: 1200, zoomOrigin: "origin-center" },
  { interval: 3400, delay: 700, zoomOrigin: "origin-bottom-right" },
  { interval: 2900, delay: 1700, zoomOrigin: "origin-top-right" },
  { interval: 3300, delay: 900, zoomOrigin: "origin-bottom-left" },
  // 4 Far Right Thumbnail Rail Tiles (Snappy, continuous rotation: 2.3s - 2.8s)
  { interval: 2300, delay: 500, zoomOrigin: "origin-center" },
  { interval: 2700, delay: 1400, zoomOrigin: "origin-top-left" },
  { interval: 2500, delay: 800, zoomOrigin: "origin-bottom-right" },
  { interval: 2800, delay: 1800, zoomOrigin: "origin-top-right" },
];

export default function PutThemEverywhere({ stickers }: PutThemEverywhereProps) {
  // Combine database stickers with fallback images, ensuring at least 16 unique items in pool
  const allImages = useMemo<GalleryItem[]>(() => {
    if (stickers && stickers.length >= TOTAL_BOXES) {
      return stickers.map((s) => ({
        id: s.id,
        image_url: s.image_url,
      }));
    }
    if (stickers && stickers.length > 0) {
      const existingIds = new Set(stickers.map((s) => s.id));
      return [
        ...stickers.map((s) => ({ id: s.id, image_url: s.image_url })),
        ...FALLBACK_GALLERY_IMAGES.filter((f) => !existingIds.has(f.id)),
      ];
    }
    return FALLBACK_GALLERY_IMAGES;
  }, [stickers]);

  // Current image state for each of the 9 tiles
  // currentId: currently visible image ID
  // nextId: incoming image ID during transition
  // isFading: true when fading/animating to next image
  // effect: random transition effect applied to this transition
  const [boxStates, setBoxStates] = useState<
    {
      currentId: number;
      nextId: number | null;
      isFading: boolean;
      effect: TransitionEffect;
    }[]
  >(() => {
    return Array.from({ length: TOTAL_BOXES }).map((_, i) => ({
      currentId: allImages[i % allImages.length].id,
      nextId: null,
      isFading: false,
      effect: TRANSITION_EFFECTS[i % TRANSITION_EFFECTS.length],
    }));
  });

  // Keep a ref to the latest state to read inside timer callbacks
  const boxStatesRef = useRef(boxStates);
  boxStatesRef.current = boxStates;

  const allImagesRef = useRef(allImages);
  allImagesRef.current = allImages;

  // Staggered independent slideshow runners
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    const intervals: NodeJS.Timeout[] = [];

    BOX_CONFIGS.forEach((cfg, boxIdx) => {
      // Function to advance this box to a new image that is NOT displayed anywhere else
      const transitionBox = () => {
        const pool = allImagesRef.current;
        if (pool.length <= TOTAL_BOXES) return;

        const currentStates = boxStatesRef.current;

        // Collect all IDs currently displayed or transitioning in ANY OTHER box
        const inUseIds = new Set<number>();
        currentStates.forEach((b, idx) => {
          if (idx !== boxIdx) {
            inUseIds.add(b.currentId);
            if (b.nextId !== null) inUseIds.add(b.nextId);
          }
        });
        // Also exclude this box's current image
        inUseIds.add(currentStates[boxIdx].currentId);

        // Filter available pool
        const available = pool.filter((item) => !inUseIds.has(item.id));
        if (available.length === 0) return;

        // Pick next image
        const chosen = available[Math.floor(Math.random() * available.length)];

        // Pick a random transition effect different from the previous one
        const prevEffect = currentStates[boxIdx].effect;
        const eligibleEffects = TRANSITION_EFFECTS.filter((e) => e !== prevEffect);
        const nextEffect =
          eligibleEffects[Math.floor(Math.random() * eligibleEffects.length)];

        // Phase 1: Set nextId, effect, and trigger animation
        setBoxStates((prev) => {
          const next = [...prev];
          next[boxIdx] = {
            ...next[boxIdx],
            nextId: chosen.id,
            effect: nextEffect,
            isFading: true,
          };
          return next;
        });

        // Phase 2: After transition completes (650ms), commit nextId as currentId
        const finishTimer = setTimeout(() => {
          setBoxStates((prev) => {
            const next = [...prev];
            next[boxIdx] = {
              currentId: chosen.id,
              nextId: null,
              effect: nextEffect,
              isFading: false,
            };
            return next;
          });
        }, 650);

        timeouts.push(finishTimer);
      };

      // Initial staggered trigger
      const initialTimer = setTimeout(() => {
        transitionBox();
        // Regular recurring interval thereafter
        const loopTimer = setInterval(transitionBox, cfg.interval);
        intervals.push(loopTimer);
      }, cfg.delay);

      timeouts.push(initialTimer);
    });

    return () => {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, []);

  // Quick lookup map for image URLs
  const imageMap = useMemo(() => {
    const map = new Map<number, string>();
    allImages.forEach((img) => map.set(img.id, img.image_url));
    return map;
  }, [allImages]);

  // Helper to render an individual FIFA tile with continuous motion and smooth keyframe transitions
  const renderTile = (
    boxIdx: number,
    extraClasses: string,
    roundedClass = "rounded-xl md:rounded-2xl",
  ) => {
    const state = boxStates[boxIdx] || {
      currentId: allImages[boxIdx % allImages.length].id,
      nextId: null,
      isFading: false,
      effect: "gallery-zoom-in" as TransitionEffect,
    };
    const currentUrl = imageMap.get(state.currentId) || allImages[0]?.image_url;
    const nextUrl = state.nextId !== null ? imageMap.get(state.nextId) : null;
    const cfg = BOX_CONFIGS[boxIdx % BOX_CONFIGS.length];

    return (
      <div
        className={cn(
          "group relative overflow-hidden border border-white/[0.12] bg-[#0c0d18] shadow-[0_16px_40px_rgba(0,0,0,0.7)] transition-all duration-500 hover:border-primary/60 hover:shadow-[0_20px_50px_rgba(124,58,237,0.22)] cursor-pointer select-none",
          roundedClass,
          extraClasses,
        )}
      >
        {/* Outgoing Image: when isFading is true, plays random exit animation; otherwise rests */}
        {currentUrl && (
          <div
            key={`curr-wrap-${state.currentId}`}
            className={cn(
              "absolute inset-0 w-full h-full overflow-hidden",
              state.isFading && "gallery-anim-exit",
            )}
            style={
              state.isFading
                ? { animationName: `${state.effect}-exit` }
                : undefined
            }
          >
            <img
              src={currentUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className={cn(
                "w-full h-full object-cover pointer-events-none animate-kenburns",
                cfg.zoomOrigin,
              )}
            />
          </div>
        )}

        {/* Incoming Image: plays matching enter animation immediately upon mounting */}
        {nextUrl && (
          <div
            key={`next-wrap-${state.nextId}`}
            className="absolute inset-0 w-full h-full overflow-hidden gallery-anim-enter"
            style={{ animationName: `${state.effect}-enter` }}
          >
            <img
              src={nextUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className={cn(
                "w-full h-full object-cover pointer-events-none animate-kenburns",
                cfg.zoomOrigin,
              )}
            />
          </div>
        )}

        {/* Ambient Gloss & Light Sheen Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-black/40 via-transparent to-white/[0.06] opacity-60 group-hover:opacity-30 transition-opacity duration-500 z-10" />
        <div
          className={cn(
            "absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/[0.08] group-hover:ring-primary/40 transition-colors duration-500 z-10",
            roundedClass,
          )}
        />
      </div>
    );
  };

  return (
    <section
      id="realz-gallery"
      className="relative mx-auto w-full max-w-[1600px] px-3 sm:px-6 md:px-8 py-2.5 sm:py-3.5 h-[62vh] sm:h-[65vh] min-h-[380px] max-h-[70vh] flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Ambient background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[1400px] h-[360px] pointer-events-none -z-10 blur-3xl opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at center, rgba(139, 92, 246, 0.18) 0%, rgba(59, 130, 246, 0.06) 50%, transparent 80%)",
        }}
      />

      {/* Section Header: ONLY THE TITLE, ZERO OTHER TEXT */}
      <div className="relative z-10 mb-2 sm:mb-2.5 shrink-0">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-wide font-['Caveat',cursive] leading-none flex items-center gap-2.5">
          <span className="w-2 h-5 sm:h-6 bg-primary rounded-full shrink-0 shadow-[0_0_12px_var(--color-primary-glow)]" />
          <span>
            Realz <span className="text-primary">Gallery</span>
          </span>
        </h2>
      </div>

      {/* Gallery Layout: FIFA Career Mode Bento (Left) + Vertical Thumbnail Strip (Far Right) */}
      <div className="relative z-10 w-full flex-1 min-h-0 flex flex-row gap-2.5 sm:gap-3.5 md:gap-4">
        {/* Main FIFA Career Mode Bento Grid (5 Interlocking Tiles) */}
        <div className="flex-1 min-w-0 h-full grid grid-cols-12 grid-rows-2 gap-2.5 sm:gap-3.5 md:gap-4">
          {/* TILE 0 (Grand Featured Left Pillar): spans 5 cols & 2 rows */}
          {renderTile(0, "col-span-5 row-span-2 h-full", "rounded-xl sm:rounded-2xl md:rounded-3xl")}

          {/* TILE 1 (Top-Mid Wide Tile): spans 4 cols & row 1 */}
          {renderTile(1, "col-span-4 row-span-1 h-full", "rounded-lg sm:rounded-xl md:rounded-2xl")}

          {/* TILE 2 (Top-Right Tile): spans 3 cols & row 1 */}
          {renderTile(2, "col-span-3 row-span-1 h-full", "rounded-lg sm:rounded-xl md:rounded-2xl")}

          {/* TILE 3 (Bottom-Mid Tile): spans 3 cols & row 2 */}
          {renderTile(3, "col-span-3 row-span-1 h-full", "rounded-lg sm:rounded-xl md:rounded-2xl")}

          {/* TILE 4 (Bottom-Right Wide Tile): spans 4 cols & row 2 */}
          {renderTile(4, "col-span-4 row-span-1 h-full", "rounded-lg sm:rounded-xl md:rounded-2xl")}
        </div>

        {/* Far Right Vertical Rail: Small Thumbnail Size Image Boxes */}
        <div className="w-18 sm:w-24 md:w-32 lg:w-40 xl:w-48 shrink-0 h-full flex flex-col gap-2.5 sm:gap-3.5 md:gap-4">
          {renderTile(5, "flex-1 min-h-0 w-full", "rounded-md sm:rounded-lg md:rounded-xl")}
          {renderTile(6, "flex-1 min-h-0 w-full", "rounded-md sm:rounded-lg md:rounded-xl")}
          {renderTile(7, "flex-1 min-h-0 w-full", "rounded-md sm:rounded-lg md:rounded-xl")}
          {renderTile(8, "flex-1 min-h-0 w-full", "rounded-md sm:rounded-lg md:rounded-xl")}
        </div>
      </div>
    </section>
  );
}
