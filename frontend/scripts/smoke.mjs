import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../..');
const browser = await puppeteer.launch({
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1728, height: 1050, deviceScaleFactor: 1 });
const failures = [];
page.on('pageerror', (error) => failures.push(`Browser error: ${error.message}`));
const appOrigin = new URL(process.env.BASE_URL || 'http://127.0.0.1:8010').origin;
page.on('request', (request) => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== appOrigin) failures.push(`Unexpected external runtime request: ${new URL(request.url()).origin}`); });
const check = (condition, message) => { if (!condition) failures.push(message); };
const buttonByText = async (text) => {
  const buttons = await page.$$('button');
  for (const button of buttons) {
    const label = await button.evaluate((element) => element.textContent?.trim() || '');
    if (label === text || label.includes(text)) return button;
  }
  throw new Error(`Button not found: ${text}`);
};

try {
  await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:8010'}/?react-smoke=1`, { waitUntil: 'networkidle0' });
  check(await page.$eval('.brand strong', (element) => element.textContent?.includes('TemplateCraft')), 'Dashboard header did not render');

  check(await page.$eval('html', (element) => element.dataset.theme === 'dark' && element.dataset.palette === 'obsidian'), 'New visits should default to Obsidian dark');
  // Start the existing mode-toggle checks from their explicit light baseline.
  await page.evaluate(() => { localStorage.setItem('templatecraft-theme', 'light'); localStorage.setItem('templatecraft-palette', 'forest'); });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.screenshot({ path: '/tmp/templatecraft-welcome-desktop.png', fullPage: true });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Welcome screen overflows on mobile');
  await page.screenshot({ path: '/tmp/templatecraft-welcome-mobile.png', fullPage: true });
  await page.setViewport({ width: 1728, height: 1050, deviceScaleFactor: 1 });
  await page.click('[aria-label="Switch to dark theme"]');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark' && !document.documentElement.classList.contains('theme-liquid'));
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.reload({ waitUntil: 'networkidle0' });
  check(await page.$eval('html', (element) => element.dataset.theme === 'dark'), 'Theme preference did not persist');
  await page.click('[aria-label="Switch to light theme"]');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light' && !document.documentElement.classList.contains('theme-liquid'));
  await page.click('[aria-label="Choose theme colors"]');
  const accents = new Set();
  for (const palette of ['forest', 'ocean', 'lavender', 'rose', 'sunset', 'graphite', 'obsidian']) {
    await page.click(`.palette-option:has(input[value="${palette}"])`);
    check(await page.$eval('html', (element) => element.dataset.palette) === palette, `Palette ${palette} was not applied`);
    accents.add(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()));
  }
  check(accents.size === 7, 'Palettes do not have seven distinct accents');
  await page.click('.palette-option:has(input[value="lavender"])');
  await page.click('[role="switch"][aria-label="Dark mode"]');
  await page.waitForFunction(() => !document.documentElement.classList.contains('theme-liquid'));
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  check(await page.$eval('html', (element) => element.dataset.theme === 'dark' && element.dataset.palette === 'lavender'), 'Dark mode lost the selected palette');
  await page.reload({ waitUntil: 'networkidle0' });
  check(await page.$eval('html', (element) => element.dataset.theme === 'dark' && element.dataset.palette === 'lavender'), 'Palette and dark-mode preferences did not persist');
  await page.click('[aria-label="Switch to light theme"]');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light' && !document.documentElement.classList.contains('theme-liquid'));
  await page.click('[aria-label="Choose theme colors"]');
  await page.click('.palette-option:has(input[value="forest"])');
  await page.keyboard.press('Escape');
  check(await page.$eval('#appearance-picker', (element) => !element.matches(':popover-open')), 'Appearance picker did not dismiss with Escape');
  await page.click('[aria-label="Keyboard shortcuts"]');
  await page.waitForSelector('dialog[open]');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));

  const fileInput = await page.$('input[type=file]');
  await fileInput.uploadFile(path.join(projectRoot, 'assets/forms/sample-template.pdf'));
  await page.waitForSelector('.workspace', { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll('.field-list article').length >= 16, { timeout: 30000 });
  check((await page.$eval('.document-title h1', (element) => element.textContent))?.includes('sample-template'), 'Uploaded filename was not shown');

  await (await buttonByText('Continuous')).click();
  await page.waitForSelector('.continuous-stack');
  check(await page.$$eval('.continuous-sheet', (elements) => elements.length) === 2, 'Continuous layout did not render two pages');
  await (await buttonByText('Page')).click();

  await (await page.$('.field-list article .field-actions button:nth-child(2)')).click();
  const labelInput = await page.$('.field-form input[name=label]');
  await labelInput.click({ clickCount: 3 });
  await labelInput.type('Trading Code QA');
  await (await buttonByText('Apply')).click();
  check((await page.$eval('.save-state', (element) => element.textContent))?.includes('Unsaved'), 'Editing did not mark the document dirty');

  await (await buttonByText('Undo')).click();
  check(!(await page.$eval('.field-list article b', (element) => element.textContent))?.includes('QA'), 'Undo did not restore the field label');
  await (await buttonByText('Redo')).click();
  check((await page.$eval('.field-list article b', (element) => element.textContent))?.includes('QA'), 'Redo did not restore the changed label');

  const saveResponse = page.waitForResponse((response) => response.url().includes('/api/fields/replace') && response.status() === 200);
  await (await buttonByText('Save changes')).click();
  await saveResponse;
  await page.waitForFunction(() => document.querySelector('.save-state')?.textContent?.includes('All changes saved'));

  const canvasField = await page.$('.canvas-field:last-child');
  await canvasField.click();
  await page.waitForSelector('.field-list article.selected');
  await page.waitForFunction(() => {
    const article = document.querySelector('.field-list article.selected'); const panel = document.querySelector('.control-content');
    if (!article || !panel) return false;
    const itemRect = article.getBoundingClientRect(); const panelRect = panel.getBoundingClientRect();
    return itemRect.top >= panelRect.top && itemRect.bottom <= panelRect.bottom;
  });
  const selectionSync = await page.$eval('.field-list article.selected', (article) => {
    const panel = document.querySelector('.control-content');
    const itemRect = article.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    return itemRect.top >= panelRect.top && itemRect.bottom <= panelRect.bottom;
  });
  check(selectionSync, 'Canvas selection did not reveal the matching right-panel field');

  const fieldSearch = await page.$('.fields-panel > .search');
  await fieldSearch.click({ clickCount: 3 });
  await fieldSearch.type('reviewer_name');
  await page.waitForFunction(() => document.querySelectorAll('.field-list article').length === 1);
  await (await buttonByText('Locate')).click();
  await page.waitForFunction(() => document.querySelector('.page-tools strong')?.textContent?.includes('Page 2 of 2'));
  check((await page.$eval('.canvas-field.selected span', (element) => element.textContent))?.includes('Reviewer Name'), 'Panel locate did not focus the matching canvas field');
  await (await page.$('.page-pills button:first-child')).click();
  await page.waitForFunction(() => document.querySelector('.page-tools strong')?.textContent?.includes('Page 1 of 2'));

  await (await buttonByText('Add field')).click();
  check(await page.$$eval('.add-field-form select[name=type] option', (options) => options.map((option) => option.value).join(',') === 'text,textarea,date,time,checkbox,image,signature'), 'Complete field-type selector was not available');
  await page.select('.add-field-form select[name=type]', 'textarea');
  await page.type('.add-field-form input[name=key]', 'review_notes');
  await page.type('.add-field-form input[name=label]', 'Review notes');
  await (await buttonByText('Add to page')).click();
  check(await page.$$eval('.field-list article', (elements) => elements.some((element) => element.textContent?.includes('review_notes'))), 'New multiline field was not added');

  await (await buttonByText('Document text')).click();
  check(await page.$$eval('.content-list article', (elements) => elements.length) > 0, 'Hard-coded PDF text was not detected');
  check((await page.$eval('.canvas-tools .segmented button.active', (element) => element.textContent)) === 'Preview clean', 'Document-text mode did not hide field overlays');
  await (await page.$('.document-text-zone')).click();
  await page.waitForSelector('.content-list article.selected');
  const textPanelSync = await page.$eval('.content-list article.selected', (article) => {
    const panel = document.querySelector('.control-content');
    const itemRect = article.getBoundingClientRect(); const panelRect = panel.getBoundingClientRect();
    return itemRect.top >= panelRect.top && itemRect.bottom <= panelRect.bottom;
  });
  check(textPanelSync, 'Canvas text selection did not reveal its document-text record');
  const contentSearch = await page.$('.document-text-panel .search');
  await contentSearch.type('Sample use only');
  await page.waitForFunction(() => document.querySelectorAll('.content-list article').length === 1);
  await (await buttonByText('Locate')).click();
  check((await page.$eval('.document-text-zone.selected', (element) => element.getAttribute('title')))?.includes('Sample use only'), 'Document-text locate did not focus the matching PDF text');
  await page.waitForFunction(() => document.querySelector('.document-text-panel .search')?.value === '');
  await (await page.$('.document-text-panel .search')).type('TemplateCraft Studio');
  await page.waitForFunction(() => document.querySelectorAll('.content-list article').length >= 1);
  await (await buttonByText('Edit text')).click();
  const contentText = await page.$('.content-edit textarea');
  await contentText.evaluate((element) => { element.value = 'TemplateCraft Studio QA'; });
  await (await buttonByText('Apply')).click();
  check((await page.$eval('.content-list article p', (element) => element.textContent))?.includes('Studio QA'), 'Hard-coded text edit was not staged');
  await (await buttonByText('Undo')).click();
  check(!(await page.$eval('.content-list article p', (element) => element.textContent))?.includes('Studio QA'), 'Undo did not restore hard-coded text');
  await (await buttonByText('Redo')).click();
  const contentSave = page.waitForResponse((response) => response.url().includes('/api/fields/replace') && response.status() === 200);
  await (await buttonByText('Save changes')).click();
  await contentSave;
  await page.waitForFunction(() => document.querySelector('.save-state')?.textContent?.includes('All changes saved'));
  await page.screenshot({ path: '/tmp/templatecraft-document-text.png', fullPage: true });

  await (await buttonByText('Sign')).click();
  check((await page.$eval('.feature-panel h2', (element) => element.textContent)) === 'Signature and stamp', 'Stamp panel did not render');
  await page.waitForFunction(() => document.querySelectorAll('.stamp-assets button').length === 2);
  const stampUpload = await page.$('.stamp-editor input[type=file]');
  await stampUpload.uploadFile('/tmp/templatecraft-document-text.png');
  await page.waitForFunction(() => document.querySelectorAll('.stamp-assets button').length === 3);
  check(await page.$$eval('.stamp-assets button', (elements) => elements.length) === 3, 'Uploaded image was not added to the stamp collection');
  await (await buttonByText('Add to')).click();
  await page.waitForSelector('.canvas-stamp');
  const originalStampBox = await (await page.$('.canvas-stamp')).boundingBox();
  await page.mouse.move(originalStampBox.x + originalStampBox.width / 2, originalStampBox.y + originalStampBox.height / 2);
  await page.mouse.down(); await page.mouse.move(originalStampBox.x + originalStampBox.width / 2 + 55, originalStampBox.y + originalStampBox.height / 2 + 35, { steps: 8 }); await page.mouse.up();
  const movedStampBox = await (await page.$('.canvas-stamp')).boundingBox();
  check(Math.abs(movedStampBox.x - originalStampBox.x) > 20, 'Stamp could not be freely dragged on the page');
  const resizeHandle = await page.$('.canvas-stamp .handle.br');
  const handleBox = await resizeHandle.boundingBox();
  await page.mouse.move(handleBox.x + 3, handleBox.y + 3); await page.mouse.down(); await page.mouse.move(handleBox.x + 43, handleBox.y + 28, { steps: 6 }); await page.mouse.up();
  const resizedStampBox = await (await page.$('.canvas-stamp')).boundingBox();
  check(resizedStampBox.width > movedStampBox.width + 20, 'Stamp could not be resized from its corner');
  await (await buttonByText('Undo')).click();
  const undoneStampBox = await (await page.$('.canvas-stamp')).boundingBox();
  check(undoneStampBox.width < resizedStampBox.width - 15, 'Undo did not revert the stamp resize');
  await (await buttonByText('Redo')).click();
  const stampSave = page.waitForResponse((response) => response.url().includes('/api/fields/replace') && response.status() === 200);
  await (await buttonByText('Save changes')).click(); await stampSave;
  await page.waitForFunction(() => document.querySelector('.save-state')?.textContent?.includes('All changes saved'));
  await (await page.$('.placed-stamps .button.danger')).click();
  await page.waitForFunction(() => !document.querySelector('.canvas-stamp'));
  await (await buttonByText('Undo')).click();
  await page.waitForSelector('.canvas-stamp');
  await page.screenshot({ path: '/tmp/templatecraft-stamp-editor.png', fullPage: true });
  await (await buttonByText('Test')).click();
  check((await page.$eval('.feature-panel h2', (element) => element.textContent)) === 'Test your form', 'Test-fill panel did not render');
  check(await page.$eval('.format-match input', (element) => element.checked), 'Source-format matching was not enabled by default');
  check((await page.$eval('.format-match', (element) => element.textContent))?.includes('text fields detected'), 'Typography status was missing');
  const fillResponse = page.waitForResponse((response) => response.url().includes('/api/fill-test/') && response.status() === 200);
  const fillRequest = page.waitForRequest((request) => request.url().includes('/api/fill-test/'));
  await (await buttonByText('Generate filled preview')).click();
  const request = await fillRequest;
  check(request.postData()?.includes('"match_source_format":true'), 'Source-format preference was not sent to the PDF engine');
  await fillResponse;
  await page.waitForFunction(() => document.querySelector('.segmented button.active')?.textContent?.includes('Preview filled'));
  await page.screenshot({ path: '/tmp/templatecraft-typography-match.png', fullPage: true });
  await (await buttonByText('Export')).click();
  check((await page.$eval('.feature-panel h2', (element) => element.textContent)) === 'Export and deliver', 'Export panel did not render');
  check(await page.$$eval('.export-card', (elements) => elements.length) === 4, 'Export choices were not grouped in the Export panel');
  check(await page.$$eval('.editor-toolbar button', (elements) => elements.length) === 3, 'Global toolbar still exposes feature-specific actions');

  await page.screenshot({ path: '/tmp/templatecraft-react-smoke.png', fullPage: true });

  const sampleResponse = page.waitForResponse((response) => response.url().includes('/api/sample') && response.status() === 200);
  await (await buttonByText('Try sample')).click();
  await sampleResponse;
  await page.waitForFunction(() => !document.querySelector('.operation-loader'));
  await page.waitForSelector('.fields-panel');
  await page.waitForFunction(() => document.querySelector('.document-title h1')?.textContent?.includes('sample-template'));
  await (await buttonByText('Sign')).click();
  await page.waitForFunction(() => document.querySelectorAll('.stamp-assets button').length === 3);
  const sampleTargets = await page.$$eval('.feature-panel label select', (selects) => [...(selects[0]?.querySelectorAll('option') || [])].slice(1).map((option) => option.textContent || ''));
  check(sampleTargets.length === 3, 'Sample form should expose two signatures and one demo stamp target');
  check(sampleTargets.every((label) => (label.includes('Signature') || label.includes('Demo Stamp'))), 'Ordinary holder-name fields leaked into stamp targets');
  check(await page.$$eval('.stamp-assets button', (elements) => elements.length) === 3, 'Uploaded stamp did not persist in the collection across documents');
  await page.screenshot({ path: '/tmp/templatecraft-stamp-refactor.png', fullPage: true });
  await page.click('.control-panel nav button:first-child');
  const originalCount = await page.$$eval('.field-list article', (elements) => elements.length);
  await page.select('[aria-label="Filter field type"]', 'signature');
  check(await page.$$eval('.field-list article', (elements) => elements.every((item) => item.querySelector('em')?.textContent === 'signature')), 'Type filter returned unrelated fields');
  await page.select('[aria-label="Filter field type"]', 'all');
  await (await page.$('.field-list article .field-actions button:first-child')).click();
  await page.keyboard.press('Escape');
  await (await page.$('.field-list article .field-actions button:first-child')).click();
  // Move keyboard focus out of the button to exercise canvas shortcuts.
  await page.evaluate(() => document.activeElement?.blur());
  const before = await page.$eval('.canvas-field.selected', (element) => element.style.left);
  await page.keyboard.press('ArrowRight');
  check(await page.$eval('.canvas-field.selected', (element) => element.style.left) !== before, 'Arrow key did not nudge the selected field');
  const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
  await page.keyboard.down(modifier); await page.keyboard.press('d'); await page.keyboard.up(modifier);
  check(await page.$$eval('.field-list article', (elements) => elements.length) === originalCount + 1, 'Keyboard duplication did not add a field');
  await (await buttonByText('Undo')).click();
  check(await page.$$eval('.field-list article', (elements) => elements.length) === originalCount, 'Undo did not remove the duplicated field');
  await (await buttonByText('Redo')).click();
  check(await page.$$eval('.field-list article', (elements) => elements.length) === originalCount + 1, 'Redo did not restore the duplicate');
  await (await page.$('.field-list article .field-actions button:nth-child(2)')).click();
  const xInput = await page.$('.field-form input[name=x]');
  await xInput.evaluate((element) => { element.value = '80'; element.dispatchEvent(new Event('input', { bubbles: true })); });
  await (await buttonByText('Apply')).click();
  await page.waitForFunction(() => !document.querySelector('.field-form'));
  check((await page.$eval('.field-list article small', (element) => element.textContent))?.includes('[80,'), 'Precise field position was not applied');
  await (await buttonByText('Save changes')).click();
  await page.waitForFunction(() => document.querySelector('.save-state')?.textContent?.includes('All changes saved'));
  await page.click('[aria-label="Switch to dark theme"]');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark' && !document.documentElement.classList.contains('theme-liquid'));
  await new Promise((resolve) => setTimeout(resolve, 200));
  await page.screenshot({ path: '/tmp/templatecraft-editor-dark.png', fullPage: true });
  await page.click('[aria-label="Switch to light theme"]');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light' && !document.documentElement.classList.contains('theme-liquid'));
  await new Promise((resolve) => setTimeout(resolve, 200));
  await page.screenshot({ path: '/tmp/templatecraft-editor-light.png', fullPage: true });
  await page.click('[aria-label="Choose theme colors"]');
  await page.click('.palette-option:has(input[value="lavender"])');
  await new Promise((resolve) => setTimeout(resolve, 200));
  await page.screenshot({ path: '/tmp/templatecraft-palette-light.png', fullPage: true });
  await page.click('[role="switch"][aria-label="Dark mode"]');
  await page.waitForFunction(() => !document.documentElement.classList.contains('theme-liquid'));
  await new Promise((resolve) => setTimeout(resolve, 200));
  await page.screenshot({ path: '/tmp/templatecraft-palette-dark.png', fullPage: true });
  check((await page.$eval('.save-state', (element) => element.textContent))?.includes('All changes saved'), 'Appearance changes modified the PDF workspace');
  await page.setViewport({ width: 320, height: 844, deviceScaleFactor: 1 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Palette picker overflows at 320px');
  check(await page.$eval('#appearance-picker', (element) => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth; }), 'Palette picker extends outside the mobile viewport');
  await page.screenshot({ path: '/tmp/templatecraft-palette-mobile.png', fullPage: true });
  await page.keyboard.press('Escape');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Editor overflows on mobile');
  await page.screenshot({ path: '/tmp/templatecraft-editor-mobile.png', fullPage: true });
} catch (error) {
  await page.screenshot({ path: '/tmp/templatecraft-smoke-failure.png', fullPage: true });
  console.error(await page.$$eval('.field-form input', (elements) => elements.map((element) => ({ name: element.name, value: element.value, valid: element.validity.valid, message: element.validationMessage }))));
  throw error;
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('React editor smoke test passed: fields, document text, stamp upload, free drag/resize, stamp undo/redo/save, typography, focused panels, themes, mobile layout, shortcuts, duplication, filtering, and precise positioning.');
