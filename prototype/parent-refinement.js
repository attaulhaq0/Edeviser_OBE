(function () {
  "use strict";

  const data = window.EDEVISER_PARENT;
  const stateApi = window.EDEVISER_PARENT_STATE;
  if (!data || !stateApi || document.body.dataset.role !== "parent") return;

  let returnFocus = null;
  const byId = (id) => document.getElementById(id);
  const page = (location.pathname.split("/").pop() || "parent-dashboard.html").replace(".html", "");

  const drawers = {
    home: {
      eyebrow: "How E Deviser helped",
      title: "Why this summary",
      intro: "E Deviser prepared this Parent view using information Nadia is authorized to see for Sarah.",
      evidence: [
        ["Learning signal", "Database Design progress · Normalization is Developing at 62%"],
        ["Planning context", "Assignment 3 is due Friday; Daily Review has 5 cards today"],
        ["Habit context", "12-day streak and 4 of 5 study days"],
        ["Specialists", "Mastery · Habit · Intervention · Parent"]
      ],
      policy: "Verified Parent link ✓ · Parent-safe fields only ✓ · Private learning content excluded ✓",
      result: "One concise weekly summary, one priority, and one suggested support action.",
      autonomy: "A1 · Suggest"
    },
    growth: {
      eyebrow: "E Deviser Intelligence",
      title: "Why this focus",
      intro: "This view combines current learning evidence and study consistency, then translates it into Parent-safe language.",
      evidence: [
        ["Mastery Agent", "Normalization evidence · CLO 3 · 62% Developing"],
        ["Habit Agent", "12-day consistent activity"],
        ["Parent Agent", "Simplified learning translation without private content"],
        ["Next evidence", "Assignment 3 · Normalize a Schema · Friday"]
      ],
      policy: "Policy result: Parent-safe summary. Tutor transcript, journal entries, and teacher-only notes are excluded.",
      result: "Current growth priority: applying Normalization independently.",
      autonomy: "A1 · Explain"
    },
    support: {
      eyebrow: "Why E Deviser suggested this",
      title: "One appropriate action",
      intro: "E Deviser connected Sarah's current focus and deadline to a short support action Nadia can choose to use.",
      evidence: [
        ["Learning signal", "Normalization is still Developing"],
        ["Mastery context", "CLO 3 · 62%"],
        ["Planning context", "Assignment 3 is due Friday"],
        ["Parent context", "Nadia is Sarah's verified guardian"]
      ],
      policy: "Parent Agent ✓ · Evidence checked ✓ · Privacy filtered ✓",
      result: "A five-minute teach-back prompt; nothing is sent or scheduled automatically.",
      autonomy: "A1 · Suggest"
    },
    profile: {
      eyebrow: "Parent access",
      title: "What E Deviser can use",
      intro: "Nadia's Parent view is limited to the verified Sarah link and approved learning context.",
      evidence: [
        ["Verified child", "Sarah Ahmed · Level 4 · Parent access active"],
        ["Visible", "Summaries · deadlines · approved wellbeing context"],
        ["Private", "Tutor conversations · journal entries · teacher-only notes"],
        ["AI assistance", "Suggestions and drafts"]
      ],
      policy: "Protected communication always requires Nadia's approval.",
      result: "Role-aware, Parent-safe context only.",
      autonomy: "A2 · Draft only"
    }
  };

  function drawerMarkup(config) {
    return `
      <p class="drawer-intro">${config.intro}</p>
      <div class="ai-evidence-list">${config.evidence.map(([label, value]) => `<div class="ai-evidence-item"><span>${label}</span><strong>${value}</strong></div>`).join("")}</div>
      <div class="ai-policy-check"><h3>Evidence + policy check</h3><p>${config.policy}</p></div>
      <div class="ai-approval-card"><strong>Result · ${config.autonomy}</strong><p>${config.result}</p></div>
      <p class="parent-safety-note">Private tutor conversations, journal entries, and teacher-only notes are not included.</p>`;
  }

  function approvalMarkup() {
    const message = byId("teacher-draft")?.value || "";
    return `
      <p class="drawer-intro">E Deviser prepared this draft from Sarah's Parent-visible course, focus, and assignment context.</p>
      <div class="ai-evidence-list">
        <div class="ai-evidence-item"><span>Will share</span><strong>Sarah's name · Database Design · Nadia's written message</strong></div>
        <div class="ai-evidence-item"><span>Will not share</span><strong>Tutor transcript · Journal entries · Teacher-only notes</strong></div>
      </div>
      <div class="ai-policy-check"><h3>Operational autonomy · A2 Draft only</h3><p>Nadia must approve this communication. It has not been sent.</p></div>
      <label class="parent-eyebrow" for="approval-message" style="display:block;margin-top:15px">Message for approval</label>
      <textarea id="approval-message" class="parent-draft">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</textarea>
      <div class="parent-actions">
        <button class="btn3d sm" type="button" data-parent-action="send-teacher">Send</button>
        <button class="btn3d sm b-ghost" type="button" data-parent-action="edit-teacher">Edit</button>
        <button class="parent-text-button" type="button" data-parent-close>Cancel</button>
      </div>`;
  }

  function openDrawer(kind, trigger) {
    const drawer = byId("parent-drawer");
    const backdrop = byId("parent-drawer-backdrop");
    const content = byId("parent-drawer-content");
    if (!drawer || !backdrop || !content) return;
    returnFocus = trigger || document.activeElement;
    if (kind === "approval") {
      byId("parent-drawer-eyebrow").textContent = "Approval required";
      byId("parent-drawer-title").textContent = "Review message";
      content.innerHTML = approvalMarkup();
    } else {
      const config = drawers[kind] || drawers.home;
      byId("parent-drawer-eyebrow").textContent = config.eyebrow;
      byId("parent-drawer-title").textContent = config.title;
      content.innerHTML = drawerMarkup(config);
    }
    drawer.hidden = false;
    backdrop.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    drawer.querySelector(".drawer-close")?.focus();
  }

  function closeDrawer() {
    const drawer = byId("parent-drawer");
    const backdrop = byId("parent-drawer-backdrop");
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    backdrop.hidden = true;
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (returnFocus instanceof HTMLElement) returnFocus.focus();
  }

  function renderState() {
    const state = stateApi.read();
    document.querySelectorAll("[data-support-save]").forEach((button) => {
      const saved = state.parentSupportSuggestion === "saved";
      button.textContent = saved ? "✓ Saved for tonight" : "Save for tonight";
      button.setAttribute("aria-pressed", String(saved));
    });
    document.querySelectorAll("[data-status='suggestion']").forEach((node) => node.classList.toggle("done", state.parentSupportSuggestion !== "ready"));
    document.querySelectorAll("[data-status='saved']").forEach((node) => node.classList.toggle("done", state.parentSupportSuggestion === "saved"));
    document.querySelectorAll("[data-status='message']").forEach((node) => {
      const sent = state.parentTeacherDraft === "sent";
      node.classList.toggle("done", sent);
      const label = node.querySelector("span:last-child");
      if (label) label.textContent = sent ? "Teacher message approved and sent" : "Teacher message draft not sent";
    });
    const draftStatus = byId("draft-status");
    if (draftStatus) {
      const sent = state.parentTeacherDraft === "sent";
      draftStatus.classList.toggle("done", sent);
      draftStatus.textContent = sent ? "Shared after Nadia's approval" : "Waiting for Nadia's approval";
    }
  }

  function parentRail() {
    const commonWeek = `<div class="rail-card"><div class="rail-h"><span>Selected student</span><span class="rail-r">Verified</span></div><p class="rail-mini-title">Sarah Ahmed · Level 4</p><p class="rail-mini-sub">Nadia's verified guardian link</p></div>`;
    const homeWeek = `<div class="rail-card"><div class="rail-h"><span>Sarah this week</span><span class="rail-r">Verified</span></div><p class="rail-mini-title">Parent-safe context</p><p class="rail-mini-sub">Wellbeing &amp; balance</p><div class="rail-row"><span style="flex:1">Study days</span><b>4 / 5</b></div><div class="rail-row"><span style="flex:1">Focus balance</span><b style="color:#047857">Healthy</b></div><div class="rail-row"><span style="flex:1">Wellbeing</span><b style="color:#047857">Good</b></div><div class="rail-row"><span style="flex:1">Study rhythm</span><b>Consistent</b></div></div>`;
    const upcoming = `<div class="rail-card"><div class="rail-h"><span>Coming up</span></div><div class="rail-row"><span style="flex:1">Daily Review<small style="display:block;color:#94a3b8">Today · 5 cards</small></span><b>Today</b></div><div class="rail-row"><span style="flex:1">Assignment 3<small style="display:block;color:#94a3b8">Friday · due in 2 days</small></span><b>Friday</b></div><div class="rail-row"><span style="flex:1">Web Dev Quiz<small style="display:block;color:#94a3b8">Saturday · due in 3 days</small></span><b>Sat</b></div></div>`;
    const focus = `<div class="rail-card"><div class="rail-h"><span>Current focus</span><span class="rail-r">62%</span></div><p class="rail-mini-title">Database Design</p><p class="rail-mini-sub">Normalization · CLO 3 · Developing</p><p style="font-size:10.5px;color:#526174;margin:0">Applying the concept independently is the next learning step.</p><button class="parent-text-button rail-link" type="button" data-open-parent-drawer="growth">Why this focus? →</button></div>`;
    const access = `<div class="rail-card"><div class="rail-h"><span>Parent access</span></div><p class="rail-mini-title">Your view</p><p class="rail-mini-sub">Verified link · Parent-safe summary</p><div class="rail-row"><span style="flex:1">AI assistance</span><b>Suggest + draft</b></div><div class="rail-row"><span style="flex:1">Protected actions</span><b>Approval</b></div><p class="rail-private">Private: tutor conversations, journal entries, teacher-only notes.</p></div>`;
    const continueStory = `<div class="rail-card"><div class="rail-h"><span>Continue Sarah's story</span></div><a class="rail-row" href="parent-progress.html"><span style="flex:1">Where is she progressing?</span><b>Growth →</b></a><a class="rail-row" href="parent-support.html"><span style="flex:1">What can Nadia do?</span><b>Support →</b></a></div>`;
    const support = `<div class="rail-card"><div class="rail-h"><span>Support this week</span></div><p class="rail-mini-title">One small action</p><p class="rail-mini-sub">Teach-back · Normalization · ~5 min</p><button class="btn3d sm full" type="button" data-support-save>Save for tonight</button></div>`;
    if (page === "parent-progress") return focus + commonWeek + upcoming + access;
    if (page === "parent-support") return support + focus + upcoming + access;
    if (page === "parent-profile") return access + commonWeek;
    return homeWeek + upcoming + continueStory + access;
  }

  function initialize() {
    const rail = document.querySelector(".right-rail");
    if (rail) rail.innerHTML = parentRail();
    renderState();
  }

  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const opener = target.closest("[data-open-parent-drawer]");
    if (opener) openDrawer(opener.getAttribute("data-open-parent-drawer"), opener);
    if (target.closest("[data-parent-close]") || target.id === "parent-drawer-backdrop") closeDrawer();

    if (target.closest("[data-support-save]")) {
      stateApi.write({ parentSupportSuggestion: "saved", parentSupportCompleted: true, parentLastAction: "support_saved" });
      renderState();
      if (typeof toast === "function") toast("Conversation prompt saved for tonight", "✓");
    }
    if (target.closest("[data-review-teacher]")) openDrawer("approval", target.closest("[data-review-teacher]"));
    if (target.closest("[data-parent-action='send-teacher']")) {
      const edited = byId("approval-message")?.value;
      const source = byId("teacher-draft");
      if (source && typeof edited === "string") source.value = edited;
      stateApi.write({ parentTeacherDraft: "sent", parentApprovalStatus: "approved_by_nadia", parentLastAction: "teacher_message_sent" });
      closeDrawer();
      renderState();
      if (typeof toast === "function") toast("Message shared after Nadia's approval", "✓");
    }
    if (target.closest("[data-parent-action='edit-teacher']")) {
      const edited = byId("approval-message")?.value;
      const source = byId("teacher-draft");
      if (source && typeof edited === "string") source.value = edited;
      closeDrawer();
      source?.focus();
      if (typeof toast === "function") toast("Draft is ready to edit", "✎");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
