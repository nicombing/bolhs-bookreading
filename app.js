/**
 * Book Reading — Web Application
 * Core Application Logic & Reader Rotation
 */

// Color palette for reader avatars
const READER_COLORS = [
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#a855f7', // Purple
  '#e11d48'  // Rose
];

// Default initial state
const DEFAULT_STATE = {
  title: "The Little Prince — Chapters 1 & 2",
  paragraphs: [],
  currentIndex: 0,
  readerOffset: 0,
  readers: [
    { id: "r1", name: "Alice", color: READER_COLORS[0], active: true },
    { id: "r2", name: "David", color: READER_COLORS[1], active: true },
    { id: "r3", name: "Elena", color: READER_COLORS[2], active: true },
    { id: "r4", name: "Marcus", color: READER_COLORS[3], active: true }
  ],
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
  
  // If no paragraphs loaded, initialize with default sample
  if (!state.paragraphs || state.paragraphs.length === 0) {
    if (typeof SAMPLE_TEXTS !== 'undefined' && SAMPLE_TEXTS.length > 0) {
      loadTextContent(SAMPLE_TEXTS[0].text, true);
    }
  }

  applySettings();
  renderApp();
  setupEventListeners();
  setupKeyboardShortcuts();
});

/* ========================================================
   Local Storage & State Management
   ======================================================== */
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
      // Ensure readers have ids and colors
      state.readers = (state.readers || []).map((r, i) => ({
        ...r,
        id: r.id || "r_" + i + "_" + Date.now(),
        color: r.color || READER_COLORS[i % READER_COLORS.length],
        active: r.active !== false
      }));
    }
  } catch (err) {
    console.warn("Error restoring state", err);
  }
}

/* ========================================================
   Text Parsing & Automatic Title Detection
   ======================================================== */
function parseRawText(rawText, autoDetectTitle = true) {
  if (!rawText || !rawText.trim()) {
    return { title: "Untitled Reading Session", paragraphs: [] };
  }

  // Normalize line endings
  const clean = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  
  // Split into rough blocks
  const lines = clean.split("\n");
  let detectedTitle = "Untitled Reading";
  let contentStartIndex = 0;

  if (autoDetectTitle) {
    // Find first non-empty line as title
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length > 0) {
        detectedTitle = line;
        contentStartIndex = i + 1;
        break;
      }
    }
  }

  // Collect subsequent text and split by paragraphs (double newlines or standalone blocks)
  const remainingText = lines.slice(contentStartIndex).join("\n").trim();
  
  // Split by double newline or consecutive newlines
  const rawParagraphs = remainingText.split(/\n\s*\n+/);
  const paragraphs = [];

  for (let block of rawParagraphs) {
    const trimmed = block.trim();
    if (trimmed.length > 0) {
      // If block contains single newlines within dialogue, keep them joined or clean
      paragraphs.push(trimmed);
    }
  }

  return { title: detectedTitle, paragraphs };
}

function loadTextContent(rawText, autoDetectTitle = true) {
  const parsed = parseRawText(rawText, autoDetectTitle);
  state.title = parsed.title;
  state.paragraphs = parsed.paragraphs;
  state.currentIndex = 0;
  state.readerOffset = 0;
  saveToLocalStorage();
}

/* ========================================================
   Reader Rotation Logic
   ======================================================== */
