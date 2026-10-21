"""Reproducible v3 numeric runtime mechanics; not trained or security-qualified."""
import copy
import hashlib
import json
from pathlib import Path
import torch
from insights_v3 import load_engine


def export():
    engine = load_engine()
    root = Path(__file__).resolve().parent
    artifact = copy.deepcopy(json.loads((root / 'fixtures/evidence-lstm-parity.json').read_text())['model'])
    artifact['schemaVersion'], artifact['featureNames'] = engine.VERSION, engine.FEATURES
    # Exercise the added feature with nonzero weights, not zero padding.
    artifact['weightInput'] = [row[:-8] + [.125 if i % 2 else -.25] + row[-8:] for i, row in enumerate(artifact['weightInput'])]
    model = engine.Model()
    model.load_state_dict({
        'lstm.weight_ih_l0': torch.tensor(artifact['weightInput']), 'lstm.weight_hh_l0': torch.tensor(artifact['weightHidden']),
        'lstm.bias_ih_l0': torch.tensor(artifact['biasInput']), 'lstm.bias_hh_l0': torch.tensor(artifact['biasHidden']),
        'output.weight': torch.tensor([artifact['outputWeight']]), 'output.bias': torch.tensor([artifact['outputBias']]),
    })
    model.eval()
    torch.set_num_threads(1)
    cases = []
    for rule in engine.RULES:
        for size in [2, 26, 50, 74]:
            coverage = [-1] * len(engine.FEATURES)
            coverage[0], coverage[5:9] = 1, [1, 1, 1, -1]
            sequence = [coverage]
            for i in range(size - 2):
                step = [1 if (i + j) % 3 else -1 for j in range(len(engine.FEATURES))]
                step[:5] = [1 if j == 1 + i // 24 else -1 for j in range(5)]
                sequence.append(step)
            target = [-1] * len(engine.FEATURES)
            target[4] = 1
            target[37] = [1, 0, -1, 1][[2, 26, 50, 74].index(size)]
            target[-8:] = [1 if candidate == rule else -1 for candidate in engine.RULES]
            sequence.append(target)
            with torch.no_grad():
                score = torch.sigmoid(model([{'sequence': sequence}])).item()
            cases.append({'sequence': sequence, 'rawScore': score})
    model_json = json.dumps(artifact, separators=(',', ':'))
    return {'model': artifact, 'modelJson': model_json, 'parity': {'modelHash': hashlib.sha256(model_json.encode()).hexdigest(), 'tolerance': 1e-6, 'cases': cases}}


if __name__ == '__main__':
    target = Path(__file__).resolve().parent / 'fixtures/evidence-lstm-v3-parity.json'
    target.write_text(json.dumps(export(), separators=(',', ':')) + '\n', encoding='utf-8')
