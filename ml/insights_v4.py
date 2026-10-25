"""Category-balanced controlled candidate. Development only; no release promotion.

Uses evidence-v3 tensors. Policy 4 is separate from immutable earlier experiments.
The numeric artifact's global classifier is disabled; decisions require the bound
category-policy sidecar. Consumed/previously seen families cannot be a fresh test.
"""
import argparse
import copy
import hashlib
import json
import math
import platform
from collections import Counter
from pathlib import Path

import numpy as np
import torch
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from importlib.metadata import version
from insights_v3 import load_engine
from validation import preflight as coverage_preflight, read_json

E = load_engine()
POLICY = 'controlled-category-v4'
FILES = ['model.json', 'logistic.json', 'parity.json', 'training.json', 'category-policy.json', 'registration.json', 'decision-parity.json']


def save(path, value):
    with path.open('x', encoding='utf-8') as file:
        json.dump(value, file, indent=2, allow_nan=False)


def file_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def development(data):
    rows = E.validate(data)
    split = E.frozen_split(rows)
    conflicts = E.development_conflicts(rows, split)
    eligible = {part: [r for r in rows if split['families'][r['family']] == part
                      and r['variant'] not in conflicts and not r['uncertain']
                      and r['label'] in ['change-warranted', 'contextual']]
                for part in ['train', 'validation']}
    supported = [rule for rule in E.RULES if all(
        {r['label'] for r in eligible[part] if r['category'] == rule} == {'change-warranted', 'contextual'}
        for part in eligible)]
    return split, conflicts, eligible, supported


def readiness(data, previous):
    E.validate(previous)
    split, _, _, supported = development(data)
    coverage = coverage_preflight(E, data)
    seen = {r['family'] for r in previous['examples']}
    seen_variants = {r['variant'] for r in previous['examples']}
    test_families = {family for family, part in split['families'].items() if part == 'test'}
    test_variants = {r['variant'] for r in data['examples'] if split['families'][r['family']] == 'test'}
    fresh = bool(test_families) and not bool(test_families & seen) and not bool(test_variants & seen_variants)
    return {**coverage, 'candidatePolicy': POLICY, 'supportedCategories': supported,
            'previousDatasetHash': E.digest(previous), 'previouslySeenTestFamilies': len(test_families & seen),
            'previouslySeenTestVariants': len(test_variants & seen_variants), 'freshHoldout': fresh,
            'testMayBeEvaluated': bool(supported) and fresh
                and all(rule in coverage['readyCategories'] for rule in supported)}


def register(data, previous, output, epochs=60):
    if type(epochs) is not int or not 1 <= epochs <= 1000:
        raise ValueError('Epoch count must be 1..1000')
    ready = readiness(data, previous)
    if not ready['supportedCategories']:
        raise ValueError('No category has both eligible development classes')
    output.mkdir(parents=True, exist_ok=False)
    registration = {'version': 4, 'safetyPolicy': POLICY, 'schemaVersion': E.VERSION,
                    'datasetHash': E.digest(data), 'splitHash': ready['splitHash'],
                    'previousDatasetHash': E.digest(previous),
                    'previousFamilies': sorted({r['family'] for r in previous['examples']}),
                    'categories': ready['supportedCategories'], 'epochs': epochs, 'seed': 42,
                    'weighting': 'equal-category-and-class; mean-one; training-only',
                    'selection': 'balanced-validation-loss; per-category-validation-calibration',
                    'releaseStatus': 'experimental'}
    save(output / 'registration.json', registration)
    save(output / 'readiness.json', ready)
    return registration


def weights(rows):
    counts = Counter((r['category'], r['label']) for r in rows)
    # Every eligible category has both classes. Each category/class has equal mass.
    return np.array([len(rows) / (len(counts) * counts[(r['category'], r['label'])]) for r in rows])


