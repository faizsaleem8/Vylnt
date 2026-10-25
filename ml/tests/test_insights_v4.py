import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import insights_v4 as v4
from test_validation import v3_fixture


class CategoryCandidateTests(unittest.TestCase):
    def test_category_class_balance_and_unsupported_abstention(self):
        data = v3_fixture()
        split, _, _, supported = v4.development(data)
        self.assertEqual(supported, ['HDR-001'])
        policy = {'categories': {'CK-002': {'supported': False}}}
        for value in [-1000, 0, 1000]:
            self.assertEqual(v4.decision(value, 'CK-002', policy), 'needs-review')
            self.assertEqual(v4.decision(value, 'unknown', policy), 'needs-review')
        rows = [{'category': 'A', 'label': 'change-warranted'}] * 9 + [{'category': 'A', 'label': 'contextual'}]
        weights = v4.weights(rows)
        self.assertAlmostEqual(sum(weights[:9]), weights[-1])
        self.assertAlmostEqual(float(weights.mean()), 1.)
        self.assertEqual(len(split['families']), 100)

    def test_candidate_freezes_before_test_and_refuses_seen_holdout(self):
        data = v3_fixture()
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'candidate'
            registration = v4.register(data, data, root, epochs=2)
            v4.fit(data, data, root)
            candidate = v4.check_candidate(data, data, root)
            self.assertEqual(candidate['version'], 4)
            self.assertEqual(registration['categories'], ['HDR-001'])
            self.assertEqual(json.loads((root / 'model.json').read_text())['thresholds'], {'contextual': 0, 'change': 1})
            with patch.object(v4.E.Model, 'forward', side_effect=AssertionError('Must not predict test')):
                with self.assertRaisesRegex(ValueError, 'Fresh independent holdout'):
                    v4.evaluate(data, data, root)
            self.assertFalse((root / 'test-consumed.json').exists())
            self.assertFalse((root / 'evaluation.json').exists())
            self.assertFalse(json.loads((root / 'evaluation-blocked.json').read_text())['testConsumed'])
            policy = json.loads((root / 'category-policy.json').read_text())
            policy['categories']['CK-002'] = policy['categories']['HDR-001']
            (root / 'category-policy.json').write_text(json.dumps(policy))
            with self.assertRaisesRegex(ValueError, 'candidate changed'):
                v4.check_candidate(data, data, root)

    def test_changed_registration_inputs_refused_before_fit(self):
        data = v3_fixture()
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'candidate'
            v4.register(data, data, root, epochs=2)
            changed = copy.deepcopy(data)
            changed['examples'][0]['label'] = 'needs-review'
            with self.assertRaisesRegex(ValueError, 'Preregistered'):
                v4.fit(changed, data, root)
            self.assertFalse((root / 'training-started.json').exists())

    def test_test_labels_do_not_select_weights_or_category_thresholds(self):
        data = v3_fixture()
        changed = copy.deepcopy(data)
        split = v4.E.frozen_split(data['examples'])
        for row in changed['examples']:
            if split['families'][row['family']] == 'test':
                row['label'] = 'needs-review'
        with tempfile.TemporaryDirectory() as folder:
            a, b = Path(folder) / 'a', Path(folder) / 'b'
            for dataset, root in [(data, a), (changed, b)]:
                v4.register(dataset, data, root, epochs=2)
                v4.fit(dataset, data, root)
            aa, bb = [json.loads((root / 'model.json').read_text()) for root in [a, b]]
            for key in ['weightInput', 'weightHidden', 'biasInput', 'biasHidden', 'outputWeight', 'outputBias']:
                self.assertEqual(aa[key], bb[key], key)
            self.assertEqual(json.loads((a / 'category-policy.json').read_text()), json.loads((b / 'category-policy.json').read_text()))
            self.assertEqual(json.loads((a / 'logistic.json').read_text()), json.loads((b / 'logistic.json').read_text()))

    def test_fresh_numeric_mechanics_evaluation_runs_once_and_reports_all_categories(self):
        previous = v3_fixture()
        data = copy.deepcopy(previous)
        data['examples'] = []
        # Purely numeric mechanics, not real applications or qualification evidence.
        for i in range(100, 800):
            row = copy.deepcopy(previous['examples'][i % 100])
            row['family'] = v4.E.digest(['fresh-numeric-mechanics-only', i])
            for bit in range(10):
                row['sequence'][0][5 + bit] = int(bool(i & (1 << bit)))
            row['variant'] = v4.E.digest(row['sequence'])
            data['examples'].append(row)
        ready = v4.readiness(data, previous)
        self.assertTrue(ready['testMayBeEvaluated'])
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'candidate'
            v4.register(data, previous, root, epochs=2)
            v4.fit(data, previous, root)
            with self.assertRaises(FileNotFoundError):
                v4.evaluate(data, previous, root)
            self.assertFalse((root / 'test-consumed.json').exists())
            # This unit fixture exercises evaluation mechanics only. Real candidate
            # acceptance executes scripts/ml-verify-candidate.mjs before evaluation.
            with patch.object(v4, 'verified_browser_parity', return_value='0' * 64):
                report = v4.evaluate(data, previous, root)
            self.assertEqual(set(report['categories']), set(v4.E.RULES))
            self.assertEqual(report['categories']['CK-002']['afterSafeguards']['coverage'], 0)
            self.assertFalse(report['categories']['CK-002']['approved'])
            with patch.object(v4, 'verified_browser_parity', return_value='0' * 64):
                with self.assertRaises(FileExistsError):
                    v4.evaluate(data, previous, root)

    def test_wrong_browser_parity_cannot_consume_test(self):
        data = v3_fixture()
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder) / 'candidate'
            v4.register(data, data, root, epochs=2)
            v4.fit(data, data, root)
            candidate = v4.check_candidate(data, data, root)
            v4.save(root / 'browser-parity.json', {'candidateHash': 'wrong'})
            with self.assertRaisesRegex(ValueError, 'browser parity'):
                v4.verified_browser_parity(root, candidate)
            self.assertFalse((root / 'test-consumed.json').exists())

    def test_renaming_families_does_not_make_seen_inputs_a_fresh_holdout(self):
        previous = v3_fixture()
        changed = copy.deepcopy(previous)
        for row in changed['examples']:
            row['family'] = v4.E.digest(['renamed', row['family']])
        ready = v4.readiness(changed, previous)
        self.assertEqual(ready['previouslySeenTestFamilies'], 0)
        self.assertGreater(ready['previouslySeenTestVariants'], 0)
        self.assertFalse(ready['freshHoldout'])


if __name__ == '__main__':
    unittest.main()
