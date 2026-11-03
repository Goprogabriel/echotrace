import {footer, header, icon} from '../components/ui.js';
export function homePage(): string {
  return `${header()}<main id="main">
<section class="hero page-width"><div class="hero-copy"><h1>Find sporet<br><em>i lyden.</em></h1><p class="hero-description">Undersøg lyden i din video, og sammenlign den med flyenes bevægelse.</p><div class="hero-actions"><button class="btn btn-primary btn-large" data-action="upload">${icon('upload')}Vælg en video</button><button class="btn btn-secondary btn-large" data-action="demo">${icon('play')}Prøv demoen</button></div><p class="hero-trust">${icon('lock')}Din video bliver på din enhed.</p></div><div class="spectrum-hero"><div class="spectrum-hero-heading">Lyden som billede<span>Illustration</span></div><canvas id="preview-spectrum" aria-label="Illustration af frekvensspor over tid, ikke en måling"></canvas></div></section>
<section id="how" class="how-section page-width"><h2>Fra optagelse til overblik</h2><div class="steps-grid"><article class="step-card">${icon('file')}<h3>Vælg en optagelse</h3><p>Åbn en video eller lydfil. Analysen kører i din browser.</p></article><article class="step-card">${icon('wave')}<h3>Se lydens spor</h3><p>Find frekvensspor, og vælg optagelsestid og søgeområde.</p></article><article class="step-card">${icon('map')}<h3>Udforsk kortet</h3><p>Sammenlign med flydata, og se hvilke områder der passer til lyden.</p></article></div><p class="method-note">Echotrace er eksperimentelt. Et muligt match er ikke en bekræftet placering. <a href="#/method">Læs om metoden ${icon('arrow')}</a></p></section>
<section class="faq-section page-width"><h2>Godt at vide</h2><div class="faq-list">${[
['Hvad skal jeg bruge?','En optagelse på 5 sekunder–30 minutter, højst 150 MB, med tydelig flystøj. Du skal kende den omtrentlige starttid i UTC og vælge et afgrænset søgeområde.'],
['Bliver min video uploadet?','Nej. Video og lyd behandles på din enhed. Kortvisningen henter kort fra OpenStreetMap. Henter du flydata, sendes søgeområde og tidsinterval til adsb.aero.'],
['Hvad viser demoen?','En syntetisk optagelse og to simulerede flybaner. Du kan prøve hele analysen uden at finde en optagelse først.']
].map(([q,a])=>`<details><summary>${q}${icon('plus')}</summary><p>${a}</p></details>`).join('')}</div></section>
</main>${footer()}`;
}