def checked_registration(data, previous, root):
    registration = read_json(root / 'registration.json')
    split, conflicts, eligible, supported = development(data)
    if (registration.get('version') != 4 or registration.get('safetyPolicy') != POLICY
            or registration.get('schemaVersion') != E.VERSION or registration.get('seed') != 42
            or registration.get('datasetHash') != E.digest(data) or registration.get('splitHash') != E.digest(split)
            or registration.get('previousDatasetHash') != E.digest(previous)
            or registration.get('previousFamilies') != sorted({r['family'] for r in E.validate(previous)})
            or registration.get('categories') != supported):
        raise ValueError('Preregistered dataset, previous cohort, partitions or categories changed')
    if type(registration.get('epochs')) is not int or not 1 <= registration['epochs'] <= 1000:
        raise ValueError('Invalid frozen epoch count')
    return registration, split, conflicts, eligible


def fit(data, previous, root):
    registration, split, conflicts, eligible = checked_registration(data, previous, root)
    save(root / 'training-started.json', {'registrationHash': file_hash(root / 'registration.json')})
    supported = registration['categories']
    train, val = [[r for r in eligible[part] if r['category'] in supported] for part in ['train', 'validation']]
    torch.manual_seed(42)
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    model = E.Model()
    optimizer = torch.optim.Adam(model.parameters(), lr=.01)
    y = lambda rows: torch.tensor([r['label'] == 'change-warranted' for r in rows], dtype=torch.float32)
    loss = torch.nn.BCEWithLogitsLoss(reduction='none')
    tw, vw = [torch.tensor(weights(rows), dtype=torch.float32) for rows in [train, val]]
    best, selected, selected_epoch = math.inf, None, 0
    for epoch in range(registration['epochs']):
        model.train()
        optimizer.zero_grad()
        (loss(model(train), y(train)) * tw).mean().backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1)
        optimizer.step()
        model.eval()
        with torch.no_grad():
            value = float((loss(model(val), y(val)) * vw).mean())
        if value < best:
            best, selected, selected_epoch = value, copy.deepcopy(model.state_dict()), epoch + 1
    model.load_state_dict(selected)
    scaler = StandardScaler().fit([E.flatten(r) for r in train], sample_weight=weights(train))
    logistic = LogisticRegression(random_state=42, max_iter=2000).fit(
        scaler.transform([E.flatten(r) for r in train]), y(train).numpy(), sample_weight=weights(train))
    with torch.no_grad():
        val_logits = model(val).numpy()
    logistic_logits = logistic.decision_function(scaler.transform([E.flatten(r) for r in val]))
    policy = {'version': 1, 'safetyPolicy': POLICY, 'categories': {}}
    for rule in E.RULES:
        if rule not in supported:
            policy['categories'][rule] = {'supported': False, 'reason': 'missing-development-class'}
            continue
        idx = [i for i, r in enumerate(val) if r['category'] == rule]
        labels = y([val[i] for i in idx]).numpy()
        calibration, thresholds = E.calibrate(val_logits[idx], labels)
        lc, lt = E.calibrate(logistic_logits[idx], labels)
        policy['categories'][rule] = {'supported': True, 'calibration': calibration, 'thresholds': thresholds,
                                      'logisticCalibration': lc, 'logisticThresholds': lt,
                                      'validationCount': len(idx)}
    w = model.state_dict()
    artifact = {'schemaVersion': E.VERSION, 'kind': 'evidence-lstm', 'rulesetVersion': data['examples'][0]['rulesetVersion'],
                'featureNames': E.FEATURES, 'hiddenSize': 8, 'maxSteps': 74, 'gateOrder': 'ifgo',
                'weightInput': w['lstm.weight_ih_l0'].tolist(), 'weightHidden': w['lstm.weight_hh_l0'].tolist(),
                'biasInput': w['lstm.bias_ih_l0'].tolist(), 'biasHidden': w['lstm.bias_hh_l0'].tolist(),
                'outputWeight': w['output.weight'][0].tolist(), 'outputBias': w['output.bias'][0].item(),
                'calibration': {'temperature': 1}, 'thresholds': {'contextual': 0, 'change': 1},
                'datasetHash': E.digest(data), 'splitHash': E.digest(split), 'provenance': 'controlled',
                'releaseStatus': 'experimental', 'conflictVariants': conflicts}
    if len(json.dumps(artifact, indent=2).encode()) > 128 * 1024:
        raise ValueError('Model exceeds 128 KiB')
    save(root / 'model.json', artifact)
    save(root / 'logistic.json', {'mean': scaler.mean_.tolist(), 'scale': scaler.scale_.tolist(),
                                 'weight': logistic.coef_[0].tolist(), 'bias': float(logistic.intercept_[0])})
    save(root / 'category-policy.json', policy)
    save(root / 'split.json', split)
    save(root / 'frozen-input.json', {'datasetHash': E.digest(data), 'splitHash': E.digest(split)})
    parity_rows = {}
    for rule in supported:
        for label in ['change-warranted', 'contextual']:
            cases = sorted([r for r in train + val if r['category'] == rule and r['label'] == label], key=lambda r: (len(r['sequence']), r['variant']))
            for row in cases[:1] + cases[-1:]:
                parity_rows[row['variant']] = row
    with torch.no_grad():
        save(root / 'parity.json', {'modelHash': file_hash(root / 'model.json'), 'tolerance': 1e-6,
                                  'cases': [{'sequence': r['sequence'], 'rawScore': float(torch.sigmoid(model([r])))} for r in parity_rows.values()]})
    save(root / 'training.json', {'safetyPolicy': POLICY, 'seed': 42, 'epochs': registration['epochs'],
                                 'selectedEpoch': selected_epoch, 'validationLoss': best, 'train': len(train), 'validation': len(val),
                                 'supportedCategories': supported, 'conflictingVariants': len(conflicts), 'testEvaluated': False,
                                 'torch': torch.__version__, 'numpy': np.__version__, 'python': platform.python_version(), 'sklearn': version('scikit-learn')})
    cases = []
    for rule in E.RULES:
        for logistic_case in [False, True]:
            logits = [-40., -4., 0., 4., 40.]
            entry = policy['categories'][rule]
            if entry['supported']:
                temperature = entry['logisticCalibration' if logistic_case else 'calibration']['temperature']
                for t in entry['logisticThresholds' if logistic_case else 'thresholds'].values():
                    if 0 < t < 1:
                        boundary = math.log(t / (1 - t)) * temperature
                        logits.extend([boundary - 1e-5, boundary + 1e-5])
            for logit in logits:
                cases.append({'category': rule, 'logit': logit, 'logistic': logistic_case, 'expected': decision(logit, rule, policy, logistic_case)})
    save(root / 'decision-parity.json', {'version': 1, 'cases': cases})
    save(root / 'candidate.json', {'version': 4, 'safetyPolicy': POLICY, 'datasetHash': E.digest(data), 'splitHash': E.digest(split),
                                 'files': {name: file_hash(root / name) for name in FILES}})
    diagnostics = {}
    for rule in supported:
        idx = [i for i, row in enumerate(val) if row['category'] == rule]
        rr = [val[i] for i in idx]
        lp = [decision(float(val_logits[i]), rule, policy) for i in idx]
        bp = [decision(float(logistic_logits[i]), rule, policy, logistic=True) for i in idx]
        diagnostics[rule] = {'lstm': E.metrics(rr, lp), 'logistic': E.metrics(rr, bp)}
    save(root / 'development.json', {'scope': 'Eligible validation examples used for checkpoint/calibration selection; NOT held-out quality.',
                                    'categories': diagnostics, 'testEvaluated': False})
    return read_json(root / 'training.json')


