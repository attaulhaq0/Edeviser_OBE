// Round15: actual layouts/header/profile menu/dialog and the single preference
// owner. Only auth/ordinary Supabase DTOs, native Storage failures and explicitly
// controlled optional-font transport and owned public chart props are seams.
// No UI, query hook, owner, font
// loader, CSS or journal is replaced. No auth/backend/deployment/visual approval.
// Run: node --test scripts/audit/reading-display-regression.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { build, normalizePath } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { chromium, expect } from "@playwright/test";
import { parse } from "@babel/parser";

const repository=fileURLToPath(new URL("../../",import.meta.url));
const require=createRequire(import.meta.url);
const legacy=await readFile(join(repository,"scripts/shell-navigation.regression.mjs"),"utf8");
const legacyAst=parse(legacy,{sourceType:"module"});
// Reuse the frozen suite's exact strict parser, without importing/executing its
// test runner or copying/weakening the color implementation.
const functionSource=(name)=>{
  const node=legacyAst.program.body.find((node)=>node.type==="FunctionDeclaration" && node.id.name===name);
  assert(node,`Missing shared strict scalar helper ${name}`);
  return legacy.slice(node.start,node.end);
};
const contrastSource=functionSource("contrastFromCssColors");
const textContrastSource=functionSource("readCssTextContrast");
const locales=Object.fromEntries(await Promise.all(["en","ar"].map(async language=>[language,JSON.parse(await readFile(join(repository,`src/locales/${language}/common.json`),"utf8"))])));
const roles=["student","teacher","coordinator","admin","parent"];
const prefs=(extra={})=>({font_size:"default",high_contrast:false,reduced_animations:false,dyslexia_font:false,simplified_view:false,...extra});

const transport=`
import React, {createContext,useContext,useMemo,useState} from "react";
import {createProfilePreferenceSync} from "@/lib/profilePreferenceSync";
import {ProfilePreferenceSyncContext} from "@/providers/ProfilePreferenceSyncContext";
const state=window.__reading;
const AuthDTO=createContext(null);
export const useAuth=()=>useContext(AuthDTO);
export function AuthDTOBoundary({children}) {
  const [identity,setIdentity]=useState({id:"reading-a",loading:false,revision:0});
  const [profilePatch,setProfilePatch]=useState({});
  const sync=useMemo(()=>createProfilePreferenceSync((ownerId,leaves,isCurrent)=>{if(isCurrent())setProfilePatch(current=>({...current,...leaves}));}),[]);
  const ownership=sync.setOwner(identity.id);
  state.actorId=identity.id;state.renderedRevision=identity.revision;
  const profile=identity.id?{id:identity.id,role:state.config.role,institution_id:"reading-institution",full_name:state.config.language==="ar"?"حساب مراجعة إعدادات القراءة الطويل الاسم والمتعدد الكلمات ".repeat(3):"Long Reading Preferences Review Account With Multiple Family Names ".repeat(3),avatar_url:"/avatar.svg",onboarding_completed:true,tour_completed_at:"2026-01-01T00:00:00Z",preferred_language:state.config.language,theme_preference:state.config.theme,...profilePatch}:null;
  state.changeActor=(id)=>{sync.setOwner(id);setProfilePatch({});setIdentity(current=>({id,loading:false,revision:current.revision+1}));};
  state.refreshIdentity=(loading=false)=>setIdentity(current=>({...current,loading,revision:current.revision+1}));
  const auth={user:identity.id?{id:identity.id,email:"reading@example.invalid",email_confirmed_at:"2026-01-01T00:00:00Z"}:null,profile,role:profile?.role??null,institutionId:profile?.institution_id??null,isLoading:identity.loading,signOut:async()=>state.changeActor(null),refetchProfile:async()=>state.refreshIdentity(false)};
  return <AuthDTO.Provider value={auth}><ProfilePreferenceSyncContext.Provider value={{sync,ownership}}>{children}</ProfilePreferenceSyncContext.Provider></AuthDTO.Provider>;
}
function query(table) {
  const call={table,select:"",filters:[],payload:null,single:false};
  let signal;
  const chain=(method,...args)=>{call.filters.push({method,args});return builder;};
  const builder={
    select:(columns="*",options)=>{call.select=columns;call.options=options;return builder;},
    update:(payload)=>{call.method="update";call.payload=payload;return builder;},
    // Closed write boundary: record attempted writes even if a consumer swallows
    // the rejection. These are not successful business API implementations.
    insert:(payload)=>{state.calls.push({table,method:"insert",payload});throw new Error("Closed fixture insert: "+table);},
    upsert:(payload)=>{state.calls.push({table,method:"upsert",payload});throw new Error("Closed fixture upsert: "+table);},
    delete:()=>{state.calls.push({table,method:"delete",payload:{}});throw new Error("Closed fixture delete: "+table);},
    eq:(...args)=>chain("eq",...args),neq:(...args)=>chain("neq",...args),in:(...args)=>chain("in",...args),is:(...args)=>chain("is",...args),not:(...args)=>chain("not",...args),or:(...args)=>chain("or",...args),gt:(...args)=>chain("gt",...args),gte:(...args)=>chain("gte",...args),lt:(...args)=>chain("lt",...args),lte:(...args)=>chain("lte",...args),order:(...args)=>chain("order",...args),limit:(...args)=>chain("limit",...args),range:(...args)=>chain("range",...args),contains:(...args)=>chain("contains",...args),
    abortSignal:(next)=>{signal=next;return builder;},single:()=>{call.single=true;return builder;},maybeSingle:()=>{call.single=true;return builder;},
    then:(resolve,reject)=>execute(call,signal).then(resolve,reject),
  };return builder;
}
async function execute(call,signal) {
  state.calls.push(call);
  const actor=call.filters.find(f=>f.method==="eq"&&f.args[0]==="id")?.args[1];
  const preference=call.table==="profiles"&&(call.select.includes("accessibility_preferences")||call.payload?.accessibility_preferences);
  const phase=call.payload?"write":"read";
  if(call.payload && (!preference && !Object.keys(call.payload).every(key=>["theme_preference","preferred_language"].includes(key)))) throw new Error("Unauthorized fixture mutation: "+call.table);
  if(preference) {
    const mode=state.modes[phase];
    if(mode==="hold" && (!state.faultActor || state.faultActor===actor)) await new Promise(resolve=>{const held={phase,actor,resolve};state.held.push(held);signal?.addEventListener("abort",resolve,{once:true});});
    if(signal?.aborted)return {data:null,error:new Error("Aborted owned DTO read")};
    if(state.modes[phase]==="error"){const error=new Error("Controlled preference "+phase+" failure");state.expectedErrors.add(error);return {data:null,error};}
    if(state.modes[phase]==="invalid")return {data:{id:actor,accessibility_preferences:{font_size:"invalid"}},error:null};
    if(state.modes[phase]==="missing")return {data:null,error:null};
    if(call.payload)state.accounts[actor]=JSON.parse(JSON.stringify(call.payload.accessibility_preferences));
    state.settled.push({phase,actor});
    return {data:{id:actor,accessibility_preferences:JSON.parse(JSON.stringify(state.accounts[actor]))},error:null};
  }
  // G04-only ordinary DTO rows. The actual aggregate hook deliberately ignores
  // RPC children and resolves them through its real verified-link/read chain.
  if(state.config.parentDashboard&&!call.payload){
    const child="dashboard-child",institution="reading-institution";
    if(call.table==="parent_student_links")return {data:[{student_id:child,created_at:"2026-01-01T00:00:00Z"}],error:null};
    if(call.table==="profiles"&&call.filters.some(filter=>filter.method==="in"&&filter.args[0]==="id"&&filter.args[1].includes(child)))return {data:[{id:child,full_name:state.config.parentFirstName+" Family العائلة",institution_id:institution}],error:null};
    if(call.table==="institutions"&&call.filters.some(filter=>filter.method==="in"&&filter.args[0]==="id"))return {data:[{id:institution,name:"Fixture School مدرسة"}],error:null};
    if(call.table==="student_gamification"&&call.filters.some(filter=>filter.method==="in"&&filter.args[0]==="student_id"))return {data:[{student_id:child,level:1,xp_total:0,streak_current:0}],error:null};
  }
  if(call.table==="profiles")return {data:call.single?{id:actor,...state.accounts[actor]}:[],error:null,count:0};
  const allowed=["courses","programs","departments","institutions","parent_student_links","student_courses","student_gamification","xp_transactions","habit_logs","notifications","survey_assignments","survey_responses","surveys","submissions","grades","outcome_attainment","learning_outcomes","outcome_mappings","audit_logs","mastery_recovery_pathways","assignments","user_preferences"];
  if(!allowed.includes(call.table))throw new Error("Undeclared ordinary DTO read: "+call.table);
  return {data:call.single?null:[],error:null,count:0};
}
export const supabase={
  from:query,
  rpc:async(name,args)=>{state.calls.push({rpc:name,args});if(name==="get_parent_dashboard"&&state.config.parentDashboard){if(Object.keys(args??{}).length)throw new Error("Parent aggregate must keep its argument-free contract");return {data:{kpis:{linkedChildren:1,totalCourses:0,avgAttainment:0,upcomingDeadlines:0},children:[]},error:null};}if(name==="get_xp_balance")return {data:0,error:null};if(name==="get_teacher_dashboard")return {data:{kpis:{totalCourses:0,totalStudents:0,pendingSubmissions:0,avgAttainment:0,atRiskCount:0,gradedThisWeek:0},bloomsDistribution:[]},error:null};throw new Error("Undeclared RPC DTO: "+name);},
  channel:()=>{const channel={on:()=>channel,subscribe:callback=>{callback?.("SUBSCRIBED");return channel;},unsubscribe:async()=>{}};return channel;},removeChannel:async()=>{},
  auth:{getUser:async()=>({data:{user:state.actorId?{id:state.actorId}:null},error:null}),getSession:async()=>({data:{session:state.actorId?{user:{id:state.actorId},access_token:"fixture-only"}:null},error:null})},
};
`;

