"""Run after npm run test:pdf using a Python environment with pdfplumber.

Text/bounds checks supplement, rather than replace, visual review of rendered pages.
"""
from pathlib import Path
import unicodedata
import pdfplumber

root = Path('test-results/pdf')
with pdfplumber.open(root / 'multipage.pdf') as document:
    assert len(document.pages) > 3
    texts = [unicodedata.normalize('NFKC', page.extract_text() or '') for page in document.pages]
    full = ' '.join(texts)
    assert 'Experimental ML results' not in full
    assert 'Recommendation' not in full
    for expected in ['EVIDENCE-END-MARKER', 'REVIEW-END-MARKER', 'café', 'naïve', 'résumé', 'Zażółć', 'Český', 'Español', 'Português', 'Straße', 'smörgåsbord', 'Ångström', '€', '£', 'FINDING 1 OF 3', 'FINDING 2 OF 3', 'FINDING 3 OF 3']:
        assert expected in full, expected
    for index, page in enumerate(document.pages):
        assert f'Page {index + 1} of {len(document.pages)}' in texts[index]
        assert page.chars, f'Blank page {index + 1}'
        for char in page.chars:
            assert 45 <= char['x0'] <= char['x1'] <= page.width - 45, (index + 1, char)
            # Chromium places the page footer inside the bottom print margin.
            assert 40 <= char['top'] <= char['bottom'] <= page.height - 10, (index + 1, char)
            if char['top'] < page.height - 40:
                assert char['bottom'] <= page.height - 50, (index + 1, char)
    print(f'PASS: {len(texts)} pages, end markers, Unicode, page numbers and text bounds')
with pdfplumber.open(root / 'empty.pdf') as document:
    assert len(document.pages) == 1
    text = unicodedata.normalize('NFKC', document.pages[0].extract_text() or '')
    assert 'No findings observed' in text
    print('PASS: single-page empty-report explanation')
with pdfplumber.open(root / 'concise.pdf') as document:
    assert len(document.pages) <= 6, len(document.pages)
    text = ' '.join(page.extract_text() or '' for page in document.pages)
    assert '74 observations grouped into 4 issues' in text
    assert '71 observations' in text
    assert 'ML prioritisation is unavailable' in text
    assert 'Experimental ML results' in text
    assert 'Model SHA-256' in text
    assert 'Recommended change' in text
    assert 'FINDING 71' not in text
    print(f'PASS: 74 findings / 4 grouped issues on {len(document.pages)} concise pages')
