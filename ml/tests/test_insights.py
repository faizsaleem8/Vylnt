import json
import tempfile
import unittest
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import insights
from export_boundary_parity import export as boundary_parity


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
    def test_boundary_reference_is_reproducible_for_all_categories_and_lengths(self):
        expected = json.loads((Path(__file__).resolve().parents[1] / 'fixtures/evidence-lstm-boundary-parity.json').read_text())
        actual = boundary_parity()
        self.assertEqual(len(actual['cases']), 32)
        for a, b in zip(actual['cases'], expected['cases']):
            self.assertEqual(a['sequence'], b['sequence'])
            self.assertAlmostEqual(a['rawScore'], b['rawScore'], delta=1e-6)

    def test_collection_plan_reports_transitive_family_links_and_missing_reviews(self):
        data = fixture()
        a, b = data['examples'][0], data['examples'][1]
        bridge = insights.digest('bridge-family')
        data['examples'].extend([dict(a, family=bridge), dict(b, family=bridge)])
        brief = insights.collection_plan(data)
        component = next(c for c in brief['components'] if bridge in c['families'])
        self.assertEqual(set(component['families']), {a['family'], b['family'], bridge})
        self.assertEqual(brief['independentInputComponents'], 99)
        self.assertTrue(brief['reviewedApplicationDataMissing'])
        self.assertEqual(brief['testFamilyDeficit'], 10)
        self.assertEqual(brief['categories']['JS-002']['testDeficits']['contextual']['examples'], 30)
        self.assertEqual(brief['datasetHash'], insights.digest(data))

    def test_collection_plan_preserves_conflicts_without_changing_data(self):
        data = fixture()
        target = data['examples'][0]
        data['examples'].append(dict(target, label='needs-review'))
        original = insights.digest(data)
        brief = insights.collection_plan(data)
        self.assertEqual(brief['unobservableConflicts'][0]['variant'], target['variant'])
        self.assertEqual(insights.digest(data), original)

    def test_family_intervals_are_reproducible_paired_and_do_not_count_rows_as_families(self):
        rows = fixture()['examples'][:12]
        predictions = [r['label'] for r in rows]
        result = insights.family_uncertainty(rows, {'lstm': predictions, 'logistic': predictions})
        self.assertEqual(result, insights.family_uncertainty(rows, {'lstm': predictions, 'logistic': predictions}))
        self.assertEqual(result['lstmMinusComparator']['logistic']['precision']['interval95'], [0, 0])
        correlated = [dict(r, family=rows[0]['family']) for r in rows]
        tiny = insights.family_uncertainty(correlated, {'lstm': predictions})
        self.assertEqual(tiny['families'], 1)
        self.assertIsNone(tiny['metrics']['lstm']['precision']['interval95'])
        with self.assertRaises(ValueError):
            insights.family_uncertainty(rows, {'lstm': []})

    def test_family_intervals_report_undefined_metrics_instead_of_zero(self):
        rows = fixture()['examples'][:12]
        report = insights.family_uncertainty(rows, {'lstm': ['needs-review'] * len(rows)})
        self.assertIsNone(report['metrics']['lstm']['precision']['interval95'])
        self.assertEqual(report['metrics']['lstm']['precision']['definedReplicates'], 0)
        self.assertEqual(report['metrics']['lstm']['coverage']['interval95'], [0, 0])

    def test_held_out_label_changes_do_not_change_fitted_parameters(self):
        original = fixture()
        changed = json.loads(json.dumps(original))
        split = insights.frozen_split(original['examples'])
        target = next(r for r in changed['examples'] if split['families'][r['family']] == 'test')
        changed['examples'].append(dict(target, label='needs-review'))
        with tempfile.TemporaryDirectory() as tmp:
            a, b = Path(tmp) / 'a', Path(tmp) / 'b'
            insights.fit(original, a, epochs=2)
            insights.fit(changed, b, epochs=2)
            aa, bb = json.loads((a / 'model.json').read_text()), json.loads((b / 'model.json').read_text())
            for key in ['weightInput', 'weightHidden', 'biasInput', 'biasHidden', 'outputWeight', 'outputBias', 'calibration', 'thresholds', 'conflictVariants']:
                self.assertEqual(aa[key], bb[key], key)

    def test_readiness_never_claims_controlled_data_is_reviewed(self):
        result = insights.data_readiness(fixture())
        self.assertTrue(result['fitReady'])
        self.assertFalse(result['reviewedApplicationData'])
        self.assertFalse(result['categories']['HDR-001']['countAndFamilyGates'])
    def test_test_labels_cannot_train_the_conflict_safety_policy(self):
        data = fixture()
        split = insights.frozen_split(data['examples'])
        target = next(r for r in data['examples'] if split['families'][r['family']] == 'test')
        data['examples'].append(dict(target, label='needs-review'))
        audited = insights.frozen_split(insights.validate(data))
        self.assertIn(target['variant'], audited['conflicts'])
        self.assertNotIn(target['variant'], insights.development_conflicts(data['examples'], audited))
        self.assertEqual(insights.apply_safeguards([target], ['contextual'], []), ['contextual'])

    def test_disabled_thresholds_abstain_even_when_sigmoid_saturates(self):
        for value in [0, .5, 1]:
            self.assertEqual(insights.classify_score(value, {'contextual': 0, 'change': 1}), 'needs-review')

    def test_candidate_parameters_are_bound_before_test(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'candidate'
            data = fixture()
            insights.fit(data, output, epochs=2)
            artifact = json.loads((output / 'model.json').read_text())
            artifact['thresholds'] = {'contextual': .1, 'change': .9}
            (output / 'model.json').write_text(json.dumps(artifact))
            with self.assertRaisesRegex(ValueError, 'changed after training'):
                insights.evaluate(data, output)
            self.assertFalse((output / 'test-consumed.json').exists())
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
            self.assertIn('familyUncertainty', report['categories']['HDR-001'])
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
