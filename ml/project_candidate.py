"""Evidence-v4 development candidate. No holdout evaluation or release promotion."""
import argparse
import copy
import hashlib
import json
import math
import platform
from importlib.metadata import version
from collections import Counter
from pathlib import Path

RULES = ['HDR-001', 'HDR-002', 'HDR-003', 'CK-001', 'CK-002', 'CK-003', 'NET-001']
POLICY = 'vylnt-project-candidate-v1'


def protocol_hash():
    return digest({name: hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest() for name in ['project_candidate.py', 'insights_v3.py', 'insights.py']})


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def read(path):
    if path.stat().st_size > 64 * 1024 * 1024:
        raise ValueError('Candidate input exceeds 64 MiB')
    return json.loads(path.read_text(encoding='utf-8'))


def save(path, value):
    with path.open('x', encoding='utf-8') as file:
        json.dump(value, file, indent=2, allow_nan=False)


def inspect(prepared, features):
    data, split, audit = [read(prepared / name) for name in ['dataset.json', 'split.json', 'audit.json']]
    preparation = read(prepared / 'registration.json')
    if preparation.get('version') != 'vylnt-project-registration-v1':
        raise ValueError('Expected a registered project preparation')
    if data.get('schemaVersion') != 'vylnt-evidence-v4' or data.get('featureNames') != features or len(set(features)) != len(features):
        raise ValueError('Incompatible feature contract')
    if audit.get('datasetHash') != digest(data) or split.get('sourceLockHash') != data.get('sourceLockHash') or split.get('version') != 'vylnt-project-development-split-v1':
        raise ValueError('Prepared dataset/split binding changed')
    assignments = split['families']
    if any(part not in ['train', 'validation'] for part in assignments.values()):
        raise ValueError('Development candidate cannot read a test partition')
    rows = data['examples']
    if len(rows) > 50000:
        raise ValueError('Example budget exceeded')
    groups = {}
    for row in rows:
        seq = row['sequence']
        if row['family'] not in assignments or row['category'] not in RULES or row['label'] not in ['change-warranted', 'contextual', 'needs-review'] or type(row['uncertain']) is not bool:
            raise ValueError('Invalid development row')
        if not 2 <= len(seq) <= 74 or any(len(step) != len(features) or any(type(n) not in [int, float] or n not in [-1, 0, 1] for n in step) for step in seq):
            raise ValueError('Invalid numeric evidence sequence')
        if row['variant'] != digest(seq):
            raise ValueError('Numeric variant changed')
        groups.setdefault(row['variant'], []).append(row)
    eligible = {'train': [], 'validation': []}
    seen = set()
    for variant, members in groups.items():
        if len({r['label'] for r in members}) != 1 or any(r['uncertain'] or r['label'] == 'needs-review' for r in members) or len({assignments[r['family']] for r in members}) != 1:
            continue
        for row in members:
            key = (row['family'], variant)
            if key not in seen:
                seen.add(key)
                eligible[assignments[row['family']]].append(row)
    deficits = []
    counts = Counter(assignments.values())
    if counts != {'train': 8, 'validation': 4}:
        deficits.append('Need exactly 8 training and 4 validation families')
    for category in RULES:
        for part, minimum in [('train', 30), ('validation', 15)]:
            for label in ['change-warranted', 'contextual']:
                selected = [r for r in eligible[part] if r['category'] == category and r['label'] == label]
                contexts, families = len({r['variant'] for r in selected}), len({r['family'] for r in selected})
                if contexts < minimum or families < 3:
                    deficits.append(f'{category}/{part}/{label}: {contexts}/{minimum} contexts, {families}/3 families')
    ready = not deficits and audit.get('ready') is True
    if not deficits and not ready:
        deficits.append('Preparation audit is not ready')
    status = {'version': POLICY, 'ready': ready, 'deficits': deficits, 'datasetHash': digest(data), 'splitHash': digest(split), 'featureHash': digest(features), 'preparationHash': digest(preparation), 'qualification': False, 'testPredictions': 0}
    return status, eligible


def register(prepared, features, output, epochs=60):
    if type(epochs) is not int or not 1 <= epochs <= 1000:
        raise ValueError('Epoch count must be 1..1000')
    status, _ = inspect(prepared, features)
    if not status['ready']:
        raise ValueError('Development data not ready: ' + '; '.join(status['deficits']))
    registration = {**status, 'trainerHash': protocol_hash(), 'epochs': epochs, 'seed': 42, 'releaseStatus': 'experimental', 'categories': RULES}
    output.mkdir(parents=True, exist_ok=False)
    save(output / 'registration.json', registration)
    save(output / 'registration-digest.json', {'sha256': digest(registration)})
    return registration


