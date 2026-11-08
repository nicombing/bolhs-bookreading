/**
 * Book Reading — Web Application
 * Core Application Logic, Fixed Reader Roster & View Routing
 */

// 11 Fixed Readers for BOLHS Book Reading sessions
const FIXED_READERS = [
  { id: "widuri", name: "Ms. Widuri", color: "#06b6d4", active: true },
  { id: "elsi", name: "Ms. Elsi", color: "#8b5cf6", active: true },
  { id: "merlyn", name: "Ms. Merlyn", color: "#10b981", active: true },
  { id: "tika", name: "Ms. Tika", color: "#f59e0b", active: true },
  { id: "sindy", name: "Ms. Sindy", color: "#ec4899", active: true },
  { id: "riny", name: "Ms. Riny", color: "#3b82f6", active: true },
  { id: "angela", name: "Ms. Angela", color: "#f97316", active: true },
  { id: "elsu", name: "Ms. Elsu", color: "#14b8a6", active: true },
  { id: "rasita", name: "Ms. Rasita", color: "#a855f7", active: true },
  { id: "nico", name: "Sr. Nico", color: "#38bdf8", active: true },
  { id: "deriel", name: "Sr. Deriel", color: "#e11d48", active: true }
];

const DEFAULT_STATE = {
  currentView: "setup", // 'setup' (landing page) or 'reading'
  title: "The Little Prince — Chapters 1 & 2",
  rawText: "",
  paragraphs: [],
  currentIndex: 0,
  readerOffset: 0,
  readers: JSON.parse(JSON.stringify(FIXED_READERS)),
  presentationMode: false,
  settings: {
    fontSize: 23,
    containerWidth: 820,
    lineHeight: 1.82,
    soundEnabled: false,
    autoCenter: true,
    dimmedOpacity: 0.5
  }
};

let state = { ...DEFAULT_STATE };
let audioCtx = null;

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  loadFromLocalStorage();

  // If no rawText loaded, initialize with default sample
  if (!state.rawText || state.rawText.trim().length === 0) {
    if (typeof SAMPLE_TEXTS !== "undefined" && SAMPLE_TEXTS.length > 0) {
      state.rawText = SAMPLE_TEXTS[0].text;
      const parsed = parseRawText(state.rawText, true);
      state.title = parsed.title;
      state.paragraphs = parsed.paragraphs;
    }
  }

  // Ensure all fixed readers exist even if local storage had older structure
  syncFixedReaders();

  applySettings();
  initSetupView();
  switchView(state.currentView || "setup");
  setupEventListeners();
  setupKeyboardShortcuts();
});

/* ========================================================
   Local Storage & State Sync
   ======================================================== */
function syncFixedReaders() {
  if (!state.readers || state.readers.length === 0) {
    state.readers = JSON.parse(JSON.stringify(FIXED_READERS));
    return;
  }

  // Ensure fixed readers are present and have colors
  const existingMap = new Map();
  state.readers.forEach(r => existingMap.set(r.name, r));

  const merged = [];
  FIXED_READERS.forEach(fr => {
    if (existingMap.has(fr.name)) {
      merged.push({ ...fr, ...existingMap.get(fr.name) });
      existingMap.delete(fr.name);
    } else {
      merged.push({ ...fr });
    }
  });

  // Any custom guest readers added by admin
  existingMap.forEach(guest => {
    merged.push(guest);
  });

  state.readers = merged;
}

function saveToLocalStorage() {
  try {
    localStorage.setItem("book_reading_state", JSON.stringify(state));
  } catch (err) {
    console.warn("Could not save to localStorage", err);
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem("book_reading_state") || localStorage.getItem("zoom_shared_reader_state");
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...DEFAULT_STATE, ...parsed };
    }
  } catch (err) {
    console.warn("Error restoring state", err);
  }
}

/* ========================================================
   View Switching (Landing Setup vs Reading View)
   ======================================================== */
function switchView(viewName) {
  state.currentView = viewName;
  saveToLocalStorage();

  const setupView = document.getElementById("view-setup");
  const readingView = document.getElementById("view-reading");

  if (viewName === "reading") {
    if (setupView) setupView.classList.remove("active");
    if (readingView) readingView.classList.add("active");
    renderReadingView();
    scrollToActiveParagraph();
  } else {
    if (readingView) readingView.classList.remove("active");
    if (setupView) setupView.classList.add("active");
    // Ensure Presentation Mode is exited when in setup
    if (state.presentationMode) {
      togglePresentationMode(false);
    }
    renderSetupView();
  }
}

/* ========================================================
   Text Parsing & Automatic Title Detection
   ======================================================== */
