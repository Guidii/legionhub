from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


SUPPORTED_IMAGE_FORMATS = {"blp", "dds", "png", "tga"}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def detect_format(data: bytes, source_path: str) -> str:
    if data.startswith((b"BLP1", b"BLP2")):
        return "blp"
    if data.startswith(b"DDS "):
        return "dds"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"MDLX"):
        return "mdx"
    return Path(source_path).suffix.lower().removeprefix(".") or "unknown"


def extract_exact(
    mpqcli: Path, archive: Path, source_path: str, work_dir: Path
) -> bytes | None:
    attempt_dir = work_dir / hashlib.sha256(
        f"{archive}|{source_path}".encode("utf-8")
    ).hexdigest()
    attempt_dir.mkdir()
    result = subprocess.run(
        [
            str(mpqcli),
            "extract",
            "-o",
            str(attempt_dir),
            "-f",
            source_path,
            str(archive),
        ],
        capture_output=True,
        check=False,
    )
    files = sorted(path for path in attempt_dir.rglob("*") if path.is_file())
    if result.returncode != 0 or len(files) != 1:
        return None
    return files[0].read_bytes()


def index_anonymous_files(directory: Path | None) -> dict[str, list[str]]:
    if directory is None:
        return {}
    matches: dict[str, list[str]] = defaultdict(list)
    for path in sorted(item for item in directory.iterdir() if item.is_file()):
        matches[sha256_bytes(path.read_bytes())].append(path.name)
    return dict(matches)


def normalize_source_path(source_path: str) -> str:
    return source_path.replace("\\", "/").lower()


