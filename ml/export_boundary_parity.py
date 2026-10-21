"""Reproduce numeric boundary fixtures only; no training or quality claims."""
import json
from pathlib import Path
import torch
from insights import FEATURES, RULES, Model


def export():
    root = Path(__file__).resolve().parent
    reference = json.loads((root / 'fixtures/evidence-lstm-parity.json').read_text())
    artifact = reference['model']
    model = Model()
    model.load_state_dict({
        'lstm.weight_ih_l0': torch.tensor(artifact['weightInput']),
        'lstm.weight_hh_l0': torch.tensor(artifact['weightHidden']),
        'lstm.bias_ih_l0': torch.tensor(artifact['biasInput']),
        'lstm.bias_hh_l0': torch.tensor(artifact['biasHidden']),
        'output.weight': torch.tensor([artifact['outputWeight']]),
        'output.bias': torch.tensor([artifact['outputBias']]),
    })
    model.eval()
    torch.set_num_threads(1)
    cases = []
    for rule in RULES:
        for size in [2, 26, 50, 74]:
            coverage = [-1] * len(FEATURES)
            coverage[:5] = [1, -1, -1, -1, -1]
            coverage[5:9] = [1, 1, 1, -1]
            sequence = [coverage]
            for i in range(size - 2):
                kind = 1 + i // 24
                step = [1 if (i + j) % 3 else -1 for j in range(len(FEATURES))]
                step[:5] = [1 if j == kind else -1 for j in range(5)]
                sequence.append(step)
            target = [-1] * len(FEATURES)
            target[4] = 1
            target[-8:] = [1 if candidate == rule else -1 for candidate in RULES]
            sequence.append(target)
            with torch.no_grad():
                score = torch.sigmoid(model([{'sequence': sequence}])).item()
            cases.append({'sequence': sequence, 'rawScore': score})
    return {'modelHash': reference['parity']['modelHash'], 'tolerance': 1e-6, 'cases': cases}


if __name__ == '__main__':
    output = Path(__file__).resolve().parent / 'fixtures/evidence-lstm-boundary-parity.json'
    output.write_text(json.dumps(export(), separators=(',', ':')) + '\n', encoding='utf-8')
