"""Immutable external JS-002 holdout. No training or threshold selection."""
import argparse
import json
import re
from pathlib import Path
import numpy as np
import torch
import insights_v4 as V
from validation import engine_for, read_json

E = V.E
POLICY = 'vylnt-external-holdout-v1'
LABELS = ['change-warranted', 'contextual']


def evaluator_identity():
    root = Path(__file__).resolve().parent
    return E.digest({name: V.file_hash(root / name) for name in ['holdout.py', 'insights.py', 'insights_v3.py', 'insights_v4.py', 'validation.py']})


def registry(root):
    """Inventory every retained evidence dataset, including historical test data."""
    datasets, families, variants, invalid = {}, set(), set(), []
    for path in sorted(root.rglob('*dataset*.json')):
        if path.name.endswith('.audit.json'):
            continue
        data = read_json(path)
        if data.get('schemaVersion') not in ['vynlt-evidence-v2', 'vynlt-evidence-v3']:
            continue
        try:
            rows = engine_for(data).validate(data)
        except ValueError:
            invalid.append(str(path.relative_to(root)))
            continue
        identity = E.digest(data)
        datasets.setdefault(identity, []).append(str(path.relative_to(root)))
        families.update(r['family'] for r in rows)
        variants.update(r['variant'] for r in rows)
    required = set()
    for path in root.rglob('candidate.json'):
        candidate = read_json(path)
        if candidate.get('version') in [2, 3, 4] and candidate.get('datasetHash'):
            required.add(candidate['datasetHash'])
    if not datasets or required - datasets.keys():
        raise ValueError('Historical candidate dataset missing from exposure inventory')
    return {'version': 1, 'policy': POLICY, 'datasets': datasets, 'families': sorted(families), 'variants': sorted(variants),
            'candidateDatasetHashes': sorted(required), 'invalidUnboundDatasets': invalid,
            'scope': 'All retained evidence-v2/v3 datasets, including complete train/validation/test cohorts.'}


def validate_registry(exposure):
    if exposure.get('version') != 1 or exposure.get('policy') != POLICY or not exposure.get('datasets'):
        raise ValueError('Invalid exposure registry')
    for key in ['families', 'variants']:
        values = exposure.get(key)
        if not isinstance(values, list) or not values or values != sorted(set(values)) or any(
                not isinstance(v, str) or len(v) != 64 or any(c not in '0123456789abcdef' for c in v) for v in values):
            raise ValueError('Invalid exposure identities')
    if set(exposure.get('candidateDatasetHashes', [])) - exposure['datasets'].keys():
        raise ValueError('Registry omitted a historical candidate')


def preflight(data, exposure):
    rows = E.validate(data)
    validate_registry(exposure)
    if any(r['category'] != 'JS-002' or r['provenance'] != 'controlled' for r in rows):
        raise ValueError('External release scope is controlled JS-002 only')
    seen_families, seen_variants = set(exposure['families']), set(exposure['variants'])
    groups = {}
    for row in rows:
        groups.setdefault(row['variant'], set()).add(row['label'])
    conflicts = {key for key, values in groups.items() if len(values) > 1 or 'needs-review' in values}
    # No silently discarded test observations. Conflicts/unknowns remain in the cohort.
    eligible = [r for r in rows if not r['uncertain'] and r['variant'] not in conflicts and r['label'] in LABELS]
    counts = {label: len({r['variant'] for r in eligible if r['label'] == label}) for label in LABELS}
    class_families = {label: len({r['family'] for r in eligible if r['label'] == label}) for label in LABELS}
    families = {r['family'] for r in rows}
    overlap_families = families & seen_families
    overlap_variants = set(groups) & seen_variants
    eligible_families = len({r['family'] for r in eligible})
    gates = {'freshFamilies': not overlap_families, 'freshInputs': not overlap_variants,
             'tenTestFamilies': eligible_families >= 10,
             'classCounts': all(n >= 30 for n in counts.values()), 'classFamilies': all(n >= 3 for n in class_families.values())}
    deficits = ([f'{len(overlap_families)} previously exposed families'] if overlap_families else []) + ([f'{len(overlap_variants)} previously exposed numeric inputs'] if overlap_variants else [])
    if eligible_families < 10:
        deficits.append(f'{eligible_families}/10 eligible application families')
    deficits += [f'{counts[label]}/30 distinct {label} contexts' for label in LABELS if counts[label] < 30]
    deficits += [f'{class_families[label]}/3 {label} application families' for label in LABELS if class_families[label] < 3]
    return {'version': 1, 'policy': POLICY, 'datasetHash': E.digest(data), 'exposureHash': E.digest(exposure),
            'rows': len(rows), 'families': len(families), 'numericVariants': len(groups), 'conflicts': len(conflicts),
            'uncertainRows': sum(r['uncertain'] for r in rows), 'eligibleClassCounts': counts, 'classFamilies': class_families,
            'seenFamilies': sorted(overlap_families), 'seenVariants': sorted(overlap_variants),
            'eligibleFamilies': eligible_families, 'deficits': deficits, 'gates': gates, 'ready': all(gates.values()), 'testConsumed': False}


