"""Developer-owned evidence-v2 experiments. No user scan training or release approval.

Train/validation select weights, calibration and thresholds. `evaluate` consumes the
frozen test once per candidate directory; failed gates are written, never hidden.
"""
import argparse
import copy
import hashlib
import json
import math
import platform
from importlib.metadata import version as package_version
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.nn.utils.rnn import pack_padded_sequence, pad_sequence
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

VERSION = 'vynlt-evidence-v2'
CANDIDATE_POLICY_VERSION = 2
EVALUATION_POLICY_VERSION = 2
SAFETY_POLICY = 'development-only-v2'
REQUIRED_PROVENANCE = 'human-reviewed'
TRAINING_PROVENANCE = None
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
    if TRAINING_PROVENANCE and rows[0]['provenance'] != TRAINING_PROVENANCE:
        raise ValueError('This experiment policy requires controlled provenance')
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


def development_conflicts(rows, split):
    """Never learn a safety policy from held-out labels, including unknown labels."""
    labels = {}
    for row in rows:
        if split['families'][row['family']] in ['train', 'validation']:
            labels.setdefault(row['variant'], set()).add(row['label'])
    return sorted(key for key, values in labels.items() if len(values) > 1 or 'needs-review' in values)


def classify_score(score, thresholds):
    # 0/1 is the explicit disabled policy; float sigmoid saturation cannot enable it.
    if thresholds == {'contextual': 0, 'change': 1}:
        return 'needs-review'
    return 'change-warranted' if score >= thresholds['change'] else 'contextual' if score <= thresholds['contextual'] else 'needs-review'


def apply_safeguards(rows, predictions, conflicts):
    # Only observable uncertainty, known development conflicts and original severity.
    # Ground-truth test labels must never be inspected here.
    return ['needs-review' if r['uncertain'] or r['variant'] in conflicts or (r['severity'] in ['high', 'critical'] and p == 'contextual') else p for r, p in zip(rows, predictions)]


def data_readiness(data):
    """Coverage diagnostics, never a model qualification or threshold-selection input."""
    rows = validate(data)
    split = frozen_split(rows)
    known = development_conflicts(rows, split)
    parts = {}
    categories = {}
    for part in ['train', 'validation', 'test']:
        rr = [r for r in rows if split['families'][r['family']] == part]
        eligible = [r for r in rr if r['variant'] not in known and not r['uncertain'] and r['label'] in ['change-warranted', 'contextual']]
        parts[part] = {'examples': len(rr), 'families': len({r['family'] for r in rr}), 'eligibleBinaryExamples': len(eligible),
                       'bothTrainingClasses': {r['label'] for r in eligible} == {'change-warranted', 'contextual'}}
    for category in RULES:
        test = [r for r in rows if r['category'] == category and split['families'][r['family']] == 'test']
        counts = {label: len([r for r in test if r['label'] == label]) for label in ['change-warranted', 'contextual', 'needs-review']}
        families = {label: len({r['family'] for r in test if r['label'] == label}) for label in ['change-warranted', 'contextual']}
        categories[category] = {'testCounts': counts, 'testClassFamilies': families,
                                'countAndFamilyGates': all(counts[k] >= 30 and families[k] >= 3 for k in families)}
    return {'version': 2, 'datasetHash': digest(data), 'splitHash': digest(split), 'provenance': rows[0]['provenance'],
            'families': len(split['families']), 'uniqueInputVariants': len({r['variant'] for r in rows}),
            'auditedConflictVariants': len(split['conflicts']), 'developmentConflictVariants': len(known), 'partitions': parts, 'categories': categories,
            'fitReady': parts['train']['bothTrainingClasses'] and parts['validation']['bothTrainingClasses'],
            'reviewedApplicationData': rows[0]['provenance'] == 'human-reviewed', 'tenTestFamilies': parts['test']['families'] >= 10,
            'limitations': ['Coverage diagnostics are not measured model quality or proof of independent review.', 'Shared application/templates must use one actual family; rule categories and renamed variants are not application families.']}


