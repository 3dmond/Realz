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
    <div className="flex flex-col h-full w-full justify-between p-4 bg-card/60 hover:bg-card/90 transition-all duration-300">
      <div className="relative flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden">
        {image ? (
          <img
            src={image.includes('unsplash.com') ? image + (image.includes('?') ? '&' : '?') + 'w=400&q=75&auto=format&fit=crop' : image}
            alt={formattedTitle}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">No Asset</span>
          </div>
        )}
      </div>
      <div className="w-full shrink-0 pt-3 flex items-center justify-between border-t border-white/5 mt-2 z-10">
        <span className="text-[11px] md:text-[12px] font-black uppercase tracking-wider text-accent group-hover:text-primary transition-colors leading-tight break-words">
          {formattedTitle}
        </span>
        <span className="text-[10px] text-muted-foreground/60 group-hover:text-primary transition-colors">→</span>
      </div>
    </div>
  );

  const className =
    "group relative block aspect-[4/5] w-full text-left overflow-hidden rounded-xl bg-card border border-border/40 hover:border-primary/60 transition-all duration-300 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]";

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
