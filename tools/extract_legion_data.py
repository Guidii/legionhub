from __future__ import annotations

import argparse
import json
import re
import struct
from collections import defaultdict
from pathlib import Path
from typing import Any

COLOR_RE = re.compile(r"\|c[0-9A-Fa-f]{8}|\|r", re.I)
WTS_RE = re.compile(
    r"STRING\s+(\d+)\s*\n(?P<comments>(?:(?://[^\n]*)\n)*)\{\n(?P<body>.*?)\n\}",
    re.S,
)


def clean_wc3_text(value: str | None) -> str:
    if not value:
        return ""
    return (
        COLOR_RE.sub("", value)
        .replace("|n", "\n")
        .replace("|R", "")
        .replace("|r", "")
        .strip()
    )


def load_wts(path: Path) -> dict[int, str]:
    text = path.read_text("utf-8", errors="replace")
    return {int(match.group(1)): match.group("body") for match in WTS_RE.finditer(text)}


def resolve_wts(value: Any, wts: dict[int, str]) -> Any:
    if isinstance(value, str) and value.startswith("TRIGSTR_"):
        try:
            return wts.get(int(value.split("_", 1)[1]), value)
        except (ValueError, IndexError):
            return value
    return value


def parse_object_file(path: Path, *, levelled: bool, wts: dict[int, str]) -> dict[str, Any]:
    data = path.read_bytes()
    pos = 0

    def read_i32() -> int:
        nonlocal pos
        value = struct.unpack_from("<i", data, pos)[0]
        pos += 4
        return value

    def read_f32() -> float:
        nonlocal pos
        value = struct.unpack_from("<f", data, pos)[0]
        pos += 4
        return value

    def read_rawcode() -> str:
        nonlocal pos
        value = data[pos : pos + 4].decode("latin1")
        pos += 4
        return value

    def read_cstring() -> str:
        nonlocal pos
        end = data.index(0, pos)
        value = data[pos:end].decode("utf-8", errors="replace")
        pos = end + 1
        return value

    version = read_i32()
    tables: list[list[dict[str, Any]]] = []

    for _ in range(2):
        count = read_i32()
        objects: list[dict[str, Any]] = []

        for _ in range(count):
            old_id = read_rawcode()
            new_id = read_rawcode()
            unknown_1 = read_i32()
            unknown_2 = read_i32()
            modification_count = read_i32()
            modifications: list[dict[str, Any]] = []

            for _ in range(modification_count):
                field_id = read_rawcode()
                value_type = read_i32()
                level = read_i32() if levelled else 0
                data_pointer = read_i32() if levelled else 0

                if value_type == 0:
                    value: Any = read_i32()
                elif value_type in (1, 2):
                    value = read_f32()
                elif value_type == 3:
                    value = read_cstring()
                else:
                    raise ValueError(
                        f"Tipo de valor não suportado {value_type} em {path.name}, byte {pos}"
                    )

                end_marker = read_rawcode()
                modifications.append(
                    {
                        "fieldId": field_id,
                        "valueType": value_type,
                        "level": level,
                        "dataPointer": data_pointer,
                        "value": resolve_wts(value, wts),
                        "endMarker": end_marker,
                    }
                )

            rawcode = new_id if new_id.strip("\x00") else old_id
            objects.append(
                {
                    "rawcode": rawcode,
                    "baseRawcode": old_id,
                    "isCustom": bool(new_id.strip("\x00")),
                    "unknown1": unknown_1,
                    "unknown2": unknown_2,
                    "modifications": modifications,
                }
            )

        tables.append(objects)

    if pos != len(data):
        raise ValueError(
            f"Leitura incompleta de {path.name}: terminou em {pos}, total {len(data)}"
        )

    return {
        "formatVersion": version,
        "originalObjects": tables[0],
        "customObjects": tables[1],
    }