def collection_plan(data):
    """Developer collection brief. Never changes labels, seeds or frozen assignments."""
    rows = validate(data)
    split = frozen_split(rows)
    readiness = data_readiness(data)
    known_conflicts = set(development_conflicts(rows, split))
    # Transitive shared-input links can merge apparently different families.
    remaining = {r['family']: {r['family']} for r in rows}
    owner = {f: f for f in remaining}
    variants = {}
    for row in rows:
        previous = variants.setdefault(row['variant'], row['family'])
        a, b = owner[previous], owner[row['family']]
        if a != b:
            # Small-to-large merging keeps the diagnostics bounded for large corpora.
            if len(remaining[a]) < len(remaining[b]):
                a, b = b, a
            for f in remaining[b]:
                owner[f] = a
            remaining[a].update(remaining.pop(b))
    components = []
    for group in remaining.values():
        members = sorted(group)
        components.append({'families': members, 'familyCount': len(members), 'partition': split['families'][members[0]]})
    components.sort(key=lambda c: c['families'])
    by_variant = {}
    for row in rows:
        by_variant.setdefault(row['variant'], []).append(row)
    collisions = []
    for variant, group in sorted(by_variant.items()):
        labels = sorted({r['label'] for r in group})
        if len(labels) > 1 or 'needs-review' in labels:
            collisions.append({'variant': variant, 'category': group[0]['category'], 'labels': labels,
                               'families': len({r['family'] for r in group}), 'examples': len(group),
                               'resolution': 'Retain abstention; independently verify whether distinguishing context is observable. Do not force a binary label.'})
    categories = {}
    for rule in RULES:
        rr = [r for r in rows if r['category'] == rule]
        coverage = readiness['categories'][rule]
        development = {}
        for part in ['train', 'validation']:
            eligible = [r for r in rr if split['families'][r['family']] == part and not r['uncertain'] and r['variant'] not in known_conflicts]
            development[part] = {label: len([r for r in eligible if r['label'] == label]) for label in ['change-warranted', 'contextual']}
        eligible_review = readiness['reviewedApplicationData']
        categories[rule] = {'observedExamples': len(rr), 'unknownEvidenceExamples': sum(r['uncertain'] for r in rr),
                            'developmentClasses': development,
                            'testDeficits': {label: {'examples': max(0, 30 - (coverage['testCounts'][label] if eligible_review else 0)),
                                                    'classFamilies': max(0, 3 - (coverage['testClassFamilies'][label] if eligible_review else 0))}
                                             for label in ['change-warranted', 'contextual']}}
    return {'version': 1, 'datasetHash': readiness['datasetHash'], 'splitHash': readiness['splitHash'],
            'provenance': readiness['provenance'], 'fitReady': readiness['fitReady'],
            'independentInputComponents': len(components), 'components': components,
            'observedTestFamilies': readiness['partitions']['test']['families'],
            'testFamilyDeficit': max(0, 10 - (readiness['partitions']['test']['families'] if readiness['reviewedApplicationData'] else 0)),
            'reviewedApplicationDataMissing': not readiness['reviewedApplicationData'],
            'categories': categories, 'unobservableConflicts': collisions,
            'instructions': ['Collect only authorised minimal scan metadata; keep application configuration evidence private.',
                             'One application/template is one family. Equivalent inputs connect families transitively; more pages need not produce more independent partitions.',
                             'Obtain two independent review declarations per application target. Controlled fixtures remain controlled.',
                             'Do not change family names, split seeds or labels to fill these deficits. Never choose model parameters from test diagnostics.',
                             'Deficits are count minima, not a promise that additional samples will qualify a model.']}


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
    known_conflicts = development_conflicts(rows, split)
    output.mkdir(parents=True, exist_ok=False)
    (output / 'split.json').write_text(json.dumps(split, indent=2), encoding='utf-8')
    (output / 'frozen-input.json').write_text(json.dumps({'datasetHash': digest(data), 'splitHash': digest(split)}), encoding='utf-8')
    usable = lambda part: [r for r in rows if split['families'][r['family']] == part and r['variant'] not in known_conflicts and not r['uncertain']]
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
                'calibration': calibration, 'thresholds': thresholds, 'datasetHash': digest(data), 'splitHash': digest(split), 'provenance': rows[0]['provenance'], 'releaseStatus': 'experimental', 'conflictVariants': known_conflicts}
    if len(json.dumps(artifact, indent=2).encode()) > 128 * 1024:
        raise ValueError('Model exceeds 128 KiB; conflict audit cannot be silently truncated')
    def save(name, value):
        (output / name).write_text(json.dumps(value, indent=2), encoding='utf-8')
    save('model.json', artifact)
    save('split.json', split)
    save('logistic.json', {'mean': scaler.mean_.tolist(), 'scale': scaler.scale_.tolist(), 'weight': logistic.coef_[0].tolist(), 'bias': logistic.intercept_[0], 'calibration': lc, 'thresholds': lt})
    # Cover each available development category/class and length extremes. Never
    # consume test evidence to construct a parity fixture or select a model.
    parity_rows = {}
    for category in RULES:
        for label in ['change-warranted', 'contextual']:
            candidates = sorted([r for r in train + val if r['category'] == category and r['label'] == label], key=lambda r: (len(r['sequence']), r['variant']))
            for row in candidates[:1] + candidates[-1:]:
                parity_rows[row['variant']] = row
    with torch.no_grad():
        save('parity.json', {'modelHash': hashlib.sha256((output / 'model.json').read_bytes()).hexdigest(), 'tolerance': 1e-6, 'cases': [{'sequence': r['sequence'], 'rawScore': torch.sigmoid(model([r])).item()} for r in parity_rows.values()]})
    save('training.json', {'seed': 42, 'epochs': epochs, 'selectedEpoch': selected_epoch, 'validationLoss': best, 'conflictingVariants': len(known_conflicts), 'train': len(train), 'validation': len(val), 'testEvaluated': False, 'torch': torch.__version__, 'numpy': np.__version__, 'python': platform.python_version(), 'sklearn': package_version('scikit-learn'), 'safetyPolicy': SAFETY_POLICY})
    # Bind weights, thresholds, calibration and comparator before touching test examples.
    save('candidate.json', {'version': CANDIDATE_POLICY_VERSION, 'datasetHash': digest(data), 'splitHash': digest(split), 'safetyPolicy': SAFETY_POLICY,
                            'files': {name: hashlib.sha256((output / name).read_bytes()).hexdigest() for name in ['model.json', 'logistic.json', 'parity.json', 'training.json']}})


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
            'insufficientEvidenceContextual': sum(r['label'] == 'needs-review' and p == 'contextual' for r, p in zip(rows, predictions)),
            'precision95': wilson(tp, tp + fp), 'recall95': wilson(tp, sum(positive)), 'coverage95': wilson(known, len(rows)),
            'uncertainExamples': sum(r['label'] == 'needs-review' for r in rows), 'sampleCount': len(rows)}