const entry=`
import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter,Routes,Route,useLocation} from "react-router-dom";
import {QueryClient,QueryClientProvider,QueryCache,MutationCache} from "@tanstack/react-query";
import {I18nextProvider,initReactI18next} from "react-i18next";
import i18next from "i18next";
import {NuqsAdapter} from "nuqs/adapters/react-router/v7";
import {AuthDTOBoundary} from "./transport.jsx";
import {AccessibilityPreferencesProvider} from "@/providers/AccessibilityPreferencesProvider";
import {AccessibilityMotion} from "@/providers/AccessibilityMotion";
import SkipToMain from "@/components/shared/SkipToMain";
import {useAccessibilityPreferenceControls} from "@/hooks/useAccessibilityPreferences";
import {ThemeProvider} from "@/providers/ThemeProvider";
import {LanguageProvider} from "@/providers/LanguageProvider";
import StudentLayout from "@/pages/student/StudentLayout";
import TeacherLayout from "@/pages/teacher/TeacherLayout";
import CoordinatorLayout from "@/pages/coordinator/CoordinatorLayout";
import AdminLayout from "@/pages/admin/AdminLayout";
import ParentLayout from "@/pages/parent/ParentLayout";
const ParentDashboard=React.lazy(()=>import("@/pages/parent/ParentDashboard"));
const StudyTimeChart=React.lazy(()=>import("@/components/shared/StudyTimeChart"));
import AppToaster from "@/components/shared/AppToaster";
import "@/index.css";
const resources=READING_LOCALES;
const state=window.__reading;
function Probe(){const controls=useAccessibilityPreferenceControls();state.snapshot={ownerKey:controls.ownerKey,effective:{...controls.effective},read:controls.profileRead.status,account:controls.accountSync.status,device:controls.devicePersistence.status,font:controls.fontRequest};return null;}
// Owned public-prop consumer, not a chart/query/animation mock. Deliberately do
// not acknowledge controlled filter callbacks until the test changes the prop.
function VisualizationBody(){
  const [model,setModel]=useState({data:[{weekStartDate:"2026-04-20",totalMinutes:121},{weekStartDate:"2026-04-06",totalMinutes:0},{weekStartDate:"2026-04-13",totalMinutes:153}],average:99,filter:null,revision:0});
  state.vizChange=patch=>setModel(current=>({...current,...patch,revision:current.revision+1}));
  state.vizCase=name=>{if(name==="empty")state.vizChange({data:[],average:undefined});else if(name==="edge")state.vizChange({data:[{weekStartDate:"2026-02-30",totalMinutes:NaN},{weekStartDate:"",totalMinutes:undefined},{weekStartDate:"2026-03-02",totalMinutes:Infinity},{weekStartDate:"2026-03-09",totalMinutes:0},{weekStartDate:"2026-03-09",totalMinutes:-90}],average:NaN});};
  useEffect(()=>{state.vizRevision=model.revision;},[model.revision]);
  return <React.Suspense fallback={null}><StudyTimeChart data={model.data} averageMinutesPerWeek={model.average} courseFilter={model.filter} courseOptions={[{id:"course-a",name:"ExtendedLearningنورالمعرفةCourse"}]} onCourseFilterChange={id=>{state.vizFilterCalls??=[];state.vizFilterCalls.push(id);}}/></React.Suspense>;
}
function RouteBody(){const [nonce]=useState(()=>++state.mountSerial);const route=useLocation();useEffect(()=>{state.routeMount=nonce;},[nonce]);if(state.config.parentDashboard&&route.pathname==="/parent/dashboard")return <div data-reading-route={route.pathname} data-route-mount={nonce}><React.Suspense fallback={null}><ParentDashboard/></React.Suspense></div>;if(state.config.visualization)return <div data-reading-route={route.pathname} data-route-mount={nonce}><VisualizationBody/></div>;return <section data-reading-route={route.pathname} data-route-mount={nonce} className="space-y-5"><h1>Reading preference fixture</h1><p data-latin-proof>Readable Latin evidence: ordinary words and punctuation.</p><p data-arabic-proof lang="ar" dir="rtl">نص عربي للتحقق من خط القراءة وإعدادات العرض.</p><p>Only this body is an owned fixture; all layouts, header controls, dialog and preference behavior above are real.</p></section>;}
const layouts={student:StudentLayout,teacher:TeacherLayout,coordinator:CoordinatorLayout,admin:AdminLayout,parent:ParentLayout};
async function boot(){const language=state.config.language;const bundles=resources;const i18n=i18next.createInstance();await i18n.use(initReactI18next).init({lng:language,fallbackLng:"en",defaultNS:"common",resources:bundles,interpolation:{escapeValue:false}});const onError=error=>{if(!state.expectedErrors.has(error))state.unexpectedQueryErrors.push(error.message??String(error));};const client=new QueryClient({queryCache:new QueryCache({onError}),mutationCache:new MutationCache({onError}),defaultOptions:{queries:{retry:false,refetchOnWindowFocus:false},mutations:{retry:false}}});createRoot(document.getElementById("root")).render(<I18nextProvider i18n={i18n}><BrowserRouter><NuqsAdapter><QueryClientProvider client={client}><AuthDTOBoundary><LanguageProvider><ThemeProvider><AccessibilityPreferencesProvider><AccessibilityMotion><SkipToMain/><Probe/><Routes>{Object.entries(layouts).map(([role,Layout])=><Route key={role} path={"/"+role} element={<Layout/>}><Route path="*" element={<RouteBody/>}/></Route>)}</Routes><AppToaster/></AccessibilityMotion></AccessibilityPreferencesProvider></ThemeProvider></LanguageProvider></AuthDTOBoundary></QueryClientProvider></NuqsAdapter></BrowserRouter></I18nextProvider>);}
boot().catch(error=>{console.error(error);throw error;});
`;

