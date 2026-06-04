import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="text-center">
        <p className="text-micro text-accent">404</p>
        <h1 className="mt-4 text-7xl">Lost in the drop.</h1>
        <p className="mt-4 text-muted-foreground">This page doesn't exist.</p>
        <Link
          to="/"
          className="mt-8 inline-block rounded-full bg-primary px-8 py-3 text-sm font-black uppercase tracking-[0.25em] text-primary-foreground"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
