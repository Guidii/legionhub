import { readFile } from "node:fs/promises";
import path from "node:path";

export type StrategyContentStatus = "placeholder" | "draft" | "validated";

export type StrategyWavePlan = {
  wave: number;
  status: StrategyContentStatus;
  steps: string[];
  observation: string | null;
};

export type StrategyPosition = {
  unitRawcode: string;
  row: number;
  column: number;
  quantity: number;
  notes: string | null;
};

export type StrategyPositioning = {
  format: "grid-v1";
  rows: number | null;
  columns: number | null;
  units: StrategyPosition[];
  notes: string | null;
};

export type StrategyEconomyWave = {
  wave: number;
  status: StrategyContentStatus;
  actions: string[];
};

export type StrategyWaveAssessment = {
  wave: number | null;
  status: StrategyContentStatus;
  description: string;
};

export type StrategySendRange = {
  fromWave: number | null;
  toWave: number | null;
  status: StrategyContentStatus;
  sendRawcodes: string[];
  notes: string | null;
};

export type StrategyEvidenceStatus =
  | "observed"
  | "linked"
  | "pending-validation";

export type StrategySettlementReference = {
  waveObservationId: string;
  path: "observed.settlement";
};

export type StrategyEvidenceReference = {
  observationSessionId: string;
  wave: number;
  settlement: StrategySettlementReference | null;
  snapshotId: string | null;
  description: string;
  status: StrategyEvidenceStatus;
  notes: string | null;
};

export type Strategy = {
  id: string;
  buildId: string;
  title: string;
  description: string;
  compatibleModes: string[];
  requiredUnitRawcodes: string[];
  optionalUnitRawcodes: string[];
  buildOrder: StrategyWavePlan[];
  positioning: StrategyPositioning;
  economy: StrategyEconomyWave[];
  powerSpikes: StrategyWaveAssessment[];
  weakWaves: StrategyWaveAssessment[];
  recommendedSends: StrategySendRange[];
  notes: string;
  references: StrategyEvidenceReference[];
};

type RawStrategy = Omit<Strategy, "references"> & {
  references?: StrategyEvidenceReference[];
};

export async function getStrategyCatalog(): Promise<Strategy[]> {
  const contents = await readFile(
    path.resolve(process.cwd(), "../..", "data/11.4b-beta1/strategies.json"),
    "utf8",
  );

  const strategies = JSON.parse(contents) as RawStrategy[];
  return strategies.map((strategy) => ({
    ...strategy,
    references: strategy.references ?? [],
  }));
}

export async function getStrategyByBuildId(
  buildId: string,
): Promise<Strategy | undefined> {
  const strategies = await getStrategyCatalog();
  return strategies.find((strategy) => strategy.buildId === buildId);
}
