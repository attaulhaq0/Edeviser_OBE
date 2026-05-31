import { chromium } from "playwright-core";
const APP = "https://e-deviser.vercel.app";
const PW = "DemoQatar2026!";
async function dismissTour(page){for(let i=0;i<6;i++){const s=page.getByRole("button",{name:/skip tour/i}).first();if(await s.isVisible().catch(()=>false)){await s.click().catch(()=>{});await page.waitForTimeout(700);}else break;}}
const browser = await chromium.launch();
for (const [role,email,path] of [["teacher","anderson@gulf-academy.test","/teacher/dashboard"],["admin","principal@gulf-academy.test","/admin/dashboard"]]) {
  const ctx = await browser.newContext({ viewport:{width:1920,height:1080}});
  const page = await ctx.newPage();
  await page.goto(`${APP}/login`,{waitUntil:"networkidle"});
  await page.fill("#login-email",email); await page.fill("#login-password",PW);
  await page.click('button[type="submit"]');
  await page.waitForURL((u)=>!u.pathname.endsWith("/login"),{timeout:30000});
  await page.waitForTimeout(2500); await dismissTour(page);
  if(!page.url().endsWith(path)) await page.goto(`${APP}${path}`,{waitUntil:"networkidle"});
  await page.waitForTimeout(2500); await dismissTour(page);
  const txt = (await page.evaluate(()=>document.body.innerText)).replace(/\s+/g," ");
  const tourGone = !/skip tour/i.test(txt);
  console.log(`\n[${role}] tourGone=${tourGone}`);
  console.log("  " + txt.slice(0,260));
  await ctx.close();
}
await browser.close();
