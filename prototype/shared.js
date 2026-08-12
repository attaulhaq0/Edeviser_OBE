// ═══════════════════════════════════════════════════════════════════
// EDEVISER PROTOTYPE — Shared Utilities (ROLE-AWARE)
// Frontend-only. No backend. All data is mock. Roles: student (default),
// teacher, parent, coordinator, admin — set via <body data-role="...">.
// ═══════════════════════════════════════════════════════════════════

// Confetti burst — skipped entirely when the user prefers reduced motion.
function confetti(){
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const colors=['#14b8a6','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#10b981','#f97316'];
  for(let i=0;i<45;i++){
    const p=document.createElement('div');
    p.className='confetti-piece';
    p.style.cssText=`left:${Math.random()*100}vw;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;background:${colors[i%colors.length]};animation-duration:${1.5+Math.random()*1}s;animation-delay:${Math.random()*.4}s;border-radius:${Math.random()>.5?'50%':'2px'}`;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),3000);
  }
}

// XP / toast pop
function showXP(containerId, amount){
  const c=document.getElementById(containerId);
  if(!c)return;
  c.innerHTML=`<span class="xp-float text-amber-600 font-bold text-sm">+${amount} XP ✨</span>`;
  setTimeout(()=>{c.innerHTML=''},1000);
}
// Lightweight toast (works everywhere)
function toast(msg,icon='✅'){
  let t=document.getElementById('edv-toast');
  if(!t){t=document.createElement('div');t.id='edv-toast';t.className='edv-toast';document.body.appendChild(t);}
  t.innerHTML=`<span style="font-size:16px">${icon}</span><span>${msg}</span>`;
  t.classList.add('show');
  clearTimeout(window.__toastT);
  window.__toastT=setTimeout(()=>t.classList.remove('show'),2600);
}

// Card multi-select toggle
function toggleCard(el, btnId, minCount=2){
  el.classList.toggle('selected');
  const grid=el.parentElement;
  const count=grid.querySelectorAll('.selected').length;
  const btn=document.getElementById(btnId);
  if(btn) btn.disabled=count<minCount;
}

// ═══════════════════════════════════════════════════════════════════
// DEVICE MODE — set as early as possible to avoid flash
// ═══════════════════════════════════════════════════════════════════
(function(){
  const requestedMode=new URLSearchParams(location.search).get('mode');
  const mode=(requestedMode==='laptop'||requestedMode==='mobile')?requestedMode:(localStorage.getItem('edv-mode')||'mobile');
  document.documentElement.classList.add('mode-'+mode);
  if(document.querySelector('#screens')) document.documentElement.classList.add('onboarding');
})();
function setMode(mode){
  document.documentElement.classList.remove('mode-mobile','mode-laptop');
  document.documentElement.classList.add('mode-'+mode);
  localStorage.setItem('edv-mode',mode);
  document.querySelectorAll('[data-mode-btn]').forEach(b=>b.classList.toggle('on',b.dataset.modeBtn===mode));
}

// ═══════════════════════════════════════════════════════════════════
// ROLE CONFIG — one source of truth for nav / rail / stats / search
// ═══════════════════════════════════════════════════════════════════
// Role is taken from <body data-role>. Shared pages (announcements,
// notifications, calendar, marketplace, settings…) carry no data-role, so we
// PERSIST the last explicit role and fall back to it. Without this, those
// pages defaulted to 'student' and their nav/back links bounced a teacher or
// parent to the student dashboard.
const ROLE=(function(){
  var requestedRole=new URLSearchParams(location.search).get('role');
  var allowedRoles=['student','teacher','parent','coordinator','admin'];
  var r=(document.body&&document.body.dataset.role)||(allowedRoles.includes(requestedRole)?requestedRole:'');
  try{
    if(r){localStorage.setItem('edv-role',r);return r;}
    return localStorage.getItem('edv-role')||'student';
  }catch(e){return r||'student';}
})();

// primary nav per role: {tab,label,href,ic,fab?}
const ROLE_NAV={
  student:[
    {tab:'home',label:'Home',href:'dashboard.html',ic:'🏠'},
    {tab:'learn',label:'Learn',href:'path.html',ic:'🗺️'},
    {tab:'tutor',label:'Tutor',href:'tutor.html',ic:'🤖',fab:true},
    {tab:'progress',label:'Progress',href:'progress.html',ic:'📈'},
    {tab:'me',label:'Me',href:'profile.html',ic:'🙂'},
  ],
  teacher:[
    {tab:'home',label:'Home',href:'teacher-dashboard.html',ic:'🏠'},
    {tab:'students',label:'Students',href:'teacher-students.html',ic:'🧑‍🎓'},
    {tab:'curriculum',label:'Studio',href:'teacher-studio.html',ic:'🧬',fab:true},
    {tab:'grade',label:'Grade',href:'teacher-grade.html',ic:'✍️'},
    {tab:'me',label:'Me',href:'teacher-profile.html',ic:'🙂'},
  ],
  parent:[
    {tab:'home',label:'Home',href:'parent-dashboard.html',ic:'🏠'},
    {tab:'progress',label:'Growth',href:'parent-progress.html',ic:'🌱'},
    {tab:'support',label:'Support',href:'parent-support.html',ic:'💬',fab:true},
    {tab:'me',label:'Me',href:'parent-profile.html',ic:'🙂'},
  ],
  coordinator:[
    {tab:'home',label:'Home',href:'coordinator-dashboard.html',ic:'🏠'},
    {tab:'outcomes',label:'Outcomes',href:'coordinator-outcomes.html',ic:'🎯'},
    {tab:'curriculum',label:'Curriculum',href:'coordinator-curriculum.html',ic:'🗂️',fab:true},
    {tab:'accred',label:'Accredit',href:'coordinator-accreditation.html',ic:'📋'},
    {tab:'me',label:'Me',href:'coordinator-profile.html',ic:'🙂'},
  ],
  admin:[
    {tab:'home',label:'Home',href:'admin-dashboard.html',ic:'🏠'},
    {tab:'analytics',label:'Analytics',href:'admin-analytics.html',ic:'📊'},
    {tab:'governance',label:'AI Gov',href:'admin-governance.html',ic:'🛡️',fab:true},
    {tab:'users',label:'People',href:'admin-users.html',ic:'👥'},
    {tab:'me',label:'Me',href:'admin-profile.html',ic:'🙂'},
  ],
};

// secondary "MORE" links + pinned profile per role
const ROLE_MORE={
  student:{
    links:[['learn.html','📚','Courses & Tasks'],['review.html','🔁','Daily Review'],['wellness.html','💚','Wellness'],['focus.html','⏱️','Focus'],['quests.html','⚔️','Quests'],['leaderboard.html','🏆','Leaderboard'],['team.html','👥','My Team'],['journal.html','📖','Journal'],['calendar.html','📅','Calendar'],['marketplace.html','🛍️','Shop'],['notifications.html','🔔','Notifications'],['settings.html','⚙️','Settings']],
    profile:{href:'profile.html',ini:'S',name:'Sarah Ahmed',bar:75,sub:'Lvl 4 · 750 / 1000 XP'},
  },
  teacher:{
    links:[['teacher-triage.html','🧑‍🎓','Student Triage'],['teacher-curriculum.html','🧬','Curriculum Studio'],['teacher-questions.html','🧠','Question Bank'],['teacher-rubrics.html','📐','Rubric Builder'],['teacher-materials.html','📚','Course Materials'],['teacher-handoffs.html','🧭','Tutor Handoffs'],['teacher-grading.html','✍️','Grading Queue'],['teacher-gradebook.html','📊','Gradebook'],['teacher-attendance.html','🗓️','Attendance'],['discussions.html','💭','Discussions'],['announcements.html','📣','Announcements'],['notifications.html','🔔','Notifications'],['settings.html','⚙️','Settings']],
    profile:{href:'teacher-profile.html',ini:'A',name:'Prof. Ahmed',bar:100,sub:'Computer Science · 4 classes'},
  },
  parent:{
    links:[['parent-progress.html','🌱','Growth & Wellbeing'],['parent-support.html','💬','Support & Messages'],['fees.html','💳','Fees & Payments'],['announcements.html','📣','Announcements'],['notifications.html','🔔','Notifications'],['parent-profile.html','⚙️','Settings']],
    profile:{href:'parent-profile.html',ini:'N',name:'Nadia (Parent)',bar:100,sub:'Guardian of Sarah Ahmed'},
  },
  coordinator:{
    links:[['coordinator-outcomes.html','🎯','Outcome Attainment'],['coordinator-curriculum.html','🗂️','Curriculum Matrix'],['coordinator-cqi.html','🔧','CQI Plans'],['coordinator-course-file.html','📘','Course File Generator'],['coordinator-teams.html','👥','Team Health Report'],['coordinator-competencies.html','🧭','Competency Frameworks'],['coordinator-accreditation.html','📋','Accreditation'],['discussions.html','💭','Discussions'],['announcements.html','📣','Announcements'],['notifications.html','🔔','Notifications'],['coordinator-profile.html','⚙️','Settings']],
    profile:{href:'coordinator-profile.html',ini:'K',name:'Dr. Khalid',bar:100,sub:'Program Coordinator · CS'},
  },
  admin:{
    links:[['admin-outcomes.html','🎯','Institution Outcomes'],['admin-readiness.html','📁','Evidence & Readiness'],['admin-marketplace.html','🛍️','Marketplace'],['admin-structure.html','🏛️','Institution Structure'],['admin-import.html','📥','Bulk Import'],['admin-badges.html','🏅','Badge Definitions'],['admin-security.html','🔒','Security'],['admin-fees.html','💳','Fees Management'],['announcements.html?role=admin','📣','Announcements'],['notifications.html?role=admin','🔔','Notifications'],['admin-profile.html','⚙️','Settings']],
    profile:{href:'admin-profile.html',ini:'G',name:'Gulf Academy',bar:100,sub:'Institution Admin'},
  },
};