def family_uncertainty(rows, predictions, repetitions=1000):
    """Paired cluster bootstrap, resampling whole application families.

    Same sampled families compare every model; no bootstrap result selects weights
    or thresholds. Undefined denominators are reported, never converted to zero.
    """
    if type(repetitions) is not int or not 100 <= repetitions <= 10000:
        raise ValueError('Expected 100..10000 bootstrap repetitions')
    if any(len(values) != len(rows) for values in predictions.values()):
        raise ValueError('Prediction length differs from evaluation rows')
    families = sorted({r['family'] for r in rows})
    policy = {'method': 'paired-application-family-percentile-v1', 'seed': 42,
              'repetitions': repetitions, 'families': len(families),
              'limitations': 'Exploratory intervals for this application cohort. Few families and shared contexts limit effective independence; not universal accuracy.'}
    names = list(predictions)
    keys = ['precision', 'recall', 'coverage']
    samples = {name: {key: [] for key in keys} for name in names}
    differences = {name: {key: [] for key in keys} for name in names if name != 'lstm'} if 'lstm' in names else {}
    if len(families) >= 2:
        indexes = {family: i for i, family in enumerate(families)}
        totals = np.zeros((len(names), len(families), 5), dtype=np.int64)
        for m, name in enumerate(names):
            for row, prediction in zip(rows, predictions[name]):
                positive = row['label'] == 'change-warranted'
                totals[m, indexes[row['family']]] += [int(positive and prediction == 'change-warranted'), int(prediction == 'change-warranted'), int(positive), int(prediction != 'needs-review'), 1]
        rng = np.random.default_rng(42)
        for _ in range(repetitions):
            counts = np.bincount(rng.integers(len(families), size=len(families)), minlength=len(families))
            sampled = np.einsum('mfk,f->mk', totals, counts)
            values = {}
            for name, (tp, called, positives, known, total) in zip(names, sampled):
                values[name] = {'precision': tp / called if called else None, 'recall': tp / positives if positives else None, 'coverage': known / total}
                for key, value in values[name].items():
                    if value is not None:
                        samples[name][key].append(float(value))
            for name in differences:
                for key in keys:
                    a, b = values['lstm'][key], values[name][key]
                    if a is not None and b is not None:
                        differences[name][key].append(float(a - b))
    def interval(values):
        # Suppress unstable intervals when >5% of draws have undefined metrics.
        return {'interval95': np.quantile(values, [.025, .975]).tolist() if len(values) >= .95 * repetitions else None,
                'definedReplicates': len(values)}
    return {**policy, 'metrics': {name: {key: interval(values) for key, values in group.items()} for name, group in samples.items()},
            'lstmMinusComparator': {name: {key: interval(values) for key, values in group.items()} for name, group in differences.items()}}