def decision(logit, category, policy, logistic=False):
    entry = policy['categories'].get(category)
    if not entry or entry.get('supported') is not True:
        return 'needs-review'
    calibration = entry['logisticCalibration' if logistic else 'calibration']
    thresholds = entry['logisticThresholds' if logistic else 'thresholds']
    score = 1 / (1 + math.exp(-max(-40, min(40, logit / calibration['temperature']))))
    return E.classify_score(score, thresholds)


def check_candidate(data, previous, root):
    checked_registration(data, previous, root)
    candidate = read_json(root / 'candidate.json')
    split = E.frozen_split(E.validate(data))
    if (candidate.get('version') != 4 or candidate.get('safetyPolicy') != POLICY
            or candidate.get('datasetHash') != E.digest(data) or candidate.get('splitHash') != E.digest(split)
            or set(candidate.get('files', {})) != set(FILES)
            or any(candidate['files'][name] != file_hash(root / name) for name in FILES)):
        raise ValueError('Frozen category candidate changed')
    return candidate


def verified_browser_parity(root, candidate):
    result = read_json(root / 'browser-parity.json')
    fixture = read_json(root / 'parity.json')
    decisions = read_json(root / 'decision-parity.json')
    registration = read_json(root / 'registration.json')
    numeric = result.get('parity', {})
    error = numeric.get('maximumError')
    if (result.get('candidateHash') != file_hash(root / 'candidate.json')
            or result.get('modelHash') != candidate['files']['model.json']
            or result.get('datasetHash') != candidate['datasetHash']
            or result.get('splitHash') != candidate['splitHash']
            or result.get('supportedDevelopmentCategories') != registration['categories']
            or result.get('unsupportedAbstentionChecked') is not True
            or result.get('decisionParityCases') != len(decisions['cases'])
            or numeric.get('cases') != len(fixture['cases']) or numeric.get('tolerance') != 1e-6
            or type(error) not in [float, int] or not math.isfinite(error) or not 0 <= error <= 1e-6):
        raise ValueError('Executed browser parity does not match frozen candidate')
    return file_hash(root / 'browser-parity.json')


