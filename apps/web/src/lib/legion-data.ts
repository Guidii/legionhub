import { readFile } from "node:fs/promises";
import path from "node:path";
import { createUnitSlug } from "@/lib/unit-slug";

export type UnitUpgradeSummary = {
  rawcode: string;
  name: string;
  upgradeGoldCost: number | null;
  totalGoldValue: number | null;
};

export type FighterSummary = {
  rawcode: string;
  baseRawcode: string | null;
  name: string;
  gold: number;
  totalGoldValue: number;
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
};

type RawUpgrade = RawUnit;

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
        totalGoldValue:
          fighter.cost?.totalGoldValue ?? fighter.cost?.gold ?? 0,
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
            totalGoldValue:
              upgrade.cost?.totalGoldValue ?? upgrade.cost?.gold ?? null,
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
        totalGoldValue:
          fighter.cost?.totalGoldValue ?? fighter.cost?.gold ?? 0,
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
            totalGoldValue:
              upgrade.cost?.totalGoldValue ?? upgrade.cost?.gold ?? null,
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