def build_manifest(args: argparse.Namespace) -> dict[str, Any]:
    loaded_unit_data: Any = json.loads(args.unit_data.read_text(encoding="utf-8"))
    if not isinstance(loaded_unit_data, list):
        raise TypeError("O dataset de unidades deve ser uma lista.")
    unit_data: dict[str, dict[str, Any]] = {}
    for unit in loaded_unit_data:
        rawcode = unit.get("rawcode") if isinstance(unit, dict) else None
        if not isinstance(rawcode, str) or not rawcode:
            raise ValueError("Registro de unidade sem rawcode válido.")
        if rawcode in unit_data:
            raise ValueError(f"Rawcode duplicado no dataset: {rawcode}")
        unit_data[rawcode] = unit
    archives = [
        (args.map, "map-custom", args.map.name),
        (args.warcraft_dir / "War3Patch.mpq", "warcraft-standard", "War3Patch.mpq"),
        (args.warcraft_dir / "War3x.mpq", "warcraft-standard", "War3x.mpq"),
        (args.warcraft_dir / "war3.mpq", "warcraft-standard", "war3.mpq"),
    ]
    missing_archives = [str(path) for path, _, _ in archives if not path.is_file()]
    if missing_archives:
        raise FileNotFoundError(f"Archives ausentes: {', '.join(missing_archives)}")
    if not args.mpqcli.is_file():
        raise FileNotFoundError(f"mpqcli ausente: {args.mpqcli}")

    anonymous_index = index_anonymous_files(args.anonymous_extract_dir)
    paths = sorted(
        {
            unit.get("icon")
            for unit in unit_data.values()
            if isinstance(unit.get("icon"), str) and unit["icon"]
        },
        key=str.casefold,
    )
    located: dict[str, dict[str, Any]] = {}

    with tempfile.TemporaryDirectory(prefix="legionhub-unit-icons-") as temporary:
        work_dir = Path(temporary)
        for source_path in paths:
            record: dict[str, Any] | None = None
            for archive_path, origin, archive_name in archives:
                data = extract_exact(args.mpqcli, archive_path, source_path, work_dir)
                if data is None:
                    continue
                digest = sha256_bytes(data)
                detected_format = detect_format(data, source_path)
                valid_image = detected_format in SUPPORTED_IMAGE_FORMATS
                record = {
                    "origin": origin if valid_image else "invalid-source",
                    "archive": archive_name,
                    "sourceSize": len(data),
                    "sha256": digest,
                    "format": detected_format,
                    "status": "located" if valid_image else "invalid-source",
                }
                physical_matches = anonymous_index.get(digest, [])
                if physical_matches and origin == "map-custom":
                    record["anonymousPhysicalMatches"] = physical_matches
                break
            located[source_path] = record or {
                "origin": "not-found",
                "archive": None,
                "sourceSize": None,
                "sha256": None,
                "format": Path(source_path).suffix.lower().removeprefix(".")
                or "unknown",
                "status": "missing",
            }

    units: dict[str, dict[str, Any]] = {}
    assets_by_hash: dict[str, dict[str, Any]] = {}
    asset_users: dict[str, list[str]] = defaultdict(list)
    asset_paths: dict[str, set[str]] = defaultdict(set)

    for rawcode in sorted(unit_data, key=str.casefold):
        unit = unit_data[rawcode]
        source_path = unit.get("icon")
        if not isinstance(source_path, str) or not source_path:
            continue
        source = located[source_path]
        units[rawcode] = {
            "name": unit.get("name", ""),
            "rawcode": rawcode,
            "sourceField": "uico",
            "sourcePath": source_path,
            "normalizedSourcePath": normalize_source_path(source_path),
            **source,
        }
        digest = source["sha256"]
        if digest:
            asset_users[digest].append(rawcode)
            asset_paths[digest].add(source_path)

    for digest in sorted(asset_users):
        first_rawcode = sorted(asset_users[digest], key=str.casefold)[0]
        source = units[first_rawcode]
        asset: dict[str, Any] = {
            "sourcePaths": sorted(asset_paths[digest], key=str.casefold),
            "origin": source["origin"],
            "archive": source["archive"],
            "sourceSize": source["sourceSize"],
            "format": source["format"],
            "usedBy": sorted(asset_users[digest], key=str.casefold),
        }
        physical_matches = source.get("anonymousPhysicalMatches")
        if physical_matches:
            asset["anonymousPhysicalMatches"] = physical_matches
        assets_by_hash[digest] = asset

    origin_counts = Counter(unit["origin"] for unit in units.values())
    status_counts = Counter(unit["status"] for unit in units.values())
    shared_assets = sum(1 for asset in assets_by_hash.values() if len(asset["usedBy"]) > 1)
    total = len(unit_data)
    with_icon = len(units)

    return {
        "mapVersion": "11.4b-beta1",
        "generatedFrom": {
            "unitData": [args.unit_data.name],
            "map": args.map.name,
            "archivePrecedence": [name for _, _, name in archives],
        },
        "summary": {
            "totalUnitRecords": total,
            "withIcon": with_icon,
            "withoutIcon": total - with_icon,
            "locatedRawcodes": sum(
                1 for unit in units.values() if unit["sha256"] is not None
            ),
            "origins": {
                key: origin_counts[key]
                for key in (
                    "map-custom",
                    "warcraft-standard",
                    "uncertain",
                    "not-found",
                    "invalid-source",
                )
            },
            "statuses": {
                key: status_counts[key]
                for key in ("located", "missing", "invalid-source", "uncertain")
            },
            "uniqueSourcePaths": len(paths),
            "uniqueAssetsBySha256": len(assets_by_hash),
            "sharedAssets": shared_assets,
        },
        "units": units,
        "assets": assets_by_hash,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Localiza os ícones de unidades do LegionHub em archives MPQ."
    )
    parser.add_argument("--unit-data", type=Path, required=True)
    parser.add_argument("--map", type=Path, required=True)
    parser.add_argument("--warcraft-dir", type=Path, required=True)
    parser.add_argument("--mpqcli", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--anonymous-extract-dir",
        type=Path,
        help="Extração anônima opcional para relacionar hashes a nomes FileNNN.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest = build_manifest(args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
