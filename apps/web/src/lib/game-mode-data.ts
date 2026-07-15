import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  parseGameMode,
  type GameModeCatalog,
  type ParsedGameMode,
  validateGameModeCatalog,
} from "@/lib/game-modes";

let catalogPromise: Promise<GameModeCatalog> | null = null;

export async function getGameModeCatalog(): Promise<GameModeCatalog> {
  if (catalogPromise === null) {
    const absolutePath = path.resolve(
      process.cwd(),
      "../..",
      "data/11.4b-beta1/game-modes.json",
    );

    catalogPromise = readFile(absolutePath, "utf8").then((contents) => {
      const catalog = JSON.parse(contents) as GameModeCatalog;
      const validationErrors = validateGameModeCatalog(catalog);

      if (validationErrors.length > 0) {
        throw new Error(
          `game-modes.json inválido:\n${validationErrors.join("\n")}`,
        );
      }

      return catalog;
    });
  }

  return catalogPromise;
}

export async function parseGameModeCode(raw: string): Promise<ParsedGameMode> {
  return parseGameMode(raw, await getGameModeCatalog());
}
