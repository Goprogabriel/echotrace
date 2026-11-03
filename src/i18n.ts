import {english} from './i18n-catalog.js';
export type Language = 'da' | 'en';
let language: Language = 'da';
export const getLanguage = (): Language => language;
export const getLocale = (): string => language === 'en' ? 'en-GB' : 'da-DK';
export function setLanguage(value: Language): void { language = value; }
export function languageFromUrl(url: string): Language { return new URL(url).searchParams.get('lang') === 'en' ? 'en' : 'da'; }
export function languageUrl(url: string, value: Language): string {
  const result = new URL(url); result.searchParams.set('lang', value); return result.href;
}
const normalize = (value: string): string => value.trim().replace(/\s+/g, ' ');
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.entries(english).filter(([key]) => /\{\d+\}/.test(key)).sort(([a],[b]) => b.replace(/\{\d+\}/g,'').length - a.replace(/\{\d+\}/g,'').length).map(([key, value]) => ({
  expression: new RegExp('^' + key.split(/\{\d+\}/).map(escapeRegExp).join('([\\s\\S]+?)') + '$'), value
}));
/** Danish source copy is the stable key. Captured values remain plain text, never HTML. */
export function translateText(value: string): string {
  if (language === 'da' || !value.trim()) return value;
  const text = normalize(value);
  if (/^[1-9]\d{0,2}(?:\.\d{3})+(?:, [1-9]\d{0,2}(?:\.\d{3})+)*$/.test(text)) return value.replace(/\.(?=\d{3}(?:\D|$))/g, ',');
  let translated = english[text];
  if (!translated) for (const pattern of patterns) {
    const match = text.match(pattern.expression);
    if (match) { translated = pattern.value.replace(/\{(\d+)\}/g, (_all, index: string) => translateText(match[Number(index) + 1])); break; }
  }
  if (!translated) {
    const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÆØÅ])/);
    if (sentences.length > 1) translated = sentences.map(sentence => translateText(sentence)).join(' ');
  }
  if (!translated) return value;
  return value.match(/^\s*/)?.[0] + translated + value.match(/\s*$/)?.[0];
}
const originalText = new WeakMap<Node, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
/** Called on freshly rendered UI, and on shared shell elements when language changes. */
export function translateTree(root: ParentNode): void {
  const doc = root instanceof Document ? root : root.ownerDocument!;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent || parent.closest('script,style,[data-i18n-skip],.file-info,.source-credit,.dataset-loaded p,.dataset-loaded small')) continue;
    if (!originalText.has(node)) originalText.set(node, node.textContent || '');
    node.textContent = translateText(originalText.get(node)!);
  }
  for (const el of root.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) {
    if (el.closest('[data-i18n-skip]') || el.matches('.file-info strong')) continue;
    let originals = originalAttributes.get(el);
    if (!originals) { originals = new Map(); originalAttributes.set(el, originals); }
    for (const name of ['aria-label','title','placeholder','alt']) {
      if (!el.hasAttribute(name)) continue;
      if (!originals.has(name)) originals.set(name, el.getAttribute(name)!);
      el.setAttribute(name, translateText(originals.get(name)!));
    }
  }
}
