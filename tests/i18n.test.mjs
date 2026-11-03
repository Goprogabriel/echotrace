import test from 'node:test';
import assert from 'node:assert/strict';
import {getLanguage,getLocale,setLanguage,languageFromUrl,languageUrl,translateText as t} from '../dist/js/i18n.js';
import {english} from '../dist/js/i18n-catalog.js';

test('Language URLs retain the current page and unrelated parameters',()=>{
  const url=languageUrl('https://example.test/echotrace/?test=1#/lab','en');
  assert.equal(url,'https://example.test/echotrace/?test=1&lang=en#/lab');
  assert.equal(languageFromUrl(url),'en');assert.equal(languageFromUrl(languageUrl(url,'da')),'da');
  assert.equal(languageFromUrl('https://example.test/?lang=invalid'),'da');
});
test('Danish remains unchanged and English handles nested progress and runtime values',()=>{
  const progress='Ny søgning med FFT 16.384 · Frekvensvindue 25 af 71';
  setLanguage('da');assert.equal(t(progress),progress);assert.equal(getLocale(),'da-DK');
  setLanguage('en');assert.equal(getLanguage(),'en');assert.equal(getLocale(),'en-GB');
  assert.equal(t(progress),'Retrying with FFT 16,384 · Frequency window 25 of 71');
  assert.equal(t('Henter globale flydata · 3 sider · 1.000 flybaner'),'Fetching global flight data · 3 pages · 1,000 flight tracks');
  assert.equal(t('  Optagelsens starttid · UTC  '),'  Recording start time · UTC  ');
  assert.equal(t('private-file.MOV'),'private-file.MOV');assert.equal(t('0.128'),'0.128');
  setLanguage('da');
});
test('Composite empty results translate each sentence without fabricating a detection',()=>{
  setLanguage('en');
  const text=t('Ingen kurver opfylder kravene til varighed, sammenhæng og frekvensfald. Afprøvet FFT: 8.192, 16.384, 32.768. Zoom ind, eller tegn en kurve manuelt, hvis du faktisk kan se den. Manglende kurver afgør ikke, om der er et fly i optagelsen.');
  assert(text.includes('No curves meet the duration'));assert(text.includes('FFT sizes tried: 8,192, 16,384, 32,768.'));
  assert(text.includes('Missing curves do not determine whether the recording contains an aircraft.'));
  assert.equal(t('Datoen ligger uden for tjenestens arkiv (2025-04-28 → 2026-11-02). Importér historiske data i stedet.'),'The date is outside the service archive (2025-04-28 → 2026-11-02). Import historical data instead.');
  setLanguage('da');
});
test('Every dynamic catalogue entry preserves its captured placeholders',()=>{
  for(const [source,target] of Object.entries(english)){
    assert.equal(typeof target,'string',source);
    assert.deepEqual(source.match(/\{\d+\}/g)?.sort()||[],target.match(/\{\d+\}/g)?.sort()||[],source);
  }
});