function parseRawText(rawText, autoDetectTitle = true) {
  if (!rawText || !rawText.trim()) {
    return { title: "Untitled Reading Session", paragraphs: [] };
  }

  const clean = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const lines = clean.split("\n");
  let detectedTitle = "Untitled Reading";
  let contentStartIndex = 0;

  if (autoDetectTitle) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length > 0) {
        detectedTitle = line;
        contentStartIndex = i + 1;
        break;
      }
    }
  }

  const remainingText = lines.slice(contentStartIndex).join("\n").trim();
  const rawParagraphs = remainingText.split(/\n\s*\n+/);
  const paragraphs = [];

  for (let block of rawParagraphs) {
    const trimmed = block.trim();
    if (trimmed.length > 0) {
      paragraphs.push(trimmed);
    }
  }

  return { title: detectedTitle, paragraphs };
}

/* ========================================================
   Reader Rotation Logic
   ======================================================== */
function getActiveReaders() {
  const active = (state.readers || []).filter(r => r.active !== false);
  if (active.length === 0) {
    return [{ id: "solo", name: "Solo Reader", color: "#38bdf8", active: true }];
  }
  return active;
}

function getReaderForParagraph(paragraphIndex) {
  const active = getActiveReaders();
  const rawIdx = (paragraphIndex + state.readerOffset) % active.length;
  const idx = (rawIdx + active.length) % active.length;
  return active[idx];
}

function getNextReaderForParagraph(paragraphIndex) {
  const active = getActiveReaders();
  if (active.length <= 1) return null;
  const rawIdx = (paragraphIndex + state.readerOffset + 1) % active.length;
  const idx = (rawIdx + active.length) % active.length;
  return active[idx];
}

function skipCurrentReader() {
  state.readerOffset += 1;
  saveToLocalStorage();
  renderReadingView();
  playChime();
}

/* ========================================================
   Landing / Setup View Logic
   ======================================================== */
function initSetupView() {
  const textarea = document.getElementById("setup-text-input");
  const titleInput = document.getElementById("setup-title-input");
  const autoDetectCheckbox = document.getElementById("setup-auto-title-toggle");

  if (textarea) textarea.value = state.rawText || "";
  if (titleInput) titleInput.value = state.title || "";

  if (textarea) {
    textarea.oninput = () => {
      state.rawText = textarea.value;
      const autoDetect = autoDetectCheckbox ? autoDetectCheckbox.checked : true;
      const parsed = parseRawText(state.rawText, autoDetect);
      
      if (autoDetect && titleInput) {
        titleInput.value = parsed.title;
        state.title = parsed.title;
      }
      state.paragraphs = parsed.paragraphs;
      updateSetupStats();
      saveToLocalStorage();
    };
  }

  if (titleInput) {
    titleInput.oninput = () => {
      state.title = titleInput.value;
      saveToLocalStorage();
    };
  }
}

function renderSetupView() {
  renderSetupChecklist();
  updateSetupStats();
}

