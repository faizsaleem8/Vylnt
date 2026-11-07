"""Verify pinned public source caches; retain metadata/hashes, never application data."""
import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
LOCK = ROOT / 'ml/applications/native/expansion.candidates.json'
NEXT_LOCK = ROOT / 'ml/applications/native/expansion-next.candidates.json'
IMPLEMENTATIONS = {
    'fieldpoint': ['src/app.js', 'src/auth/session.js', 'src/auth/routes.js', 'src/middleware/security.js', 'src/sites/routes.js'],
    'yoyo-collection': ['server.js', 'db.js', 'schema.sql'],
    'bookwise': ['server/app.js', 'server/middleware/session.js', 'server/middleware/auth.js', 'server/controllers/authController.js', 'server/controllers/categoryController.js', 'server/models/user.js', 'server/models/category.js', 'server/config/config.json'],
    'wikiflow': ['server.js', 'server/db.js', 'server/security.js', 'server/routes-auth.js', 'server/routes-terms.js', 'server-js/wf-server-config.js'],
    'portal': ['server/src/app.ts', 'server/src/config.ts', 'server/src/db/index.ts', 'server/src/routes/groups.ts', 'server/src/validation.ts'],
    'personal-knowledge-manager': ['src/backend/server.ts', 'src/backend/config.ts', 'src/backend/middleware/auth.ts', 'src/backend/db/index.ts', 'src/backend/routes/notes.ts', 'src/backend/package-lock.json'],
    'stockbase': ['server.js'],
    '8star-links': ['server.js'],
    'anonymous-notepad': ['index.js', 'config/database.js', 'models/Note.js', 'routes/note.js', 'controllers/noteController.js'],
    'habit-tracker': ['server/src/app.js', 'server/src/db.js', 'server/src/lib/sqliteSessionStore.js', 'server/src/routes/auth.js', 'server/src/routes/notes.js'],
}

def git(source, *args):
    return subprocess.check_output(['git', '-C', str(source), *args], timeout=15)

def overlap_audit():
    native = [json.loads(p.read_text(encoding='utf-8')) for p in sorted((ROOT / 'ml/applications/native').glob('*.source.json'))]
    historical = []
    for name in ('sources.lock.json', 'fresh-holdout.sources.lock.json'):
        historical.extend(json.loads((ROOT / 'ml/applications' / name).read_text(encoding='utf-8'))['applications'])
    seen_repositories, seen_hashes = set(), set()
    old_repositories = {a['repository'].lower().removeprefix('https://github.com/') for a in historical}
    old_hashes = {f['sha256'] for a in historical for f in a['files'] if pathlib.PurePosixPath(f['path']).suffix in ('.js', '.ts', '.sql')}
    for record in native:
        repository = record['repository'].lower().removeprefix('https://github.com/')
        hashes = {h for p, h in record.get('sourceSha256', {}).items() if pathlib.PurePosixPath(p).suffix in ('.js', '.ts', '.sql')}
        if repository in old_repositories or repository in seen_repositories or hashes & old_hashes or hashes & seen_hashes:
            raise ValueError('Known repository/implementation overlap requires grouping audit: ' + repository)
        seen_repositories.add(repository)
        seen_hashes.update(hashes)
    return {'nativeFamiliesChecked': len(native), 'historicalApplicationsChecked': len(historical), 'exactImplementationOverlap': False,
            'scope': 'Repository identities and exact JS/TS/SQL file hashes in the two public historical source locks. Not a full numeric-exposure, rewritten-template or source-independence certificate.'}

def main():
    lock = json.loads(LOCK.read_text(encoding='utf-8'))
    results = []
    next_lock = json.loads(NEXT_LOCK.read_text(encoding='utf-8'))
    for record in lock['candidates'] + next_lock['candidates']:
        slug = record['repository'].split('/')[-1].lower()
        source = ROOT / '.local/ml-native-expansion' / slug
        if git(source, 'rev-parse', 'HEAD').decode().strip() != record['revision']:
            raise ValueError('Source revision differs: ' + slug)
        files = git(source, 'ls-tree', '-r', '--name-only', 'HEAD').decode().splitlines()
        license_file = next((p for p in files if p.lower() in ('license', 'license.md', 'license.txt')), None)
        if not license_file:
            raise ValueError('Licence missing: ' + slug)
        license_bytes = git(source, 'show', 'HEAD:' + license_file)
        if b'Permission is hereby granted' not in license_bytes:
            raise ValueError('MIT permission text missing: ' + slug)
        sha = lambda b: hashlib.sha256(b).hexdigest()
        selected = IMPLEMENTATIONS.get(slug, [])
        status = 'excluded' if slug in ('inventory_management', 'homeinventory') else 'native-adapter' if selected else 'source-screening-only'
        reason = ('Pinned code is an Electron desktop application, outside the Node/Express web corpus.' if slug == 'inventory_management' else
                  '719 tracked files exceed the existing 600-file disposable-copy limit.' if slug == 'homeinventory' else
                  'Native operation adapter; execution determines evidence eligibility. Authentication is not assumed.' if selected else
                  'Licence verified; native execution and category suitability not yet established.')
        results.append({'repository': record['repository'], 'revision': record['revision'], 'licenseSha256': sha(license_bytes), 'status': status, 'reason': reason})
        if selected:
            source_hashes = {p: sha(git(source, 'show', 'HEAD:' + p)) for p in [license_file, *selected]}
            manifest = {'version': 1, 'role': 'development-prototype-exposure', 'familyId': 'upstream:' + record['repository'].lower(),
                        'repository': 'https://github.com/' + record['repository'], 'repositoryId': record['repositoryId'], 'revision': record['revision'],
                        'license': 'MIT', 'licenseGitBlob': git(source, 'rev-parse', 'HEAD:' + license_file).decode().strip(),
                        'dependencyLockSha256': sha(git(source, 'show', 'HEAD:package-lock.json')), 'sourceSha256': source_hashes,
                        'scope': reason + ' One response and one mutation, not whole-application security.',
                        'excludeFromFutureHoldout': True, 'qualificationClaimed': False, 'sourceBytePolicy': 'Exact Git blobs; canonical CRLF conversion only when original blob is reproduced.'}
            (ROOT / 'ml/applications/native' / (slug + '.source.json')).write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'ml/applications/native/expansion.audit.json').write_text(json.dumps({'version': 1, 'role': 'development-source-screening',
            'selectionIdentity': hashlib.sha256(LOCK.read_bytes()).hexdigest(), 'additionalSelectionIdentity': hashlib.sha256(NEXT_LOCK.read_bytes()).hexdigest(), 'modelPredictions': 0, 'trainingReady': False, 'sources': results, 'overlapAudit': overlap_audit()}, indent=2) + '\n', encoding='utf-8')
    print('Verified 12 pinned MIT licences; 10 expansion adapters, 2 exclusions. Jingo/Tabinator are separate earlier sources. Only completed execution establishes collection; no training-readiness claim.')

if __name__ == '__main__':
    main()