def candidate_identity(root):
    candidate = read_json(root / 'candidate.json')
    if candidate.get('version') != 4 or candidate.get('safetyPolicy') != V.POLICY or set(candidate.get('files', {})) != set(V.FILES):
        raise ValueError('Expected frozen category-policy v4 candidate')
    for name in V.FILES:
        if V.file_hash(root / name) != candidate['files'][name]:
            raise ValueError('Candidate artifact changed')
    V.verified_browser_parity(root, candidate)
    policy = read_json(root / 'category-policy.json')
    supported = [rule for rule, entry in policy['categories'].items() if entry.get('supported')]
    if supported != ['JS-002']:
        raise ValueError('Candidate scope must be JS-002 only')
    return candidate


def validate_sources(lock):
    applications = lock.get('applications', [])
    if lock.get('version') != 1 or not 10 <= len(applications) <= 30:
        raise ValueError('Expected 10..30 independent pinned holdout applications')
    families, entries = set(), set()
    for app in applications:
        repo = app.get('repository', '')
        if (not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+', repo)
                or app.get('familyId') != 'upstream:' + repo.lower() or app['familyId'] in families
                or app.get('license') != 'MIT' or not re.fullmatch(r'[a-f0-9]{40}', app.get('revision', ''))):
            raise ValueError('Duplicate/renamed family or invalid pinned source')
        families.add(app['familyId'])
        files = app.get('files', [])
        entry = app.get('entry') if app.get('root') == '.' else app.get('root', '') + '/' + app.get('entry', '')
        match = next((f for f in files if f.get('path') == entry), None)
        if not match or not any(f.get('path') == app.get('licenseFile') for f in files) or not re.fullmatch(r'[a-f0-9]{64}', match.get('sha256', '')) or match['sha256'] in entries:
            raise ValueError('Missing source/licence or duplicate entry template')
        entries.add(match['sha256'])


def register(data, exposure, candidate_root, source_lock, provenance, output):
    candidate = candidate_identity(candidate_root)
    ready = preflight(data, exposure)
    if not ready['ready']:
        raise ValueError('Fresh holdout preflight failed; inspect counts and overlap before registering')
    if candidate['datasetHash'] not in exposure['datasets']:
        raise ValueError('Candidate development data absent from exposure registry')
    validate_sources(source_lock)
    if (provenance.get('version') != 1 or provenance.get('datasetHash') != E.digest(data)
            or provenance.get('sourceLockHash') != E.digest(source_lock) or provenance.get('complete') is not True
            or provenance.get('families') != sorted({r['family'] for r in data['examples']})
            or len(provenance['families']) > len(source_lock['applications'])
            or not provenance.get('harnessHash') or not provenance.get('oracleManifestHash')):
        raise ValueError('Missing complete collection/provenance binding')
    output.mkdir(parents=True, exist_ok=False)
    result = {'version': 1, 'policy': POLICY, 'category': 'JS-002', 'candidateHash': V.file_hash(candidate_root / 'candidate.json'),
              'modelHash': candidate['files']['model.json'], 'categoryPolicyHash': candidate['files']['category-policy.json'],
              'datasetHash': E.digest(data), 'exposureHash': E.digest(exposure), 'sourceLockHash': E.digest(source_lock),
              'provenanceHash': E.digest(provenance), 'browserParityHash': V.file_hash(candidate_root / 'browser-parity.json'),
              'evaluatorHash': evaluator_identity(), 'thresholdSelection': 'frozen-development-validation-only', 'scope': 'Controlled local JS-002 configurations on pinned independent interactive applications/demos'}
    V.save(output / 'registration.json', result)
    V.save(output / 'preflight.json', ready)
    return result


