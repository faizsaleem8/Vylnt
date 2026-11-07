"""Mechanics fixtures only. No dataset or qualification examples."""
import copy
import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import project_material as M


class MaterialContextTests(unittest.TestCase):
    def setUp(self):
        self.policy = json.loads(Path('ml/project_material_policy.json').read_text())
        self.rules = list(self.policy['categories'])
        self.features = ['target'] + ['rule_' + rule for rule in self.rules] + sorted(set(self.policy['common'] + sum(self.policy['categories'].values(), []))) + ['irrelevant']
        M.validate_policy(self.policy, self.features, self.rules)

    def row(self, family='first', label='change-warranted', uncertain=False, http_only=0):
        target = [-1] * len(self.features)
        for name, value in {'target': 1, 'rule_CK-001': 1, 'secure': 0, 'httpOnly': http_only}.items():
            target[self.features.index(name)] = value
        row = {'category': 'CK-001', 'family': family, 'label': label, 'uncertain': uncertain,
               'sequence': [[-1] * len(self.features), target], 'evidenceRecord': family + label}
        row['variant'] = M.digest(row['sequence'])
        row['materialVariant'] = M.material_variant(row, self.features, self.policy)
        return row

    def test_independent_families_count_without_repetition_inflation(self):
        first, second = self.row(), self.row('second')
        nuisance = copy.deepcopy(first)
        nuisance['sequence'][0][0] = 1
        nuisance['sequence'][-1][-1] = 1
        nuisance['variant'] = M.digest(nuisance['sequence'])
        self.assertEqual(M.material_variant(nuisance, self.features, self.policy), first['materialVariant'])
        selected = M.representatives([first, second, nuisance, first], self.features, self.policy)
        self.assertEqual(len(selected), 2)
        self.assertEqual({row['family'] for row in selected}, {'first', 'second'})

    def test_relevant_attribute_variants_count_within_a_family(self):
        self.assertEqual(len(M.representatives([self.row(), self.row(http_only=1)], self.features, self.policy)), 2)

    def test_unknowns_supply_no_weight_and_supported_conflicts_abstain(self):
        first = self.row()
        unknown = self.row('unknown', 'needs-review', True)
        self.assertEqual(M.representatives([first, unknown], self.features, self.policy), [first])
        conflicting = self.row('different', 'contextual')
        self.assertEqual(M.representatives([first, conflicting], self.features, self.policy), [])

    def test_tampering_and_missing_target_are_rejected(self):
        row = self.row()
        row['materialVariant'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'variant'):
            M.representatives([row], self.features, self.policy)
        row = self.row()
        row['sequence'][-1][self.features.index('target')] = 0
        with self.assertRaisesRegex(ValueError, 'target'):
            M.material_variant(row, self.features, self.policy)
        policy = copy.deepcopy(self.policy)
        policy['categories']['CK-001'].append('cookieName')
        with self.assertRaisesRegex(ValueError, 'feature'):
            M.validate_policy(policy, self.features, self.rules)

    def test_family_weights_and_calibration_resist_family_size_imbalance(self):
        small, large = self.row('small'), self.row('large')
        rows = [small] + [large] * 20 + [self.row('context', 'contextual')]
        weights = M.family_weights(rows)
        self.assertAlmostEqual(weights[0], sum(weights[1:21]))
        self.assertAlmostEqual(sum(weights[:21]), weights[-1])
        base = [self.row('small'), self.row('large'), self.row('context', 'contextual')]
        expected = M.calibrate([3., .5, -2.], [1, 1, 0], base)
        self.assertEqual(M.calibrate([3.] + [.5] * 20 + [-2.], [1] * 21 + [0], rows), expected)
