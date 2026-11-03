import type {AppState} from '../state.js';
import {isBusy} from '../state.js';
import {sensitivityProfile} from '../core/sensitivity.js';
import {esc} from './ui.js';

export function sensitivitySummary(value: number): string {
  const p = sensitivityProfile(value);
  return `Mindst ${p.minDurationSeconds.toFixed(1)} s spor · maks. ${(p.maxRelativeRmse * 100).toFixed(2)}% frekvensfejl · mindst ${p.minContrastDb.toFixed(1)} dB lydstøtte`;
}
export function sensitivityPending(s: AppState): boolean {
  return !!s.analysis && (s.analysis.sensitivity ?? 50) !== s.sensitivity;
}
export function sensitivityPanel(s: AppState): string {
  const busy = isBusy(s), pending = sensitivityPending(s);
  return `<section class="panel sensitivity-panel" aria-labelledby="sensitivity-title">
<div class="sensitivity-heading"><label id="sensitivity-title" for="sensitivity">Følsomhed</label><output id="sensitivity-value" for="sensitivity">${s.sensitivity} / 100</output></div>
<input type="range" id="sensitivity" name="sensitivity" min="0" max="100" step="1" value="${s.sensitivity}" aria-describedby="sensitivity-summary sensitivity-note" ${busy||!s.analysis?'disabled':''}>
<div class="sensitivity-scale"><span>Strengere krav</span><span>Mere følsom</span></div>
<p id="sensitivity-summary" class="sensitivity-summary" aria-live="polite">${esc(sensitivitySummary(s.sensitivity))}</p>
<p id="sensitivity-note" class="small-print">Højere følsomhed kan finde svagere og kortere spor, men giver flere falske matches. Værdien er ikke en sikkerhedsprocent.</p>
<div class="sensitivity-actions"><button class="btn btn-secondary btn-small" data-action="sensitivity-apply" ${!pending||busy?'disabled':''}>Anvend og analysér igen</button><span class="small-print" role="status">${pending?'Ny følsomhed afventer lydanalyse.':'Følsomheden gælder både lydanalyse og flymatch.'}</span></div></section>`;
}
