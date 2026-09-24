import { Link } from "react-router-dom";
import { formatCategoryTitle } from "@/lib/utils";

export type CategoryCardProps = {
  title: string;
  image?: string | null;
  to?: string;
  onClick?: () => void;
  index?: number;
  isActive?: boolean;
};

// Curated deterministic physical profiles for category stickers
const CATEGORY_PROFILES = [
  {
    rotate: "-rotate-[1deg] sm:-rotate-[2.5deg]",
    translateY: "-translate-y-0.5 sm:-translate-y-2",
    scale: "scale-[1.01] sm:scale-[1.04]",
    shadow: "drop-shadow-[0_12px_20px_rgba(0,0,0,0.85)]",
  },
  {
    rotate: "rotate-[1deg] sm:rotate-[2.5deg]",
    translateY: "translate-y-0.5 sm:translate-y-2",
    scale: "scale-[1.0] sm:scale-[0.97]",
    shadow: "drop-shadow-[0_10px_18px_rgba(0,0,0,0.82)]",
  },
  {
    rotate: "-rotate-[0.5deg] sm:-rotate-[1.5deg]",
    translateY: "-translate-y-0.5 sm:-translate-y-1",
    scale: "scale-[1.01] sm:scale-[1.03]",
    shadow: "drop-shadow-[0_13px_22px_rgba(0,0,0,0.86)]",
  },
  {
    rotate: "rotate-[1.5deg] sm:rotate-[3deg]",
    translateY: "translate-y-0.5 sm:translate-y-2.5",
    scale: "scale-[0.99] sm:scale-[0.96]",
    shadow: "drop-shadow-[0_10px_16px_rgba(0,0,0,0.8)]",
  },
  {
    rotate: "-rotate-[1deg] sm:-rotate-[2deg]",
    translateY: "-translate-y-1 sm:-translate-y-2.5",
    scale: "scale-[1.01] sm:scale-[1.05]",
    shadow: "drop-shadow-[0_14px_24px_rgba(0,0,0,0.88)]",
  },
  {
    rotate: "rotate-[0.5deg] sm:rotate-[1.5deg]",
    translateY: "translate-y-0 sm:translate-y-1",
    scale: "scale-[1.0] sm:scale-[0.98]",
    shadow: "drop-shadow-[0_11px_18px_rgba(0,0,0,0.84)]",
  },
  {
    rotate: "-rotate-[0.5deg] sm:-rotate-[1deg]",
    translateY: "translate-y-0.5 sm:translate-y-1.5",
    scale: "scale-[1.02] sm:scale-[1.02]",
    shadow: "drop-shadow-[0_12px_20px_rgba(0,0,0,0.85)]",
  },
  {
    rotate: "rotate-[1deg] sm:rotate-[2deg]",
    translateY: "-translate-y-0.5 sm:-translate-y-1.5",
    scale: "scale-[0.99] sm:scale-[0.97]",
    shadow: "drop-shadow-[0_11px_17px_rgba(0,0,0,0.83)]",
  },
];

export default function CategoryCard({
  title,
  image,
  to,
  onClick,
  index = 0,
  isActive = false,
}: CategoryCardProps) {
  const formattedTitle = formatCategoryTitle(title);
  const profile = CATEGORY_PROFILES[index % CATEGORY_PROFILES.length];

  const inner = (
    <div className="flex flex-col h-full w-full justify-between p-2 select-none">
      {/* Physical Sticker Canvas with Curated Physical Placement */}
      <div className="relative flex-1 w-full min-h-0 flex items-center justify-center p-2">
        {/* Subtle Ambient Light Catch */}
        <div className="absolute inset-4 rounded-full bg-primary/[0.08] blur-xl opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-100 group-focus-visible:opacity-100" />

        {image ? (
          <img
            src={
              image.includes("unsplash.com")
                ? image + (image.includes("?") ? "&" : "?") + "w=400&q=75&auto=format&fit=crop"
                : image
            }
            alt={formattedTitle}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-contain filter origin-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${profile.rotate} ${profile.translateY} ${profile.scale} ${profile.shadow} motion-safe:group-hover:scale-[1.04] motion-safe:group-hover:rotate-0 motion-safe:group-hover:-translate-y-2 motion-safe:group-focus-visible:scale-[1.04] motion-safe:group-focus-visible:rotate-0 motion-safe:group-focus-visible:-translate-y-2 group-hover:drop-shadow-[0_20px_30px_rgba(0,0,0,0.85)] group-hover:drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)] group-focus-visible:drop-shadow-[0_20px_30px_rgba(0,0,0,0.85)] motion-reduce:transform-none`}
          />
        ) : (
          <div className="h-full w-full bg-white/[0.04] border border-white/[0.06] animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              No Asset
            </span>
          </div>
        )}
      </div>
      {/* Footer Title: Clean, Borderless & Centered */}
      <div className="w-full shrink-0 pt-1.5 flex items-center justify-center text-center z-10">
        <span
          className={`text-[11px] md:text-[12px] font-black uppercase tracking-wider transition-colors leading-tight break-words ${
            isActive ? "text-primary" : "text-foreground/90 group-hover:text-primary"
          }`}
        >
          {formattedTitle}
        </span>
      </div>
    </div>
  );

  const className = `group relative block aspect-[4/5] w-full text-left overflow-visible rounded-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
    isActive
      ? "bg-primary/[0.08] ring-1.5 ring-primary shadow-[0_0_16px_rgba(139,92,246,0.25)]"
      : "bg-transparent hover:bg-white/[0.02]"
  }`;

  if (to) {
    return (
      <Link to={to} className={className} onClick={onClick}>
        {inner}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {inner}
    </button>
  );
}