def evaluate(data, output):
    rows = validate(data)
    artifact = json.loads((output / 'model.json').read_text())
    split = json.loads((output / 'split.json').read_text())
    if digest(data) != artifact['datasetHash'] or digest(split) != artifact['splitHash'] or split != frozen_split(rows):
        raise ValueError('Frozen dataset/split mismatch')
    candidate = json.loads((output / 'candidate.json').read_text())
    expected_files = ['model.json', 'logistic.json', 'parity.json', 'training.json']
    if candidate.get('version') != CANDIDATE_POLICY_VERSION or candidate.get('safetyPolicy') != SAFETY_POLICY or candidate.get('datasetHash') != digest(data) or candidate.get('splitHash') != digest(split) or set(candidate.get('files', {})) != set(expected_files):
        raise ValueError('Candidate was not frozen with the current evaluation policy')
    if any(candidate['files'][name] != hashlib.sha256((output / name).read_bytes()).hexdigest() for name in expected_files):
        raise ValueError('Candidate weights, thresholds, calibration or comparator changed after training')
    if artifact['conflictVariants'] != development_conflicts(rows, split):
        raise ValueError('Safety policy must contain development conflicts only')
    candidate_hash = hashlib.sha256((output / 'candidate.json').read_bytes()).hexdigest()
    # An exclusive marker prevents threshold/checkpoint searches against this candidate test set.
    with (output / 'test-consumed.json').open('x') as file:
        json.dump({'modelHash': candidate['files']['model.json'], 'candidateHash': candidate_hash, 'datasetHash': digest(data)}, file)
    model = Model()
    model.load_state_dict({k: torch.tensor(artifact[name]) for k, name in [('lstm.weight_ih_l0', 'weightInput'), ('lstm.weight_hh_l0', 'weightHidden'), ('lstm.bias_ih_l0', 'biasInput'), ('lstm.bias_hh_l0', 'biasHidden'), ('output.weight', 'outputWeight'), ('output.bias', 'outputBias')] if k not in ['output.weight', 'output.bias']} | {'output.weight': torch.tensor([artifact['outputWeight']]), 'output.bias': torch.tensor([artifact['outputBias']])})
    model.eval()
    test = [r for r in rows if split['families'][r['family']] == 'test']
    if not test:
        raise ValueError('Frozen test partition is empty; candidate failed')
    logistic = json.loads((output / 'logistic.json').read_text())
    with torch.no_grad():
        scores = torch.sigmoid(model(test) / artifact['calibration']['temperature']).numpy()
    pred = [classify_score(float(s), artifact['thresholds']) for s in scores]
    guarded = apply_safeguards(test, pred, artifact['conflictVariants'])
    lx = (np.array([flatten(r) for r in test]) - logistic['mean']) / logistic['scale']
    ls = 1 / (1 + np.exp(-np.clip((lx @ logistic['weight'] + logistic['bias']) / logistic['calibration']['temperature'], -40, 40)))
    lp = [classify_score(float(s), logistic['thresholds']) for s in ls]
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
                 'noInsufficientEvidenceDeemphasis': safe['insufficientEvidenceContextual'] == 0,
                 'ruleComparator': (safe['precision'] or 0) > (comparator['precision'] or 0) and (safe['recall'] or 0) >= (comparator['recall'] or 0) - .05,
                 ('reviewedApplicationScope' if REQUIRED_PROVENANCE == 'human-reviewed' else 'controlledApplicationScope'): artifact['provenance'] == REQUIRED_PROVENANCE}
        logistic_guarded = apply_safeguards(rr, [lp[i] for i in idx], artifact['conflictVariants'])
        categories[rule] = {'modelOnly': raw, 'afterSafeguards': safe, 'logistic': {'modelOnly': metrics(rr, [lp[i] for i in idx]), 'afterSafeguards': metrics(rr, logistic_guarded)}, 'ruleOnly': comparator, 'gates': gates, 'approved': all(gates.values()), 'classCounts': {k: len(v) for k, v in labels.items()}, 'classFamilies': {k: len({r['family'] for r in v}) for k, v in labels.items()}, 'highCriticalContextual': sum(test[i]['label'] == 'change-warranted' and test[i]['severity'] in ['high', 'critical'] and pred[i] == 'contextual' for i in idx)}
        categories[rule]['familyUncertainty'] = {
            'modelOnly': family_uncertainty(rr, {'lstm': [pred[i] for i in idx], 'logistic': [lp[i] for i in idx], 'ruleOnly': ['change-warranted'] * len(rr)}),
            'afterSafeguards': family_uncertainty(rr, {'lstm': [guarded[i] for i in idx], 'logistic': logistic_guarded, 'ruleOnly': ['change-warranted'] * len(rr)})}
    report = {'evaluationVersion': EVALUATION_POLICY_VERSION, 'safetyPolicy': SAFETY_POLICY, 'candidateHash': candidate_hash, 'modelHash': candidate['files']['model.json'], 'datasetHash': digest(data), 'splitHash': digest(split), 'provenance': artifact['provenance'], 'testFamilies': families, 'scope': 'Only the frozen developer evidence cohort; no universal accuracy claim', 'categories': categories, 'releaseStatus': 'experimental', 'limitations': [('Review provenance declarations independently. This tool cannot attest human review.' if REQUIRED_PROVENANCE == 'human-reviewed' else 'Controlled local configurations only. Human review is not required by this policy; do not claim reviewed real-application accuracy.'), 'Wilson intervals assume independent examples; related within-family contexts can reduce effective sample size.']}
    (output / 'evaluation.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['audit', 'readiness', 'collection-plan', 'train', 'evaluate'])
    parser.add_argument('--dataset', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--epochs', type=int, default=60)
    args = parser.parse_args()
    path = Path(args.dataset)
    if path.stat().st_size > 64 * 1024 * 1024:
        raise ValueError('Dataset exceeds 64 MiB')
    dataset = json.loads(path.read_text(encoding='utf-8'))
    if args.command in ['audit', 'readiness', 'collection-plan']:
        result = frozen_split(validate(dataset)) if args.command == 'audit' else collection_plan(dataset) if args.command == 'collection-plan' else data_readiness(dataset)
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


if __name__ == '__main__':
    main()
