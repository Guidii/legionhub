"use client";

import { useEffect, useMemo, useState } from "react";
import {
  composeGameModeSelection,
  formatGameMode,
  type GameModeGroups,
  type GameModeSelection,
  type GameModeToken,
} from "@/lib/game-modes";

type GameModeBuilderProps = {
  groups: GameModeGroups;
  initialSelection: GameModeSelection;
  invalidModeCode: boolean;
};

export function GameModeBuilder({
  groups,
  initialSelection,
  invalidModeCode,
}: GameModeBuilderProps) {
  const [selection, setSelection] = useState(initialSelection);
  const [showInvalidMessage, setShowInvalidMessage] =
    useState(invalidModeCode);
  const [copyStatus, setCopyStatus] = useState<"copied" | "error" | null>(
    null,
  );
  const definitionSet = useMemo(() => ({ groups }), [groups]);
  const parsed = useMemo(
    () => composeGameModeSelection(selection, definitionSet),
    [definitionSet, selection],
  );
  const formatted = formatGameMode(parsed);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", formatted.compactCode);
    window.history.replaceState(null, "", url);
  }, [formatted.compactCode]);

  function selectRequired(
    group: "builder" | "champions" | "multiplier",
    token: string,
  ) {
    setSelection((current) => ({ ...current, [group]: token }));
    setShowInvalidMessage(false);
    setCopyStatus(null);
  }

  function toggleModifier(token: string) {
    setSelection((current) => ({
      ...current,
      modifiers: current.modifiers.includes(token)
        ? current.modifiers.filter((currentToken) => currentToken !== token)
        : [...current.modifiers, token],
    }));
    setShowInvalidMessage(false);
    setCopyStatus(null);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(formatted.compactCode);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="space-y-8">
        <ModeGroup
          title="Builder"
          description="Escolha um builder."
          options={groups.builder}
          selectedTokens={[selection.builder]}
          onSelect={(token) => selectRequired("builder", token)}
        />
        <ModeGroup
          title="Champions"
          description="Defina como os Champions participam da partida."
          options={groups.champions}
          selectedTokens={[selection.champions]}
          onSelect={(token) => selectRequired("champions", token)}
        />
        <ModeGroup
          title="Multiplicador"
          description="Escolha o multiplicador de sends."
          options={groups.multiplier}
          selectedTokens={[selection.multiplier]}
          onSelect={(token) => selectRequired("multiplier", token)}
        />
        <ModeGroup
          title="Modificadores"
          description="Opcionais; você pode selecionar mais de um."
          options={groups.modifiers}
          selectedTokens={selection.modifiers}
          onSelect={toggleModifier}
        />
      </div>

      <aside className="rounded-3xl border border-cyan-400/25 bg-cyan-400/[0.06] p-6 shadow-2xl shadow-cyan-950/30 lg:sticky lg:top-6">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
          Modo selecionado
        </p>
        <p
          aria-live="polite"
          className="mt-4 break-all font-mono text-3xl font-black tracking-wide text-white"
        >
          {formatted.compactCode}
        </p>

        <div className="mt-5 space-y-2" aria-label="Composição do modo">
          {[
            parsed.builder,
            parsed.champions,
            parsed.multiplier,
            ...parsed.modifiers,
          ].map((definition, index) =>
            definition === null ? null : (
              <div key={definition.token}>
                {index > 0 && (
                  <span aria-hidden="true" className="block text-cyan-500">
                    +
                  </span>
                )}
                <p className="font-semibold text-slate-200">
                  {definition.name}
                </p>
              </div>
            ),
          )}
        </div>

        <p className="mt-5 border-t border-white/10 pt-5 text-sm leading-6 text-slate-400">
          {formatted.humanDescription}
        </p>

        <button
          type="button"
          onClick={copyCode}
          className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          Copiar código
        </button>
        <p className="mt-3 min-h-5 text-center text-sm" aria-live="polite">
          {copyStatus === "copied" && (
            <span className="text-emerald-300">Copiado!</span>
          )}
          {copyStatus === "error" && (
            <span className="text-amber-200">
              Não foi possível copiar. Selecione o código manualmente.
            </span>
          )}
        </p>

        {showInvalidMessage && (
          <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm leading-6 text-amber-100">
            Código de modo inválido. Usando configuração inicial.
          </p>
        )}
      </aside>
    </div>
  );
}

function ModeGroup({
  title,
  description,
  options,
  selectedTokens,
  onSelect,
}: {
  title: string;
  description: string;
  options: GameModeToken[];
  selectedTokens: string[];
  onSelect: (token: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-2xl font-black text-white">{title}</legend>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = selectedTokens.includes(option.token);

          return (
            <button
              key={option.token}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(option.token)}
              className={`rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${
                selected
                  ? "border-cyan-300 bg-cyan-400/10 shadow-lg shadow-cyan-950/30"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]"
              }`}
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="font-mono text-sm font-black text-cyan-300">
                    {option.token}
                  </span>
                  <span className="mt-1 block font-bold text-white">
                    {option.name}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                    selected
                      ? "border-cyan-300 bg-cyan-300 text-slate-950"
                      : "border-slate-600 text-transparent"
                  }`}
                >
                  ✓
                </span>
              </span>
              <span className="mt-3 block text-sm leading-6 text-slate-400">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
