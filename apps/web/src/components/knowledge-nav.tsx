import Link from "next/link";

const items = [
  { href: "/unidades", label: "Unidades", id: "units" },
  { href: "/waves", label: "Waves", id: "waves" },
  { href: "/modos", label: "Modos", id: "modes" },
  { href: "/coach", label: "Coach", id: "coach" },
] as const;

type KnowledgeNavProps = {
  current: (typeof items)[number]["id"];
};

export function KnowledgeNav({ current }: KnowledgeNavProps) {
  return (
    <nav
      aria-label="Base de conhecimento"
      className="flex flex-wrap items-center justify-end gap-2 text-sm font-semibold"
    >
      {items.map((item, index) => (
        <span key={item.id} className="contents">
          {index > 0 && (
            <span aria-hidden="true" className="text-slate-700">
              |
            </span>
          )}
          {item.id === current ? (
            <span aria-current="page" className="text-cyan-300">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="text-slate-400 transition hover:text-cyan-300"
            >
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
