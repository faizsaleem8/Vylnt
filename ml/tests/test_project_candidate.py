"""Synthetic mechanics only; no fixture is eligible for a release or cohort."""
import copy
import json
import tempfile
import subprocess
import sys
import os
import hmac
import hashlib
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import project_candidate as C


class ProjectCandidateTests(unittest.TestCase):
    def test_authenticated_material_preparation_counts_families_and_rejects_tampering(self):
        policy = C.read(Path('ml/project_material_policy.json'))
        features = ['target'] + ['rule_' + rule for rule in C.RULES] + sorted(set(policy['common'] + sum(policy['categories'].values(), [])))
        self.data['featureNames'] = features
        target = [-1] * len(features)
        target[features.index('target')] = target[features.index('rule_CK-001')] = 1
        rows = []
        for family in ['f0', 'f8']:
            row = {'family': family, 'category': 'CK-001', 'label': 'change-warranted', 'uncertain': False,
                   'sequence': [[-1] * len(features), target], 'evidenceRecord': family}
            row['variant'] = C.digest(row['sequence'])
            row['materialVariant'] = C.material_context.material_variant(row, features, policy)
            rows.append(row)
        self.data.update(examples=rows, countingPolicy={'version': policy['version'], 'hash': C.digest(policy)})
        self.flush()
        body = {'version': 'vylnt-native-material-registration-v1', 'sourceHash': self.data['sourceLockHash'],
                'materialPolicyHash': C.digest(policy), 'projectionCodeHash': C.digest({name: hashlib.sha256(Path(name).read_bytes()).hexdigest()
                    for name in ['packages/ml/project-material-context.ts', 'ml/project_material.py']})}
        private_key = 'mechanics-key-not-a-real-installation-secret'

        def authenticate():
            registration = {**body, 'registrationHash': hmac.new(private_key.encode(), ('native-material-development:' + json.dumps(body, sort_keys=True, separators=(',', ':'))).encode(), 'sha256').hexdigest()}
            names = ['dataset', 'split', 'audit', 'collection', 'material-policy']
            hashes = {name: hashlib.sha256((self.root / (name + '.json')).read_bytes()).hexdigest() for name in names}
            message = json.dumps([registration['registrationHash'], *hashes.values()], separators=(',', ':'))
            C.save(self.root / 'registration.json', {'version': 'vylnt-native-prepared-v2', 'registration': registration, 'fileHashes': hashes,
                'auth': hmac.new(private_key.encode(), ('prepared-native-material-datasets:' + message).encode(), 'sha256').hexdigest()})

        (self.root / 'registration.json').unlink()
        C.save(self.root / 'collection.json', {'qualification': False})
        C.save(self.root / 'material-policy.json', policy)
        authenticate()
        original_read = Path.read_text

        def bounded_key(path, *args, **kwargs):
            if path == Path('.local/insights-dataset-key'):
                return private_key
            return original_read(path, *args, **kwargs)

        with patch.object(Path, 'read_text', bounded_key):
            status, selected = C.inspect(self.root, features)
            self.assertFalse(status['ready'])
            self.assertEqual(len(selected['train']), 1)
            self.assertEqual(len(selected['validation']), 1)
            self.assertEqual(status['numericOverlapVariants'], 1)
            self.assertEqual(status['classCounts']['CK-001']['train']['change-warranted']['contexts'], 1)
            with self.assertRaisesRegex(ValueError, 'not ready'):
                C.register(self.root, features, self.root / 'candidate')
            self.assertFalse((self.root / 'candidate').exists())
            original = (self.root / 'dataset.json').read_bytes()
            (self.root / 'dataset.json').write_bytes(original + b' ')
            with self.assertRaisesRegex(ValueError, 'Authenticated'):
                C.inspect(self.root, features)
            (self.root / 'dataset.json').write_bytes(original)
            body['projectionCodeHash'] = '0' * 64
            (self.root / 'registration.json').unlink()
            authenticate()
            with self.assertRaisesRegex(ValueError, 'projection implementation'):
                C.inspect(self.root, features)

    def test_native_repetitions_cannot_multiply_training_weight(self):
        def example(scenario, variant):
            return {'scenario': scenario, 'variant': variant, 'evidenceRecord': scenario + variant}
        rows = [example('A', 'x'), example('A', 'z'), example('B', 'x'), example('C', 'x')]
        selected = C.native_representatives(rows)
        self.assertEqual(selected, C.native_representatives(list(reversed(rows))))
        self.assertEqual(len(selected), 2)
        self.assertEqual(len({r['scenario'] for r in selected}), 2)
        self.assertEqual(len({r['variant'] for r in selected}), 2)

    def setUp(self):
        parent = Path('.local/test-tmp').resolve(); parent.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(prefix='project-candidate-', dir=parent)
        self.root = Path(self.temp.name)
        self.features = ['one', 'two', 'three']
        self.data = {'schemaVersion': 'vylnt-evidence-v4', 'featureNames': self.features, 'sourceLockHash': 'a' * 64, 'examples': []}
        self.split = {'version': 'vylnt-project-development-split-v1', 'sourceLockHash': 'a' * 64, 'families': {f'f{i}': 'train' if i < 8 else 'validation' for i in range(12)}}
        self.flush()

    def tearDown(self):
        self.temp.cleanup()

    def flush(self):
        for name, value in [('dataset', self.data), ('split', self.split), ('audit', {'datasetHash': C.digest(self.data), 'ready': True}), ('registration', {'version': 'vylnt-project-registration-v1'})]:
            (self.root / (name + '.json')).write_text(json.dumps(value), encoding='utf-8')

    def row(self, family='f0', label='change-warranted', sequence=None):
        sequence = sequence or [[0, 0, 0], [1, 0, 0]]
        return {'family': family, 'category': 'HDR-001', 'label': label, 'uncertain': False, 'sequence': sequence, 'variant': C.digest(sequence)}

    def test_all_seven_category_class_deficits_block_registration(self):
        status, _ = C.inspect(self.root, self.features)
        self.assertFalse(status['ready']); self.assertEqual(len(status['deficits']), 28)
        with self.assertRaisesRegex(ValueError, 'not ready'):
            C.register(self.root, self.features, self.root / 'candidate')
        self.assertFalse((self.root / 'candidate').exists())

    def test_native_seed_format_reports_deficits_and_cannot_register_or_fit(self):
        for version in ['vylnt-native-seed-audit-v1', 'vylnt-native-seed-audit-v2']:
            with self.subTest(version=version):
                self.check_seed_refusal(version)

    def check_seed_refusal(self, version):
        (self.root / 'audit.json').write_text(json.dumps({'version': version}))
        features = self.root / 'features.json'; features.write_text(json.dumps(self.features))
        candidate = self.root / 'candidate'
        for action in ['preflight', 'register', 'fit']:
            result = subprocess.run([sys.executable, '-B', 'ml/project_candidate.py', action, '--prepared', str(self.root),
                                     '--features', str(features), '--output', str(candidate)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            if action == 'preflight':
                self.assertEqual(result.returncode, 2)
                status = json.loads(result.stdout)
                self.assertFalse(status['ready']); self.assertFalse(status['modelFitted'])
                self.assertEqual(len(status['deficits']), 8)
            else:
                self.assertIn('cannot be registered or fitted', result.stderr)
            self.assertFalse(candidate.exists())

    def test_repetition_conflict_and_cross_partition_inputs_cannot_inflate_counts(self):
        row = self.row()
        self.data['examples'] = [row, copy.deepcopy(row)]
        self.flush(); _, eligible = C.inspect(self.root, self.features)
        self.assertEqual(len(eligible['train']), 1)
        self.data['examples'].append(self.row(label='contextual'))
        self.flush(); _, eligible = C.inspect(self.root, self.features); self.assertFalse(eligible['train'])
        self.data['examples'] = [row, self.row(family='f8')]
        self.flush(); _, eligible = C.inspect(self.root, self.features); self.assertFalse(eligible['train']); self.assertFalse(eligible['validation'])

    def test_dataset_feature_variant_and_test_partition_tampering(self):
        with self.assertRaisesRegex(ValueError, 'feature'):
            C.inspect(self.root, ['wrong'])
        self.data['examples'] = [self.row()]; self.flush()
        changed = copy.deepcopy(self.data); changed['examples'][0]['variant'] = 'b' * 64
        (self.root / 'dataset.json').write_text(json.dumps(changed))
        with self.assertRaisesRegex(ValueError, 'binding'):
            C.inspect(self.root, self.features)
        self.split['families']['f8'] = 'test'; self.flush()
        with self.assertRaisesRegex(ValueError, 'test partition'):
            C.inspect(self.root, self.features)

    def test_fit_refuses_ineligible_data_before_training_marker(self):
        candidate = self.root / 'candidate'; candidate.mkdir()
        registration = {'version': C.POLICY}
        C.save(candidate / 'registration.json', registration); C.save(candidate / 'registration-digest.json', {'sha256': C.digest(registration)})
        with self.assertRaisesRegex(ValueError, 'not ready'):
            C.fit(self.root, self.features, candidate)
        self.assertFalse((candidate / 'training-started.json').exists())

    def test_temporary_optimizer_smoke_and_registration_immutability(self):
        # Mock readiness only inside this test. Real CLI gates are never relaxed.
        status, _ = C.inspect(self.root, self.features); status['ready'] = True; status['deficits'] = []
        train = [self.row(sequence=[[0, 0, 0], [1, 0, 0]]), self.row(label='contextual', sequence=[[0, 0, 0], [0, 1, 0]])]
        val = [self.row(family='f8', sequence=[[0, 0, 1], [1, 0, 0]]), self.row(family='f9', label='contextual', sequence=[[0, 0, 1], [0, 1, 0]])]
        candidate = self.root / 'candidate'
        import insights_v4 as historical
        historical_features = tuple(historical.E.FEATURES)
        with patch.object(C, 'inspect', return_value=(status, {'train': train, 'validation': val})):
            C.register(self.root, self.features, candidate, epochs=1)
            C.fit(self.root, self.features, candidate)
            self.assertEqual(tuple(historical.E.FEATURES), historical_features)
            model = C.read(candidate / 'model.json')
            self.assertEqual(model['hiddenSize'], 8); self.assertEqual(model['schemaVersion'], 'vylnt-evidence-v4')
            self.assertEqual(model['thresholds'], {'contextual': 0, 'change': 1})
            self.assertFalse(C.read(candidate / 'candidate.json')['qualification'])
            self.assertEqual(C.read(candidate / 'training.json')['testPredictions'], 0)
            self.assertLess((candidate / 'model.json').stat().st_size, 128 * 1024)
            subprocess.run(['node', 'scripts/ml-project-parity.mjs', str(candidate)], check=True, capture_output=True)
            self.assertTrue(C.read(candidate / 'javascript-parity.json')['passed'])
            self.assertTrue(C.read(candidate / 'javascript-parity.json')['categoryDecisionsChecked'])
            self.assertEqual(C.read(candidate / 'javascript-parity.json')['contractCasesChecked'], 28)
            executions = [C.read(candidate / 'javascript-parity.json')]
            for browser in filter(None, os.environ.get('VYLNT_PROJECT_PARITY_BROWSERS', '').split(',')):
                subprocess.run(['node', 'scripts/ml-project-parity.mjs', str(candidate), '--browser', browser], check=True, capture_output=True)
                self.assertTrue(C.read(candidate / ('javascript-parity-' + browser + '.json'))['categoryDecisionsChecked'])
                executions.append(C.read(candidate / ('javascript-parity-' + browser + '.json')))
            results = Path('test-results/project-candidate'); results.mkdir(parents=True, exist_ok=True)
            (results / 'decision-parity.json').write_text(json.dumps({'passed': True, 'scope': 'Deleted synthetic optimizer mechanics only; mocked readiness, no qualified category.',
                'qualification': False, 'executions': [{key: run[key] for key in ['environment', 'cases', 'decisionCases', 'contractCasesChecked', 'maximumError', 'tolerance', 'logisticChecked', 'categoryDecisionsChecked']} for run in executions]}, indent=2))
            with self.assertRaises(FileExistsError):
                C.fit(self.root, self.features, candidate)
            registration = C.read(candidate / 'registration.json'); registration['epochs'] = 2
            (candidate / 'registration.json').write_text(json.dumps(registration))
            with self.assertRaisesRegex(ValueError, 'registration changed'):
                C.fit(self.root, self.features, candidate)


if __name__ == '__main__':
    unittest.main()
