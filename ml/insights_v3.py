"""Isolated v3 experiment engine; retains the v2 split, optimiser and quality gates.

No active release promotion. Run with the same arguments as insights.py, after
preparing a --schema vynlt-evidence-v3 dataset. Historical v2 remains unchanged.
"""
import importlib.util
from pathlib import Path


def load_engine():
    spec = importlib.util.spec_from_file_location('vylnt_evidence_v3_engine', Path(__file__).with_name('insights.py'))
    engine = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(engine)
    engine.VERSION = 'vynlt-evidence-v3'
    engine.FEATURES = engine.FEATURES[:-8] + ['targetCspSourceExcluded'] + engine.FEATURES[-8:]
    engine.CANDIDATE_POLICY_VERSION = 3
    engine.EVALUATION_POLICY_VERSION = 3
    engine.SAFETY_POLICY = 'controlled-evidence-v3'
    engine.REQUIRED_PROVENANCE = 'controlled'
    engine.TRAINING_PROVENANCE = 'controlled'
    return engine


if __name__ == '__main__':
    load_engine().main()
