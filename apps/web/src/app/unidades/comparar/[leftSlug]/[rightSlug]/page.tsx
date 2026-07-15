import Link from "next/link";
import { notFound } from "next/navigation";
import { UnitIcon } from "@/components/unit-icon";
import type { FighterSummary } from "@/lib/legion-data";
import { getAllFighters } from "@/lib/legion-data";
import { getUnitIconPaths } from "@/lib/unit-icons";
import { createUnitSlug } from "@/lib/unit-slug";
import {
  formatDifference,
  formatGold,
  formatNumber,
  getAverageDamage,
  getBaseDps,
  getPerGold,
} from "@/lib/unit-metrics";

type UnitComparisonPageProps = {
  params: Promise<{
    leftSlug: string;
    rightSlug: string;
  }>;
};

export default async function UnitComparisonPage({
  params,
}: UnitComparisonPageProps) {
  const { leftSlug, rightSlug } = await params;
  const units = await getAllFighters();
  const leftUnit = units.find(
    (unit) => createUnitSlug(unit.name, unit.rawcode) === leftSlug,
  );
  const rightUnit = units.find(
    (unit) => createUnitSlug(unit.name, unit.rawcode) === rightSlug,
  );

  if (!leftUnit || !rightUnit) {
    notFound();
  }

  const iconPaths = await getUnitIconPaths([
    leftUnit.rawcode,
    rightUnit.rawcode,
  ]);
  const leftMetrics = getComparisonMetrics(leftUnit);
  const rightMetrics = getComparisonMetrics(rightUnit);

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Link
          href="/unidades"
          className="text-sm font-semibold text-cyan-400 hover:text-cyan-300"
        >
          ← Voltar para unidades
        </Link>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-cyan-400">
            Comparador de unidades
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            Comparação lado a lado
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            A diferença representa o valor da unidade da direita menos o valor
            da unidade da esquerda. Ela é objetiva e não define um vencedor.
          </p>

          <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-white/[0.04]">
                <tr>
                  <th className="px-4 py-4 font-semibold text-slate-400">
                    Atributo
                  </th>
                  <UnitHeading
                    unit={leftUnit}
                    webPath={iconPaths[leftUnit.rawcode] ?? null}
                  />
                  <UnitHeading
                    unit={rightUnit}
                    webPath={iconPaths[rightUnit.rawcode] ?? null}
                  />
                  <th className="px-4 py-4 font-semibold text-slate-400">
                    Diferença
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <ComparisonRow
                  label="Custo (gold)"
                  leftValue={formatGold(leftMetrics.gold)}
                  rightValue={formatGold(rightMetrics.gold)}
                  difference={formatDifference(
                    leftMetrics.gold,
                    rightMetrics.gold,
                  )}
                />
                <ComparisonRow
                  label="Point Value"
                  leftValue={formatNumber(leftUnit.pointValue)}
                  rightValue={formatNumber(rightUnit.pointValue)}
                  difference={formatDifference(
                    leftUnit.pointValue,
                    rightUnit.pointValue,
                  )}
                />
                <ComparisonRow
                  label="Investimento validado (gold)"
                  leftValue={formatGold(leftUnit.validatedInvestmentGold)}
                  rightValue={formatGold(rightUnit.validatedInvestmentGold)}
                  difference={formatDifference(
                    leftUnit.validatedInvestmentGold,
                    rightUnit.validatedInvestmentGold,
                  )}
                />
                <ComparisonRow
                  label="HP"
                  leftValue={formatNumber(leftUnit.hp)}
                  rightValue={formatNumber(rightUnit.hp)}
                  difference={formatDifference(leftUnit.hp, rightUnit.hp)}
                />
                <ComparisonRow
                  label="Dano médio"
                  leftValue={formatNumber(leftMetrics.averageDamage, 2)}
                  rightValue={formatNumber(rightMetrics.averageDamage, 2)}
                  difference={formatDifference(
                    leftMetrics.averageDamage,
                    rightMetrics.averageDamage,
                    2,
                  )}
                />
                <ComparisonRow
                  label="Cooldown (s)"
                  leftValue={formatNumber(leftUnit.cooldown, 2)}
                  rightValue={formatNumber(rightUnit.cooldown, 2)}
                  difference={formatDifference(
                    leftUnit.cooldown,
                    rightUnit.cooldown,
                    2,
                  )}
                />
                <ComparisonRow
                  label="DPS base"
                  leftValue={formatNumber(leftMetrics.dps, 2)}
                  rightValue={formatNumber(rightMetrics.dps, 2)}
                  difference={formatDifference(
                    leftMetrics.dps,
                    rightMetrics.dps,
                    2,
                  )}
                />
                <ComparisonRow
                  label="HP por gold"
                  leftValue={formatNumber(leftMetrics.hpPerGold, 2)}
                  rightValue={formatNumber(rightMetrics.hpPerGold, 2)}
                  difference={formatDifference(
                    leftMetrics.hpPerGold,
                    rightMetrics.hpPerGold,
                    2,
                  )}
                />
                <ComparisonRow
                  label="DPS base por gold"
                  leftValue={formatNumber(leftMetrics.dpsPerGold, 2)}
                  rightValue={formatNumber(rightMetrics.dpsPerGold, 2)}
                  difference={formatDifference(
                    leftMetrics.dpsPerGold,
                    rightMetrics.dpsPerGold,
                    2,
                  )}
                />
                <ComparisonRow
                  label="Armadura"
                  leftValue={formatNumber(leftUnit.armor)}
                  rightValue={formatNumber(rightUnit.armor)}
                  difference={formatDifference(leftUnit.armor, rightUnit.armor)}
                />
                <ComparisonRow
                  label="Alcance"
                  leftValue={formatNumber(leftUnit.range)}
                  rightValue={formatNumber(rightUnit.range)}
                  difference={formatDifference(leftUnit.range, rightUnit.range)}
                />
                <ComparisonRow
                  label="Tipo de ataque"
                  leftValue={formatLabel(leftUnit.attackType)}
                  rightValue={formatLabel(rightUnit.attackType)}
                  difference="—"
                />
                <ComparisonRow
                  label="Tipo de defesa"
                  leftValue={formatLabel(leftUnit.defenseType)}
                  rightValue={formatLabel(rightUnit.defenseType)}
                  difference="—"
                />
                <ComparisonRow
                  label="Builders"
                  leftValue={formatList(leftUnit.builders)}
                  rightValue={formatList(rightUnit.builders)}
                  difference="—"
                />
                <ComparisonRow
                  label="Habilidades"
                  leftValue={formatList(leftUnit.abilities)}
                  rightValue={formatList(rightUnit.abilities)}
                  difference="—"
                />
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function UnitHeading({
  unit,
  webPath,
}: {
  unit: FighterSummary;
  webPath: string | null;
}) {
  return (
    <th className="px-4 py-4">
      <div className="flex min-w-[180px] items-center gap-3">
        <UnitIcon
          rawcode={unit.rawcode}
          name={unit.name}
          webPath={webPath}
          size={56}
        />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            {unit.rawcode}
          </p>
          <Link
            href={`/unidades/${createUnitSlug(unit.name, unit.rawcode)}`}
            className="mt-1 inline-block text-lg font-black text-white hover:text-cyan-200"
          >
            {unit.name}
          </Link>
        </div>
      </div>
    </th>
  );
}

function ComparisonRow({
  label,
  leftValue,
  rightValue,
  difference,
}: {
  label: string;
  leftValue: string;
  rightValue: string;
  difference: string;
}) {
  return (
    <tr>
      <th className="px-4 py-3 font-semibold text-slate-400">{label}</th>
      <td className="px-4 py-3 text-slate-300">{leftValue}</td>
      <td className="px-4 py-3 font-semibold text-white">{rightValue}</td>
      <td className="px-4 py-3 font-semibold text-cyan-300">{difference}</td>
    </tr>
  );
}

function getComparisonMetrics(unit: FighterSummary) {
  const averageDamage = getAverageDamage(unit.damageMin, unit.damageMax);
  const dps = getBaseDps(averageDamage, unit.cooldown);

  return {
    gold: unit.gold > 0 ? unit.gold : null,
    averageDamage,
    dps,
    hpPerGold: getPerGold(unit.hp, unit.validatedInvestmentGold),
    dpsPerGold: getPerGold(dps, unit.validatedInvestmentGold),
  };
}

function formatLabel(value: string | null) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatList(values: string[]) {
  const uniqueValues = [...new Set(values)];
  return uniqueValues.length > 0 ? uniqueValues.join(", ") : "—";
}
