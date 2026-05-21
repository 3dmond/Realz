import { Link } from "react-router-dom";
import { Phone, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="border-t border-border/40 px-4 py-4 sm:px-8"
      style={{ background: "var(--color-footer)" }}
    >
      <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <Link to="/" className="realz-logo text-xl">
          Rea<span className="lz">lz</span>
        </Link>
        <p className="text-[10px] tracking-[0.25em] text-muted-foreground uppercase">
          © {new Date().getFullYear()} Realz Stickers. All rights reserved.
        </p>
        <div className="flex items-center gap-3">
          <a
            href="https://wa.me/0000000000"
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
          <a
            href="tel:+0000000000"
            aria-label="Phone"
            className="grid h-9 w-9 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary"
          >
            <Phone className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
