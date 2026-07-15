export const GAME_MODE_GROUPS = [
  "builder",
  "champions",
  "multiplier",
  "modifiers",
] as const;

export type GameModeGroup = (typeof GAME_MODE_GROUPS)[number];
export type GameModeConfidence = "confirmed-by-game-observation";

export type GameModeToken = {
  token: string;
  name: string;
  description: string;
  confidence: GameModeConfidence;
  source: string;
  value?: number;
};

export type GameModeCatalog = {
  mapVersion: string;
  source: {
    type: string;
    description: string;
  };
  groups: GameModeGroups;
};

export type GameModeGroups = Record<GameModeGroup, GameModeToken[]>;
export type GameModeDefinitionSet = { groups: GameModeGroups };

export type UnknownGameModeToken = {
  value: string;
  start: number;
  end: number;
};

export type GameModeParseError = {
  code:
    | "empty-input"
    | "unknown-token"
    | "missing-group"
    | "duplicate-group"
    | "duplicate-token"
    | "invalid-order";
  message: string;
  group?: GameModeGroup;
  token?: string;
  position?: number;
};

export type ParsedGameMode = {
  raw: string;
  builder: GameModeToken | null;
  champions: GameModeToken | null;
  multiplier: GameModeToken | null;
  modifiers: GameModeToken[];
  unknownTokens: UnknownGameModeToken[];
  errors: GameModeParseError[];
  valid: boolean;
};

export type FormattedGameMode = {
  compactCode: string;
  humanDescription: string;
};

export type GameModeSelection = {
  builder: string;
  champions: string;
  multiplier: string;
  modifiers: string[];
};

type LocatedToken = {
  definition: GameModeToken;
  group: GameModeGroup;
  position: number;
};

export function validateGameModeCatalog(catalog: GameModeCatalog): string[] {
  const errors: string[] = [];
  const actualGroups = Object.keys(catalog.groups).sort();
  const expectedGroups = [...GAME_MODE_GROUPS].sort();

  if (JSON.stringify(actualGroups) !== JSON.stringify(expectedGroups)) {
    errors.push(
      `Grupos inválidos: esperado ${expectedGroups.join(", ")}; recebido ${actualGroups.join(", ")}.`,
    );
  }

  const tokenGroups = new Map<string, GameModeGroup>();

  for (const group of GAME_MODE_GROUPS) {
    for (const definition of catalog.groups[group] ?? []) {
      const normalizedToken = definition.token.toUpperCase();
      const existingGroup = tokenGroups.get(normalizedToken);

      if (definition.token !== normalizedToken) {
        errors.push(`Token ${definition.token} deve estar em uppercase.`);
      }

      if (existingGroup !== undefined) {
        errors.push(
          `Token ${normalizedToken} aparece nos grupos ${existingGroup} e ${group}.`,
        );
      } else {
        tokenGroups.set(normalizedToken, group);
      }
    }
  }

  const multipliers = catalog.groups.multiplier;
  for (let value = 1; value <= 4; value += 1) {
    const definition = multipliers.find((item) => item.token === `X${value}`);
    if (definition?.value !== value) {
      errors.push(`Multiplicador X${value} deve possuir value ${value}.`);
    }
  }

  if (multipliers.length !== 4) {
    errors.push("O grupo multiplier deve conter exatamente X1, X2, X3 e X4.");
  }

  return errors;
}

