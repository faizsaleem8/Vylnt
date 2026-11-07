"""Approved material-context counting. This module makes no model predictions."""
import hashlib
import json
from collections import Counter

VERSION = 'vylnt-native-material-context-v1'


def digest(value):
    encoded = json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)
    return hashlib.sha256(encoded.encode()).hexdigest()


def validate_policy(policy, features, rules):
    if set(policy) != {'version', 'common', 'categories'} or policy['version'] != VERSION:
        raise ValueError('Unsupported material counting policy')
    if set(policy['categories']) != set(rules):
        raise ValueError('Missing material category')
    for columns in [policy['common'], *policy['categories'].values()]:
        if not isinstance(columns, list) or not 1 <= len(columns) <= 100 or len(set(columns)) != len(columns):
            raise ValueError('Invalid material projection')
        if any(name not in features for name in columns):
            raise ValueError('Material feature contract differs')
    if 'target' not in features or any('rule_' + rule not in features for rule in rules):
        raise ValueError('Material target flag missing')
    return policy


def material_variant(row, features, policy):
    target = row['sequence'][-1]
    if len(target) != len(features) or target[features.index('target')] != 1 or target[features.index('rule_' + row['category'])] != 1:
        raise ValueError('Material projection needs the bound target row')
    columns = policy['common'] + policy['categories'][row['category']]
    values = [target[features.index(name)] for name in columns]
    if any(type(value) not in (int, float) or value not in (-1, 0, 1) for value in values):
        raise ValueError('Invalid material feature value')
    return digest([row['category'], values])


def representatives(rows, features, policy):
    """One supported observation per family and relevant target variant.

    Conflicting supported labels force abstention. Unknown observations retain
    their review status and supply no fitting weight.
    """
    groups = {}
    for row in rows:
        variant = material_variant(row, features, policy)
        if row.get('materialVariant') != variant:
            raise ValueError('Material variant changed')
        groups.setdefault(variant, []).append(row)
    selected = []
    for variant, members in sorted(groups.items()):
        supported = [row for row in members if not row['uncertain'] and row['label'] != 'needs-review']
        if len({row['label'] for row in supported}) != 1:
            continue
        families = {}
        for row in sorted(supported, key=lambda item: (item['variant'], item['evidenceRecord'])):
            families.setdefault(row['family'], row)
        selected.extend(families.values())
    return selected


def family_weights(rows):
    """Equal class/category mass and equal source-family mass within each cell."""
    counts = Counter((row['category'], row['label'], row['family']) for row in rows)
    families = Counter((category, label) for category, label, family in counts)
    return [len(rows) / (len(families) * families[(row['category'], row['label'])] *
                        counts[(row['category'], row['label'], row['family'])]) for row in rows]


def calibrate(logits, labels, rows):
    """Validation-only temperature/threshold selection with family weighting.

    The grids and quality constraints match the historical selector. Training
    repetitions cannot give a family extra influence over calibration either.
    """
    import numpy as np
    logits, labels = np.asarray(logits), np.asarray(labels)
    if len(rows) != len(logits) or len(rows) != len(labels) or not rows:
        raise ValueError('Calibration requires matching validation rows')
    weights = np.asarray(family_weights(rows))
    temperatures = [.25, .5, .75, 1, 1.5, 2, 4, 8]
    temperature = min(temperatures, key=lambda value: float(np.average(np.logaddexp(0, logits / value) - labels * logits / value, weights=weights)))
    scores = 1 / (1 + np.exp(-np.clip(logits / temperature, -40, 40)))
    choices = []
    positives = float(weights[labels == 1].sum())
    for low in [.05, .1, .2, .3, .4]:
        for high in [.6, .7, .8, .9, .95]:
            change, contextual = scores >= high, scores <= low
            tp = float(weights[change & (labels == 1)].sum())
            fp = float(weights[change & (labels == 0)].sum())
            precision, recall = tp / (tp + fp) if tp + fp else 0, tp / positives if positives else 0
            if precision >= .9 and recall >= .95 and not any(contextual & (labels == 1)):
                choices.append((float(weights[change | contextual].sum()), low, high))
    _, low, high = max(choices, default=(0, 0., 1.))
    return {'temperature': temperature}, {'contextual': low, 'change': high}
