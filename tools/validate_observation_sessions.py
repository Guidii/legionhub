#!/usr/bin/env python3
"""Valida sessões observacionais do LegionHub sem modificar arquivos.

O arquivo session.schema.json é o contrato documental em JSON Schema Draft
2020-12. Este validador usa somente a biblioteca padrão e, portanto, não é
uma implementação completa desse draft. Ele aplica as invariantes estruturais
e semânticas necessárias para os arquivos de sessão da versão 1.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
CONFIDENCES = {
    "CONFIRMED_DIRECTLY",
    "USER_OBSERVED",
    "OBSERVED_REPEATED",
    "CONFIRMED_BY_GAME_OBSERVATION",
    "CONFLICTING",
    "UNDETERMINED",
}
SOURCE_TYPES = {
    "GAME_UI",
    "GAME_RESULT",
    "VIDEO_REVIEW",
    "SCREENSHOT",
    "USER_REPORT",
    "MAP_DATA",
    "DERIVED",
}
PRECISIONS = {"exact", "approximate", "display-rounded", "unknown"}
EVENT_TYPES = {
    "session-start",
    "build-unit",
    "build-unit-batch",
    "upgrade-unit",
    "buy-wisp",
    "research-lumber",
    "challenge-champion-activated",
    "roll-changed",
    "wave-start",
    "wave-ended",
    "reward-settled",
    "other",
}
ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]*$")
REQUIRED_TOP_LEVEL = {
    "schemaVersion",
    "runId",
    "map",
    "mode",
    "evidence",
    "snapshots",
    "events",
    "waves",
    "status",
}


def add_error(errors: list[str], path: str, message: str) -> None:
    errors.append(f"{path}: {message}")


def validate_id(value: Any, path: str, errors: list[str]) -> None:
    if not isinstance(value, str) or ID_PATTERN.fullmatch(value) is None:
        add_error(errors, path, "ID inválido; use lowercase, números e hífens.")


def validate_enums(node: Any, path: str, errors: list[str]) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            current = f"{path}.{key}"
            if key in {"confidence", "status"} and value not in CONFIDENCES:
                add_error(errors, current, f"confiança inválida: {value!r}")
            elif key == "sourceType" and value not in SOURCE_TYPES:
                add_error(errors, current, f"sourceType inválido: {value!r}")
            elif key == "precision":
                if value not in PRECISIONS:
                    add_error(errors, current, f"precision inválida: {value!r}")
                if value == "approximate":
                    notes = node.get("notes")
                    if not isinstance(notes, str) or not notes.strip():
                        add_error(
                            errors,
                            path,
                            "precision approximate exige notes não vazio.",
                        )
            validate_enums(value, current, errors)
    elif isinstance(node, list):
        for index, value in enumerate(node):
            validate_enums(value, f"{path}[{index}]", errors)


def collect_evidence_refs(node: Any, path: str) -> list[tuple[str, Any]]:
    refs: list[tuple[str, Any]] = []
    if isinstance(node, dict):
        for key, value in node.items():
            current = f"{path}.{key}"
            if key == "evidenceRefs":
                refs.append((current, value))
            refs.extend(collect_evidence_refs(value, current))
    elif isinstance(node, list):
        for index, value in enumerate(node):
            refs.extend(collect_evidence_refs(value, f"{path}[{index}]"))
    return refs


def validate_observed_value(node: Any, path: str, errors: list[str]) -> None:
    if node is None:
        return
    if not isinstance(node, dict):
        add_error(errors, path, "valor observado deve ser objeto ou null.")
        return
    required = {"value", "sourceType", "confidence", "precision", "evidenceRefs"}
    missing = sorted(required - node.keys())
    if missing:
        add_error(errors, path, f"campos obrigatórios ausentes: {', '.join(missing)}")


def validate_mode(mode: Any, path: str, errors: list[str]) -> None:
    if not isinstance(mode, dict):
        add_error(errors, path, "mode deve ser um objeto.")
        return
    displayed = mode.get("displayedCode")
    canonical = mode.get("canonicalCode")
    if not isinstance(displayed, str) or not isinstance(canonical, str):
        add_error(errors, path, "displayedCode e canonicalCode devem ser strings.")
        return
    normalized = displayed.strip().upper()
    if normalized.startswith("-"):
        normalized = normalized[1:]
    if normalized != canonical:
        add_error(
            errors,
            path,
            f"canonicalCode {canonical!r} contradiz displayedCode {displayed!r}.",
        )


def validate_session(data: Any, source: Path) -> list[str]:
    errors: list[str] = []
    root = source.name
    if not isinstance(data, dict):
        return [f"{root}: raiz deve ser um objeto JSON."]

    missing = sorted(REQUIRED_TOP_LEVEL - data.keys())
    if missing:
        add_error(errors, root, f"campos obrigatórios ausentes: {', '.join(missing)}")

    if data.get("schemaVersion") != SCHEMA_VERSION:
        add_error(
            errors,
            f"{root}.schemaVersion",
            f"esperado {SCHEMA_VERSION}, recebido {data.get('schemaVersion')!r}",
        )

    validate_id(data.get("runId"), f"{root}.runId", errors)
    validate_mode(data.get("mode"), f"{root}.mode", errors)

    evidence = data.get("evidence")
    evidence_ids: set[str] = set()
    if not isinstance(evidence, list):
        add_error(errors, f"{root}.evidence", "deve ser uma lista.")
    else:
        for index, item in enumerate(evidence):
            path = f"{root}.evidence[{index}]"
            if not isinstance(item, dict):
                add_error(errors, path, "deve ser um objeto.")
                continue
            evidence_id = item.get("id")
            validate_id(evidence_id, f"{path}.id", errors)
            if evidence_id in evidence_ids:
                add_error(errors, f"{path}.id", f"ID duplicado: {evidence_id!r}")
            elif isinstance(evidence_id, str):
                evidence_ids.add(evidence_id)

    all_record_ids: set[str] = set()
    for collection_name in ("snapshots", "events", "waves"):
        collection = data.get(collection_name)
        if not isinstance(collection, list):
            add_error(errors, f"{root}.{collection_name}", "deve ser uma lista.")
            continue
        for index, item in enumerate(collection):
            path = f"{root}.{collection_name}[{index}]"
            if not isinstance(item, dict):
                add_error(errors, path, "deve ser um objeto.")
                continue
            item_id = item.get("id")
            validate_id(item_id, f"{path}.id", errors)
            if item_id in all_record_ids:
                add_error(errors, f"{path}.id", f"ID de registro duplicado: {item_id!r}")
            elif isinstance(item_id, str):
                all_record_ids.add(item_id)

            if collection_name == "events" and item.get("type") not in EVENT_TYPES:
                add_error(
                    errors,
                    f"{path}.type",
                    f"tipo de evento inválido: {item.get('type')!r}",
                )

    snapshots = data.get("snapshots")
    if isinstance(snapshots, list):
        observed_fields = {
            "gameTime",
            "wave",
            "gold",
            "lumber",
            "income",
            "economyDisplay",
            "wisps",
            "lumberUpgradeLevel",
            "value",
            "roll",
            "army",
        }
        for index, snapshot in enumerate(snapshots):
            if not isinstance(snapshot, dict):
                continue
            for field in observed_fields:
                if field not in snapshot:
                    add_error(
                        errors,
                        f"{root}.snapshots[{index}]",
                        f"campo de snapshot ausente: {field}",
                    )
                else:
                    validate_observed_value(
                        snapshot[field],
                        f"{root}.snapshots[{index}].{field}",
                        errors,
                    )

    for refs_path, refs in collect_evidence_refs(data, root):
        if not isinstance(refs, list):
            add_error(errors, refs_path, "evidenceRefs deve ser uma lista.")
            continue
        if len(refs) != len(set(refs)):
            add_error(errors, refs_path, "evidenceRefs contém IDs duplicados.")
        for ref in refs:
            if ref not in evidence_ids:
                add_error(errors, refs_path, f"evidência inexistente: {ref!r}")

    validate_enums(data, root, errors)
    return errors


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    runs_dir = repo_root / "data" / "11.4b-beta1" / "observations" / "runs"
    files = sorted(runs_dir.glob("*.json"))
    if not files:
        print(f"ERRO: nenhuma sessão .json encontrada em {runs_dir}", file=sys.stderr)
        return 1

    errors: list[str] = []
    for source in files:
        try:
            data = json.loads(source.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"{source.name}: JSON inválido ou ilegível: {exc}")
            continue
        errors.extend(validate_session(data, source))

    if errors:
        for error in errors:
            print(f"ERRO: {error}", file=sys.stderr)
        print(f"Falha: {len(errors)} erro(s) em {len(files)} arquivo(s).", file=sys.stderr)
        return 1

    print(f"OK: {len(files)} sessão(ões) observacional(is) validada(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
