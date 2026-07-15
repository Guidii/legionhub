import { readFile } from "node:fs/promises";
import path from "node:path";

export type WaveConfidence =
  | "confirmed-directly"
  | "confirmed-by-game-observation"
  | "inferred-from-sequence"
  | "unknown";

export type WaveEvidence = {
  confidence: WaveConfidence;
  scope: string;
  source: string;
  detail: string;
};

export type PreliminaryWave = {
  number: number;
  numberConfidence: WaveConfidence;
  creep: {
    rawcode: string;
    name: string;
  };
  stats: {
    hp: number | null;
    armor: number | null;
    defenseTypeRaw: string | null;
    acquisitionRange: number | null;
  };
  movement: {
    speed: number | null;
    type: string | null;
  };
  attack: {
    damageBase: number | null;
    dice: number | null;
    sidesPerDie: number | null;
    damageMin: number | null;
    damageMax: number | null;
    cooldown: number | null;
    range: number | null;
    attackTypeRaw: string | null;
    weaponType: string | null;
  };
  abilities: Array<{
    rawcode: string;
    name: string;
  }>;
  air: boolean | null;
  boss: boolean | null;
  quantity: number | null;
  spawnInterval: number | null;
  modeOverrides: unknown | null;
  bounty: number | null;
  income: number | null;
  evidence: WaveEvidence[];
  limitations: string[];
};

export type PreliminaryWaveDataset = {
  mapVersion: string;
  status: "preliminary";
  confidenceLevels: WaveConfidence[];
  sourceFiles: {
    objectData: string;
    damageMatrix: string;
  };
  waves: PreliminaryWave[];
};

export async function getPreliminaryWaves(): Promise<PreliminaryWaveDataset> {
  const absolutePath = path.resolve(
    process.cwd(),
    "../..",
    "data/11.4b-beta1/waves-preliminary.json",
  );

  try {
    const contents = await readFile(absolutePath, "utf8");
    return JSON.parse(contents) as PreliminaryWaveDataset;
  } catch (error) {
    throw new Error(
      `Não foi possível carregar waves-preliminary.json. Caminho procurado: ${absolutePath}`,
      { cause: error },
    );
  }
}
