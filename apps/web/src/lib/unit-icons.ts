import { readFile } from "node:fs/promises";
import path from "node:path";

type UnitIconStatus =
  | "available"
  | "missing"
  | "invalid-source"
  | "uncertain";

type UnitIconManifestEntry = {
  rawcode: string;
  webPath: string | null;
  status: UnitIconStatus;
};

type UnitIconManifest = {
  units: Record<string, UnitIconManifestEntry>;
};

async function readUnitIconManifest(): Promise<UnitIconManifest> {
  const manifestPath = path.resolve(
    process.cwd(),
    "../..",
    "data/11.4b-beta1/unit-icon-web-assets.json",
  );
  const contents = await readFile(manifestPath, "utf8");

  return JSON.parse(contents) as UnitIconManifest;
}

export async function getUnitIconPath(
  rawcode: string,
): Promise<string | null> {
  const manifest = await readUnitIconManifest();
  const entry = manifest.units[rawcode];

  return entry?.status === "available" ? entry.webPath : null;
}

export async function getUnitIconPaths(
  rawcodes: string[],
): Promise<Record<string, string | null>> {
  const manifest = await readUnitIconManifest();

  return Object.fromEntries(
    rawcodes.map((rawcode) => {
      const entry = manifest.units[rawcode];
      const webPath =
        entry?.status === "available" ? entry.webPath : null;

      return [rawcode, webPath];
    }),
  );
}
