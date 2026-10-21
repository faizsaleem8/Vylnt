import copy
import unittest
import insights
import json
import tempfile
from pathlib import Path
from export_v3_parity import export
from insights_v3 import load_engine
from test_insights import fixture


class EvidenceV3Tests(unittest.TestCase):
    def test_controlled_waiver_is_versioned_without_weakening_numeric_gates(self):
        engine = load_engine()
        data = fixture()
        data['schemaVersion'], data['featureNames'] = engine.VERSION, engine.FEATURES
        for row in data['examples']:
            row['sequence'] = [step[:-8] + [-1] + step[-8:] for step in row['sequence']]
            row['variant'] = engine.digest(row['sequence'])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'candidate'
            engine.fit(data, path, epochs=2)
            candidate = json.loads((path / 'candidate.json').read_text())
            self.assertEqual(candidate['version'], 3)
            self.assertEqual(candidate['safetyPolicy'], 'controlled-evidence-v3')
            report = engine.evaluate(data, path)
            self.assertEqual(report['evaluationVersion'], 3)
            category = report['categories']['HDR-001']
            self.assertTrue(category['gates']['controlledApplicationScope'])
            self.assertNotIn('reviewedApplicationScope', category['gates'])
            self.assertFalse(category['gates']['classCounts'])
            self.assertFalse(category['approved'])
            with self.assertRaises(FileExistsError):
                engine.evaluate(data, path)
        self.assertEqual(insights.SAFETY_POLICY, 'development-only-v2')
        self.assertEqual(insights.REQUIRED_PROVENANCE, 'human-reviewed')

    def test_reference_parity_is_reproducible_with_nonzero_new_feature_weights(self):
        actual = export()
        expected = json.loads((Path(__file__).resolve().parents[1] / 'fixtures/evidence-lstm-v3-parity.json').read_text())
        self.assertEqual(actual['modelJson'], expected['modelJson'])
        self.assertEqual(actual['parity']['modelHash'], expected['parity']['modelHash'])
        for a, b in zip(actual['parity']['cases'], expected['parity']['cases']):
            self.assertEqual(a['sequence'], b['sequence'])
            self.assertAlmostEqual(a['rawScore'], b['rawScore'], delta=1e-6)

    def test_isolation_and_exact_schema(self):
        engine = load_engine()
        self.assertEqual(insights.VERSION, 'vynlt-evidence-v2')
        self.assertEqual(len(insights.FEATURES), 45)
        self.assertEqual(engine.VERSION, 'vynlt-evidence-v3')
        self.assertEqual(len(engine.FEATURES), 46)
        self.assertEqual(engine.FEATURES[-8:], insights.FEATURES[-8:])
        self.assertEqual(engine.Model().lstm.input_size, 46)
        with self.assertRaisesRegex(ValueError, 'schema'):
            engine.validate(fixture())

    def test_v3_validation_grouping_and_conflicts_preserve_the_existing_policy(self):
        engine = load_engine()
        data = fixture()
        data['schemaVersion'], data['featureNames'] = engine.VERSION, engine.FEATURES
        for row in data['examples']:
            row['sequence'] = [step[:-8] + [-1] + step[-8:] for step in row['sequence']]
            row['variant'] = engine.digest(row['sequence'])
        self.assertEqual(len(engine.validate(data)), 100)
        split = engine.frozen_split(data['examples'])
        self.assertEqual(split['policy'], insights.frozen_split(fixture()['examples'])['policy'])
        self.assertEqual(split['families'], insights.frozen_split(fixture()['examples'])['families'])
        bridge = copy.deepcopy(data['examples'][0])
        bridge['family'] = data['examples'][1]['family']
        bridge['label'] = 'needs-review'
        data['examples'].append(bridge)
        result = engine.frozen_split(engine.validate(data))
        self.assertEqual(result['families'][bridge['family']], result['families'][data['examples'][0]['family']])
        self.assertIn(bridge['variant'], result['conflicts'])
        data['examples'][0]['sequence'][0].pop()
        with self.assertRaisesRegex(ValueError, 'numeric sequence'):
            engine.validate(data)


if __name__ == '__main__':
    unittest.main()
