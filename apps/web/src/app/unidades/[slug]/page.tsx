import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllFighters } from "@/lib/legion-data";
import { createUnitSlug } from "@/lib/unit-slug";

type UnitPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function UnitPage({ params }: UnitPageProps) {
  const { slug } = await params;
  const units = await getAllFighters();

  const unit = units.find(
    (fighter) => createUnitSlug(fighter.name, fighter.rawcode) === slug,
  );

  if (!unit) {
    notFound();
  }

  const currentRawcode = unit.rawcode.toLowerCase();

  const baseUnit = units.find((fighter) => {
    const matchesBaseRawcode =
      unit.baseRawcode !== null &&
      fighter.rawcode.toLowerCase() === unit.baseRawcode.toLowerCase();

    const upgradesToCurrentUnit = fighter.upgrades.some(
      (upgrade) => upgrade.rawcode.toLowerCase() === currentRawcode,
    );

    return matchesBaseRawcode || upgradesToCurrentUnit;
  });

  const averageDamage = getAverageDamage(unit.damageMin, unit.damageMax);
  const dps = getBaseDps(averageDamage, unit.cooldown);
  const baseAverageDamage = baseUnit
    ? getAverageDamage(baseUnit.damageMin, baseUnit.damageMax)
    : null;
  const baseDps = baseUnit
    ? getBaseDps(baseAverageDamage, baseUnit.cooldown)
    : null;
  const upgradeGoldCost =
    baseUnit?.upgrades.find(
      (upgrade) => upgrade.rawcode.toLowerCase() === currentRawcode,
    )?.upgradeGoldCost ?? null;

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href="/unidades"
          className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
        >
          ← Voltar para unidades
        </Link>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
                {unit.rawcode}
              </p>

              <h1 className="mt-2 text-4xl font-black">{unit.name}</h1>

              <p className="mt-3 text-slate-400">
                Dados extraídos diretamente do mapa Legion TD 11.4b-beta1.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-5 py-3">
                <p className="text-xs font-bold uppercase text-yellow-500">
                  Custo
                </p>
                <p className="text-2xl font-black text-yellow-300">
                  {unit.gold ?? "A confirmar"}
                </p>
              </div>

              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3">
                <p className="text-xs font-bold uppercase text-cyan-400">
                  Valor total
                </p>
                <p className="text-2xl font-black text-cyan-200">
                  {unit.totalGoldValue ?? unit.gold ?? "A confirmar"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Stat label="HP" value={unit.hp} />

            <Stat
              label="Dano"
              value={
                unit.damageMin !== null && unit.damageMax !== null
                  ? `${unit.damageMin}–${unit.damageMax}`
                  : "—"
              }
            />

            <Stat label="Armadura" value={unit.armor} />
            <Stat label="Alcance" value={unit.range} />

            <Stat
              label="Cooldown"
              value={
                unit.cooldown !== null ? `${unit.cooldown.toFixed(2)}s` : "—"
              }
            />

            <Stat
              label="DPS base"
              value={dps !== null ? dps.toFixed(2) : "—"}
            />

            <Stat label="Tipo de ataque" value={unit.attackType} />
            <Stat label="Tipo de defesa" value={unit.defenseType} />

            <Stat
              label="Builders"
              value={unit.builders.join(", ") || "—"}
            />
          </div>

          {baseUnit && (
            <section className="mt-10 border-t border-white/10 pt-8">
              <h2 className="text-xl font-black">Comparação com a base</h2>
              <p className="mt-2 text-sm text-slate-400">
                Valores extraídos do mapa. O DPS base é teórico e não inclui
                habilidades ou modificadores.
              </p>

              <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-white/[0.04] text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Atributo</th>
                      <th className="px-4 py-3 font-semibold">
                        <Link
                          href={`/unidades/${createUnitSlug(
                            baseUnit.name,
                            baseUnit.rawcode,
                          )}`}
                          className="text-cyan-300 hover:text-cyan-200"
                        >
                          {baseUnit.name}
                        </Link>
                      </th>
                      <th className="px-4 py-3 font-semibold text-white">
                        {unit.name}
                      </th>
                      <th className="px-4 py-3 font-semibold">Diferença</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <ComparisonRow
                      label="HP"
                      baseValue={formatNumber(baseUnit.hp)}
                      currentValue={formatNumber(unit.hp)}
                      difference={formatDifference(baseUnit.hp, unit.hp)}
                    />
                    <ComparisonRow
                      label="Dano médio"
                      baseValue={formatNumber(baseAverageDamage, 2)}
                      currentValue={formatNumber(averageDamage, 2)}
                      difference={formatDifference(
                        baseAverageDamage,
                        averageDamage,
                        2,
                      )}
                    />
                    <ComparisonRow
                      label="DPS base"
                      baseValue={formatNumber(baseDps, 2)}
                      currentValue={formatNumber(dps, 2)}
                      difference={formatDifference(baseDps, dps, 2)}
                    />
                    <ComparisonRow
                      label="Armadura"
                      baseValue={formatNumber(baseUnit.armor)}
                      currentValue={formatNumber(unit.armor)}
                      difference={formatDifference(
                        baseUnit.armor,
                        unit.armor,
                      )}
                    />
                    <ComparisonRow
                      label="Alcance"
                      baseValue={formatNumber(baseUnit.range)}
                      currentValue={formatNumber(unit.range)}
                      difference={formatDifference(
                        baseUnit.range,
                        unit.range,
                      )}
                    />
                    <ComparisonRow
                      label="Custo do upgrade"
                      baseValue="—"
                      currentValue={formatGold(upgradeGoldCost)}
                      difference={formatGold(upgradeGoldCost, true)}
                    />
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {unit.abilities.length > 0 && (
            <section className="mt-10 border-t border-white/10 pt-8">
              <h2 className="text-xl font-black">Habilidades</h2>

              <div className="mt-4 flex flex-wrap gap-2">
                {[...new Set(unit.abilities)].map((ability) => (
                  <span
                    key={`${unit.rawcode}-${ability}`}
                    className="rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-sm text-purple-200"
                  >
                    {ability}
                  </span>
                ))}
              </div>
            </section>
          )}

          {unit.upgrades.length > 0 && (
            <section className="mt-10 border-t border-white/10 pt-8">
              <h2 className="text-xl font-black">Upgrades diretos</h2>

              <div className="mt-4 space-y-3">
                {unit.upgrades.map((upgrade) => (
                  <Link
                    key={upgrade.rawcode}
                    href={`/unidades/${createUnitSlug(
                      upgrade.name,
                      upgrade.rawcode,
                    )}`}
                    className="flex items-center justify-between rounded-xl bg-cyan-400/5 px-3 py-2"
                  >
                    <span className="font-semibold text-cyan-100">
                      {upgrade.name}
                    </span>

                    <span className="text-sm text-cyan-300">
                      {upgrade.upgradeGoldCost == null
                        ? "Custo a confirmar"
                        : `+${upgrade.upgradeGoldCost} gold`}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/20 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 font-bold text-white">{value ?? "—"}</p>
    </div>
  );
}

function ComparisonRow({
  label,
  baseValue,
  currentValue,
  difference,
}: {
  label: string;
  baseValue: string;
  currentValue: string;
  difference: string;
}) {
  return (
    <tr>
      <th className="px-4 py-3 font-semibold text-slate-400">{label}</th>
      <td className="px-4 py-3 text-slate-300">{baseValue}</td>
      <td className="px-4 py-3 font-semibold text-white">{currentValue}</td>
      <td className="px-4 py-3 font-semibold text-cyan-300">{difference}</td>
    </tr>
  );
}

function getAverageDamage(
  damageMin: number | null,
  damageMax: number | null,
) {
  return damageMin !== null && damageMax !== null
    ? (damageMin + damageMax) / 2
    : null;
}

function getBaseDps(averageDamage: number | null, cooldown: number | null) {
  return averageDamage !== null && cooldown !== null && cooldown > 0
    ? averageDamage / cooldown
    : null;
}

function formatNumber(value: number | null, decimals = 0) {
  return value === null ? "—" : value.toFixed(decimals);
}

function formatDifference(
  baseValue: number | null,
  currentValue: number | null,
  decimals = 0,
) {
  if (baseValue === null || currentValue === null) return "—";

  const difference = currentValue - baseValue;
  const prefix = difference > 0 ? "+" : "";
  return `${prefix}${difference.toFixed(decimals)}`;
}

function formatGold(value: number | null, showPositiveSign = false) {
  if (value === null) return "—";
  return `${showPositiveSign ? "+" : ""}${value} gold`;
}
