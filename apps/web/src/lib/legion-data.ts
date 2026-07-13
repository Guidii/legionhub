import { readFile } from "node:fs/promises";
import path from "node:path";
import { createUnitSlug } from "@/lib/unit-slug";

export type UnitUpgradeSummary = {
  rawcode: string;
  name: string;
  upgradeGoldCost: number | null;
  pointValue: number | null;
  validatedInvestmentGold: number | null;
};

export type FighterSummary = {
  rawcode: string;
  baseRawcode: string | null;
  name: string;
  gold: number;
  pointValue: number | null;
  validatedInvestmentGold: number | null;
  hp: number | null;
  armor: number | null;
  damageMin: number | null;
  damageMax: number | null;
  cooldown: number | null;
  range: number | null;
  rangeType: string | null;
  attackType: string | null;
  defenseType: string | null;
  builders: string[];
  abilities: string[];
  upgrades: UnitUpgradeSummary[];
};

type RawAbility = {
  name?: string | null;
  isSystemAbility?: boolean;
};

type RawAttack = {
  damageMin?: number | null;
  damageMax?: number | null;
  cooldown?: number | null;
  range?: number | null;
  attackType?: string | null;
};

type RawUnit = {
  rawcode: string;
  baseRawcode?: string | null;
  name?: string | null;
  category?: string | null;
  cost?: {
    gold?: number | null;
    totalGoldValue?: number | null;
  };
  stats?: {
    hp?: number | null;
    armor?: number | null;
    defenseType?: string | null;
    attacks?: RawAttack[];
  };
  tooltipStats?: {
    rangeType?: string | null;
  };
  builders?: Array<{
    builder?: string | null;
  }>;
  abilities?: RawAbility[];
  upgradeRawcodes?: string[];
  parentRawcodes?: string[];
};

type RawUpgrade = RawUnit;

function getValidatedInvestmentGold(
  unit: RawUnit,
  unitByRawcode: Map<string, RawUnit>,
  investmentByRawcode: Map<string, number | null>,
): number | null {
  if (investmentByRawcode.has(unit.rawcode)) {
    return investmentByRawcode.get(unit.rawcode) ?? null;
  }

  investmentByRawcode.set(unit.rawcode, null);

  const gold = unit.cost?.gold;
  const pointValue = unit.cost?.totalGoldValue;
  const isSpecialUnit =
    unit.category === "hybrid-morph" ||
    unit.category === "hero-altar" ||
    unit.stats?.defenseType === "king" ||
    unit.name?.includes(" - [Level ");

  if (
    gold == null ||
    gold <= 0 ||
    pointValue == null ||
    pointValue <= 0 ||
    isSpecialUnit
  ) {
    return null;
  }

  let validatedInvestmentGold: number | null = null;

  if (unit.category === "fighter" && gold === pointValue) {
    validatedInvestmentGold = gold;
  } else if (unit.category === "fighter-upgrade") {
    for (const parentRawcode of unit.parentRawcodes ?? []) {
      const parent = unitByRawcode.get(parentRawcode);
      if (parent === undefined) continue;

      const parentInvestmentGold = getValidatedInvestmentGold(
        parent,
        unitByRawcode,
        investmentByRawcode,
      );

      if (
        parentInvestmentGold !== null &&
        parentInvestmentGold + gold === pointValue
      ) {
        validatedInvestmentGold = parentInvestmentGold + gold;
        break;
      }
    }
  }

  investmentByRawcode.set(unit.rawcode, validatedInvestmentGold);
  return validatedInvestmentGold;
}

async function readJson<T>(relativePath: string): Promise<T> {
  const absolutePath = path.resolve(process.cwd(), "../..", relativePath);

  try {
    const contents = await readFile(absolutePath, "utf8");
    return JSON.parse(contents) as T;
  } catch (error) {
    throw new Error(
      `Não foi possível carregar ${relativePath}. Caminho procurado: ${absolutePath}`,
      { cause: error },
    );
  }
}

