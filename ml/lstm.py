"""Offline snapshot LSTM experiment. CPU training; numeric browser artifact only.

Sequence order is structural snapshot order, not a runtime or source/sink trace.
"""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path
import platform

import numpy as np
import torch
from torch import nn
from torch.nn.utils.rnn import pack_padded_sequence, pad_sequence
import baseline

VERSION = 'vynlt-snapshot-sequence-v1'
FEATURES = ['kind_coverage', 'kind_resource', 'kind_script', 'kind_cookie', 'kind_target',
            'headers_collected', 'dom_collected', 'cookies_collected', 'https', 'external',
            'secure', 'http_only', 'integrity', 'same_site_restricted', 'failed', 'truncated'] + [f'target_{rule}' for rule in baseline.RULES]
MAX_STEPS = 74


def validate_dataset(data):
    if set(data) != {'schemaVersion', 'sequenceFeatureNames', 'baselineFeatureNames', 'examples'} or data['schemaVersion'] != VERSION or data['sequenceFeatureNames'] != FEATURES or data['baselineFeatureNames'] != baseline.FEATURES:
        raise ValueError('Unsupported sequence dataset schema')
    if not isinstance(data['examples'], list) or not 1 <= len(data['examples']) <= 50000:
        raise ValueError('Expected 1..50000 sequence examples')
    flat = []
    for row in data['examples']:
        if not isinstance(row, dict) or 'sequence' not in row:
            raise ValueError('Missing sequence')
        sequence = row['sequence']
        if not isinstance(sequence, list) or not 2 <= len(sequence) <= MAX_STEPS:
            raise ValueError('Invalid sequence length')
        kinds = []
        for token in sequence:
            if not isinstance(token, list) or len(token) != len(FEATURES) or any(type(x) not in (float, int) or not math.isfinite(x) or x not in (0, 1) for x in token):
                raise ValueError('Sequence tokens must be fixed binary metadata')
            if sum(token[:5]) != 1:
                raise ValueError('Token kind must be one-hot')
            kind = token[:5].index(1)
            allowed = {0: {5, 6, 7, 8, 15}, 1: {8, 9, 14}, 2: {8, 9, 12}, 3: {10, 11, 13}, 4: set(range(16, 24))}[kind] | {kind}
            if any(value and i not in allowed for i, value in enumerate(token)):
                raise ValueError('Unexpected metadata for token kind')
            kinds.append(kind)
        if kinds != sorted(kinds) or kinds.count(0) != 1 or kinds.count(4) != 1 or any(kinds.count(k) > 24 for k in [1, 2, 3]):
            raise ValueError('Invalid snapshot group order or bounds')
        if sequence[-1][16:] != [row.get('features', {}).get(f'rule_{rule}') for rule in baseline.RULES]:
            raise ValueError('Sequence target and baseline target differ')
        coverage = sequence[0]
        if kinds.count(2) and not coverage[6] or kinds.count(3) and not coverage[7]:
            raise ValueError('Metadata conflicts with collection coverage')
        flat.append({key: value for key, value in row.items() if key != 'sequence'})
    baseline.validate_dataset({'schemaVersion': baseline.VERSION, 'featureNames': baseline.FEATURES, 'examples': flat})
    return data['examples'], {'schemaVersion': baseline.VERSION, 'featureNames': baseline.FEATURES, 'examples': flat}


class SnapshotLstm(nn.Module):
    def __init__(self):
        super().__init__()
        self.lstm = nn.LSTM(len(FEATURES), 8, batch_first=True)
        self.output = nn.Linear(8, 1)

    def forward(self, rows):
        tensors = [torch.tensor(row['sequence'], dtype=torch.float32) for row in rows]
        lengths = torch.tensor([len(x) for x in tensors], dtype=torch.int64)
        packed = pack_padded_sequence(pad_sequence(tensors, batch_first=True), lengths, batch_first=True, enforce_sorted=False)
        _, (hidden, _) = self.lstm(packed)
        return self.output(hidden[-1]).squeeze(-1)


def export_model(model, rows):
    weights = model.state_dict()
    return {'schemaVersion': VERSION, 'kind': 'experimental-lstm', 'rulesetVersion': rows[0]['rulesetVersion'],
            'featureNames': FEATURES, 'hiddenSize': 8, 'maxSteps': MAX_STEPS, 'gateOrder': 'ifgo',
            'supportedRules': [rule for rule in baseline.RULES if {row['label'] for row in rows if row['features'][f'rule_{rule}']} >= {'actionable', 'contextual'}],
            'weightInput': weights['lstm.weight_ih_l0'].tolist(), 'weightHidden': weights['lstm.weight_hh_l0'].tolist(),
            'biasInput': weights['lstm.bias_ih_l0'].tolist(), 'biasHidden': weights['lstm.bias_hh_l0'].tolist(),
            'outputWeight': weights['output.weight'][0].tolist(), 'outputBias': weights['output.bias'][0].item(),
            'threshold': .5, 'provenance': rows[0]['provenance'], 'liveUseApproved': False}