def flatten_fields(obj: dict[str, Any], *, levelled: bool) -> dict[str, Any]:
    if levelled:
        fields: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for mod in obj["modifications"]:
            fields[mod["fieldId"]].append(
                {
                    "level": mod["level"],
                    "dataPointer": mod["dataPointer"],
                    "value": mod["value"],
                }
            )
        return dict(fields)

    return {mod["fieldId"]: mod["value"] for mod in obj["modifications"]}


def all_objects(parsed: dict[str, Any]) -> list[dict[str, Any]]:
    return parsed["originalObjects"] + parsed["customObjects"]


def first_level_value(fields: dict[str, list[dict[str, Any]]], field_id: str) -> Any:
    values = fields.get(field_id, [])
    if not values:
        return None
    values = sorted(values, key=lambda item: (item["level"], item["dataPointer"]))
    return values[0]["value"]


def split_csv(value: Any) -> list[str]:
    if not isinstance(value, str) or not value:
        return []
    return [part.strip() for part in value.split(",") if part.strip()]


def extract_rawcodes(value: Any) -> list[str]:
    if not isinstance(value, str) or not value:
        return []
    # Alguns campos do mapa usam vírgulas; outros vieram concatenados com aspas.
    return re.findall(r"[A-Za-z0-9]{4}", value)


def parse_tooltip_stats(text: str | None) -> dict[str, Any]:
    clean = clean_wc3_text(text)
    result: dict[str, Any] = {}

    damage = re.search(r"Damage:\s*(\d+)\s*-\s*(\d+)", clean, re.I)
    if damage:
        result["damageMin"] = int(damage.group(1))
        result["damageMax"] = int(damage.group(2))

    speed = re.search(r"Speed:\s*([0-9.]+)", clean, re.I)
    if speed:
        result["cooldown"] = float(speed.group(1))

    attack_range = re.search(r"Range:\s*(\d+)\s*\((Melee|Ranged)\)", clean, re.I)
    if attack_range:
        result["range"] = int(attack_range.group(1))
        result["rangeType"] = attack_range.group(2).lower()

    hp = re.search(r"Hit Points:\s*(\d+)", clean, re.I)
    if hp:
        result["hp"] = int(hp.group(1))

    attack_type = re.search(r"Attack Type:\s*([A-Za-z]+)", clean, re.I)
    if attack_type:
        result["attackType"] = attack_type.group(1).lower()

    defense_type = re.search(r"Defense Type:\s*([A-Za-z-]+)", clean, re.I)
    if defense_type:
        result["defenseType"] = defense_type.group(1).lower()

    income = re.search(r"\+(\d+)\s+income\s*/\s*\+(\d+)\s+bounty", clean, re.I)
    if income:
        result["income"] = int(income.group(1))
        result["bounty"] = int(income.group(2))

    ability = re.search(r"Ability:\s*(.*)", clean, re.I | re.S)
    if ability:
        result["abilityText"] = ability.group(1).strip()

    return result


def normalize_attack(fields: dict[str, Any], number: int, tooltip: dict[str, Any]) -> dict[str, Any] | None:
    prefix = f"ua{number}"
    has_attack = any(key.startswith(prefix) for key in fields)
    if not has_attack:
        return None

    base = fields.get(f"{prefix}b")
    dice = fields.get(f"{prefix}d")
    sides = fields.get(f"{prefix}s")
    minimum = None
    maximum = None

    if isinstance(base, int) and isinstance(dice, int) and isinstance(sides, int):
        minimum = base + dice
        maximum = base + dice * sides
    elif number == 1:
        minimum = tooltip.get("damageMin")
        maximum = tooltip.get("damageMax")

    return {
        "number": number,
        "damageBase": base,
        "dice": dice,
        "sidesPerDie": sides,
        "damageMin": minimum,
        "damageMax": maximum,
        "cooldown": tooltip.get("cooldown") if number == 1 and tooltip.get("cooldown") is not None else fields.get(f"{prefix}c"),
        "range": tooltip.get("range") if number == 1 and tooltip.get("range") is not None else fields.get(f"{prefix}r"),
        "engineRange": fields.get(f"{prefix}r"),
        "attackType": tooltip.get("attackType") if number == 1 and tooltip.get("attackType") else fields.get(f"{prefix}t"),
        "weaponType": fields.get(f"{prefix}w"),
        "targets": split_csv(fields.get(f"{prefix}g")),
        "enabledTargets": split_csv(fields.get(f"{prefix}p")),
    }