export async function getFighters(): Promise<FighterSummary[]> {
  const [fighters, upgrades] = await Promise.all([
    readJson<RawUnit[]>("data/11.4b-beta1/fighters.json"),
    readJson<RawUpgrade[]>("data/11.4b-beta1/fighter-upgrades.json"),
  ]);

  const upgradeByRawcode = new Map(
    upgrades.map((upgrade) => [upgrade.rawcode, upgrade]),
  );
  const unitByRawcode = new Map(
    [...fighters, ...upgrades].map((unit) => [unit.rawcode, unit]),
  );
  const investmentByRawcode = new Map<string, number | null>();

  return fighters
    .filter((fighter) => fighter.name && fighter.rawcode)
    .filter((fighter) => fighter.name !== "Altar of Heroes")
    .map((fighter) => {
      const attack = fighter.stats?.attacks?.[0];

      return {
        rawcode: fighter.rawcode,
        baseRawcode: fighter.baseRawcode ?? null,
        name: fighter.name ?? fighter.rawcode,
        gold: fighter.cost?.gold ?? 0,
        pointValue: fighter.cost?.totalGoldValue ?? null,
        validatedInvestmentGold: getValidatedInvestmentGold(
          fighter,
          unitByRawcode,
          investmentByRawcode,
        ),
        hp: fighter.stats?.hp ?? null,
        armor: fighter.stats?.armor ?? null,
        damageMin: attack?.damageMin ?? null,
        damageMax: attack?.damageMax ?? null,
        cooldown: attack?.cooldown ?? null,
        range: attack?.range ?? null,
        rangeType: fighter.tooltipStats?.rangeType ?? null,
        attackType: attack?.attackType ?? null,
        defenseType: fighter.stats?.defenseType ?? null,
        builders: Array.from(
          new Set(
            (fighter.builders ?? [])
              .map((item) => item.builder)
              .filter((builder): builder is string => Boolean(builder)),
          ),
        ).sort((a, b) => a.localeCompare(b)),
        abilities: (fighter.abilities ?? [])
          .filter((ability) => !ability.isSystemAbility && ability.name)
          .map((ability) => ability.name as string),
        upgrades: (fighter.upgradeRawcodes ?? [])
          .map((rawcode) => upgradeByRawcode.get(rawcode))
          .filter((upgrade): upgrade is RawUpgrade => Boolean(upgrade))
          .map((upgrade) => ({
            rawcode: upgrade.rawcode,
            name: upgrade.name ?? upgrade.rawcode,
            upgradeGoldCost: upgrade.cost?.gold ?? null,
            pointValue: upgrade.cost?.totalGoldValue ?? null,
            validatedInvestmentGold: getValidatedInvestmentGold(
              upgrade,
              unitByRawcode,
              investmentByRawcode,
            ),
          })),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllFighters(): Promise<FighterSummary[]> {
  const [fighters, upgrades] = await Promise.all([
    readJson<RawUnit[]>("data/11.4b-beta1/fighters.json"),
    readJson<RawUpgrade[]>("data/11.4b-beta1/fighter-upgrades.json"),
  ]);

  const upgradeByRawcode = new Map(
    upgrades.map((upgrade) => [upgrade.rawcode, upgrade]),
  );
  const unitByRawcode = new Map(
    [...fighters, ...upgrades].map((unit) => [unit.rawcode, unit]),
  );
  const investmentByRawcode = new Map<string, number | null>();

  return [...fighters, ...upgrades]
    .filter((fighter) => fighter.name && fighter.rawcode)
    .filter((fighter) => fighter.name !== "Altar of Heroes")
    .map((fighter) => {
      const attack = fighter.stats?.attacks?.[0];


      return {
        rawcode: fighter.rawcode,
        baseRawcode: fighter.baseRawcode ?? null,
        name: fighter.name ?? fighter.rawcode,
        gold: fighter.cost?.gold ?? 0,
        pointValue: fighter.cost?.totalGoldValue ?? null,
        validatedInvestmentGold: getValidatedInvestmentGold(
          fighter,
          unitByRawcode,
          investmentByRawcode,
        ),
        hp: fighter.stats?.hp ?? null,
        armor: fighter.stats?.armor ?? null,
        damageMin: attack?.damageMin ?? null,
        damageMax: attack?.damageMax ?? null,
        cooldown: attack?.cooldown ?? null,
        range: attack?.range ?? null,
        rangeType: fighter.tooltipStats?.rangeType ?? null,
        attackType: attack?.attackType ?? null,
        defenseType: fighter.stats?.defenseType ?? null,
        builders: Array.from(
          new Set(
            (fighter.builders ?? [])
              .map((item) => item.builder)
              .filter((builder): builder is string => Boolean(builder)),
          ),
        ).sort((a, b) => a.localeCompare(b)),
        abilities: (fighter.abilities ?? [])
          .filter((ability) => !ability.isSystemAbility && ability.name)
          .map((ability) => ability.name as string),
        upgrades: (fighter.upgradeRawcodes ?? [])
          .map((rawcode) => upgradeByRawcode.get(rawcode))
          .filter((upgrade): upgrade is RawUpgrade => Boolean(upgrade))
          .map((upgrade) => ({
            rawcode: upgrade.rawcode,
            name: upgrade.name ?? upgrade.rawcode,
            upgradeGoldCost: upgrade.cost?.gold ?? null,
            pointValue: upgrade.cost?.totalGoldValue ?? null,
            validatedInvestmentGold: getValidatedInvestmentGold(
              upgrade,
              unitByRawcode,
              investmentByRawcode,
            ),
          })),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getUnitBySlug(
  slug: string,
): Promise<FighterSummary | undefined> {
  const units = await getAllFighters();

  return units.find(
    (unit) => createUnitSlug(unit.name, unit.rawcode) === slug,
  );
}
