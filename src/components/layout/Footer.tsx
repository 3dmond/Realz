import { Link } from "react-router-dom";
import { Phone, MessageCircle, Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="border-t border-white/[0.08] px-4 py-4 sm:px-8 text-purple-100"
      style={{ background: "var(--color-footer)" }}
    >
      <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <Link to="/" className="realz-logo text-xl text-purple-100">
          Rea<span className="lz text-primary font-black">lz</span>
        </Link>

        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-[10px] tracking-[0.2em] text-purple-300 uppercase font-medium">
          <span>© {new Date().getFullYear()} Realz Stickers. All rights reserved.</span>
          <span className="hidden sm:inline text-purple-700">•</span>
          <Link
            to="/admin"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors font-bold tracking-wider underline-offset-4 hover:underline"
          >
            Admin Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Admin Portal"
            title="Admin Portal"
            className="grid h-9 w-9 place-items-center rounded-full border border-purple-700 text-purple-200 transition hover:border-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Shield className="h-4 w-4" />
          </Link>
          <a
            href="https://wa.me/0000000000"
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            className="grid h-9 w-9 place-items-center rounded-full border border-purple-700 text-purple-200 transition hover:border-primary hover:text-primary"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
          <a
            href="tel:+0000000000"
            aria-label="Phone"
            className="grid h-9 w-9 place-items-center rounded-full border border-purple-700 text-purple-200 transition hover:border-primary hover:text-primary"
          >
            <Phone className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
