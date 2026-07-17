"use client";

import { useMemo, useState } from "react";
import { UnitIcon } from "@/components/unit-icon";
import type { CoachUnit } from "@/lib/coach-data";
import type { GameModeGroups } from "@/lib/game-modes";

type RollAnalyzerProps = {
  modeGroups: GameModeGroups;
  units: CoachUnit[];
};

export function RollAnalyzer({ modeGroups, units }: RollAnalyzerProps) {
  const modes = useMemo(
    () =>
      modeGroups.builder.flatMap((builder) =>
        modeGroups.champions.flatMap((champions) =>
          modeGroups.multiplier.map(
            (multiplier) =>
              `${builder.token}${champions.token}${multiplier.token}`,
          ),
        ),
      ),
    [modeGroups],
  );
  const [mode, setMode] = useState(modes[0] ?? "Não disponível");
  const [selectedRawcodes, setSelectedRawcodes] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const selectedUnits = selectedRawcodes.flatMap((rawcode) => {
    const unit = units.find((candidate) => candidate.rawcode === rawcode);
    return unit ? [unit] : [];
  });
  const normalizedQuery = normalize(query.trim());
  const filteredUnits = units.filter(
    (unit) =>
      (normalizedQuery === "" ||
        normalize(unit.name).includes(normalizedQuery) ||
        normalize(unit.rawcode).includes(normalizedQuery)),
  );
  const rangedCount = selectedUnits.filter(
    (unit) => unit.rangeType?.toLowerCase() === "ranged",
  ).length;
  const upgradesAvailable = selectedUnits.reduce(
    (total, unit) => total + unit.upgradeCount,
    0,
  );
  const groupedUnits = useMemo(() => {
    const groups = new Map<number | null, CoachUnit[]>();

    for (const unit of filteredUnits) {
      const group = groups.get(unit.tier) ?? [];
      group.push(unit);
      groups.set(unit.tier, group);
    }

    return [...groups.entries()].sort(([left], [right]) => {
      if (left === null) return 1;
      if (right === null) return -1;
      return left - right;
    });
  }, [filteredUnits]);
  const remainingUnits = 6 - selectedUnits.length;

  function toggleUnit(rawcode: string) {
    setSelectedRawcodes((current) =>
      current.includes(rawcode)
        ? current.filter((selected) => selected !== rawcode)
        : current.length < 6
          ? [...current, rawcode]
          : current,
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <label htmlFor="coach-mode" className="text-xl font-black">
          Seleção do modo
        </label>
        <select
          id="coach-mode"
          value={mode}
          onChange={(event) => setMode(event.target.value)}
          className="mt-4 w-full rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 font-mono text-white outline-none focus:border-cyan-400/60 sm:max-w-sm"
        >
          {modes.map((modeCode) => (
            <option key={modeCode} value={modeCode}>
              {modeCode}
            </option>
          ))}
        </select>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
              Roll
            </p>
            <h2 className="mt-2 text-3xl font-black">
              {selectedUnits.length} / 6 selecionadas
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {remainingUnits > 0
                ? `Selecione mais ${remainingUnits} ${remainingUnits === 1 ? "unidade" : "unidades"}.`
                : "Roll completo."}
            </p>
          </div>
        </div>

        <div className="mt-5 grid min-h-24 grid-cols-2 gap-3 rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 sm:grid-cols-3 lg:grid-cols-6">
          {selectedUnits.map((unit) => (
            <button
              key={unit.rawcode}
              type="button"
              onClick={() => toggleUnit(unit.rawcode)}
              className="flex flex-col items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-center transition hover:border-rose-300/30"
              aria-label={`Remover ${unit.name} do roll`}
            >
              <UnitIcon {...unit} webPath={unit.iconPath} size={48} />
              <span className="text-sm font-bold">{unit.name}</span>
              <span className="text-xs text-slate-500">Remover</span>
            </button>
          ))}
          {selectedUnits.length === 0 && (
            <p className="col-span-full self-center text-center text-sm text-slate-600">
              Nenhuma unidade selecionada.
            </p>
          )}
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome ou rawcode"
          aria-label="Buscar unidade"
          className="mt-5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/60"
        />

        <div className="mt-4 max-h-[520px] space-y-6 overflow-y-auto rounded-2xl border border-white/10 bg-black/10 p-4">
          {groupedUnits.map(([tier, tierUnits]) => (
            <section key={tier ?? "unavailable"}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-lg font-black text-cyan-200">
                  {tier === null ? "Tier não disponível" : `Tier ${tier}`}
                </h3>
                <span className="text-xs text-slate-600">
                  {tierUnits.length} unidades
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {tierUnits.map((unit) => {
                  const selected = selectedRawcodes.includes(unit.rawcode);
                  const disabled = selectedUnits.length === 6 && !selected;

                  return (
                    <button
                      key={unit.rawcode}
                      type="button"
                      disabled={disabled}
                      aria-pressed={selected}
                      onClick={() => toggleUnit(unit.rawcode)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-35 ${
                        selected
                          ? "border-cyan-400/70 bg-cyan-400/15 ring-1 ring-cyan-400/30"
                          : "border-white/10 bg-white/[0.03] hover:border-cyan-400/30"
                      }`}
                    >
                      <UnitIcon {...unit} webPath={unit.iconPath} size={48} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">
                          {unit.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {unit.gold} gold · {unit.rawcode}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-cyan-300">
                        {selected ? "Selecionada" : "Adicionar"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {groupedUnits.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              Nenhuma unidade encontrada.
            </p>
          )}
        </div>

        {selectedUnits.length === 6 && (
          <button
            type="button"
            className="mt-5 w-full rounded-xl bg-cyan-400 px-6 py-4 text-base font-black text-slate-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-300"
          >
            Continuar para o Build Planner
          </button>
        )}
      </section>

      <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-6">
        <h2 className="text-xl font-black">Resumo do roll</h2>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryItem label="Tanques" value="Não disponível" />
          <SummaryItem label="Ranged" value={String(rangedCount)} />
          <SummaryItem label="Suporte" value="Não disponível" />
          <SummaryItem label="Aura" value="Não disponível" />
          <SummaryItem
            label="Upgrades disponíveis"
            value={String(upgradesAvailable)}
          />
        </dl>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Placeholder title="Builds">Nenhuma build disponível ainda.</Placeholder>
        <Placeholder title="Posicionamento">
          O posicionamento será implementado futuramente.
        </Placeholder>
      </section>
    </div>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 p-4">
      <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 font-bold text-white">{value}</dd>
    </div>
  );
}

function Placeholder({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-4 rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
        {children}
      </p>
    </div>
  );
}
