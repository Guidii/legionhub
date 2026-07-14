import { readFile } from "node:fs/promises";
import path from "node:path";

export type ConfirmedDamageMultiplier = {
  attackType: string;
  defenseType: string;
  multiplier: number;
};

type DamageMatrix = {
  mapVersion: string;
  defenseOrder: string[];
  attackTypes: Record<string, Record<string, number>>;
  spells: Record<string, number>;
  unconfirmedAttackTypes: string[];
  source: {
    file: string;
    archiveName: string;
  };
};

let damageMatrixPromise: Promise<DamageMatrix> | null = null;

function loadDamageMatrix(): Promise<DamageMatrix> {
  if (damageMatrixPromise !== null) return damageMatrixPromise;

  const absolutePath = path.resolve(
    process.cwd(),
    "../..",
    "data/11.4b-beta1/damage-matrix.json",
  );

  damageMatrixPromise = readFile(absolutePath, "utf8")
    .then((contents) => JSON.parse(contents) as DamageMatrix)
    .catch((error) => {
      damageMatrixPromise = null;
      throw new Error(
        `Não foi possível carregar damage-matrix.json. Caminho procurado: ${absolutePath}`,
        { cause: error },
      );
    });

  return damageMatrixPromise;
}

function normalizeAttackType(
  matrix: DamageMatrix,
  attackType: string | null | undefined,
): string | null {
  if (!attackType) return null;

  const normalized = attackType.trim().toLowerCase();
  const matrixAttackType = normalized === "piercing" ? "pierce" : normalized;

  return Object.hasOwn(matrix.attackTypes, matrixAttackType)
    ? matrixAttackType
    : null;
}

function normalizeDefenseType(
  matrix: DamageMatrix,
  defenseType: string | null | undefined,
): string | null {
  if (!defenseType) return null;

  const normalized = defenseType.trim().toLowerCase();
  return matrix.defenseOrder.includes(normalized) ? normalized : null;
}

function lookupDamageMultiplier(
  matrix: DamageMatrix,
  attackType: string | null | undefined,
  defenseType: string | null | undefined,
): number | null {
  const normalizedAttackType = normalizeAttackType(matrix, attackType);
  const normalizedDefenseType = normalizeDefenseType(matrix, defenseType);

  if (normalizedAttackType === null || normalizedDefenseType === null) {
    return null;
  }

  const multiplier =
    matrix.attackTypes[normalizedAttackType]?.[normalizedDefenseType];

  return typeof multiplier === "number" && Number.isFinite(multiplier)
    ? multiplier
    : null;
}

export async function getDamageMultiplier(
  attackType: string | null | undefined,
  defenseType: string | null | undefined,
): Promise<number | null> {
  const matrix = await loadDamageMatrix();
  return lookupDamageMultiplier(matrix, attackType, defenseType);
}

export async function getDefenseMultipliersForAttack(
  attackType: string | null | undefined,
): Promise<ConfirmedDamageMultiplier[]> {
  const matrix = await loadDamageMatrix();
  const normalizedAttackType = normalizeAttackType(matrix, attackType);

  if (normalizedAttackType === null) return [];

  return matrix.defenseOrder.flatMap((defenseType) => {
    const multiplier = lookupDamageMultiplier(
      matrix,
      normalizedAttackType,
      defenseType,
    );

    return multiplier === null
      ? []
      : [{ attackType: normalizedAttackType, defenseType, multiplier }];
  });
}

export async function getAttackMultipliersForDefense(
  defenseType: string | null | undefined,
): Promise<ConfirmedDamageMultiplier[]> {
  const matrix = await loadDamageMatrix();
  const normalizedDefenseType = normalizeDefenseType(matrix, defenseType);

  if (normalizedDefenseType === null) return [];

  return Object.keys(matrix.attackTypes).flatMap((attackType) => {
    const multiplier = lookupDamageMultiplier(
      matrix,
      attackType,
      normalizedDefenseType,
    );

    return multiplier === null
      ? []
      : [{ attackType, defenseType: normalizedDefenseType, multiplier }];
  });
}

export async function isAttackTypeUnconfirmed(
  attackType: string | null | undefined,
): Promise<boolean> {
  if (!attackType) return false;

  const matrix = await loadDamageMatrix();
  const normalized = attackType.trim().toLowerCase();
  return matrix.unconfirmedAttackTypes.includes(normalized);
}

export async function getUnconfirmedAttackTypes(): Promise<string[]> {
  const matrix = await loadDamageMatrix();
  return [...matrix.unconfirmedAttackTypes];
}
