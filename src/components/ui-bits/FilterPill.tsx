type Props = {
  label: string;
  active: boolean;
  onClick: () => void;
};

export default function FilterPill({ label, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest transition ${
        active
          ? "bg-accent text-accent-foreground"
          : "bg-white/10 text-muted-foreground hover:bg-white/15 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
