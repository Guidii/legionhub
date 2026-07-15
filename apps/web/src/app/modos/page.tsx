import Link from "next/link";
import { GameModeBuilder } from "@/components/game-mode-builder";
import { KnowledgeNav } from "@/components/knowledge-nav";
import { getGameModeCatalog } from "@/lib/game-mode-data";
import {
  parseGameMode,
  type GameModeSelection,
  type ParsedGameMode,
} from "@/lib/game-modes";

export const metadata = {
  title: "Modos | LegionHub",
  description:
    "Monte visualmente uma configuração de modo para Legion TD 11.4b-beta1.",
};

const initialSelection: GameModeSelection = {
  builder: "PR",
  champions: "CC",
  multiplier: "X3",
  modifiers: [],
};

type ModesPageProps = {
  searchParams: Promise<{ mode?: string | string[] }>;
};

export default async function ModesPage({ searchParams }: ModesPageProps) {
  const [catalog, params] = await Promise.all([
    getGameModeCatalog(),
    searchParams,
  ]);
  const requestedMode =
    typeof params.mode === "string" ? params.mode : undefined;
  const hasModeParameter = params.mode !== undefined;
  const parsedMode =
    requestedMode === undefined
      ? null
      : parseGameMode(requestedMode, catalog);
  const validRequestedMode = parsedMode?.valid === true;
  const selectedMode = validRequestedMode
    ? selectionFromParsedMode(parsedMode)
    : initialSelection;

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
            <KnowledgeNav current="modes" />
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
              Dados {catalog.mapVersion}
            </span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-400">
          Configuração da partida
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          Construtor de modos
        </h1>
        <p className="mt-5 max-w-3xl leading-7 text-slate-400">
          Selecione um builder, uma opção de Champions, um multiplicador e os
          modificadores desejados. O código é composto na ordem confirmada pelo
          menu do jogo.
        </p>

        <div className="mt-10">
          <GameModeBuilder
            groups={catalog.groups}
            initialSelection={selectedMode}
            invalidModeCode={
              hasModeParameter && !validRequestedMode
            }
          />
        </div>
      </section>
    </main>
  );
}

function selectionFromParsedMode(parsed: ParsedGameMode): GameModeSelection {
  if (
    parsed.builder === null ||
    parsed.champions === null ||
    parsed.multiplier === null
  ) {
    return initialSelection;
  }

  return {
    builder: parsed.builder.token,
    champions: parsed.champions.token,
    multiplier: parsed.multiplier.token,
    modifiers: parsed.modifiers.map((modifier) => modifier.token),
  };
}
