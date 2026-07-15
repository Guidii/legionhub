from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

sys.dont_write_bytecode = True

from extract_legion_data import (
    all_objects,
    clean_wc3_text,
    load_wts,
    parse_object_file,
)


CORE_LEVEL_FIELDS = (
    "targs",
    "Cast",
    "Dur",
    "HeroDur",
    "Cool",
    "Cost",
    "Area",
    "Rng",
    "DataA",
    "DataB",
    "DataC",
    "DataD",
    "DataE",
    "DataF",
    "DataG",
    "DataH",
    "DataI",
    "BuffID",
    "EfctID",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_slk_value(raw: str) -> Any:
    if raw.startswith('"') and raw.endswith('"'):
        return raw[1:-1].replace('""', '"')
    if raw == "":
        return None
    try:
        return int(raw)
    except ValueError:
        try:
            return float(raw)
        except ValueError:
            return raw


def parse_slk(text: str) -> list[dict[str, Any]]:
    cells: dict[tuple[int, int], Any] = {}
    current_x = 0
    current_y = 0
    for line in text.splitlines():
        if not line.startswith("C;"):
            continue
        value: Any = None
        has_value = False
        for part in line.split(";")[1:]:
            if part.startswith("X"):
                current_x = int(part[1:])
            elif part.startswith("Y"):
                current_y = int(part[1:])
            elif part.startswith("K"):
                value = parse_slk_value(part[1:])
                has_value = True
        if has_value:
            cells[(current_x, current_y)] = value

    max_x = max((x for x, _ in cells), default=0)
    headers = {x: cells.get((x, 1)) for x in range(1, max_x + 1)}
    rows: list[dict[str, Any]] = []
    for y in sorted({y for _, y in cells if y > 1}):
        row = {
            str(headers[x]): cells[(x, y)]
            for x in range(1, max_x + 1)
            if headers.get(x) is not None and (x, y) in cells
        }
        if row:
            rows.append(row)
    return rows


def parse_key_value_text(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith(("//", ";", "[")):
            continue
        if "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def read_mpq_file(mpqcli: Path, archive: Path, source_path: str) -> bytes | None:
    result = subprocess.run(
        [str(mpqcli), "read", source_path, str(archive)],
        capture_output=True,
        check=False,
    )
    return result.stdout if result.returncode == 0 else None


def read_standard_file(
    mpqcli: Path, archives: list[Path], source_path: str
) -> tuple[bytes, str]:
    for archive in archives:
        data = read_mpq_file(mpqcli, archive, source_path)
        if data is not None:
            return data, archive.name
    raise FileNotFoundError(
        f"{source_path} não foi localizado em: {', '.join(map(str, archives))}"
    )


def object_index(parsed: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {item["rawcode"]: item for item in all_objects(parsed)}


def merge_map_objects(
    gameplay: dict[str, dict[str, Any]], skin: dict[str, dict[str, Any]]
) -> dict[str, dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for rawcode in sorted(set(gameplay) | set(skin)):
        gameplay_object = gameplay.get(rawcode)
        skin_object = skin.get(rawcode)
        identity = gameplay_object or skin_object
        assert identity is not None
        modifications: list[dict[str, Any]] = []
        for origin, source in (
            ("map-gameplay", gameplay_object),
            ("map-skin", skin_object),
        ):
            if source is None:
                continue
            modifications.extend(
                {**modification, "origin": origin}
                for modification in source["modifications"]
            )
        modifications.sort(
            key=lambda item: (
                item["fieldId"],
                item["level"],
                item["dataPointer"],
                item["origin"],
            )
        )
        merged[rawcode] = {
            "rawcode": rawcode,
            "baseRawcode": identity["baseRawcode"],
            "isCustom": identity["isCustom"],
            "sources": [
                origin
                for origin, source in (
                    ("map-gameplay", gameplay_object),
                    ("map-skin", skin_object),
                )
                if source is not None
            ],
            "modifications": modifications,
        }
    return merged


def metadata_index(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {
        str(row["ID"]): row
        for row in rows
        if isinstance(row.get("ID"), str) and row["ID"]
    }


def normalize_metadata_value(value: Any, metadata_type: Any) -> Any:
    if metadata_type == "bool" and isinstance(value, int):
        return bool(value)
    if (
        isinstance(metadata_type, str)
        and metadata_type.endswith("List")
        and isinstance(value, str)
    ):
        return [part.strip() for part in value.split(",") if part.strip()]
    return value


def standard_ability_index(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {
        str(row["alias"]): row
        for row in rows
        if isinstance(row.get("alias"), str) and row["alias"]
    }


def serialize_modification(
    modification: dict[str, Any],
    metadata: dict[str, dict[str, Any]],
    editor_strings: dict[str, str],
) -> dict[str, Any]:
    field_metadata = metadata.get(modification["fieldId"])
    display_name_key = (
        field_metadata.get("displayName") if field_metadata is not None else None
    )
    semantic_name = (
        editor_strings.get(display_name_key)
        if isinstance(display_name_key, str)
        else None
    )
    return {
        "fieldId": modification["fieldId"],
        "level": modification["level"],
        "dataPointer": modification["dataPointer"],
        "valueType": modification["valueType"],
        "rawValue": modification["value"],
        "normalizedValue": normalize_metadata_value(
            modification["value"],
            field_metadata.get("type") if field_metadata is not None else None,
        ),
        "origin": modification["origin"],
        "metadata": (
            {
                "field": field_metadata.get("field"),
                "slk": field_metadata.get("slk"),
                "data": field_metadata.get("data"),
                "type": field_metadata.get("type"),
                "repeat": field_metadata.get("repeat"),
                "useSpecific": field_metadata.get("useSpecific"),
                "displayNameKey": display_name_key,
                "semanticName": semantic_name,
                "semanticStatus": (
                    "resolved-from-warcraft-editor-strings"
                    if semantic_name is not None
                    else "metadata-key-only"
                ),
            }
            if field_metadata is not None
            else None
        ),
    }


def modification_column(
    modification: dict[str, Any], field_metadata: dict[str, Any] | None
) -> str | None:
    if field_metadata is None or field_metadata.get("slk") != "AbilityData":
        return None
    field = field_metadata.get("field")
    if not isinstance(field, str) or not field:
        return None
    level = max(1, int(modification["level"] or 1))
    if field == "Data":
        pointer = int(modification["dataPointer"] or field_metadata.get("data") or 0)
        if not 1 <= pointer <= 9:
            return None
        return f"Data{chr(64 + pointer)}{level}"
    repeat = int(field_metadata.get("repeat") or 0)
    return f"{field}{level}" if repeat > 0 else field


def normalized_levels(
    map_object: dict[str, Any],
    base_object: dict[str, Any] | None,
    metadata: dict[str, dict[str, Any]],
) -> tuple[int, list[dict[str, Any]], list[dict[str, Any]]]:
    level_override = next(
        (
            item["value"]
            for item in map_object["modifications"]
            if item["fieldId"] == "alev"
        ),
        None,
    )
    inherited_levels = base_object.get("levels") if base_object else None
    levels = int(level_override or inherited_levels or 1)
    resolved: dict[str, dict[str, Any]] = {}
    if base_object is not None:
        for level in range(1, levels + 1):
            for field in CORE_LEVEL_FIELDS:
                column = f"{field}{level}"
                if column in base_object:
                    resolved[column] = {
                        "rawValue": base_object[column],
                        "normalizedValue": (
                            [
                                part.strip()
                                for part in str(base_object[column]).split(",")
                                if part.strip()
                            ]
                            if field in {"targs", "BuffID", "EfctID"}
                            and isinstance(base_object[column], str)
                            else base_object[column]
                        ),
                        "origin": "warcraft-standard",
                        "field": field,
                        "level": level,
                    }

    unresolved: list[dict[str, Any]] = []
    for modification in map_object["modifications"]:
        field_metadata = metadata.get(modification["fieldId"])
        column = modification_column(modification, field_metadata)
        if column is None:
            unresolved.append(
                {
                    "fieldId": modification["fieldId"],
                    "level": modification["level"],
                    "dataPointer": modification["dataPointer"],
                    "reason": "not-an-AbilityData-column-or-metadata-missing",
                }
            )
            continue
        level = max(1, int(modification["level"] or 1))
        field = column.removesuffix(str(level)) if column.endswith(str(level)) else column
        resolved[column] = {
            "rawValue": modification["value"],
            "normalizedValue": normalize_metadata_value(
                modification["value"],
                field_metadata.get("type") if field_metadata is not None else None,
            ),
            "origin": modification["origin"],
            "field": field,
            "level": level,
            "fieldId": modification["fieldId"],
            "dataPointer": modification["dataPointer"],
        }

    level_records = []
    for level in range(1, levels + 1):
        fields = {
            item["field"]: {
                key: value
                for key, value in item.items()
                if key not in {"field", "level"}
            }
            for item in resolved.values()
            if item["level"] == level
        }
        level_records.append({"level": level, "fields": fields})
    return levels, level_records, unresolved


def build_dataset(args: argparse.Namespace) -> dict[str, Any]:
    wts = load_wts(args.map_dir / "File00000750.xxx")
    gameplay_path = args.map_dir / "File00000724.xxx"
    skin_path = args.map_dir / "File00000726.xxx"
    gameplay = object_index(
        parse_object_file(gameplay_path, levelled=True, wts=wts)
    )
    skin = object_index(parse_object_file(skin_path, levelled=True, wts=wts))
    map_objects = merge_map_objects(gameplay, skin)

    archives = [
        args.warcraft_dir / "War3Patch.mpq",
        args.warcraft_dir / "War3x.mpq",
        args.warcraft_dir / "war3.mpq",
    ]
    missing = [str(path) for path in archives if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Archives ausentes: {', '.join(missing)}")

    metadata_bytes, metadata_archive = read_standard_file(
        args.mpqcli, archives, r"Units\AbilityMetaData.slk"
    )
    ability_data_bytes, ability_data_archive = read_standard_file(
        args.mpqcli, archives, r"Units\AbilityData.slk"
    )
    editor_strings_bytes, editor_strings_archive = read_standard_file(
        args.mpqcli, archives, r"UI\WorldEditStrings.txt"
    )
    metadata = metadata_index(parse_slk(metadata_bytes.decode("latin1")))
    standard_abilities = standard_ability_index(
        parse_slk(ability_data_bytes.decode("latin1"))
    )
    editor_strings = parse_key_value_text(editor_strings_bytes.decode("latin1"))

    references = json.loads(args.ability_references.read_text(encoding="utf-8"))
    if not isinstance(references, list):
        raise TypeError("O catálogo de abilities referenciadas deve ser uma lista.")

    records = []
    counts: defaultdict[str, int] = defaultdict(int)
    for reference in sorted(references, key=lambda item: item["rawcode"]):
        rawcode = reference["rawcode"]
        map_object = map_objects.get(rawcode)
        if map_object is None:
            counts["notFound"] += 1
            records.append(
                {
                    **reference,
                    "resolutionStatus": "not-found",
                    "mapObject": None,
                    "baseAbility": None,
                    "levels": [],
                    "unresolvedFields": [],
                }
            )
            continue

        base_rawcode = map_object["baseRawcode"]
        base_object = standard_abilities.get(base_rawcode)
        level_count, levels, unresolved = normalized_levels(
            map_object, base_object, metadata
        )
        status = "resolved" if base_object is not None else "partially-resolved"
        counts["resolved" if status == "resolved" else "partiallyResolved"] += 1
        records.append(
            {
                "rawcode": rawcode,
                "baseRawcode": base_rawcode,
                "name": clean_wc3_text(reference.get("name")),
                "tooltip": clean_wc3_text(reference.get("tooltip")),
                "description": clean_wc3_text(reference.get("description")),
                "icon": reference.get("icon"),
                "isSystemAbility": bool(reference.get("isSystemAbility")),
                "resolutionStatus": status,
                "mapObject": {
                    "isCustom": map_object["isCustom"],
                    "sources": map_object["sources"],
                    "rawModifications": [
                        serialize_modification(item, metadata, editor_strings)
                        for item in map_object["modifications"]
                    ],
                },
                "baseAbility": (
                    {
                        "rawcode": base_rawcode,
                        "source": "warcraft-standard",
                        "rawObject": base_object,
                    }
                    if base_object is not None
                    else {
                        "rawcode": base_rawcode,
                        "source": "unresolved",
                        "rawObject": None,
                    }
                ),
                "levelCount": level_count,
                "levels": levels,
                "unresolvedFields": unresolved,
            }
        )

    return {
        "schemaVersion": 1,
        "mapVersion": "11.4b-beta1",
        "generatedFrom": {
            "mapObjectFiles": [
                {
                    "file": gameplay_path.name,
                    "sha256": sha256_file(gameplay_path),
                    "role": "ability-gameplay-overrides",
                },
                {
                    "file": skin_path.name,
                    "sha256": sha256_file(skin_path),
                    "role": "ability-skin-overrides",
                },
            ],
            "abilityReferences": {
                "file": args.ability_references.name,
                "sha256": sha256_file(args.ability_references),
            },
            "warcraftStandard": {
                "archivePrecedence": [path.name for path in archives],
                "abilityMetadata": {
                    "path": r"Units\AbilityMetaData.slk",
                    "archive": metadata_archive,
                    "sha256": hashlib.sha256(metadata_bytes).hexdigest(),
                },
                "abilityData": {
                    "path": r"Units\AbilityData.slk",
                    "archive": ability_data_archive,
                    "sha256": hashlib.sha256(ability_data_bytes).hexdigest(),
                },
                "editorStrings": {
                    "path": r"UI\WorldEditStrings.txt",
                    "archive": editor_strings_archive,
                    "sha256": hashlib.sha256(editor_strings_bytes).hexdigest(),
                },
            },
        },
        "summary": {
            "referencedAbilities": len(references),
            "resolved": counts["resolved"],
            "partiallyResolved": counts["partiallyResolved"],
            "notFound": counts["notFound"],
            "metadataFields": len(metadata),
            "standardAbilities": len(standard_abilities),
            "editorStrings": len(editor_strings),
        },
        "semanticsPolicy": {
            "rawValues": "preserved-from-source",
            "normalizedValues": "only-deterministic-field-and-level-mapping",
            "dataFieldMeaning": "unresolved-unless-the-metadata-key-is-independently-resolved",
            "inheritance": "map overrides replace matching standard AbilityData columns; absent columns inherit from baseRawcode",
        },
        "abilities": records,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extrai object data detalhado das abilities do LegionHub."
    )
    parser.add_argument("--map-dir", type=Path, required=True)
    parser.add_argument("--warcraft-dir", type=Path, required=True)
    parser.add_argument("--mpqcli", type=Path, required=True)
    parser.add_argument("--ability-references", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dataset = build_dataset(args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(dataset["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
