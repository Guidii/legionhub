import Link from "next/link";
import { UnitExplorer } from "@/components/unit-explorer";
import { getFighters } from "@/lib/legion-data";

export const metadata = {
  title: "Unidades | LegionHub",
  description:
    "Explore unidades, custos, atributos, habilidades e upgrades do Legion TD Team OZE 11.4b-beta1.",
};

export default async function UnitsPage() {
  const units = await getFighters();

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="group">
            <p className="text-xl font-black tracking-tight">
              LEGION<span className="text-cyan-400">HUB</span>
            </p>
            <p className="text-xs text-slate-500 transition group-hover:text-slate-400">
              Voltar para a página inicial
            </p>
          </Link>

          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            Dados 11.4b-beta1
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-400">
          Base de conhecimento
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          Unidades do Legion TD
        </h1>
        <p className="mt-5 max-w-3xl leading-7 text-slate-400">
          Dados extraídos diretamente do mapa Team OZE 11.4b-beta1. Use a
          busca e os filtros para comparar custo, HP, dano, tipo de ataque,
          builders, habilidades e upgrades.
        </p>

        <div className="mt-10">
          <UnitExplorer units={units} />
        </div>
      </section>
    </main>
  );
}