def evaluate(data, exposure, candidate_root, source_lock, provenance, output, consumed_root):
    candidate = candidate_identity(candidate_root)
    registered = read_json(output / 'registration.json')
    expected = {'candidateHash': V.file_hash(candidate_root / 'candidate.json'), 'modelHash': candidate['files']['model.json'],
                'categoryPolicyHash': candidate['files']['category-policy.json'], 'datasetHash': E.digest(data),
                'exposureHash': E.digest(exposure), 'sourceLockHash': E.digest(source_lock), 'provenanceHash': E.digest(provenance),
                'browserParityHash': V.file_hash(candidate_root / 'browser-parity.json'), 'evaluatorHash': evaluator_identity()}
    if registered.get('policy') != POLICY or registered.get('category') != 'JS-002' or any(registered.get(k) != v for k, v in expected.items()):
        raise ValueError('Registered external holdout inputs changed')
    ready = preflight(data, exposure)
    if not ready['ready']:
        raise ValueError('Holdout no longer eligible')
    consumed_root.mkdir(parents=True, exist_ok=True)
    marker = {'version': 1, **expected, 'registrationHash': V.file_hash(output / 'registration.json'), 'status': 'consumed-before-inference'}
    if (consumed_root / ('dataset-' + expected['datasetHash'] + '.json')).exists():
        raise FileExistsError('This external dataset was already consumed by an experiment')
    # Global to the installation: changing the output folder cannot rerun this candidate.
    V.save(consumed_root / (expected['candidateHash'] + '.json'), marker)
    V.save(consumed_root / ('dataset-' + expected['datasetHash'] + '.json'), marker)
    V.save(output / 'test-consumed.json', marker)
    try:
        result = predict(data, candidate_root, ready)
        result.update({'version': 1, 'policy': POLICY, **expected, 'registrationHash': marker['registrationHash'],
                       'provenance': 'controlled', 'scope': registered['scope'], 'testConsumed': True,
                       'approvedCategories': ['JS-002'] if result['categories']['JS-002']['approved'] else []})
        V.save(output / 'evaluation.json', result)
        V.save(output / 'evaluation-receipt.json', {'version': 1, **expected, 'registrationHash': marker['registrationHash'], 'evaluationHash': V.file_hash(output / 'evaluation.json')})
        return result
    except BaseException:
        V.save(output / 'evaluation-failed.json', {'status': 'interrupted-or-failed-after-consumption', 'testConsumed': True, **expected})
        raise