def evaluate(data, previous, root):
    candidate = check_candidate(data, previous, root)
    ready = readiness(data, previous)
    # Do not compute a single test prediction before the scope/novelty checks.
    if not ready['testMayBeEvaluated']:
        save(root / 'evaluation-blocked.json', {'status': 'blocked-before-test', 'readiness': ready, 'testConsumed': False})
        raise ValueError('Fresh independent holdout and category count/family gates are required; test was not consumed')
    parity_hash = verified_browser_parity(root, candidate)
    save(root / 'test-consumed.json', {'candidateHash': file_hash(root / 'candidate.json'),
                                     'modelHash': candidate['files']['model.json'], 'datasetHash': E.digest(data), 'browserParityHash': parity_hash})
    artifact = read_json(root / 'model.json')
    policy = read_json(root / 'category-policy.json')
    comparator = read_json(root / 'logistic.json')
    network = E.Model()
    keys = {'lstm.weight_ih_l0': 'weightInput', 'lstm.weight_hh_l0': 'weightHidden',
            'lstm.bias_ih_l0': 'biasInput', 'lstm.bias_hh_l0': 'biasHidden'}
    state = {key: torch.tensor(artifact[name]) for key, name in keys.items()}
    state.update({'output.weight': torch.tensor([artifact['outputWeight']]), 'output.bias': torch.tensor([artifact['outputBias']])})
    network.load_state_dict(state)
    network.eval()
    torch.set_num_threads(1)
    split = E.frozen_split(E.validate(data))
    rows = [r for r in data['examples'] if split['families'][r['family']] == 'test']
    with torch.no_grad():
        logits = network(rows).numpy()
    x = (np.array([E.flatten(r) for r in rows]) - comparator['mean']) / comparator['scale']
    logistic_logits = x @ comparator['weight'] + comparator['bias']
    raw = [decision(float(value), row['category'], policy) for row, value in zip(rows, logits)]
    lp = [decision(float(value), row['category'], policy, logistic=True) for row, value in zip(rows, logistic_logits)]
    safe = E.apply_safeguards(rows, raw, artifact['conflictVariants'])
    lsafe = E.apply_safeguards(rows, lp, artifact['conflictVariants'])
    categories = {}
    for rule in E.RULES:
        ids = [i for i, row in enumerate(rows) if row['category'] == rule]
        rr = [rows[i] for i in ids]
        model_only, guarded, baseline = E.metrics(rr, [raw[i] for i in ids]), E.metrics(rr, [safe[i] for i in ids]), E.metrics(rr, ['change-warranted'] * len(rr))
        counts = {label: sum(r['label'] == label for r in rr) for label in ['change-warranted', 'contextual']}
        families = {label: len({r['family'] for r in rr if r['label'] == label}) for label in counts}
        high = sum(rows[i]['label'] == 'change-warranted' and rows[i]['severity'] in ['high', 'critical'] and raw[i] == 'contextual' for i in ids)
        gates = {'supportedDevelopmentCategory': rule in ready['supportedCategories'], 'freshHoldout': ready['freshHoldout'],
                 'tenTestFamilies': ready['partitions']['test']['families'] >= 10,
                 'classCounts': all(value >= 30 for value in counts.values()), 'classFamilies': all(value >= 3 for value in families.values()),
                 'precision': (guarded['precision'] or 0) >= .9, 'recall': (guarded['recall'] or 0) >= .95,
                 'coverage': guarded['coverage'] >= .5, 'noHighCriticalContextual': high == 0,
                 'noInsufficientEvidenceDeemphasis': guarded['insufficientEvidenceContextual'] == 0,
                 'ruleComparator': (guarded['precision'] or 0) > (baseline['precision'] or 0) and (guarded['recall'] or 0) >= (baseline['recall'] or 0) - .05,
                 'controlledApplicationScope': True}
        categories[rule] = {'modelOnly': model_only, 'afterSafeguards': guarded,
                            'logistic': {'modelOnly': E.metrics(rr, [lp[i] for i in ids]), 'afterSafeguards': E.metrics(rr, [lsafe[i] for i in ids])},
                            'ruleOnly': baseline, 'classCounts': counts, 'classFamilies': families, 'highCriticalContextual': high,
                            'gates': gates, 'approved': all(gates.values()),
                            'familyUncertainty': {
                                'modelOnly': E.family_uncertainty(rr, {'lstm': [raw[i] for i in ids], 'logistic': [lp[i] for i in ids], 'ruleOnly': ['change-warranted'] * len(rr)}),
                                'afterSafeguards': E.family_uncertainty(rr, {'lstm': [safe[i] for i in ids], 'logistic': [lsafe[i] for i in ids], 'ruleOnly': ['change-warranted'] * len(rr)})}}
    result = {'evaluationVersion': 4, 'safetyPolicy': POLICY, 'datasetHash': E.digest(data), 'splitHash': E.digest(split),
              'candidateHash': file_hash(root / 'candidate.json'), 'modelHash': candidate['files']['model.json'],
              'browserParityHash': parity_hash,
              'previousDatasetHash': E.digest(previous), 'testFamilies': ready['partitions']['test']['families'],
              'provenance': 'controlled', 'releaseStatus': 'experimental', 'categories': categories,
              'limitations': ['Controlled scope only; even passing category gates does not establish real-application accuracy.',
                              'No release integration or automatic promotion. Unsupported categories always require review.']}
    save(root / 'evaluation.json', result)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['readiness', 'register', 'train', 'evaluate'])
    parser.add_argument('--dataset', required=True)
    parser.add_argument('--previous-dataset', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--epochs', type=int, default=60)
    args = parser.parse_args()
    data, previous = read_json(Path(args.dataset)), read_json(Path(args.previous_dataset))
    root = Path(args.output)
    if args.command == 'readiness':
        root.parent.mkdir(parents=True, exist_ok=True)
        save(root, readiness(data, previous))
    elif args.command == 'register':
        register(data, previous, root, args.epochs)
    elif args.command == 'train':
        print(json.dumps(fit(data, previous, root)))
    else:
        evaluate(data, previous, root)


if __name__ == '__main__':
    main()
