"use client";

import { useMemo, useState } from "react";
import type { ConfirmedDamageMultiplier } from "@/lib/damage-matrix";
import type {
  PreliminaryWave,
  WaveConfidence,
} from "@/lib/wave-data";

type WaveExplorerProps = {
  waves: PreliminaryWave[];
  damageMultipliersByDefense: Record<string, ConfirmedDamageMultiplier[]>;
  unconfirmedAttackTypes: string[];
};

const confidenceLabels: Record<WaveConfidence, string> = {
  "confirmed-directly": "Confirmada diretamente",
  "inferred-from-sequence": "Inferida pela sequência",
  unknown: "Confiança desconhecida",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatLabel(value: string | null) {
  if (value === null) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatValue(value: number | null) {
  return value === null ? "—" : value.toLocaleString("pt-BR");
}

export function WaveExplorer({
  waves,
  damageMultipliersByDefense,
  unconfirmedAttackTypes,
}: WaveExplorerProps) {
  const [query, setQuery] = useState("");
  const [confidence, setConfidence] = useState<WaveConfidence | "all">("all");
  const [attackType, setAttackType] = useState("all");
  const [defenseType, setDefenseType] = useState("all");

  const confirmedCount = useMemo(
    () =>
      waves.filter((wave) => wave.numberConfidence === "confirmed-directly")
        .length,
    [waves],
  );
  const inferredCount = useMemo(
    () =>
      waves.filter(
        (wave) => wave.numberConfidence === "inferred-from-sequence",
      ).length,
    [waves],
  );
  const quantitiesConfirmed = useMemo(
    () => waves.length > 0 && waves.every((wave) => wave.quantity !== null),
    [waves],
  );

  const attackTypes = useMemo(
    () =>
      Array.from(
        new Set(
          waves
            .map((wave) => wave.attack.attackTypeRaw)
            .filter((value): value is string => value !== null),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [waves],
  );
  const defenseTypes = useMemo(
    () =>
      Array.from(
        new Set(
          waves
            .map((wave) => wave.stats.defenseTypeRaw)
            .filter((value): value is string => value !== null),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [waves],
  );

  const filteredWaves = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    return waves.filter((wave) => {
      const matchesQuery =
        !normalizedQuery ||
        normalize(wave.creep.name).includes(normalizedQuery) ||
        normalize(wave.creep.rawcode).includes(normalizedQuery);
      const matchesConfidence =
        confidence === "all" || wave.numberConfidence === confidence;
      const matchesAttack =
        attackType === "all" || wave.attack.attackTypeRaw === attackType;
      const matchesDefense =
        defenseType === "all" || wave.stats.defenseTypeRaw === defenseType;

      return (
        matchesQuery &&
        matchesConfidence &&
        matchesAttack &&
        matchesDefense
      );
    });
  }, [attackType, confidence, defenseType, query, waves]);

  const filtersAreActive =
    query !== "" ||
    confidence !== "all" ||
    attackType !== "all" ||
    defenseType !== "all";

  function clearFilters() {
    setQuery("");
    setConfidence("all");
    setAttackType("all");
    setDefenseType("all");
  }

  return (
    <section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard value={waves.length} label="posições candidatas" />
        <SummaryCard
          value={confirmedCount}
          label="confirmadas diretamente"
          tone="confirmed"
        />
        <SummaryCard
          value={inferredCount}
          label="inferidas pela sequência"
          tone="inferred"
        />
        <SummaryCard
          value={quantitiesConfirmed ? "Confirmada" : "Não confirmada"}
          label="quantidade por wave"
        />
      </div>

      <div className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_180px_180px]">
        <label className="block md:col-span-2 xl:col-span-1">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Buscar
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome ou rawcode"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
            Confiança
          </span>
          <select
            value={confidence}
            onChange={(event) =>
              setConfidence(event.target.value as WaveConfidence | "all")
            }
            className="w-full rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/60"
          >
            <option value="all">Todas</option>
            <option value="confirmed-directly">Confirmadas diretamente</option>
            <option value="inferred-from-sequence">
              Inferidas pela sequência
            </option>
          </select>
        </label>

        <FilterSelect
          label="Tipo de ataque"
          value={attackType}
          values={attackTypes}
          onChange={setAttackType}
        />
        <FilterSelect
          label="Tipo de defesa"
          value={defenseType}
          values={defenseTypes}
          onChange={setDefenseType}
        />
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-400">
          <strong className="text-white">{filteredWaves.length}</strong> de{" "}
          {waves.length} waves
        </p>

        <button
          type="button"
          onClick={clearFilters}
          disabled={!filtersAreActive}
          className="text-sm font-semibold text-cyan-400 transition hover:text-cyan-300 disabled:cursor-not-allowed disabled:text-slate-700"
        >
          Limpar filtros
        </button>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredWaves.map((wave) => {
          const normalFlowLimitation = wave.limitations.find((limitation) =>
            limitation.includes("fluxo normal"),
          );
          const isConfirmed =
            wave.numberConfidence === "confirmed-directly";
          const confirmedDamageMultipliers =
            wave.stats.defenseTypeRaw === null
              ? []
              : (damageMultipliersByDefense[wave.stats.defenseTypeRaw] ?? []);

          return (
            <article
              key={wave.number}
              className={`rounded-2xl border p-5 ${
                isConfirmed
                  ? "border-emerald-400/20 bg-emerald-400/[0.04]"
                  : "border-amber-300/15 bg-amber-300/[0.03]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
                    Wave {wave.number}
                  </p>
                  <h2 className="mt-2 text-xl font-black">
                    {wave.creep.name}
                  </h2>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {wave.creep.rawcode}
                  </p>
                </div>

                {wave.boss === true && (
                  <span className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-bold text-red-200">
                    Boss Unit
                  </span>
                )}
              </div>

              <span
                className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                  isConfirmed
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                    : "border-amber-300/30 bg-amber-300/10 text-amber-200"
                }`}
              >
                {confidenceLabels[wave.numberConfidence]}
              </span>

              <dl className="mt-5 grid grid-cols-2 gap-2">
                <Stat label="HP" value={formatValue(wave.stats.hp)} />
                <Stat label="Armadura" value={formatValue(wave.stats.armor)} />
                <Stat
                  label="Tipo de ataque"
                  value={formatLabel(wave.attack.attackTypeRaw)}
                />
                <Stat
                  label="Tipo de defesa"
                  value={formatLabel(wave.stats.defenseTypeRaw)}
                />
                <Stat
                  label="Cooldown"
                  value={
                    wave.attack.cooldown === null
                      ? "—"
                      : `${wave.attack.cooldown.toFixed(2)}s`
                  }
                />
                <Stat label="Alcance" value={formatValue(wave.attack.range)} />
              </dl>

              {wave.stats.defenseTypeRaw !== null && (
                <section className="mt-5 border-t border-white/10 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Multiplicadores confirmados
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Matriz confirmada do mapa; independente da confiança da
                    associação desta wave.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {confirmedDamageMultipliers.map((matchup) => (
                      <DamageMultiplierItem
                        key={matchup.attackType}
                        attackType={matchup.attackType}
                        multiplier={matchup.multiplier}
                      />
                    ))}
                    {unconfirmedAttackTypes.map((unconfirmedAttackType) => (
                      <div
                        key={unconfirmedAttackType}
                        className="rounded-lg border border-amber-300/15 bg-amber-300/5 px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-amber-100">
                          {formatLabel(unconfirmedAttackType)}
                        </p>
                        <p className="mt-1 text-[11px] text-amber-200/60">
                          Não confirmado
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {wave.abilities.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Habilidades
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {wave.abilities.map((ability) => (
                      <span
                        key={ability.rawcode}
                        className="rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs font-semibold text-purple-200"
                      >
                        {ability.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {normalFlowLimitation && (
                <p className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-5 text-amber-100/80">
                  {normalFlowLimitation}
                </p>
              )}
            </article>
          );
        })}
      </div>

      {filteredWaves.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="font-bold">Nenhuma wave encontrada.</p>
          <p className="mt-2 text-sm text-slate-500">
            Tente remover um filtro ou usar outro termo.
          </p>
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  value,
  label,
  tone = "neutral",
}: {
  value: number | string;
  label: string;
  tone?: "neutral" | "confirmed" | "inferred";
}) {
  const valueColor =
    tone === "confirmed"
      ? "text-emerald-300"
      : tone === "inferred"
        ? "text-amber-200"
        : "text-cyan-300";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className={`text-2xl font-black ${valueColor}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-[#0b111d] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/60"
      >
        <option value="all">Todos</option>
        {values.map((option) => (
          <option key={option} value={option}>
            {formatLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
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

function DamageMultiplierItem({
  attackType,
  multiplier,
}: {
  attackType: string;
  multiplier: number;
}) {
  const tone =
    multiplier > 1
      ? "border-emerald-400/15 bg-emerald-400/5 text-emerald-200"
      : multiplier < 1
        ? "border-amber-300/15 bg-amber-300/5 text-amber-100"
        : "border-white/10 bg-black/20 text-slate-200";

  return (
    <div className={`rounded-lg border px-3 py-2 ${tone}`}>
      <p className="text-xs font-semibold">{formatLabel(attackType)}</p>
      <p className="mt-1 text-sm font-black">{multiplier.toFixed(2)}x</p>
    </div>
  );
}