// top-bar stat chips per role
const ROLE_STATS={
  student:'<span class="stat-chip" style="color:#ea580c">🔥 12</span><span class="stat-chip" style="color:#d97706">💎 750</span>',
  teacher:'<span class="stat-chip" style="color:#0f766e">🎓 4 classes</span><span class="stat-chip" style="color:#b45309">✍️ 12 to grade</span>',
  parent:'<span class="stat-chip" style="color:#16a34a">🟢 On track</span>',
  coordinator:'<span class="stat-chip" style="color:#2563eb">🎯 3 programs</span><span class="stat-chip" style="color:#b45309">⚠️ 2 gaps</span>',
  admin:'<span class="stat-chip" style="color:#2563eb">🏛️ 1,240 learners</span><span class="stat-chip" style="color:#16a34a">92% active</span>',
};

// role display for search placeholder + dock
const ROLE_META={
  student:{label:'Student',emoji:'🎓'},teacher:{label:'Teacher',emoji:'🧑‍🏫'},
  parent:{label:'Parent',emoji:'👨‍👩‍👧'},coordinator:{label:'Coordinator',emoji:'🧭'},admin:{label:'Admin',emoji:'🏛️'},
};

// ═══════════════════════════════════════════════════════════════════
// NAV INJECTION — build bottom-bar (mobile) / sidebar (laptop) if the
// page didn't hardcode one. Student pages keep their existing markup.
// ═══════════════════════════════════════════════════════════════════
function injectNav(){
  if(document.body.dataset.immersive) return;        // focused lesson: no chrome
  if(document.querySelector('.bottom-bar')) return; // page provided its own
  if(document.querySelector('#screens')) return;    // onboarding: no chrome
  const nav=ROLE_NAV[ROLE]; if(!nav) return;
  const bar=document.createElement('nav');bar.className='bottom-bar';
  bar.innerHTML=nav.map(n=>`<a href="${n.href}" class="tab-btn" data-tab="${n.tab}">${n.fab?`<div class="tutor-fab"><span style="font-size:18px">${n.ic}</span></div>`:`<span class="tab-ic">${n.ic}</span>`}<span>${n.label}</span></a>`).join('');
  document.body.appendChild(bar);
}

// The prototype wordmark is the shared way back to the role launcher. Some
// pages hardcode the mobile header brand while the laptop brand lives inside
// the shared sidebar, so normalize both into real, keyboard-accessible links.
function linkBrandToRoleSelection(){
  document.querySelectorAll('.hdr-brand').forEach(brand=>{
    if(brand.tagName==='A'){
      brand.setAttribute('href','roles.html');
      brand.setAttribute('aria-label','Edeviser — choose a role');
      return;
    }
    const link=document.createElement('a');
    [...brand.attributes].forEach(attribute=>link.setAttribute(attribute.name,attribute.value));
    link.setAttribute('href','roles.html');
    link.setAttribute('aria-label','Edeviser — choose a role');
    while(brand.firstChild) link.appendChild(brand.firstChild);
    brand.replaceWith(link);
  });

  document.querySelectorAll('.bottom-bar').forEach(nav=>{
    if(nav.querySelector(':scope > .sidebar-brand')) return;
    const link=document.createElement('a');
    link.className='sidebar-brand';
    link.href='roles.html';
    link.setAttribute('aria-label','Edeviser — choose a role');
    link.textContent='Edeviser';
    nav.prepend(link);
  });
}
// Give each role's configured primary action the same persistent treatment as
// the Student Tutor. This targets the configured route, not a nav position, so
// it also safely upgrades legacy pages that still hardcode their primary tabs.
function featurePrimaryRoleAction(){
  const featured=(ROLE_NAV[ROLE]||[]).find(n=>n.fab);
  if(!featured) return;
  // `gov` is the legacy semantic tab name for AI Governance.
  const tabs=ROLE==='admin'?[featured.tab,'gov']:[featured.tab];
  const action=document.querySelector(`.bottom-bar > .tab-btn[href="${featured.href}"], ${tabs.map(tab=>`.bottom-bar > .tab-btn[data-tab="${tab}"]`).join(', ')}`);
  if(!action) return;
  const existing=action.querySelector(':scope > .tutor-fab');
  if(existing){
    existing.classList.add('role-primary-featured-icon');
    return;
  }
  const icon=action.querySelector(':scope > svg, :scope > .tab-ic');
  if(!icon) return;
  const container=document.createElement('div');
  container.className='tutor-fab role-primary-featured-icon';
  icon.before(container);
  container.appendChild(icon);
}
function setActiveTab(){
  const page=location.pathname.split('/').pop().replace('.html','');
  // derive from ROLE_NAV hrefs + a few known sub-pages
  const nav=ROLE_NAV[ROLE]||[];
  const extraMap={
    student:{index:'home',dashboard:'home',path:'learn',learn:'learn',course:'learn',assignment:'learn',lesson:'learn',review:'learn',tutor:'tutor',progress:'progress',profile:'me','learning-profile':'me',journal:'me',team:'me',calendar:'me',settings:'me',leaderboard:'me',marketplace:'me',portfolio:'me',badges:'me',transcript:'me',fees:'me',surveys:'me',discussions:'learn',notifications:'me'},
    teacher:{'teacher-dashboard':'home','teacher-students':'students','teacher-triage':'students','teacher-student-detail':'students','teacher-studio':'curriculum','teacher-curriculum':'curriculum','teacher-questions':'curriculum','teacher-rubrics':'curriculum','teacher-materials':'curriculum','teacher-grade':'grade','teacher-grading':'grade','teacher-gradebook':'grade','teacher-attendance':'grade','teacher-profile':'me',calendar:'grade',settings:'me',discussions:'curriculum',notifications:'me'},
    parent:{'parent-dashboard':'home','parent-progress':'progress','parent-support':'support','parent-profile':'me',settings:'me',fees:'me',notifications:'me'},
    coordinator:{'coordinator-dashboard':'home','coordinator-outcomes':'outcomes','coordinator-curriculum':'curriculum','coordinator-cqi':'curriculum','coordinator-course-file':'accred','coordinator-accreditation':'accred','coordinator-profile':'me',settings:'me',discussions:'curriculum',notifications:'me'},
    admin:{'admin-dashboard':'home','admin-analytics':'analytics','admin-governance':'governance','admin-users':'users','admin-profile':'me'},
  };
  const map=extraMap[ROLE]||{};
  const sideOwnsPage=ROLE==='admin'&&!!document.querySelector('.side-link.active');
  const active=map[page]|| (nav.find(n=>n.href.replace('.html','')===page)||{}).tab || (sideOwnsPage?'':'home');
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===active));
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS (role-aware mock feed; open/close, mark read, badge)
// ═══════════════════════════════════════════════════════════════════
const ROLE_NOTIFS={
  student:[
    {icon:'🔥',title:'Streak paused, not lost',body:'One 5-min review restarts your 12-day streak.',time:'5m',unread:true},
    {icon:'🎯',title:'Normalization is your weakest CLO',body:'62% · one 10-min action can move it to Satisfactory.',time:'1h',unread:true},
    {icon:'🤖',title:'AI Tutor prepared your day',body:'3 spaced reviews are due — tap to start.',time:'2h',unread:true},
    {icon:'🏅',title:'Most-Improved this week',body:'You climbed 2 spots in your league.',time:'1d',unread:false},
  ],
  teacher:[
    {icon:'⚠️',title:'Sarah needs review',body:'Tutor handoff received for Normalization · CLO 3.',time:'8m',unread:true},
    {icon:'✍️',title:'12 feedback drafts ready',body:'AI drafted feedback for CS301 Assignment 3.',time:'40m',unread:true},
    {icon:'🧬',title:'Curriculum draft ready',body:'Your uploaded slides became 6 micro-lessons.',time:'2h',unread:true},
    {icon:'📋',title:'CLO gap detected',body:'REST APIs (CLO5) below target across 2 sections.',time:'1d',unread:false},
  ],
  parent:[
    {icon:'🌱',title:'Sarah had a steady week',body:'Database Design is progressing; Normalization is the current focus.',time:'2h',unread:true},
    {icon:'💬',title:'A way to help',body:'Ask Sarah to explain why normalization helps.',time:'1d',unread:true},
    {icon:'📅',title:'Assignment 3 is coming up',body:'Normalize a Schema is due Friday.',time:'2d',unread:false},
  ],
  coordinator:[
    {icon:'📉',title:'PLO2 attainment dipped',body:'Down 6% across the CS program this term.',time:'1h',unread:true},
    {icon:'🗂️',title:'Curriculum gap',body:'No assessment covers CLO "Concurrency".',time:'3h',unread:true},
    {icon:'📋',title:'Accreditation evidence drafted',body:'Course file for CS301 is ready to review.',time:'1d',unread:false},
  ],
  admin:[
    {icon:'📋',title:'ILO governance approval',body:'Update ILO2 target · Institution Admin review required.',time:'1h',unread:true},
    {icon:'📁',title:'Evidence blocker',body:'Concurrency assessment evidence is still missing.',time:'5h',unread:true},
    {icon:'🔧',title:'CQI mapping proposal',body:'Dr. Khalid submitted a reviewed mapping proposal.',time:'1d',unread:false},
  ],
};
function buildNotifs(){
  const header=document.querySelector('.app-header'); if(!header) return;
  const NOTIFS=(ROLE_NOTIFS[ROLE]||ROLE_NOTIFS.student).map((n,i)=>({id:i+1,...n}));
  const bell=document.createElement('button');
  bell.className='notif-bell';bell.setAttribute('aria-label','Notifications');
  const unread=NOTIFS.filter(n=>n.unread).length;
  bell.innerHTML=`<svg style="width:22px;height:22px" fill="none" stroke="#64748b" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/></svg>${unread?`<span class="notif-badge" id="notif-badge">${unread}</span>`:''}`;
  const right=header.querySelector('.hdr-right')||header;
  right.insertBefore(bell,right.firstChild);
  const backdrop=document.createElement('div');backdrop.className='notif-backdrop';
  const panel=document.createElement('div');panel.className='notif-panel';
  panel.innerHTML=`<div style="padding:12px 14px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between"><span style="font-size:13px;font-weight:800;color:#0f172a">Notifications</span><button id="notif-readall" style="font-size:11px;font-weight:700;color:#2563eb;background:none;border:none;cursor:pointer">Mark all read</button></div><div id="notif-list"></div><a href="notifications.html" style="display:block;text-align:center;padding:10px;font-size:12px;font-weight:800;color:#2563eb;border-top:1px solid #f1f5f9">View all →</a>`;
  backdrop.appendChild(panel);document.body.appendChild(backdrop);
  function render(){
    const list=panel.querySelector('#notif-list');
    list.innerHTML=NOTIFS.map(n=>`<div class="notif-item ${n.unread?'unread':''}" data-nid="${n.id}"><span style="font-size:18px">${n.icon}</span><div style="flex:1"><p style="font-size:13px;font-weight:600;color:#1e293b;margin:0">${n.title}</p><p style="font-size:11.5px;color:#64748b;margin:2px 0 0">${n.body}</p><p style="font-size:10px;color:#94a3b8;margin:3px 0 0">${n.time} ago</p></div>${n.unread?'<span class="notif-dot"></span>':''}</div>`).join('');
    list.querySelectorAll('.notif-item').forEach(it=>it.onclick=()=>{const n=NOTIFS.find(x=>x.id==it.dataset.nid);if(n){n.unread=false;render();updateBadge();}});
  }
  function updateBadge(){
    const u=NOTIFS.filter(n=>n.unread).length;let b=bell.querySelector('#notif-badge');
    if(u){if(!b){b=document.createElement('span');b.className='notif-badge';b.id='notif-badge';bell.appendChild(b);}b.textContent=u;}else if(b){b.remove();}
  }
  bell.onclick=()=>{render();backdrop.classList.add('open');};
  backdrop.onclick=e=>{if(e.target===backdrop)backdrop.classList.remove('open');};
  panel.querySelector('#notif-readall').onclick=()=>{NOTIFS.forEach(n=>n.unread=false);render();updateBadge();};
}

