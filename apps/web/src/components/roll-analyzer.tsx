"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { UnitIcon } from "@/components/unit-icon";
import type { Build } from "@/lib/build-catalog";
import type { CoachUnit } from "@/lib/coach-data";
import type { GameModeGroups } from "@/lib/game-modes";

type RollAnalyzerProps = {
  modeGroups: GameModeGroups;
  units: CoachUnit[];
  builds: Build[];
};

export function RollAnalyzer({ modeGroups, units, builds }: RollAnalyzerProps) {
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
  const [plannerVisible, setPlannerVisible] = useState(false);

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
  const compatibleBuilds = builds.filter(
    (build) =>
      build.compatibleModes.includes(mode) &&
      build.requiredUnitRawcodes.every((rawcode) =>
        selectedRawcodes.includes(rawcode),
      ),
  );

  function toggleUnit(rawcode: string) {
    setPlannerVisible(false);
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
          onChange={(event) => {
            setMode(event.target.value);
            setPlannerVisible(false);
          }}
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

        <button
          type="button"
          disabled={selectedUnits.length !== 6}
          onClick={() => setPlannerVisible(true)}
          className="mt-5 w-full rounded-xl bg-cyan-400 px-6 py-4 text-base font-black text-slate-950 shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-slate-600 disabled:shadow-none"
        >
          Continuar para o Build Planner
        </button>
        {remainingUnits > 0 && (
          <p className="mt-3 text-center text-sm font-semibold text-slate-500">
            Selecione mais {remainingUnits} {remainingUnits === 1 ? "unidade" : "unidades"} para continuar.
          </p>
        )}
      </section>

      {plannerVisible && (
        <>
          <section className="rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.05] p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Build Planner
            </p>
            <h2 className="mt-2 text-2xl font-black">Builds encontradas</h2>

            {compatibleBuilds.length > 0 ? (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {compatibleBuilds.map((build) => (
                  <BuildCard key={build.id} build={build} units={units} />
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-xl border border-dashed border-white/10 p-8 text-center text-slate-400">
                Nenhuma build cadastrada para este roll.
              </p>
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

          <section>
            <Placeholder title="Posicionamento">
              O posicionamento será implementado futuramente.
            </Placeholder>
          </section>
        </>
      )}
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

function BuildCard({ build, units }: { build: Build; units: CoachUnit[] }) {
  const unitNames = new Map(units.map((unit) => [unit.rawcode, unit.name]));

  return (
    <Link
      href={`/coach/builds/${build.id}`}
      className="block rounded-2xl border border-white/10 bg-black/20 p-5 transition hover:-translate-y-0.5 hover:border-cyan-400/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-black">{build.title}</h3>
        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">
          {build.status === "experimental" ? "Experimental" : build.status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">
        {build.shortDescription}
      </p>
      <dl className="mt-4 space-y-3 text-sm">
        <BuildDetail
          label="Obrigatórias"
          value={formatUnitNames(build.requiredUnitRawcodes, unitNames)}
        />
        <BuildDetail
          label="Opcionais"
          value={formatUnitNames(build.optionalUnitRawcodes, unitNames)}
        />
        <BuildDetail
          label="Dificuldade"
          value={
            build.difficulty === "not-rated"
              ? "Não avaliada"
              : build.difficulty
          }
        />
        <BuildDetail
          label="Rating"
          value={build.rating === null ? "Não avaliado" : build.rating.toFixed(1)}
        />
      </dl>
      <p className="mt-5 text-sm font-bold text-cyan-300">
        Ver detalhes da build →
      </p>
    </Link>
  );
}

function BuildDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-white/5 pt-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[65%] text-right font-semibold text-slate-200">
        {value}
      </dd>
    </div>
  );
}

function formatUnitNames(rawcodes: string[], names: Map<string, string>) {
  return rawcodes.map((rawcode) => names.get(rawcode) ?? rawcode).join(", ");
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
