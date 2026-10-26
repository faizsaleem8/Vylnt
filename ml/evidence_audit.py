"""Development-only identifiability audit. Does not train, predict or qualify.

Separate from byte-bound ML-Q1 evaluator code. Output contains aggregate counts,
not private families, evidence records, source identities or numeric examples.
"""
import argparse
import json
from pathlib import Path

from validation import engine_for, read_json

LABELS = ('change-warranted', 'contextual')
GAPS = {
    'HDR-001': 'HTTPS/subdomain compatibility and HSTS preload are not established by the response header.',
    'HDR-002': 'Whether cross-origin embedding is intentional is not observable from framing headers.',
    'HDR-003': 'Meta policies, effective script restrictions and application compatibility need observable evidence; no exploitability inference.',
    'CK-001': 'Cookie purpose is unknown; names and lifetime are not authentication evidence.',
    'CK-002': 'Cookie purpose and legitimate JavaScript access requirements are unknown.',
    'CK-003': 'Legitimate cross-site flows and CSRF protections are unknown.',
    'NET-001': 'Request failure alone does not identify blocking, upgrade behaviour or absence of a recommended change.',
    'JS-002': 'Existing controlled qualification is separate from development-data readiness; preserve its frozen release.',
}


def audit(data):
    engine = engine_for(data)
    rows = engine.validate(data)
    split = engine.frozen_split(rows)
    development = [r for r in rows if split['families'][r['family']] in ('train', 'validation')]
    categories = {}
    for rule in engine.RULES:
        selected = [r for r in development if r['category'] == rule]
        groups = {}
        for row in selected:
            groups.setdefault(row['variant'], []).append(row)
        opposed = {v for v, rr in groups.items() if all(any(r['label'] == label for r in rr) for label in LABELS)}
        # Unknown evidence stays uncertain even when it co-occurs with a known
        # label. Never use one family's apparent certainty to erase another's.
        unknown = {v for v, rr in groups.items() if any(r['uncertain'] or r['label'] == 'needs-review' for r in rr)}
        parts = {}
        missing = []
        for part in ('train', 'validation'):
            rr = [r for r in selected if split['families'][r['family']] == part]
            eligible = [r for r in rr if r['variant'] not in opposed | unknown and r['label'] in LABELS]
            counts = {label: len({r['variant'] for r in eligible if r['label'] == label}) for label in LABELS}
            parts[part] = {'distinctEligibleInputs': counts,
                           'eligibleFamilies': {label: len({r['family'] for r in eligible if r['label'] == label}) for label in LABELS}}
            missing.extend(f'{part}: {label}' for label in LABELS if counts[label] == 0)
        categories[rule] = {
            'developmentRows': len(selected), 'distinctInputs': len(groups),
            'opposedLabelInputs': len(opposed), 'uncertainInputs': len(unknown),
            'reviewRequiredInputs': len(opposed | unknown),
            'partitions': parts, 'missingDevelopmentClasses': missing,
            'developmentClassesPresent': not missing,
            'evidenceGap': GAPS[rule],
        }
    return {'version': 'vylnt-development-evidence-audit-v1', 'schemaVersion': engine.VERSION,
            'datasetHash': engine.digest(data), 'splitHash': engine.digest(split),
            'status': 'development-audit-only', 'testPredictions': 0, 'releasePromoted': False,
            'categories': categories,
            'limitations': ['Class presence is necessary, not sufficient for qualification.',
                           'Counts deduplicate numeric inputs; repeated families/resources do not inflate them.',
                           'Conflict diagnostics use training/validation only; test labels never select features or thresholds.',
                           'Absence of a recorded conflict does not prove application intent is observable.']}


def markdown(result):
    lines = ['# VYLNT remaining-category evidence audit', '',
             'Development-only diagnostics. No training, test prediction or release promotion.', '',
             f"Schema: `{result['schemaVersion']}`. Dataset: `{result['datasetHash']}`.", '',
             '| Category | Distinct inputs | Opposed labels | Review-required inputs | Missing development classes |',
             '|---|---:|---:|---:|---|']
    for rule, category in result['categories'].items():
        missing = '; '.join(category['missingDevelopmentClasses']) or 'None (not qualification)'
        lines.append(f"| {rule} | {category['distinctInputs']} | {category['opposedLabelInputs']} | {category['reviewRequiredInputs']} | {missing} |")
    lines.extend(['', '## Evidence needed', ''])
    lines.extend(f"- **{rule}:** {category['evidenceGap']}" for rule, category in result['categories'].items())
    lines.extend(['', *result['limitations'], ''])
    return '\n'.join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if not output.is_relative_to(Path('.local').resolve()) or output == Path('.local').resolve():
        parser.error('Output must be a new directory under .local/')
    result = audit(read_json(args.dataset))
    output.mkdir(parents=True, exist_ok=False)
    with (output / 'audit.json').open('x', encoding='utf-8') as file:
        json.dump(result, file, indent=2, allow_nan=False)
    with (output / 'audit.md').open('x', encoding='utf-8') as file:
        file.write(markdown(result))
    ready = [k for k, v in result['categories'].items() if v['developmentClassesPresent']]
    print('Development classes present: ' + (', '.join(ready) or 'none') + '. Not qualification; no test consumed.')
    print('Read ' + str(output / 'audit.md'))


if __name__ == '__main__':
    main()
