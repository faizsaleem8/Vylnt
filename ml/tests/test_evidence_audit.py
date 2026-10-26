import copy
import json
import unittest
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import evidence_audit
from test_validation import v3_fixture
from insights_v3 import load_engine


class EvidenceAuditTests(unittest.TestCase):
    def test_no_prediction_or_private_identifiers_and_no_input_mutation(self):
        data = v3_fixture()
        original = copy.deepcopy(data)
        engine = load_engine()
        with patch.object(evidence_audit, 'engine_for', return_value=engine), patch.object(engine.Model, 'forward', side_effect=AssertionError('No predictions')):
            result = evidence_audit.audit(data)
        self.assertEqual(data, original)
        self.assertFalse(result['releasePromoted'])
        self.assertEqual(result['testPredictions'], 0)
        text = json.dumps(result)
        for row in data['examples']:
            for key in ('family', 'variant', 'evidenceRecord'):
                self.assertNotIn(row[key], text)

    def test_opposed_development_labels_are_review_required(self):
        data = v3_fixture()
        engine = load_engine()
        split = engine.frozen_split(data['examples'])
        row = next(r for r in data['examples'] if split['families'][r['family']] == 'train' and r['label'] in evidence_audit.LABELS)
        opposite = copy.deepcopy(row)
        opposite['label'] = 'contextual' if row['label'] == 'change-warranted' else 'change-warranted'
        data['examples'].append(opposite)
        category = evidence_audit.audit(data)['categories'][row['category']]
        self.assertGreaterEqual(category['opposedLabelInputs'], 1)
        self.assertGreaterEqual(category['reviewRequiredInputs'], 1)

    def test_test_label_changes_do_not_change_development_diagnosis(self):
        data = v3_fixture()
        before = evidence_audit.audit(data)
        engine = load_engine()
        split = engine.frozen_split(data['examples'])
        changed = 0
        for row in data['examples']:
            if split['families'][row['family']] == 'test':
                row['label'] = 'needs-review'
                row['uncertain'] = True
                changed += 1
        self.assertGreater(changed, 0)
        self.assertEqual(before['categories'], evidence_audit.audit(data)['categories'])

    def test_tampered_numeric_inputs_and_duplicate_rows_are_rejected(self):
        data = v3_fixture()
        altered = copy.deepcopy(data)
        altered['examples'][0]['variant'] = 'a' * 64
        with self.assertRaises(ValueError):
            evidence_audit.audit(altered)
        data['examples'].append(copy.deepcopy(data['examples'][0]))
        with self.assertRaises(ValueError):
            evidence_audit.audit(data)

    def test_unknown_inputs_are_not_promoted_by_matching_known_examples(self):
        data = v3_fixture()
        engine = load_engine()
        split = engine.frozen_split(data['examples'])
        row = next(r for r in data['examples'] if split['families'][r['family']] == 'train' and r['label'] in evidence_audit.LABELS)
        unknown = copy.deepcopy(row)
        unknown.update(label='needs-review', uncertain=True)
        data['examples'].append(unknown)
        result = evidence_audit.audit(data)['categories'][row['category']]
        self.assertGreaterEqual(result['uncertainInputs'], 1)