// ═══════════════════════════════════════════════════════════════════
// DEMO CONTROL DOCK — device toggle + role switch + screen jump
// ═══════════════════════════════════════════════════════════════════
const ROLE_PAGES={
  student:[['auth.html','🔐 Sign in / Sign up'],['index.html','Onboarding'],['dashboard.html','② Today'],['path.html','★ Learning Path'],['lesson.html','◆ Lesson Loop'],['review.html','🔁 Daily Review'],['learn.html','Courses'],['course.html','Course'],['assignment.html','Assignment'],['tutor.html','🤖 AI Tutor'],['progress.html','Progress'],['profile.html','Profile'],['learning-profile.html','Learning Profile'],['journal.html','Journal'],['team.html','Team'],['calendar.html','Calendar'],['leaderboard.html','Leaderboard'],['marketplace.html','Shop'],['portfolio.html','Portfolio'],['badges.html','Badges'],['transcript.html','Transcript'],['fees.html','Fees & Payments'],['surveys.html','Surveys'],['discussions.html','Discussions'],['notifications.html','Notifications'],['settings.html','Settings']],
  teacher:[['teacher-dashboard.html','Home (AI-prepared)'],['teacher-students.html','Students'],['teacher-triage.html','Student Triage'],['teacher-studio.html','Studio'],['teacher-curriculum.html','Curriculum Studio'],['teacher-questions.html','Question Bank'],['teacher-rubrics.html','Rubric Builder'],['teacher-materials.html','Course Materials'],['teacher-handoffs.html','Tutor Handoffs'],['teacher-grade.html','Assessment Workspace'],['teacher-grading.html','Grading + AI drafts'],['teacher-gradebook.html','Gradebook'],['teacher-attendance.html','Attendance'],['teacher-profile.html','Profile']],
  parent:[['parent-dashboard.html','Home (weekly story)'],['parent-progress.html','Growth & Wellbeing'],['parent-support.html','Support & Messages'],['parent-profile.html','Profile']],
  coordinator:[['coordinator-dashboard.html','Home'],['coordinator-outcomes.html','Outcome Attainment'],['coordinator-curriculum.html','Curriculum Matrix'],['coordinator-cqi.html','CQI Plans'],['coordinator-course-file.html','Course File Generator'],['coordinator-teams.html','Team Health Report'],['coordinator-competencies.html','Competency Frameworks'],['coordinator-accreditation.html','Accreditation'],['coordinator-profile.html','Profile']],
  admin:[['admin-dashboard.html','Home'],['admin-analytics.html','Analytics'],['admin-outcomes.html','Institution Outcomes'],['admin-readiness.html','Evidence & Readiness'],['admin-governance.html','AI Governance'],['admin-users.html','People'],['admin-marketplace.html','Marketplace'],['admin-structure.html','Institution Structure'],['admin-import.html','Bulk Import'],['admin-badges.html','Badge Definitions'],['admin-security.html','Security'],['admin-fees.html','Fees Management'],['admin-profile.html','Profile']],
};
function buildDock(){
  const pages=ROLE_PAGES[ROLE]||ROLE_PAGES.student;
  const mode=localStorage.getItem('edv-mode')||'mobile';
  const dock=document.createElement('div');dock.className='demo-dock';
  dock.innerHTML=`
    <div class="demo-seg">
      <button data-mode-btn="mobile" class="${mode==='mobile'?'on':''}">📱 Mobile</button>
      <button data-mode-btn="laptop" class="${mode==='laptop'?'on':''}">💻 Laptop</button>
    </div>
    <a class="demo-btn" href="roles.html" title="Switch role">${ROLE_META[ROLE].emoji} ${ROLE_META[ROLE].label} ▾</a>
    <button class="demo-btn" id="dock-screens">☰ Screens</button>
    <div class="demo-menu" id="dock-menu">${pages.map(p=>`<a href="${p[0]}">${p[1]}</a>`).join('')}</div>`;
  document.body.appendChild(dock);
  dock.querySelectorAll('[data-mode-btn]').forEach(b=>b.onclick=()=>setMode(b.dataset.modeBtn));
  const menu=dock.querySelector('#dock-menu');
  dock.querySelector('#dock-screens').onclick=()=>menu.classList.toggle('open');
}

