import Link from "next/link";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { RollAnalyzer } from "@/components/roll-analyzer";
import { getCoachData } from "@/lib/coach-data";

export const metadata = {
  title: "Coach — Build Planner | LegionHub",
  description: "Planeje seu roll no Coach do LegionHub.",
};

export default async function CoachPage() {
  const data = await getCoachData();

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="group">
            <p className="text-xl font-black tracking-tight">
              LEGION<span className="text-cyan-400">HUB</span>
            </p>
            <p className="text-xs text-slate-500 transition group-hover:text-slate-400">
              Voltar para a página inicial
            </p>
          </Link>
          <KnowledgeNav current="coach" />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-400">
          Build Planner
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          Coach
        </h1>
        <p className="mt-5 max-w-3xl leading-7 text-slate-400">
          Selecione o modo e monte seu roll para preparar o planejamento da
          partida.
        </p>

        <div className="mt-10">
          <RollAnalyzer modeGroups={data.modeGroups} units={data.units} />
        </div>
      </section>
    </main>
  );
}
