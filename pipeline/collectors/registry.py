"""Collector registry — maps jurisdiction IDs to collector classes."""

from __future__ import annotations

import importlib
import logging

from pipeline.collectors.base import BaseCollector

log = logging.getLogger(__name__)

# Lazy mapping: jurisdiction_id -> (module_path, class_name)
_COLLECTOR_MAP: dict[str, tuple[str, str]] = {
    "us_ftc": ("pipeline.collectors.ftc", "FTCCollector"),
    "uk_ico": ("pipeline.collectors.ico", "ICOCollector"),
    "sg_pdpc": ("pipeline.collectors.pdpc", "PDPCCollector"),
    "au_oaic": ("pipeline.collectors.oaic", "OAICCollector"),
    "eu_gdpr": ("pipeline.collectors.gdpr", "GDPRCollector"),
    "eu_edpb": ("pipeline.collectors.edpb", "EDPBCollector"),
    "us_ca_doj": ("pipeline.collectors.california_doj", "CaliforniaDOJCollector"),
}


def get_collector(jurisdiction_id: str, config: dict | None = None) -> BaseCollector:
    """Instantiate the correct collector for a jurisdiction."""
    if jurisdiction_id not in _COLLECTOR_MAP:
        raise ValueError(
            f"No collector registered for jurisdiction '{jurisdiction_id}'. "
            f"Available: {sorted(_COLLECTOR_MAP)}"
        )

    module_path, class_name = _COLLECTOR_MAP[jurisdiction_id]
    try:
        module = importlib.import_module(module_path)
    except ImportError as e:
        raise ImportError(
            f"Collector module '{module_path}' not found for '{jurisdiction_id}': {e}"
        ) from e

    cls = getattr(module, class_name)
    return cls(jurisdiction_id, config or {})


def list_registered() -> list[str]:
    """Return all registered jurisdiction IDs."""
    return sorted(_COLLECTOR_MAP)