def ability_catalog(
    game_abilities: dict[str, dict[str, Any]],
    skin_abilities: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    rawcodes = sorted(set(game_abilities) | set(skin_abilities))
    result: dict[str, dict[str, Any]] = {}

    for rawcode in rawcodes:
        game_fields = game_abilities.get(rawcode, {}).get("fields", {})
        skin_fields = skin_abilities.get(rawcode, {}).get("fields", {})
        name = first_level_value(game_fields, "anam") or first_level_value(skin_fields, "anam")
        tooltip = first_level_value(game_fields, "atp1") or first_level_value(skin_fields, "atp1")
        description = first_level_value(game_fields, "aub1") or first_level_value(skin_fields, "aub1")
        icon = first_level_value(game_fields, "aart") or first_level_value(skin_fields, "aart")
        result[rawcode] = {
            "rawcode": rawcode,
            "name": clean_wc3_text(name),
            "tooltip": clean_wc3_text(tooltip),
            "description": clean_wc3_text(description),
            "icon": icon,
            "isSystemAbility": clean_wc3_text(name).lower() in {"sell"},
        }

    return result


def build_unit_record(
    rawcode: str,
    game_by_rawcode: dict[str, dict[str, Any]],
    skin_by_rawcode: dict[str, dict[str, Any]],
    abilities: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    game = game_by_rawcode.get(rawcode, {})
    skin = skin_by_rawcode.get(rawcode, {})
    game_fields = game.get("fields", {})
    skin_fields = skin.get("fields", {})
    tooltip_stats = parse_tooltip_stats(skin_fields.get("utub"))
    ability_rawcodes = extract_rawcodes(game_fields.get("uabi"))

    attacks = [
        attack
        for attack in (
            normalize_attack(game_fields, 1, tooltip_stats),
            normalize_attack(game_fields, 2, tooltip_stats),
        )
        if attack is not None
    ]

    return {
        "rawcode": rawcode,
        "baseRawcode": game.get("baseRawcode") or skin.get("baseRawcode"),
        "name": clean_wc3_text(skin_fields.get("unam")),
        "basicTooltip": clean_wc3_text(skin_fields.get("utip")),
        "extendedTooltip": clean_wc3_text(skin_fields.get("utub")),
        "hotkey": skin_fields.get("uhot") or None,
        "icon": skin_fields.get("uico") or None,
        "model": skin_fields.get("umdl") or None,
        "soundSet": skin_fields.get("usnd") or None,
        "cost": {
            "gold": game_fields.get("ugol"),
            "lumber": game_fields.get("ulum"),
            "totalGoldValue": game_fields.get("upoi"),
        },
        "stats": {
            "hp": tooltip_stats.get("hp", game_fields.get("uhpm")),
            "armor": game_fields.get("udef"),
            "defenseType": tooltip_stats.get("defenseType", game_fields.get("udty")),
            "acquisitionRange": game_fields.get("uacq"),
            "attacks": attacks,
        },
        "abilities": [abilities.get(code, {"rawcode": code}) for code in ability_rawcodes],
        "abilityRawcodes": ability_rawcodes,
        "upgradeRawcodes": extract_rawcodes(game_fields.get("uupt")),
        "requirements": extract_rawcodes(game_fields.get("ureq")),
        "unitTypes": split_csv(game_fields.get("utyp")),
        "tooltipStats": tooltip_stats,
        "source": {
            "gameplayFile": "File00000003.xxx",
            "skinFile": "File00000735.xxx",
            "mapVersion": "11.4b-beta1",
        },
    }


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Extrai dados estruturados do Legion TD 11.4b-beta1")
    parser.add_argument("map_dir", type=Path, help="Pasta com os arquivos extraídos do mapa")
    parser.add_argument("output_dir", type=Path, help="Pasta de saída")
    args = parser.parse_args()

    map_dir: Path = args.map_dir
    output_dir: Path = args.output_dir

    required_files = [
        "File00000003.xxx",
        "File00000724.xxx",
        "File00000726.xxx",
        "File00000735.xxx",
        "File00000750.xxx",
    ]
    missing = [name for name in required_files if not (map_dir / name).exists()]
    if missing:
        raise FileNotFoundError(f"Arquivos obrigatórios ausentes: {', '.join(missing)}")

    wts = load_wts(map_dir / "File00000750.xxx")

    gameplay_units_parsed = parse_object_file(
        map_dir / "File00000003.xxx", levelled=False, wts=wts
    )
    skin_units_parsed = parse_object_file(
        map_dir / "File00000735.xxx", levelled=False, wts=wts
    )
    gameplay_abilities_parsed = parse_object_file(
        map_dir / "File00000724.xxx", levelled=True, wts=wts
    )
    skin_abilities_parsed = parse_object_file(
        map_dir / "File00000726.xxx", levelled=True, wts=wts
    )

    gameplay_units = {
        obj["rawcode"]: {**obj, "fields": flatten_fields(obj, levelled=False)}
        for obj in all_objects(gameplay_units_parsed)
    }
    skin_units = {
        obj["rawcode"]: {**obj, "fields": flatten_fields(obj, levelled=False)}
        for obj in all_objects(skin_units_parsed)
    }
    gameplay_abilities = {
        obj["rawcode"]: {**obj, "fields": flatten_fields(obj, levelled=True)}
        for obj in all_objects(gameplay_abilities_parsed)
    }
    skin_abilities = {
        obj["rawcode"]: {**obj, "fields": flatten_fields(obj, levelled=True)}
        for obj in all_objects(skin_abilities_parsed)
    }

    abilities = ability_catalog(gameplay_abilities, skin_abilities)
    unit_rawcodes = sorted(set(gameplay_units) | set(skin_units))
    all_units = {
        rawcode: build_unit_record(rawcode, gameplay_units, skin_units, abilities)
        for rawcode in unit_rawcodes
    }

    builders: list[dict[str, Any]] = []
    reverse_builder_map: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for rawcode, unit in all_units.items():
        build_list = extract_rawcodes(gameplay_units.get(rawcode, {}).get("fields", {}).get("ubui"))
        if "Builder" not in unit["basicTooltip"] or not build_list:
            continue

        seen: set[str] = set()
        unique_build_list: list[str] = []
        for built_rawcode in build_list:
            if built_rawcode not in seen:
                unique_build_list.append(built_rawcode)
                seen.add(built_rawcode)

        fighter_rawcodes = [code for code in unique_build_list if code != "h996"]
        builder = {
            "rawcode": rawcode,
            "name": unit["name"],
            "tooltip": unit["basicTooltip"],
            "buildRawcodes": fighter_rawcodes,
            "units": [
                {
                    "rawcode": code,
                    "name": all_units.get(code, {}).get("name"),
                    "slot": index + 1,
                }
                for index, code in enumerate(fighter_rawcodes)
            ],
        }
        builders.append(builder)

        for index, code in enumerate(fighter_rawcodes):
            reverse_builder_map[code].append(
                {"builder": unit["name"], "builderRawcode": rawcode, "slot": index + 1}
            )

    fighters: list[dict[str, Any]] = []
    upgrades: list[dict[str, Any]] = []
    mercenaries: list[dict[str, Any]] = []

    for rawcode, unit in all_units.items():
        tooltip = unit["basicTooltip"]

        if tooltip.startswith("Deploy "):
            category = "fighter"
            if unit["name"] == "Altar of Heroes":
                category = "hero-altar"
            elif unit["name"].startswith("Morph ["):
                category = "hybrid-morph"

            fighters.append(
                {
                    **unit,
                    "category": category,
                    "builders": reverse_builder_map.get(rawcode, []),
                }
            )

        if tooltip.startswith("Promote to "):
            upgrades.append({**unit, "category": "fighter-upgrade"})

        if "Summon " in tooltip:
            tooltip_stats = unit["tooltipStats"]
            mercenaries.append(
                {
                    **unit,
                    "category": "mercenary",
                    "income": tooltip_stats.get("income", unit["cost"]["totalGoldValue"]),
                    "bounty": tooltip_stats.get("bounty"),
                }
            )

    upgrade_parents: dict[str, list[str]] = defaultdict(list)
    for rawcode, unit in all_units.items():
        if unit["basicTooltip"].startswith(("Deploy ", "Promote to ")):
            for upgrade_rawcode in unit["upgradeRawcodes"]:
                upgrade_parents[upgrade_rawcode].append(rawcode)

    for upgrade in upgrades:
        upgrade["parentRawcodes"] = upgrade_parents.get(upgrade["rawcode"], [])

    referenced_abilities = sorted(
        {
            code
            for unit in fighters + upgrades + mercenaries
            for code in unit.get("abilityRawcodes", [])
        }
    )
    abilities_referenced = [abilities[code] for code in referenced_abilities if code in abilities]

    mercenary_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for mercenary in mercenaries:
        mercenary_groups[mercenary["name"].strip()].append(
            {
                "rawcode": mercenary["rawcode"],
                "lumberCost": mercenary["cost"]["lumber"],
                "income": mercenary["income"],
                "bounty": mercenary["bounty"],
                "requirements": mercenary["requirements"],
                "hp": mercenary["stats"]["hp"],
            }
        )

    grouped_mercenaries = [
        {"name": name, "variants": sorted(variants, key=lambda item: (item["lumberCost"] or 0, item["rawcode"]))}
        for name, variants in sorted(mercenary_groups.items())
    ]

    write_json(output_dir / "all-units.json", list(all_units.values()))
    write_json(output_dir / "builders.json", sorted(builders, key=lambda item: item["name"]))
    write_json(output_dir / "fighters.json", sorted(fighters, key=lambda item: (item["category"], item["name"], item["rawcode"])))
    write_json(output_dir / "fighter-upgrades.json", sorted(upgrades, key=lambda item: (item["name"], item["rawcode"])))
    write_json(output_dir / "mercenaries.json", sorted(mercenaries, key=lambda item: (item["name"], item["rawcode"])))
    write_json(output_dir / "mercenary-groups.json", grouped_mercenaries)
    write_json(output_dir / "abilities-referenced.json", abilities_referenced)

    summary = {
        "mapVersion": "11.4b-beta1",
        "parsedUnitObjects": len(all_units),
        "parsedAbilityObjects": len(abilities),
        "builders": len(builders),
        "deployObjects": len(fighters),
        "normalFighters": sum(item["category"] == "fighter" for item in fighters),
        "upgradeObjects": len(upgrades),
        "mercenaryVariants": len(mercenaries),
        "uniqueMercenaryNames": len(grouped_mercenaries),
        "referencedAbilities": len(abilities_referenced),
        "notes": [
            "Os objetos Deploy/Promote são os objetos exibidos ao jogador e carregam custo, tooltip e relações de upgrade.",
            "Há variantes duplicadas de mercenários; a relação exata com cada modo ainda precisa ser confirmada.",
            "Os dados foram extraídos da build 11.4b-beta1, não de uma 11.4b final genérica.",
        ],
    }
    write_json(output_dir / "summary.json", summary)

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
