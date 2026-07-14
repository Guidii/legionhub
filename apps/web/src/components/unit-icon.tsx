import Image from "next/image";

type UnitIconProps = {
  rawcode: string;
  name: string;
  webPath: string | null;
  size: number;
};

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "?";
}

export function UnitIcon({ rawcode, name, webPath, size }: UnitIconProps) {
  const sharedClassName =
    "shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30";

  if (webPath) {
    return (
      <div
        className={sharedClassName}
        style={{ width: size, height: size }}
      >
        <Image
          src={webPath}
          alt={`Ícone de ${name}`}
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${name}: imagem indisponível`}
      className={`${sharedClassName} flex flex-col items-center justify-center text-center`}
      style={{ width: size, height: size }}
    >
      <span className="font-black leading-none text-slate-300">
        {getInitials(name)}
      </span>
      <span className="mt-1 max-w-full truncate px-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
        {rawcode}
      </span>
    </div>
  );
}
