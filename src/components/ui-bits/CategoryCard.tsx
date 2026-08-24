import { Link } from "react-router-dom";
import { formatCategoryTitle } from "@/lib/utils";

export type CategoryCardProps = {
  title: string;
  image?: string | null;
  to?: string;
  onClick?: () => void;
};

export default function CategoryCard({ title, image, to, onClick }: CategoryCardProps) {
  const formattedTitle = formatCategoryTitle(title);

  const inner = (
    <div className="flex flex-col h-full w-full justify-between p-2">
      {/* Physical Sticker Canvas */}
      <div className="relative flex-1 w-full min-h-0 flex items-center justify-center p-2">
        {image ? (
          <img
            src={image.includes('unsplash.com') ? image + (image.includes('?') ? '&' : '?') + 'w=400&q=75&auto=format&fit=crop' : image}
            alt={formattedTitle}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain filter drop-shadow-[0_10px_18px_rgba(0,0,0,0.75)] transition-all duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3 group-hover:-translate-y-1"
          />
        ) : (
          <div className="h-full w-full bg-muted/10 animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">No Asset</span>
          </div>
        )}
      </div>
      {/* Footer Title */}
      <div className="w-full shrink-0 pt-2 flex items-center justify-between border-t border-purple-200/60 mt-1 z-10">
        <span className="text-[11px] md:text-[12px] font-black uppercase tracking-wider text-primary group-hover:text-accent transition-colors leading-tight break-words">
          {formattedTitle}
        </span>
        <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">→</span>
      </div>
    </div>
  );

  const className =
    "group relative block aspect-[4/5] w-full text-left overflow-hidden rounded-xl bg-transparent transition-all duration-300";

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