function renderSetupChecklist() {
  const container = document.getElementById("readers-checklist-container");
  const counterBadge = document.getElementById("attendance-count-badge");
  if (!container) return;

  const total = state.readers.length;
  const activeCount = state.readers.filter(r => r.active !== false).length;

  if (counterBadge) {
    counterBadge.textContent = `${activeCount} of ${total} Present`;
  }

  let turnCounter = 1;
  let html = "";

  state.readers.forEach((reader, index) => {
    const isChecked = reader.active !== false;
    const turnLabel = isChecked ? `Turn #${turnCounter++}` : "Away";

    html += `
      <div class="reader-check-item ${isChecked ? 'checked' : ''}" onclick="toggleReaderAttendance('${reader.id}')">
        <div class="reader-check-left">
          <input type="checkbox" class="custom-checkbox" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation(); toggleReaderAttendance('${reader.id}')">
          <div class="reader-item-avatar" style="background-color: ${reader.color};">
            ${escapeHtml(getInitials(reader.name))}
          </div>
          <span class="reader-item-name">${escapeHtml(reader.name)}</span>
        </div>
        <div class="reader-order-badge">
          ${turnLabel}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  validateLaunchButton();
}

function getInitials(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0);
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function toggleReaderAttendance(readerId) {
  const r = state.readers.find(x => x.id === readerId);
  if (r) {
    r.active = !r.active;
    saveToLocalStorage();
    renderSetupChecklist();
    updateSetupStats();
  }
}

function selectAllReaders() {
  state.readers.forEach(r => r.active = true);
  saveToLocalStorage();
  renderSetupChecklist();
  updateSetupStats();
}

function deselectAllReaders() {
  state.readers.forEach(r => r.active = false);
  saveToLocalStorage();
  renderSetupChecklist();
  updateSetupStats();
}

function shuffleReaderOrder() {
  for (let i = state.readers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.readers[i], state.readers[j]] = [state.readers[j], state.readers[i]];
  }
  saveToLocalStorage();
  renderSetupChecklist();
}

function addGuestReader() {
  const input = document.getElementById("input-guest-reader");
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;

  const colors = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#3b82f6", "#f97316", "#14b8a6", "#a855f7", "#e11d48"];
  const color = colors[state.readers.length % colors.length];

  state.readers.push({
    id: "guest_" + Date.now(),
    name: name,
    color: color,
    active: true
  });

  input.value = "";
  saveToLocalStorage();
  renderSetupChecklist();
  updateSetupStats();
}

function updateSetupStats() {
  const statsEl = document.getElementById("setup-stats-summary");
  const paragraphs = state.paragraphs || [];
  const activeCount = state.readers.filter(r => r.active !== false).length;
  const wordCount = paragraphs.reduce((acc, p) => acc + p.split(/\s+/).filter(Boolean).length, 0);
  const estMins = Math.max(1, Math.ceil(wordCount / 130));

  if (statsEl) {
    statsEl.innerHTML = `
      <span>📄 <strong>${paragraphs.length}</strong> paragraphs</span>
      <span>•</span>
      <span>👥 <strong>${activeCount}</strong> readers ready</span>
      <span>•</span>
      <span>⏱️ <strong>~${estMins}</strong> min reading</span>
    `;
  }

  validateLaunchButton();
}

function validateLaunchButton() {
  const launchBtn = document.getElementById("btn-start-reading");
  if (!launchBtn) return;

  const hasText = state.paragraphs && state.paragraphs.length > 0;
  const hasReaders = state.readers.some(r => r.active !== false);

  launchBtn.disabled = !hasText || !hasReaders;
}

function loadSampleToSetup(sampleId) {
  if (typeof SAMPLE_TEXTS === "undefined") return;
  const sample = SAMPLE_TEXTS.find(s => s.id === sampleId);
  if (!sample) return;

  const textarea = document.getElementById("setup-text-input");
  const titleInput = document.getElementById("setup-title-input");

  state.rawText = sample.text;
  const parsed = parseRawText(sample.text, true);
  state.title = parsed.title;
  state.paragraphs = parsed.paragraphs;

  if (textarea) textarea.value = sample.text;
  if (titleInput) titleInput.value = parsed.title;

  saveToLocalStorage();
  updateSetupStats();
}

function handleStartSession() {
  const textarea = document.getElementById("setup-text-input");
  const titleInput = document.getElementById("setup-title-input");

  if (textarea && textarea.value.trim()) {
    state.rawText = textarea.value;
    const parsed = parseRawText(textarea.value, true);
    state.title = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : parsed.title;
    state.paragraphs = parsed.paragraphs;
  }

  state.currentIndex = 0;
  state.readerOffset = 0;
  saveToLocalStorage();
  switchView("reading");
}

/* ========================================================
   Reading Session View Rendering
   ======================================================== */
function renderReadingView() {
  renderReadingHeader();
  renderParagraphs();
  renderDock();
}

function renderReadingHeader() {
  const titlePreviewEl = document.getElementById("session-title-preview");
  const bookTitleEl = document.getElementById("book-title");
  const progressBadgeEl = document.getElementById("progress-badge");
  const activeReaderBanner = document.getElementById("top-active-reader");

  if (titlePreviewEl) titlePreviewEl.textContent = state.title || "Book Reading";
  if (bookTitleEl) bookTitleEl.textContent = state.title || "Book Reading";

  const total = state.paragraphs.length;
  const currentNum = total > 0 ? state.currentIndex + 1 : 0;

  if (progressBadgeEl) {
    progressBadgeEl.innerHTML = `<span>Paragraph <strong>${currentNum}</strong> of <strong>${total}</strong></span>`;
  }

  if (activeReaderBanner && total > 0) {
    const curReader = getReaderForParagraph(state.currentIndex);
    const nextReader = getNextReaderForParagraph(state.currentIndex);

    let nextText = nextReader ? `<span style="color: #94a3b8; font-size: 11.5px; margin-left: 4px;">• Next: ${escapeHtml(nextReader.name)}</span>` : "";
    activeReaderBanner.innerHTML = `
      <span class="reader-avatar-dot" style="background-color: ${curReader.color};"></span>
      <span>Reading: <strong style="color: #ffffff;">${escapeHtml(curReader.name)}</strong></span>
      ${nextText}
    `;
  }

  const estTimeEl = document.getElementById("estimated-time-badge");
  if (estTimeEl) {
    const wordsRemaining = state.paragraphs.slice(state.currentIndex).reduce((acc, p) => acc + p.split(/\s+/).filter(Boolean).length, 0);
    const minsRemaining = Math.max(1, Math.ceil(wordsRemaining / 130));
    estTimeEl.textContent = `~${minsRemaining} min remaining`;
  }
}

function renderParagraphs() {
  const container = document.getElementById("paragraphs-container");
  if (!container) return;

  if (state.paragraphs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
        <h3 style="font-size: 20px; margin-bottom: 8px; color: #f8fafc;">No text to read</h3>
        <p style="margin-bottom: 20px;">Return to setup to paste text and assign readers.</p>
        <button class="btn-primary" onclick="switchView('setup')">Go to Setup</button>
      </div>
    `;
    return;
  }

  let html = "";
  state.paragraphs.forEach((para, idx) => {
    const isActive = idx === state.currentIndex;
    const reader = getReaderForParagraph(idx);
    const nextReader = getNextReaderForParagraph(idx);

    if (isActive) {
      // High-contrast active white card
      html += `
        <article class="para-item active" id="para-${idx}" role="region" aria-current="true">
          <header class="active-reader-header">
            <div class="reader-badge-pill" style="background: rgba(15, 23, 42, 0.05); border: 1px solid rgba(15, 23, 42, 0.1);">
              <div class="reader-avatar-circle" style="background-color: ${reader.color};">
                ${escapeHtml(getInitials(reader.name))}
              </div>
              <div class="reader-reading-label">
                <span class="sub">Current Reader</span>
                <span class="name">${escapeHtml(reader.name)}</span>
              </div>
            </div>

            <div class="active-card-meta">
              ${nextReader ? `<span style="font-weight: 500;">Next up: <strong>${escapeHtml(nextReader.name)}</strong></span>` : ""}
              <button class="btn-skip-inline" onclick="event.stopPropagation(); skipCurrentReader();" title="Pass turn to next reader (Key: S)">
                <span>Pass Turn</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </header>

          <div class="para-content">
            ${escapeHtml(para)}
          </div>
        </article>
      `;
    } else {
      // Dimmed readable context paragraph
      html += `
        <article class="para-item dimmed" id="para-${idx}" onclick="goToParagraph(${idx})" title="Click to jump to this paragraph">
          <div class="para-reader-tag">
            <span style="width: 7px; height: 7px; border-radius: 50%; background: ${reader.color}; display: inline-block;"></span>
            <span>${escapeHtml(reader.name)} • Paragraph ${idx + 1}</span>
          </div>
          <div class="para-content">
            ${escapeHtml(para)}
          </div>
        </article>
      `;
    }
  });

  container.innerHTML = html;
}

function renderDock() {
  const total = state.paragraphs.length;
  const currentNum = total > 0 ? state.currentIndex + 1 : 0;

  const prevBtn = document.getElementById("dock-prev-btn");
  const nextBtn = document.getElementById("dock-next-btn");
  const counterEl = document.getElementById("dock-counter");
  const progressFill = document.getElementById("dock-progress-fill");

  if (prevBtn) prevBtn.disabled = state.currentIndex <= 0;
  if (nextBtn) nextBtn.disabled = total === 0 || state.currentIndex >= total - 1;

  if (counterEl) {
    counterEl.textContent = `${currentNum} / ${total}`;
  }

  if (progressFill && total > 0) {
    const percentage = Math.round(((state.currentIndex + 1) / total) * 100);
    progressFill.style.width = `${percentage}%`;
  }
}

/* ========================================================
   Audio Feedback (Web Audio API Synth)
   ======================================================== */
function playChime() {
  if (!state.settings.soundEnabled) return;

  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) audioCtx = new AudioCtxClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {
    console.log("Audio not supported or blocked", e);
  }
}

