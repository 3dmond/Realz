import { Link } from "react-router-dom";

export default function ExploreMore({ to = "/shop" }: { to?: string }) {
  return (
    <div className="mt-6 flex justify-end">
      <Link
        to={to}
        className="explore-underline text-micro-sm inline-flex items-baseline gap-1"
      >
        <span className="text-foreground">EXPLORE&nbsp;</span>
        <span className="text-primary">MORE</span>
      </Link>
    </div>
  );
}
