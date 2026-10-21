"""Developer-owned evidence-v2 experiments. No user scan training or release approval.

Train/validation select weights, calibration and thresholds. `evaluate` consumes the
frozen test once per candidate directory; failed gates are written, never hidden.
"""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.nn.utils.rnn import pack_padded_sequence, pad_sequence
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

VERSION = 'vynlt-evidence-v2'
RULES = ['HDR-001', 'HDR-002', 'HDR-003', 'CK-001', 'CK-002', 'CK-003', 'NET-001', 'JS-002']
FEATURES = ['coverage', 'resource', 'script', 'cookie', 'target', 'headersCollected', 'domCollected', 'cookiesCollected', 'contextCapped', 'https', 'external', 'secure', 'httpOnly', 'session', 'sameSiteNone', 'sameSiteLax', 'sameSiteStrict', 'integrity', 'module', 'async', 'defer', 'completed', 'failed', 'requested', 'referenced', 'scriptResource', 'imageResource', 'frameResource', 'styleResource', 'hstsPositive', 'hstsPresent', 'cspPresent', 'scriptDirective', 'broadScriptSource', 'frameAncestors', 'xFrameRestrictive', 'matchingUnknown'] + ['rule_' + r for r in RULES]


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def validate(data):
    if data.get('schemaVersion') != VERSION or data.get('featureNames') != FEATURES:
        raise ValueError('Incompatible evidence schema')
    rows = data.get('examples')
    if not isinstance(rows, list) or not 1 <= len(rows) <= 50000:
        raise ValueError('Expected 1..50000 distinct context examples')
    required = {'family', 'variant', 'sequence', 'category', 'severity', 'label', 'provenance', 'evidenceRecord', 'rulesetVersion', 'uncertain'}
    seen = set()
    for row in rows:
        if set(row) != required or row['category'] not in RULES or row['label'] not in ['change-warranted', 'contextual', 'needs-review'] or row['provenance'] not in ['controlled', 'human-reviewed']:
            raise ValueError('Invalid example/provenance')
        if type(row['uncertain']) is not bool or row['severity'] not in ['critical', 'high', 'medium', 'low', 'info']:
            raise ValueError('Invalid safety metadata')
        if any(not isinstance(row[k], str) or len(row[k]) != 64 or any(c not in '0123456789abcdef' for c in row[k]) for k in ['family', 'variant', 'evidenceRecord']):
            raise ValueError('Expected opaque evidence identities')
        seq = row['sequence']
        if not isinstance(seq, list) or not 2 <= len(seq) <= 74 or any(len(t) != len(FEATURES) or any(type(v) not in (float, int) or v not in [-1, 0, 1] for v in t) for t in seq):
            raise ValueError('Invalid bounded numeric sequence')
        if digest(seq) != row['variant']:
            raise ValueError('Variant hash mismatch')
        kinds = [next((i for i, value in enumerate(t[:5]) if value == 1), -1) for t in seq]
        if any(sum(v == 1 for v in t[:5]) != 1 for t in seq) or kinds != sorted(kinds) or kinds.count(0) != 1 or kinds.count(4) != 1 or any(kinds.count(k) > 24 for k in [1, 2, 3]):
            raise ValueError('Invalid structural snapshot order')
        target = seq[-1][-8:]
        if target != [1 if r == row['category'] else -1 for r in RULES]:
            raise ValueError('Target category mismatch')
        key = (row['family'], row['variant'], row['label'])
        if key in seen:
            raise ValueError('Repeated resources are not independent examples')
        seen.add(key)
    if len({r['rulesetVersion'] for r in rows}) != 1 or len({r['provenance'] for r in rows}) != 1:
        raise ValueError('Evaluate provenance cohorts and rulesets separately')
    return rows


