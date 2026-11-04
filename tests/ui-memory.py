"""Browser UI/worker/codec test without network navigation (managed Chromium blocks all URLs).
Modules and fixtures are loaded from local files into in-memory Blob URLs. Production CSP and
real provider requests are deliberately NOT claimed as covered by this harness.
"""
import asyncio,json,base64,re,os,shutil
from pathlib import Path
from playwright.async_api import async_playwright
PROJECT=Path(__file__).resolve().parent.parent
ROOT=PROJECT/'dist';OUT=PROJECT/'test-output';OUT.mkdir(exist_ok=True)
html=(ROOT/'index.html').read_text();html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>','',html);html=re.sub(r'<link[^>]+>','',html);html=re.sub(r'<script[^>]*>.*?</script>','',html)
sources={str(p.relative_to(ROOT)):p.read_text() for p in (ROOT/'js').rglob('*.js')}
fixtures={str(p.relative_to(ROOT)):base64.b64encode(p.read_bytes()).decode() for p in list((ROOT/'assets').glob('*'))+list((ROOT/'examples').glob('*.json'))+list((ROOT/'data').glob('*.json'))}
loader=r'''async ({sources,fixtures})=>{
  window.__requests=[];window.__download=null;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async (input,options)=>{
    const key=String(input).replace(/^\.\//,'');window.__requests.push(key);
    if(fixtures[key]){const raw=atob(fixtures[key]),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));return new Response(bytes,{status:200,headers:{'Content-Type':key.endsWith('.json')?'application/json':key.endsWith('.mp4')?'video/mp4':'application/octet-stream'}});}
    if(String(input).startsWith('blob:'))return nativeFetch(input,options);
    throw new TypeError('External network deliberately disabled in the test harness');
  };
  const originalClick=HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click=function(){if(this.download&&this.href.startsWith('blob:')){window.__download=nativeFetch(this.href).then(r=>r.text());return;}return originalClick.call(this);};
  const urls={};
  function path(base,rel){return new URL(rel,'https://test.invalid/'+base).pathname.slice(1);}
  function build(key){
    if(urls[key])return urls[key];
    let source=sources[key];if(!source)throw new Error('Missing module '+key);
    // Opaque about:blank cannot start module workers; flatten the unchanged engine modules
    // into one classic worker for this local-only test. Production ships the original ES modules.
    if(key==='js/workers/analysis.worker.js'){
      source=['js/core/math.js','js/core/regions.js','js/core/tracks.js','js/core/sensitivity.js','js/core/signal.js','js/core/physics.js','js/core/matcher.js','js/core/global-search.js','js/core/spectral-support.js','js/core/sound-scan.js','js/core/flight-diagnostics.js',key].map(k=>sources[k].replace(/^import .*?;$/gm,'').replace(/\bexport /g,'')).join('\n');
    }
    if(key==='js/app.js')source=source.replace(/type:\s*['"]module['"]/g,"type: 'classic'");
    source=source.replace(/new URL\((['"])([^'"]+)\1,\s*import\.meta\.url\)/g,(_,q,rel)=>JSON.stringify(build(path(key,rel))));
    source=source.replace(/(from\s+['"])(\.{1,2}\/[^'"]+)(['"])/g,(_,prefix,rel,end)=>prefix+build(path(key,rel))+end);
    urls[key]=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));return urls[key];
  }
  const script=document.createElement('script');script.type='module';script.src=build('js/app.js');document.body.append(script);
}'''
async def boot(page):
 await page.set_content(html)
 await page.add_style_tag(content=(ROOT/'styles.css').read_text())
 await page.evaluate(loader,{'sources':sources,'fixtures':fixtures})
 await page.locator('.hero h1').wait_for(timeout=12000)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await boot(page)
  print('BOOTED',flush=True)
  await page.wait_for_timeout(500)
  await page.screenshot(path=str(OUT/'home-desktop.png'))
  await page.evaluate("document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('visible'))")
  await page.wait_for_timeout(800)
  await page.screenshot(path=str(OUT/'home-full.png'),full_page=True)
  await page.get_by_role('button',name='Prøv demoen',exact=True).click()
  try:await page.locator('#results').wait_for(timeout=12000)
  except Exception:
   print('ERRORS',errors);print(await page.locator('body').inner_text());await page.screenshot(path=str(OUT/'error.png'),full_page=True);raise
  await page.locator('#results').scroll_into_view_if_needed();await page.wait_for_timeout(700)
  await page.screenshot(path=str(OUT/'results-desktop.png'))
  await page.evaluate('window.scrollTo({top:0,behavior:"instant"})');await page.wait_for_timeout(300)
  await page.screenshot(path=str(OUT/'lab-desktop.png'))
  await page.get_by_role('button',name='Eksportér rapport').click();await page.wait_for_timeout(200)
  report=json.loads(await page.evaluate('window.__download'));(OUT/'demo-report.json').write_text(json.dumps(report,indent=2))
  print('DESKTOP DEMO COMPLETED',flush=True)
  await page.evaluate("location.hash='/privacy'");await page.get_by_role('heading',name='Privatliv').wait_for()
  await page.evaluate("location.hash='/method'");await page.get_by_role('heading',name='Sådan virker Echotrace').wait_for()
  # Reuse loaded app with a real file-selection event and local JSON import.
  await page.set_input_files('#media-input',str(PROJECT/'public/assets/demo.wav'))
  await page.locator('.sound-card').first.wait_for(timeout=12000)
  await page.get_by_role('button',name='Undersøg flybaner',exact=True).click()
  await page.locator('#search-form').wait_for(timeout=12000)
  assert not await page.locator('.lab-title .pill').count()
  await page.locator('input[name=date]').fill('2026-08-18T11:00')
  await page.locator('.advanced>summary').click()
  await page.locator('select[name=clock]').select_option('0');await page.locator('input[name=altitude]').fill('12')
  await page.set_input_files('#data-input',str(PROJECT/'public/examples/demo-flights.json'))
  await page.locator('input[name=consent]').check()
  await page.get_by_role('button',name='Find mulige steder',exact=True).click()
  await page.locator('#results').wait_for(timeout=12000)
  # Invalid media file must show an error, never a new invented result.
  await page.set_input_files('#media-input',{'name':'unsupported.txt','mimeType':'text/plain','buffer':b'not a video'})
  await page.locator('.error-box').wait_for()
  mobile=await browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
  mobile.on('pageerror',lambda e:errors.append('mobile: '+str(e)))
  await boot(mobile);await mobile.wait_for_timeout(300)
  await mobile.screenshot(path=str(OUT/'home-mobile.png'))
  overflow=await mobile.evaluate('document.documentElement.scrollWidth>innerWidth')
  await mobile.get_by_role('button',name='Prøv demoen',exact=True).click();await mobile.locator('#results').wait_for(timeout=12000)
  await mobile.locator('#results').scroll_into_view_if_needed();await mobile.wait_for_timeout(700)
  await mobile.screenshot(path=str(OUT/'results-mobile.png'))
  await mobile.screenshot(path=str(OUT/'results-mobile-full.png'),full_page=True)
  mobile_overflow=await mobile.evaluate('document.documentElement.scrollWidth>innerWidth')
  summary={'testMode':'local in-memory Blob-module harness; managed Chromium blocks network navigation','errors':errors,'fetches':await page.evaluate('window.__requests'),'desktopCandidateCount':len(report['result']['candidates']),'modelMisfit':report['result']['candidates'][0]['misfit'],'tracks':len(report['signal']['tracks']),'accepted':report['result']['candidates'][0]['accepted'],'mobileLandingOverflow':overflow,'mobileResultsOverflow':mobile_overflow,'chromiumVersion':browser.version,'realFileInputAndLocalImport':True,'invalidFileError':True,'reportExportContent':True}
  (OUT/'browser-test-summary.json').write_text(json.dumps(summary,indent=2));print('SUMMARY',json.dumps(summary,indent=2));await browser.close()
asyncio.run(main())
