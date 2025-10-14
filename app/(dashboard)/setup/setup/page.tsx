import Link from "next/link";

export default function SetupIndex() {
  const links = [
    { href: "/setup/bahan", label: "Bahan" },
    { href: "/setup/produk", label: "Produk" },
    { href: "/setup/komposisi", label: "Komposisi" },
    { href: "/setup/overhead", label: "Overhead" },
    { href: "/setup/tenaga-kerja", label: "Tenaga Kerja" },
    { href: "/setup/target", label: "Target" },
    { href: "/setup/resep", label: "Resep" },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Setup</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-2xl border bg-white p-4 hover:shadow-sm"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