async function fixture(directory){
  const root=join(directory,"fixture"),outDir=join(directory,"dist");await mkdir(root,{recursive:true});await mkdir(join(root,"env"));
  const namespaces=["common","student","teacher","admin","coordinator","auth","gamification","ai"];
  const imports=["en","ar"].flatMap(language=>namespaces.map(namespace=>`import ${language}_${namespace} from "@/locales/${language}/${namespace}.json";`)).join("\n");
  const bundle="{"+["en","ar"].map(language=>language+":{"+namespaces.map(namespace=>namespace+":"+language+"_"+namespace).join(",")+"}").join(",")+"}";
  await writeFile(join(root,"entry.jsx"),imports+"\n"+entry.replace("READING_LOCALES",bundle));await writeFile(join(root,"transport.jsx"),transport);
  await writeFile(join(root,"index.html"),'<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/entry.jsx"></script></body></html>');
  const sourceScope={name:"reading-fixture-source-scope",enforce:"pre",transform(code,id){if(normalizePath(id.split("?")[0])===normalizePath(join(repository,"src/index.css")))return code+`\n@source ${JSON.stringify(normalizePath(join(repository,"src")))};\n`;}};
  const alias=[{find:"@/hooks/useAuth",replacement:join(root,"transport.jsx")},{find:"@/lib/supabase",replacement:join(root,"transport.jsx")}];
  for(const name of ["react","react/jsx-runtime","react/jsx-dev-runtime","react-dom","react-dom/client","react-router-dom","@tanstack/react-query","i18next","react-i18next","sonner","nuqs/adapters/react-router/v7"]){const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");alias.push({find:new RegExp("^"+escaped+"$"),replacement:require.resolve(name)});}
  alias.push({find:"@",replacement:join(repository,"src")});
  await build({root,configFile:false,envDir:join(root,"env"),envPrefix:"READING_FIXTURE_PUBLIC_",publicDir:false,cacheDir:join(directory,"cache"),plugins:[react(),sourceScope,tailwindcss()],resolve:{alias,dedupe:["react","react-dom","@tanstack/react-query"],preserveSymlinks:false},build:{outDir,emptyOutDir:true,chunkSizeWarningLimit:4000},define:{"process.env.NODE_ENV":JSON.stringify("production")}});
  const mime={".html":"text/html",".js":"application/javascript",".css":"text/css",".svg":"image/svg+xml",".png":"image/png",".woff":"font/woff",".woff2":"font/woff2"};
  const server=createServer(async(req,res)=>{try{const path=new URL(req.url,"http://fixture").pathname;if(path==="/avatar.svg"){res.setHeader("Content-Type","image/svg+xml");return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#336699"/></svg>');}const file=resolve(outDir,"."+decodeURIComponent(path));if(!file.startsWith(outDir+sep))throw new Error("Invalid asset path");let bytes;try{bytes=await readFile(file);}catch{if(path.startsWith("/assets/")){res.statusCode=404;return res.end("Missing fixture asset");}bytes=await readFile(join(outDir,"index.html"));res.setHeader("Content-Type","text/html");}res.setHeader("Cache-Control","no-store");if(!res.hasHeader("Content-Type"))res.setHeader("Content-Type",mime[extname(file)]??"application/octet-stream");res.end(bytes);}catch(error){res.statusCode=500;res.end(String(error));}});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));return {base:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}

async function scene(browser,base,options={}){
  const config={role:"student",language:"en",theme:"light",highContrast:false,width:390,rootFont:16,...options};
  const context=await browser.newContext({viewport:{width:config.width,height:900},locale:config.language,colorScheme:config.theme==="light"?"dark":"light",hasTouch:true,reducedMotion:"no-preference",serviceWorkers:"block"});
  await context.addInitScript(({config,contrastSource,initial})=>{
    window.__shellContrastMath=(0,eval)("("+contrastSource+")");
    const state=window.__reading={config,calls:[],held:[],settled:[],expectedErrors:new Set(),unexpectedQueryErrors:[],modes:{read:config.readMode??"ok",write:"ok"},accounts:{"reading-a":{...initial,unknown_owned_json:{keep:[1,"ordered"]}},"reading-b":{...initial,high_contrast:false,unknown_owned_json:{keep:[2,"other"]}}},mountSerial:0,storageDenied:false,preferenceStorageWrites:0};
    localStorage.setItem("theme",config.theme);localStorage.setItem("edeviser-language",config.language);localStorage.setItem("edeviser-accessibility-prefs",JSON.stringify(initial));
    const nativeSet=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){if(this===localStorage&&key==="edeviser-accessibility-prefs")state.preferenceStorageWrites++;if(this===localStorage&&key==="edeviser-accessibility-prefs"&&state.storageDenied)throw new DOMException("Controlled device storage denial","QuotaExceededError");return nativeSet.call(this,key,value);};
    state.release=(phase)=>{const held=state.held.filter(item=>!phase||item.phase===phase);state.held=state.held.filter(item=>phase&&item.phase!==phase);held.forEach(item=>item.resolve());};
  },{config,contrastSource,initial:prefs({font_size:config.rootFont===20?"x-large":"default",high_contrast:config.highContrast})});
  const page=await context.newPage(),failures=[],expectedFaults=[],requests=[],heldFonts=[],pending=new Map();let fontMode="normal";
  const finish=request=>{pending.get(request)?.resolve();pending.delete(request);};
  const settleRequests=async()=>{await page.evaluate(async()=>{await new Promise(requestAnimationFrame);document.body.getBoundingClientRect();await document.fonts.ready;});while(pending.size)await Promise.all([...pending.values()].map(item=>item.promise));};
  page.on("pageerror",error=>failures.push(`pageerror ${error.message}`));
  page.on("request",request=>{requests.push({url:request.url(),type:request.resourceType()});let resolve;const promise=new Promise(done=>{resolve=done;});pending.set(request,{promise,resolve});});
  page.on("requestfinished",finish);
  page.on("requestfailed",request=>{finish(request);const fault=expectedFaults.find(item=>item.url===request.url()&&!item.observed);if(fault){fault.observed=true;fault.error=request.failure()?.errorText;}else failures.push(`${request.url()}: ${request.failure()?.errorText}; scene=${page.url()}`);});
  page.on("response",response=>{if(response.status()>=400)failures.push(`HTTP ${response.status()} ${response.url()}`);});
  page.on("console",message=>{if(!["error","warning"].includes(message.type()))return;const expected=expectedFaults.find(fault=>fault.url===message.location().url);if(expected&&message.text().includes("net::ERR_FAILED")){expected.consoleObserved=true;return;}if(message.type()==="warning"&&message.text().startsWith("Optional Latin reading font could not be loaded:")&&expectedFaults.length===1){expectedFaults[0].loaderWarning=true;return;}failures.push(`console ${message.type()} ${message.text()}; at=${message.location().url}`);});
  await page.route("**/*",async route=>{const url=route.request().url();if(new URL(url).origin!==base){failures.push(`Nonlocal ${url}`);return route.abort();}if(/OpenDyslexic.*\.woff(?:$|\?)/.test(url)){if(fontMode==="fail-one"){fontMode="normal";expectedFaults.push({url,observed:false});return route.abort("failed");}if(fontMode==="hold")return new Promise(resolve=>heldFonts.push(async()=>{await route.continue();resolve();}));}return route.continue();});
  const path=config.parentDashboard?"/parent/dashboard":config.role==="student"?"/student/journal":`/${config.role}/profile`;
  await page.goto(base+path,{waitUntil:"networkidle"});await page.waitForFunction(()=>window.__reading.snapshot&&window.__reading.routeMount);
  await page.waitForFunction(config=>{const root=document.documentElement;return root.lang===config.language&&root.dir===(config.language==="ar"?"rtl":"ltr")&&getComputedStyle(root).fontSize===config.rootFont+"px"&&root.classList.contains("dark")===(config.theme==="dark")&&root.classList.contains("high-contrast")===config.highContrast;},config);
  await page.waitForFunction(()=>document.querySelector('meta[name="theme-color"]')?.content===getComputedStyle(document.documentElement).getPropertyValue("--background").trim());
  if(config.readMode!=="hold")await page.waitForFunction(()=>window.__reading.snapshot.read!=="pending");
  await page.evaluate(async()=>{document.body.getBoundingClientRect();await document.fonts.ready;});
  await expect(page.locator("header .hdr-profile")).toHaveCount(1);
  return {page,context,config,failures,requests,expectedFaults,setFontMode:value=>{fontMode=value;},releaseFonts:async()=>{fontMode="normal";for(const release of heldFonts.splice(0))await release();},close:async()=>{fontMode="normal";for(const release of heldFonts.splice(0))await release();await settleRequests();await context.close();},assertClean:async()=>{await settleRequests();await page.waitForFunction(()=>document.querySelector('meta[name="theme-color"]')?.content===getComputedStyle(document.documentElement).getPropertyValue("--background").trim());assert.deepEqual(failures,[]);assert.deepEqual(await page.evaluate(()=>window.__reading.unexpectedQueryErrors),[],"Unexpected real Query/Mutation errors (including incomplete DTO seams)");}};
}

async function nativeTabTo(page,control){if(await control.evaluate(element=>document.activeElement===element&&element.matches(":focus-visible")))return;for(let index=0;index<32;index++){await page.keyboard.press("Tab");if(await control.evaluate(element=>document.activeElement===element))return;}assert.fail("Native Tab did not reach actual control");}
async function settleSurface(surface){await surface.evaluate(async element=>{await new Promise(requestAnimationFrame);await Promise.all(element.getAnimations({subtree:true}).filter(animation=>Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation=>animation.finished));element.getBoundingClientRect();});}
async function focusGeometry(control,opaqueSurface=false){
  await settleSurface(control);
  const geometry=await control.evaluate((element,{source,opaqueSurface})=>{
    const r=element.getBoundingClientRect(),s=getComputedStyle(element);
    const shadows=[...s.boxShadow.matchAll(/((?:rgba?|oklab|oklch|color)\([^)]*\)) 0px 0px 0px ([\d.]+)px/g)].map(match=>({color:match[1],spread:Number(match[2])}));
    const outline=s.outlineStyle!=="none"?parseFloat(s.outlineWidth):0,offset=parseFloat(s.outlineOffset)||0;
    const ring=Math.max(0,...shadows.map(shadow=>shadow.spread),outline+offset);
    const paintWidth=Math.max(outline,...shadows.map(shadow=>shadow.spread-(parseFloat(s.getPropertyValue("--tw-ring-offset-width"))||0)));
    const clipped=[];
    for(let ancestor=element.parentElement;ancestor&&ancestor!==document.body&&ancestor!==document.documentElement;ancestor=ancestor.parentElement){const style=getComputedStyle(ancestor),a=ancestor.getBoundingClientRect();
      const bl=parseFloat(style.borderLeftWidth),br=parseFloat(style.borderRightWidth),bt=parseFloat(style.borderTopWidth),bb=parseFloat(style.borderBottomWidth);
      const scrollLeft=Math.max(0,ancestor.clientLeft-bl),scrollRight=Math.max(0,ancestor.offsetWidth-ancestor.clientWidth-bl-br-scrollLeft),scrollBottom=Math.max(0,ancestor.offsetHeight-ancestor.clientHeight-bt-bb);
      const left=a.left+bl+scrollLeft,right=a.right-br-scrollRight,top=a.top+bt,bottom=a.bottom-bb-scrollBottom;
      if(/^(hidden|auto|scroll|clip)$/.test(style.overflowX)&&(r.left-ring<left||r.right+ring>right))clipped.push({axis:"x",tag:ancestor.tagName,role:ancestor.getAttribute("role"),left,right});
      if(/^(hidden|auto|scroll|clip)$/.test(style.overflowY)&&(r.top-ring<top||r.bottom+ring>bottom))clipped.push({axis:"y",tag:ancestor.tagName,role:ancestor.getAttribute("role"),top,bottom});
      // Fixed portals are clipped by their own descendants and the viewport,
      // not the scrollbar-compensated body's narrower layout rectangle.
      if(style.position==="fixed")break;
    }
    // Header backdrop paint is deliberately not numerically certified. Opaque
    // actual menu/dialog/listbox ancestors support the shared strict parser.
    let indicators=null;
    if(opaqueSurface||element.closest('[role="dialog"],[role="menu"],[role="listbox"]')){const measure=(0,eval)("("+source+")");indicators=[];if(outline>=3)indicators.push({width:outline,ratio:window.__shellContrastMath(s.outlineColor,measure(offset<0?element:element.parentElement).backgroundLayers).ratio});for(const shadow of shadows)if(shadow.spread>=3)indicators.push({width:shadow.spread,ratio:window.__shellContrastMath(shadow.color,measure(element.parentElement).backgroundLayers).ratio});}
    const points=[[r.x+r.width/2,r.y+r.height/2],[r.x+r.width/2,r.top+1],[r.x+r.width/2,r.bottom-1],[r.left+1,r.y+r.height/2],[r.right-1,r.y+r.height/2]];
    return {w:r.width,h:r.height,top:r.top,bottom:r.bottom,left:r.left,right:r.right,ring,paintWidth,clipped,indicators,width:innerWidth,height:innerHeight,active:document.activeElement===element,visible:element.matches(":focus-visible"),hit:points.every(([x,y])=>element.contains(document.elementFromPoint(x,y)))};
  },{source:textContrastSource,opaqueSurface});
  assert(geometry.w>=44&&geometry.h>=44&&geometry.paintWidth>=3&&geometry.top>=geometry.ring&&geometry.bottom+geometry.ring<=geometry.height&&geometry.left>=geometry.ring&&geometry.right+geometry.ring<=geometry.width&&geometry.active&&geometry.visible&&geometry.hit&&geometry.clipped.length===0,`Actual native focus/44px/full3px/clipping/occlusion: ${JSON.stringify(geometry)}`);
  if(geometry.indicators)assert(geometry.indicators.some(indicator=>indicator.ratio>=3),`Actual3px focus indicator contrast: ${JSON.stringify(geometry.indicators)}`);
}
async function assertClosedProfile(page,count=1){
  await expect(page.locator("header .hdr-profile")).toHaveCount(count);
  // Raw DOM selectors include suspended/aria-hidden exit nodes that role queries
  // intentionally omit. A closed accessible tree alone cannot prove disposal.
  await expect(page.locator('[role="dialog"],[role="menu"]')).toHaveCount(0);
  await page.waitForFunction(()=>getComputedStyle(document.body).pointerEvents!=="none");
}
async function activateNative(page,control){await nativeTabTo(page,control);await focusGeometry(control);await page.keyboard.press("Enter");}
async function assertReducedCss(dialog){const paint=await dialog.evaluate(element=>{const style=getComputedStyle(element);return {animationDuration:style.animationDuration,animationDelay:style.animationDelay,transitionDuration:style.transitionDuration,transitionDelay:style.transitionDelay};});for(const key of ["animationDuration","transitionDuration"])assert(paint[key].split(",").every(value=>parseFloat(value)===0||parseFloat(value)===(value.trim().endsWith("ms")?0.01:0.00001)),`Canonical presence-safe0.01ms duration: ${JSON.stringify(paint)}`);for(const key of ["animationDelay","transitionDelay"])assert(paint[key].split(",").every(value=>parseFloat(value)===0),`Zero reduced-motion delay: ${JSON.stringify(paint)}`);}
async function chooseSize(page,dialog,copy,value){
  const control=dialog.getByRole("combobox",{name:copy.accessibility.fontSize,exact:true});await nativeTabTo(page,control);await focusGeometry(control);await page.keyboard.press("ArrowDown");
  const listbox=page.getByRole("listbox");await expect(listbox).toBeVisible();await settleSurface(listbox);await expect(listbox.getByRole("option",{selected:true})).toBeFocused();
  await page.keyboard.press("Home");await expect(listbox.getByRole("option",{name:copy.accessibility.fontDefault,exact:true})).toBeFocused();
  if(value==="large")await page.keyboard.press("ArrowDown");if(value==="x-large")await page.keyboard.press("End");
  const label=copy.accessibility[({default:"fontDefault",large:"fontLarge","x-large":"fontXLarge"})[value]];
  await expect(listbox.getByRole("option",{name:label,exact:true})).toBeFocused();await page.keyboard.press("Enter");
  await page.waitForFunction(value=>window.__reading.snapshot.effective.font_size===value&&getComputedStyle(document.documentElement).fontSize===({default:"16px",large:"18px","x-large":"20px"})[value],value);await expect(control).toBeFocused();
}
async function openDialog(s){
  const {page}=s;
  await page.evaluate(()=>{const state=window.__reading;state.menuNavigationTrace=[];const observe=event=>{const target=event.target;if(!(target instanceof Element))return;if(event.type==="keydown"&&!["Enter","ArrowDown","Home","Tab"].includes(event.key))return;state.menuNavigationTrace.push({type:event.type,key:event.key??null,role:target.getAttribute("role"),slot:target.getAttribute("data-slot"),text:(target.getAttribute("aria-label")??target.textContent??"").trim().slice(0,64),owner:state.snapshot.ownerKey,actor:state.actorId,mount:state.routeMount,profiles:document.querySelectorAll("header .hdr-profile").length});if(state.menuNavigationTrace.length>128)state.menuNavigationTrace.shift();};document.addEventListener("focusin",observe,true);document.addEventListener("keydown",observe,true);state.stopMenuTrace=()=>{document.removeEventListener("focusin",observe,true);document.removeEventListener("keydown",observe,true);};});
  try{return await openDialogNavigation(s);}catch(error){const trace=await page.evaluate(()=>window.__reading.menuNavigationTrace);throw new Error(`${error.message}; native menu focus/ownership trace=${JSON.stringify(trace)}`,{cause:error});}finally{await page.evaluate(()=>{window.__reading.stopMenuTrace();delete window.__reading.stopMenuTrace;});}
}
async function openDialogNavigation(s){
  const {page,config}=s,copy=locales[config.language],trigger=page.locator('[data-tour="profile"]');
  await nativeTabTo(page,trigger);await focusGeometry(trigger);await page.keyboard.press("Enter");
  const menu=page.getByRole("menu").first(),item=page.getByRole("menuitem",{name:copy.accessibility.menuLabel,exact:true});await expect(item).toBeVisible();await settleSurface(menu);
  const entries=menu.locator(':is([role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]):not([data-disabled]):not([aria-disabled="true"]):visible');
  const targetIndex=await entries.evaluateAll((elements,label)=>elements.findIndex(element=>element.textContent.trim()===label),copy.accessibility.menuLabel);
  assert(targetIndex>=0&&targetIndex<16,`Missing/unbounded real menu destination: ${targetIndex}`);
  // Radix deliberately defers each roving focus move with setTimeout. Native
  // key dispatch completion is NOT focus completion: never queue another arrow
  // based on a stale activeElement read (or transiently pass through the target).
  await expect(entries.first()).toBeFocused();
  for(let index=1;index<=targetIndex;index++){await page.keyboard.press("ArrowDown");await expect(entries.nth(index)).toBeFocused();}
  await expect(item).toBeFocused();await focusGeometry(item);
  const trace=await page.evaluate(()=>window.__reading.menuNavigationTrace);
  assert.equal(trace.filter(event=>event.type==="keydown"&&event.key==="ArrowDown").length,targetIndex,"Exactly one native arrow per observed ordinal destination");
  assert.equal(new Set(trace.map(event=>event.owner)).size,1,"Owner changed during menu navigation");assert.equal(new Set(trace.map(event=>event.mount)).size,1,"Route remounted during menu navigation");assert(trace.every(event=>event.profiles===1),"Duplicate/missing profile during native navigation");
  await paint(page,menu);await page.keyboard.press("Enter");const dialog=page.getByRole("dialog",{name:copy.accessibility.menuLabel,exact:true});await expect(dialog).toBeVisible();await expect(page.getByRole("menu")).toHaveCount(0);await settleSurface(dialog);return {dialog,trigger,copy};
}
async function paint(page,scope){await settleSurface(scope);const bad=await scope.locator("h1,h2,h3,p,label,button,[role='switch'],[role='combobox'],[role='option'],[role='menuitem']").evaluateAll((elements,source)=>{const measure=(0,eval)("("+source+")");return elements.filter(element=>element.checkVisibility()&&element.textContent.trim()&&!element.closest('[aria-hidden="true"]')).map(element=>({text:element.textContent.slice(0,75),...measure(element)})).filter(value=>value.ratio<4.5);},textContrastSource);assert.deepEqual(bad,[],"Strict normal-text contrast");assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),"Horizontal document overflow");}
async function inspectDialog(s){const {page}=s;const {dialog,trigger,copy}=await openDialog(s);await page.evaluate(async()=>{await document.fonts.ready;});await paint(page,dialog);const topClose=dialog.getByRole("button",{name:copy.buttons.close,exact:true}).first();await expect(topClose).toBeFocused();await focusGeometry(topClose);const select=dialog.getByRole("combobox",{name:copy.accessibility.fontSize,exact:true});await page.keyboard.press("Tab");await expect(select).toBeFocused();await focusGeometry(select);await page.keyboard.press("ArrowDown");const listbox=page.getByRole("listbox");await expect(listbox).toBeVisible();await settleSurface(listbox);await focusGeometry(listbox.getByRole("option",{selected:true}));assert.equal(await listbox.evaluate(element=>!!element.closest('[role="dialog"]')),false,"Select must exercise its nested portal");await paint(page,listbox);await page.keyboard.press("Escape");await expect(listbox).toHaveCount(0);await expect(dialog).toBeVisible();await expect(select).toBeFocused();for(const label of [copy.accessibility.highContrast,copy.accessibility.reducedAnimations,copy.accessibility.dyslexiaFont]){await page.keyboard.press("Tab");await focusGeometry(dialog.getByRole("switch",{name:label,exact:true}));}await page.keyboard.press("Tab");await focusGeometry(dialog.getByRole("button",{name:copy.buttons.close,exact:true}).last());await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();await focusGeometry(trigger);await assertClosedProfile(page);}
async function readingGlyphs(page,reading){
  await page.evaluate(async()=>{await document.fonts.ready;});
  const arabic=await page.evaluate(()=>document.documentElement.lang.startsWith("ar"));
  const latin=reading?"OpenDyslexic":"Source Sans 3 ExtraLight";
  const probes=[["[data-latin-proof]",latin,false],["[data-arabic-proof]","Noto Sans Arabic",true],['[role="dialog"] [data-slot="dialog-description"]',arabic?"Noto Sans Arabic":latin,arabic]];
  const cdp=await page.context().newCDPSession(page);
  try{await cdp.send("DOM.enable");await cdp.send("CSS.enable");const {root}=await cdp.send("DOM.getDocument");
    for(const [selector,expected,allowLatin] of probes){const {nodeId}=await cdp.send("DOM.querySelector",{nodeId:root.nodeId,selector});assert(nodeId,`Missing actual glyph target ${selector}`);const {fonts}=await cdp.send("CSS.getPlatformFontsForNode",{nodeId});const observed=fonts.filter(font=>font.glyphCount>0);assert(observed.some(font=>font.familyName===expected)&&observed.every(font=>font.isCustomFont&&[expected,...(allowLatin?[latin]:[])].includes(font.familyName)),`Actual glyph ownership ${selector}: ${JSON.stringify(fonts)}`);}
    if(reading){const faces=await page.evaluate(()=>[...document.fonts].filter(face=>face.family.replace(/^["']|["']$/g,"")==="OpenDyslexic").map(face=>`${face.style}/${face.weight}/${face.status}`).sort());assert.deepEqual(faces,["italic/400/loaded","italic/700/loaded","normal/400/loaded","normal/700/loaded"],"One canonical loaded face per reading style/weight");}
  }finally{await cdp.detach();}
}

// Seven bounded groups; no existing suite/budget is changed. Each group is120s;
// outer allows their840s plus90s fixture build/cleanup, not unbounded retries.
async function inspectParentAvailability(s){
  const {page,config}=s,copy=locales[config.language].parentDashboard;
  const text=value=>value.replaceAll("{{name}}",config.parentFirstName);
  const help=page.getByRole("region",{name:copy.help.title,exact:true}),celebrate=page.getByRole("region",{name:copy.celebrate.title,exact:true});
  await expect(help).toBeVisible();await expect(celebrate).toBeVisible();
  await expect(help.getByText(text(copy.help.prompt),{exact:true})).toBeVisible();
  await expect(help.getByText(text(copy.help.explanation),{exact:true})).toBeVisible();
  await expect(celebrate.getByText(text(copy.celebrate.detail),{exact:true})).toBeVisible();
  const reminder=help.getByRole("button",{name:copy.help.remindBtn,exact:true}),encouragement=celebrate.getByRole("button",{name:copy.celebrate.sendBtn,exact:true});
  for(const [button,explanation,region] of [[reminder,text(copy.help.unavailable),help],[encouragement,text(copy.celebrate.unavailable),celebrate]]){
    await expect(button).toBeDisabled();await expect(region.getByText(explanation,{exact:true})).toBeVisible();
    assert.equal(await button.evaluate(element=>document.getElementById(element.getAttribute("aria-describedby"))?.textContent.trim()),explanation,"Unavailable action must reference its real localized explanation");
  }
  // Only adopted G04 headings, explanations and enabled links: legacy dashboard
  // islands/rail and disabled-control contrast/hit geometry are NOT certified.
  for(const region of [help,celebrate]){
    await settleSurface(region);assert.equal(await region.evaluate(element=>getComputedStyle(element).direction),config.language==="ar"?"rtl":"ltr");
    const rows=await region.locator("h2,p,a[href]").evaluateAll((elements,source)=>{const measure=(0,eval)("("+source+")");return elements.map(element=>{const bounds=element.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(element);const outside=[...range.getClientRects()].filter(rect=>rect.left<bounds.left||rect.right>bounds.right).map(rect=>({left:rect.left,right:rect.right}));return {sample:element.textContent.trim().slice(0,90),left:bounds.left,right:bounds.right,outside,...measure(element)};});},textContrastSource);
    assert.deepEqual(rows.filter(row=>row.ratio<4.5),[],"G04 scoped normal text contrast");assert.deepEqual(rows.filter(row=>row.outside.length),[],"G04 text must reflow inside its own bounds without shortening the mixed-script first name");
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),"Parent dashboard horizontal document overflow");
  for(const [label,path] of [[copy.help.openNotifications,"/parent/notifications"],[copy.help.moreIdeas,"/parent/support"]]){
    const link=help.getByRole("link",{name:label,exact:true});await expect(link).toHaveAttribute("href",path);await nativeTabTo(page,link);await focusGeometry(link,true);
    assert.equal(await page.evaluate(()=>document.activeElement?.matches("button:disabled")),false,"Native Tab must skip unavailable buttons");
    await page.keyboard.press("Enter");await page.waitForURL(url=>url.pathname===path);
    // Browser-history proof only. The passive fixture destination is not the
    // legacy notifications/support page and cannot certify those G05 bodies.
    await page.goBack();await page.waitForURL(url=>url.pathname==="/parent/dashboard");await expect(help).toBeVisible();
    await expect(reminder).toBeDisabled();await expect(encouragement).toBeDisabled();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),"Parent dashboard overflow after native history return");
  }
  const calls=await page.evaluate(()=>window.__reading.calls.map(call=>({table:call.table??null,rpc:call.rpc??null,write:Boolean(call.payload)||["insert","upsert","update","delete"].includes(call.method),filters:call.filters??[]})));
  assert(calls.some(call=>call.rpc==="get_parent_dashboard"),"Actual parent aggregate RPC must run");assert(calls.some(call=>call.table==="parent_student_links"&&call.filters.some(filter=>filter.method==="eq"&&filter.args[0]==="verified"&&filter.args[1]===true)),"Actual verified-link resolution must run");
  assert.deepEqual(calls.filter(call=>call.write),[],"Availability and existing-link navigation must never attempt a write");await expect(page.locator('[data-sonner-toast][data-type="success"]')).toHaveCount(0);await s.assertClean();
}

let visualizationCaptureDirectory;
async function captureVisualization(s,chart,copy){
  const {config,page}=s;if(![1280,320].includes(config.width)||!((config.language==="en"&&config.theme==="light")||(config.language==="ar"&&config.theme==="dark")))return;
  const show=chart.getByRole("button",{name:copy.showData,exact:true});await nativeTabTo(page,show);await page.keyboard.press("Enter");await expect(chart.getByRole("region",{name:copy.dataTitle,exact:true})).toBeVisible();const frames=await observeBars(page);assert.deepEqual(frames.at(-1),frames.at(-2),"Capture only settled real SVG after table layout");
  visualizationCaptureDirectory??=await mkdtemp(join(tmpdir(),"edeviser-viz-captured-unreviewed-"));const path=join(visualizationCaptureDirectory,`${config.language}-${config.theme}-${config.width}-root${config.rootFont}-captured-unreviewed.png`);
  // Full-page capture after behavioral probes: no element screenshot scroll
  // repair and no approved baseline or visual-review assertion.
  await page.screenshot({path,fullPage:true});console.log(`CAPTURED_UNREVIEWED ${path}`);
}
async function observeBars(page,change=null){
  return page.evaluate(async change=>{if(change)window.__reading.vizChange(change);const frames=[];for(let index=0;index<48;index++){await new Promise(requestAnimationFrame);frames.push([...document.querySelectorAll('[data-testid="study-time-chart"] .recharts-bar-rectangle path')].map(path=>{const r=path.getBBox();return [r.x,r.y,r.width,r.height];}));}return frames;},change);
}
async function chartOracle(page,language){return page.evaluate(language=>{const numbers=new Intl.NumberFormat(language,{maximumFractionDigits:1}),dates=new Intl.DateTimeFormat(language,{year:"numeric",month:"short",day:"numeric",calendar:"gregory",timeZone:"UTC"});return {dates:["2026-04-20","2026-04-06","2026-04-13","2026-03-02","2026-03-09"].map(date=>dates.format(new Date(date+"T00:00:00Z"))),values:[2,0,2.6,1.7,-1.5,3,5].map(value=>numbers.format(value))};},language);}
async function assertChartPaint(chart){
  const result=await chart.evaluate((element,source)=>{const measure=(0,eval)("("+source+")");const bg=measure(element).backgroundLayers;
    const inspect=(selector,property,minimum)=>[...element.querySelectorAll(selector)].filter(node=>{const r=node.getBBox();return r.width>0&&r.height>=0;}).map(node=>({kind:selector,sample:node.textContent?.trim(),paint:getComputedStyle(node)[property],ratio:window.__shellContrastMath(getComputedStyle(node)[property],bg).ratio,minimum}));
    // Axis strokes are intentionally absent. Axis text is essential normal text;
    // gridlines are decorative, not silently certified as 3:1 graphics.
    return [...inspect(".recharts-bar-rectangle path","fill",3),...inspect(".recharts-reference-line-line","stroke",3),...inspect(".recharts-cartesian-axis-tick-value","fill",4.5)];
  },textContrastSource);
  assert(result.some(item=>item.kind.includes("bar-rectangle")),"Missing actual SVG bars");assert(result.some(item=>item.kind.includes("axis-tick")),"Missing actual SVG axes");assert.deepEqual(result.filter(item=>item.ratio<item.minimum),[],"Actual essential SVG fill/stroke paint contrast");
}
async function inspectVisualization(s){
  const {page,config}=s,copy=locales[config.language].studyTimeChart,oracle=await chartOracle(page,config.language),hours=value=>copy.hours.replace("{{value}}",value);
  const chart=page.getByTestId("study-time-chart"),figure=chart.getByRole("figure",{name:copy.title,exact:true}),plot=chart.getByRole("application",{name:copy.title,exact:true});await expect(figure).toBeVisible();await expect(plot).toBeVisible();
  const wrapper=await chart.locator(".recharts-wrapper").boundingBox();assert(wrapper&&wrapper.width>0&&wrapper.height>0,"Actual responsive chart wrapper must have positive measured bounds");
  const frames=await observeBars(page);assert.deepEqual(frames.at(-1),frames.at(-2),"Real SVG animation must settle");assert.deepEqual(frames.at(-2),frames.at(-3),"Real SVG geometry must remain settled");
  const bars=frames.at(-1).filter(rect=>rect[2]>0&&rect[3]>0);assert.equal(bars.length,2,"Zero is recorded, not a positive-height bar");assert(config.language==="ar"?bars[0][0]>bars[1][0]:bars[0][0]<bars[1][0],"Actual bar placement follows input order with RTL axis reversal");
  await assertChartPaint(chart);
  const average=copy.average.replace("{{hours}}",hours(oracle.values[3]));const summary=copy.summary.replace("{{recordCount}}",oracle.values[5]).replace("{{average}}",average);await expect(figure.getByText(summary,{exact:true})).toBeVisible();await expect(chart.locator(".recharts-reference-line-line")).toHaveCount(1);
  // Supplied99min=1.7h, not an average recomputed from121/0/153. The label
  // authority is exact; SVG reference placement must also lie below the2h bar.
  const referenceY=await chart.locator(".recharts-reference-line-line").evaluate(line=>Number(line.getAttribute("y1")));assert(referenceY>bars[0][1]&&referenceY<bars[0][1]+bars[0][3]);
  const axis=await chart.locator(".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value").evaluateAll((nodes,language)=>{const number=new Intl.NumberFormat(language,{useGrouping:false}),digits=Array.from({length:10},(_,index)=>number.format(index)),decimal=number.formatToParts(1.1).find(part=>part.type==="decimal").value;return nodes.map(node=>{let text=node.textContent;digits.forEach((digit,index)=>{text=text.replaceAll(digit,String(index));});return {value:parseFloat(text.replaceAll(decimal,".").replace(/[\u061c\u200e\u200f]/g,"")),y:Number(node.getAttribute("y")),label:node.textContent};}).sort((a,b)=>a.value-b.value);},config.language);
  assert(axis.length>=2&&axis.every(tick=>Number.isFinite(tick.value)&&tick.label.trim().endsWith(copy.hours.replace("{{value}}","").trim())),`Actual axis units must be localized: ${JSON.stringify(axis)}`);
  const low=axis[0],high=axis.at(-1),valueAt=y=>Math.round((low.value+(low.y-y)/(low.y-high.y)*(high.value-low.value))*10)/10;
  // Compare represented values at the component's declared one-decimal semantic
  // precision; no pixel/focus/clipping tolerance is introduced.
  assert.equal(valueAt(referenceY),1.7,"SVG reference uses supplied99min, never recomputed row mean");assert.deepEqual(bars.map(bar=>valueAt(bar[1])),[2,2.6],"Actual bar heights encode the supplied rounded observations");
  await nativeTabTo(page,plot);await focusGeometry(plot,true);
  const tooltip=chart.locator(".recharts-tooltip-wrapper"),label=tooltip.locator(".recharts-tooltip-label"),value=tooltip.locator(".recharts-tooltip-item-value");let previousX;
  for(let index=0;index<3;index++){
    if(index)await page.keyboard.press(config.language==="ar"?"ArrowLeft":"ArrowRight");
    await expect(label).toHaveText(oracle.dates[index]);await expect(value).toHaveText(hours(oracle.values[index]));await expect(tooltip.locator(".recharts-tooltip-item-name")).toHaveText(copy.weeklyHours);
    const x=await chart.locator(".recharts-tooltip-cursor").first().evaluate(element=>{const r=element.getBBox();return r.x+r.width/2;});if(previousX!==undefined)assert(config.language==="ar"?x<previousX:x>previousX,"Native arrow advances data index and physical cursor in the declared direction");previousX=x;
    const rows=await tooltip.locator("p,li").evaluateAll((elements,source)=>{const measure=(0,eval)("("+source+")");return elements.map(element=>measure(element));},textContrastSource);assert.deepEqual(rows.filter(row=>row.ratio<4.5),[],"Actual native tooltip normal-text contrast");
  }
  const show=chart.getByRole("button",{name:copy.showData,exact:true});await nativeTabTo(page,show);await focusGeometry(show,true);await page.keyboard.press("Enter");const region=chart.getByRole("region",{name:copy.dataTitle,exact:true});await expect(region).toBeVisible();
  assert.deepEqual(await region.locator("tbody tr").evaluateAll(rows=>rows.map(row=>[row.querySelector("time")?.getAttribute("datetime"),row.querySelector("td")?.textContent.trim()])),[["2026-04-20",hours(oracle.values[0])],["2026-04-06",hours(oracle.values[1])],["2026-04-13",hours(oracle.values[2])]],"Alternative table preserves exact input order and independent rounding");
  assert.deepEqual(await region.locator("tbody time").allTextContents(),oracle.dates.slice(0,3));await expect(region.locator("thead th").nth(0)).toHaveText(copy.weekStarting);await expect(region.locator("thead th").nth(1)).toHaveText(copy.studyHours);
  await page.keyboard.press("Enter");await expect(region).toBeHidden();
  const course=chart.getByRole("button",{name:"ExtendedLearningنورالمعرفةCourse",exact:true}),all=chart.getByRole("button",{name:copy.allCourses,exact:true});await nativeTabTo(page,course);await focusGeometry(course,true);await page.keyboard.press("Enter");await page.waitForFunction(()=>window.__reading.vizFilterCalls?.length===1);await expect(all).toHaveAttribute("aria-pressed","true");await expect(course).toHaveAttribute("aria-pressed","false");
  await page.evaluate(()=>window.__reading.vizChange({filter:"course-a"}));await expect(course).toHaveAttribute("aria-pressed","true");await page.evaluate(()=>window.__reading.vizChange({filter:null}));await expect(all).toHaveAttribute("aria-pressed","true");
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),"Visualization horizontal document overflow");await captureVisualization(s,chart,copy);await s.assertClean();
}
async function inspectVisualizationStates(s){
  const {page,config}=s,copy=locales[config.language].studyTimeChart,oracle=await chartOracle(page,config.language),hours=value=>copy.hours.replace("{{value}}",value),chart=page.getByTestId("study-time-chart");
  await expect(chart.getByRole("application")).toBeVisible();await observeBars(page);await page.evaluate(()=>window.__reading.vizCase("edge"));await expect(chart.getByText(copy.summary.replace("{{recordCount}}",oracle.values[6]).replace("{{average}}",copy.averageUnavailable)+" "+copy.missingRecords.replace("{{recordCount}}",oracle.values[5]),{exact:true})).toBeVisible();
  const show=chart.getByRole("button",{name:copy.showData,exact:true});await nativeTabTo(page,show);await focusGeometry(show,true);await page.keyboard.press("Enter");const region=chart.getByRole("region",{name:copy.dataTitle,exact:true});await expect(region).toBeVisible();
  const rows=await region.locator("tbody tr").evaluateAll(rows=>rows.map(row=>[row.querySelector("th")?.textContent.trim(),row.querySelector("td")?.textContent.trim()]));assert.deepEqual(rows,[[copy.invalidDate.replace("{{value}}","2026-02-30"),copy.unavailable],[copy.dateUnavailable,copy.unavailable],[oracle.dates[3],copy.unavailable],[oracle.dates[4],hours(oracle.values[1])],[oracle.dates[4],hours(oracle.values[4])]],"Invalid dates/undefined/nonfinite are not invented zeroes; finite negative and duplicate records retain supplied order");await expect(chart.locator(".recharts-reference-line-line")).toHaveCount(0);
  await page.evaluate(()=>window.__reading.vizChange({filter:undefined}));const course=chart.getByRole("button",{name:"ExtendedLearningنورالمعرفةCourse",exact:true});await nativeTabTo(page,course);await page.keyboard.press("Enter");await expect(course).toHaveAttribute("aria-pressed","true");
  await page.evaluate(()=>window.__reading.vizCase("empty"));await expect(chart.getByText(copy.empty,{exact:true})).toBeVisible();await expect(chart.getByText(copy.emptySummary,{exact:true})).toBeVisible();await expect(chart.getByRole("application")).toHaveCount(0);await expect(chart.getByRole("button",{name:copy.hideData,exact:true})).toHaveCount(0);await expect(chart.locator("table")).toHaveCount(0);await s.assertClean();
}
async function inspectVisualizationMotion(s){
  const {page}=s,chart=page.getByTestId("study-time-chart"),dataset=flip=>[{weekStartDate:"2026-04-20",totalMinutes:flip?60:180},{weekStartDate:"2026-04-06",totalMinutes:flip?180:60}];await expect(chart.getByRole("application")).toBeVisible();await observeBars(page,{data:dataset(false)});
  const normal=await observeBars(page,{data:dataset(true)});assert(new Set(normal.map(frame=>JSON.stringify(frame))).size>2,"Real Recharts auto animation must be observed under no OS/stored reduction");
  await page.emulateMedia({reducedMotion:"reduce"});await page.waitForFunction(()=>document.documentElement.classList.contains("reduce-animations"));const os=await observeBars(page,{data:dataset(false)});assert(new Set(os.map(frame=>JSON.stringify(frame))).size<=2,"OS reduction must suppress intermediate real bar geometry");assert.equal(await page.evaluate(()=>window.__reading.snapshot.effective.reduced_animations),false);
  await page.emulateMedia({reducedMotion:"no-preference"});await page.waitForFunction(()=>!document.documentElement.classList.contains("reduce-animations"));const {dialog,copy}=await openDialog(s);await activateNative(page,dialog.getByRole("switch",{name:copy.accessibility.reducedAnimations,exact:true}));await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);const stored=await observeBars(page,{data:dataset(true)});assert(new Set(stored.map(frame=>JSON.stringify(frame))).size<=2,"Stored reduction must suppress real bar animation with OS no-preference");
  const initial=await chart.getByRole("application").boundingBox();await page.setViewportSize({width:390,height:900});await page.waitForFunction(width=>document.querySelector('[data-testid="study-time-chart"] svg[role="application"]').getBoundingClientRect().width<width,initial.width);await observeBars(page);await page.setViewportSize({width:320,height:900});await observeBars(page);const plot=chart.getByRole("application");await nativeTabTo(page,plot);await focusGeometry(plot,true);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),"Real native responsive chart resize must not overflow");await s.assertClean();
}