// ═══════════════════════════════════════════════════════════════════
// RIGHT RAIL (laptop only) — role-specific "AI has prepared" widgets
// ═══════════════════════════════════════════════════════════════════
const railCard=(inner,extra='')=>`<div class="rail-card" style="${extra}">${inner}</div>`;
const railHead=(t,r='')=>`<div class="rail-h"><span>${t}</span>${r?`<span class="rail-r">${r}</span>`:''}</div>`;
function railHTML(){
  if(ROLE==='teacher') return (
    railCard(railHead('Upcoming')+`<div class="rail-row"><span style="flex:1"><b>Friday</b><br><span style="font-size:10px;color:#94a3b8">Assignment 3 closes</span></span><b style="color:#b45309">CS301</b></div><div class="rail-row"><span style="flex:1"><b>Wednesday</b><br><span style="font-size:10px;color:#94a3b8">Office hours · Room 210</span></span><b>1:00</b></div><div class="rail-row"><span style="flex:1"><b>Next week</b><br><span style="font-size:10px;color:#94a3b8">Publish assessment plan</span></span><b>Mon</b></div><a href="calendar.html" style="display:block;margin-top:8px;font-size:12px;font-weight:800;color:#2563eb">Open calendar →</a>`)+
    railCard(railHead('E Deviser task inbox')+`<div class="rail-row"><span style="flex:1">Attention items</span><b>3</b></div><div class="rail-row"><span style="flex:1">Tutor handoff</span><b>1</b></div><div class="rail-row"><span style="flex:1">Feedback drafts</span><b>12</b></div><div class="rail-row"><span style="flex:1">Curriculum draft</span><b>1</b></div><a href="teacher-triage.html" style="display:block;margin-top:8px;font-size:12px;font-weight:800;color:#2563eb">Open task inbox →</a>`)+
    railCard(railHead('Assessment coverage')+`<div class="rail-row"><span style="flex:1">CLO 3 questions</span><b>18</b></div><div class="rail-row"><span style="flex:1">Rubric criteria mapped</span><b style="color:#16a34a">5 / 5</b></div><div class="rail-row"><span style="flex:1">Question drafts to review</span><b style="color:#b45309">8</b></div><a href="teacher-questions.html" style="display:block;margin-top:8px;font-size:12px;font-weight:800;color:#2563eb">Open Question Bank →</a>`)+
    railCard(railHead('AI assistance')+`<p style="font-size:12px;color:#475569;margin:0">A2 · Suggest &amp; Draft</p><p style="font-size:10px;color:#94a3b8;margin:6px 0 0">Protected actions always require your approval.</p>`)
  );
  if(ROLE==='parent') return (
    railCard(railHead('🌱 This week')+`<div class="rail-row"><span style="flex:1">Study days</span><b style="color:#16a34a">4 / 5</b></div><div class="rail-row"><span style="flex:1">Wellbeing</span><b style="color:#16a34a">Good</b></div><div class="rail-row"><span style="flex:1">Focus balance</span><b>Healthy</b></div>`)+
    railCard(railHead('💬 Conversation starter')+`<p style="font-size:12px;color:#334155;margin:0">"Sarah, can you explain why normalization helps?"</p><p style="font-size:10px;color:#94a3b8;margin:6px 0 0">Connected to Normalization · CLO 3.</p>`)+
    railCard(railHead('🎯 Current focus')+`<p style="font-size:12px;color:#334155;margin:0">Database Design · <b>Normalization</b></p><p style="font-size:10px;color:#94a3b8;margin:6px 0 0">62% mastery · Developing.</p>`,'background:linear-gradient(135deg,#ecfdf5,#eff6ff)')
  );
  if(ROLE==='coordinator') return (
    railCard(railHead('📥 Coordinator inbox','3')+`<div class="rail-row"><span>📝</span><div style="flex:1"><b>CQI draft</b><br><small>PLO2 remediation · review required</small></div></div><div class="rail-row"><span>🗂️</span><div style="flex:1"><b>Mapping proposal</b><br><small>Concurrency → PLO4 · approval required</small></div></div><div class="rail-row"><span>👤</span><div style="flex:1"><b>Faculty follow-up</b><br><small>CS205 · CLO5 · waiting on teacher</small></div></div><a href="coordinator-cqi.html" class="rail-btn" style="margin-top:8px">Open CQI workspace →</a>`)+
    railCard(railHead('🗓️ Next milestone')+`<p style="font-size:13px;font-weight:800;color:#0f172a;margin:0">CQI Committee · Nov 14</p><p style="font-size:11px;color:#64748b;margin:4px 0 0">PLO2 action plan needs sign-off.</p>`)+
    railCard(railHead('🎓 Program scope')+`<div class="rail-row"><span style="flex:1">Computer Science</span><b>3 programs</b></div><div class="rail-row"><span style="flex:1">Courses in scope</span><b>12</b></div><div class="rail-row"><span style="flex:1">Active CQI plans</span><b>4</b></div>`)+
    railCard(railHead('✨ E Deviser assistance')+`<p style="font-size:12px;color:#475569;margin:0">A2 · Suggest &amp; Draft</p><p style="font-size:10px;color:#94a3b8;margin:6px 0 0">Pattern analysis and drafts are evidence-checked. Mapping and official CQI actions require approval.</p>`)
  );
  if(ROLE==='admin') return (
    railCard(railHead('🏛️ Institution')+`<div class="rail-row"><span style="flex:1">Active learners</span><b>1,240</b></div><div class="rail-row"><span style="flex:1">Weekly active</span><b style="color:#16a34a">92%</b></div><div class="rail-row"><span style="flex:1">Retention risk</span><b style="color:#b45309">38</b></div>`)+
    railCard(railHead('🛡️ AI governance')+`<div class="rail-row"><span style="flex:1">Autonomy ceiling</span><b>A2 · approve</b></div><div class="rail-row"><span style="flex:1">Auto-actions</span><b>0</b></div><a href="admin-governance.html" class="rail-btn" style="margin-top:8px">Manage →</a>`)+
    railCard(railHead('Departments')+`<div class="rail-row"><span style="flex:1">🥇 Computer Science</span><b style="color:#16a34a">81%</b></div><div class="rail-row"><span style="flex:1">Business</span><b style="color:#b45309">63%</b></div>`)
  );
  // student — CONTEXTUAL per page. The Daily Goal/Quests/League/Tip block is
  // the dashboard's "Today" widget and no longer repeats verbatim on every
  // student page; each page gets a rail relevant to what it's actually about.
  const page=(location.pathname.split('/').pop()||'').replace('.html','');
  if(page==='dashboard'||page==='') return (
    `<div class="rail-card"><div style="display:flex;align-items:center;gap:12px">
      <div style="position:relative;width:56px;height:56px;flex:0 0 auto">
        <svg width="56" height="56" style="transform:rotate(-90deg)" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="#eef2f6" stroke-width="3.5"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="#14b8a6" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="100" stroke-dashoffset="35"/></svg>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#0f766e">65%</div>
      </div>
      <div><p style="font-size:13px;font-weight:800;color:#0f172a;margin:0">Daily Goal</p><p style="font-size:11px;color:#64748b;margin:2px 0 0">35 XP to go today</p></div>
    </div></div>` +
    railCard(railHead('⚔️ Daily Quests','1/3')+`<div class="rail-row"><span>✅</span><div style="flex:1"><p style="font-size:12px;font-weight:600;color:#334155;margin:0">Complete 1 lesson</p><div class="mini-bar"><div style="width:100%;background:#22c55e"></div></div></div></div><div class="rail-row"><span>🔁</span><div style="flex:1"><p style="font-size:12px;font-weight:600;color:#334155;margin:0">Review 5 mistakes</p><div class="mini-bar"><div style="width:60%;background:#7c3aed"></div></div></div></div><div class="rail-row"><span>🎁</span><div style="flex:1"><p style="font-size:12px;font-weight:600;color:#334155;margin:0">Open mystery chest</p><p style="font-size:10px;color:#94a3b8;margin:1px 0 0">Finish 2 quests to unlock</p></div></div>`)+
    railCard(railHead('🏅 Gold League','3d left')+`<div class="rail-row"><span style="width:16px;font-weight:800;color:#f59e0b;font-size:12px">1</span><span style="flex:1;font-size:13px;color:#334155">Maryam</span><b>2,580</b></div><div class="rail-row" style="background:#eff6ff;border-radius:8px;margin:2px -6px;padding:5px 6px"><span style="width:16px;font-weight:800;color:#64748b;font-size:12px">4</span><span style="flex:1;font-size:13px;font-weight:800;color:#2563eb">You</span><b>1,890</b></div>`)+
    railCard(railHead('📅 Coming up')+`<div class="rail-row"><span style="flex:1">Web Dev Quiz</span><b style="color:#b45309">Tomorrow</b></div><div class="rail-row"><span style="flex:1">AI Research Essay</span><b>Friday</b></div><a href="calendar.html" style="display:block;margin-top:8px;font-size:12px;font-weight:800;color:#2563eb">Open calendar →</a>`)+
    railCard(railHead('❄️ Streak protection')+`<div class="rail-row"><span style="flex:1">Freezes in inventory</span><b>2</b></div><div class="rail-row"><span style="flex:1">Today's streak</span><b style="color:#b45309">Needs activity today</b></div><a href="marketplace.html" style="display:block;margin-top:8px;font-size:12px;font-weight:800;color:#2563eb">Get more freezes →</a>`)+
    railCard(`<div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">🤖</span><p style="font-size:12px;font-weight:800;margin:0">Edu's tip</p></div><p style="font-size:12px;color:rgba(255,255,255,.82);margin:6px 0 0">Review 5 mistakes to strengthen your weak CLOs.</p>`,'background:linear-gradient(135deg,#0f172a,#1e3a8a);color:#fff')
  );
  if(page==='learn'||page==='course') return (
    railCard(railHead('📚 Course snapshot')+`<div class="rail-row"><span style="flex:1">Enrolled</span><b>5 courses</b></div><div class="rail-row"><span style="flex:1">Avg mastery</span><b style="color:#16a34a">59%</b></div><div class="rail-row"><span style="flex:1">Modules left</span><b>18</b></div>`)+
    railCard(railHead('⏰ Next deadline')+`<p style="font-size:13px;font-weight:700;color:#0f172a;margin:0">DB Assignment 3</p><p style="font-size:11px;color:#94a3b8;margin:2px 0 8px">Due in 4 hours · +25 XP</p><a href="assignment.html" class="rail-btn">Start now →</a>`)+
    railCard(railHead('🎯 Weakest CLO')+`<div class="rail-row"><span style="flex:1">Normalization</span><b style="color:#b45309">62%</b></div><a href="path.html" style="display:block;margin-top:6px;font-size:12px;font-weight:800;color:#2563eb">Fix it on your path →</a>`)
  );
  if(page==='assignment'||page==='lesson') return (
    railCard(railHead('🤖 Need a hand?')+`<p style="font-size:12px;color:#475569;margin:0 0 8px">The AI Tutor can walk through this step by step — no penalty for asking.</p><a href="tutor.html" class="rail-btn">Ask the Tutor →</a>`)+
    railCard(railHead('💡 Similar past work')+`<div class="rail-row"><span style="flex:1">DB Assignment 2</span><b style="color:#16a34a">92%</b></div><div class="rail-row"><span style="flex:1">DB Quiz 1</span><b style="color:#16a34a">88%</b></div>`)+
    railCard(railHead('🎟️ Have a perk?')+`<p style="font-size:12px;color:#475569;margin:0 0 8px">Extra attempt or deadline extension tokens live in your inventory.</p><a href="marketplace.html" style="display:block;font-size:12px;font-weight:800;color:#2563eb">Open Marketplace →</a>`)
  );
  if(page==='progress') return (
    railCard(railHead('🎯 Focus next')+`<div class="rail-row"><span style="flex:1">Normalization (CLO3)</span><b style="color:#b45309">62%</b></div><div class="rail-row"><span style="flex:1">REST APIs (CLO5)</span><b style="color:#b45309">48%</b></div><a href="review.html" style="display:block;margin-top:8px;font-size:12px;font-weight:800;color:#2563eb">Review these →</a>`)+
    railCard(railHead('📈 vs. last term')+`<div class="rail-row"><span style="flex:1">Avg attainment</span><b style="color:#16a34a">+9%</b></div><div class="rail-row"><span style="flex:1">On-time rate</span><b style="color:#16a34a">+6%</b></div>`)+
    railCard(railHead('🏆 Class standing')+`<p style="font-size:13px;font-weight:800;color:#0f172a;margin:0">Top 15%</p><a href="leaderboard.html" style="display:block;margin-top:6px;font-size:12px;font-weight:800;color:#2563eb">See leaderboard →</a>`)
  );
  if(page==='journal') return (
    railCard(railHead('📖 Journal streak','6 days')+`<p style="font-size:12px;color:#475569;margin:0">Writing regularly builds reflection habits that correlate with higher quiz scores.</p>`)+
    railCard(railHead('💭 Prompt ideas')+`<div class="rail-row"><span style="flex:1">What clicked for you today?</span></div><div class="rail-row"><span style="flex:1">What would you explain differently?</span></div><div class="rail-row"><span style="flex:1">What mistake taught you the most?</span></div>`)
  );
  if(page==='learning-profile') return (
    railCard(railHead('🧠 Why this matters')+`<p style="font-size:12px;color:#475569;margin:0">Your learning style tunes how the AI Tutor explains things and how lessons are sequenced for you.</p>`)+
    railCard(railHead('✅ Completeness','70%')+`<div class="mini-bar" style="margin-bottom:4px"><div style="width:70%;background:#14b8a6"></div></div><a href="learning-profile.html#retake" style="display:block;margin-top:4px;font-size:12px;font-weight:800;color:#2563eb">Finish micro-assessments →</a>`)
  );
  if(page==='settings') return (
    railCard(railHead('🔒 Your data')+`<p style="font-size:12px;color:#475569;margin:0">Notification and language choices apply instantly. Nothing here is shared with classmates.</p>`)
  );
  if(page==='profile') return (
    railCard(railHead('🏅 Latest badge')+`<div style="display:flex;align-items:center;gap:10px"><span style="font-size:28px">🌟</span><div><p style="font-size:13px;font-weight:800;color:#0f172a;margin:0">Perfect Day</p><p style="font-size:11px;color:#94a3b8;margin:1px 0 0">Earned 2 days ago</p></div></div><a href="badges.html" style="display:block;margin-top:8px;font-size:12px;font-weight:800;color:#2563eb">View all 8 badges →</a>`)+
    railCard(railHead('📜 Academic')+`<div class="rail-row"><span style="flex:1">Transcript GPA</span><b>3.6</b></div><a href="transcript.html" style="display:block;margin-top:4px;font-size:12px;font-weight:800;color:#2563eb">View transcript →</a>`)+
    railCard(railHead('🗂️ Portfolio')+`<p style="font-size:12px;color:#475569;margin:0 0 8px">6 pieces of evidence showcased across 3 courses.</p><a href="portfolio.html" class="rail-btn">Open portfolio →</a>`)+
    railCard(railHead('💳 Account')+`<div class="rail-row"><span style="flex:1">Fees</span><b style="color:#16a34a">Paid</b></div><div class="rail-row"><span style="flex:1">Open surveys</span><b>1</b></div>`)
  );
  // fallback for any other student page not listed above
  return railCard(railHead('🎓 Keep going')+`<p style="font-size:12px;color:#475569;margin:0">Every action here feeds your outcome attainment and XP.</p><a href="dashboard.html" style="display:block;margin-top:8px;font-size:12px;font-weight:800;color:#2563eb">Back to Today →</a>`);
}
function buildRail(){
  if(document.body.dataset.immersive) return;
  if(document.body.hasAttribute('data-norail')) return;   // page provides its own right column (value-less attr → use hasAttribute, not dataset which is "" and falsy)
  if(!document.querySelector('.page-content')) return;
  const rail=document.createElement('aside');rail.className='right-rail';
  rail.innerHTML=railHTML();
  document.body.appendChild(rail);
}