function getActiveReaders() {
  const active = (state.readers || []).filter(r => r.active !== false);
  if (active.length === 0) {
    return [{ id: "solo", name: "Reader", color: "#38bdf8", active: true }];
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
  renderApp();
  playChime();
}

/* ========================================================
   Audio Feedback (Web Audio API Synth)
   ======================================================== */
function playChime() {
  if (!state.settings.soundEnabled) return;

  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // Gentle high chime (E5: ~659.25Hz, then harmonics)
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
   Navigation & Controls
   ======================================================== */
function goToParagraph(index, smoothScroll = true) {
  if (state.paragraphs.length === 0) return;
  const targetIndex = Math.max(0, Math.min(index, state.paragraphs.length - 1));
  if (targetIndex === state.currentIndex) return;

  state.currentIndex = targetIndex;
  saveToLocalStorage();
  renderApp();
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
      // Calculate smooth vertical offset
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
  state.presentationMode = typeof forceValue === 'boolean' ? forceValue : !state.presentationMode;
  
  const topBar = document.querySelector(".top-bar");
  const hostDock = document.querySelector(".host-dock");
  const revealBtn = document.getElementById("presentation-reveal-btn");

  if (state.presentationMode) {
    topBar.classList.add("hidden-mode");
    hostDock.classList.add("hidden-mode");
    if (revealBtn) revealBtn.style.display = "flex";
  } else {
    topBar.classList.remove("hidden-mode");
    hostDock.classList.remove("hidden-mode");
    if (revealBtn) revealBtn.style.display = "none";
  }
}

/* ========================================================
   Rendering
   ======================================================== */
function renderApp() {
  renderHeader();
  renderParagraphs();
  renderDock();
}

function renderHeader() {
  const titlePreviewEl = document.getElementById("session-title-preview");
  const bookTitleEl = document.getElementById("book-title");
  const progressBadgeEl = document.getElementById("progress-badge");
  const activeReaderBanner = document.getElementById("top-active-reader");

  if (titlePreviewEl) titlePreviewEl.textContent = state.title || "Shared Reading";
  if (bookTitleEl) bookTitleEl.textContent = state.title || "Shared Reading";

  const total = state.paragraphs.length;
  const currentNum = total > 0 ? state.currentIndex + 1 : 0;
  
  if (progressBadgeEl) {
    progressBadgeEl.innerHTML = `<span>Paragraph <strong>${currentNum}</strong> of <strong>${total}</strong></span>`;
  }

  // Top bar reader turn banner
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

  // Reading time estimate
  const estTimeEl = document.getElementById("estimated-time-badge");
  if (estTimeEl) {
    const totalWords = state.paragraphs.reduce((acc, p) => acc + p.split(/\s+/).length, 0);
    const wordsRemaining = state.paragraphs.slice(state.currentIndex).reduce((acc, p) => acc + p.split(/\s+/).length, 0);
    const minsRemaining = Math.max(1, Math.ceil(wordsRemaining / 130));
    estTimeEl.textContent = `~${minsRemaining} min remaining (${totalWords} words)`;
  }
}

function renderParagraphs() {
  const container = document.getElementById("paragraphs-container");
  if (!container) return;

  if (state.paragraphs.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
        <h3 style="font-size: 20px; margin-bottom: 8px; color: #f8fafc;">No text loaded yet</h3>
        <p style="margin-bottom: 20px;">Paste a book chapter or load a sample to start reading together!</p>
        <button class="btn-primary" onclick="openModal('paste-modal')">Load Book or Chapter</button>
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
      // Active high-contrast white card
      html += `
        <article class="para-item active" id="para-${idx}" role="region" aria-current="true">
          <header class="active-reader-header">
            <div class="reader-badge-pill" style="background: rgba(15, 23, 42, 0.05); border: 1px solid rgba(15, 23, 42, 0.1);">
              <div class="reader-avatar-circle" style="background-color: ${reader.color};">
                ${escapeHtml(reader.name.charAt(0))}
              </div>
              <div class="reader-reading-label">
                <span class="sub">Current Reader</span>
                <span class="name">${escapeHtml(reader.name)}</span>
              </div>
            </div>

            <div class="active-card-meta">
              ${nextReader ? `<span style="font-weight: 500;">Next up: <strong>${escapeHtml(nextReader.name)}</strong></span>` : ""}
              <button class="btn-skip-inline" onclick="event.stopPropagation(); skipCurrentReader();" title="Skip reader for this paragraph">
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
      // Dimmed readable background paragraph
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
   Settings & Customization
   ======================================================== */
function applySettings() {
  const s = state.settings;
  const root = document.documentElement;

  root.style.setProperty("--reading-font-size", `${s.fontSize}px`);
  root.style.setProperty("--container-max-width", `${s.containerWidth}px`);
  root.style.setProperty("--reading-line-height", s.lineHeight);
  root.style.setProperty("--dimmed-opacity", s.dimmedOpacity);

  // Update input elements in settings modal if present
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
   Readers Roster Management
   ======================================================== */
function renderReadersModal() {
  const listEl = document.getElementById("readers-list-container");
  if (!listEl) return;

  let html = "";
  state.readers.forEach((reader, i) => {
    html += `
      <div class="reader-chip ${reader.active ? '' : 'inactive'}">
        <span class="reader-chip-color" style="background-color: ${reader.color};"></span>
        <span>${escapeHtml(reader.name)}</span>
        <div class="reader-chip-actions">
          <button class="btn-chip-action" onclick="toggleReaderActive('${reader.id}')" title="${reader.active ? 'Mark away' : 'Mark active'}">
            ${reader.active ? '✓' : '⊘'}
          </button>
          <button class="btn-chip-action" onclick="deleteReader('${reader.id}')" title="Remove reader">
            ✕
          </button>
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}

function addReader(name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const nextColor = READER_COLORS[state.readers.length % READER_COLORS.length];
  state.readers.push({
    id: "r_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
    name: trimmed,
    color: nextColor,
    active: true
  });

  saveToLocalStorage();
  renderReadersModal();
  renderApp();
}

function deleteReader(id) {
  state.readers = state.readers.filter(r => r.id !== id);
  saveToLocalStorage();
  renderReadersModal();
  renderApp();
}

function toggleReaderActive(id) {
  const r = state.readers.find(x => x.id === id);
  if (r) {
    r.active = !r.active;
    saveToLocalStorage();
    renderReadersModal();
    renderApp();
  }
}

function shuffleReaders() {
  for (let i = state.readers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [state.readers[i], state.readers[j]] = [state.readers[j], state.readers[i]];
  }
  saveToLocalStorage();
  renderReadersModal();
  renderApp();
}

/* ========================================================
   Modal Controls
   ======================================================== */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("open");

    // Populate data if specific modal
    if (id === "readers-modal") {
      renderReadersModal();
    } else if (id === "paste-modal") {
      setupPasteModalPreview();
    }
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("open");
  }
}

function setupPasteModalPreview() {
  const textarea = document.getElementById("paste-input-text");
  const titleInput = document.getElementById("detected-title-input");
  const previewSummary = document.getElementById("paste-preview-summary");
  const autoDetectToggle = document.getElementById("auto-detect-title-toggle");

  if (!textarea) return;

  const updatePreview = () => {
    const text = textarea.value;
    const autoDetect = autoDetectToggle ? autoDetectToggle.checked : true;
    const parsed = parseRawText(text, autoDetect);

    if (titleInput && autoDetect) {
      titleInput.value = parsed.title;
    }
    if (previewSummary) {
      previewSummary.textContent = `${parsed.paragraphs.length} paragraphs detected`;
    }
  };

  textarea.oninput = updatePreview;
  if (autoDetectToggle) autoDetectToggle.onchange = updatePreview;
}

function loadSample(sampleId) {
  if (typeof SAMPLE_TEXTS === 'undefined') return;
  const sample = SAMPLE_TEXTS.find(s => s.id === sampleId);
  if (sample) {
    const textarea = document.getElementById("paste-input-text");
    const titleInput = document.getElementById("detected-title-input");
    if (textarea) textarea.value = sample.text;
    if (titleInput) titleInput.value = sample.name;
    
    // Auto submit sample
    loadTextContent(sample.text, true);
    closeModal("paste-modal");
    renderApp();
    scrollToActiveParagraph();
  }
}

/* ========================================================
   Keyboard Shortcuts & Event Listeners
   ======================================================== */
function setupKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    // Ignore keys if typing in an input or textarea
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") {
      if (e.key === "Escape") {
        e.target.blur();
      }
      return;
    }

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

      case "KeyF":
        e.preventDefault();
        toggleFullscreen();
        break;

      case "KeyS":
        e.preventDefault();
        skipCurrentReader();
        break;

      case "KeyR":
        e.preventDefault();
        openModal("readers-modal");
        break;

      case "KeyT":
        e.preventDefault();
        openModal("paste-modal");
        break;

      case "Slash":
        if (e.shiftKey) { // '?' key
          e.preventDefault();
          openModal("shortcuts-modal");
        }
        break;

      case "Escape":
        // Close any open modals first
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
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

