"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FighterSummary } from "@/lib/legion-data";
import { createUnitSlug } from "@/lib/unit-slug";

type UnitExplorerProps = {
  units: FighterSummary[];
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatLabel(value: string | null) {
  if (!value) return "Desconhecido";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDamage(unit: FighterSummary) {
  if (unit.damageMin === null || unit.damageMax === null) return "—";
  return `${unit.damageMin}–${unit.damageMax}`;
}

export function UnitExplorer({ units }: UnitExplorerProps) {
  const [query, setQuery] = useState("");
  const [builder, setBuilder] = useState("all");
  const [attackType, setAttackType] = useState("all");
  const [minCost, setMinCost] = useState("");
  const [maxCost, setMaxCost] = useState("");

  const builders = useMemo(
    () =>
      Array.from(new Set(units.flatMap((unit) => unit.builders))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [units],
  );

  const attackTypes = useMemo(
    () =>
      Array.from(
        new Set(
          units
            .map((unit) => unit.attackType)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [units],
  );

  const filteredUnits = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    const minimumCost = minCost === "" ? null : Number(minCost);
    const maximumCost = maxCost === "" ? null : Number(maxCost);

    return units.filter((unit) => {
      const matchesQuery =
        !normalizedQuery ||
        normalize(unit.name).includes(normalizedQuery) ||
        normalize(unit.rawcode).includes(normalizedQuery) ||
        unit.abilities.some((ability) =>
          normalize(ability).includes(normalizedQuery),
        ) ||
        unit.upgrades.some((upgrade) =>
          normalize(upgrade.name).includes(normalizedQuery),
        );

      const matchesBuilder =
        builder === "all" || unit.builders.includes(builder);
      const matchesAttack =
        attackType === "all" || unit.attackType === attackType;
      const matchesCost =
        (minimumCost === null || unit.totalGoldValue >= minimumCost) &&
        (maximumCost === null || unit.totalGoldValue <= maximumCost);

      return matchesQuery && matchesBuilder && matchesAttack && matchesCost;
    });
  }, [attackType, builder, maxCost, minCost, query, units]);

  return (
    <section>
      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_150px_150px]">
        <label className="block md:col-span-2 xl:col-span-1">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Buscar
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, habilidade, upgrade ou rawcode"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Builder
          </span>
          <select
            value={builder}
            onChange={(event) => setBuilder(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/60"
          >
            <option value="all">Todos</option>
            {builders.map((builderName) => (
              <option key={builderName} value={builderName}>
                {builderName}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Tipo de ataque
          </span>
          <select
            value={attackType}
            onChange={(event) => setAttackType(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/60"
          >
            <option value="all">Todos</option>
            {attackTypes.map((type) => (
              <option key={type} value={type}>
                {formatLabel(type)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Custo total mínimo
          </span>
          <input
            type="number"
            min="0"
            value={minCost}
            onChange={(event) => setMinCost(event.target.value)}
            placeholder="Ex.: 50"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Custo total máximo
          </span>
          <input
            type="number"
            min="0"
            value={maxCost}
            onChange={(event) => setMaxCost(event.target.value)}
            placeholder="Ex.: 200"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60"
          />
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-400">
          <strong className="text-white">{filteredUnits.length}</strong> de{" "}
          {units.length} unidades
        </p>

        {(query ||
          builder !== "all" ||
          attackType !== "all" ||
          minCost ||
          maxCost) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setBuilder("all");
              setAttackType("all");
              setMinCost("");
              setMaxCost("");
            }}
            className="text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredUnits.map((unit) => (
          <Link
            key={unit.rawcode}
            href={`/unidades/${createUnitSlug(unit.name, unit.rawcode)}`}
            className="block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:-translate-y-1 hover:border-cyan-400/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  {unit.rawcode}
                </p>
                <h2 className="mt-2 text-xl font-black">{unit.name}</h2>
              </div>

              <div className="rounded-xl bg-amber-400/10 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-wider text-amber-300/70">
                  Gold
                </p>
                <p className="font-black text-amber-300">{unit.gold}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-[10px] uppercase text-slate-500">HP</p>
                <p className="mt-1 font-bold">{unit.hp ?? "—"}</p>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-[10px] uppercase text-slate-500">Dano</p>
                <p className="mt-1 font-bold">{formatDamage(unit)}</p>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-[10px] uppercase text-slate-500">Alcance</p>
                <p className="mt-1 font-bold">{unit.range ?? "—"}</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
                <dt className="text-slate-500">Ataque</dt>
                <dd className="font-semibold text-slate-200">
                  {formatLabel(unit.attackType)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
                <dt className="text-slate-500">Defesa</dt>
                <dd className="font-semibold text-slate-200">
                  {formatLabel(unit.defenseType)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Builders</dt>
                <dd className="max-w-[65%] text-right font-semibold text-slate-200">
                  {unit.builders.length ? unit.builders.join(", ") : "—"}
                </dd>
              </div>
            </dl>

            {unit.abilities.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Habilidades
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...new Set(unit.abilities)].map((ability) => (
                    <span
                      key={`${unit.rawcode}-${ability}`}
                      className="rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs font-semibold text-purple-200"
                    >
                      {ability}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Upgrade direto
              </p>
              {unit.upgrades.length ? (
                <div className="mt-2 space-y-2">
                  {unit.upgrades.map((upgrade) => (
                    <div
                      key={upgrade.rawcode}
                      className="flex items-center justify-between rounded-xl bg-cyan-400/5 px-3 py-2"
                    >
                      <span className="font-semibold text-cyan-100">
                        {upgrade.name}
                      </span>
                      <span className="text-sm text-cyan-300">
                        {upgrade.upgradeGoldCost === null
                          ? "Custo a confirmar"
                          : `+${upgrade.upgradeGoldCost} gold`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">Sem upgrade direto</p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {filteredUnits.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="font-bold">Nenhuma unidade encontrada.</p>
          <p className="mt-2 text-sm text-slate-500">
            Tente remover um filtro ou usar outro termo.
          </p>
        </div>
      )}
    </section>
  );
}
