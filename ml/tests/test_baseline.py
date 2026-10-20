import copy
import importlib.util
import json
from pathlib import Path
import unittest
import tempfile
import subprocess
import sys

spec = importlib.util.spec_from_file_location('baseline', Path(__file__).parents[1] / 'baseline.py')
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)


def fixture():
    rows = []
    for family in range(10):
        for positive in [False, True]:
            features = {name: 0 for name in baseline.FEATURES}
            features.update({'rule_HDR-001': 1, 'severity_medium': 1, 'confidence_high': 1, 'cookie_count': .8 if positive else .1})
            n = family * 2 + int(positive) + 1
            rows.append({'schemaVersion': baseline.VERSION, 'rulesetVersion': '0.2.0', 'sampleId': f'{n:064x}', 'scanGroup': f'{n:064x}', 'siteGroup': f'{family:064x}',
                         'label': 'actionable' if positive else 'contextual', 'provenance': 'synthetic',
                         'reason': 'security-impact-confirmed' if positive else 'intended-configuration', 'features': features})
    return {'schemaVersion': baseline.VERSION, 'featureNames': baseline.FEATURES, 'examples': rows}


class BaselineTests(unittest.TestCase):
    def test_multiple_exports_merge_order_independently_and_reject_conflicts(self):
        data = fixture()
        with tempfile.TemporaryDirectory() as folder:
            paths = [Path(folder) / 'first.json', Path(folder) / 'second.json']
            for path, rows in zip(paths, [data['examples'][:10], data['examples'][10:]]):
                path.write_text(json.dumps({**data, 'examples': rows}), encoding='utf-8')
            merged = baseline.load_datasets(paths)
            self.assertEqual(merged, baseline.load_datasets(list(reversed(paths))))
            self.assertEqual(len(merged['examples']), 20)
            artifact, evaluation, groups = baseline.experiment(merged)
            self.assertFalse(artifact['liveUseApproved'])
            self.assertEqual(evaluation['trainingExamples'], 12)
            output = Path(folder) / 'trained'
            result = subprocess.run([sys.executable, str(Path(__file__).parents[1] / 'baseline.py'), '--dataset', *map(str, paths), '--output', str(output)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads((output / 'model.json').read_text())['coefficients'], artifact['coefficients'])
            self.assertIn('datasetHashFormat', json.loads((output / 'evaluation.json').read_text()))
            with self.assertRaisesRegex(ValueError, 'Duplicate'): baseline.load_datasets(paths + paths[:1])
            conflict = fixture(); conflict['examples'] = [conflict['examples'][0]]
            conflict['examples'][0].update(sampleId='f' * 64, siteGroup='e' * 64)
            paths[1].write_text(json.dumps(conflict), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'cross application'): baseline.load_datasets(paths)

    def test_group_separation_reproducibility_and_order_independence(self):
        rows = baseline.validate_dataset(fixture())
        first, reverse = baseline.split_groups(rows), baseline.split_groups(list(reversed(rows)))
        self.assertEqual(first, reverse)
        groups = [{row['siteGroup'] for row in values} for values in first.values()]
        self.assertFalse(groups[0] & groups[1] or groups[0] & groups[2] or groups[1] & groups[2])

    def test_rejects_duplicate_samples_cross_family_scans_and_unexpected_data(self):
        for mutate in [lambda rows: rows.append(copy.deepcopy(rows[0])),
                       lambda rows: rows[2].update(scanGroup=rows[0]['scanGroup']),
                       lambda rows: rows[0].update(notes='private data'),
                       lambda rows: rows[0]['features'].update(cookie_count=float('nan')),
                       lambda rows: rows[0].update(provenance='reviewed')]:
            data = fixture(); mutate(data['examples'])
            with self.assertRaises(ValueError): baseline.validate_dataset(data)

    def test_unreviewed_excluded_and_insufficient_groups_fail_closed(self):
        rows = fixture()['examples']
        row = copy.deepcopy(rows[0]); row.update(sampleId='a' * 64, scanGroup='b' * 64, label='unreviewed', reason='insufficient-evidence')
        splits = baseline.split_groups(rows + [row])
        self.assertEqual(sum(len(values) for values in splits.values()), len(rows))
        with self.assertRaises(ValueError): baseline.split_groups(rows[:4])

    def test_metrics_and_zero_denominators(self):
        self.assertEqual(baseline.metrics([1, 1, 0, 0], [1, 0, 1, 0]), {'tp': 1, 'fp': 1, 'tn': 1, 'fn': 1, 'precision': .5, 'recall': .5, 'f1': .5, 'falsePositiveRate': .5, 'falseNegativeRate': .5})
        self.assertIsNone(baseline.metrics([0], [0])['precision'])
        self.assertIsNone(baseline.metrics([0], [0])['recall'])

    def test_baseline_artifact_and_preprocessing_use_training_only(self):
        data = fixture(); splits = baseline.split_groups(data['examples'])
        validation_ids = {row['sampleId'] for name in ['validation', 'test'] for row in splits[name]}
        for row in data['examples']:
            if row['sampleId'] in validation_ids: row['features']['cookie_count'] = 1
        artifact, report, groups = baseline.experiment(data)
        index = baseline.FEATURES.index('cookie_count')
        self.assertAlmostEqual(artifact['mean'][index], .45)
        self.assertFalse(artifact['liveUseApproved'])
        self.assertEqual(set(report['evaluation']), {'validation', 'test'})
        self.assertTrue(report['experimental'])
        json.dumps([artifact, report, groups], allow_nan=False)


if __name__ == '__main__': unittest.main()
