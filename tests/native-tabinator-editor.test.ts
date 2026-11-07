import {createHash} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import {tabinatorEditorAsset,tabinatorEditorLayout,tabinatorExternalEditor} from './native-tabinator-editor';

const script = "\r\ndocument.getElementById('show-add-modal-btn').addEventListener('click', onOpen);\r\n";
const html = '<html><head><script src="https://cdn.tailwindcss.com"></script>' +
  '<script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script></head>' +
  '<body><script>' + script + '</script>' +
  '<img src="https://www.google.com/s2/favicons?domain=${getHostname(link.url)}&sz=32"></body></html>';

describe('Tabinator native editor profiles', () => {
  it('allows the exact parser-normalized inline script under an early meta policy', () => {
    const result = tabinatorEditorLayout(html, 'script-early-meta');
    const hash = createHash('sha256').update(script.replaceAll('\r\n', '\n')).digest('base64');
    expect(result.indexOf('<meta')).toBeLessThan(result.indexOf('<script>'));
    expect(result).toContain(`'sha256-${hash}'`);
    expect(result).toContain('<script>' + script + '</script>');
    expect(result).toContain('/images/tabinator.png');
    expect(result).not.toContain('https://');
  });

  it('retains broad and missing policy cases and rejects drift in the pinned layout', () => {
    expect(tabinatorEditorLayout(html, 'script-broad-meta')).toContain("'unsafe-inline'");
    expect(tabinatorEditorLayout(html, 'script-missing')).not.toContain('http-equiv');
    expect(() => tabinatorEditorLayout(html.replace('cdn.tailwindcss.com', 'unexpected.invalid'), 'framed-write')).toThrow();
    expect(() => tabinatorEditorLayout(html.replace('</body>', '<script>other()</script></body>'), 'script-early-meta')).toThrow();
  });

  it('preserves the original script bytes and restricts the fixture origin', () => {
    for(const origin of ['http://127.0.0.1:3210','http://vylnt-resource.test:3210']){
      const asset=tabinatorExternalEditor(html,origin);
      expect(asset.script).toBe(script);
      expect(asset.html).toContain(`<script src="${origin}${tabinatorEditorAsset}"></script>`);
      expect(asset.html).not.toContain(script);
    }
    for(const origin of ['https://example.invalid:3210','http://127.0.0.1:3210/path','http://127.0.0.1:3210?private=value','http://a:b@127.0.0.1:3210']){
      expect(()=>tabinatorExternalEditor(html,origin)).toThrow(/origin/);
    }
  });
});
