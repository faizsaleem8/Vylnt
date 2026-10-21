import json
import tempfile
import unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import insights


def fixture():
    # Numeric mechanics only. Not a security dataset or evidence of model quality.
    rows = []
    for i in range(100):
        coverage = [0] * len(insights.FEATURES)
        coverage[0] = 1
        target = [-1] * len(insights.FEATURES)
        target[4] = 1
        target[-8:] = [1] + [-1] * 7
        for k in range(10):
            coverage[5 + k] = int(bool(i & (1 << k)))
        seq = [coverage, target]
        rows.append({'family': insights.digest(['family', i]), 'variant': insights.digest(seq), 'sequence': seq,
                     'category': 'HDR-001', 'severity': 'medium', 'label': 'change-warranted' if i % 2 else 'contextual',
                     'provenance': 'controlled', 'evidenceRecord': insights.digest(['mechanics', i]), 'rulesetVersion': '0.2.0', 'uncertain': False})
    return {'schemaVersion': insights.VERSION, 'featureNames': insights.FEATURES, 'examples': rows}


class InsightTests(unittest.TestCase):
    def test_conflicting_identical_inputs_abstain_and_share_partition(self):
        data = fixture()
        other = dict(data['examples'][0], family=insights.digest('other'), label='change-warranted')
        data['examples'].append(other)
        split = insights.frozen_split(insights.validate(data))
        self.assertIn(other['variant'], split['conflicts'])
        self.assertEqual(split['families'][other['family']], split['families'][data['examples'][0]['family']])

    def test_train_parity_and_once_only_test_gates(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'candidate'
            data = fixture()
            insights.fit(data, output, epochs=2)
            artifact = json.loads((output / 'model.json').read_text())
            self.assertLess((output / 'model.json').stat().st_size, 128 * 1024)
            self.assertEqual(artifact['releaseStatus'], 'experimental')
            report = insights.evaluate(data, output)
            self.assertFalse(any(c['approved'] for c in report['categories'].values()))
            with self.assertRaises(FileExistsError):
                insights.evaluate(data, output)

    def test_repeated_examples_rejected_and_intervals_published(self):
        data = fixture()
        data['examples'].append(data['examples'][0])
        with self.assertRaises(ValueError):
            insights.validate(data)
        self.assertEqual(insights.wilson(0, 0), None)
        self.assertGreater(insights.wilson(30, 30)[0], .88)


if __name__ == '__main__':
    unittest.main()
