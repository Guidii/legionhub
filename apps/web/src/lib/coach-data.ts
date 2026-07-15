import {
  getDamageMultiplier,
  isAttackTypeUnconfirmed,
} from "@/lib/damage-matrix";
import { getGameModeCatalog } from "@/lib/game-mode-data";
import { getFighters } from "@/lib/legion-data";
import { getAverageDamage, getBaseDps } from "@/lib/unit-metrics";
import { getUnitIconPaths } from "@/lib/unit-icons";
import { getPreliminaryWaves, type WaveConfidence } from "@/lib/wave-data";

export type CoachWave = {
  number: number;
  name: string;
  rawcode: string;
  defenseType: string | null;
  confidence: Extract<
    WaveConfidence,
    "confirmed-directly" | "confirmed-by-game-observation"
  >;
  iconPath: string | null;
};

export type CoachUnit = {
  rawcode: string;
  name: string;
  iconPath: string | null;
  gold: number;
  pointValue: number | null;
  hp: number | null;
  dps: number | null;
  attackType: string | null;
  defenseType: string | null;
  attackTypeUnconfirmed: boolean;
  multipliersByDefense: Record<string, number | null>;
};

export type CoachData = {
  mapVersion: string;
  modeGroups: Awaited<ReturnType<typeof getGameModeCatalog>>["groups"];
  waves: CoachWave[];
  units: CoachUnit[];
};

export async function getCoachData(): Promise<CoachData> {
  const [fighters, waveDataset, gameModes] = await Promise.all([
    getFighters(),
    getPreliminaryWaves(),
    getGameModeCatalog(),
  ]);
  const confirmedWaves = waveDataset.waves.filter(
    (wave): wave is typeof wave & {
      numberConfidence:
        | "confirmed-directly"
        | "confirmed-by-game-observation";
    } =>
      wave.numberConfidence === "confirmed-directly" ||
      wave.numberConfidence === "confirmed-by-game-observation",
  );
  const iconPaths = await getUnitIconPaths([
    ...fighters.map((fighter) => fighter.rawcode),
    ...confirmedWaves.map((wave) => wave.creep.rawcode),
  ]);
  const defenseTypes = Array.from(
    new Set(
      confirmedWaves
        .map((wave) => wave.stats.defenseTypeRaw)
        .filter((defenseType): defenseType is string => defenseType !== null),
    ),
  );
  const units = await Promise.all(
    fighters.map(async (fighter): Promise<CoachUnit> => {
      const averageDamage = getAverageDamage(
        fighter.damageMin,
        fighter.damageMax,
      );
      const [attackTypeUnconfirmed, multiplierEntries] = await Promise.all([
        isAttackTypeUnconfirmed(fighter.attackType),
        Promise.all(
          defenseTypes.map(async (defenseType) => [
            defenseType,
            await getDamageMultiplier(fighter.attackType, defenseType),
          ] as const),
        ),
      ]);

      return {
        rawcode: fighter.rawcode,
        name: fighter.name,
        iconPath: iconPaths[fighter.rawcode] ?? null,
        gold: fighter.gold,
        pointValue: fighter.pointValue,
        hp: fighter.hp,
        dps: getBaseDps(averageDamage, fighter.cooldown),
        attackType: fighter.attackType,
        defenseType: fighter.defenseType,
        attackTypeUnconfirmed,
        multipliersByDefense: Object.fromEntries(multiplierEntries),
      };
    }),
  );

  return {
    mapVersion: waveDataset.mapVersion,
    modeGroups: gameModes.groups,
    waves: confirmedWaves.map((wave) => ({
      number: wave.number,
      name: wave.creep.name,
      rawcode: wave.creep.rawcode,
      defenseType: wave.stats.defenseTypeRaw,
      confidence: wave.numberConfidence,
      iconPath: iconPaths[wave.creep.rawcode] ?? null,
    })),
    units,
  };
}