/* ========================================================
   Reading Navigation
   ======================================================== */
function goToParagraph(index, smoothScroll = true) {
  if (state.paragraphs.length === 0) return;
  const targetIndex = Math.max(0, Math.min(index, state.paragraphs.length - 1));
  if (targetIndex === state.currentIndex) return;

  state.currentIndex = targetIndex;
  saveToLocalStorage();
  renderReadingView();
  playChime();

  if (smoothScroll && state.settings.autoCenter) {
    scrollToActiveParagraph();
  }
}

function nextParagraph() {
  if (state.currentIndex < state.paragraphs.length - 1) {
    goToParagraph(state.currentIndex + 1);
  }
}

function prevParagraph() {
  if (state.currentIndex > 0) {
    goToParagraph(state.currentIndex - 1);
  }
}

function scrollToActiveParagraph() {
  requestAnimationFrame(() => {
    const activeEl = document.querySelector(".para-item.active");
    if (activeEl) {
      const rect = activeEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const targetY = window.scrollY + rect.top - (viewportHeight * 0.32);

      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: "smooth"
      });
    }
  });
}

function togglePresentationMode(forceValue) {
  state.presentationMode = typeof forceValue === "boolean" ? forceValue : !state.presentationMode;

  const topBar = document.querySelector(".top-bar");
  const hostDock = document.querySelector(".host-dock");
  const revealBtn = document.getElementById("presentation-reveal-btn");

  if (state.presentationMode) {
    if (topBar) topBar.classList.add("hidden-mode");
    if (hostDock) hostDock.classList.add("hidden-mode");
    if (revealBtn) revealBtn.style.display = "flex";
  } else {
    if (topBar) topBar.classList.remove("hidden-mode");
    if (hostDock) hostDock.classList.remove("hidden-mode");
    if (revealBtn) revealBtn.style.display = "none";
  }
}

