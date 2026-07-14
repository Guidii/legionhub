import Link from "next/link";
import { notFound } from "next/navigation";
import { UnitIcon } from "@/components/unit-icon";
import {
  getDefenseMultipliersForAttack,
  isAttackTypeUnconfirmed,
} from "@/lib/damage-matrix";
import { getAllFighters } from "@/lib/legion-data";
import { getUnitIconPath } from "@/lib/unit-icons";
import { createUnitSlug } from "@/lib/unit-slug";
import {
  formatDifference,
  formatGold,
  formatNumber,
  formatPercentageDifference,
  getAverageDamage,
  getBaseDps,
  getPerGold,
} from "@/lib/unit-metrics";

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

  const iconPath = await getUnitIconPath(unit.rawcode);

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
  const hpPerGold = getPerGold(unit.hp, unit.validatedInvestmentGold);
  const dpsPerGold = getPerGold(dps, unit.validatedInvestmentGold);
  const baseAverageDamage = baseUnit
    ? getAverageDamage(baseUnit.damageMin, baseUnit.damageMax)
    : null;
  const baseDps = baseUnit
    ? getBaseDps(baseAverageDamage, baseUnit.cooldown)
    : null;
  const baseHpPerGold = baseUnit
    ? getPerGold(baseUnit.hp, baseUnit.validatedInvestmentGold)
    : null;
  const baseDpsPerGold = baseUnit
    ? getPerGold(baseDps, baseUnit.validatedInvestmentGold)
    : null;
  const upgradeGoldCost =
    baseUnit?.upgrades.find(
      (upgrade) => upgrade.rawcode.toLowerCase() === currentRawcode,
    )?.upgradeGoldCost ?? null;
  const [damageMultipliers, attackTypeUnconfirmed] = await Promise.all([
    getDefenseMultipliersForAttack(unit.attackType),
    isAttackTypeUnconfirmed(unit.attackType),
  ]);

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
            <div className="flex min-w-0 items-center gap-5">
              <UnitIcon
                rawcode={unit.rawcode}
                name={unit.name}
                webPath={iconPath}
                size={96}
              />
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
                  {unit.rawcode}
                </p>

                <h1 className="mt-2 text-4xl font-black">{unit.name}</h1>

                <p className="mt-3 text-slate-400">
                  Dados extraídos diretamente do mapa Legion TD 11.4b-beta1.
                </p>
              </div>
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
                  Point Value
                </p>
                <p className="text-2xl font-black text-cyan-200">
                  {unit.pointValue ?? "A confirmar"}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3">
                <p className="text-xs font-bold uppercase text-emerald-400">
                  Investimento validado
                </p>
                <p className="text-2xl font-black text-emerald-200">
                  {formatGold(unit.validatedInvestmentGold)}
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

          <section className="mt-10 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <h2 className="text-xl font-black">
              Efetividade por tipo de defesa
            </h2>

            {damageMultipliers.length > 0 ? (
              <>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Multiplicadores confirmados diretamente na matriz de dano do
                  mapa. A classificação visual compara cada valor somente com
                  o multiplicador neutro de 1.00x.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {damageMultipliers.map((matchup) => (
                    <DamageMultiplierCard
                      key={matchup.defenseType}
                      defenseType={matchup.defenseType}
                      multiplier={matchup.multiplier}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm leading-6 text-amber-100/80">
                {attackTypeUnconfirmed
                  ? `A matriz de dano para o tipo ${formatTypeLabel(unit.attackType)} ainda não foi confirmada no dataset atual.`
                  : "O tipo de ataque desta unidade não possui multiplicadores confirmados na matriz atual."}
              </p>
            )}
          </section>

          <section className="mt-10 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Eficiência — LegionHub
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {unit.validatedInvestmentGold !== null
                ? "Métricas calculadas exclusivamente sobre o investimento acumulado em gold validado pela cadeia da unidade."
                : "Métricas indisponíveis: não foi possível validar o investimento acumulado em gold desta unidade."}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Stat
                label="HP por gold"
                value={hpPerGold !== null ? hpPerGold.toFixed(2) : "—"}
              />
              <Stat
                label="DPS base por gold"
                value={dpsPerGold !== null ? dpsPerGold.toFixed(2) : "—"}
              />
            </div>
          </section>

          {baseUnit && (
            <section className="mt-10 border-t border-white/10 pt-8">
              <h2 className="text-xl font-black">Comparação com a base</h2>
              <p className="mt-2 text-sm text-slate-400">
                Valores extraídos do mapa. O DPS base é teórico e não inclui
                habilidades ou modificadores. As métricas por gold são
                calculadas pelo LegionHub somente para cadeias normais validadas.
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
                      label="HP por gold"
                      baseValue={formatNumber(baseHpPerGold, 2)}
                      currentValue={formatNumber(hpPerGold, 2)}
                      difference={formatPercentageDifference(
                        baseHpPerGold,
                        hpPerGold,
                      )}
                    />
                    <ComparisonRow
                      label="DPS base por gold"
                      baseValue={formatNumber(baseDpsPerGold, 2)}
                      currentValue={formatNumber(dpsPerGold, 2)}
                      difference={formatPercentageDifference(
                        baseDpsPerGold,
                        dpsPerGold,
                      )}
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

                    <div className="text-right">
                      <p className="text-sm text-cyan-300">
                        {upgrade.upgradeGoldCost == null
                          ? "Custo a confirmar"
                          : `+${upgrade.upgradeGoldCost} gold`}
                      </p>

                      {upgrade.pointValue !== null && (
                        <p className="mt-1 text-xs text-slate-400">
                          Point Value: {upgrade.pointValue}
                        </p>
                      )}
                    </div>
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

function DamageMultiplierCard({
  defenseType,
  multiplier,
}: {
  defenseType: string;
  multiplier: number;
}) {
  const classification =
    multiplier > 1 ? "Vantagem" : multiplier < 1 ? "Desvantagem" : "Neutro";
  const tone =
    multiplier > 1
      ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-200"
      : multiplier < 1
        ? "border-amber-300/20 bg-amber-300/5 text-amber-100"
        : "border-white/10 bg-black/20 text-slate-200";

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-70">
        {formatTypeLabel(defenseType)}
      </p>
      <p className="mt-2 text-xl font-black">{multiplier.toFixed(2)}x</p>
      <p className="mt-1 text-xs font-semibold opacity-70">{classification}</p>
    </div>
  );
}

function formatTypeLabel(value: string | null) {
  if (!value) return "desconhecido";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