// ═══════════════════════════════════════════════════════════════════
// SIDEBAR EXTRAS (laptop only) — grouped secondary nav + pinned profile
// ═══════════════════════════════════════════════════════════════════
function buildSidebarExtra(){
  const bar=document.querySelector('.bottom-bar'); if(!bar) return;
  // Keep chrome construction idempotent so repeated initialization cannot
  // duplicate the student-only premium card or the surrounding MORE links.
  if(bar.querySelector('.sidebar-extra')) return;
  const cfg=ROLE_MORE[ROLE]||ROLE_MORE.student;
  const extra=document.createElement('div');extra.className='sidebar-extra';
  // Upgrade-to-Premium card (student monetisation) pinned to the sidebar bottom.
  // The pinned profile has moved to the top-right header (see buildProfileChip).
  const upgrade = (ROLE==='student') ? `
    <a href="marketplace.html" class="side-upgrade">
      <div class="su-ic">✨</div>
      <p class="su-t">Upgrade to Premium</p>
      <p class="su-sub">Unlock advanced AI insights, unlimited quizzes, and more.</p>
      <span class="su-btn">Upgrade Now</span>
    </a>` : '';
  extra.innerHTML=`
    <div class="side-sep"></div>
    <p class="side-label">MORE</p>
    ${cfg.links.map(([href,ic,label])=>`<a href="${href}" class="side-link ${(location.pathname.split('/').pop()||'')===href.split('?')[0]?'active':''}">${ic} <span>${label}</span></a>`).join('')}
    ${upgrade}`;
  bar.appendChild(extra);
}

// Top-right profile chip (name · level · XP + avatar). Moved here from the
// sidebar bottom. Text shows on laptop; avatar-only on mobile.
function buildProfileChip(){
  const right=document.querySelector('.hdr-right'); if(!right) return;
  const cfg=ROLE_MORE[ROLE]||ROLE_MORE.student; const p=cfg.profile;
  // Remove any plain avatar link the page hard-coded, to avoid duplicates.
  right.querySelectorAll('a').forEach(a=>{
    if(/profile\.html$/.test(a.getAttribute('href')||'')){
      let n=a; while(n.parentElement && n.parentElement!==right) n=n.parentElement;
      if(n.parentElement===right) n.remove();
    }
  });
  const el=document.createElement('a');
  el.href=p.href; el.className='hdr-profile';
  el.innerHTML=`<div class="hp-txt"><p class="hp-name">${p.name}</p><p class="hp-sub">${p.sub}</p></div><div class="hp-ava">${p.ini}</div>`;
  right.appendChild(el);
}

