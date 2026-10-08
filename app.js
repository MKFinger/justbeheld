(() => {
  "use strict";
  const settings = window.JUST_BE_HELD || {};
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hero = document.querySelector(".hero-story");
  const caption = document.querySelector(".holding-caption");
  let target = 1;
  let current = 1;
  let frame = 0;
  let motionEnabled = false;

  // The document always scrolls normally. Only decorative transforms respond.
  function renderHands() {
    current += (target - current) * 0.14;
    if (Math.abs(target - current) < 0.001) current = target;
    hero.style.setProperty("--gather", current.toFixed(4));
    caption.textContent = current < .25 ? "Room to arrive." : current < .8 ? "A little closer, at your own pace." : "A little warmth. A place to exhale.";
    if (current !== target && !document.hidden) frame = requestAnimationFrame(renderHands);
    else frame = 0;
  }
  function updateHands() {
    if (motionEnabled) {
      const rect = hero.getBoundingClientRect();
      const distance = Math.max(1, hero.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / distance));
      target = progress * progress * (3 - 2 * progress);
    } else target = 1;
    if (!frame) frame = requestAnimationFrame(renderHands);
  }
  function configureMotion() {
    const wasEnabled = motionEnabled;
    const contentHeight = document.querySelector(".hero-content").offsetHeight + document.querySelector(".site-header").offsetHeight + 24;
    motionEnabled = !motionQuery.matches && window.innerHeight >= Math.max(620, contentHeight);
    document.documentElement.classList.toggle("has-motion", motionEnabled);
    if (!motionEnabled) current = target = 1;
    updateHands();
    // Fade into the current scroll pose instead of first sweeping outward.
    if (!wasEnabled && motionEnabled) current = target;
  }
  window.addEventListener("scroll", updateHands, { passive: true });
  window.addEventListener("resize", configureMotion, { passive: true });
  motionQuery.addEventListener("change", configureMotion);
  configureMotion();

  // Progressive enhancement: every practice remains readable without JS.
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[role="tabpanel"]')];
  const toneButton = document.getElementById("tone-button");
  const soundArt = document.querySelector(".sound-art");
  const toneLabel = document.querySelector(".tone-label");
  const toneIcon = document.querySelector(".tone-icon");
  const feedback = document.getElementById("sound-feedback");
  let sound = null;
  let soundTimeout = null;
  let audioGeneration = 0;

  function setToneState(playing) {
    toneButton.setAttribute("aria-pressed", String(playing));
    toneButton.setAttribute("aria-label", playing ? "Stop the bowl-inspired tone" : "Play a soft bowl-inspired tone");
    toneLabel.textContent = playing ? "Let it settle · stop" : "A moment of sound";
    toneIcon.textContent = playing ? "Ⅱ" : "▷";
    soundArt.classList.toggle("is-playing", playing);
  }
  function stopTone() {
    audioGeneration += 1;
    if (soundTimeout) clearTimeout(soundTimeout);
    soundTimeout = null;
    if (sound) {
      const context = sound;
      sound = null;
      context.close().catch(() => {});
    }
    setToneState(false);
  }
  function activateTab(index, focus = false) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    if (index !== 0) stopTone();
    if (focus) tabs[index].focus();
  }
  document.documentElement.classList.add("has-tabs");
  activateTab(0);
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(index));
    tab.addEventListener("keydown", event => {
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      activateTab(next, true);
    });
  });

  // A synthesized illustration, intentionally not represented as Jen's recording.
  toneButton.addEventListener("click", async () => {
    if (sound) { stopTone(); return; }
    feedback.textContent = "";
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) { feedback.textContent = "Sound isn’t available in this browser."; return; }
    const generation = ++audioGeneration;
    try {
      const context = new AudioContextClass();
      sound = context;
      setToneState(true);
      await context.resume();
      if (generation !== audioGeneration || sound !== context || document.hidden) return;
      const now = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(.11, now);
      master.connect(context.destination);
      const partials = [[174.61, .8], [349.58, .26], [471.45, .16], [708.02, .08], [1059.25, .025]];
      partials.forEach(([frequency, volume]) => {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(volume, now + .04);
        envelope.gain.exponentialRampToValueAtTime(.0001, now + 7.8);
        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(now);
        oscillator.stop(now + 8);
      });
      soundTimeout = setTimeout(stopTone, 8200);
    } catch {
      if (generation !== audioGeneration) return;
      stopTone();
      feedback.textContent = "Sound couldn’t start. You can still explore the work below.";
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stopTone(); if (frame) cancelAnimationFrame(frame); frame = 0; }
    else updateHands();
  });
  window.addEventListener("pagehide", stopTone);

  // No fake submissions. The empty configuration is visibly a design preview.
  const form = document.getElementById("inquiry-form");
  const submit = document.getElementById("inquiry-submit");
  const previewNote = document.getElementById("form-preview-note");
  const status = document.getElementById("form-status");
  const emailElement = document.getElementById("inquiry-email");
  const safeEmail = typeof settings.email === "string" && /^[^\s@\r\n?]+@[^\s@\r\n?]+\.[^\s@\r\n?]+$/.test(settings.email) ? settings.email : "";
  let formUrl = "";
  try { const url = new URL(settings.inquiryFormUrl); if (url.protocol === "https:") formUrl = url.href; } catch { /* An empty URL keeps the prototype offline. */ }
  if (settings.serviceArea) {
    const availability = `Currently available in ${settings.serviceArea}${settings.sessionSetting ? `. ${settings.sessionSetting}` : "."}`;
    document.getElementById("availability-line").textContent = availability;
    document.getElementById("availability-faq").textContent = availability;
  }
  if (safeEmail) {
    const link = document.createElement("a");
    link.href = `mailto:${safeEmail}`;
    link.textContent = safeEmail;
    emailElement.append("Prefer email? ", link);
    submit.disabled = false;
    submit.innerHTML = 'Open email draft <span aria-hidden="true">↗</span>';
    previewNote.textContent = "This opens your email app with a draft. You choose whether to send it.";
  }
  if (formUrl) {
    form.replaceChildren();
    const introduction = document.createElement("p");
    introduction.className = "inquiry-intro";
    introduction.textContent = "A brief message is enough. Please save detailed health or personal histories for a separate conversation.";
    const link = document.createElement("a");
    link.className = "button button-dark";
    link.href = formUrl;
    link.textContent = "Open the inquiry form ↗";
    form.append(introduction, link);
  }
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!safeEmail || formUrl) return;
    const fields = new FormData(form);
    const body = `Hi Jen,\n\n${fields.get("message")}\n\n${fields.get("name")}\nReply email: ${fields.get("email")}`;
    window.location.href = `mailto:${safeEmail}?subject=${encodeURIComponent("Just Be Held — session inquiry")}&body=${encodeURIComponent(body)}`;
    status.textContent = "An email draft was requested. Send it from your email app; this website has not sent your message.";
  });
  document.querySelectorAll("[data-interest]").forEach(link => link.addEventListener("click", () => {
    const message = document.getElementById("message");
    if (message && !message.value.trim()) message.value = `Hi Jen, I’m interested in ${link.dataset.interest.toLowerCase()} and would love to learn more.`;
  }));
})();
