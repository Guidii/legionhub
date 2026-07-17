import { readFile } from "node:fs/promises";
import path from "node:path";
import { getGameModeCatalog } from "@/lib/game-mode-data";
import { getFighters } from "@/lib/legion-data";
import { getUnitIconPaths } from "@/lib/unit-icons";

export type CoachUnit = {
  rawcode: string;
  name: string;
  iconPath: string | null;
  gold: number;
  tier: number | null;
  tierSource: "builder-slot" | "equivalent-fighter" | null;
  rangeType: string | null;
  upgradeCount: number;
};

type RawBuilder = {
  name: string;
  units: Array<{
    rawcode: string;
    slot: number;
  }>;
};

export type CoachData = {
  modeGroups: Awaited<ReturnType<typeof getGameModeCatalog>>["groups"];
  units: CoachUnit[];
};

export async function getCoachData(): Promise<CoachData> {
  const [fighters, gameModes, builders] = await Promise.all([
    getFighters(),
    getGameModeCatalog(),
    readFile(
      path.resolve(process.cwd(), "../..", "data/11.4b-beta1/builders.json"),
      "utf8",
    ).then((contents) => JSON.parse(contents) as RawBuilder[]),
  ]);
  const iconPaths = await getUnitIconPaths(
    fighters.map((fighter) => fighter.rawcode),
  );
  const tierByRawcode = new Map(
    builders
      .filter((builder) => builder.name !== "Prophet" && builder.units.length === 6)
      .flatMap((builder) =>
        builder.units.map((unit) => [unit.rawcode, unit.slot] as const),
      ),
  );
  const resolvedTierByRawcode = new Map(tierByRawcode);

  for (const fighter of fighters) {
    if (resolvedTierByRawcode.has(fighter.rawcode)) continue;

    const fighterUpgradeRawcodes = new Set(
      fighter.upgrades.map((upgrade) => upgrade.rawcode),
    );
    const equivalentTiers = new Set(
      fighters.flatMap((candidate) => {
        const candidateTier = tierByRawcode.get(candidate.rawcode);
        const sharesUpgrade = candidate.upgrades.some((upgrade) =>
          fighterUpgradeRawcodes.has(upgrade.rawcode),
        );
        const isEquivalent =
          candidateTier !== undefined &&
          candidate.name === fighter.name &&
          candidate.baseRawcode === fighter.baseRawcode &&
          sharesUpgrade;

        return isEquivalent ? [candidateTier] : [];
      }),
    );

    if (equivalentTiers.size === 1) {
      resolvedTierByRawcode.set(
        fighter.rawcode,
        equivalentTiers.values().next().value as number,
      );
    }
  }

  return {
    modeGroups: gameModes.groups,
    units: fighters.map((fighter) => ({
      rawcode: fighter.rawcode,
      name: fighter.name,
      iconPath: iconPaths[fighter.rawcode] ?? null,
      gold: fighter.gold,
      tier: resolvedTierByRawcode.get(fighter.rawcode) ?? null,
      tierSource: tierByRawcode.has(fighter.rawcode)
        ? "builder-slot"
        : resolvedTierByRawcode.has(fighter.rawcode)
          ? "equivalent-fighter"
          : null,
      rangeType: fighter.rangeType,
      upgradeCount: fighter.upgrades.length,
    })),
  };
}
