// Native Chromium regression; no font mocks, reset, reload, backend or URL rewrite.
// Run: node scripts/audit/font-retry-regression.mjs
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { build } from 'vite';
import { chromium } from '@playwright/test';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const directory = await mkdtemp(join(tmpdir(), 'edeviser-font-retry-'));
let server, browser;
try {
  const root = join(directory, 'fixture'), outDir = join(directory, 'dist');
  await mkdir(root); await mkdir(join(root, 'env'));
  // Import CSS under its real F: source identity so Vite rebases asset URLs there.
  await writeFile(join(root, 'entry.js'), `import '@/design-system/fonts.css'; import * as preferences from '@/lib/fontPreferences'; window.preferences = preferences;`);
  await writeFile(join(root, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><style>
    #latin,#base{font-family:"Source Sans 3",sans-serif} #arabic{font-family:"Noto Sans Arabic","Source Sans 3",sans-serif}
    #heading{font-family:"Plus Jakarta Sans",sans-serif} .dyslexia-font #latin{font-family:"OpenDyslexic","Source Sans 3",sans-serif}
    </style></head><body><p id="latin">Readable Latin evidence</p><p id="base">Default text evidence</p><p id="arabic" lang="ar" dir="rtl">نص عربي للتحقق من خط القراءة</p><h1 id="heading">Heading evidence</h1><textarea id="draft" aria-label="Draft"></textarea><script type="module" src="/entry.js"></script></body></html>`);
  await build({root, configFile:false, envDir:join(root,'env'), publicDir:false, resolve:{alias:{'@':join(repository,'src')}}, build:{outDir,emptyOutDir:true,assetsInlineLimit:0}});
  server = createServer(async (req,res) => {
    try {
      const path = new URL(req.url,'http://fixture').pathname;
      const file = path === '/' ? join(outDir,'index.html') : resolve(outDir,'.'+decodeURIComponent(path));
      assert(file.startsWith(outDir+sep));
      res.setHeader('Cache-Control','no-store');
      res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff':'font/woff','.woff2':'font/woff2'})[extname(file)] ?? 'application/octet-stream');
      res.end(await readFile(file));
    } catch (error) { res.statusCode=500; res.end(String(error)); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser = await chromium.launch({headless:true});
  const context = await browser.newContext({serviceWorkers:'block'});
  const page = await context.newPage();
  const requests=[], errors=[], failures=[], warnings=[];
  let fail=true, navigations=0;
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++;});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('requestfailed',request=>failures.push({url:request.url(),error:request.failure()?.errorText}));
  page.on('console',message=>{if(['warning','error'].includes(message.type()))warnings.push({text:message.text(),url:message.location().url});});
  page.on('response',response=>{if(response.status()>=400)errors.push(`HTTP ${response.status()} ${response.url()}`);});
  await page.route('**/*',async route=>{
    const url=route.request().url();
    assert.equal(new URL(url).origin,`http://127.0.0.1:${server.address().port}`);
    if (/\.woff2?$/.test(url)) {
      requests.push(url);
      if (fail && /OpenDyslexic-Regular-/.test(url)) return route.abort('failed');
    }
    return route.continue();
  });
  const readingRequests=()=>requests.filter(url=>url.includes('OpenDyslexic'));
  const settleBase=()=>page.evaluate(async()=>{
    // Explicit test prewarming verifies all seven siblings, not production eager fetch.
    await Promise.all([...document.fonts].filter(f=>!f.family.includes('OpenDyslexic')).map(f=>f.load()));
    document.body.getBoundingClientRect(); await document.fonts.ready;
  });
  const snapshot=()=>page.evaluate(()=>({
    state:document.documentElement.dataset.alternateFont,
    active:document.documentElement.classList.contains('dyslexia-font'),
    faces:[...document.fonts].map(f=>`${f.family}/${f.style}/${f.weight}/${f.status}`),
    rules:[...document.styleSheets].flatMap(s=>[...s.cssRules].filter(r=>r instanceof CSSFontFaceRule).map(r=>r.cssText)),
  }));
  const attempt=()=>page.evaluate(async()=>{
    window.preferences.applyDyslexiaFont(true);
    try { await window.preferences.loadDyslexiaFont(); return null; } catch(error) { return error.message; }
  });
  const glyphs=async()=>{
    await page.evaluate(async()=>{document.body.getBoundingClientRect();await document.fonts.ready;});
    const cdp=await context.newCDPSession(page);
    try {
      await cdp.send('DOM.enable');await cdp.send('CSS.enable');
      const {root}=await cdp.send('DOM.getDocument');
      const result={};
      for(const selector of ['#latin','#base','#arabic','#heading']){
        const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});
        const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
        const painted=fonts.filter(f=>f.glyphCount>0);
        assert(painted.length>0&&painted.every(f=>f.isCustomFont),`Custom glyphs ${selector}: ${JSON.stringify(fonts)}`);
        result[selector]=painted.map(f=>f.familyName).sort();
      }
      return result;
    } finally { await cdp.detach(); }
  };
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(()=>!!window.preferences);
  await settleBase();
  assert.equal(readingRequests().length,0,'OFF must not request optional fonts');
  const baseline=await snapshot(), baseGlyphs=await glyphs();
  assert.equal(baseline.faces.length,11);
  assert.equal(requests.length,7);
  assert.deepEqual(baseGlyphs['#latin'],['Source Sans 3 ExtraLight']);
  assert.deepEqual(baseGlyphs['#arabic'],['Noto Sans Arabic','Source Sans 3 ExtraLight']);
  await page.locator('#draft').fill('unsaved draft stays');
  assert(await attempt());
  const cold=await snapshot();
  assert.equal(cold.state,'error');assert.equal(cold.active,false);
  assert.equal(cold.faces.filter(f=>f.endsWith('/error')).length,1);
  assert.equal(cold.faces.filter(f=>f.includes('OpenDyslexic')&&f.endsWith('/loaded')).length,3);
  assert.equal(readingRequests().length,4);
  // Restore transport first: the unchanged native API still cannot recover.
  fail=false;
  const nativeFailure=await page.evaluate(async()=>{
    try{await document.fonts.load('normal 400 16px "OpenDyslexic"','Aa');return null;}catch(error){return error.message;}
  });
  assert(nativeFailure);assert.equal(readingRequests().length,4,'Native retry reuses sticky error, makes no request');
  fail=true;
  assert(await attempt(),'Continued transport failure must remain an error');
  assert.equal((await snapshot()).state,'error');
  assert.equal(readingRequests().length,5,'Only failed source retried');
  fail=false;
  assert.equal(await attempt(),null);
  await settleBase();
  const recovered=await snapshot();
  assert.equal(recovered.state,'ready');assert.equal(recovered.active,true);
  assert.equal(recovered.faces.length,11);assert(recovered.faces.every(f=>f.endsWith('/loaded')));
  assert.deepEqual(recovered.rules,baseline.rules,'Same canonical registry text, URL base, descriptors and order');
  assert.equal(readingRequests().length,6);
  for(const url of new Set(requests))assert.equal(requests.filter(value=>value===url).length,/OpenDyslexic-Regular-/.test(url)?3:1,'No healthy face redownload');
  const recoveredGlyphs=await glyphs();
  assert.deepEqual(recoveredGlyphs['#latin'],['OpenDyslexic']);
  for(const selector of ['#base','#arabic','#heading'])assert.deepEqual(recoveredGlyphs[selector],baseGlyphs[selector]);
  await page.evaluate(()=>window.preferences.applyDyslexiaFont(false));
  assert.deepEqual(await glyphs(),baseGlyphs);
  await page.evaluate(()=>window.preferences.applyDyslexiaFont(true));
  assert.equal((await snapshot()).state,'ready');assert.equal(requests.length,13);
  assert.equal(await page.locator('#draft').inputValue(),'unsaved draft stays');assert.equal(navigations,1);
  assert.equal(failures.length,2);assert(failures.every(f=>/OpenDyslexic-Regular-/.test(f.url)&&f.error==='net::ERR_FAILED'));
  assert.equal(warnings.filter(w=>w.text.startsWith('Optional Latin reading font could not be loaded:')).length,2);
  assert(warnings.every(w=>w.text.startsWith('Optional Latin reading font could not be loaded:')||(/OpenDyslexic-Regular-/.test(w.url)&&w.text.includes('net::ERR_FAILED'))));
  assert.deepEqual(errors,[]);
  console.log('PASS: native sticky-error repro; persistent failure remains truthful; same-URL recovery; 11 loaded faces; no healthy redownload; exact CSS preserved; custom Latin/Arabic/base glyphs; warm OFF/ON; one navigation and draft retained.',JSON.stringify({requests:requests.map(url=>url.split('/').pop()),baseGlyphs,recoveredGlyphs}));
  await context.close();
} finally {
  await browser?.close();
  if(server)await new Promise(resolve=>server.close(resolve));
  await rm(directory,{recursive:true,force:true});
}