await test("actual reading/display owner and menu Chromium regression",{timeout:1_170_000},async suite=>{
  const directory=await mkdtemp(join(tmpdir(),"edeviser-reading-display-"));let host,browser;
  try{host=await fixture(directory);browser=await chromium.launch({headless:true});
    for(const theme of ["light","dark"])for(const highContrast of [false,true])await suite.test(`appearance ${theme} ${highContrast?"high-contrast":"normal"}`,{timeout:120_000},async()=>{
      for(const language of ["en","ar"])for(const width of [390,1280,320]){const s=await scene(browser,host.base,{theme,highContrast,language,width,rootFont:width===320?20:16});try{await inspectDialog(s);await s.assertClean();}catch(error){throw new Error(`${theme}/${highContrast}/${language}/${width}: ${error.message}`,{cause:error});}finally{await s.close();}}
    });
    await suite.test("five actual regular layouts reach one shared menu/dialog",{timeout:120_000},async()=>{for(const role of roles)for(const mode of [{width:1280,language:"en",theme:"light",highContrast:false},{width:390,language:"ar",theme:"dark",highContrast:true}]){const s=await scene(browser,host.base,{role,...mode});try{await expect(s.page.locator(`.role-app-shell[data-role="${role}"]`)).toHaveCount(1);await inspectDialog(s);await s.assertClean();}finally{await s.close();}}});
    await suite.test("real preference handlers persistence failures and stable subtree",{timeout:120_000},async()=>{
      const s=await scene(browser,host.base,{readMode:"error"});try{const {page}=s,{dialog,copy}=await openDialog(s);await expect(dialog.getByText(copy.accessibility.readFailed,{exact:true})).toBeVisible();await page.evaluate(()=>window.__reading.modes.read="ok");await activateNative(page,dialog.getByRole("button",{name:copy.accessibility.retryRead,exact:true}));await page.waitForFunction(()=>window.__reading.snapshot.read==="ready");
        await chooseSize(page,dialog,copy,"large");await page.waitForFunction(()=>window.__reading.snapshot.account==="saved");
        await page.evaluate(()=>{window.__reading.storageDenied=true;window.__reading.modes.write="error";});await activateNative(page,dialog.getByRole("switch",{name:copy.accessibility.highContrast,exact:true}));await page.waitForFunction(()=>window.__reading.snapshot.account==="error"&&window.__reading.snapshot.device==="error");await expect(dialog.getByText(copy.accessibility.deviceFailed,{exact:true})).toBeVisible();await expect(dialog.getByText(copy.accessibility.syncFailed,{exact:true})).toBeVisible();await page.evaluate(()=>{window.__reading.storageDenied=false;window.__reading.modes.write="ok";});await activateNative(page,dialog.getByRole("button",{name:copy.accessibility.retryDevice,exact:true}));await activateNative(page,dialog.getByRole("button",{name:copy.accessibility.retrySync,exact:true}));await page.waitForFunction(()=>window.__reading.snapshot.account==="saved"&&window.__reading.snapshot.device==="saved");assert.deepEqual(await page.evaluate(()=>window.__reading.accounts["reading-a"].unknown_owned_json),{keep:[1,"ordered"]});
        const nonce=await page.locator("[data-route-mount]").getAttribute("data-route-mount");
        const revision=await page.evaluate(()=>window.__reading.renderedRevision);await page.evaluate(()=>window.__reading.refreshIdentity(false));await page.waitForFunction(revision=>window.__reading.renderedRevision>revision,revision);await expect(dialog).toBeVisible();await expect(page.locator("header .hdr-profile")).toHaveCount(1);await expect(page.locator("[data-route-mount]")).toHaveAttribute("data-route-mount",nonce);
        await page.evaluate(()=>window.__reading.modes.write="hold");await activateNative(page,dialog.getByRole("switch",{name:copy.accessibility.reducedAnimations,exact:true}));await page.waitForFunction(()=>window.__reading.held.some(item=>item.phase==="write"&&item.actor==="reading-a"));await expect(dialog.getByText(copy.accessibility.syncingAccount,{exact:true})).toBeVisible();
        const oldOwner=await page.evaluate(()=>window.__reading.snapshot.ownerKey),delivered=await page.evaluate(()=>window.__reading.settled.filter(item=>item.phase==="write"&&item.actor==="reading-a").length);
        await page.evaluate(()=>window.__reading.changeActor("reading-b"));await page.waitForFunction(owner=>window.__reading.snapshot.ownerKey!==owner&&window.__reading.snapshot.read==="ready",oldOwner);await expect(page.locator("[data-route-mount]")).toHaveAttribute("data-route-mount",nonce);await expect(dialog).toHaveCount(0);await assertClosedProfile(page);
        await page.evaluate(()=>{window.__reading.modes.write="ok";window.__reading.release("write");});await page.waitForFunction(count=>window.__reading.settled.filter(item=>item.phase==="write"&&item.actor==="reading-a").length>count,delivered);await settleSurface(page.locator("[data-route-mount]"));
        assert.equal(await page.evaluate(()=>window.__reading.snapshot.effective.high_contrast),false);assert.equal(await page.evaluate(()=>document.documentElement.classList.contains("high-contrast")),false);assert.equal(await page.evaluate(()=>window.__reading.calls.filter(call=>call.payload?.accessibility_preferences&&call.filters.some(filter=>filter.method==="eq"&&filter.args[0]==="id"&&filter.args[1]==="reading-b")).length),0);
        const beforeLoading=await page.evaluate(()=>window.__reading.snapshot.ownerKey);await page.evaluate(()=>window.__reading.refreshIdentity(true));await page.waitForFunction(owner=>window.__reading.snapshot.ownerKey!==owner,beforeLoading);await expect(page.locator("[data-route-mount]")).toHaveAttribute("data-route-mount",nonce);await page.evaluate(()=>window.__reading.refreshIdentity(false));await page.waitForFunction(()=>window.__reading.snapshot.read==="ready");await expect(page.locator("[data-route-mount]")).toHaveAttribute("data-route-mount",nonce);await assertClosedProfile(page);
        await openDialog(s);const bOwner=await page.evaluate(()=>window.__reading.snapshot.ownerKey);await page.evaluate(()=>window.__reading.changeActor("reading-a"));await page.waitForFunction(owner=>window.__reading.snapshot.ownerKey!==owner&&window.__reading.snapshot.read==="ready",bOwner);await assertClosedProfile(page);await expect(page.locator("[data-route-mount]")).toHaveAttribute("data-route-mount",nonce);
        await openDialog(s);const aOwner=await page.evaluate(()=>window.__reading.snapshot.ownerKey);await page.evaluate(()=>{window.__reading.changeActor("reading-b");window.__reading.changeActor("reading-a");});await page.waitForFunction(owner=>window.__reading.snapshot.ownerKey!==owner&&window.__reading.snapshot.read==="ready",aOwner);await assertClosedProfile(page);await expect(page.locator("[data-route-mount]")).toHaveAttribute("data-route-mount",nonce);
        await page.evaluate(()=>window.__reading.changeActor(null));await page.waitForFunction(()=>window.__reading.actorId===null&&window.__reading.snapshot.read==="device-only");await assertClosedProfile(page,0);await expect(page.locator("[data-route-mount]")).toHaveAttribute("data-route-mount",nonce);await s.assertClean();
      }finally{await s.close();}
      const pending=await scene(browser,host.base,{readMode:"hold",language:"ar",width:320,rootFont:20});
      try{const {page}=pending,{dialog,copy}=await openDialog(pending);await expect(dialog.getByText(copy.accessibility.loadingAccount,{exact:true})).toBeVisible();await page.evaluate(()=>window.__reading.accounts["reading-a"].font_size="large");await activateNative(page,dialog.getByRole("switch",{name:copy.accessibility.highContrast,exact:true}));await page.evaluate(()=>{window.__reading.modes.read="ok";window.__reading.release("read");});await page.waitForFunction(()=>window.__reading.snapshot.read==="ready"&&window.__reading.snapshot.account==="saved");
        assert.equal(await page.evaluate(()=>window.__reading.snapshot.effective.font_size),"large");assert.equal(await page.evaluate(()=>window.__reading.snapshot.effective.high_contrast),true);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("edeviser-accessibility-prefs")).font_size),"x-large","Account hydration must not silently replace device choice");assert.deepEqual(await page.evaluate(()=>window.__reading.accounts["reading-a"].unknown_owned_json),{keep:[1,"ordered"]});await expect(dialog).toBeVisible();await pending.assertClean();
      }finally{await pending.close();}
      const invalid=await scene(browser,host.base,{readMode:"invalid",language:"ar",theme:"dark"});
      try{const {page}=invalid,{dialog,copy}=await openDialog(invalid);await expect(dialog.getByText(copy.accessibility.invalidAccount,{exact:true})).toBeVisible();await page.evaluate(()=>window.__reading.modes.read="ok");await activateNative(page,dialog.getByRole("button",{name:copy.accessibility.retryRead,exact:true}));await page.waitForFunction(()=>window.__reading.snapshot.read==="ready");await expect(dialog.getByRole("alert")).toHaveCount(0);await invalid.assertClean();}finally{await invalid.close();}
      const motion=await scene(browser,host.base);
      try{const {page}=motion,{dialog,copy}=await openDialog(motion);const before=await page.evaluate(()=>({device:window.__reading.preferenceStorageWrites,account:window.__reading.calls.filter(call=>call.payload).length}));
        await page.emulateMedia({reducedMotion:"reduce"});await page.waitForFunction(()=>document.documentElement.classList.contains("reduce-animations"));await assertReducedCss(dialog);assert.equal(await page.evaluate(()=>window.__reading.snapshot.effective.reduced_animations),false);
        await page.emulateMedia({reducedMotion:"no-preference"});await page.waitForFunction(()=>!document.documentElement.classList.contains("reduce-animations"));assert(await dialog.evaluate(element=>parseFloat(getComputedStyle(element).animationDuration)>0.00001));assert.deepEqual(await page.evaluate(()=>({device:window.__reading.preferenceStorageWrites,account:window.__reading.calls.filter(call=>call.payload).length})),before,"OS changes are rendering-only, not preference writes");
        await activateNative(page,dialog.getByRole("switch",{name:copy.accessibility.reducedAnimations,exact:true}));await page.waitForFunction(()=>window.__reading.snapshot.account==="saved");await page.emulateMedia({reducedMotion:"reduce"});await page.emulateMedia({reducedMotion:"no-preference"});await assertReducedCss(dialog);assert.equal(await page.evaluate(()=>window.__reading.snapshot.effective.reduced_animations),true);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("edeviser-accessibility-prefs")).reduced_animations),true);await motion.assertClean();
      }finally{await motion.close();}
    });
    await suite.test("actual reading font success loading-off and network retry",{timeout:120_000},async()=>{
      const s=await scene(browser,host.base,{language:"ar"});try{const {page}=s,{dialog,copy}=await openDialog(s),toggle=dialog.getByRole("switch",{name:copy.accessibility.dyslexiaFont,exact:true});await readingGlyphs(page,false);assert.equal(s.requests.filter(request=>/OpenDyslexic/.test(request.url)).length,0,"Reading faces loaded before opt-in");s.setFontMode("hold");await activateNative(page,toggle);await page.waitForFunction(()=>window.__reading.snapshot.font==="loading");await expect(dialog.getByText(copy.accessibility.loadingFont,{exact:true})).toBeVisible();await activateNative(page,toggle);await page.waitForFunction(()=>window.__reading.snapshot.font==="off");await s.releaseFonts();await page.evaluate(async()=>{await document.fonts.ready;});assert.equal(await page.evaluate(()=>document.documentElement.classList.contains("dyslexia-font")),false);await activateNative(page,toggle);await page.waitForFunction(()=>window.__reading.snapshot.font==="ready");await readingGlyphs(page,true);assert.equal(s.requests.filter(request=>/OpenDyslexic/.test(request.url)).length,4,"One request per canonical reading face; warm ON does not reload");await s.assertClean();}finally{await s.close();}
      const broken=await scene(browser,host.base);try{const {page}=broken,{dialog,copy}=await openDialog(broken);broken.setFontMode("fail-one");await activateNative(page,dialog.getByRole("switch",{name:copy.accessibility.dyslexiaFont,exact:true}));await page.waitForFunction(()=>window.__reading.snapshot.font==="error");await expect(dialog.getByText(copy.accessibility.fontFailed,{exact:true})).toBeVisible();assert.equal(broken.expectedFaults.length,1);assert(broken.expectedFaults[0].observed);assert.equal(broken.expectedFaults[0].error,"net::ERR_FAILED");assert.equal(await page.evaluate(()=>document.documentElement.classList.contains("dyslexia-font")),false);await activateNative(page,dialog.getByRole("button",{name:copy.accessibility.retryFont,exact:true}));await page.waitForFunction(()=>["ready","error"].includes(document.documentElement.dataset.alternateFont));assert.equal(await page.evaluate(()=>document.documentElement.dataset.alternateFont),"ready",`Actual font retry did not recover: ${JSON.stringify(await page.evaluate(()=>[...document.fonts].filter(face=>face.family.includes("OpenDyslexic")).map(face=>({family:face.family,style:face.style,weight:face.weight,status:face.status}))))}`);await readingGlyphs(page,true);await broken.assertClean();}finally{await broken.close();}
    });
    await suite.test("actual visualization frame Recharts data keyboard motion and resize",{timeout:120_000},async()=>{
      for(const language of ["en","ar"])for(const theme of ["light","dark"])for(const width of [390,1280,320]){const s=await scene(browser,host.base,{visualization:true,language,theme,width,rootFont:width===320?20:16});try{await inspectVisualization(s);}catch(error){throw new Error(`Visualization ${language}/${theme}/${width}: ${error.message}`,{cause:error});}finally{await s.close();}}
      for(const language of ["en","ar"]){const s=await scene(browser,host.base,{visualization:true,language});try{await inspectVisualizationStates(s);}finally{await s.close();}}
      const s=await scene(browser,host.base,{visualization:true,width:1280});try{await inspectVisualizationMotion(s);}finally{await s.close();}
    });
    await suite.test("actual parent dashboard G04 availability and existing link destinations",{timeout:120_000},async()=>{
      for(const language of ["en","ar"])for(const theme of ["light","dark"])for(const width of [390,1280,320]){
        const s=await scene(browser,host.base,{role:"parent",parentDashboard:true,parentFirstName:"AlexandriaنورالمعرفةLearningJourney",language,theme,width,rootFont:width===320?20:16});
        try{await inspectParentAvailability(s);}catch(error){throw new Error(`Parent G04 ${language}/${theme}/${width}: ${error.message}`,{cause:error});}finally{await s.close();}
      }
    });
  }finally{await browser?.close();await host?.close();await rm(directory,{recursive:true,force:true});}
});