def predict(data, root, ready):
    artifact, comparator, policy = [read_json(root / name) for name in ['model.json', 'logistic.json', 'category-policy.json']]
    model = E.Model()
    keys = {'lstm.weight_ih_l0': 'weightInput', 'lstm.weight_hh_l0': 'weightHidden', 'lstm.bias_ih_l0': 'biasInput', 'lstm.bias_hh_l0': 'biasHidden'}
    state = {key: torch.tensor(artifact[name]) for key, name in keys.items()}
    state.update({'output.weight': torch.tensor([artifact['outputWeight']]), 'output.bias': torch.tensor([artifact['outputBias']])})
    model.load_state_dict(state)
    model.eval()
    torch.set_num_threads(1)
    all_rows = data['examples']
    inputs = list({r['variant']: r for r in all_rows}.values())
    # Infer once per numeric input; keep every family link for clustered uncertainty.
    with torch.no_grad():
        logits = model(inputs).numpy()
    x = (np.array([E.flatten(r) for r in inputs]) - comparator['mean']) / comparator['scale']
    logistic_logits = x @ comparator['weight'] + comparator['bias']
    predictions = {r['variant']: V.decision(float(v), r['category'], policy) for r, v in zip(inputs, logits)}
    logistic_predictions = {r['variant']: V.decision(float(v), r['category'], policy, True) for r, v in zip(inputs, logistic_logits)}
    rows = metric_rows(all_rows)
    raw = [predictions[r['variant']] for r in rows]
    lp = [logistic_predictions[r['variant']] for r in rows]
    # Only development conflicts may inform model safeguards. Test conflicts remain measured.
    safe, lsafe = [E.apply_safeguards(rows, p, artifact['conflictVariants']) for p in [raw, lp]]
    model_only, guarded, baseline = [external_metrics(rows, p) for p in [raw, safe, ['change-warranted'] * len(rows)]]
    high = sum(r['label'] == 'change-warranted' and r['severity'] in ['high', 'critical'] and p == 'contextual' for r, p in zip(rows, raw))
    gates = {**ready['gates'], 'precision': (guarded['precision'] or 0) >= .9, 'recall': (guarded['recall'] or 0) >= .95,
             'coverage': guarded['coverage'] >= .5, 'noHighCriticalContextual': high == 0,
             'noInsufficientEvidenceDeemphasis': guarded['insufficientEvidenceContextual'] == 0,
             'ruleComparator': (guarded['precision'] or 0) > (baseline['precision'] or 0) and (guarded['recall'] or 0) >= (baseline['recall'] or 0) - .05}
    category = {'modelOnly': model_only, 'afterSafeguards': guarded, 'logistic': {'modelOnly': external_metrics(rows, lp), 'afterSafeguards': external_metrics(rows, lsafe)},
                'ruleOnly': baseline, 'highCriticalContextual': high, 'classCounts': ready['eligibleClassCounts'], 'classFamilies': ready['classFamilies'],
                'gates': gates, 'approved': all(gates.values()), 'familyUncertainty': {
                    'modelOnly': E.family_uncertainty(all_rows, {'lstm': [predictions[r['variant']] for r in all_rows], 'logistic': [logistic_predictions[r['variant']] for r in all_rows], 'ruleOnly': ['change-warranted'] * len(all_rows)}),
                    'afterSafeguards': E.family_uncertainty(all_rows, {'lstm': E.apply_safeguards(all_rows, [predictions[r['variant']] for r in all_rows], artifact['conflictVariants']), 'logistic': E.apply_safeguards(all_rows, [logistic_predictions[r['variant']] for r in all_rows], artifact['conflictVariants']), 'ruleOnly': ['change-warranted'] * len(all_rows)})}}
    return {'testFamilies': ready['families'], 'testExamples': len(all_rows), 'metricExamples': len(rows), 'numericVariants': ready['numericVariants'], 'categories': {'JS-002': category}}


def external_metrics(rows, predictions):
    result = E.metrics(rows, predictions)
    result['insufficientEvidenceContextual'] = sum((r['uncertain'] or r['label'] == 'needs-review') and p == 'contextual' for r, p in zip(rows, predictions))
    return result


