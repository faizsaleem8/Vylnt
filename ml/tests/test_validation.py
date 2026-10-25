import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import insights
import validation
from insights_v3 import load_engine
from test_insights import fixture


def v3_fixture():
    data = fixture()
    engine = load_engine()
    data['schemaVersion'], data['featureNames'] = engine.VERSION, engine.FEATURES
    for row in data['examples']:
        row['sequence'] = [step[:-8] + [-1] + step[-8:] for step in row['sequence']]
        row['variant'] = engine.digest(row['sequence'])
    return data


class ValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Numeric mechanics only, never a security qualification example.
        cls.directory = tempfile.TemporaryDirectory()
        cls.root = Path(cls.directory.name) / 'candidate'
        cls.data = v3_fixture()
        cls.engine = load_engine()
        cls.engine.fit(cls.data, cls.root, epochs=2)
        cls.engine.evaluate(cls.data, cls.root)

    @classmethod
    def tearDownClass(cls):
        cls.directory.cleanup()

    def audit(self):
        return validation.audit(self.data, self.root)

    def test_audit_preserves_every_input_and_never_predicts_on_test(self):
        before = {p.name: p.read_bytes() for p in self.root.iterdir()}
        original = self.engine.Model.forward
        split = self.engine.frozen_split(self.data['examples'])
        seen = []

        def check(network, rows):
            self.assertTrue(all(split['families'][r['family']] != 'test' for r in rows))
            seen.extend(rows)
            return original(network, rows)

        with patch.object(validation, 'engine_for', return_value=self.engine), patch.object(self.engine.Model, 'forward', check):
            result = self.audit()
        self.assertTrue(seen)
        self.assertEqual(result['status'], 'not-qualified')
        self.assertFalse(result['releasePromoted'])
        self.assertEqual(result['development']['testPredictions'], 0)
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.root.iterdir()})

    def test_controlled_collection_deficits_follow_controlled_policy(self):
        data = v3_fixture()
        brief = self.engine.collection_plan(data)
        ready = self.engine.data_readiness(data)
        self.assertFalse(brief['requiredProvenanceMissing'])
        self.assertEqual(brief['requiredProvenance'], 'controlled')
        self.assertTrue(brief['reviewedApplicationDataMissing'])  # Truthful, but no longer a gate.
        self.assertEqual(brief['testFamilyDeficit'], max(0, 10 - ready['partitions']['test']['families']))
        self.assertEqual(brief['categories']['HDR-001']['testDeficits']['contextual']['examples'],
                         max(0, 30 - ready['categories']['HDR-001']['testCounts']['contextual']))
        self.assertNotIn('Obtain two independent review', ' '.join(brief['instructions']))
        self.assertTrue(insights.collection_plan(fixture())['requiredProvenanceMissing'])

    def test_training_reproduces_without_creating_a_new_test_evaluation(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'reproduction'
            with patch.object(self.engine, 'evaluate', side_effect=AssertionError('Must not evaluate test')):
                result = validation.reproduce(self.engine, self.data, self.root, output)
            self.assertEqual(result['status'], 'exact-numeric-match')
            self.assertFalse((output / 'test-consumed.json').exists())
            self.assertFalse((output / 'evaluation.json').exists())
            with self.assertRaises(FileExistsError):
                validation.reproduce(self.engine, self.data, self.root, output)

    def test_preflight_does_not_confuse_fit_ready_with_category_qualification(self):
        result = validation.audit(self.data)
        self.assertTrue(result['preflight']['fitReady'])
        self.assertEqual(result['preflight']['readyCategories'], [])
        self.assertFalse(result['preflight']['categories']['CK-002']['gates']['trainingClasses'])
        self.assertEqual(result['status'], 'not-qualified')
        self.assertNotIn('development', result)

    def change_file(self, name, mutate, message):
        path = self.root / name
        before = path.read_bytes()
        value = json.loads(before)
        mutate(value)
        try:
            path.write_text(json.dumps(value), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, message):
                self.audit()
        finally:
            path.write_bytes(before)

    def test_changed_weights_rejected(self):
        self.change_file('model.json', lambda v: v.update(outputBias=1), 'changed after freezing')

    def test_modified_evaluation_identity_rejected(self):
        self.change_file('evaluation.json', lambda v: v.update(candidateHash='0' * 64), 'identity mismatch')

    def test_modified_approval_rejected(self):
        self.change_file('evaluation.json', lambda v: v['categories']['HDR-001'].update(approved=True), 'approval/gates')

    def test_inflated_test_counts_rejected(self):
        self.change_file('evaluation.json', lambda v: v['categories']['HDR-001']['classCounts'].update(contextual=100), 'class counts')

    def test_non_finite_metrics_rejected(self):
        self.change_file('evaluation.json', lambda v: v['categories']['HDR-001']['afterSafeguards'].update(precision=float('nan')), 'Non-finite')

    def test_changed_marker_rejected(self):
        self.change_file('test-consumed.json', lambda v: v.update(modelHash='f' * 64), 'identity mismatch')

    def test_missing_family_intervals_rejected(self):
        self.change_file('evaluation.json', lambda v: v['categories']['HDR-001'].pop('familyUncertainty'), 'family uncertainty')

    def test_inflated_bootstrap_family_count_rejected(self):
        self.change_file('evaluation.json', lambda v: v['categories']['HDR-001']['familyUncertainty']['modelOnly'].update(families=999), 'family uncertainty scope')

    def test_unknown_dataset_schema_rejected(self):
        data = copy.deepcopy(self.data)
        data['schemaVersion'] = 'untrusted'
        with self.assertRaisesRegex(ValueError, 'Unsupported'):
            validation.audit(data)

    def test_impossible_metric_and_interval_rejected(self):
        rows = self.data['examples'][:10]
        value = self.engine.metrics(rows, [r['label'] for r in rows])
        value['recall'] = .333
        value['recall95'] = [0, 1]
        with self.assertRaisesRegex(ValueError, 'sample count'):
            validation.check_metric(value, rows, self.engine)
        value = self.engine.metrics(rows, [r['label'] for r in rows])
        value['coverage95'] = [0, 1]
        with self.assertRaisesRegex(ValueError, 'uncertainty interval disagrees'):
            validation.check_metric(value, rows, self.engine)


if __name__ == '__main__':
    unittest.main()