function setupEventListeners() {
  // Add reader form
  const addReaderBtn = document.getElementById("btn-add-reader");
  const readerInput = document.getElementById("input-new-reader-name");
  if (addReaderBtn && readerInput) {
    const handleAdd = () => {
      const names = readerInput.value.split(/[,;\n]+/);
      names.forEach(n => {
        if (n.trim()) addReader(n.trim());
      });
      readerInput.value = "";
    };
    addReaderBtn.onclick = handleAdd;
    readerInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdd();
      }
    };
  }

  // Paste text form submit
  const confirmLoadBtn = document.getElementById("btn-confirm-load-text");
  if (confirmLoadBtn) {
    confirmLoadBtn.onclick = () => {
      const textarea = document.getElementById("paste-input-text");
      const titleInput = document.getElementById("detected-title-input");
      const autoDetectToggle = document.getElementById("auto-detect-title-toggle");

      if (textarea && textarea.value.trim()) {
        const autoDetect = autoDetectToggle ? autoDetectToggle.checked : true;
        const parsed = parseRawText(textarea.value, autoDetect);
        
        // Use custom title if edited
        const finalTitle = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : parsed.title;
        
        state.title = finalTitle;
        state.paragraphs = parsed.paragraphs;
        state.currentIndex = 0;
        state.readerOffset = 0;
        
        saveToLocalStorage();
        closeModal("paste-modal");
        renderApp();
        scrollToActiveParagraph();
      }
    };
  }

  // Progress track click to scrub
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
}

// Utility: Escape HTML string to prevent injection
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