def fit(prepared, features, root):
    # Validate and bind everything before importing ML runtimes or predicting.
    status, eligible = inspect(prepared, features)
    registration = read(root / 'registration.json')
    if read(root / 'registration-digest.json') != {'sha256': digest(registration)}:
        raise ValueError('Candidate registration changed')
    if not status['ready'] or any(registration.get(key) != status[key] for key in ['version', 'datasetHash', 'splitHash', 'featureHash', 'preparationHash']) or registration.get('trainerHash') != protocol_hash():
        raise ValueError('Candidate registration/data/code changed or not ready')
    if registration.get('categories') != RULES or registration.get('seed') != 42 or type(registration.get('epochs')) is not int or not 1 <= registration['epochs'] <= 1000:
        raise ValueError('Candidate protocol changed')
    save(root / 'training-started.json', {'registrationHash': digest(registration)})
    import numpy as np
    import torch
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    from insights_v3 import load_engine
    engine = load_engine()  # Isolated namespace; historical engines/files stay unchanged.
    engine.FEATURES = features
    torch.set_num_threads(1)
    torch.manual_seed(42)
    torch.use_deterministic_algorithms(True)
    model = engine.Model()
    train, val = eligible['train'], eligible['validation']
    labels = lambda rows: torch.tensor([r['label'] == 'change-warranted' for r in rows], dtype=torch.float32)
    def weights(rows):
        counts = Counter((r['category'], r['label']) for r in rows)
        return np.array([len(rows) / (len(counts) * counts[(r['category'], r['label'])]) for r in rows])
    loss = torch.nn.BCEWithLogitsLoss(reduction='none')
    optimizer = torch.optim.Adam(model.parameters(), lr=.01)
    best, selected, selected_epoch = math.inf, None, 0
    for epoch in range(registration['epochs']):
        model.train(); optimizer.zero_grad()
        (loss(model(train), labels(train)) * torch.tensor(weights(train), dtype=torch.float32)).mean().backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1); optimizer.step(); model.eval()
        with torch.no_grad():
            value = float((loss(model(val), labels(val)) * torch.tensor(weights(val), dtype=torch.float32)).mean())
        if value < best:
            best, selected, selected_epoch = value, copy.deepcopy(model.state_dict()), epoch + 1
    model.load_state_dict(selected)
    scaler = StandardScaler().fit([engine.flatten(r) for r in train], sample_weight=weights(train))
    logistic = LogisticRegression(random_state=42, max_iter=2000).fit(scaler.transform([engine.flatten(r) for r in train]), labels(train).numpy(), sample_weight=weights(train))
    with torch.no_grad():
        logits = model(val).numpy()
    logistic_logits = logistic.decision_function(scaler.transform([engine.flatten(r) for r in val]))
    policy = {'version': POLICY, 'releaseStatus': 'experimental', 'categories': {}}
    for category in RULES:
        idx = [i for i, r in enumerate(val) if r['category'] == category]
        if not idx:  # Unsupported even in developer smoke tests.
            policy['categories'][category] = {'supported': False}; continue
        calibration, thresholds = engine.calibrate(logits[idx], labels([val[i] for i in idx]).numpy())
        lc, lt = engine.calibrate(logistic_logits[idx], labels([val[i] for i in idx]).numpy())
        policy['categories'][category] = {'supported': True, 'calibration': calibration, 'thresholds': thresholds, 'logisticCalibration': lc, 'logisticThresholds': lt}
    w = model.state_dict()
    artifact = {'schemaVersion': 'vylnt-evidence-v4', 'kind': 'evidence-lstm', 'featureNames': features, 'hiddenSize': 8, 'maxSteps': 74, 'gateOrder': 'ifgo',
                'weightInput': w['lstm.weight_ih_l0'].tolist(), 'weightHidden': w['lstm.weight_hh_l0'].tolist(), 'biasInput': w['lstm.bias_ih_l0'].tolist(), 'biasHidden': w['lstm.bias_hh_l0'].tolist(),
                'outputWeight': w['output.weight'][0].tolist(), 'outputBias': w['output.bias'][0].item(), 'calibration': {'temperature': 1}, 'thresholds': {'contextual': 0, 'change': 1},
                'releaseStatus': 'experimental', 'datasetHash': status['datasetHash'], 'splitHash': status['splitHash']}
    if len(json.dumps(artifact, indent=2).encode()) > 128 * 1024:
        raise ValueError('Model exceeds 128 KiB')
    save(root / 'model.json', artifact)
    save(root / 'logistic.json', {'mean': scaler.mean_.tolist(), 'scale': scaler.scale_.tolist(), 'weight': logistic.coef_[0].tolist(), 'bias': float(logistic.intercept_[0])})
    save(root / 'category-policy.json', policy)
    with torch.no_grad():
        cases = {}
        for category in RULES:
            for label in ['change-warranted', 'contextual']:
                for part in [train, val]:
                    matching = sorted([r for r in part if r['category'] == category and r['label'] == label], key=lambda r: len(r['sequence']))
                    for row in matching[:1] + matching[-1:]:
                        cases[digest(row['sequence'])] = row
        parity = []
        for row in cases.values():
            logit = float(model([row]))
            ll = float(logistic.decision_function(scaler.transform([engine.flatten(row)]))[0])
            entry = policy['categories'][row['category']]
            score = lambda value, key: 1 / (1 + math.exp(-max(-40, min(40, value / entry[key]['temperature']))))
            calibrated, logistic_score = score(logit, 'calibration'), score(ll, 'logisticCalibration')
            parity.append({'sequence': row['sequence'], 'category': row['category'], 'rawScore': float(torch.sigmoid(model([row]))),
                           'lstmLogit': logit, 'logisticLogit': ll, 'lstmScore': calibrated, 'logisticScore': logistic_score,
                           'lstmDecision': engine.classify_score(calibrated, entry['thresholds']),
                           'logisticDecision': engine.classify_score(logistic_score, entry['logisticThresholds'])})
    # Synthetic policy-contract cases are distinct from candidate/data examples.
    # They exercise decision boundaries even if a weak candidate abstains always.
    contract_entry = {'supported': True, 'calibration': {'temperature': 2}, 'thresholds': {'contextual': .2, 'change': .8},
                      'logisticCalibration': {'temperature': 1}, 'logisticThresholds': {'contextual': .1, 'change': .9}}
    contract_policy = {'version': POLICY, 'releaseStatus': 'experimental', 'categories': {'HDR-001': contract_entry, 'CK-002': {'supported': False}}}
    contract_cases = []
    for category, disabled in [('HDR-001', False), ('HDR-001', True), ('CK-002', False), ('JS-002', False)]:
        for logit in [-1000, -4, -2 * math.log(4), 0, 2 * math.log(4), 4, 1000]:
            def expected(logistic_case=False):
                if category != 'HDR-001':
                    return {'score': None, 'state': 'needs-review'}
                calibration = contract_entry['logisticCalibration' if logistic_case else 'calibration']
                limits = {'contextual': 0, 'change': 1} if disabled else contract_entry['logisticThresholds' if logistic_case else 'thresholds']
                score = 1 / (1 + math.exp(-max(-40, min(40, logit / calibration['temperature']))))
                return {'score': score, 'state': engine.classify_score(score, limits)}
            contract_cases.append({'category': category, 'logit': logit, 'disabled': disabled, 'lstm': expected(), 'logistic': expected(True)})
    save(root / 'parity.json', {'version': 2, 'tolerance': 1e-6, 'cases': parity, 'contractPolicy': contract_policy, 'contractCases': contract_cases})
    save(root / 'training.json', {'selectedEpoch': selected_epoch, 'validationLoss': best, 'train': len(train), 'validation': len(val), 'torch': torch.__version__, 'numpy': np.__version__, 'sklearn': version('scikit-learn'), 'python': platform.python_version(), 'testPredictions': 0, 'qualification': False})
    files = ['registration.json', 'model.json', 'logistic.json', 'category-policy.json', 'parity.json', 'training.json']
    save(root / 'candidate.json', {'version': POLICY, 'releaseStatus': 'experimental', 'files': {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in files}, 'qualification': False})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['preflight', 'register', 'fit'])
    parser.add_argument('--prepared', type=Path, required=True)
    parser.add_argument('--features', type=Path, required=True)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--epochs', type=int, default=60)
    args = parser.parse_args()
    private = Path('.local').resolve()
    for path in [args.prepared, args.features, args.output]:
        if path is not None and not path.resolve().is_relative_to(private):
            raise ValueError('Project data/candidates must stay under .local')
    features = read(args.features)
    # Acquisition outputs deliberately cannot impersonate registered preparation.
    # Explain the actual next step before reading datasets or importing ML runtimes.
    audit_path = args.prepared / 'audit.json'
    if audit_path.exists() and read(audit_path).get('version') == 'vylnt-native-seed-audit-v1':
        status = {'version': POLICY, 'ready': False, 'seedData': True, 'modelFitted': False,
                  'qualification': False, 'testPredictions': 0,
                  'deficits': ['Native seed observations are not a registered 8-training/4-validation family corpus.'] +
                    [f'{category}: requires 30 training and 15 validation examples per class, each across at least 3 families; seed observations do not meet this gate.' for category in RULES]}
        if args.action == 'preflight':
            print(json.dumps(status, indent=2))
            return 2
        raise ValueError('Native seed observations cannot be registered or fitted; complete eligible development preparation first')
    if args.action == 'preflight':
        status, _ = inspect(args.prepared, features); print(json.dumps(status, indent=2))
        return 0 if status['ready'] else 2
    if args.output is None:
        raise ValueError('--output is required')
    if args.action == 'register':
        register(args.prepared, features, args.output, args.epochs)
    else:
        fit(args.prepared, features, args.output)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