export function parseGameMode(
  input: string,
  catalog: GameModeDefinitionSet,
): ParsedGameMode {
  const raw = input.toUpperCase();
  const definitions = GAME_MODE_GROUPS.flatMap((group) =>
    catalog.groups[group].map((definition) => ({ definition, group })),
  ).sort((left, right) => right.definition.token.length - left.definition.token.length);
  const locatedTokens: LocatedToken[] = [];
  const unknownTokens: UnknownGameModeToken[] = [];

  let cursor = 0;
  while (cursor < raw.length) {
    const match = definitions.find(({ definition }) =>
      raw.startsWith(definition.token, cursor),
    );

    if (match !== undefined) {
      locatedTokens.push({ ...match, position: cursor });
      cursor += match.definition.token.length;
      continue;
    }

    const start = cursor;
    cursor += 1;
    while (
      cursor < raw.length &&
      !definitions.some(({ definition }) =>
        raw.startsWith(definition.token, cursor),
      )
    ) {
      cursor += 1;
    }
    unknownTokens.push({ value: raw.slice(start, cursor), start, end: cursor });
  }

  const errors: GameModeParseError[] = unknownTokens.map((unknown) => ({
    code: "unknown-token",
    message: `Trecho desconhecido "${unknown.value}" na posição ${unknown.start}.`,
    token: unknown.value,
    position: unknown.start,
  }));

  if (raw.length === 0) {
    errors.push({ code: "empty-input", message: "O código está vazio." });
  }

  const rank = new Map<GameModeGroup, number>(
    GAME_MODE_GROUPS.map((group, index) => [group, index]),
  );
  let highestRank = -1;
  for (const located of locatedTokens) {
    const currentRank = rank.get(located.group) ?? -1;
    if (currentRank < highestRank) {
      errors.push({
        code: "invalid-order",
        message: `Token ${located.definition.token} está fora da ordem builder → champions → multiplier → modifiers.`,
        group: located.group,
        token: located.definition.token,
        position: located.position,
      });
    }
    highestRank = Math.max(highestRank, currentRank);
  }

  const grouped = new Map<GameModeGroup, LocatedToken[]>();
  for (const group of GAME_MODE_GROUPS) {
    grouped.set(
      group,
      locatedTokens.filter((located) => located.group === group),
    );
  }

  for (const group of ["builder", "champions", "multiplier"] as const) {
    const matches = grouped.get(group) ?? [];
    if (matches.length === 0) {
      errors.push({
        code: "missing-group",
        message: `O grupo ${group} é obrigatório.`,
        group,
      });
    } else if (matches.length > 1) {
      errors.push({
        code: "duplicate-group",
        message: `O grupo ${group} aparece mais de uma vez.`,
        group,
      });
    }
  }

  const seenTokens = new Set<string>();
  for (const located of locatedTokens) {
    if (seenTokens.has(located.definition.token)) {
      errors.push({
        code: "duplicate-token",
        message: `Token ${located.definition.token} está duplicado.`,
        group: located.group,
        token: located.definition.token,
        position: located.position,
      });
    }
    seenTokens.add(located.definition.token);
  }

  const builder = grouped.get("builder")?.[0]?.definition ?? null;
  const champions = grouped.get("champions")?.[0]?.definition ?? null;
  const multiplier = grouped.get("multiplier")?.[0]?.definition ?? null;
  const modifiers = (grouped.get("modifiers") ?? []).map(
    (located) => located.definition,
  );

  return {
    raw,
    builder,
    champions,
    multiplier,
    modifiers,
    unknownTokens,
    errors,
    valid: errors.length === 0,
  };
}

export function formatGameMode(parsed: ParsedGameMode): FormattedGameMode {
  if (
    !parsed.valid ||
    parsed.builder === null ||
    parsed.champions === null ||
    parsed.multiplier === null
  ) {
    throw new Error("Não é possível formatar um código de modo inválido.");
  }

  const definitions = [
    parsed.builder,
    parsed.champions,
    parsed.multiplier,
    ...parsed.modifiers,
  ];

  return {
    compactCode: definitions.map((definition) => definition.token).join(""),
    humanDescription: definitions
      .map((definition) => definition.name)
      .join(" + "),
  };
}

export function composeGameModeSelection(
  selection: GameModeSelection,
  catalog: GameModeDefinitionSet,
): ParsedGameMode {
  const knownModifierTokens = new Set(
    catalog.groups.modifiers.map((definition) => definition.token),
  );
  const selectedModifiers = new Set(selection.modifiers);
  const canonicalModifiers = catalog.groups.modifiers
    .filter((definition) => selectedModifiers.has(definition.token))
    .map((definition) => definition.token);
  const unknownModifiers = selection.modifiers.filter(
    (token) => !knownModifierTokens.has(token),
  );
  const compactCode = [
    selection.builder,
    selection.champions,
    selection.multiplier,
    ...canonicalModifiers,
    ...unknownModifiers,
  ].join("");

  return parseGameMode(compactCode, catalog);
}