def frozen_split(rows):
    # Related families AND identical model inputs must not cross partitions.
    parent = {r['family']: r['family'] for r in rows}
    def root(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    variants = {}
    labels = {}
    for r in rows:
        other = variants.setdefault(r['variant'], r['family'])
        a, b = sorted([root(other), root(r['family'])])
        parent[b] = a
        labels.setdefault(r['variant'], set()).add(r['label'])
    conflicts = sorted(k for k, v in labels.items() if len(v) > 1 or 'needs-review' in v)
    parts = {}
    for family in sorted(parent):
        n = int(hashlib.sha256(('vynlt-v2-split:' + root(family)).encode()).hexdigest()[:8], 16) % 10
        parts[family] = 'train' if n < 6 else 'validation' if n < 8 else 'test'
    return {'version': 1, 'families': parts, 'conflicts': conflicts, 'policy': 'family-and-identical-input-components; fixed hash seed v2'}


class Model(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(len(FEATURES), 8, batch_first=True)
        self.output = nn.Linear(8, 1)

    def forward(self, rows):
        seq = [torch.tensor(r['sequence'], dtype=torch.float32) for r in rows]
        packed = pack_padded_sequence(pad_sequence(seq, batch_first=True), torch.tensor([len(s) for s in seq]), batch_first=True, enforce_sorted=False)
        _, (hidden, _) = self.lstm(packed)
        return self.output(hidden[-1]).squeeze(-1)


def flatten(row):
    # Same complete ordered tensor information and length as the LSTM.
    return np.array(sum(row['sequence'], []) + [-1] * ((74 - len(row['sequence'])) * len(FEATURES)) + [len(row['sequence']) / 74])


def calibrate(logits, labels):
    temperatures = [.25, .5, .75, 1, 1.5, 2, 4, 8]
    temp = min(temperatures, key=lambda t: float(np.mean(np.logaddexp(0, logits / t) - labels * logits / t)))
    scores = 1 / (1 + np.exp(-np.clip(logits / temp, -40, 40)))
    # Validation only. Prefer coverage subject to conservative precision/recall.
    choices = []
    for low in [.05, .1, .2, .3, .4]:
        for high in [.6, .7, .8, .9, .95]:
            positive, contextual = scores >= high, scores <= low
            tp, fp = int(sum(positive & (labels == 1))), int(sum(positive & (labels == 0)))
            precision = tp / (tp + fp) if tp + fp else 0
            recall = tp / sum(labels) if sum(labels) else 0
            if precision >= .9 and recall >= .95 and not any(contextual & (labels == 1)):
                choices.append((int(sum(positive | contextual)), low, high))
    _, low, high = max(choices, default=(0, 0., 1.))
    return {'temperature': temp}, {'contextual': low, 'change': high}


def fit(data, output, epochs=60):
    rows = validate(data)
    split = frozen_split(rows)
    output.mkdir(parents=True, exist_ok=False)
    (output / 'split.json').write_text(json.dumps(split, indent=2), encoding='utf-8')
    (output / 'frozen-input.json').write_text(json.dumps({'datasetHash': digest(data), 'splitHash': digest(split)}), encoding='utf-8')
    usable = lambda part: [r for r in rows if split['families'][r['family']] == part and r['variant'] not in split['conflicts'] and not r['uncertain']]
    train, val = usable('train'), usable('validation')
    if any({r['label'] for r in part} != {'change-warranted', 'contextual'} for part in [train, val]):
        raise ValueError('Train and validation need both classes after conflict/uncertainty audit; collect distinguishable independent application families')
    torch.manual_seed(42)
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    model = Model()
    optimizer = torch.optim.Adam(model.parameters(), lr=.01)
    y = lambda part: torch.tensor([r['label'] == 'change-warranted' for r in part], dtype=torch.float32)
    loss = nn.BCEWithLogitsLoss()
    best, selected, selected_epoch = math.inf, None, 0
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        loss(model(train), y(train)).backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1)
        optimizer.step()
        model.eval()
        with torch.no_grad():
            value = loss(model(val), y(val)).item()
        if value < best:
            best, selected, selected_epoch = value, copy.deepcopy(model.state_dict()), epoch + 1
    model.load_state_dict(selected)
    with torch.no_grad():
        calibration, thresholds = calibrate(model(val).numpy(), y(val).numpy())
    scaler = StandardScaler().fit([flatten(r) for r in train])
    logistic = LogisticRegression(random_state=42, max_iter=2000).fit(scaler.transform([flatten(r) for r in train]), y(train).numpy())
    lc, lt = calibrate(logistic.decision_function(scaler.transform([flatten(r) for r in val])), y(val).numpy())
    w = model.state_dict()
    artifact = {'schemaVersion': VERSION, 'kind': 'evidence-lstm', 'rulesetVersion': rows[0]['rulesetVersion'], 'featureNames': FEATURES, 'hiddenSize': 8, 'maxSteps': 74, 'gateOrder': 'ifgo',
                'weightInput': w['lstm.weight_ih_l0'].tolist(), 'weightHidden': w['lstm.weight_hh_l0'].tolist(), 'biasInput': w['lstm.bias_ih_l0'].tolist(), 'biasHidden': w['lstm.bias_hh_l0'].tolist(), 'outputWeight': w['output.weight'][0].tolist(), 'outputBias': w['output.bias'][0].item(),
                'calibration': calibration, 'thresholds': thresholds, 'datasetHash': digest(data), 'splitHash': digest(split), 'provenance': rows[0]['provenance'], 'releaseStatus': 'experimental', 'conflictVariants': split['conflicts']}
    if len(json.dumps(artifact, indent=2).encode()) > 128 * 1024:
        raise ValueError('Model exceeds 128 KiB; conflict audit cannot be silently truncated')
    def save(name, value):
        (output / name).write_text(json.dumps(value, indent=2), encoding='utf-8')
    save('model.json', artifact)
    save('split.json', split)
    save('logistic.json', {'mean': scaler.mean_.tolist(), 'scale': scaler.scale_.tolist(), 'weight': logistic.coef_[0].tolist(), 'bias': logistic.intercept_[0], 'calibration': lc, 'thresholds': lt})
    with torch.no_grad():
        save('parity.json', {'modelHash': digest(artifact), 'tolerance': 1e-6, 'cases': [{'sequence': r['sequence'], 'rawScore': torch.sigmoid(model([r])).item()} for r in [train[0], val[-1]]]})
    save('training.json', {'seed': 42, 'epochs': epochs, 'selectedEpoch': selected_epoch, 'validationLoss': best, 'conflictingVariants': len(split['conflicts']), 'train': len(train), 'validation': len(val), 'testEvaluated': False, 'torch': torch.__version__, 'numpy': np.__version__})


def wilson(successes, total):
    if not total:
        return None
    p, z = successes / total, 1.959963984540054
    center = (p + z * z / (2 * total)) / (1 + z * z / total)
    half = z * math.sqrt(p * (1 - p) / total + z * z / (4 * total * total)) / (1 + z * z / total)
    return [max(0, center - half), min(1, center + half)]


def metrics(rows, predictions):
    positive = [r['label'] == 'change-warranted' for r in rows]
    tp = sum(y and p == 'change-warranted' for y, p in zip(positive, predictions))
    fp = sum(not y and p == 'change-warranted' for y, p in zip(positive, predictions))
    known = sum(p != 'needs-review' for p in predictions)
    return {'precision': tp / (tp + fp) if tp + fp else None, 'recall': tp / sum(positive) if any(positive) else None, 'coverage': known / len(rows) if rows else 0,
            'contextualMisclassification': sum(y and p == 'contextual' for y, p in zip(positive, predictions)),
            'precision95': wilson(tp, tp + fp), 'recall95': wilson(tp, sum(positive)), 'coverage95': wilson(known, len(rows)),
            'uncertainExamples': sum(r['label'] == 'needs-review' for r in rows), 'sampleCount': len(rows)}


def evaluate(data, output):
    rows = validate(data)
    artifact = json.loads((output / 'model.json').read_text())
    split = json.loads((output / 'split.json').read_text())
    if digest(data) != artifact['datasetHash'] or digest(split) != artifact['splitHash'] or split != frozen_split(rows):
        raise ValueError('Frozen dataset/split mismatch')
    # An exclusive marker prevents threshold/checkpoint searches against this candidate test set.
    with (output / 'test-consumed.json').open('x') as file:
        json.dump({'modelHash': digest(artifact), 'datasetHash': digest(data)}, file)
    model = Model()
    model.load_state_dict({k: torch.tensor(artifact[name]) for k, name in [('lstm.weight_ih_l0', 'weightInput'), ('lstm.weight_hh_l0', 'weightHidden'), ('lstm.bias_ih_l0', 'biasInput'), ('lstm.bias_hh_l0', 'biasHidden'), ('output.weight', 'outputWeight'), ('output.bias', 'outputBias')] if k not in ['output.weight', 'output.bias']} | {'output.weight': torch.tensor([artifact['outputWeight']]), 'output.bias': torch.tensor([artifact['outputBias']])})
    model.eval()
    test = [r for r in rows if split['families'][r['family']] == 'test']
    if not test:
        raise ValueError('Frozen test partition is empty; candidate failed')
    logistic = json.loads((output / 'logistic.json').read_text())
    classify = lambda score, thresholds: 'change-warranted' if score >= thresholds['change'] else 'contextual' if score <= thresholds['contextual'] else 'needs-review'
    with torch.no_grad():
        scores = torch.sigmoid(model(test) / artifact['calibration']['temperature']).numpy()
    pred = [classify(float(s), artifact['thresholds']) for s in scores]
    guarded = ['needs-review' if r['uncertain'] or r['variant'] in split['conflicts'] or (r['severity'] in ['high', 'critical'] and p == 'contextual') else p for r, p in zip(test, pred)]
    lx = (np.array([flatten(r) for r in test]) - logistic['mean']) / logistic['scale']
    ls = 1 / (1 + np.exp(-np.clip((lx @ logistic['weight'] + logistic['bias']) / logistic['calibration']['temperature'], -40, 40)))
    lp = [classify(float(s), logistic['thresholds']) for s in ls]
    categories = {}
    families = len({r['family'] for r in test})
    for rule in RULES:
        idx = [i for i, r in enumerate(test) if r['category'] == rule]
        rr = [test[i] for i in idx]
        raw, safe = metrics(rr, [pred[i] for i in idx]), metrics(rr, [guarded[i] for i in idx])
        comparator = metrics(rr, ['change-warranted'] * len(rr))
        labels = {label: [r for r in rr if r['label'] == label] for label in ['change-warranted', 'contextual']}
        gates = {'tenTestFamilies': families >= 10, 'classCounts': all(len(v) >= 30 for v in labels.values()), 'classFamilies': all(len({r['family'] for r in v}) >= 3 for v in labels.values()),
                 'precision': (safe['precision'] or 0) >= .9, 'recall': (safe['recall'] or 0) >= .95, 'coverage': safe['coverage'] >= .5,
                 'noHighCriticalContextual': not any(test[i]['label'] == 'change-warranted' and test[i]['severity'] in ['high', 'critical'] and pred[i] == 'contextual' for i in idx),
                 'ruleComparator': (safe['precision'] or 0) > (comparator['precision'] or 0) and (safe['recall'] or 0) >= (comparator['recall'] or 0) - .05,
                 'reviewedApplicationScope': artifact['provenance'] == 'human-reviewed'}
        logistic_guarded = ['needs-review' if test[i]['uncertain'] or test[i]['variant'] in split['conflicts'] or (test[i]['severity'] in ['high', 'critical'] and lp[i] == 'contextual') else lp[i] for i in idx]
        categories[rule] = {'modelOnly': raw, 'afterSafeguards': safe, 'logistic': {'modelOnly': metrics(rr, [lp[i] for i in idx]), 'afterSafeguards': metrics(rr, logistic_guarded)}, 'ruleOnly': comparator, 'gates': gates, 'approved': all(gates.values()), 'classCounts': {k: len(v) for k, v in labels.items()}, 'classFamilies': {k: len({r['family'] for r in v}) for k, v in labels.items()}, 'highCriticalContextual': sum(test[i]['label'] == 'change-warranted' and test[i]['severity'] in ['high', 'critical'] and pred[i] == 'contextual' for i in idx)}
    report = {'modelHash': hashlib.sha256((output / 'model.json').read_bytes()).hexdigest(), 'datasetHash': digest(data), 'splitHash': digest(split), 'provenance': artifact['provenance'], 'testFamilies': families, 'scope': 'Only the frozen developer evidence cohort; no universal accuracy claim', 'categories': categories, 'releaseStatus': 'experimental', 'limitations': ['Review provenance declarations independently. This tool cannot attest human review.', 'Wilson intervals assume independent examples; related within-family contexts can reduce effective sample size.']}
    (output / 'evaluation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['audit', 'train', 'evaluate'])
    parser.add_argument('--dataset', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--epochs', type=int, default=60)
    args = parser.parse_args()
    path = Path(args.dataset)
    if path.stat().st_size > 64 * 1024 * 1024:
        raise ValueError('Dataset exceeds 64 MiB')
    dataset = json.loads(path.read_text(encoding='utf-8'))
    if args.command == 'audit':
        result = frozen_split(validate(dataset))
        target = Path(args.output)
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open('x') as file:
            json.dump(result, file, indent=2)
    elif args.command == 'train':
        if not 1 <= args.epochs <= 1000:
            raise ValueError('Epoch count must be 1..1000')
        try:
            fit(dataset, Path(args.output), args.epochs)
        except ValueError as error:
            target = Path(args.output)
            target.mkdir(parents=True, exist_ok=True)
            with (target / 'failure.json').open('x') as file:
                json.dump({'releaseStatus': 'failed', 'reason': str(error), 'datasetHash': digest(dataset)}, file, indent=2)
            raise
    else:
        print(json.dumps(evaluate(dataset, Path(args.output)), indent=2))