/* ========================================================
   Settings
   ======================================================== */
function applySettings() {
  const s = state.settings;
  const root = document.documentElement;

  root.style.setProperty("--reading-font-size", `${s.fontSize}px`);
  root.style.setProperty("--container-max-width", `${s.containerWidth}px`);
  root.style.setProperty("--reading-line-height", s.lineHeight);
  root.style.setProperty("--dimmed-opacity", s.dimmedOpacity);

  const fontSlider = document.getElementById("setting-font-size");
  const fontVal = document.getElementById("font-size-val");
  if (fontSlider) fontSlider.value = s.fontSize;
  if (fontVal) fontVal.textContent = `${s.fontSize}px`;

  const widthSelect = document.getElementById("setting-container-width");
  if (widthSelect) widthSelect.value = s.containerWidth;

  const soundToggle = document.getElementById("setting-sound-enabled");
  if (soundToggle) soundToggle.checked = s.soundEnabled;

  const opacitySlider = document.getElementById("setting-dimmed-opacity");
  const opacityVal = document.getElementById("opacity-val");
  if (opacitySlider) opacitySlider.value = s.dimmedOpacity;
  if (opacityVal) opacityVal.textContent = `${Math.round(s.dimmedOpacity * 100)}%`;
}

function updateSetting(key, value) {
  state.settings[key] = value;
  saveToLocalStorage();
  applySettings();
}

/* ========================================================
   Modals
   ======================================================== */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("open");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("open");
}

/* ========================================================
   Keyboard Shortcuts & Event Listeners
   ======================================================== */
function setupKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") {
      if (e.key === "Escape") e.target.blur();
      return;
    }

    // Only handle reading navigation if in reading view
    if (state.currentView === "reading") {
      switch (e.code) {
        case "Space":
        case "ArrowRight":
        case "PageDown":
          e.preventDefault();
          nextParagraph();
          break;

        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          prevParagraph();
          break;

        case "Home":
          e.preventDefault();
          goToParagraph(0);
          break;

        case "End":
          e.preventDefault();
          goToParagraph(state.paragraphs.length - 1);
          break;

        case "KeyH":
          e.preventDefault();
          togglePresentationMode();
          break;

        case "KeyS":
          e.preventDefault();
          skipCurrentReader();
          break;
      }
    }

    switch (e.code) {
      case "KeyF":
        e.preventDefault();
        toggleFullscreen();
        break;

      case "Slash":
        if (e.shiftKey) { // '?' key
          e.preventDefault();
          openModal("shortcuts-modal");
        }
        break;

      case "Escape":
        const openModals = document.querySelectorAll(".modal-overlay.open");
        if (openModals.length > 0) {
          openModals.forEach(m => m.classList.remove("open"));
        } else if (state.presentationMode) {
          togglePresentationMode(false);
        }
        break;
    }
  });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn("Fullscreen request failed", err);
    });
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
  }
}

function setupEventListeners() {
  const progressTrack = document.getElementById("dock-progress-track");
  if (progressTrack) {
    progressTrack.onclick = (e) => {
      if (state.paragraphs.length === 0) return;
      const rect = progressTrack.getBoundingClientRect();
      const clickRatio = (e.clientX - rect.left) / rect.width;
      const targetIdx = Math.floor(clickRatio * state.paragraphs.length);
      goToParagraph(targetIdx);
    };
  }

  const guestInput = document.getElementById("input-guest-reader");
  if (guestInput) {
    guestInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addGuestReader();
      }
    };
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
