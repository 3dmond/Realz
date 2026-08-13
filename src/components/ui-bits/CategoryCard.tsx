import { Link } from "react-router-dom";

export type CategoryCardProps = {
  title: string;
  image?: string | null;
  to?: string;
  onClick?: () => void;
};

export default function CategoryCard({ title, image, to, onClick }: CategoryCardProps) {
  const inner = (
    <div className="flex flex-col h-full w-full justify-between p-4">
      <div className="relative flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden">
        {image ? (
          <img
            src={image.includes('unsplash.com') ? image + (image.includes('?') ? '&' : '?') + 'w=400&q=75&auto=format&fit=crop' : image}
            alt={title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-200 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg flex items-center justify-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">No Asset</span>
          </div>
        )}
      </div>
      <div className="w-full shrink-0 pt-3 flex items-center justify-start z-10">
        <span className="text-[9px] md:text-[10px] uppercase font-black tracking-widest text-accent transition-all duration-300 group-hover:scale-105 group-hover:text-primary origin-left leading-tight break-words">
          {title}
        </span>
      </div>
    </div>
  );

  const className =
    "group relative block aspect-[4/5] w-full text-left overflow-hidden rounded-lg bg-card border border-border/40 hover:border-primary/50 transition-colors";

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
