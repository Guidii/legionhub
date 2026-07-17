import { readFile } from "node:fs/promises";
import path from "node:path";

export type BuildDifficulty = "not-rated" | "easy" | "medium" | "hard";
export type BuildStatus =
  | "experimental"
  | "validated"
  | "testing"
  | "archived";

export type BuildPosition = {
  unitRawcode: string;
  row: number;
  column: number;
};

export type BuildOrderStep = {
  order: number;
  unitRawcode: string;
  quantity: number;
};

export type BuildUpgrade = {
  fromRawcode: string;
  toRawcode: string;
  order: number | null;
};

export type Build = {
  id: string;
  title: string;
  shortDescription: string;
  compatibleModes: string[];
  requiredUnitRawcodes: string[];
  optionalUnitRawcodes: string[];
  difficulty: BuildDifficulty;
  rating: number | null;
  status: BuildStatus;
  positioning: BuildPosition[] | null;
  constructionOrder: BuildOrderStep[] | null;
  economy: string[] | null;
  upgrades: BuildUpgrade[] | null;
  notes: string[] | null;
};

export async function getBuildCatalog(): Promise<Build[]> {
  const contents = await readFile(
    path.resolve(process.cwd(), "../..", "data/11.4b-beta1/builds.json"),
    "utf8",
  );

  return JSON.parse(contents) as Build[];
}

export async function getBuildById(id: string): Promise<Build | undefined> {
  const builds = await getBuildCatalog();
  return builds.find((build) => build.id === id);
}
