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



export default function CategoryCard({
  title,
  image,
  to,
  onClick,
  isActive = false,
}: CategoryCardProps) {
  const formattedTitle = formatCategoryTitle(title);

  const inner = (
    <div className="flex flex-col h-full w-full justify-between select-none">
      {/* Checkered Canvas Box (Admin Style) */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-white/[0.08] flex items-center justify-center bg-[linear-gradient(45deg,#181926_25%,transparent_25%),linear-gradient(-45deg,#181926_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#181926_75%),linear-gradient(-45deg,transparent_75%,#181926_75%)] bg-[size:10px_10px] bg-[#0d0e18]">
        {/* Aesthetic Live Green Dot */}
        <div className="absolute top-2 right-2 pointer-events-none z-10">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgb(52,211,153)]" />
        </div>

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
            className="h-full w-full object-contain p-2.5 transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
              No Asset
            </span>
          </div>
        )}
      </div>

      {/* Category Name Only - No pricing or buttons */}
      <div className="mt-2 sm:mt-2.5 min-w-0 text-center">
        <h4
          className={`truncate text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-colors ${
            isActive ? "text-primary font-black" : "text-foreground group-hover:text-primary"
          }`}
          title={formattedTitle}
        >
          {formattedTitle}
        </h4>
      </div>
    </div>
  );

  const className = `group relative flex flex-col justify-between rounded-2xl border p-2 sm:p-2.5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background text-left ${
    isActive
      ? "border-primary ring-1.5 ring-primary/60 bg-[#181930] shadow-[0_0_20px_rgba(139,92,246,0.3)]"
      : "border-white/[0.08] bg-[#121324]/80 hover:border-primary/50 hover:bg-[#181930] hover:shadow-[0_8px_25px_rgb(0,0,0,0.4)]"
  }`;

  if (to) {
    return (
      <Link to={to} className={className} onClick={onClick}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}