// ═══════════════════════════════════════════════════════════════════
// TOP BAR: normalize right cluster + global search (⌘K) + stat pills
// ═══════════════════════════════════════════════════════════════════
function normalizeHeader(){
  const h=document.querySelector('.app-header'); if(!h) return null;
  let right=h.querySelector('.hdr-right'); if(right) return right;
  const kids=[...h.children];
  right=document.createElement('div');right.className='hdr-right';
  right.style.cssText='display:flex;align-items:center;gap:10px;margin-left:auto';
  kids.slice(1).forEach(k=>right.appendChild(k));
  h.appendChild(right);
  return right;
}
function buildStats(){
  const right=document.querySelector('.hdr-right'); if(!right) return;
  const s=document.createElement('div');s.className='top-stats';
  s.innerHTML=ROLE_STATS[ROLE]||ROLE_STATS.student;
  right.insertBefore(s,right.firstChild);
}
const ROLE_CMDK={
  student:[{sec:'Go to'},{ic:'🏠',t:'Today',f:'dashboard.html'},{ic:'🗺️',t:'Learning Path',f:'path.html'},{ic:'◆',t:'Lesson Loop',f:'lesson.html'},{ic:'🔁',t:'Daily Review',f:'review.html'},{ic:'🤖',t:'AI Tutor',f:'tutor.html'},{ic:'📈',t:'Progress',f:'progress.html'},{sec:'Actions'},{ic:'🎯',t:'Fix my weakest CLO',f:'lesson.html'},{ic:'💬',t:'Ask the AI Tutor',f:'tutor.html'}],
  teacher:[{sec:'Go to'},{ic:'🏠',t:'Home',f:'teacher-dashboard.html'},{ic:'🧑‍🎓',t:'Student Triage',f:'teacher-students.html'},{ic:'🧬',t:'Curriculum Studio',f:'teacher-curriculum.html'},{ic:'✍️',t:'Grading Queue',f:'teacher-grading.html'},{sec:'Actions'},{ic:'✨',t:'Draft feedback with AI',f:'teacher-grading.html'},{ic:'📤',t:'Turn upload into lessons',f:'teacher-curriculum.html'}],
  parent:[{sec:'Go to'},{ic:'🏠',t:'Home',f:'parent-dashboard.html'},{ic:'🌱',t:'Growth & Wellbeing',f:'parent-progress.html'},{ic:'💬',t:'Support & Messages',f:'parent-support.html'}],
  coordinator:[{sec:'Go to'},{ic:'🏠',t:'Home',f:'coordinator-dashboard.html'},{ic:'🎯',t:'Outcome Attainment',f:'coordinator-outcomes.html'},{ic:'🗂️',t:'Curriculum Matrix',f:'coordinator-curriculum.html'},{ic:'📋',t:'Accreditation',f:'coordinator-accreditation.html'}],
  admin:[{sec:'Institutional intelligence'},{ic:'🏠',t:'Home',f:'admin-dashboard.html'},{ic:'📊',t:'Analytics',f:'admin-analytics.html'},{ic:'🎯',t:'Institution Outcomes',f:'admin-outcomes.html'},{ic:'📁',t:'Evidence & Readiness',f:'admin-readiness.html'},{ic:'🛡️',t:'AI Governance',f:'admin-governance.html'},{sec:'Operations'},{ic:'👥',t:'People',f:'admin-users.html'},{ic:'🏛️',t:'Institution Structure',f:'admin-structure.html'},{ic:'📥',t:'Bulk Import',f:'admin-import.html'}],
};
function renderCmdk(){
  const q=(document.getElementById('cmdk-input').value||'').toLowerCase();
  const list=document.getElementById('cmdk-list');
  const CMDK=ROLE_CMDK[ROLE]||ROLE_CMDK.student;
  const rows=CMDK.filter(c=>c.sec||c.t.toLowerCase().includes(q));
  const out=[];rows.forEach((c,i)=>{if(c.sec){const next=rows[i+1];if(next&&!next.sec)out.push(`<div class="cmdk-sec">${c.sec}</div>`);}else out.push(`<a href="${c.f}" class="cmdk-item"><span>${c.ic}</span>${c.t}</a>`);});
  list.innerHTML=out.join('')||'<div style="padding:16px;color:#94a3b8;font-size:13px">No results</div>';
}
function openCmdk(){const b=document.querySelector('.cmdk-back');if(!b)return;b.classList.add('open');const i=document.getElementById('cmdk-input');i.value='';renderCmdk();setTimeout(()=>i.focus(),40);}
function buildSearch(){
  const h=document.querySelector('.app-header'); if(!h) return;
  const s=document.createElement('div');s.className='top-search';
  s.innerHTML='<svg style="width:16px;height:16px" fill="none" stroke="#94a3b8" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.2-5.2m0 0A7.5 7.5 0 1 0 5.2 5.2a7.5 7.5 0 0 0 10.6 10.6Z"/></svg><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Search or jump to… (⌘K)</span><span class="kbd">⌘K</span>';
  s.onclick=openCmdk;
  const right=h.querySelector('.hdr-right');
  if(right) h.insertBefore(s,right); else h.appendChild(s);
  const back=document.createElement('div');back.className='cmdk-back';
  back.innerHTML='<div class="cmdk"><input id="cmdk-input" placeholder="Type to search or jump to…" autocomplete="off"/><div class="cmdk-list" id="cmdk-list"></div></div>';
  document.body.appendChild(back);
  back.onclick=e=>{if(e.target===back)back.classList.remove('open')};
  document.getElementById('cmdk-input').addEventListener('input',renderCmdk);
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCmdk();}
    if(e.key==='Escape')back.classList.remove('open');
  });
}

// Student hardcoded pages: keep the "Learn" tab pointing at the path.
function repointNav(){
  if(ROLE!=='student') return;
  document.querySelectorAll('.tab-btn[data-tab="learn"]').forEach(a=>a.setAttribute('href','path.html'));
}

