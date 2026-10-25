"""Offline experimental alert triage. Never suppresses or changes live findings."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import platform
import time

VERSION = 'vynlt-alert-v1'
RULES = ['HDR-001', 'HDR-002', 'HDR-003', 'CK-001', 'CK-002', 'CK-003', 'NET-001', 'JS-002']
FEATURES = ([f'rule_{rule}' for rule in RULES]
            + [f'severity_{name}' for name in ['info', 'low', 'medium', 'high', 'critical']]
            + [f'confidence_{name}' for name in ['low', 'medium', 'high']]
            + ['headers_collected', 'dom_collected', 'cookies_collected', 'https', 'cookie_count',
               'script_count', 'external_script_fraction', 'mixed_resource_fraction'])
ROW_FIELDS = {'schemaVersion', 'rulesetVersion', 'sampleId', 'siteGroup', 'scanGroup', 'label', 'provenance', 'reason', 'features'}


def validate_dataset(data):
    if set(data) != {'schemaVersion', 'featureNames', 'examples'} or data['schemaVersion'] != VERSION or data['featureNames'] != FEATURES:
        raise ValueError('Dataset schema/feature order is unsupported')
    if not isinstance(data['examples'], list) or not 1 <= len(data['examples']) <= 50000:
        raise ValueError('Expected 1..50000 examples')
    seen, scans, rulesets, provenances = set(), {}, set(), set()
    for row in data['examples']:
        if not isinstance(row, dict) or set(row) != ROW_FIELDS or row['schemaVersion'] != VERSION:
            raise ValueError('Unexpected example fields; raw data is not allowed')
        for key in ['sampleId', 'siteGroup', 'scanGroup']:
            value = row[key]
            if not isinstance(value, str) or len(value) != 64 or any(c not in '0123456789abcdef' for c in value):
                raise ValueError('Expected opaque HMAC identifiers')
        if row['sampleId'] in seen:
            raise ValueError('Duplicate sample IDs')
        seen.add(row['sampleId'])
        if row['scanGroup'] in scans and scans[row['scanGroup']] != row['siteGroup']:
            raise ValueError('A scan cannot cross application families')
        scans[row['scanGroup']] = row['siteGroup']
        if row['provenance'] not in ['synthetic', 'reviewed']:
            raise ValueError('Unsupported provenance')
        provenances.add(row['provenance'])
        reasons = {'actionable': 'security-impact-confirmed', 'contextual': 'intended-configuration', 'unreviewed': 'insufficient-evidence'}
        if row['label'] not in reasons or row['reason'] != reasons[row['label']]:
            raise ValueError('Label must have an explicit compatible adjudication reason')
        if not isinstance(row['rulesetVersion'], str) or not 1 <= len(row['rulesetVersion']) <= 30:
            raise ValueError('Invalid ruleset version')
        rulesets.add(row['rulesetVersion'])
        features = row['features']
        if not isinstance(features, dict) or set(features) != set(FEATURES):
            raise ValueError('Unexpected feature names')
        if any(type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= 1 for value in features.values()):
            raise ValueError('Features must be finite numbers in [0,1]')
        for names in [FEATURES[:8], FEATURES[8:13], FEATURES[13:16]]:
            if any(features[name] not in (0, 1) for name in names) or sum(features[name] for name in names) != 1:
                raise ValueError('Rule, severity and confidence must be one-hot encoded')
    if len(rulesets) != 1 or len(provenances) != 1:
        raise ValueError('Do not mix rulesets or synthetic/reviewed examples in one experiment')
    return data['examples']


def split_groups(rows, seed='vynlt-v1'):
    labeled = [row for row in rows if row['label'] != 'unreviewed']
    groups = sorted({row['siteGroup'] for row in labeled}, key=lambda value: hashlib.sha256((seed + ':' + value).encode()).hexdigest())
    if len(groups) < 5:
        raise ValueError('Need at least five independently grouped application families; this is a mechanical minimum, not statistical sufficiency')
    validation_size = max(1, len(groups) // 5)
    boundaries = [len(groups) - 2 * validation_size, len(groups) - validation_size]
    assignment = {group: ('train' if i < boundaries[0] else 'validation' if i < boundaries[1] else 'test') for i, group in enumerate(groups)}
    splits = {name: sorted([row for row in labeled if assignment[row['siteGroup']] == name], key=lambda row: row['sampleId']) for name in ['train', 'validation', 'test']}
    for name, values in splits.items():
        if {row['label'] for row in values} != {'actionable', 'contextual'}:
            raise ValueError(f'{name} must include both labels. Collect more independent groups; do not search seeds using test performance')
    return splits


def metrics(actual, predicted):
    tp = int(sum(a == 1 and p == 1 for a, p in zip(actual, predicted)))
    fp = int(sum(a == 0 and p == 1 for a, p in zip(actual, predicted)))
    tn = int(sum(a == 0 and p == 0 for a, p in zip(actual, predicted)))
    fn = int(sum(a == 1 and p == 0 for a, p in zip(actual, predicted)))
    ratio = lambda n, d: n / d if d else None
    precision, recall = ratio(tp, tp + fp), ratio(tp, tp + fn)
    return {'tp': tp, 'fp': fp, 'tn': tn, 'fn': fn, 'precision': precision, 'recall': recall,
            'f1': ratio(2 * tp, 2 * tp + fp + fn), 'falsePositiveRate': ratio(fp, fp + tn), 'falseNegativeRate': ratio(fn, fn + tp)}


def experiment(data, seed='vynlt-v1'):
    import numpy as np
    import sklearn
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    rows = validate_dataset(data)
    splits = split_groups(rows, seed)
    matrix = lambda values: np.array([[row['features'][name] for name in FEATURES] for row in values], dtype=float)
    labels = lambda values: np.array([int(row['label'] == 'actionable') for row in values])
    model = make_pipeline(StandardScaler(), LogisticRegression(class_weight='balanced', random_state=42, max_iter=1000))
    model.fit(matrix(splits['train']), labels(splits['train']))
    evaluation = {}
    for name in ['validation', 'test']:
        values = splits[name]
        start = time.perf_counter()
        scores = model.predict_proba(matrix(values))[:, 1]
        elapsed = (time.perf_counter() - start) * 1000
        evaluation[name] = {'examples': len(values), 'families': len({row['siteGroup'] for row in values}),
                            'logistic': metrics(labels(values), (scores >= .5).astype(int)),
                            'allAlertsActionable': metrics(labels(values), np.ones(len(values), dtype=int)),
                            'batchInferenceMs': elapsed, 'inferenceMsPerExample': elapsed / len(values)}
    scaler, classifier = model.steps[0][1], model.steps[1][1]
    artifact = {'schemaVersion': VERSION, 'kind': 'experimental-logistic', 'rulesetVersion': rows[0]['rulesetVersion'], 'featureNames': FEATURES,
                'mean': scaler.mean_.tolist(), 'scale': scaler.scale_.tolist(), 'coefficients': classifier.coef_[0].tolist(), 'intercept': float(classifier.intercept_[0]),
                'threshold': .5, 'provenance': rows[0]['provenance'], 'liveUseApproved': False}
    report = {'experimental': True, 'provenance': rows[0]['provenance'], 'seed': seed, 'threshold': .5,
              'environment': {'python': platform.python_version(), 'sklearn': sklearn.__version__, 'numpy': np.__version__},
              'trainingExamples': len(splits['train']), 'trainingFamilies': len({row['siteGroup'] for row in splits['train']}),
              'excludedUnreviewed': sum(row['label'] == 'unreviewed' for row in rows), 'evaluation': evaluation,
              'limitations': ['Synthetic metrics validate plumbing only; reviewed data is still needed for real-world claims.',
                             'Scores are uncalibrated alert-triage scores, not exploit probabilities.',
                             'Coarse metadata cannot establish JavaScript source-to-sink flow or intent.',
                             'Group assignment depends on correct human application-family identifiers.',
                             'No live finding, severity or rule score is modified. This artifact is the logistic comparator; snapshot LSTM experiments are separate.']}
    return artifact, report, {name: sorted({row['siteGroup'] for row in values}) for name, values in splits.items()}


def load_datasets(paths):
    """Merge bounded feature-only exports; global validation catches duplicate/family conflicts."""
    if sum(path.stat().st_size for path in paths) > 50 * 1024 * 1024:
        raise ValueError('Combined datasets exceed 50 MiB; use a reviewed bounded experiment')
    rows = []
    for path in paths:
        data = json.loads(path.read_text(encoding='utf-8'))
        rows.extend(validate_dataset(data))
    merged = {'schemaVersion': VERSION, 'featureNames': FEATURES, 'examples': sorted(rows, key=lambda row: row['sampleId'])}
    validate_dataset(merged)
    return merged


def main():
    parser = argparse.ArgumentParser(description='VYLNT offline experimental alert baseline')
    parser.add_argument('--dataset', required=True, nargs='+', help='One or more feature-only JSON exports, prepared with the same private dataset key')
    parser.add_argument('--output', required=True)
    parser.add_argument('--seed', default='vynlt-v1')
    args = parser.parse_args()
    data_paths, output = [Path(value).resolve() for value in args.dataset], Path(args.output).resolve()
    if any(path in [output / name for name in ['model.json', 'evaluation.json', 'split-groups.json']] for path in data_paths):
        raise ValueError('Output would overwrite the dataset')
    data = load_datasets(data_paths)
    artifact, report, groups = experiment(data, args.seed)
    report['datasetSha256'] = hashlib.sha256(json.dumps(data, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()
    report['datasetHashFormat'] = 'merged-examples-sorted-by-sampleId;python-json-sort_keys-compact-v1'
    output.mkdir(parents=True, exist_ok=True)
    for name, value in [('model.json', artifact), ('evaluation.json', report), ('split-groups.json', groups)]:
        (output / name).write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    print(f"VYLNT experimental baseline completed ({report['provenance']}); live use is disabled. See evaluation.json for limitations.")


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, TypeError, ImportError) as error:
        raise SystemExit(f'VYLNT ML: {error}') from None
