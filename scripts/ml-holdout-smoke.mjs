// Original upstream UI interactions. No model calls; retain booleans/counts only.
import assert from 'node:assert/strict';
export async function holdoutSmoke(page, kind) {
  page.setDefaultTimeout(12000);
  if (kind === 'q1-mines') {
    await page.locator('.js-settings').click();
    await page.locator('#cols').fill('6'); await page.locator('#rows').fill('5');
    await page.locator('#emoji').check();
    await page.locator('.js-popup-new-game').click();
    assert.equal(await page.locator('#map [role="gridcell"]').count(), 30);
    assert.equal(await page.evaluate(() => game.cols === 6 && game.rows === 5), true);
  } else if (kind === 'q1-isocity') {
    await page.locator('#tool_13').click();
    assert.ok(await page.locator('#tool_13').evaluate(el => el.classList.contains('selected')));
    assert.equal(await page.evaluate(() => tool[0] === 1 && tool[1] === 1 && canvas.width === 910), true);
  } else if (kind === 'q1-vim') {
    await page.locator('#start-learning-btn').click();
    await page.locator('#onboarding-overlay').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.querySelector('#level-indicator').textContent.trim().length > 0);
    await page.keyboard.press('l');
  } else if (kind === 'q1-tower') {
    await page.locator('#start').click();
    await page.waitForFunction(() => gameStart === true && document.querySelector('canvas')?.width > 0);
    await page.locator('.landing').waitFor({ state: 'hidden' });
  } else if (kind === 'q1-kontext') {
    const first = await page.locator('.bullets li.active').evaluate(el => Array.from(el.parentElement.children).indexOf(el));
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(index => Array.from(document.querySelector('.bullets').children).findIndex(el => el.classList.contains('active')) !== index, first);
  } else if (kind === 'q1-sketch') {
    const canvas = page.locator('canvas'); await canvas.waitFor();
    const box = await canvas.boundingBox(); assert.ok(box);
    await page.mouse.move(box.x + 150, box.y + 150); await page.mouse.down();
    await page.mouse.move(box.x + 220, box.y + 220, { steps: 12 }); await page.mouse.up();
    assert.ok(await canvas.evaluate(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data.some((v,i) => i % 4 === 3 && v > 0)));
  } else if (kind === 'q1-matter') {
    await page.locator('canvas').first().waitFor();
    const select = page.locator('select').first();
    const options = await select.locator('option').evaluateAll(nodes => nodes.map(n => n.value));
    assert.ok(options.length > 1); const before = await select.inputValue();
    await select.selectOption(options.find(v => v !== before));
    assert.notEqual(await select.inputValue(), before);
    assert.ok(await page.locator('canvas').first().evaluate(c => c.width > 0));
  } else if (kind === 'q1-codemirror') {
    await page.locator('.CodeMirror').click(); await page.keyboard.press('Control+End'); await page.keyboard.type('controlled');
    assert.ok(await page.evaluate(() => editor.getValue().endsWith('controlled')));
  } else if (kind === 'q1-spectrum') {
    const input = page.locator('.sp-input:visible').first(); await input.fill('#123456'); await input.press('Enter');
    await page.waitForFunction(() => $('#full').spectrum('get').toHexString() === '#123456');
  } else if (kind === 'q1-qr') {
    const before = await page.locator('#qrcode canvas').evaluate(c => c.toDataURL());
    await page.locator('#text').fill('VYLNT controlled QR'); await page.locator('#text').press('Enter');
    assert.notEqual(await page.locator('#qrcode canvas').evaluate(c => c.toDataURL()), before);
  } else if (kind === 'q1-dragula') {
    const a = page.locator('#left-defaults > div').first(), b = page.locator('#right-defaults');
    const before = await b.locator(':scope > div').count();
    const from = await a.boundingBox(), to = await b.boundingBox(); assert.ok(from && to);
    await page.mouse.move(from.x + 20, from.y + 15); await page.mouse.down();
    await page.mouse.move(to.x + 20, to.y + 20, {steps:20}); await page.mouse.up();
    await page.waitForFunction(n => document.querySelector('#right-defaults').children.length === n + 1, before);
  } else if (kind === 'q1-autosize') {
    const field = page.locator('textarea').last(); const before = await field.evaluate(el => el.clientHeight);
    await field.fill(('controlled\n').repeat(80));
    assert.ok(await field.evaluate(el => el.clientHeight) > before);
  } else if (kind === 'q1-sortable') {
    const list = page.locator('#example1');
    const before = await list.locator(':scope > div').first().textContent();
    await list.locator(':scope > div').first().dragTo(list.locator(':scope > div').nth(3));
    assert.notEqual(await list.locator(':scope > div').first().textContent(), before);
  } else if (kind === 'q1-viewer') {
    await page.locator('#galley img').first().click();
    await page.locator('.viewer-container:not(.viewer-hide)').waitFor();
    await page.waitForFunction(() => document.getElementById('galley').viewer?.viewed === true);
    await page.locator('.viewer-toolbar .viewer-next').click();
    await page.waitForFunction(() => document.querySelector('.viewer-title').textContent.includes('(2/9)'));
    await page.waitForFunction(() => document.querySelector('.viewer-canvas img').naturalWidth > 0);
  } else if (kind === 'q1-particles') {
    await page.waitForFunction(() => window.pJSDom?.[0]?.pJS.particles.array.length > 0);
    const before = await page.evaluate(() => pJSDom[0].pJS.particles.array.length);
    await page.locator('#particles-js canvas').click({position:{x:180,y:180}});
    await page.waitForFunction(n => pJSDom[0].pJS.particles.array.length > n, before);
  } else if (kind === 'q1-awesomplete') {
    const field = page.locator('input.awesomplete').first();
    await field.fill('Ja');
    await page.locator('.awesomplete ul:not([hidden]) li').first().waitFor();
    await field.press('ArrowDown'); await field.press('Enter');
    assert.notEqual(await field.inputValue(), 'Ja');
  } else throw new Error('Unknown external holdout smoke test');
}
