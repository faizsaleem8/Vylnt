"""Read-only qualification audit. Never fits a model or predicts on test examples.

Historical evaluation metrics are checked for consistency, not re-measured. The
only inference here is on development partitions. A successful audit is distinct
from satisfying quality gates and cannot stage a model release.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import numpy as np
import torch
import insights
from insights_v3 import load_engine

FILES = ['model.json', 'logistic.json', 'parity.json', 'training.json']
LABELS = ['change-warranted', 'contextual']


def read_json(path, maximum=64 * 1024 * 1024):
    if path.stat().st_size > maximum:
        raise ValueError('Input exceeds size limit')
    return json.loads(path.read_text(encoding='utf-8'),
                      parse_constant=lambda _: (_ for _ in ()).throw(ValueError('Non-finite JSON number')))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def engine_for(data):
    if data.get('schemaVersion') == 'vynlt-evidence-v3':
        return load_engine()
    if data.get('schemaVersion') == insights.VERSION:
        return insights
    raise ValueError('Unsupported evidence schema')


def preflight(engine, data):
    readiness = engine.data_readiness(data)
    brief = engine.collection_plan(data)
    categories = {}
    for rule in engine.RULES:
        counts = readiness['categories'][rule]
        development = brief['categories'][rule]['developmentClasses']
        gates = {
            'trainingClasses': all(development['train'][label] > 0 for label in LABELS),
            'validationClasses': all(development['validation'][label] > 0 for label in LABELS),
            'tenTestFamilies': readiness['tenTestFamilies'],
            'classCounts': all(counts['testCounts'][label] >= 30 for label in LABELS),
            'classFamilies': all(counts['testClassFamilies'][label] >= 3 for label in LABELS),
            'provenance': not brief['requiredProvenanceMissing'],
        }
        categories[rule] = {**counts, 'developmentClasses': development,
                            'testDeficits': brief['categories'][rule]['testDeficits'],
                            'gates': gates, 'readyForQualificationTest': all(gates.values())}
    return {'datasetHash': readiness['datasetHash'], 'splitHash': readiness['splitHash'],
            'provenance': readiness['provenance'], 'requiredProvenance': engine.REQUIRED_PROVENANCE,
            'partitions': readiness['partitions'], 'uniqueInputVariants': readiness['uniqueInputVariants'],
            'conflictingVariants': readiness['auditedConflictVariants'],
            'developmentConflictingVariants': readiness['developmentConflictVariants'],
            'independentInputComponents': brief['independentInputComponents'],
            'fitReady': readiness['fitReady'], 'testFamilyDeficit': brief['testFamilyDeficit'],
            'categories': categories,
            'readyCategories': [rule for rule, value in categories.items() if value['readyForQualificationTest']]}


def bound_candidate(engine, data, root):
    rows = engine.validate(data)
    split = engine.frozen_split(rows)
    candidate = read_json(root / 'candidate.json')
    identities = {'datasetHash': engine.digest(data), 'splitHash': engine.digest(split)}
    if (candidate.get('version') != engine.CANDIDATE_POLICY_VERSION
            or candidate.get('safetyPolicy') != engine.SAFETY_POLICY
            or any(candidate.get(key) != value for key, value in identities.items())
            or set(candidate.get('files', {})) != set(FILES)):
        raise ValueError('Candidate policy or dataset/split identity mismatch')
    if any(sha(root / name) != candidate['files'][name] for name in FILES):
        raise ValueError('Candidate artifact changed after freezing')
    if read_json(root / 'split.json') != split or read_json(root / 'frozen-input.json') != identities:
        raise ValueError('Frozen split/input mismatch')
    model = read_json(root / 'model.json', 128 * 1024)
    if (model.get('schemaVersion') != engine.VERSION or model.get('featureNames') != engine.FEATURES
            or model.get('provenance') != rows[0]['provenance']
            or any(model.get(key) != value for key, value in identities.items())
            or model.get('conflictVariants') != engine.development_conflicts(rows, split)):
        raise ValueError('Model metadata or development-only safety policy mismatch')
    training = read_json(root / 'training.json')
    ready = engine.data_readiness(data)
    if (training.get('train') != ready['partitions']['train']['eligibleBinaryExamples']
            or training.get('validation') != ready['partitions']['validation']['eligibleBinaryExamples']
            or training.get('testEvaluated') is not False
            or training.get('safetyPolicy') != engine.SAFETY_POLICY):
        raise ValueError('Training provenance disagrees with frozen development partitions')
    return model, split, candidate


def check_metric(value, rows, engine):
    n = len(rows)
    positives = sum(r['label'] == 'change-warranted' for r in rows)
    unknown = sum(r['label'] == 'needs-review' for r in rows)
    if value.get('sampleCount') != n or value.get('uncertainExamples') != unknown:
        raise ValueError('Evaluation sample counts disagree with frozen dataset')
    for key in ['precision', 'recall', 'coverage']:
        number = value.get(key)
        if number is None:
            if key == 'coverage' or (key == 'recall' and positives):
                raise ValueError('Missing evaluation rate')
        elif type(number) not in (int, float) or not math.isfinite(number) or not 0 <= number <= 1:
            raise ValueError('Invalid evaluation rate')
        interval = value.get(key + '95')
        if number is None or (key == 'coverage' and n == 0):
            if interval is not None:
                raise ValueError('Undefined metric has an uncertainty interval')
        elif (not isinstance(interval, list) or len(interval) != 2
              or any(type(x) not in (int, float) or not math.isfinite(x) or not 0 <= x <= 1 for x in interval)
              or interval[0] > number + 1e-12 or interval[1] < number - 1e-12):
            raise ValueError('Missing or invalid uncertainty interval')
    for key, limit in [('contextualMisclassification', positives), ('insufficientEvidenceContextual', unknown)]:
        if type(value.get(key)) is not int or not 0 <= value[key] <= limit:
            raise ValueError('Invalid contextual error count')
    # These denominators are known without rerunning any held-out prediction.
    for key, denominator in [('recall', positives), ('coverage', n)]:
        if denominator:
            numerator = value[key] * denominator
            if not math.isclose(numerator, round(numerator), abs_tol=1e-8):
                raise ValueError('Evaluation rate cannot arise from its sample count')
            expected = engine.wilson(round(numerator), denominator)
            if any(not math.isclose(a, b, abs_tol=1e-8) for a, b in zip(expected, value[key + '95'])):
                raise ValueError('Evaluation uncertainty interval disagrees with counts')
    tp = round((value['recall'] or 0) * positives)
    precision = value['precision']
    if precision is None:
        called = 0
        if tp:
            raise ValueError('Undefined precision with positive true positives')
    else:
        possible = [tp / precision] if precision else range(1, n + 1)
        called = next((round(count) for count in possible
                       if 1 <= count <= n and math.isclose(count, round(count), abs_tol=1e-8)
                       and (precision != 0 or tp == 0)
                       and all(math.isclose(a, b, abs_tol=1e-8) for a, b in zip(engine.wilson(tp, round(count)), value['precision95']))), None)
        if called is None:
            raise ValueError('Precision/interval cannot arise from the recorded counts')
    known = round(value['coverage'] * n)
    if (called > known or called - tp > n - positives
            or value['contextualMisclassification'] > positives - tp
            or value['contextualMisclassification'] + value['insufficientEvidenceContextual'] > known - called):
        raise ValueError('Inconsistent confusion counts')


def check_family_intervals(value, rows):
    families = len({r['family'] for r in rows})
    if set(value) != {'modelOnly', 'afterSafeguards'}:
        raise ValueError('Missing raw/guarded family uncertainty')
    for group in value.values():
        repetitions = group.get('repetitions')
        if (group.get('method') != 'paired-application-family-percentile-v1'
                or group.get('seed') != 42 or group.get('families') != families
                or type(repetitions) is not int or not 100 <= repetitions <= 10000):
            raise ValueError('Invalid family uncertainty scope/policy')
        for field, names, low, high in [('metrics', {'lstm', 'logistic', 'ruleOnly'}, 0, 1),
                                       ('lstmMinusComparator', {'logistic', 'ruleOnly'}, -1, 1)]:
            if set(group.get(field, {})) != names:
                raise ValueError('Missing paired uncertainty comparator')
            for metrics in group[field].values():
                if set(metrics) != {'precision', 'recall', 'coverage'}:
                    raise ValueError('Missing family uncertainty metric')
                for entry in metrics.values():
                    count, interval = entry.get('definedReplicates'), entry.get('interval95')
                    if type(count) is not int or not 0 <= count <= repetitions:
                        raise ValueError('Invalid bootstrap replicate count')
                    if families < 2 and count != 0:
                        raise ValueError('Single-family bootstrap cannot report independent replicates')
                    if count < .95 * repetitions:
                        if interval is not None:
                            raise ValueError('Unstable bootstrap interval must remain undefined')
                    elif (not isinstance(interval, list) or len(interval) != 2
                          or any(type(x) not in (int, float) or not math.isfinite(x) or not low <= x <= high for x in interval)
                          or interval[0] > interval[1]):
                        raise ValueError('Invalid family uncertainty interval')


def audit_evaluation(engine, data, root, candidate, split):
    path = root / 'evaluation.json'
    if not path.exists():
        return {'status': 'not-evaluated', 'categories': {}, 'approvedCategories': []}
    evaluation = read_json(path)
    marker = read_json(root / 'test-consumed.json')
    identity = {'candidateHash': sha(root / 'candidate.json'),
                'modelHash': candidate['files']['model.json'], 'datasetHash': engine.digest(data)}
    if marker != identity or any(evaluation.get(k) != v for k, v in {**identity, 'splitHash': engine.digest(split)}.items()):
        raise ValueError('Evaluation or test-consumption identity mismatch')
    test = [r for r in data['examples'] if split['families'][r['family']] == 'test']
    families = len({r['family'] for r in test})
    if (evaluation.get('evaluationVersion') != engine.EVALUATION_POLICY_VERSION
            or evaluation.get('safetyPolicy') != engine.SAFETY_POLICY
            or evaluation.get('provenance') != data['examples'][0]['provenance']
            or evaluation.get('testFamilies') != families
            or set(evaluation.get('categories', {})) != set(engine.RULES)):
        raise ValueError('Evaluation policy, provenance or family scope mismatch')
    categories = {}
    for rule in engine.RULES:
        result = evaluation['categories'][rule]
        rows = [r for r in test if r['category'] == rule]
        counts = {label: sum(r['label'] == label for r in rows) for label in LABELS}
        class_families = {label: len({r['family'] for r in rows if r['label'] == label}) for label in LABELS}
        if result.get('classCounts') != counts or result.get('classFamilies') != class_families:
            raise ValueError('Evaluation class counts/families disagree with frozen dataset')
        raw, safe, comparator = [result[key] for key in ['modelOnly', 'afterSafeguards', 'ruleOnly']]
        for metrics in [raw, safe, comparator, result['logistic']['modelOnly'], result['logistic']['afterSafeguards']]:
            check_metric(metrics, rows, engine)
        if comparator != engine.metrics(rows, ['change-warranted'] * len(rows)):
            raise ValueError('Rule-only comparator mismatch')
        high = result.get('highCriticalContextual')
        if type(high) is not int or not 0 <= high <= min(raw['contextualMisclassification'], sum(r['label'] == 'change-warranted' and r['severity'] in ['high', 'critical'] for r in rows)):
            raise ValueError('Invalid high/critical safety count')
        if any(safe[k] > raw[k] + 1e-12 for k in ['coverage', 'contextualMisclassification', 'insufficientEvidenceContextual']):
            raise ValueError('Abstention safeguards cannot increase calls or contextual errors')
        gates = {'tenTestFamilies': families >= 10,
                 'classCounts': all(counts[k] >= 30 for k in LABELS),
                 'classFamilies': all(class_families[k] >= 3 for k in LABELS),
                 'precision': (safe['precision'] or 0) >= .9,
                 'recall': (safe['recall'] or 0) >= .95, 'coverage': safe['coverage'] >= .5,
                 'noHighCriticalContextual': high == 0,
                 'noInsufficientEvidenceDeemphasis': safe['insufficientEvidenceContextual'] == 0,
                 'ruleComparator': (safe['precision'] or 0) > (comparator['precision'] or 0) and (safe['recall'] or 0) >= (comparator['recall'] or 0) - .05,
                 ('reviewedApplicationScope' if engine.REQUIRED_PROVENANCE == 'human-reviewed' else 'controlledApplicationScope'): evaluation['provenance'] == engine.REQUIRED_PROVENANCE}
        if result.get('gates') != gates or result.get('approved') is not all(gates.values()):
            raise ValueError('Recorded approval/gates disagree with measured summary')
        check_family_intervals(result.get('familyUncertainty', {}), rows)
        categories[rule] = {'modelOnly': raw, 'afterSafeguards': safe, 'ruleOnly': comparator,
                            'logistic': result['logistic'], 'failedGates': [k for k, passed in gates.items() if not passed],
                            'familyUncertainty': result['familyUncertainty'],
                            'approved': all(gates.values())}
    return {'status': 'record-consistent', 'evaluationHash': sha(path),
            'testPredictionsRerun': False, 'categories': categories,
            'approvedCategories': [k for k, v in categories.items() if v['approved']],
            'limitation': 'Historical summary consistency only; not a new holdout evaluation, signature, or independent verification of the reported predictions.'}


def development_diagnostics(engine, data, model, split, logistic):
    """All predictions are restricted to training and validation, including conflicts."""
    torch.set_num_threads(1)
    network = engine.Model()
    names = {'lstm.weight_ih_l0': 'weightInput', 'lstm.weight_hh_l0': 'weightHidden',
             'lstm.bias_ih_l0': 'biasInput', 'lstm.bias_hh_l0': 'biasHidden'}
    state = {key: torch.tensor(model[name]) for key, name in names.items()}
    state.update({'output.weight': torch.tensor([model['outputWeight']]), 'output.bias': torch.tensor([model['outputBias']])})
    network.load_state_dict(state)
    network.eval()
    result = {}
    for part in ['train', 'validation']:
        rows = [r for r in data['examples'] if split['families'][r['family']] == part]
        if not rows:
            result[part] = {'examples': 0, 'categories': {}}
            continue
        with torch.no_grad():
            scores = torch.sigmoid(network(rows) / model['calibration']['temperature']).numpy()
        raw = [engine.classify_score(float(s), model['thresholds']) for s in scores]
        safe = engine.apply_safeguards(rows, raw, model['conflictVariants'])
        x = (np.array([engine.flatten(r) for r in rows]) - logistic['mean']) / logistic['scale']
        ls = 1 / (1 + np.exp(-np.clip((x @ logistic['weight'] + logistic['bias']) / logistic['calibration']['temperature'], -40, 40)))
        lp = [engine.classify_score(float(s), logistic['thresholds']) for s in ls]
        categories = {}
        for rule in engine.RULES:
            ids = [i for i, row in enumerate(rows) if row['category'] == rule]
            rr = [rows[i] for i in ids]
            categories[rule] = {'modelOnly': engine.metrics(rr, [raw[i] for i in ids]),
                                'afterSafeguards': engine.metrics(rr, [safe[i] for i in ids]),
                                'logistic': engine.metrics(rr, engine.apply_safeguards(rr, [lp[i] for i in ids], model['conflictVariants']))}
        result[part] = {'examples': len(rows), 'categories': categories}
    return {'partitions': result, 'testPredictions': 0, 'parametersChanged': False,
            'limitation': 'Development diagnostics include ambiguous/conflicting examples excluded from fitting; these results are not held-out accuracy.'}


def audit(data, root=None):
    engine = engine_for(data)
    result = {'version': 1, 'schemaVersion': engine.VERSION, 'preflight': preflight(engine, data),
              'releasePromoted': False, 'testConsumedByAudit': False}
    if root is not None:
        model, split, candidate = bound_candidate(engine, data, root)
        result['candidate'] = {'candidateHash': sha(root / 'candidate.json'), 'modelHash': candidate['files']['model.json'],
                               'modelBytes': (root / 'model.json').stat().st_size, 'integrity': 'passed'}
        result['evaluation'] = audit_evaluation(engine, data, root, candidate, split)
        result['development'] = development_diagnostics(engine, data, model, split, read_json(root / 'logistic.json'))
    result['status'] = 'not-qualified' if not result.get('evaluation', {}).get('approvedCategories') else 'recorded-category-gates-pass'
    result['limitations'] = ['This audit cannot approve a release or attest real-application accuracy.',
                             'Controlled data stays controlled. Repeated templates and renamed families do not establish independent evidence.',
                             'New candidate tests require a preregistered untouched holdout; do not retune against published failed tests.']
    return result


def reproduce(engine, data, source, output):
    """Refit development only with the frozen recipe; never evaluate the copy."""
    bound_candidate(engine, data, source)
    training = read_json(source / 'training.json')
    epochs = training.get('epochs')
    if type(epochs) is not int or not 1 <= epochs <= 1000 or training.get('seed') != 42:
        raise ValueError('Unsupported frozen training recipe')
    engine.fit(data, output, epochs=epochs)
    model_equal = read_json(source / 'model.json') == read_json(output / 'model.json')
    logistic_equal = read_json(source / 'logistic.json') == read_json(output / 'logistic.json')
    repeated = read_json(output / 'training.json')
    training_keys = ['seed', 'epochs', 'selectedEpoch', 'validationLoss', 'conflictingVariants', 'train', 'validation', 'testEvaluated', 'safetyPolicy']
    training_equal = all(training[key] == repeated[key] for key in training_keys)
    if not model_equal or not logistic_equal or not training_equal:
        raise ValueError('Training reproduction differs from frozen model/comparator/recipe; investigate without evaluating the test')
    return {'status': 'exact-numeric-match', 'epochs': epochs, 'seed': training['seed'],
            'selectedEpoch': repeated['selectedEpoch'], 'lstmMatches': model_equal,
            'logisticMatches': logistic_equal, 'trainingSelectionMatches': training_equal,
            'testEvaluated': False,
            'environment': {key: repeated[key] for key in ['torch', 'numpy', 'python', 'sklearn']},
            'limitation': 'Reproduction on this installed runtime only; not independent accuracy or cross-platform determinism.'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset', required=True)
    parser.add_argument('--candidate')
    parser.add_argument('--output', required=True)
    parser.add_argument('--reproduce', action='store_true')
    args = parser.parse_args()
    data = read_json(Path(args.dataset))
    result = audit(data, Path(args.candidate) if args.candidate else None)
    output = Path(args.output)
    if args.reproduce:
        if not args.candidate:
            raise ValueError('Reproduction requires a frozen candidate')
        result['reproduction'] = reproduce(engine_for(data), data, Path(args.candidate), output.parent / 'reproduction')
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open('x', encoding='utf-8') as file:
        json.dump(result, file, indent=2, allow_nan=False)
    print('VYLNT ML audit completed; no model promoted and no held-out predictions rerun.')


if __name__ == '__main__':
    main()
