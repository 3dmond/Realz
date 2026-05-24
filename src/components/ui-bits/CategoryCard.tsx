import { Link } from "react-router-dom";

export type CategoryCardProps = {
  title: string;
  image: string;
  to?: string;
  onClick?: () => void;
};

export default function CategoryCard({ title, image, to, onClick }: CategoryCardProps) {
  const inner = (
    <>
      <img
        src={image}
        alt={title}
        loading="lazy"
        className="img-fade-wrap absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="img-fade absolute inset-0" />
      <span className="text-micro absolute bottom-2 left-2 text-accent z-10">{title}</span>
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