def metric_rows(rows):
    """Equivalent inputs cannot inflate quality counts, even across applications."""
    unique = {}
    severity = {'info': 0, 'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
    for row in rows:
        key = (row['variant'], row['label'], row['uncertain'])
        if key not in unique or severity[row['severity']] > severity[unique[key]['severity']]:
            unique[key] = row
    return list(unique.values())


def release(data, exposure, candidate_root, source_lock, provenance, evaluated, output):
    """Package only a completed, hash-bound passing evaluation; never run inference."""
    candidate = candidate_identity(candidate_root)
    validate_sources(source_lock)
    result = read_json(evaluated / 'evaluation.json')
    registration = read_json(evaluated / 'registration.json')
    receipt = read_json(evaluated / 'evaluation-receipt.json')
    consumed = read_json(evaluated / 'test-consumed.json')
    ready = preflight(data, exposure)
    expected = {'candidateHash': V.file_hash(candidate_root / 'candidate.json'), 'modelHash': candidate['files']['model.json'],
                'categoryPolicyHash': candidate['files']['category-policy.json'], 'datasetHash': E.digest(data),
                'exposureHash': E.digest(exposure), 'sourceLockHash': E.digest(source_lock), 'provenanceHash': E.digest(provenance),
                'browserParityHash': V.file_hash(candidate_root / 'browser-parity.json'), 'evaluatorHash': evaluator_identity()}
    if (not ready['ready'] or (evaluated / 'evaluation-failed.json').exists()
            or any(record.get(key) != value for record in [result, registration, receipt, consumed] for key, value in expected.items())
            or receipt.get('evaluationHash') != V.file_hash(evaluated / 'evaluation.json')
            or any(record.get('registrationHash') != V.file_hash(evaluated / 'registration.json') for record in [result, receipt, consumed])
            or result.get('policy') != POLICY or result.get('testConsumed') is not True or result.get('provenance') != 'controlled'
            or result.get('approvedCategories') != ['JS-002'] or set(result.get('categories', {})) != {'JS-002'}):
        raise ValueError('Incomplete, altered, mismatched or failed external evaluation')
    c = result['categories']['JS-002']
    m, rule = c['afterSafeguards'], c['ruleOnly']
    if (not c.get('approved') or not all(c['gates'].values()) or c['classCounts'] != ready['eligibleClassCounts']
            or c['classFamilies'] != ready['classFamilies'] or result['testFamilies'] != ready['families']
            or result['testExamples'] != len(data['examples']) or m['sampleCount'] != len(metric_rows(data['examples']))
            or (m['precision'] or 0) < .9 or (m['recall'] or 0) < .95 or m['coverage'] < .5
            or c['highCriticalContextual'] != 0 or m['insufficientEvidenceContextual'] != 0
            or (m['precision'] or 0) <= (rule['precision'] or 0) or (m['recall'] or 0) < (rule['recall'] or 0) - .05):
        raise ValueError('Category quality gates did not pass')
    artifact = read_json(candidate_root / 'model.json')
    packaged = {'qualificationPolicy': 'vylnt-controlled-category-release-v1', 'name': 'VYLNT script integrity / controlled qualification',
                'modelJson': (candidate_root / 'model.json').read_bytes().decode('utf-8'), 'modelHash': expected['modelHash'],
                'categoryPolicyJson': (candidate_root / 'category-policy.json').read_bytes().decode('utf-8'), 'categoryPolicyHash': expected['categoryPolicyHash'],
                'candidateHash': expected['candidateHash'], 'evaluationHash': receipt['evaluationHash'], 'registrationHash': receipt['registrationHash'],
                'holdoutHash': expected['datasetHash'], 'exposureHash': expected['exposureHash'], 'sourceLockHash': expected['sourceLockHash'],
                'harnessHash': provenance['harnessHash'], 'parityHash': expected['browserParityHash'], 'datasetHash': artifact['datasetHash'], 'splitHash': artifact['splitHash'],
                'testedScope': f"{ready['families']} fresh pinned MIT application families, {len(data['examples'])} controlled JS-002 evidence contexts; locally imposed script/CSP scenarios only",
                'approvedCategories': ['JS-002'], 'categories': {'JS-002': {'changeCount': c['classCounts']['change-warranted'], 'contextualCount': c['classCounts']['contextual'],
                    'changeFamilies': c['classFamilies']['change-warranted'], 'contextualFamilies': c['classFamilies']['contextual'],
                    'precision': m['precision'], 'recall': m['recall'], 'coverage': m['coverage'], 'highCriticalContextual': c['highCriticalContextual'],
                    'insufficientEvidenceContextual': m['insufficientEvidenceContextual'], 'rulePrecision': rule['precision'], 'ruleRecall': rule['recall'], 'testFamilies': ready['families']}}}
    output.parent.mkdir(parents=True, exist_ok=True)
    V.save(output, packaged)
    return packaged


def main():
    p = argparse.ArgumentParser()
    p.add_argument('command', choices=['registry', 'preflight', 'register', 'evaluate', 'release'])
    p.add_argument('--evaluation', help='Completed external evaluation directory; release only')
    p.add_argument('--root', default='.local')
    for name in ['dataset', 'exposure', 'candidate', 'source-lock', 'provenance']:
        p.add_argument('--' + name)
    p.add_argument('--output', required=True)
    a = p.parse_args()
    output = Path(a.output)
    if a.command == 'registry':
        output.parent.mkdir(parents=True, exist_ok=True)
        V.save(output, registry(Path(a.root)))
        return
    data, exposure = read_json(Path(a.dataset)), read_json(Path(a.exposure))
    if a.command == 'preflight':
        output.parent.mkdir(parents=True, exist_ok=True)
        result = preflight(data, exposure)
        V.save(output, result)
        print(json.dumps({k: result[k] for k in ['ready', 'families', 'eligibleFamilies', 'eligibleClassCounts', 'deficits', 'gates']}))
        raise SystemExit(0 if result['ready'] else 1)
    args = (data, exposure, Path(a.candidate), read_json(Path(a.source_lock)), read_json(Path(a.provenance)), output)
    if a.command == 'release':
        release(*args[:-1], Path(a.evaluation), output)
    elif a.command == 'register':
        register(*args)
    else:
        result = evaluate(*args, Path('.local/ml-holdout/consumed'))
        print(json.dumps({'approvedCategories': result['approvedCategories'], 'testFamilies': result['testFamilies']}))
        raise SystemExit(0 if result['approvedCategories'] else 1)


if __name__ == '__main__':
    main()