def experiment(data, epochs=60):
    rows, flat = validate_dataset(data)
    # Same deterministic application families and threshold as the logistic comparator.
    splits = baseline.split_groups(rows)
    torch.manual_seed(42)
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    model = SnapshotLstm()
    optimizer = torch.optim.Adam(model.parameters(), lr=.01)
    labels = lambda values: torch.tensor([float(row['label'] == 'actionable') for row in values])
    train_labels = labels(splits['train'])
    loss_function = nn.BCEWithLogitsLoss(pos_weight=(1 - train_labels).sum() / train_labels.sum())
    best, best_loss = None, float('inf')
    losses = []
    for epoch in range(epochs):
        model.train()
        for start in range(0, len(splits['train']), 32):
            batch = splits['train'][start:start + 32]
            optimizer.zero_grad()
            loss = loss_function(model(batch), labels(batch))
            if not torch.isfinite(loss):
                raise ValueError('Non-finite training loss')
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
        model.eval()
        with torch.no_grad():
            validation_loss = nn.functional.binary_cross_entropy_with_logits(model(splits['validation']), labels(splits['validation'])).item()
        losses.append(validation_loss)
        if validation_loss < best_loss:
            best_loss, best = validation_loss, copy.deepcopy(model.state_dict())
    model.load_state_dict(best)
    model.eval()
    baseline_model, comparison, groups = baseline.experiment(flat)
    evaluation = {}
    parity = []
    with torch.no_grad():
        for name in ['validation', 'test']:
            scores = torch.sigmoid(model(splits[name])).tolist()
            evaluation[name] = {**comparison['evaluation'][name], 'lstm': baseline.metrics(labels(splits[name]).tolist(), [int(x >= .5) for x in scores])}
            parity.extend({'sequence': row['sequence'], 'score': score} for row, score in zip(splits[name][:4], scores[:4]))
    # Extra independent framework reference cases exercise short and maximum length.
    for length in [2, MAX_STEPS]:
        token = lambda index: [int(i == index) for i in range(len(FEATURES))]
        sequence = [token(0)]
        sequence[0][6] = sequence[0][7] = 1
        if length == MAX_STEPS:
            for kind in [1, 2, 3]:
                sequence.extend([token(kind) for _ in range(24)])
        target = token(4); target[16] = 1
        sequence.append(target)
        with torch.no_grad():
            parity.append({'sequence': sequence, 'score': torch.sigmoid(model([{'sequence': sequence}])).item()})
    artifact = export_model(model, splits['train'])
    if not artifact['supportedRules']:
        raise ValueError('No rule has both reviewed label classes in training')
    report = {'experimental': True, 'provenance': artifact['provenance'], 'target': 'existing-alert-triage',
              'sequenceMeaning': 'structural snapshot order; not runtime data flow', 'seed': 42, 'splitSeed': 'vynlt-v1',
              'epochs': epochs, 'selectedValidationLoss': best_loss, 'initialValidationLoss': losses[0],
              'trainingExamples': len(splits['train']), 'excludedUnreviewed': sum(row['label'] == 'unreviewed' for row in rows),
              'environment': {'python': platform.python_version(), 'torch': torch.__version__, 'numpy': np.__version__},
              'evaluation': evaluation, 'limitations': ['Synthetic results test implementation only.', 'No independently reviewed dataset or calibrated probabilities.', 'No source/sink evidence or detection beyond supported rule findings.', 'Truncation and missing collection limit context.']}
    return artifact, report, groups, {'model': artifact, 'cases': parity}, baseline_model


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', required=True, nargs='+', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--epochs', type=int, default=60)
    args = parser.parse_args()
    if sum(path.stat().st_size for path in args.dataset) > 64 * 1024 * 1024:
        raise ValueError('Combined sequence datasets exceed 64 MiB')
    if any((args.output / f'{name}.json').resolve() in {path.resolve() for path in args.dataset} for name in ['model', 'evaluation', 'split-groups', 'parity', 'baseline']):
        raise ValueError('Output must not overwrite input datasets')
    if not 1 <= args.epochs <= 500:
        raise ValueError('Epochs must be 1..500')
    merged = None
    for path in args.dataset:
        if path.stat().st_size > 64 * 1024 * 1024:
            raise ValueError('Dataset exceeds 64 MiB')
        data = json.loads(path.read_text(encoding='utf-8'))
        validate_dataset(data)
        if merged is None:
            merged = {**data, 'examples': []}
        merged['examples'].extend(data['examples'])
    merged['examples'].sort(key=lambda row: row['sampleId'])
    artifact, evaluation, groups, parity, comparator = experiment(merged, args.epochs)
    evaluation['datasetSha256'] = hashlib.sha256(json.dumps(merged, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()).hexdigest()
    args.output.mkdir(parents=True, exist_ok=True)
    for name, value in [('model', artifact), ('evaluation', evaluation), ('split-groups', groups), ('parity', parity), ('baseline', comparator)]:
        (args.output / f'{name}.json').write_text(json.dumps(value, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    print(json.dumps({'kind': artifact['kind'], 'provenance': artifact['provenance'], 'evaluation': evaluation['evaluation'], 'note': 'Experimental; not approved security guidance.'}, indent=2))


if __name__ == '__main__':
    main()
