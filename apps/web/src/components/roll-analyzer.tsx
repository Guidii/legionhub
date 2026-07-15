"use client";

import { useEffect, useMemo, useState } from "react";
import { UnitIcon } from "@/components/unit-icon";
import type { CoachUnit, CoachWave } from "@/lib/coach-data";
import {
  formatGameMode,
  parseGameMode,
  type GameModeGroups,
} from "@/lib/game-modes";

type RollAnalyzerProps = {
  mapVersion: string;
  modeGroups: GameModeGroups;
  waves: CoachWave[];
  units: CoachUnit[];
  initialModeCode: string;
  initialWaveNumber: number;
  initialRollRawcodes: string[];
  initialWarnings: string[];
};

type SortMode = "roll" | "multiplier";

const unitsPerPage = 12;

export function RollAnalyzer({
  mapVersion,
  modeGroups,
  waves,
  units,
  initialModeCode,
  initialWaveNumber,
  initialRollRawcodes,
  initialWarnings,
}: RollAnalyzerProps) {
  const [modeCode, setModeCode] = useState(initialModeCode);
  const [modeDraft, setModeDraft] = useState(initialModeCode);
  const [modeError, setModeError] = useState<string | null>(null);
  const [waveNumber, setWaveNumber] = useState(initialWaveNumber);
  const [rollRawcodes, setRollRawcodes] = useState(initialRollRawcodes);
  const [query, setQuery] = useState("");
  const [visibleUnitCount, setVisibleUnitCount] = useState(unitsPerPage);
  const [sortMode, setSortMode] = useState<SortMode>("roll");
  const [rollFeedback, setRollFeedback] = useState<string | null>(null);
  const definitionSet = useMemo(() => ({ groups: modeGroups }), [modeGroups]);
  const unitByRawcode = useMemo(
    () => new Map(units.map((unit) => [unit.rawcode, unit])),
    [units],
  );
  const selectedWave =
    waves.find((wave) => wave.number === waveNumber) ?? waves[0];
  const selectedUnits = rollRawcodes.flatMap((rawcode) => {
    const unit = unitByRawcode.get(rawcode);
    return unit === undefined ? [] : [unit];
  });
  const filteredUnits = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    if (normalizedQuery === "") return units;

    return units.filter(
      (unit) =>
        normalize(unit.name).includes(normalizedQuery) ||
        normalize(unit.rawcode).includes(normalizedQuery),
    );
  }, [query, units]);
  const displayedUnits =
    query.trim() === ""
      ? filteredUnits.slice(0, visibleUnitCount)
      : filteredUnits;
  const analyzedUnits = useMemo(() => {
    const entries = selectedUnits.map((unit, rollIndex) => ({
      unit,
      rollIndex,
      matchup: getMatchup(unit, selectedWave),
    }));

    if (sortMode === "roll") return entries;

    return [...entries].sort((left, right) => {
      const leftMultiplier = left.matchup.multiplier;
      const rightMultiplier = right.matchup.multiplier;
      if (leftMultiplier === null && rightMultiplier !== null) return 1;
      if (leftMultiplier !== null && rightMultiplier === null) return -1;
      if (leftMultiplier !== null && rightMultiplier !== null) {
        const difference = rightMultiplier - leftMultiplier;
        if (difference !== 0) return difference;
      }
      return left.rollIndex - right.rollIndex;
    });
  }, [selectedUnits, selectedWave, sortMode]);
  const matchupSummary = useMemo(() => {
    const confirmed = selectedUnits.flatMap((unit) => {
      const matchup = getMatchup(unit, selectedWave);
      return matchup.multiplier === null ? [] : [{ unit, matchup }];
    });
    const unavailableCount = selectedUnits.length - confirmed.length;

    if (confirmed.length === 0) {
      return { confirmed, unavailableCount, highest: null, winners: [] };
    }

    const highest = Math.max(
      ...confirmed.map(({ matchup }) => matchup.multiplier as number),
    );
    const winners = confirmed.filter(
      ({ matchup }) => matchup.multiplier === highest,
    );

    return { confirmed, unavailableCount, highest, winners };
  }, [selectedUnits, selectedWave]);
  const allConfirmedNeutral =
    matchupSummary.confirmed.length > 0 &&
    matchupSummary.confirmed.every(
      ({ matchup }) => matchup.multiplier === 1,
    );

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", modeCode);
    url.searchParams.set("wave", String(selectedWave.number));
    if (rollRawcodes.length > 0) {
      url.searchParams.set("roll", rollRawcodes.join(","));
    } else {
      url.searchParams.delete("roll");
    }
    window.history.replaceState(null, "", url);
  }, [modeCode, rollRawcodes, selectedWave.number]);

  function applyMode() {
    const parsed = parseGameMode(modeDraft, definitionSet);
    if (!parsed.valid) {
      setModeError("Código de modo inválido. O contexto anterior foi mantido.");
      return;
    }

    const normalizedMode = formatGameMode(parsed).compactCode;
    setModeCode(normalizedMode);
    setModeDraft(normalizedMode);
    setModeError(null);
  }

  function addUnit(rawcode: string) {
    if (rollRawcodes.includes(rawcode)) {
      setRollFeedback("Essa unidade já está no roll.");
      return;
    }
    if (rollRawcodes.length >= 6) {
      setRollFeedback("O roll já atingiu o limite de 6 unidades.");
      return;
    }

    setRollRawcodes((current) => [...current, rawcode]);
    setRollFeedback(null);
  }

  function removeUnit(rawcode: string) {
    setRollRawcodes((current) =>
      current.filter((currentRawcode) => currentRawcode !== rawcode),
    );
    setRollFeedback(null);
  }

  function clearRoll() {
    setRollRawcodes([]);
    setRollFeedback("Roll limpo.");
  }

  function generateRandomRoll() {
    const shuffledRawcodes = units.map((unit) => unit.rawcode);
    for (let index = shuffledRawcodes.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffledRawcodes[index], shuffledRawcodes[randomIndex]] = [
        shuffledRawcodes[randomIndex],
        shuffledRawcodes[index],
      ];
    }
    let nextRoll = shuffledRawcodes.slice(0, 6);
    const currentRollSet = new Set(rollRawcodes);
    if (
      units.length > 6 &&
      nextRoll.length === rollRawcodes.length &&
      nextRoll.every((rawcode) => currentRollSet.has(rawcode))
    ) {
      const replacementRawcode = shuffledRawcodes.find(
        (rawcode) => !currentRollSet.has(rawcode),
      );
      if (replacementRawcode !== undefined) {
        nextRoll = [...nextRoll.slice(1), replacementRawcode];
      }
    }
    setRollRawcodes(nextRoll);
    setRollFeedback("Novo roll aleatório gerado para simulação.");
  }

  return (
    <div className="space-y-10">
      {initialWarnings.length > 0 && (
        <section className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4">
          <h2 className="font-bold text-amber-200">Avisos da URL</h2>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-amber-100/80">
            {initialWarnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-xl font-black">Modo</h2>
          <form
            className="mt-4 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              applyMode();
            }}
          >
            <label className="min-w-0 flex-1">
              <span className="sr-only">Código do modo</span>
              <input
                value={modeDraft}
                onChange={(event) => setModeDraft(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono uppercase text-white outline-none focus:border-cyan-400/60"
              />
            </label>
            <button
              type="submit"
              className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              Aplicar
            </button>
          </form>
          {modeError && (
            <p className="mt-3 text-sm text-amber-200" role="alert">
              {modeError}
            </p>
          )}
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Modo registrado como contexto. Seus efeitos ainda não alteram a
            análise desta versão.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <label htmlFor="coach-wave" className="text-xl font-black">
            Wave confirmada
          </label>
          <select
            id="coach-wave"
            value={waveNumber}
            onChange={(event) => setWaveNumber(Number(event.target.value))}
            className="mt-4 w-full rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 text-white outline-none focus:border-cyan-400/60"
          >
            {waves.map((wave) => (
              <option key={wave.number} value={wave.number}>
                Wave {wave.number} — {wave.name}
              </option>
            ))}
          </select>
          <div className="mt-4 flex items-center gap-3">
            <UnitIcon
              rawcode={selectedWave.rawcode}
              name={selectedWave.name}
              webPath={selectedWave.iconPath}
              size={56}
            />
            <div>
              <p className="font-bold">{selectedWave.name}</p>
              <p className="font-mono text-xs text-slate-500">
                {selectedWave.rawcode}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Defesa: {formatLabel(selectedWave.defenseType)} ·{" "}
                {waveConfidenceLabel(selectedWave.confidence)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Seleção do roll</h2>
            <p className="mt-2 text-sm text-slate-500">
              Busque por nome ou rawcode e selecione até 6 unidades.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <p className="font-mono text-lg font-black text-cyan-300">
              {rollRawcodes.length}/6
            </p>
            <button
              type="button"
              onClick={clearRoll}
              disabled={rollRawcodes.length === 0}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-rose-300/30 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Limpar roll
            </button>
            <button
              type="button"
              onClick={generateRandomRoll}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              {rollRawcodes.length === 6
                ? "Gerar novamente"
                : "Gerar roll aleatório"}
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          Roll aleatório do LegionHub para simulação; não reproduz
          necessariamente o sorteio interno do mapa.
        </p>

        <label className="mt-5 block">
          <span className="sr-only">Buscar unidade</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome ou rawcode"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/60"
          />
        </label>

        {rollFeedback && (
          <p className="mt-3 text-sm text-amber-200" aria-live="polite">
            {rollFeedback}
          </p>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {displayedUnits.map((unit) => {
            const selected = rollRawcodes.includes(unit.rawcode);
            const rollIsFull = rollRawcodes.length >= 6 && !selected;
            return (
              <button
                key={unit.rawcode}
                type="button"
                disabled={selected || rollIsFull}
                onClick={() => addUnit(unit.rawcode)}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-cyan-400/30 disabled:cursor-default disabled:border-emerald-400/20 disabled:bg-emerald-400/5"
              >
                <UnitIcon
                  rawcode={unit.rawcode}
                  name={unit.name}
                  webPath={unit.iconPath}
                  size={48}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{unit.name}</span>
                  <span className="font-mono text-xs text-slate-500">
                    {unit.rawcode}
                  </span>
                  <span className="mt-1 block text-xs text-slate-400">
                    Ataque {formatLabel(unit.attackType)} · Defesa{" "}
                    {formatLabel(unit.defenseType)}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {unit.gold} gold · PV {formatValue(unit.pointValue)}
                  </span>
                </span>
                <span className="text-xs font-bold text-cyan-300">
                  {selected ? "Adicionada" : rollIsFull ? "Roll completo" : "Adicionar"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            {query.trim() === ""
              ? `${displayedUnits.length} de ${filteredUnits.length} unidades exibidas`
              : `${filteredUnits.length} resultados encontrados`}
          </p>
          {query.trim() === "" && filteredUnits.length > unitsPerPage && (
            <button
              type="button"
              onClick={() =>
                setVisibleUnitCount((current) =>
                  current >= filteredUnits.length
                    ? unitsPerPage
                    : Math.min(current + unitsPerPage, filteredUnits.length),
                )
              }
              className="rounded-xl border border-cyan-400/20 px-4 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/10"
            >
              {visibleUnitCount >= filteredUnits.length
                ? "Mostrar menos"
                : "Mostrar mais unidades"}
            </button>
          )}
        </div>

        {filteredUnits.length === 0 && (
          <p className="mt-5 rounded-xl border border-dashed border-white/10 p-8 text-center text-slate-500">
            Nenhuma unidade encontrada.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {selectedUnits.map((unit, index) => (
            <div
              key={unit.rawcode}
              className="flex items-center gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3"
            >
              <span className="font-mono text-xs text-cyan-300">
                {index + 1}
              </span>
              <span className="font-semibold">{unit.name}</span>
              <button
                type="button"
                onClick={() => removeUnit(unit.rawcode)}
                className="rounded px-2 py-1 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300"
                aria-label={`Remover ${unit.name} do roll`}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Análise do matchup</h2>
            <p className="mt-2 text-sm text-slate-500">
              Comparação limitada à matriz ataque × defesa.
            </p>
          </div>
          <label>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Ordenar por
            </span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/60"
            >
              <option value="roll">Ordem do roll</option>
              <option value="multiplier">Maior multiplicador de dano</option>
            </select>
          </label>
        </div>

        {sortMode === "multiplier" && (
          <p className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/5 p-3 text-sm leading-6 text-amber-100/80">
            Ordenar por multiplicador compara apenas a matriz ataque × defesa.
            Isso não considera habilidades, tank, posicionamento, alcance, custo
            total da composição ou sinergia.
          </p>
        )}

        {selectedUnits.length > 0 && (
          <section className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Melhor matchup de dano
            </p>
            {matchupSummary.confirmed.length === 0 ? (
              <p className="mt-3 font-semibold text-slate-200">
                Não há matchups confirmados suficientes para comparar este roll.
              </p>
            ) : allConfirmedNeutral ? (
              <div className="mt-3">
                <p className="font-semibold text-slate-100">
                  Nenhuma unidade possui vantagem ou desvantagem pela matriz contra esta defesa.
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Todas as opções confirmadas causam 1.00x.
                </p>
                {selectedWave.defenseType?.toLowerCase() === "none" && (
                  <p className="mt-2 text-sm font-semibold text-cyan-200">
                    Defesa None: todos os matchups confirmados são neutros pela matriz.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-3">
                <p className="font-semibold text-slate-100">
                  {matchupSummary.winners.length === 1
                    ? "Maior multiplicador do roll contra esta defesa"
                    : "Empate no maior multiplicador do roll"}
                </p>
                <p className="mt-2 text-lg font-black text-cyan-200">
                  {matchupSummary.winners
                    .map(({ unit }) => unit.name)
                    .join(", ")} {matchupSummary.highest?.toFixed(2)}x
                </p>
                {matchupSummary.winners.length === 1 && (
                  <p className="mt-1 text-sm text-slate-400">
                    {formatLabel(matchupSummary.winners[0].unit.attackType)} contra defesa {formatLabel(selectedWave.defenseType)}
                  </p>
                )}
              </div>
            )}
            {matchupSummary.unavailableCount > 0 && (
              <p className="mt-3 text-sm text-amber-100/80">
                Unidades com matchup não confirmado não participaram desta comparação.
              </p>
            )}
          </section>
        )}

        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {analyzedUnits.map(({ unit, matchup }) => {
            const isHighest =
              matchup.multiplier !== null &&
              !allConfirmedNeutral &&
              matchup.multiplier === matchupSummary.highest;
            return (
            <article
              key={unit.rawcode}
              className={`rounded-2xl border bg-white/[0.03] p-5 ${
                isHighest ? "border-cyan-400/50" : "border-white/10"
              }`}
            >
              {isHighest && (
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-cyan-300">
                  {matchupSummary.winners.length > 1
                    ? "Empate no maior multiplicador"
                    : "Maior multiplicador"}
                </p>
              )}
              <div className="flex items-center gap-3">
                <UnitIcon
                  rawcode={unit.rawcode}
                  name={unit.name}
                  webPath={unit.iconPath}
                  size={56}
                />
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-black">{unit.name}</h3>
                  <p className="font-mono text-xs text-slate-500">
                    {unit.rawcode}
                  </p>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-2 text-sm">
                <Stat label="Custo" value={`${unit.gold} gold`} />
                <Stat label="Point Value" value={formatValue(unit.pointValue)} />
                <Stat label="HP" value={formatValue(unit.hp)} />
                <Stat
                  label="DPS base"
                  value={unit.dps === null ? "—" : unit.dps.toFixed(2)}
                />
                <Stat label="Ataque" value={formatLabel(unit.attackType)} />
                <Stat label="Defesa" value={formatLabel(unit.defenseType)} />
              </dl>

              <div className="mt-5 rounded-xl bg-black/20 p-4">
                <p className="text-xs text-slate-500">
                  Contra defesa {formatLabel(selectedWave.defenseType)}
                </p>
                <p className="mt-2 text-2xl font-black text-cyan-300">
                  {matchup.multiplier === null
                    ? "Não confirmado"
                    : `${matchup.multiplier.toFixed(2)}x`}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-300">
                  {matchup.label}
                </p>
              </div>
            </article>
            );
          })}
        </div>

        {analyzedUnits.length === 0 && (
          <p className="mt-6 rounded-2xl border border-dashed border-white/10 p-10 text-center text-slate-500">
            Adicione unidades ao roll para iniciar a análise.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.05] p-6">
        <h2 className="text-xl font-black">Resumo do contexto</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ContextItem label="Modo" value={modeCode} mono />
          <ContextItem
            label="Wave"
            value={`Wave ${selectedWave.number} — ${selectedWave.name}`}
          />
          <ContextItem
            label="Defesa da wave"
            value={formatLabel(selectedWave.defenseType)}
          />
          <ContextItem
            label="Roll"
            value={`${rollRawcodes.length}/6 unidades`}
          />
          <ContextItem
            label="Matchups confirmados"
            value={String(matchupSummary.confirmed.length)}
          />
          <ContextItem
            label="Matchups indisponíveis"
            value={String(matchupSummary.unavailableCount)}
          />
          <ContextItem
            label="Maior multiplicador"
            value={
              matchupSummary.highest === null
                ? "—"
                : allConfirmedNeutral && selectedWave.defenseType?.toLowerCase() === "none"
                  ? "1.00x · todos neutros"
                  : `${matchupSummary.highest.toFixed(2)}x`
            }
          />
        </dl>
        <p className="mt-6 border-t border-white/10 pt-5 text-sm leading-6 text-slate-400">
          Análise baseada na matriz de dano confirmada da versão {mapVersion}.
          Maior multiplicador não significa melhor unidade absoluta, e o
          resultado não representa sozinho a força total de uma unidade.
        </p>
      </section>
    </div>
  );
}

function getMatchup(unit: CoachUnit, wave: CoachWave) {
  if (unit.attackTypeUnconfirmed) {
    return {
      multiplier: null,
      label: `Matchup não confirmado para ataque ${formatLabel(unit.attackType)}.`,
    };
  }
  if (wave.defenseType === null) {
    return {
      multiplier: null,
      label: "Tipo de defesa da wave indisponível.",
    };
  }

  const multiplier = unit.multipliersByDefense[wave.defenseType] ?? null;
  if (multiplier === null) {
    return {
      multiplier: null,
      label: "Matchup indisponível: tipo de ataque ou defesa não confirmado.",
    };
  }

  return {
    multiplier,
    label:
      multiplier > 1
        ? "Vantagem de dano pela matriz"
        : multiplier < 1
          ? "Desvantagem de dano pela matriz"
          : "Neutro pela matriz",
  };
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatLabel(value: string | null) {
  if (value === null) return "Indisponível";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatValue(value: number | null) {
  return value === null ? "—" : value.toLocaleString("pt-BR");
}

function waveConfidenceLabel(confidence: CoachWave["confidence"]) {
  return confidence === "confirmed-directly"
    ? "Confirmada diretamente no mapa"
    : "Confirmada em jogo";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 p-3">
      <dt className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-bold text-slate-100">{value}</dd>
    </div>
  );
}

function ContextItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className={`mt-2 font-bold ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
