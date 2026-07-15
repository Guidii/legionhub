import Link from "next/link";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { RollAnalyzer } from "@/components/roll-analyzer";
import { getCoachData } from "@/lib/coach-data";
import { formatGameMode, parseGameMode } from "@/lib/game-modes";

export const metadata = {
  title: "Coach — Analisador de Roll | LegionHub",
  description:
    "Analise matchups confirmados do seu roll contra uma wave do Legion TD 11.4b-beta1.",
};

const initialModeCode = "PRCCX3";

type CoachPageProps = {
  searchParams: Promise<{
    mode?: string | string[];
    wave?: string | string[];
    roll?: string | string[];
  }>;
};

export default async function CoachPage({ searchParams }: CoachPageProps) {
  const [data, params] = await Promise.all([getCoachData(), searchParams]);
  const warnings: string[] = [];
  const requestedMode = singleParameter(params.mode, "mode", warnings);
  const parsedMode = parseGameMode(
    requestedMode ?? initialModeCode,
    { groups: data.modeGroups },
  );
  const modeCode = parsedMode.valid
    ? formatGameMode(parsedMode).compactCode
    : initialModeCode;

  if (requestedMode !== undefined && !parsedMode.valid) {
    warnings.push(
      `Código de modo inválido (${requestedMode}). Usando ${initialModeCode}.`,
    );
  }

  const requestedWave = singleParameter(params.wave, "wave", warnings);
  const parsedWaveNumber =
    requestedWave !== undefined && /^\d+$/.test(requestedWave)
      ? Number(requestedWave)
      : null;
  const requestedConfirmedWave = data.waves.find(
    (wave) => wave.number === parsedWaveNumber,
  );
  const initialWave = requestedConfirmedWave ?? data.waves[0];

  if (requestedWave !== undefined && requestedConfirmedWave === undefined) {
    warnings.push(
      `Wave ${requestedWave} inexistente ou sem número confirmado. Usando Wave ${initialWave.number}.`,
    );
  }

  const requestedRoll = singleParameter(params.roll, "roll", warnings);
  const initialRoll = parseInitialRoll(
    requestedRoll,
    new Set(data.units.map((unit) => unit.rawcode)),
    warnings,
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
            <KnowledgeNav current="coach" />
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
              MVP · dados confirmados
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-400">
          Primeira versão do Coach
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          Coach — Analisador de Roll
        </h1>
        <p className="mt-5 max-w-3xl leading-7 text-slate-400">
          Selecione o contexto da partida e as unidades disponíveis no seu roll
          para analisar os matchups confirmados contra a wave.
        </p>

        <div className="mt-6 max-w-3xl rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100/80">
          Esta versão apresenta somente relações objetivas da matriz de dano
          confirmada. Ela não recomenda construções nem determina a força total
          de uma unidade.
        </div>

        <div className="mt-10">
          <RollAnalyzer
            mapVersion={data.mapVersion}
            modeGroups={data.modeGroups}
            waves={data.waves}
            units={data.units}
            initialModeCode={modeCode}
            initialWaveNumber={initialWave.number}
            initialRollRawcodes={initialRoll}
            initialWarnings={warnings}
          />
        </div>
      </section>
    </main>
  );
}

function singleParameter(
  value: string | string[] | undefined,
  name: string,
  warnings: string[],
) {
  if (!Array.isArray(value)) return value;
  warnings.push(`Parâmetro ${name} repetido. O valor foi ignorado.`);
  return undefined;
}

function parseInitialRoll(
  value: string | undefined,
  validRawcodes: Set<string>,
  warnings: string[],
) {
  if (value === undefined || value === "") return [];

  const result: string[] = [];
  for (const rawcode of value.split(",").filter(Boolean)) {
    if (!validRawcodes.has(rawcode)) {
      warnings.push(`Rawcode inexistente ignorado: ${rawcode}.`);
      continue;
    }
    if (result.includes(rawcode)) {
      warnings.push(`Rawcode duplicado removido: ${rawcode}.`);
      continue;
    }
    if (result.length === 6) {
      warnings.push("O roll da URL excede 6 unidades; as excedentes foram ignoradas.");
      break;
    }
    result.push(rawcode);
  }

  return result;
}
