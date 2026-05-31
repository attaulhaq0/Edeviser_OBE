import { chromium } from "playwright-core";
const APP = "https://e-deviser.vercel.app";
const PW = "DemoQatar2026!";
const CONV = "89b580da-a68b-46ff-aa4e-ba0919c71400";
async function dismissTour(page){for(let i=0;i<5;i++){const s=page.getByRole("button",{name:/skip tour/i}).first();if(await s.isVisible().catch(()=>false)){await s.click().catch(()=>{});await page.waitForTimeout(700);}else break;}}
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport:{width:1440,height:900}});
const page = await ctx.newPage();
await page.goto(`${APP}/login`,{waitUntil:"networkidle"});
await page.fill("#login-email","student01@gulf-academy.test");
await page.fill("#login-password",PW);
await page.click('button[type="submit"]');
await page.waitForURL((u)=>!u.pathname.endsWith("/login"),{timeout:30000});
await page.waitForTimeout(2000); await dismissTour(page);
await page.goto(`${APP}/student/tutor/${CONV}`,{waitUntil:"networkidle"});
await page.waitForTimeout(3000); await dismissTour(page);
const input = page.getByPlaceholder(/ask a question/i).first();
await input.click();
await input.type("What is the Pythagorean theorem and when do I use it?",{delay:25});
await page.getByLabel("Send message").click().catch(()=>page.keyboard.press("Enter"));
// Read the chat log region specifically (role=log aria-label="Chat messages").
let best="";
for(let i=0;i<22;i++){
  await page.waitForTimeout(1500);
  const log = await page.evaluate(()=>{
    const el = document.querySelector('[aria-label="Chat messages"]');
    return el ? el.innerText.replace(/\s+/g," ").trim() : "";
  });
  console.log(`t+${((i+1)*1.5).toFixed(0)}s logLen=${log.length}`);
  best = log;
  if(log.length>200) break;
}
console.log("\nCHAT LOG:", best.slice(0,500));
await browser.close();
