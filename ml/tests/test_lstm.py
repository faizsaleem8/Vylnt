import copy
import json
from pathlib import Path
import sys
import unittest
import torch

sys.path.insert(0, str(Path(__file__).parents[1]))
import lstm
from test_baseline import fixture as baseline_fixture


def fixture():
    flat = baseline_fixture()
    rows = []
    for original in flat['examples']:
        row = copy.deepcopy(original)
        coverage = [0] * 24; coverage[0] = 1; coverage[7] = 1
        cookie = [0] * 24; cookie[3] = 1; cookie[10] = int(row['label'] == 'actionable')
        target = [0] * 24; target[4] = 1; target[16] = 1
        row['sequence'] = [coverage, cookie, target]
        rows.append(row)
    return {'schemaVersion': lstm.VERSION, 'sequenceFeatureNames': lstm.FEATURES, 'baselineFeatureNames': flat['featureNames'], 'examples': rows}


class LstmTests(unittest.TestCase):
    def test_training_changes_weights_reduces_validation_loss_and_is_repeatable(self):
        first, evaluation, groups, parity, _ = lstm.experiment(fixture(), epochs=25)
        second = lstm.experiment(fixture(), epochs=25)[0]
        self.assertEqual(first, second)
        self.assertLess(evaluation['selectedValidationLoss'], evaluation['initialValidationLoss'])
        self.assertEqual(first['supportedRules'], ['HDR-001'])
        self.assertFalse(first['liveUseApproved'])
        sets = [set(values) for values in groups.values()]
        self.assertFalse(sets[0] & sets[1] or sets[0] & sets[2] or sets[1] & sets[2])
        self.assertTrue(any(len(row['sequence']) == 74 for row in parity['cases']))

    def test_rejects_leakage_raw_fields_bad_shapes_order_targets_and_coverage(self):
        mutations = [lambda rows: rows.append(copy.deepcopy(rows[0])),
                     lambda rows: rows[0].update(notes='secret'),
                     lambda rows: rows[2].update(scanGroup=rows[0]['scanGroup']),
                     lambda rows: rows[0]['sequence'][0].append(0),
                     lambda rows: rows[0]['sequence'].reverse(),
                     lambda rows: rows[0]['sequence'][-1].__setitem__(16, 0),
                     lambda rows: rows[0]['sequence'][0].__setitem__(7, 0),
                     lambda rows: rows[0]['sequence'][1].__setitem__(10, float('nan'))]
        for mutate in mutations:
            data = fixture(); mutate(data['examples'])
            with self.assertRaises(ValueError): lstm.validate_dataset(data)

    def test_padding_does_not_change_individual_predictions(self):
        torch.manual_seed(42)
        model = lstm.SnapshotLstm().eval()
        rows = fixture()['examples'][:2]
        rows[1]['sequence'].insert(1, rows[1]['sequence'][1][:])
        with torch.no_grad():
            together = model(rows)
            self.assertAlmostEqual(together[0].item(), model(rows[:1])[0].item(), places=6)
            self.assertAlmostEqual(together[1].item(), model(rows[1:])[0].item(), places=6)


if __name__ == '__main__':
    unittest.main()
