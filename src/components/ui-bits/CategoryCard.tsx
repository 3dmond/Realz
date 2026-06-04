import { Link } from "react-router-dom";

export type CategoryCardProps = {
  title: string;
  image?: string | null;
  to?: string;
  onClick?: () => void;
};

export default function CategoryCard({ title, image, to, onClick }: CategoryCardProps) {
  const inner = (
    <>
      {image ? (
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="img-fade-wrap absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 bg-muted/20 animate-pulse" />
      )}
      <div className="img-fade absolute inset-0" />
      <span className="text-[9px] md:text-[10px] uppercase font-black tracking-widest absolute bottom-1.5 left-1.5 md:bottom-2 md:left-2 pr-1.5 text-accent z-10 transition-transform duration-300 group-hover:scale-110 group-hover:text-primary group-hover:translate-x-1 origin-left leading-tight break-words">{title}</span>
    </>
  );

  const className =
    "group relative block aspect-[4/5] w-full text-left overflow-hidden rounded-lg bg-card";

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
