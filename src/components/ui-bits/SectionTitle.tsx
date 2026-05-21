export default function SectionTitle({ children, align = "center" }: { children: React.ReactNode; align?: "left" | "center" }) {
  return (
    <h2
      className={`section-title text-xl sm:text-2xl md:text-3xl ${align === "center" ? "text-center" : "text-left"}`}
    >
      {children}
    </h2>
  );
}