document.addEventListener('DOMContentLoaded',()=>{
  injectNav();
  linkBrandToRoleSelection();
  featurePrimaryRoleAction();
  normalizeHeader();
  buildNotifs();
  buildStats();
  buildSearch();
  buildRail();
  buildSidebarExtra();
  buildProfileChip();
  repointNav();
  setActiveTab();
  const currentPrototypePage=(location.pathname.split('/').pop()||'').replace('.html','');
  if(ROLE==='admin'&&currentPrototypePage.startsWith('admin-')){
    if(!document.querySelector('link[data-admin-refinement]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='admin-refinement.css';link.setAttribute('data-admin-refinement','1');document.head.appendChild(link);
    }
    const script=document.createElement('script');script.src='admin-refinement.js';script.setAttribute('data-admin-refinement','1');document.body.appendChild(script);
  }
});

// ═══════════════════════════════════════════════════════════════════
// EXPLAINABILITY — "why am I seeing this?" popover (all roles)
// ═══════════════════════════════════════════════════════════════════
function whyPop(html){
  let p=document.getElementById('why-pop');
  if(!p){
    p=document.createElement('div');p.id='why-pop';p.className='why-pop';
    p.innerHTML='<div class="card"><div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><span style="font-size:18px">🛡️</span><b style="font-size:14px;color:#0f172a">Why am I seeing this?</b></div><div id="why-body" style="font-size:13px;color:#475569;line-height:1.5"></div><button class="rail-btn" style="margin-top:14px;background:#0f172a" id="why-ok">Got it</button></div>';
    document.body.appendChild(p);
    p.onclick=e=>{if(e.target===p)p.classList.remove('open');};
    p.querySelector('#why-ok').onclick=()=>p.classList.remove('open');
  }
  p.querySelector('#why-body').innerHTML=html;
  p.classList.add('open');
}
// Approve/dismiss helper for AI suggestion cards (removes card + toast)
function aiApprove(el,msg){const c=el.closest('[data-ai-card]');if(c){c.style.transition='opacity .2s,transform .2s';c.style.opacity='0';c.style.transform='translateY(-6px)';setTimeout(()=>c.remove(),200);}toast(msg||'Approved','✅');}
function aiDismiss(el){const c=el.closest('[data-ai-card]');if(c){c.style.opacity='0';setTimeout(()=>c.remove(),200);}toast('Dismissed','✋');}

// ═══════════════════════════════════════════════════════════════════
// CHARACTER SYSTEM — living mascots (Foxi · Pengu · Owlie)
// Frontend-only, purpose-driven. Maps emotional states → PNG assets and
// resolves which character/emotion/message fits a given product state.
// Usage:
//   EdvCharacter.img('foxi','excited','md')      → <img> HTML string
//   EdvCharacter.companion({character,emotion,title,message}) → row HTML
//   EdvCharacter.greeting({streak,weakCLO,...})  → resolved state
//   <div data-chr="foxi" data-emotion="happy" data-size="md"></div> auto-mounts
// ═══════════════════════════════════════════════════════════════════
const EdvCharacter=(function(){
  // Per-character emotion → filename. Missing emotions fall back to 'default'.
  const ASSETS={
    foxi:{
      happy:'foxi-smiling.png',excited:'foxi-excited.png',celebrating:'foxi-celebrating.png',
      proud:'foxi-proud.png',playful:'foxi-playful.png',default:'foxi-default.png',
      smart:'foxi-smart.png',studious:'foxi-studious.png',focused:'foxi-studious-2.png',
      curious:'foxi-curious.png',encouraging:'foxi-signal-beacon-3.png',magical:'foxi-magical.png',
      wise:'foxi-learning-portal.png',worried:'foxi-worried.png',concerned:'foxi-nervous.png',
      nervous:'foxi-nervous.png',annoyed:'foxi-annoyed.png','level-up':'foxi-level-up.png',
      victory:'foxi-glowing-coin.png',thinking:'foxi-studious.png',
    },
    penguin:{default:'penguin-blushing.png',happy:'penguin-blushing.png',excited:'penguin-blushing.png',
      celebrating:'penguin-blushing.png',proud:'penguin-blushing.png',concerned:'penguin-blushing.png'},
    owl:{wise:'owl-wise.png',concerned:'owl-concerned.png',worried:'owl-concerned-2.png',
      default:'owl-wise.png',thinking:'owl-wise.png',smart:'owl-wise.png'},
  };
  const NAMES={foxi:'Foxi',penguin:'Pengu',owl:'Owlie'};

  function path(character,emotion){
    const set=ASSETS[character]||ASSETS.foxi;
    const file=set[emotion]||set.default||Object.values(set)[0];
    return `characters/${character}/${file}`;
  }
  // <img> string. opts: {float,pop,wave,cls,alt}
  function img(character,emotion,size='md',opts={}){
    const anims=[opts.pop?'chr-pop':'chr-in',opts.float?'chr-float':'',opts.wave?'chr-wave':''].filter(Boolean).join(' ');
    const alt=opts.alt||`${NAMES[character]||character} looking ${emotion}`;
    return `<img src="${path(character,emotion)}" alt="${alt}" class="chr chr-${size} ${anims} ${opts.cls||''}" draggable="false"/>`;
  }
  // Character + speech bubble row. o:{character,emotion,title,message,size,bubble,tail,float}
  function companion(o){
    const size=o.size||'md';
    const tail=o.tail||'tail-l';
    const bubbleTint=o.bubble?`b-${o.bubble}`:'';
    return `<div class="chr-row ${o.center?'center':''} ${o.rowCls||''}">
      ${img(o.character,o.emotion,size,{float:o.float,pop:o.pop,alt:o.alt})}
      <div class="chr-bubble ${tail} ${bubbleTint}">
        ${o.title?`<p class="ttl">${o.title}</p>`:''}
        <p class="msg">${o.message}</p>
      </div>
    </div>`;
  }

  // Time-of-day bucket.
  function timeOfDay(){
    const h=new Date().getHours();
    if(h>=5&&h<12)return'morning';
    if(h>=12&&h<17)return'afternoon';
    if(h>=17&&h<21)return'evening';
    return'night';
  }

  // Resolve the dashboard greeting from context. Priority: level-up → badge →
  // perfect day → streak milestone → streak broken → weak CLO → time-of-day.
  // ctx:{streak,streakBroken,leveledUp,earnedBadge,weakCLO,perfectDay,firstToday,name}
  function greeting(ctx={}){
    const name=ctx.name||'there';
    if(ctx.leveledUp) return{character:'foxi',emotion:'level-up',title:`Level up, ${name}! 🎉`,message:'Your hard work is paying off. Onward and upward!'};
    if(ctx.earnedBadge) return{character:'foxi',emotion:'celebrating',title:`New badge, ${name}!`,message:"You're on fire today. Keep the streak of wins going!"};
    if(ctx.perfectDay) return{character:'penguin',emotion:'celebrating',title:'Perfect day! 🌟',message:'All habits complete. That consistency is how mastery is built.'};
    const ms=[100,60,30,14,7].find(m=>ctx.streak===m);
    if(ms) return{character:'penguin',emotion:'excited',title:`${ms}-day streak! 🔥`,message:"You're unstoppable. Showing up every day is the whole game."};
    if(ctx.streakBroken) return{character:'penguin',emotion:'concerned',title:'You can still recover today',message:'One short review brings your streak right back. No guilt — just a fresh start.'};
    if(ctx.weakCLO) return{character:'foxi',emotion:'encouraging',title:`Let's fix this together, ${name}`,message:'Your weakest outcome is one 10-minute action away from Satisfactory.'};
    return timeGreeting(timeOfDay(),name,ctx.firstToday);
  }
  function timeGreeting(t,name,first){
    switch(t){
      case'morning':return{character:'foxi',emotion:first?'excited':'happy',title:`Good morning, ${name} 👋`,message:first?"Ready for today's challenge? Let's make it count.":'Welcome back — a fresh day to grow.'};
      case'afternoon':return{character:'foxi',emotion:'smart',title:`Good afternoon, ${name}`,message:'Keep the momentum going — you\'ve got this.'};
      case'evening':return{character:'foxi',emotion:'studious',title:`Good evening, ${name}`,message:'Evening study session? A little now goes a long way.'};
      default:return{character:'owl',emotion:'wise',title:`Burning the midnight oil, ${name}?`,message:"Owlie's here with you. A focused 10 minutes beats a distracted hour."};
    }
  }

  // Event-based reactions (tie every appearance to a real action).
  const REACTIONS={
    xp_earned:{character:'foxi',emotion:'excited',message:'XP earned! Every point counts.'},
    submission:{character:'foxi',emotion:'proud',message:'Submitted! Great work getting it done.'},
    journal_saved:{character:'penguin',emotion:'happy',title:'Great reflection',message:'Future you will thank you for this. 💙'},
    streak_up:{character:'penguin',emotion:'excited',message:'Streak growing! Keep showing up.'},
    clo_mastered:{character:'foxi',emotion:'celebrating',message:"Mastered! You've proven your understanding."},
    locked:{character:'owl',emotion:'wise',message:"This one's locked — master the prerequisite first."},
    empty:{character:'foxi',emotion:'encouraging',message:"Nothing here yet. Let's get started!"},
    correct:{character:'foxi',emotion:'proud',message:'Exactly! Nice reasoning.'},
    tryagain:{character:'foxi',emotion:'encouraging',message:"Close — let's think about it differently."},
  };
  function reaction(event){return REACTIONS[event]||REACTIONS.empty;}

  // Auto-mount: any <div data-chr="foxi" data-emotion="happy" data-size="md"
  //   data-float data-title="..." data-message="...">. If message/title given,
  //   renders a companion row; otherwise just the character image.
  function mountAll(root=document){
    root.querySelectorAll('[data-chr]:not([data-chr-done])').forEach(el=>{
      el.setAttribute('data-chr-done','1');
      const character=el.getAttribute('data-chr')||'foxi';
      const emotion=el.getAttribute('data-emotion')||'default';
      const size=el.getAttribute('data-size')||'md';
      const message=el.getAttribute('data-message');
      const title=el.getAttribute('data-title');
      const float=el.hasAttribute('data-float');
      const bubble=el.getAttribute('data-bubble')||'';
      const tail=el.getAttribute('data-tail')||'tail-l';
      if(message){
        el.innerHTML=companion({character,emotion,size,message,title,float,bubble,tail});
      }else{
        el.innerHTML=img(character,emotion,size,{float});
      }
    });
  }

  return{path,img,companion,greeting,reaction,timeOfDay,mountAll,NAMES};
})();

// Auto-mount characters on load (additive; pages without [data-chr] are untouched).
document.addEventListener('DOMContentLoaded',()=>EdvCharacter.mountAll());


// ── Phosphor line-icon font (renders <i class="ph ph-*"> automatically, incl.
//    dynamically injected chrome). Used for institution + parent button icons. ──
(function loadPhosphor(){
  if(document.querySelector('script[data-phosphor]')) return;
  var s=document.createElement('script');
  s.src='https://unpkg.com/@phosphor-icons/web@2.1.1';
  s.setAttribute('data-phosphor','1');
  document.head.appendChild(s);
})();


// ═══════════════════════════════════════════════════════════════════
// EDIT-PROFILE MODAL — shared real form UI for every role's "Edit profile"
// button (previously just a toast no-op). Prototype-only: Save shows a
// success toast and closes; nothing persists. Connects later to the real
// profiles table (full_name, email, phone, avatar_url, bio, etc.) per role.
// ═══════════════════════════════════════════════════════════════════
function openEditModal(cfg){
  closeEditModal();
  window.__efInitial=cfg.initial||'?';
  const back=document.createElement('div');back.className='edv-modal-back';back.id='edv-edit-modal';
  const fields=(cfg.fields||[]).map(f=>{
    if(f.type==='row2'){
      return `<div class="ef-row2">${f.items.map(renderField).join('')}</div>`;
    }
    return renderField(f);
  }).join('');
  back.innerHTML=`
    <div class="edv-modal" role="dialog" aria-modal="true" aria-label="${cfg.title}">
      <div class="edv-modal-head"><h3>${cfg.title}</h3><button class="edv-modal-x" onclick="closeEditModal()">✕</button></div>
      <div class="edv-modal-body">
        <div class="ef-avatar-pick">
          <div class="cur" id="ef-avatar-cur">${cfg.initial||'?'}</div>
          <div>
            <div class="flex items-center gap-2">
              <button class="btn3d sm b-ghost" type="button" onclick="document.getElementById('ef-avatar-file').click()">Change photo</button>
              <button class="btn3d sm b-ghost" type="button" id="ef-avatar-remove" style="display:none" onclick="edvClearAvatar()">Remove</button>
            </div>
            <p style="font-size:10.5px;color:#94a3b8;margin:5px 0 0" id="ef-avatar-hint">JPG, PNG or WebP, up to 2MB</p>
            <input type="file" id="ef-avatar-file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="edvAvatarChosen(this)"/>
          </div>
        </div>
        ${fields}
      </div>
      <div class="edv-modal-foot">
        <button class="btn3d sm b-ghost" onclick="closeEditModal()">Cancel</button>
        <button class="btn3d sm" onclick="saveEditModal('${cfg.successMsg||'Profile updated'}')">Save changes</button>
      </div>
    </div>`;
  document.body.appendChild(back);
  requestAnimationFrame(()=>back.classList.add('open'));
  back.addEventListener('click',e=>{if(e.target===back)closeEditModal();});
  document.addEventListener('keydown',escCloseModal);
  function renderField(f){
    const id='ef-'+Math.random().toString(36).slice(2,8);
    if(f.type==='textarea') return `<div class="ef-field"><label>${f.label}</label><textarea id="${id}" rows="${f.rows||3}" placeholder="${f.placeholder||''}">${f.value||''}</textarea></div>`;
    if(f.type==='select') return `<div class="ef-field"><label>${f.label}</label><select id="${id}">${(f.options||[]).map(o=>`<option ${o===f.value?'selected':''}>${o}</option>`).join('')}</select></div>`;
    return `<div class="ef-field"><label>${f.label}</label><input id="${id}" type="${f.type||'text'}" value="${f.value||''}" placeholder="${f.placeholder||''}"/></div>`;
  }
}
function closeEditModal(){
  const back=document.getElementById('edv-edit-modal');
  if(!back) return;
  back.classList.remove('open');
  document.removeEventListener('keydown',escCloseModal);
  setTimeout(()=>back.remove(),160);
}
function escCloseModal(e){ if(e.key==='Escape') closeEditModal(); }
function saveEditModal(msg){ closeEditModal(); toast(msg,'✅'); }
// Avatar picker inside the edit modal — mirrors useAvatarUpload's rules
// (PNG/JPG/WebP, ≤2MB). Prototype-only: previews the chosen image; the real
// app resizes to 512px & uploads to the `avatars` bucket, then sets
// profiles.avatar_url.
function edvAvatarChosen(input){
  const f=input.files&&input.files[0]; if(!f) return;
  const hint=document.getElementById('ef-avatar-hint');
  const ok=['image/png','image/jpeg','image/webp'];
  if(!ok.includes(f.type)){ if(hint){hint.textContent='Please choose a PNG, JPG or WebP image.';hint.style.color='#dc2626';} input.value=''; return; }
  if(f.size>2*1024*1024){ if(hint){hint.textContent='That image is over 2MB — pick a smaller one.';hint.style.color='#dc2626';} input.value=''; return; }
  const url=URL.createObjectURL(f);
  const cur=document.getElementById('ef-avatar-cur');
  if(cur){ cur.textContent=''; cur.style.backgroundImage='url('+url+')'; cur.style.backgroundSize='cover'; cur.style.backgroundPosition='center'; }
  const rm=document.getElementById('ef-avatar-remove'); if(rm) rm.style.display='';
  if(hint){ hint.textContent=f.name+' · ready to save'; hint.style.color='#16a34a'; }
}
function edvClearAvatar(){
  const cur=document.getElementById('ef-avatar-cur');
  if(cur){ cur.style.backgroundImage=''; cur.textContent=(window.__efInitial||'?'); }
  const file=document.getElementById('ef-avatar-file'); if(file) file.value='';
  const rm=document.getElementById('ef-avatar-remove'); if(rm) rm.style.display='none';
  const hint=document.getElementById('ef-avatar-hint'); if(hint){ hint.textContent='JPG, PNG or WebP, up to 2MB'; hint.style.color='#94a3b8'; }
}

// ── Notification quiet-hours + mute-course helpers (profiles.notification_preferences:
//    quiet_hours {enabled,start,end}, muted_courses[]). Prototype-only feedback. ──
function toggleQuietHours(el){
  const t=document.getElementById('qh-times');
  if(t) t.style.display=el.checked?'':'none';
  toast(el.checked?'Quiet hours on':'Quiet hours off',el.checked?'🌙':'🔔');
}
function toggleMute(el){
  const m=el.classList.toggle('muted');
  toast((m?'Muted ':'Unmuted ')+(el.textContent||'').trim(),m?'🔕':'🔔');
}

// ═══════════════════════════════════════════════════════════════════
// HERO CAROUSEL — multi-slide dashboard hero (dots + arrows + swipe +
// auto-advance, pauses on hover/interaction). initHeroCarousel(elId).
// ═══════════════════════════════════════════════════════════════════
function initHeroCarousel(rootId){
  const root=document.getElementById(rootId); if(!root) return;
  const track=root.querySelector('.hero-slides');
  const slides=[...root.querySelectorAll('.hero-slide')];
  if(slides.length<2) return;
  let i=0,timer=null;
  const dotsWrap=root.querySelector('.hero-dots');
  if(dotsWrap) dotsWrap.innerHTML=slides.map((_,n)=>`<button aria-label="Slide ${n+1}" onclick="heroGo('${rootId}',${n})"></button>`).join('');
  function paint(){
    track.style.transform=`translateX(-${i*100}%)`;
    root.querySelectorAll('.hero-dots button').forEach((d,n)=>d.classList.toggle('on',n===i));
  }
  window['heroGo_'+rootId]=(n)=>{ i=(n+slides.length)%slides.length; paint(); restart(); };
  window.heroGo=(id,n)=>{ if(window['heroGo_'+id]) window['heroGo_'+id](n); };
  window['heroNext_'+rootId]=()=>window['heroGo_'+rootId](i+1);
  window['heroPrev_'+rootId]=()=>window['heroGo_'+rootId](i-1);
  window.heroNext=(id)=>window['heroNext_'+id] && window['heroNext_'+id]();
  window.heroPrev=(id)=>window['heroPrev_'+id] && window['heroPrev_'+id]();
  function restart(){ clearInterval(timer); timer=setInterval(()=>window['heroGo_'+rootId](i+1),7000); }
  // Swipe support
  let sx=null;
  track.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;},{passive:true});
  track.addEventListener('touchend',e=>{ if(sx==null)return; const dx=e.changedTouches[0].clientX-sx; if(Math.abs(dx)>40) window['heroGo_'+rootId](i+(dx<0?1:-1)); sx=null; },{passive:true});
  root.addEventListener('mouseenter',()=>clearInterval(timer));
  root.addEventListener('mouseleave',restart);
  paint(); restart();
}

