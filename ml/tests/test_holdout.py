"""Numeric lifecycle fixtures only; never application qualification evidence."""
import copy
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import holdout as H
from test_validation import v3_fixture


def fixture():
    data = v3_fixture()
    for index, row in enumerate(data['examples']):
        row['family'] = H.E.digest(['fixture-family', index // 10])
        row['category'] = 'JS-002'
        row['sequence'][-1][-8:] = [-1] * 7 + [1]
        row['variant'] = H.E.digest(row['sequence'])
    return data


def exposure():
    return {'version': 1, 'policy': H.POLICY, 'datasets': {'0' * 64: ['fixture']}, 'candidateDatasetHashes': ['0' * 64], 'families': ['0' * 64], 'variants': ['0' * 64]}


def source_lock():
    return {'version': 1, 'applications': [{'familyId': f'upstream:fixture/app-{i}', 'repository': f'fixture/app-{i}', 'revision': 'a' * 40,
            'root': '.', 'entry': 'index.html', 'license': 'MIT', 'licenseFile': 'LICENSE', 'files': [{'path': 'index.html', 'sha256': H.E.digest(i)}, {'path': 'LICENSE'}]} for i in range(10)]}


class HoldoutTests(unittest.TestCase):
    def test_counts_and_freshness_preflight_without_inference(self):
        data = fixture()
        with patch.object(H.E.Model, 'forward', side_effect=AssertionError('No predictions')):
            self.assertTrue(H.preflight(data, exposure())['ready'])
            seen = exposure()
            seen['families'] = [data['examples'][0]['family']]
            self.assertFalse(H.preflight(data, seen)['ready'])
            renamed = copy.deepcopy(data)
            for row in renamed['examples']:
                row['family'] = H.E.digest(['renamed', row['family']])
            seen = exposure()
            seen['variants'] = [data['examples'][0]['variant']]
            self.assertFalse(H.preflight(renamed, seen)['gates']['freshInputs'])

    def test_small_duplicate_uncertain_and_wrong_category_cannot_qualify(self):
        data = fixture()
        small = copy.deepcopy(data)
        small['examples'] = small['examples'][:20]
        self.assertFalse(H.preflight(small, exposure())['ready'])
        duplicate = copy.deepcopy(data)
        duplicate['examples'].append(duplicate['examples'][0])
        with self.assertRaisesRegex(ValueError, 'Repeated resources'):
            H.preflight(duplicate, exposure())
        for row in data['examples']:
            row['uncertain'] = True
        self.assertFalse(H.preflight(data, exposure())['ready'])
        with self.assertRaises(ValueError):
            H.preflight(v3_fixture(), exposure())

    def test_conflicts_retained_and_not_used_for_eligible_counts(self):
        data = fixture()
        first = copy.deepcopy(data['examples'][0])
        first['label'] = 'contextual' if first['label'] == 'change-warranted' else 'change-warranted'
        data['examples'].append(first)
        result = H.preflight(data, exposure())
        self.assertEqual(result['conflicts'], 1)
        self.assertEqual(result['rows'], 101)
        self.assertEqual(sum(result['eligibleClassCounts'].values()), 99)

    def test_registration_binding_and_global_consumption(self):
        data, seen = fixture(), exposure()
        lock = source_lock()
        provenance = {'version': 1, 'datasetHash': H.E.digest(data), 'sourceLockHash': H.E.digest(lock), 'complete': True,
                      'families': sorted({r['family'] for r in data['examples']}), 'harnessHash': '1' * 64, 'oracleManifestHash': '2' * 64}
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            candidate = root / 'candidate'
            candidate.mkdir()
            for name in ['candidate.json', 'browser-parity.json']:
                H.V.save(candidate / name, {})
            manifest = {'datasetHash': '0' * 64, 'files': {'model.json': '3' * 64, 'category-policy.json': '4' * 64}}
            with patch.object(H, 'candidate_identity', return_value=manifest):
                a, b = root / 'a', root / 'b'
                for directory in [a, b]:
                    H.register(data, seen, candidate, lock, provenance, directory)
                changed = copy.deepcopy(data)
                changed['examples'][0]['label'] = 'needs-review'
                with self.assertRaisesRegex(ValueError, 'inputs changed'):
                    H.evaluate(changed, seen, candidate, lock, provenance, a, root / 'consumed')
                self.assertFalse((a / 'test-consumed.json').exists())
                with patch.object(H, 'predict', side_effect=RuntimeError('interrupted')):
                    with self.assertRaisesRegex(RuntimeError, 'interrupted'):
                        H.evaluate(data, seen, candidate, lock, provenance, a, root / 'consumed')
                self.assertTrue((a / 'evaluation-failed.json').exists())
                with patch.object(H, 'predict', side_effect=AssertionError('Must not repeat')):
                    with self.assertRaises(FileExistsError):
                        H.evaluate(data, seen, candidate, lock, provenance, b, root / 'consumed')

    def test_registry_includes_all_partitions_and_rejects_missing_candidate_data(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            data = fixture()
            H.V.save(root / 'dataset.json', data)
            result = H.registry(root)
            self.assertEqual(len(result['families']), 10)
            self.assertEqual(len(result['variants']), 100)
            H.V.save(root / 'candidate.json', {'version': 4, 'datasetHash': 'f' * 64})
            with self.assertRaisesRegex(ValueError, 'dataset missing'):
                H.registry(root)

    def test_renamed_templates_duplicate_counts_and_uncertainty(self):
        lock = source_lock()
        H.validate_sources(lock)
        renamed = copy.deepcopy(lock)
        renamed['applications'][0]['familyId'] = 'upstream:another/name'
        with self.assertRaises(ValueError): H.validate_sources(renamed)
        copied = copy.deepcopy(lock)
        copied['applications'][1]['files'][0]['sha256'] = copied['applications'][0]['files'][0]['sha256']
        with self.assertRaisesRegex(ValueError, 'template'): H.validate_sources(copied)
        data = fixture()
        extra = copy.deepcopy(data['examples'][0]); extra['family'] = H.E.digest('other family')
        data['examples'].append(extra)
        self.assertEqual(sum(H.preflight(data, exposure())['eligibleClassCounts'].values()), 100)
        self.assertEqual(len(H.metric_rows(data['examples'])), 100)
        extra['uncertain'] = True
        self.assertEqual(H.external_metrics([extra], ['contextual'])['insufficientEvidenceContextual'], 1)

    def test_release_requires_completed_bound_evaluation_and_original_gates(self):
        data, seen, lock = fixture(), exposure(), source_lock()
        ready = H.preflight(data, seen)
        provenance = {'version': 1, 'datasetHash': H.E.digest(data), 'sourceLockHash': H.E.digest(lock), 'complete': True,
                      'families': sorted({r['family'] for r in data['examples']}), 'harnessHash': '1' * 64, 'oracleManifestHash': '2' * 64}
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); candidate = root / 'candidate'; candidate.mkdir()
            H.V.save(candidate / 'candidate.json', {})
            H.V.save(candidate / 'browser-parity.json', {})
            H.V.save(candidate / 'model.json', {'datasetHash': '0' * 64, 'splitHash': '1' * 64})
            H.V.save(candidate / 'category-policy.json', {})
            manifest = {'datasetHash': '0' * 64, 'files': {'model.json': H.V.file_hash(candidate / 'model.json'), 'category-policy.json': H.V.file_hash(candidate / 'category-policy.json')}}
            metrics = {'sampleCount': 100, 'precision': 1, 'recall': 1, 'coverage': 1, 'insufficientEvidenceContextual': 0}
            result = {'testFamilies': 10, 'testExamples': 100, 'categories': {'JS-002': {'approved': True, 'gates': {'mechanicsFixture': True},
                'classCounts': ready['eligibleClassCounts'], 'classFamilies': ready['classFamilies'], 'afterSafeguards': metrics,
                'ruleOnly': {'precision': .5, 'recall': 1}, 'highCriticalContextual': 0}}}
            with patch.object(H, 'candidate_identity', return_value=manifest):
                evaluated = root / 'evaluation'
                H.register(data, seen, candidate, lock, provenance, evaluated)
                with self.assertRaises(FileNotFoundError):
                    H.release(data, seen, candidate, lock, provenance, evaluated, root / 'premature.json')
                with patch.object(H, 'predict', return_value=result):
                    H.evaluate(data, seen, candidate, lock, provenance, evaluated, root / 'consumed')
                packaged = H.release(data, seen, candidate, lock, provenance, evaluated, root / 'release.json')
                self.assertEqual(packaged['approvedCategories'], ['JS-002'])
                self.assertEqual(H.V.hashlib.sha256(packaged['modelJson'].encode()).hexdigest(), packaged['modelHash'])
                changed = H.read_json(evaluated / 'evaluation.json')
                changed['categories']['JS-002']['afterSafeguards']['recall'] = .94
                (evaluated / 'evaluation.json').write_text(H.json.dumps(changed), encoding='utf-8')
                with self.assertRaisesRegex(ValueError, 'altered'):
                    H.release(data, seen, candidate, lock, provenance, evaluated, root / 'tampered.json')
                receipt = H.read_json(evaluated / 'evaluation-receipt.json')
                receipt['evaluationHash'] = H.V.file_hash(evaluated / 'evaluation.json')
                (evaluated / 'evaluation-receipt.json').write_text(H.json.dumps(receipt), encoding='utf-8')
                with self.assertRaisesRegex(ValueError, 'quality gates'):
                    H.release(data, seen, candidate, lock, provenance, evaluated, root / 'failed-gates.json')


if __name__ == '__main__':
    unittest.main()
