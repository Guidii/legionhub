export function getAverageDamage(
  damageMin: number | null,
  damageMax: number | null,
) {
  return damageMin !== null && damageMax !== null
    ? (damageMin + damageMax) / 2
    : null;
}

export function getBaseDps(
  averageDamage: number | null,
  cooldown: number | null,
) {
  return averageDamage !== null && cooldown !== null && cooldown > 0
    ? averageDamage / cooldown
    : null;
}

export function getPerGold(
  value: number | null,
  validatedInvestmentGold: number | null,
) {
  return value !== null &&
    validatedInvestmentGold !== null &&
    validatedInvestmentGold > 0
    ? value / validatedInvestmentGold
    : null;
}

export function formatNumber(value: number | null, decimals = 0) {
  return value === null ? "—" : value.toFixed(decimals);
}

export function formatDifference(
  baseValue: number | null,
  currentValue: number | null,
  decimals = 0,
) {
  if (baseValue === null || currentValue === null) return "—";

  const difference = currentValue - baseValue;
  const prefix = difference > 0 ? "+" : "";
  return `${prefix}${difference.toFixed(decimals)}`;
}

export function formatPercentageDifference(
  baseValue: number | null,
  currentValue: number | null,
) {
  if (baseValue === null || currentValue === null || baseValue === 0) {
    return "—";
  }

  const percentage = ((currentValue - baseValue) / baseValue) * 100;
  const roundedPercentage = Math.round(percentage * 10) / 10;

  if (roundedPercentage === 0) return "0%";

  const prefix = roundedPercentage > 0 ? "+" : "";
  const formattedPercentage = Number.isInteger(roundedPercentage)
    ? roundedPercentage.toFixed(0)
    : roundedPercentage.toFixed(1);

  return `${prefix}${formattedPercentage}%`;
}

export function formatGold(value: number | null, showPositiveSign = false) {
  if (value === null) return "—";
  return `${showPositiveSign ? "+" : ""}${value} gold`;
}