// ═══════════════════════════════════════════════════════════════════
// MARKETPLACE PURCHASE-REVEAL — gacha-style card flip: mystery pulse →
// flip → rarity glow + icon. revealPurchase({icon,name,rarity}).
// rarity: 'common'|'rare'|'epic'|'legendary' (controls glow color).
// ═══════════════════════════════════════════════════════════════════
const RARITY_COLORS={
  common:{bg:'linear-gradient(135deg,#64748b,#475569)',tag:'#f1f5f9',tagText:'#475569'},
  rare:{bg:'linear-gradient(135deg,#3b82f6,#0382bd)',tag:'#dbeafe',tagText:'#1d4ed8'},
  epic:{bg:'linear-gradient(135deg,#8b5cf6,#6366f1)',tag:'#ede9fe',tagText:'#6d28d9'},
  legendary:{bg:'linear-gradient(135deg,#f59e0b,#ef4444)',tag:'#fef3c7',tagText:'#b45309'},
};
function revealPurchase(item){
  const r=RARITY_COLORS[item.rarity]||RARITY_COLORS.common;
  const back=document.createElement('div');back.className='reveal-back';
  back.innerHTML=`
    <div style="text-align:center">
      <div class="reveal-card">
        <div class="reveal-inner">
          <div class="reveal-face front"><span class="q">?</span></div>
          <div class="reveal-face back" style="background:${r.bg}">
            <div class="reveal-rays"></div>
            <span class="reveal-icon">${item.icon}</span>
            <span class="reveal-name">${item.name}</span>
            <span class="reveal-rarity" style="background:${r.tag};color:${r.tagText}">${item.rarity||'common'}</span>
          </div>
        </div>
      </div>
      <button class="btn3d reveal-close" onclick="this.closest('.reveal-back').remove()">Nice! ✨</button>
    </div>`;
  document.body.appendChild(back);
  requestAnimationFrame(()=>back.classList.add('open'));
  setTimeout(()=>{ back.classList.add('flip'); if(window.confetti) confetti(); },550);
  back.addEventListener('click',e=>{ if(e.target===back) back.remove(); });
}


// ═══════════════════════════════════════════════════════════════════
// COLUMN EQUALIZER — for 2-column "main + sticky rail" page layouts
// (marketplace, calendar, team, leaderboard, review, path, focus…) where the
// main column and rail column are independently stacked cards of differing
// total height. Without this, the shorter column leaves a visible empty gap
// at the page bottom while the taller one keeps going — read as "unfinished"
// on desktop. equalizeColumns() measures both after layout/paint and adds an
// invisible spacer to the shorter column so both end at the same baseline.
// Call once on load, and again after any dynamic re-render (course/category
// switches) or window resize.
// ═══════════════════════════════════════════════════════════════════
function equalizeColumns(mainSel, railSel){
  if(!document.querySelector('html').classList.contains('mode-laptop')) return; // mobile stacks — nothing to equalize
  const main=document.querySelector(mainSel), rail=document.querySelector(railSel);
  if(!main||!rail) return;
  // Remove any previous spacer before re-measuring.
  main.querySelectorAll(':scope > .col-eq-spacer').forEach(s=>s.remove());
  rail.querySelectorAll(':scope > .col-eq-spacer').forEach(s=>s.remove());
  requestAnimationFrame(()=>{
    const mh=main.getBoundingClientRect().height, rh=rail.getBoundingClientRect().height;
    const diff=Math.round(mh-rh);
    if(Math.abs(diff)<12) return; // close enough, don't bother
    const spacer=document.createElement('div');
    spacer.className='col-eq-spacer';
    spacer.style.height=Math.abs(diff)+'px';
    spacer.setAttribute('aria-hidden','true');
    (diff>0?rail:main).appendChild(spacer);
  });
}
window.addEventListener('resize',()=>{ if(window.__eqCols) window.__eqCols(); });
