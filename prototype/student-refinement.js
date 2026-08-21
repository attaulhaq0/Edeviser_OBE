/* Contextual, explainable Student Intelligence for the static prototype. */
(function(){
  const data=window.EDEVISER_STUDENT;
  if(!data) return;
  const page=(location.pathname.split('/').pop()||'dashboard.html').replace('.html','');
  const contexts={
    dashboard:{title:'Why this is your next step',result:'Review the five recent mistakes, then continue Assignment 3.'},
    path:{title:'How your path is chosen',result:'Strengthen Apply before moving to Analyze.'},
    assignment:{title:'Why this assignment matters',result:'Your submission is evidence for Normalization · CLO 3.'},
    tutor:{title:'How your tutor can help',result:'Use guided hints and examples; your work stays your own.'},
    review:{title:'Why these cards are due',result:'Retrieval practice reinforces Normalization before the assignment.'},
    progress:{title:'What is changing',result:'Concept understanding is stronger than independent application.'},
    focus:{title:'Why this focus window',result:'25 minutes fits today’s plan and targets your current priority.'}
  };
  const context=contexts[page];
  function drawerMarkup(){
    if(!context) return '';
    return `<div class="student-ai-backdrop" data-student-ai-backdrop></div><aside class="student-ai-drawer" role="dialog" aria-modal="true" aria-labelledby="student-ai-title" aria-hidden="true" data-student-ai-drawer><div style="display:flex;justify-content:space-between;gap:16px;align-items:start"><div><p style="font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#0f766e">✦ E Deviser Intelligence</p><h2 id="student-ai-title">${context.title}</h2></div><button class="student-ai-close" type="button" aria-label="Close intelligence panel" data-student-ai-close>×</button></div><h3>Current signals</h3><div class="student-ai-signal">◎ <span><b>${data.focus.outcome}</b><br>${data.focus.mastery}% · ${data.focus.interpretation}</span></div><div class="student-ai-signal">↗ <span><b>Learning path</b><br>${data.path.level} · ${data.path.mastery}% mastery</span></div><div class="student-ai-signal">↻ <span><b>Daily Review</b><br>${data.review.due} cards due today</span></div><div class="student-ai-signal">▤ <span><b>${data.assignment.title}</b><br>${data.assignment.due} · ${data.assignment.dueLabel}</span></div><div class="student-ai-signal">◷ <span><b>Study rhythm</b><br>${data.focusWindow} recommended · ${data.student.streak}-day consistency</span></div><h3>Context & policy</h3><div class="student-ai-policy"><span>Student-safe</span><span>Course-authorized</span><span>Academic-integrity checked</span></div><div class="student-ai-note"><p><b>Recommendation</b><br>${context.result}</p></div></aside>`;
  }
  function addInlineContext(){
    if(!context) return;
    const anchor=document.querySelector('h1') || document.querySelector('.page-content');
    if(!anchor || document.querySelector('.student-intelligence-inline')) return;
    const node=document.createElement('div'); node.className='student-intelligence-inline';
    node.innerHTML=`<strong>Learning intelligence</strong><span>${data.focus.outcome} · ${data.focus.mastery}% · ${data.focus.evidence}</span><button type="button" class="student-ai-why" data-student-ai-open>Why this?</button>`;
    anchor.insertAdjacentElement('afterend',node);
  }
  function open(){const d=document.querySelector('[data-student-ai-drawer]'),b=document.querySelector('[data-student-ai-backdrop]');if(!d||!b)return;d.classList.add('is-open');b.classList.add('is-open');d.setAttribute('aria-hidden','false');d.querySelector('[data-student-ai-close]').focus();}
  function close(){const d=document.querySelector('[data-student-ai-drawer]'),b=document.querySelector('[data-student-ai-backdrop]');if(!d||!b)return;d.classList.remove('is-open');b.classList.remove('is-open');d.setAttribute('aria-hidden','true');document.querySelector('[data-student-ai-open]')?.focus();}
  function applyCorrections(){
    document.querySelectorAll('[data-student-due]').forEach(el=>el.textContent=data.assignment.due);
    document.querySelectorAll('[data-student-due-label]').forEach(el=>el.textContent=data.assignment.dueLabel);
    document.querySelectorAll('[data-student-focus]').forEach(el=>el.textContent=`${data.focus.outcome} · ${data.focus.mastery}%`);
  }
  document.addEventListener('DOMContentLoaded',()=>{
    document.body.classList.add('student-page'); applyCorrections();
    if(!context) return;
    document.body.insertAdjacentHTML('beforeend',drawerMarkup()); addInlineContext();
    document.querySelectorAll('[data-student-ai-open]').forEach(el=>el.addEventListener('click',open));
    document.querySelector('[data-student-ai-close]')?.addEventListener('click',close);
    document.querySelector('[data-student-ai-backdrop]')?.addEventListener('click',close);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  });
})();
