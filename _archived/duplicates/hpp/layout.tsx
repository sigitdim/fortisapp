export const dynamic = "force-dynamic";

export default function HppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}
