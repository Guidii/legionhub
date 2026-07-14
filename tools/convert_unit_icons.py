from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
from typing import Any

try:
    from PIL import Image
except ImportError as error:
    raise SystemExit("Pillow é obrigatório para converter BLP em WebP.") from error


WEBP_OPTIONS = {
    "lossless": True,
    "quality": 100,
    "method": 6,
    "exact": True,
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def extract_exact(
    mpqcli: Path,
    archive: Path,
    source_paths: list[str],
    expected_sha256: str,
    work_dir: Path,
) -> bytes:
    for index, source_path in enumerate(source_paths):
        attempt_dir = work_dir / f"{expected_sha256}-{index}"
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
            continue
        data = files[0].read_bytes()
        actual_sha256 = sha256_bytes(data)
        if actual_sha256 != expected_sha256:
            raise ValueError(
                f"SHA-256 divergente para {source_path}: "
                f"{actual_sha256} != {expected_sha256}"
            )
        return data
    raise FileNotFoundError(
        f"Asset {expected_sha256} não encontrado pelos caminhos registrados."
    )


def archive_paths(args: argparse.Namespace) -> dict[str, Path]:
    return {
        args.map.name: args.map,
        "War3Patch.mpq": args.warcraft_dir / "War3Patch.mpq",
        "War3x.mpq": args.warcraft_dir / "War3x.mpq",
        "war3.mpq": args.warcraft_dir / "war3.mpq",
    }


def validate_inputs(args: argparse.Namespace, archives: dict[str, Path]) -> None:
    required = [args.icon_manifest, args.mpqcli, *archives.values()]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError(f"Arquivos obrigatórios ausentes: {', '.join(missing)}")


def web_path(base_path: str, asset_sha256: str) -> str:
    return f"{base_path.rstrip('/')}/{asset_sha256}.webp"


def build_web_manifest(args: argparse.Namespace) -> dict[str, Any]:
    source_manifest: dict[str, Any] = json.loads(
        args.icon_manifest.read_text(encoding="utf-8")
    )
    archives = archive_paths(args)
    validate_inputs(args, archives)

    convertible_assets = {
        digest: asset
        for digest, asset in source_manifest["assets"].items()
        if asset["format"] == "blp"
    }
    expected_files = {f"{digest}.webp" for digest in convertible_assets}
    args.output_dir.mkdir(parents=True, exist_ok=True)
    existing_files = {path.name for path in args.output_dir.glob("*.webp")}
    unexpected_files = sorted(existing_files - expected_files)
    if unexpected_files:
        raise ValueError(
            f"WebPs órfãos no diretório de saída: {', '.join(unexpected_files)}"
        )

    converted_assets: dict[str, dict[str, Any]] = {}
    total_web_size = 0

    with tempfile.TemporaryDirectory(prefix="legionhub-unit-icon-webp-") as temporary:
        work_dir = Path(temporary)
        for digest in sorted(convertible_assets):
            asset = convertible_assets[digest]
            archive_name = asset["archive"]
            archive = archives.get(archive_name)
            if archive is None:
                raise ValueError(f"Archive não suportado no manifest: {archive_name}")

            candidate_paths = sorted(
                {
                    source_manifest["units"][rawcode]["sourcePath"]
                    for rawcode in asset["usedBy"]
                    if source_manifest["units"][rawcode]["archive"] == archive_name
                },
                key=str.casefold,
            )
            if not candidate_paths:
                candidate_paths = asset["sourcePaths"]

            original_data = extract_exact(
                args.mpqcli, archive, candidate_paths, digest, work_dir
            )
            original_path = work_dir / f"{digest}.blp"
            original_path.write_bytes(original_data)
            output_path = args.output_dir / f"{digest}.webp"

            with Image.open(original_path) as original:
                original.load()
                original_size = original.size
                original_mode = original.mode
                original_rgba = original.convert("RGBA").tobytes()
                original.save(output_path, format="WEBP", **WEBP_OPTIONS)

            with Image.open(output_path) as converted:
                converted.load()
                if converted.format != "WEBP":
                    raise ValueError(f"Formato inválido em {output_path.name}")
                if converted.size != original_size:
                    raise ValueError(f"Dimensão alterada em {output_path.name}")
                if converted.convert("RGBA").tobytes() != original_rgba:
                    raise ValueError(f"Pixels divergentes em {output_path.name}")
                converted_mode = converted.mode

            web_data = output_path.read_bytes()
            total_web_size += len(web_data)
            converted_assets[digest] = {
                "sourcePaths": asset["sourcePaths"],
                "origin": asset["origin"],
                "archive": archive_name,
                "usedBy": asset["usedBy"],
                "width": original_size[0],
                "height": original_size[1],
                "originalMode": original_mode,
                "webMode": converted_mode,
                "webPath": web_path(args.web_base_path, digest),
                "webSize": len(web_data),
                "webSha256": sha256_bytes(web_data),
                "status": "converted",
            }

    ignored_assets: dict[str, dict[str, Any]] = {}
    for digest in sorted(set(source_manifest["assets"]) - set(convertible_assets)):
        asset = source_manifest["assets"][digest]
        ignored_assets[digest] = {
            "sourcePaths": asset["sourcePaths"],
            "origin": asset["origin"],
            "archive": asset["archive"],
            "usedBy": asset["usedBy"],
            "format": asset["format"],
            "webPath": None,
            "status": "invalid-source",
        }

    units: dict[str, dict[str, Any]] = {}
    mapped_rawcodes = 0
    for rawcode in sorted(source_manifest["units"], key=str.casefold):
        source_unit = source_manifest["units"][rawcode]
        digest = source_unit["sha256"]
        if source_unit["status"] == "located" and digest in converted_assets:
            status = "available"
            unit_web_path: str | None = converted_assets[digest]["webPath"]
            mapped_rawcodes += 1
        else:
            status = source_unit["status"]
            unit_web_path = None
        units[rawcode] = {
            "name": source_unit["name"],
            "rawcode": rawcode,
            "assetSha256": digest,
            "webPath": unit_web_path,
            "status": status,
        }

    actual_files = {path.name for path in args.output_dir.glob("*.webp")}
    if actual_files != expected_files:
        missing = sorted(expected_files - actual_files)
        extra = sorted(actual_files - expected_files)
        raise ValueError(f"Conjunto de WebPs inválido; ausentes={missing}, extras={extra}")
    for unit in units.values():
        if unit["webPath"] is None:
            continue
        filename = Path(unit["webPath"]).name
        if filename not in actual_files:
            raise ValueError(f"Rawcode aponta para WebP inexistente: {unit['rawcode']}")

    all_assets = {**converted_assets, **ignored_assets}
    all_assets = {digest: all_assets[digest] for digest in sorted(all_assets)}
    shared_assets = sum(
        1 for asset in converted_assets.values() if len(asset["usedBy"]) > 1
    )

    return {
        "mapVersion": source_manifest["mapVersion"],
        "generatedFrom": {
            "iconManifest": args.icon_manifest.name,
            "map": args.map.name,
            "conversion": {
                "format": "webp",
                **WEBP_OPTIONS,
                "filenameSource": "original-blp-sha256",
            },
        },
        "summary": {
            "sourceRawcodes": len(source_manifest["units"]),
            "mappedRawcodes": mapped_rawcodes,
            "rawcodesWithoutWebAsset": len(source_manifest["units"])
            - mapped_rawcodes,
            "sourceAssetsBySha256": len(source_manifest["assets"]),
            "convertedAssets": len(converted_assets),
            "ignoredAssets": len(ignored_assets),
            "sharedConvertedAssets": shared_assets,
            "webpFiles": len(actual_files),
            "totalWebpSize": total_web_size,
        },
        "units": units,
        "assets": all_assets,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Converte os ícones BLP únicos do LegionHub para WebP lossless."
    )
    parser.add_argument("--icon-manifest", type=Path, required=True)
    parser.add_argument("--map", type=Path, required=True)
    parser.add_argument("--warcraft-dir", type=Path, required=True)
    parser.add_argument("--mpqcli", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--manifest-output", type=Path, required=True)
    parser.add_argument(
        "--web-base-path",
        default="/assets/11.4b-beta1/unit-icons",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    manifest = build_web_manifest(args)
    args.manifest_output.parent.mkdir(parents=True, exist_ok=True)
    args.manifest_output.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
