import Link from "next/link";
import { WaveExplorer } from "@/components/wave-explorer";
import {
  getAttackMultipliersForDefense,
  getUnconfirmedAttackTypes,
} from "@/lib/damage-matrix";
import { getPreliminaryWaves } from "@/lib/wave-data";

export const metadata = {
  title: "Waves | LegionHub",
  description:
    "Explore a base preliminar de waves do Legion TD Team OZE 11.4b-beta1.",
};

export default async function WavesPage() {
  const dataset = await getPreliminaryWaves();
  const defenseTypes = Array.from(
    new Set(
      dataset.waves
        .map((wave) => wave.stats.defenseTypeRaw)
        .filter((value): value is string => value !== null),
    ),
  );
  const [damageMultiplierEntries, unconfirmedAttackTypes] = await Promise.all([
    Promise.all(
      defenseTypes.map(async (defenseType) => [
        defenseType,
        await getAttackMultipliersForDefense(defenseType),
      ] as const),
    ),
    getUnconfirmedAttackTypes(),
  ]);
  const damageMultipliersByDefense = Object.fromEntries(
    damageMultiplierEntries,
  );

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

          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3">
            <nav
              aria-label="Base de conhecimento"
              className="flex items-center gap-2 text-sm font-semibold"
            >
              <Link
                href="/unidades"
                className="text-slate-400 transition hover:text-cyan-300"
              >
                Unidades
              </Link>
              <span aria-hidden="true" className="text-slate-700">
                |
              </span>
              <span aria-current="page" className="text-cyan-300">
                Waves
              </span>
            </nav>
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
              Dataset preliminar
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-400">
          Base de conhecimento
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          Waves
        </h1>
        <p className="mt-5 max-w-3xl leading-7 text-slate-400">
          Dados do mapa Legion TD {dataset.mapVersion}. Algumas associações
          foram confirmadas diretamente; outras ainda são inferidas pela
          sequência dos objetos. A quantidade de creeps e os modificadores de
          modo ainda não foram confirmados.
        </p>

        <div className="mt-6 max-w-3xl rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100/80">
          <strong className="text-amber-200">Dataset preliminar.</strong>{" "}
          Associações inferidas estão identificadas individualmente e não devem
          ser tratadas como fatos confirmados.
        </div>

        <div className="mt-10">
          <WaveExplorer
            waves={dataset.waves}
            damageMultipliersByDefense={damageMultipliersByDefense}
            unconfirmedAttackTypes={unconfirmedAttackTypes}
          />
        </div>
      </section>
    </main>
  );
}
