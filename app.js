const STORAGE_KEY = "circuit_sprint_progress_v2";
const PENALTY_STORAGE_KEY = "circuit_sprint_penalty_v2";

// Persistent Penalty Timer State (Survives Browser Refreshes)
let penaltyEndTime = loadPenaltyState();
let penaltyInterval = null;

// Web Audio API Audio Playback Engine
let audioCtx = null;
let currentAudioNode = null;
let isAudioPlaying = false;
let audioTimer = null;
let audioElapsedTime = 0;
let currentPlayingPathwayId = null;
let currentPathwayId = null;
let currentQuestionIndex = 0;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Quick, Uplifting Cyber Synth Chime Jingle when an Album Play button is pressed
function playClickJingle() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Arpeggiated C-major 7th synth chime (C5, E5, G5, B5, C6)
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
    const duration = 0.07; // 70ms per note

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      gain.gain.setValueAtTime(0.15, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + duration);
    });
  } catch (e) {}
}

function stopAudioPlayback() {
  if (currentAudioNode && typeof currentAudioNode.stop === "function") {
    try { currentAudioNode.stop(); } catch (e) {}
    currentAudioNode = null;
  }
  if (audioTimer) {
    clearInterval(audioTimer);
    audioTimer = null;
  }

  const morseBtn = document.querySelector("#morsePlayBtn");
  if (morseBtn) morseBtn.classList.remove("playing-pulse");

  isAudioPlaying = false;
  audioElapsedTime = 0;
  currentPlayingPathwayId = null;
  updatePlayerBarAudioUI();
}

function toggleAudioPlayback(pathwayId = "flag-session") {
  if (isAudioPlaying) {
    stopAudioPlayback();
  } else {
    playPathwayAudio(pathwayId);
  }
}

// Slower Morse Code Audio Generator - Plays ONCE with Play Button Pulse (Inside Album Question)
function playMorseAudioSequence(morseStr = ".... . .-.. .-.. --- / .-- . . -.") {
  const ctx = getAudioContext();
  stopAudioPlayback();

  // Slower Tempo Morse Timing
  const dotDuration = 0.16;  // 160ms
  const dashDuration = 0.48; // 480ms
  const symbolPause = 0.16;  // 160ms
  const letterPause = 0.48;  // 480ms
  const wordPause = 1.0;     // 1000ms
  const frequency = 700;     // 700Hz Morse tone

  const startTime = ctx.currentTime + 0.05;
  let currentTime = startTime;
  const oscNodes = [];
  const animTimeouts = [];

  const tokens = morseStr.split(" ");
  tokens.forEach((token) => {
    if (token === "/") {
      currentTime += wordPause;
      return;
    }

    for (let i = 0; i < token.length; i++) {
      const char = token[i];
      const duration = char === "." ? dotDuration : char === "-" ? dashDuration : 0;
      
      if (duration > 0) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, currentTime);

        gain.gain.setValueAtTime(0.25, currentTime);
        gain.gain.setValueAtTime(0, currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(currentTime);
        osc.stop(currentTime + duration);

        oscNodes.push(osc);

        const startDelayMs = Math.max(0, Math.round((currentTime - ctx.currentTime) * 1000));
        const endDelayMs = Math.max(0, Math.round((currentTime + duration - ctx.currentTime) * 1000));

        const t1 = setTimeout(() => {
          const morseBtn = document.querySelector("#morsePlayBtn");
          if (morseBtn) morseBtn.classList.add("playing-pulse");
        }, startDelayMs);

        const t2 = setTimeout(() => {
          const morseBtn = document.querySelector("#morsePlayBtn");
          if (morseBtn) morseBtn.classList.remove("playing-pulse");
        }, endDelayMs);

        animTimeouts.push(t1, t2);

        currentTime += duration + symbolPause;
      }
    }
    currentTime += letterPause;
  });

  const totalDurationMs = Math.ceil((currentTime - ctx.currentTime) * 1000);

  currentAudioNode = {
    stop: () => {
      oscNodes.forEach((node) => {
        try { node.stop(); } catch (e) {}
      });
      animTimeouts.forEach((t) => clearTimeout(t));
      const morseBtn = document.querySelector("#morsePlayBtn");
      if (morseBtn) morseBtn.classList.remove("playing-pulse");
    }
  };

  isAudioPlaying = true;
  audioElapsedTime = 0;

  audioTimer = setInterval(() => {
    audioElapsedTime++;
    updatePlayerBarAudioUI("Morse Transmission Nocturne");
  }, 1000);

  // Stop playback cleanly when full sequence finishes
  setTimeout(() => {
    if (isAudioPlaying) {
      stopAudioPlayback();
    }
  }, totalDurationMs + 50);

  updatePlayerBarAudioUI("Morse Transmission Nocturne");
}

function playPathwayAudio(pathwayId = "flag-session", trackTitle = null) {
  playClickJingle();
  const ctx = getAudioContext();
  stopAudioPlayback();

  const pathway = pathways.find((p) => p.id === pathwayId) || pathways[3];
  currentPlayingPathwayId = pathway.id;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.15, ctx.currentTime);
  masterGain.connect(ctx.destination);

  // Distinct Signature Frequencies & Waveforms for Each Album (5s Max Jingle)
  const albumJingles = {
    "logic-grooves": {
      wave: "square",
      freqs: [261.63, 329.63, 392.00, 523.25, 659.25] // C-major techno arpeggio
    },
    "circuit-breaks": {
      wave: "sawtooth",
      freqs: [220.00, 277.18, 329.63, 440.00, 415.30] // Electric pulse glide
    },
    "code-cuts": {
      wave: "sine",
      freqs: [349.23, 440.00, 523.25, 698.46, 659.25] // Digital marimba melody
    },
    "flag-session": {
      wave: "sawtooth",
      freqs: [293.66, 369.99, 440.00, 587.33, 554.37] // Synthwave darkwave chord
    },
    "treasure-trails": {
      wave: "triangle",
      freqs: [196.00, 246.94, 293.66, 392.00, 369.99] // Majestic medieval fanfare
    }
  };

  const config = albumJingles[pathwayId] || albumJingles["flag-session"];

  let step = 0;
  const intervalId = setInterval(() => {
    if (!isAudioPlaying) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = config.wave;
    osc.frequency.setValueAtTime(config.freqs[step % config.freqs.length], ctx.currentTime);
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(ctx.currentTime + 0.24);

    step++;
  }, 220);

  currentAudioNode = {
    stop: () => clearInterval(intervalId)
  };

  isAudioPlaying = true;
  audioElapsedTime = 0;

  audioTimer = setInterval(() => {
    audioElapsedTime++;
    updatePlayerBarAudioUI(trackTitle || pathway.title);
    if (audioElapsedTime >= 5) { // Strict 5-second maximum jingle cap!
      stopAudioPlayback();
    }
  }, 1000);

  // Backup hard timeout at 5 seconds
  setTimeout(() => {
    if (isAudioPlaying && currentPlayingPathwayId === pathway.id) {
      stopAudioPlayback();
    }
  }, 5050);

  updatePlayerBarAudioUI(trackTitle || pathway.title);
}

function updatePlayerBarAudioUI(trackTitle = null) {
  const playBtn = document.querySelector("#playProgress");
  const playerMeta = document.querySelector(".player-meta");
  const nowPlayingSub = document.querySelector("#nowPlayingSubtitle");

  if (playBtn) {
    if (isAudioPlaying) {
      playBtn.classList.add("playing");
      playBtn.setAttribute("aria-label", "Pause audio");
    } else {
      playBtn.classList.remove("playing");
      playBtn.setAttribute("aria-label", "Play audio");
    }
  }

  if (playerMeta) {
    if (isAudioPlaying) {
      const mins = Math.floor(audioElapsedTime / 60);
      const secs = (audioElapsedTime % 60).toString().padStart(2, "0");
      playerMeta.innerHTML = `<span style="color: var(--green); font-weight: 700;">▶ ${mins}:${secs}</span>`;
    } else {
      playerMeta.textContent = "Library";
    }
  }

  if (nowPlayingSub && isAudioPlaying) {
    nowPlayingSub.innerHTML = `Playing Audio <span class="equalizer-bars"><span class="equalizer-bar"></span><span class="equalizer-bar"></span><span class="equalizer-bar"></span><span class="equalizer-bar"></span></span>`;
  }
}

function loadPenaltyState() {
  try {
    const stored = localStorage.getItem(PENALTY_STORAGE_KEY);
    if (!stored) return 0;
    const parsed = Number(stored);
    return isNaN(parsed) ? 0 : parsed;
  } catch (err) {
    return 0;
  }
}

function savePenaltyState(timeMs) {
  try {
    if (timeMs > Date.now()) {
      localStorage.setItem(PENALTY_STORAGE_KEY, timeMs.toString());
    } else {
      localStorage.removeItem(PENALTY_STORAGE_KEY);
    }
  } catch (err) {}
}

let penaltyTotalDurationMs = 30000;

function isPenaltyActive() {
  return Date.now() < penaltyEndTime;
}

function startPenaltyTimer(durationSeconds = 30) {
  penaltyTotalDurationMs = durationSeconds * 1000;
  penaltyEndTime = Date.now() + penaltyTotalDurationMs;
  savePenaltyState(penaltyEndTime);
  ensurePenaltyLoop();
}

function ensurePenaltyLoop() {
  if (isPenaltyActive()) {
    updatePenaltyDisplay();
    if (!penaltyInterval) {
      penaltyInterval = setInterval(updatePenaltyDisplay, 50);
    }
  } else if (penaltyInterval) {
    clearInterval(penaltyInterval);
    penaltyInterval = null;
  }
}

function updatePenaltyDisplay() {
  const remainingMs = penaltyEndTime - Date.now();
  const feedbackElem = document.querySelector("#activeQuestionSection .feedback");

  if (remainingMs > 0) {
    const remainingSec = Math.ceil(remainingMs / 1000);
    const secStr = remainingSec.toString().padStart(2, "0");
    const percent = Math.min(100, Math.max(0, (remainingMs / (penaltyTotalDurationMs || 30000)) * 100));

    if (feedbackElem) {
      feedbackElem.hidden = false;
      feedbackElem.style.removeProperty("color");

      let badgeWrap = feedbackElem.querySelector(".cooldown-badge-wrap");
      if (!badgeWrap) {
        feedbackElem.innerHTML = `
          <div class="cooldown-badge-wrap">
            <div class="cooldown-badge-header">
              <svg class="cooldown-lock-icon" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span class="cooldown-timer-text">SYSTEM COOLDOWN: ${secStr}s</span>
            </div>
            <div class="cooldown-progress-track">
              <div class="cooldown-progress-bar" style="width: ${percent.toFixed(2)}%;"></div>
            </div>
          </div>
        `;
      } else {
        const timerText = badgeWrap.querySelector(".cooldown-timer-text");
        const progressBar = badgeWrap.querySelector(".cooldown-progress-bar");
        if (timerText) timerText.textContent = `SYSTEM COOLDOWN: ${secStr}s`;
        if (progressBar) progressBar.style.width = `${percent.toFixed(2)}%`;
      }
    }

    document.querySelectorAll("#activeQuestionSection button, #activeQuestionSection input").forEach((el) => {
      el.disabled = true;
    });
  } else {
    savePenaltyState(0);
    if (penaltyInterval) {
      clearInterval(penaltyInterval);
      penaltyInterval = null;
    }
    if (feedbackElem) {
      feedbackElem.hidden = true;
      feedbackElem.innerHTML = "";
    }
    document.querySelectorAll("#activeQuestionSection button, #activeQuestionSection input").forEach((el) => {
      el.disabled = false;
    });
  }
}

// Anti-Inspection & DevTools Protection Logic
(function preventInspect() {
  // 1. Disable Right-Click Context Menu
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // 2. Block Inspect & Source Keyboard Shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S)
  document.addEventListener("keydown", (e) => {
    if (e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    const key = e.key ? e.key.toUpperCase() : "";
    if ((e.ctrlKey || e.metaKey) && (e.shiftKey ? ["I", "J", "C"].includes(key) : ["U", "S"].includes(key))) {
      e.preventDefault();
      return false;
    }
  });

  // 3. DevTools Anti-Debugging Execution Trap
  setInterval(() => {
    const startTime = performance.now();
    (function () {}).constructor("debugger")();
    const endTime = performance.now();
    if (endTime - startTime > 100) {
      document.body.innerHTML = "<div style='display:flex;justify-content:center;align-items:center;height:100vh;background:#000;color:#ff5a5f;font-family:sans-serif;font-weight:bold;font-size:1.5rem;'>Access Restricted</div>";
    }
  }, 100);
})();

const pathways = [
  {
    "id": "logic-grooves",
    "title": "Logic Grooves",
    "artist": "DJ Boolean & The De Morgans",
    "description": "Boolean gates, truth tables, and bit-level reasoning.",
    "accent": "#1ed760",
    "icon": "gates",
    "coverImage": "logic-cover.png",
    "coverZoom": "cover",
    "coverPosition": "center",
    "questions": [
      {
        "id": "logic-1",
        "title": "Bohemian Boolean",
        "prompt": "Simplify the Boolean expression: Y = (A + B)' + (A + B')'",
        "answer": [
          "a80c8a675a0e6f40d1c874ac945a365c65e2dfc5cf33d7b208a5a6ad98cfaaba",
          "5a0ff8a1be6b7db671f98e529dc6594ae99f13c048c5456e3856734436b78c42",
          "a80c8a675a0e6f40d1c874ac945a365c65e2dfc5cf33d7b208a5a6ad98cfaaba",
          "a80c8a675a0e6f40d1c874ac945a365c65e2dfc5cf33d7b208a5a6ad98cfaaba",
          "5a0ff8a1be6b7db671f98e529dc6594ae99f13c048c5456e3856734436b78c42"
        ],
        "points": 35
      },
      {
        "id": "logic-2",
        "title": "Stairway to Logic",
        "prompt": "Simplify the Boolean expression: Y = (A + B + C)(A + B + C')",
        "answer": [
          "300273daf0bb57c239f83585d71ced54ce6b3b5fb81615abbeeb3f9cf5fae92f",
          "cb23f6635a581786f970184faab1f816c87e8905847c510860baca4f63aa2619",
          "300273daf0bb57c239f83585d71ced54ce6b3b5fb81615abbeeb3f9cf5fae92f",
          "cb23f6635a581786f970184faab1f816c87e8905847c510860baca4f63aa2619",
          "276da98621f88f8c3665af380d00a23c218cab82148981648396ecdf5ab10646"
        ],
        "points": 35
      },
      {
        "id": "logic-3",
        "title": "Absorption Child O' Mine",
        "prompt": "Simplify the Boolean expression: Y = (A + B')(A' + B)(A + B)",
        "answer": [
          "fb8e20fc2e4c3f248c60c39bd652f3c1347298bb977b8b4d5903b85055620603",
          "afebecfe11e9b0578201aa259da18951bc51e3a3fc5a320e4cf6e3c41c904a9e",
          "15eb0a792505b1914ccd7f8d39a6b0f1985d86b37566faf73a589ea9e8454d8b",
          "2e7336dc8eba87ef472df568c35482abf2575dc3e5eac0c5c62b8ffaeac2c934",
          "c8687a08aa5d6ed2044328fa6a697ab8e96dc34291e8c2034ae8c38e6fcc6d65",
          "fb8e20fc2e4c3f248c60c39bd652f3c1347298bb977b8b4d5903b85055620603",
          "afebecfe11e9b0578201aa259da18951bc51e3a3fc5a320e4cf6e3c41c904a9e",
          "15eb0a792505b1914ccd7f8d39a6b0f1985d86b37566faf73a589ea9e8454d8b"
        ],
        "points": 35
      },
      {
        "id": "logic-4",
        "title": "Hotel Inversion",
        "prompt": "Simplify the Boolean expression: Y = ((AB + C')')'",
        "answer": [
          "0c0893b65d115fada2efbff44f4168f7189f3996036fa67879152511846a072a",
          "39285178d3444cf0c85d3c46cbb0e20327f95f24ff2714be17ba189bc6315a0f",
          "716a961476f7cb87734b0f046c2fa2782c0636665a7de460a2f2f18e73c75b25",
          "1d274ae72dd18a2441135b1664fe67ad94df78d49c9a10ab5d1648fc3d47fb98",
          "0c0893b65d115fada2efbff44f4168f7189f3996036fa67879152511846a072a",
          "39285178d3444cf0c85d3c46cbb0e20327f95f24ff2714be17ba189bc6315a0f"
        ],
        "points": 35
      },
      {
        "id": "logic-5",
        "title": "Smells Like XOR Spirit",
        "prompt": "Fill in the output column Y for the expression: Y = (A ⊕ B)C",
        "displayTruthTable": true,
        "answers": [
          [
            "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
          ],
          [
            "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
          ],
          [
            "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
          ],
          [
            "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b"
          ],
          [
            "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
          ],
          [
            "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b"
          ],
          [
            "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
          ],
          [
            "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
          ]
        ],
        "points": 35
      },
      {
        "id": "logic-6",
        "title": "Another Parity in the Wall",
        "prompt": "Find the simplified Boolean expression Y for the truth table below:",
        "displayTruthTableReadOnly": true,
        "truthTableData": [
          [
            "0",
            "0",
            "0",
            "0"
          ],
          [
            "0",
            "0",
            "1",
            "1"
          ],
          [
            "0",
            "1",
            "0",
            "0"
          ],
          [
            "0",
            "1",
            "1",
            "1"
          ],
          [
            "1",
            "0",
            "0",
            "1"
          ],
          [
            "1",
            "0",
            "1",
            "0"
          ],
          [
            "1",
            "1",
            "0",
            "1"
          ],
          [
            "1",
            "1",
            "1",
            "0"
          ]
        ],
        "answer": [
          "18713a5cf62cba8bf88d616b628176e7fa71a24393c8ac4509485446e0ff633c",
          "efc62beb693a50e2f5b6feefa4484d2f30a06d29bf9b231eb55b90ab309a6b33",
          "18713a5cf62cba8bf88d616b628176e7fa71a24393c8ac4509485446e0ff633c",
          "33b45a1fa9a68f6d85e8969da9a4f594b5347a32b835268eabca8fbc3d79d286",
          "33b45a1fa9a68f6d85e8969da9a4f594b5347a32b835268eabca8fbc3d79d286",
          "18713a5cf62cba8bf88d616b628176e7fa71a24393c8ac4509485446e0ff633c",
          "efc62beb693a50e2f5b6feefa4484d2f30a06d29bf9b231eb55b90ab309a6b33",
          "33b45a1fa9a68f6d85e8969da9a4f594b5347a32b835268eabca8fbc3d79d286",
          "3d7edde33628331676b39e19a3f2bdb3c583960ad8d865351a32e2ace7d8e02d",
          "d2efc2d5157346e613994ba838cc839fc8ea666994162ed0ab4b86eaa00b9eea"
        ],
        "points": 36
      }
    ]
  },
  {
    "id": "circuit-breaks",
    "title": "Circuit Breaks",
    "artist": "Resistor Resistance",
    "description": "Resistors, LEDs, power rails, and practical electronics.",
    "accent": "#4cc9f0",
    "icon": "circuit",
    "coverImage": "circuit-cover.png",
    "coverZoom": "cover",
    "coverPosition": "center",
    "questions": [
      {
        "id": "circuit-1",
        "title": "Under Voltage",
        "prompt": "Two 10 kΩ resistors are connected in series across a 10 V supply. What voltage in volts (V) is measured at the midpoint between the two resistors?",
        "answer": [
          "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
          "83bb6a011fa0667463a29560f6d0143b124f47d1f433885bada5d1ff0f532677",
          "b641ef14c435392513212ee826c91fbce1fa4d34f624d7e720587874d2a3540c",
          "7585c0c33fa45191f9d48206e847ed3f7a2f856890226388530165fb25d5be80"
        ],
        "points": 25
      },
      {
        "id": "circuit-2",
        "title": "Resistor in the Sky",
        "prompt": "A resistor has 4 color bands followed by a gold tolerance band: Yellow, Violet, Orange, Gold. What is its nominal resistance value in kilohms (kΩ)?",
        "answer": [
          "31489056e0916d59fe3add79e63f095af3ffb81604691f21cad442a85c7be617",
          "f707e5a262395da6ee9b75f4e7621e1f2c94051922aa6e8c115be72ce548da52",
          "67e888236d685cdbf4252f0c0fb72145b96a782b47652f17d69ae65a3bd1ea70",
          "0871dc36d071da08fbcbdec9b059d4fbc0f2289a5ad96cbd128e9dd855ffe10e",
          "0ef64799320c7f931737def7b9581e89529020c8c4a9595b3c4bfab954624429"
        ],
        "points": 25
      },
      {
        "id": "circuit-3",
        "title": "Analog Read Me Maybe",
        "prompt": "What built-in C++ function is used to read an analog input voltage on an Arduino?",
        "answer": [
          "7013b141655b2558d9bcdbac307c37a3778fd960fae0f1c006007037802f098a",
          "a1ea8463f7c295bf8428ecde634a7721f9a2f22f478e56997d359f6b98dac919",
          "7013b141655b2558d9bcdbac307c37a3778fd960fae0f1c006007037802f098a",
          "a1ea8463f7c295bf8428ecde634a7721f9a2f22f478e56997d359f6b98dac919"
        ],
        "points": 25
      },
      {
        "id": "circuit-4",
        "title": "Currentstruck",
        "prompt": "A resistor has 10 V across it and carries a current of 0.2 A. What is the power dissipated by the resistor in watts (W)?",
        "answer": [
          "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
          "7c1c5ee5c6a4dec209832011c36b43cdfdb105c27623dfa695e20cc03ec7b06d",
          "2befad5622b9dc1612bd60f611e48eb99ba0e16931ed1305657b2a44d7399872",
          "641ae49f8b882045e5a9298acbff70f0bcd3d1c31c607acd3f959ddd36ea1b66"
        ],
        "points": 25
      },
      {
        "id": "circuit-5",
        "title": "Comfortably Grounded",
        "prompt": "An ultrasonic distance sensor emits a pulse that reflects off an obstacle and returns in time duration t = 1000 µs. Given the speed of sound v = 0.034 cm/µs, calculate distance d in centimeters (cm) using: d = (v × t) / 2",
        "answer": [
          "4523540f1504cd17100c4835e85b7eefd49911580f8efff0599a8f283be6b9e3",
          "093b8c1c1bada400c227a898aec4d85e564734a43798bcf69caf3fa6b91e33f6",
          "9b7d31dd691488bb809fd7f449ac05b4b4eb3f4005d38ab8ad4aa7dad3cf4f56"
        ],
        "points": 25
      },
      {
        "id": "circuit-6",
        "title": "Silicon Haze",
        "prompt": "How many dedicated GND (Ground) header pins are present across the power and digital pin headers of a standard Arduino Uno board?",
        "answer": [
          "4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
          "775b0a938d2644c1cae27c43ea65a3eb48e8dbe25627de7925243fcc1ed3cd4b",
          "8b5b9db0c13db24256c829aa364aa90c6d2eba318b9232a4ab9313b954d3555f"
        ],
        "points": 25
      },
      {
        "id": "circuit-7",
        "title": "Born to Loop",
        "prompt": "An LED is connected to Arduino pin 8 through a 220 Ω resistor. The LED's cathode is connected to pin 8, and its anode is connected to +5 V. Fill in the blank to light up the LED:\n\ndigitalWrite(8, ******);",
        "answer": [
          "6c1ff09db3a73dc4a854f695d20d174a848d55f2d743bab2ee1f8fc75be454f3",
          "6c1ff09db3a73dc4a854f695d20d174a848d55f2d743bab2ee1f8fc75be454f3",
          "5feceb66ffc86f38d952786c6d696c79c2dbc239dd4e91b46729d73a27fb57e9"
        ],
        "points": 25
      },
      {
        "id": "circuit-8",
        "title": "Bitwise Jean",
        "prompt": "An Arduino Uno features a 10-bit ADC. What is the maximum integer value returned by calling analogRead()?",
        "answer": [
          "6629ddae3736e894e89cb4a1300a9d2c5c0fad418f8ea06a341b81f2a98bb491"
        ],
        "points": 25
      }
    ]
  },
  {
    "id": "code-cuts",
    "title": "Code Cuts",
    "artist": "Stack Orchestra",
    "description": "Embedded loops, pin states, and C/Python output prediction challenges.",
    "accent": "#ffd166",
    "icon": "code",
    "coverImage": "code-cover.png",
    "coverZoom": "cover",
    "coverPosition": "center",
    "questions": [
      {
        "id": "code-1",
        "title": "Increment Dreams",
        "prompt": "Predict the output of the C code snippet:\n\n#include <stdio.h>\n\nint main() {\n    int x = 4;\n    printf(\"%d\\n\", x++);\n    printf(\"%d\\n\", ++x);\n    return 0;\n}",
        "multipleOutputs": [
          {
            "label": "Output 1",
            "answer": [
              "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a"
            ]
          },
          {
            "label": "Output 2",
            "answer": [
              "e7f6c011776e8db7cd330b54174fd76f7d0216b612387a5ffcfb81e6f0919683"
            ]
          }
        ],
        "points": 25
      },
      {
        "id": "code-2",
        "title": "Single Equals Like You",
        "prompt": "Predict the output of the C code snippet:\n\n#include <stdio.h>\n\nint main() {\n    int a = 10;\n\n    if (a = 5)\n        printf(\"YES\");\n    else\n        printf(\"NO\");\n\n    return 0;\n}",
        "answer": [
          "8a798890fe93817163b10b5f7bd2ca4d25d84c52739a645a889c173eee7d9d3d",
          "8a798890fe93817163b10b5f7bd2ca4d25d84c52739a645a889c173eee7d9d3d"
        ],
        "points": 25
      },
      {
        "id": "code-3",
        "title": "Don't Stop Believin' (in Exponents)",
        "prompt": "What is printed by this Python snippet?\n\na = 3\nb = 4\nc = 2\n\nprint(a + b * c ** 2)",
        "answer": [
          "9400f1b21cb527d7fa3d3eabba93557a18ebe7a2ca4e471cfe5e4c5b4ca7f767"
        ],
        "points": 25
      },
      {
        "id": "code-4",
        "title": "Shape of Division",
        "prompt": "Predict the output of the C code snippet:\n\n#include <stdio.h>\n\nint main() {\n    int x = 7;\n    int y = 3;\n\n    printf(\"%d\\n\", x * y + x / y);\n    return 0;\n}",
        "answer": [
          "535fa30d7e25dd8a49f1536779734ec8286108d115da5045d77f3b4185d8f790"
        ],
        "points": 25
      },
      {
        "id": "code-5",
        "title": "Uptown Double Slash",
        "prompt": "What is printed by this Python snippet?\n\nx = 2\n\nprint((x + 3) * (x ** 3 - 1) // 5)",
        "answer": [
          "7902699be42c8a8e46fbbb4501726517e86b22c56a189f7625a6da49081b2451"
        ],
        "points": 25
      },
      {
        "id": "code-6",
        "title": "Looping in the Dark",
        "prompt": "What value of x is printed after executing this Python loop?\n\nx = 3\n\nfor i in range(1, 5):\n    x = x * 2 - i\n\nprint(x)",
        "answer": [
          "785f3ec7eb32f30b90cd0fcf3657d388b5ff4297f2f9716ff66e9b69c05ddd09"
        ],
        "points": 25
      },
      {
        "id": "code-7",
        "title": "Boolean Rhapsody",
        "prompt": "What boolean values are printed by this Python snippet?\n\na = False\nb = True\nc = False\n\nprint(a or b and c)\nprint((a or b) and c)",
        "multipleOutputs": [
          {
            "label": "Output 1",
            "answer": [
              "fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa"
            ]
          },
          {
            "label": "Output 2",
            "answer": [
              "fcbcf165908dd18a9e49f7ff27810176db8e9f63b4352213741664245224f8aa"
            ]
          }
        ],
        "points": 25
      },
      {
        "id": "code-8",
        "title": "Take On Truth",
        "prompt": "What boolean output is printed by this Python snippet?\n\nx = 7\ny = 4\nz = 10\n\nprint((x > y and z < 20) or not (x + y == z))",
        "answer": [
          "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
          "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b"
        ],
        "points": 25
      }
    ]
  },
  {
    "id": "flag-session",
    "title": "Flag Session",
    "artist": "Base64 Battalion",
    "description": "Decoding, base conversions, and hidden string flags.",
    "accent": "#ff4fd8",
    "icon": "flag",
    "coverImage": "flag-cover.png",
    "coverZoom": "cover",
    "coverPosition": "center",
    "questions": [
      {
        "id": "flag-caesar",
        "title": "Caesar's Cipher O' Mine",
        "prompt": "A Roman general flanks his enemies by shifting his soldiers 3 positions to the right. Mid-battle, his messenger drops an encoded scroll in the mud:\n\nDWWDFN WKH HQHPB DW GDZQ\n\nFind the general's lost message.",
        "answer": [
          "d15e38c8ef2c38aa569175a1e2bc9ed9bb6de772c0a5933524d1f60ddb297666",
          "38e9b614384ab541ec90b4cafdd5cfaaefda04399fbf5313a05982a91c5da0a7"
        ],
        "points": 35
      },
      {
        "id": "flag-binary-add",
        "title": "Binary Add It",
        "prompt": "Add the following binary numbers together, then convert the sum to decimal:\n\n1001011110101₂ + 110110101011₂",
        "answer": [
          "584f719804cbb166c42754a65f12a9fdae0e79cbcaabb1f7c90dc1c56c926484"
        ],
        "points": 35
      },
      {
        "id": "flag-2",
        "title": "Hex on Fire",
        "prompt": "Convert hex 0x9FC to binary and decimal.",
        "multipleOutputs": [
          {
            "label": "Binary",
            "answer": [
              "c2ce1c4d177611726b87d7f5a4cddc0e00046230560df2b1cb76f48d499a13d3",
              "05026ecf240c6cdd70a30d5983dd24a4958f083ae5048736ff229b257ece25f7"
            ]
          },
          {
            "label": "Decimal",
            "answer": [
              "213f6505c6c2a611fa8acf9e714cbb3037f19a2908adc6f77c7c795e04f8b733"
            ]
          }
        ],
        "points": 35
      },
      {
        "id": "flag-hex-vault",
        "title": "Welcome to the Hex Vault",
        "prompt": "0xBEE",
        "answer": [
          "59712c920a3cc7ca6887718c0dc5124b1f3e47b57d04e9e0ec9186e6d0a62f6b"
        ],
        "isHexVaultQuestion": true,
        "points": 35
      },
      {
        "id": "flag-morse",
        "title": "Radioactive Morse",
        "prompt": "Listen closely to the audio transmission from the play button above.\n\nWhat phrase is being transmitted?",
        "answer": [
          "a953ffa321fc2e75cb73436ea874a8a5dcb1e297705ff8a84c368cd9dfff56bd",
          "0d79cf42411c64170c5026c9acd54e1eb50ef521cc262087b4666c22c479b6b2",
          "36fe2c56b051d15fa8d43f5aa25019aafe566caf208c9fbe31fd4f9207d8f79c",
          "72132ce3f7003efb15dc127d7bbc7af8daa2d5a7c030f6fa9db6cc80cf74c2eb"
        ],
        "isMorseQuestion": true,
        "morseCode": ".... . .-.. .-.. --- / .-- . . -.",
        "points": 37
      },
      {
        "id": "flag-5",
        "title": "Sweet Dreams of XOR",
        "prompt": "XOR 1100 with 1010. What is the 4-bit binary result?",
        "answer": [
          "a5c3dd48facf21ed5f916d0ae979091fead570e6aea6c1d8038d1f68b26fa51f",
          "9bdb2af6799204a299c603994b8e400e4b1fd625efdb74066cc869fee42c9df3"
        ],
        "points": 35
      }
    ]
  },
  {
    "id": "treasure-trails",
    "title": "Treasure Trails",
    "artist": "Sir Vibesalot",
    "description": "Treasure Hunt: Collect all key words from around the castle to unlock the final passcode vault.",
    "accent": "#a78bfa",
    "icon": "key",
    "coverImage": "treasure-cover.png",
    "unlockThreshold": 500,
    "questions": [
      {
        "id": "treasure-1",
        "title": "Eye of the Passcode",
        "prompt": "Collect all the key words from around the castle to assemble the passcode! Descend to the castle's lowest halls where the coldest spring grants relief to the passing traveller.",
        "answer": [
          "e80525d6776526c947ead7f6a8f2c5b08bf7178e63fab24a036e1449eb48ae8b",
          "732c7a79b66817e36017bc2bb019e9fa1f9ec3ca3f1d50b6ee3900c3d8f11b04",
          "a12892d7a2a6c27403e492bb2408ac68977e5f9abd4f30a60118f5edb70087d2",
          "e49cfd14f90d43082e5204253cf310a399bcab21051d0a5082cc4a5fab053504"
        ],
        "points": 200
      }
    ]
  },
  {
    "id": "deluxe-1",
    "title": "Logic Gate Symphony",
    "artist": "VIP Master Series",
    "description": "Exclusive Tier 1 Deluxe Challenge: Multi-stage gate networks, cascaded parity, and wire fault analysis.",
    "accent": "#ffd166",
    "icon": "gates",
    "coverImage": "deluxe1-cover.png",
    "coverZoom": "cover",
    "coverPosition": "center",
    "unlockThreshold": 350,
    "isDeluxe": true,
    "questions": [
      {
        "id": "deluxe1-1",
        "title": "Seven Nation Network",
        "prompt": "A 3-level logic gate network has inputs A, B, C, D. An XOR gate takes (A, B). A NOR gate takes (C, D). The outputs of both gates feed into a final NAND gate. Which Boolean expression matches this circuit output Y?",
        "answer": [
          "9c0a919d7460437a564a3872be1f257fe60d24bced2542c33154d3bd8eaed5e2",
          "ed5fff6f249ee633bd53e09a0f1919e4f21a68df0c31ff2676f43d34a901f558",
          "e6fd7592638936c70ba23d6c0d2b3390aa61a46b2793701387e796a79ad7af6f",
          "23fc47125660b491115aa61913ad557795eff3479400f337bbc13c804af25ef4",
          "9c0a919d7460437a564a3872be1f257fe60d24bced2542c33154d3bd8eaed5e2",
          "5b12f0452b1a525c311c02b2eeb15db807e358d6c9d594a0620e8da56da6a440"
        ],
        "points": 35
      },
      {
        "id": "deluxe1-2",
        "title": "Parity Like It's 1999",
        "prompt": "A 3-bit odd parity generator circuit (Output Y = 1 when total number of 1s in A, B, C is odd) uses two 2-input logic gates in series: Gate 1 takes (A, B), and Gate 2 takes (Output of Gate 1, C). An engineer mistakenly used an XNOR gate for Gate 2 instead of an XOR gate. Which single gate is incorrect?",
        "answer": [
          "1fcc83b56d040ef95baae2733904c58a22bb4a843c21d770a6092d9995affd05",
          "1fcc83b56d040ef95baae2733904c58a22bb4a843c21d770a6092d9995affd05",
          "30fca33be638a1cd277cb2b1f4b1ad68fda0d0ec4bc8bae17a0b95065502bc8a",
          "abac4a98c3ffdd4904f673ca142010f42e8c2308f8c449f6ddda10275394bfe6",
          "2617153e89b513344586a4b55718aafdcb334a5060640d8f064356e81095cf1a",
          "66dc24ad7ed3d772af661944ca6ef66577a343f2b365fc2eebaad02b50154ded"
        ],
        "points": 35
      },
      {
        "id": "deluxe1-3",
        "title": "Highway to MUX",
        "prompt": "In an active-high 4-to-1 Multiplexer with Select lines (S1, S0) driving 4 internal AND gates, an engineer wants to route Input I2 (binary 10) to output when S1=1, S0=0. However, Gate 2 receives (I2, S1, S0) instead of (I2, S1, S0'). Which one select wire (S1 or S0) is connected directly without an inverter, causing the wrong selection?",
        "answer": [
          "ec18eac8d758b1eba52d3c10d39adc6dd9806472cb4ae069635d383d9086a513",
          "ec18eac8d758b1eba52d3c10d39adc6dd9806472cb4ae069635d383d9086a513",
          "33c6ef9aff2adfc031cd35b7da4f9bbd625173e5f1f768d4006299c7707e7f0b",
          "a5e61632da9b504433c619079da57acde6bd4082aa4ff330cebdaee2eb49166f",
          "8e2117dd78fa0caac03acf61b30ba9902efeee4e040f4e8e87319b5ad077864e"
        ],
        "points": 35
      },
      {
        "id": "deluxe1-4",
        "title": "Livin' on a Combinational",
        "prompt": "Consider a 4-input logic function Y = (A · B)' · (C ⊕ D). Out of all 16 possible 4-bit binary input combinations (ABCD), how many input combinations produce a HIGH (1) output?",
        "answer": [
          "e7f6c011776e8db7cd330b54174fd76f7d0216b612387a5ffcfb81e6f0919683"
        ],
        "points": 35
      },
      {
        "id": "deluxe1-5",
        "title": "Masked Variable in the Dark",
        "prompt": "Evaluate the 4-input Boolean function: Y = A · B + A · B' + (C ⊕ C') · D · 0. Simplifying this circuit shows one or more inputs are completely masked. Which input (A, B, C, or D) has no effect on the output?",
        "answer": [
          "3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d",
          "3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d",
          "2e7d2c03a9507ae265ecf5b5356885a53393a2029d241394997265a1a25aefc6",
          "2e7d2c03a9507ae265ecf5b5356885a53393a2029d241394997265a1a25aefc6",
          "18ac3e7343f016890c510e93f935261169d9e3f565436429830faf0934f4f8e4",
          "18ac3e7343f016890c510e93f935261169d9e3f565436429830faf0934f4f8e4",
          "3682bf62a03a00cc8be0dc8c722eee8e2ce09524cd9b1513c55d6fce5a0f5324"
        ],
        "points": 35
      },
      {
        "id": "deluxe1-6",
        "title": "Ignition (Remix Vector)",
        "prompt": "An active-high emergency beacon LED is driven by Y = (A · B) + (C · D'). Which 4-bit binary input vector (ABCD) with A=1, B=1, C=0, D=1 is guaranteed to turn the LED ON?",
        "answer": [
          "36ab771eba23f49d7ae43af88c601f3de8fccb201250906a4085444ae765f2db",
          "9fd08a6089a92f82c12ec15a466c09339c67a9759e9b95bc52db4644f90b60c5",
          "d8dd9291e787a3c6af09f6620c436bcc4924bce977d7a4601078b62709ec1408"
        ],
        "points": 35
      }
    ]
  },
  {
    "id": "deluxe-2",
    "title": "Logic Circuit Suite",
    "artist": "VIP Master Series",
    "description": "Exclusive Tier 2 Deluxe Challenge: Ripple carry delays, priority encoders, synchronous counters, and SR latch hazards.",
    "accent": "#ff4fd8",
    "icon": "circuit",
    "coverImage": "deluxe2-cover.png",
    "coverZoom": "cover",
    "coverPosition": "center",
    "unlockThreshold": 750,
    "isDeluxe": true,
    "questions": [
      {
        "id": "deluxe2-1",
        "title": "Ripple Carry in the Deep",
        "prompt": "A 4-bit Ripple Carry Adder consists of 4 cascaded Full Adders. If each Full Adder has a propagation delay of 12 nanoseconds (ns) for the carry signal to stabilize, what is the total worst-case propagation delay in nanoseconds (ns) for the final Carry-Out to stabilize?",
        "answer": [
          "98010bd9270f9b100b6214a21754fd33bdc8d41b2bc9f9dd16ff54d3c34ffd71",
          "a688d50ac070d04df73ffb168a36d5084d60759be2eda18656db53d1b1640650",
          "a87d27c38ad8f455de84777d282d656b72b9f49bccdaf33d0d8f5c1fbe0fe40b"
        ],
        "points": 40
      },
      {
        "id": "deluxe2-2",
        "title": "Encoder of the Night",
        "prompt": "A 4-to-2 Priority Encoder receives active-high inputs (D3, D2, D1, D0) where D3 has highest priority. If the input vector is D3=0, D2=1, D1=1, D0=1, what 2-bit binary output (Y1 Y0) will the encoder produce?",
        "answer": [
          "4a44dc15364204a80fe80e9039455cc1608281820fe2b24f1e5233ade6af1dd5",
          "a6388de74e5670c0eaa120a0da18b98f80e65e1d95abbbea3e859a60fefd7acb",
          "8fad34bbb0c1ed095fbf1b50cb0e48785a030d5af68dc1a4957cbb583c3c1e5a"
        ],
        "points": 40
      },
      {
        "id": "deluxe2-3",
        "title": "Count On Me",
        "prompt": "A 3-bit modulo-8 binary up-counter is initialized at state 101₂ (decimal 5). After 4 active clock pulses, what is the 3-bit binary state of the counter?",
        "answer": [
          "7a3e6b16cb75f48fb897eff3ae732f3154f6d203b53f33660f01b4c3b6bc2df9",
          "2aa2dd5bb3c6a37be969d98fbd47cd085b1f78d52403b970176271d779ebb2f6",
          "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b"
        ],
        "points": 40
      },
      {
        "id": "deluxe2-4",
        "title": "Latch Me If You Can",
        "prompt": "In an active-HIGH NOR-based SR Latch, what binary input combination (S, R) causes an unstable / invalid forbidden state where both Q and Q' outputs are forced to 0?",
        "answer": [
          "4fc82b26aecb47d2868c4efbe3581732a3e7cbcc6c2efb32062c08170a05eeb8",
          "2ec20c6a0b51bc2f76547894811ae93ca79746f157ed9cc882b0a23984e0eed0",
          "28af97a6014e78031377adee6757c19213d8dd936ba57c005747019757e1f3b4",
          "03ebfc2d40db30128bccfcea3aa3e32abd00335d2054f06631f31fe711a3be58",
          "020a7c91e30725bb191818987340dec6040aff93923840de685e1e1d7b3d071a"
        ],
        "points": 40
      }
    ]
  },
  {
    "id": "deluxe-3",
    "title": "Arduino Circuit Sessions",
    "artist": "VIP Master Series",
    "description": "Exclusive Tier 3 Deluxe Challenge: Timer prescalers, SPI protocols, ADC quantum steps, and ISR vectors.",
    "accent": "#4cc9f0",
    "icon": "code",
    "coverImage": "deluxe3-cover.png",
    "coverZoom": "cover",
    "coverPosition": "center",
    "unlockThreshold": 1023,
    "isDeluxe": true,
    "questions": [
      {
        "id": "deluxe3-1",
        "title": "Time After Prescaler",
        "prompt": "An Arduino Uno runs at a system clock frequency of 16 MHz. Timer1 is configured with a prescaler of 64. What is the timer counter tick frequency in kilohertz (kHz)?",
        "answer": [
          "1e472b39b105d349bcd069c4a711b44a2fffb8e274714bb07ecfff69a9a7f67b",
          "6029e1fe198f07f7f9ed96bf194db620dc0fed8792a848034e83d80802d2f323",
          "5e2ea5e97182c28d1d326a5504ffe50e711e4fbb250bd2ea25eb5686dc45d828"
        ],
        "points": 45
      },
      {
        "id": "deluxe3-2",
        "title": "Master of Signals",
        "prompt": "An Arduino communicates with an SD card module via SPI protocol. Which pin line transmits data from Arduino Master to the Slave device: MOSI or MISO?",
        "answer": [
          "43c32458f48b0a4949db9583fbaa1d799d8b9a1708dffe7044a32fdb308d54b8",
          "43c32458f48b0a4949db9583fbaa1d799d8b9a1708dffe7044a32fdb308d54b8"
        ],
        "points": 45
      },
      {
        "id": "deluxe3-3",
        "title": "Quantum Step O' Mine",
        "prompt": "A 10-bit ADC on a 5.0V Arduino reference reads an analog sensor output. What is the voltage resolution (voltage per step) in millivolts (mV)? (Round to 2 decimal places)",
        "answer": [
          "789578fecdf3bf425f5fe059e67372282f0b1b4c40c2dc9a40a7ee9cfa435f47",
          "38f71394b7e5bf51df4ce9fc6c5a0bfc5c89865061d52e4b98806fde85083464",
          "2bf254528361eeb65675bde0ae521c38b865bda332ec66f4e0496d377a1396d9",
          "470ec1d1b1d728ee08264ab91c824270f47dca29beb2ccc1808be206d9c5a9eb"
        ],
        "points": 45
      },
      {
        "id": "deluxe3-4",
        "title": "Interrupt the Silence",
        "prompt": "On an Arduino Uno (ATmega328P), which external interrupt pin corresponds to INT0: Digital Pin 2 or Digital Pin 3?",
        "answer": [
          "d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
          "2a21a5a32e0147fbb5cffdd727229a374ffc8bab85f9b947a799841d947d705a",
          "b2951eb2397bb3933ceab5c4556511e09d4c6413fb8f3a28ba3b85ca8957c6b4",
          "b2951eb2397bb3933ceab5c4556511e09d4c6413fb8f3a28ba3b85ca8957c6b4"
        ],
        "points": 45
      }
    ]
  }
];

const deluxeAlbums = [
  {
    id: "deluxe-1",
    title: "Logic Gate Symphony",
    artist: "VIP Master Series",
    description: "Exclusive Tier 1 Deluxe Challenge: Unlocked at 350 total points.",
    pointsRequired: 350,
    accent: "#ffd166",
    coverImage: "deluxe1-cover.png",
    link: "#/pathway/deluxe-1"
  },
  {
    id: "deluxe-2",
    title: "Logic Circuit Suite",
    artist: "VIP Master Series",
    description: "Exclusive Tier 2 Deluxe Challenge: Unlocked at 750 total points.",
    pointsRequired: 750,
    accent: "#ff4fd8",
    coverImage: "deluxe2-cover.png",
    link: "#/pathway/deluxe-2"
  },
  {
    id: "deluxe-3",
    title: "Arduino Circuit Sessions",
    artist: "VIP Master Series",
    description: "Exclusive Tier 3 Deluxe Challenge: Unlocked at 1023 total points.",
    pointsRequired: 1023,
    accent: "#4cc9f0",
    coverImage: "deluxe3-cover.png",
    link: "#/pathway/deluxe-3"
  }
];

function loadProgress() {
  const defaults = { solved: {}, awarded: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      solved: parsed.solved || {},
      awarded: parsed.awarded || {}
    };
  } catch (error) {
    return defaults;
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

const progress = loadProgress();

function syncAwardedPoints() {
  pathways.forEach((pathway) => {
    pathway.questions.forEach((q) => {
      if (progress.solved[q.id]) {
        progress.awarded[q.id] = q.points || 0;
      }
    });
  });
}
syncAwardedPoints();

function totalPoints() {
  let total = 0;
  pathways.forEach((pathway) => {
    pathway.questions.forEach((q) => {
      if (progress.solved[q.id]) {
        total += (q.points || 0);
      }
    });
  });
  return total;
}

function getMaxPoints() {
  return pathways
    .filter((pathway) => !pathway.isDeluxe)
    .reduce((total, pathway) => {
      return total + pathway.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    }, 0);
}

function isQuestionSolved(questionId) {
  return Boolean(progress.solved[questionId]);
}

function isQuestionLocked(pathway, questionIndex) {
  if (questionIndex === 0) return false;
  const previousQuestion = pathway.questions[questionIndex - 1];
  return !isQuestionSolved(previousQuestion.id);
}

function getLatestQuestionIndex(pathway) {
  if (!pathway || !pathway.questions || pathway.questions.length === 0) return 0;
  const firstUnsolvedIdx = pathway.questions.findIndex((q) => !isQuestionSolved(q.id));
  if (firstUnsolvedIdx !== -1) {
    return firstUnsolvedIdx;
  }
  return pathway.questions.length - 1;
}

function getAlbumCoverStyle(pathway) {
  if (pathway.coverImage) {
    const zoom = pathway.coverZoom || "cover";
    const pos = pathway.coverPosition || "center";
    return `url('${pathway.coverImage}') ${pos} / ${zoom} no-repeat`;
  }
  return `linear-gradient(135deg, rgba(255, 255, 255, 0.34), transparent 36%), ${pathway.accent}`;
}

// Confetti burst origin centered directly over Check button
function triggerConfetti(originElem) {
  const container = document.createElement("div");
  container.className = "confetti-container";
  document.body.appendChild(container);

  let rect = { left: window.innerWidth / 2, top: window.innerHeight / 3 };
  if (originElem && typeof originElem.getBoundingClientRect === "function") {
    const r = originElem.getBoundingClientRect();
    rect = { left: r.left + r.width / 2, top: r.top + r.height / 2 };
  }

  const colors = ["#1ed760", "#4cc9f0", "#ff4fd8", "#ffd166", "#a855f7", "#3b82f6", "#ffffff"];
  const particleCount = 45;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("span");
    particle.className = "confetti-particle";
    
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.floor(Math.random() * 6) + 6;
    const isCircle = Math.random() > 0.5;

    particle.style.width = `${size}px`;
    particle.style.height = `${isCircle ? size : Math.round(size * 0.6)}px`;
    particle.style.borderRadius = isCircle ? "50%" : "2px";
    particle.style.backgroundColor = color;
    particle.style.left = `${rect.left}px`;
    particle.style.top = `${rect.top}px`;

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 180 + 60;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance + Math.random() * 80 + 40;
    const rot = (Math.random() - 0.5) * 720;

    particle.style.setProperty("--dx", `${dx}px`);
    particle.style.setProperty("--dy", `${dy}px`);
    particle.style.setProperty("--rot", `${rot}deg`);
    particle.style.animationDelay = `${Math.random() * 0.15}s`;

    container.appendChild(particle);
  }

  setTimeout(() => {
    container.remove();
  }, 1800);
}

function renderScore() {
  const pts = totalPoints();
  const maxPts = getMaxPoints();

  document.querySelector("#totalPoints").textContent = pts;
  document.querySelector("#maxPoints").textContent = `/${maxPts}`;

  const fill = document.querySelector("#topProgressFill");
  const percent = maxPts > 0 ? (pts / maxPts) : 0;
  fill.style.setProperty("--progress-scale", percent);
}

function renderNowPlaying(activePathwayId = null) {
  const title = document.querySelector("#nowPlayingTitle");
  const subtitle = document.querySelector("#nowPlayingSubtitle");
  const cover = document.querySelector(".mini-cover");

  const pathway = pathways.find((item) => item.id === activePathwayId);
  if (!pathway) {
    title.innerHTML = 'Circuit Sprint<span class="title-dot">.</span>';
    subtitle.textContent = "Select an album to play";
    cover.style.removeProperty("background");
    return;
  }

  title.textContent = pathway.title;
  subtitle.textContent = `${pathway.artist} \u2022 Album`;
  if (pathway.coverImage) {
    cover.style.background = getAlbumCoverStyle(pathway);
  } else {
    cover.style.background = pathway.accent;
  }
}

function renderHome() {
  const app = document.querySelector("#app");
  app.replaceChildren(document.querySelector("#homeTemplate").content.cloneNode(true));

  const pathwayGrid = document.querySelector("#pathwayGrid");
  const pathwayFragment = document.createDocumentFragment();

  pathways.filter((pathway) => !pathway.isDeluxe).forEach((pathway) => {
    const solvedCount = pathway.questions.filter((q) => isQuestionSolved(q.id)).length;
    const totalCount = pathway.questions.length;
    const earnedPts = pathway.questions
      .filter((q) => isQuestionSolved(q.id))
      .reduce((sum, q) => sum + (q.points || 0), 0);
    const maxAlbumPts = pathway.questions.reduce((sum, q) => sum + (q.points || 0), 0);
    const isLocked = pathway.unlockThreshold && totalPoints() < pathway.unlockThreshold;

    const card = document.createElement(isLocked ? "div" : "a");
    card.className = `pathway-card ${isLocked ? "locked" : ""}`;
    if (!isLocked) {
      card.href = `#/pathway/${pathway.id}`;
    }

    // Play buttons on home cards are decorative only
    card.innerHTML = `
      <div class="album-art" style="background: ${getAlbumCoverStyle(pathway)};">
        <div class="play-hover-btn"></div>
      </div>
      <div class="album-copy">
        <h3>${pathway.title}</h3>
      </div>
      <div class="card-meta">
        <span class="tag">${solvedCount}/${totalCount} solved</span>
        <span class="tag ${isLocked ? "locked-tag" : "alt"}">${isLocked ? `Locked — ${pathway.unlockThreshold} pts` : "Play"}</span>
      </div>
      <div class="card-points-earned">
        <strong>${earnedPts}</strong> / ${maxAlbumPts} pts earned
      </div>
    `;

    pathwayFragment.appendChild(card);
  });
  pathwayGrid.appendChild(pathwayFragment);
}

function renderDeluxe() {
  const app = document.querySelector("#app");
  app.replaceChildren(document.querySelector("#deluxeTemplate").content.cloneNode(true));

  const deluxeGrid = document.querySelector("#deluxeGrid");
  const fragment = document.createDocumentFragment();
  const currentPts = totalPoints();

  deluxeAlbums.forEach((album) => {
    const isUnlocked = currentPts >= album.pointsRequired;
    const card = document.createElement(isUnlocked ? "a" : "div");
    card.className = `pathway-card deluxe-box-card ${isUnlocked ? "unlocked" : "locked"}`;
    if (isUnlocked && album.link && album.link !== "#") {
      card.href = album.link;
    }

    // Play buttons on deluxe cards are decorative only
    card.innerHTML = `
      <div class="album-art deluxe-art-container">
        <div class="deluxe-cover-img" style="background: url('${album.coverImage}') center / cover no-repeat;"></div>
        ${isUnlocked ? `<div class="play-hover-btn"></div>` : `<div class="album-cage-overlay" aria-label="Locked inside cage"></div>`}
      </div>
      <div class="album-copy">
        <h3>${album.title}</h3>
      </div>
      <div class="card-meta">
        <span class="tag">${album.artist}</span>
        <span class="tag ${isUnlocked ? "alt" : ""}">${album.pointsRequired} pts</span>
      </div>
      <div class="card-points-earned">
        ${
          isUnlocked
            ? `<span style="color: var(--green); font-weight: 800;">Unlocked — Play -></span>`
            : `<span style="color: var(--muted); font-weight: 600;">Earn <strong>${album.pointsRequired - currentPts}</strong> more pts to unlock cage</span>`
        }
      </div>
    `;

    fragment.appendChild(card);
  });

  deluxeGrid.appendChild(fragment);
}

function renderPathway(pathwayId, activeQuestionIndex = null) {
  const pathway = pathways.find((p) => p.id === pathwayId);
  if (!pathway) {
    location.hash = "#/";
    return;
  }

  // Silent Guard: Prevent opening pathway if points < unlockThreshold
  if (pathway.unlockThreshold && totalPoints() < pathway.unlockThreshold) {
    location.hash = "#/";
    return;
  }

  if (activeQuestionIndex === null || activeQuestionIndex === undefined) {
    activeQuestionIndex = getLatestQuestionIndex(pathway);
  }

  const app = document.querySelector("#app");
  app.replaceChildren(document.querySelector("#pathwayTemplate").content.cloneNode(true));
  renderScore();
  renderNowPlaying(pathway.id);

  const titleElem = document.querySelector("#pathwayTitle");
  const descElem = document.querySelector("#pathwayDescription");
  const metaSub = document.querySelector("#pathwayMetaSub");
  const artContainer = document.querySelector("#pathwayArtContainer");

  titleElem.textContent = pathway.title;
  descElem.textContent = pathway.description;
  metaSub.textContent = `${pathway.artist} • ${pathway.questions.length} tracks`;
  artContainer.style.background = getAlbumCoverStyle(pathway);

  const mainPlayBtn = document.querySelector(".main-play-btn");
  mainPlayBtn.addEventListener("click", () => {
    toggleAudioPlayback(pathway.id);
  });

  renderTracklist(pathway, activeQuestionIndex);
  renderActiveQuestion(pathway, activeQuestionIndex);
}

function renderTracklist(pathway, currentIdx) {
  const listElem = document.querySelector("#trackList");
  const fragment = document.createDocumentFragment();

  pathway.questions.forEach((q, idx) => {
    const isSolved = isQuestionSolved(q.id);
    const isLocked = isQuestionLocked(pathway, idx);
    const isActive = idx === currentIdx;

    const row = document.createElement("div");
    row.className = `track-row ${isActive ? "active" : ""} ${isSolved ? "solved" : ""} ${isLocked ? "locked" : ""}`;

    row.innerHTML = `
      <span class="track-col-num">${idx + 1}</span>
      <span class="track-col-title">${q.title}</span>
      <span class="track-col-points">${q.points || 0} pts</span>
      <span class="track-col-status">${isSolved ? "Solved" : isLocked ? "Locked" : "Available"}</span>
    `;

    if (!isLocked) {
      row.addEventListener("click", () => {
        renderActiveQuestion(pathway, idx);
      });
    }

    fragment.appendChild(row);
  });

  listElem.appendChild(fragment);
}

function renderVirtualLogicKeypadHTML() {
  return `
    <div class="virtual-keyboard">
      <div class="keyboard-title">Logic Keypad</div>
      <div class="keyboard-grid">
        <!-- Row 1: Variables & Brackets -->
        <button type="button" class="key-btn key-var" data-key="A">A</button>
        <button type="button" class="key-btn key-var" data-key="B">B</button>
        <button type="button" class="key-btn key-var" data-key="C">C</button>
        <button type="button" class="key-btn key-var" data-key="D">D</button>
        <button type="button" class="key-btn key-op" data-key="(">(</button>
        <button type="button" class="key-btn key-op" data-key=")">)</button>

        <!-- Row 2: Labeled Logic Operators & Binary Values -->
        <button type="button" class="key-btn key-op" data-key="+">+ (OR)</button>
        <button type="button" class="key-btn key-op" data-key="·">· (AND)</button>
        <button type="button" class="key-btn key-op" data-key="'">' (NOT)</button>
        <button type="button" class="key-btn key-op" data-key="⊕">⊕ (XOR)</button>
        <button type="button" class="key-btn key-val" data-key="0">0</button>
        <button type="button" class="key-btn key-val" data-key="1">1</button>

        <!-- Row 3: Action & Edit Buttons -->
        <button type="button" class="key-btn key-edit span-3" data-action="backspace">Backspace</button>
        <button type="button" class="key-btn key-clear span-3" data-action="clear">Clear</button>
      </div>
    </div>
  `;
}

function bindVirtualKeypad(activeSection, targetInputResolver) {
  activeSection.querySelectorAll(".key-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = targetInputResolver();
      const key = btn.dataset.key;
      const action = btn.dataset.action;
      const allTruthInputs = Array.from(activeSection.querySelectorAll(".truth-table-input"));

      // 1. Global Clear: Clears all 8 cells in truth table or single expression input
      if (action === "clear") {
        if (allTruthInputs.length > 0) {
          allTruthInputs.forEach((inp) => (inp.value = ""));
          allTruthInputs[0].focus();
        } else if (input) {
          input.value = "";
          input.focus();
        }
        return;
      }

      // 2. Smart Backspace: Clears focused cell or moves back to previous cell in truth table
      if (action === "backspace") {
        if (allTruthInputs.length > 0) {
          const focused = activeSection.querySelector(".truth-table-input:focus") || input || allTruthInputs[0];
          const currentIdx = allTruthInputs.indexOf(focused);
          if (focused && focused.value !== "") {
            focused.value = "";
          } else if (currentIdx > 0) {
            allTruthInputs[currentIdx - 1].value = "";
            allTruthInputs[currentIdx - 1].focus();
          }
        } else if (input) {
          input.value = input.value.slice(0, -1);
          input.focus();
        }
        return;
      }

      // 3. Insert Key: Value / Variable / Operator insertion
      if (key) {
        if (allTruthInputs.length > 0) {
          const target = (input && allTruthInputs.includes(input))
            ? input
            : (allTruthInputs.find((i) => i.value === "") || allTruthInputs[allTruthInputs.length - 1]);
          target.value = key.slice(0, 1);
          const currentIdx = allTruthInputs.indexOf(target);
          if (currentIdx >= 0 && currentIdx < allTruthInputs.length - 1) {
            allTruthInputs[currentIdx + 1].focus();
          }
        } else if (input) {
          input.value += key;
          input.focus();
        }
      }
    });
  });
}

function renderActiveQuestion(pathway, questionIndex) {
  _renderActiveQuestionContent(pathway, questionIndex);
  ensurePenaltyLoop();
}

function _renderActiveQuestionContent(pathway, questionIndex) {
  currentPathwayId = pathway.id;
  currentQuestionIndex = questionIndex;

  const allRows = document.querySelectorAll("#trackList .track-row");
  allRows.forEach((row, idx) => {
    row.classList.toggle("active", idx === questionIndex);
  });

  const question = pathway.questions[questionIndex];
  const activeSection = document.querySelector("#activeQuestionSection");
  if (!question || !activeSection) return;

  const solved = isQuestionSolved(question.id);
  const isLogicQuestion = pathway.id === "logic-grooves" || pathway.id === "deluxe-1" || pathway.id === "deluxe-2" || Boolean(question.requiresLogicKeypad);

  // Special Minimal Hex Vault Lock Question with Virtual Numpad & Keyboard Blocking
  if (question.isHexVaultQuestion) {
    activeSection.innerHTML = `
      <div class="question-card hex-vault-card ${solved ? "solved" : ""}">
        <span class="clue-header-badge">TRACK ${questionIndex + 1} OF ${pathway.questions.length}</span>
        <h3 style="margin-top: 0.4rem; margin-bottom: 0.75rem;">${question.title}</h3>
        
        <div class="hex-vault-display">
          <div class="hex-vault-code">${question.prompt}</div>
        </div>

        <form class="hex-vault-form" data-question-id="${question.id}">
          <div class="hex-vault-input-wrap">
            <input type="text" class="hex-vault-input" name="answer" placeholder="${solved ? "UNLOCKED" : "----"}" readonly autocomplete="off">
          </div>

          <!-- Virtual Numpad -->
          <div class="virtual-numpad">
            <div class="numpad-grid">
              <button type="button" class="numpad-btn" data-val="1">1</button>
              <button type="button" class="numpad-btn" data-val="2">2</button>
              <button type="button" class="numpad-btn" data-val="3">3</button>
              <button type="button" class="numpad-btn" data-val="4">4</button>
              <button type="button" class="numpad-btn" data-val="5">5</button>
              <button type="button" class="numpad-btn" data-val="6">6</button>
              <button type="button" class="numpad-btn" data-val="7">7</button>
              <button type="button" class="numpad-btn" data-val="8">8</button>
              <button type="button" class="numpad-btn" data-val="9">9</button>
              <button type="button" class="numpad-btn numpad-action" data-action="clear">C</button>
              <button type="button" class="numpad-btn" data-val="0">0</button>
              <button type="button" class="numpad-btn numpad-action" data-action="backspace">Clear</button>
            </div>
          </div>

          <button class="button" type="submit" style="margin-top: 1rem; width: 100%; border-radius: 8px; font-weight: 800; text-transform: uppercase;">${solved ? "Unlocked" : "Unlock Vault"}</button>
        </form>
        <div class="feedback" hidden style="margin-top: 0.85rem;"></div>
      </div>
    `;

    setupHexVaultListener(activeSection, question, pathway, questionIndex);
    return;
  }

  // Special Medieval Passcode Vault Card for Treasure Trails
  if (pathway.id === "treasure-trails") {
    activeSection.innerHTML = `
      <div class="treasure-prompt-header" style="margin-bottom: 1.25rem;">
        <span class="clue-header-badge">FINAL VAULT CLUE & TREASURE HUNT</span>
        <h2 style="font-size: 1.35rem; font-weight: 800; color: #ffffff; margin: 0.4rem 0 0.5rem;">${question.title}</h2>
        <p class="treasure-prompt-text" style="font-size: 1rem; color: #e0e0e0; font-family: Georgia, serif; font-style: italic; line-height: 1.5; margin: 0;">"${question.prompt}"</p>
        <div style="margin-top: 0.85rem; background: rgba(167, 139, 250, 0.12); border: 1px dashed rgba(167, 139, 250, 0.45); border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.9rem; color: #d8b4fe; font-weight: 600; display: flex; align-items: center; gap: 0.6rem;">
          <span style="font-size: 1.2rem; flex-shrink: 0;">🏰</span>
          <span><strong>Treasure Hunt Rule:</strong> Collect all the key words hidden around the castle to assemble the full passcode!</span>
        </div>
      </div>

      <div class="grand-vault-card medieval-vault ${solved ? "solved" : ""}">
        <div class="vault-header">
          <div>
            <h3 class="vault-title">Passcode Vault</h3>
            <p class="vault-subtitle">Collect all key words from around the castle to unlock the vault</p>
          </div>
        </div>
        <form class="vault-form" data-question-id="${question.id}">
          <input type="text" name="answer" placeholder="${solved ? "Passcode Vault Unlocked" : "Enter ancient passcode..."}" autocomplete="off">
          <button class="vault-button" type="submit">${solved ? "Unlocked" : "Unlock Vault"}</button>
        </form>
        <div class="feedback" hidden style="margin-top: 0.85rem;"></div>
      </div>
    `;
    setupFormListener(activeSection, question, pathway, questionIndex);
    return;
  }

  // 8-Row Read-Only Truth Table for Question 6 (Find the Boolean Expression Y)
  if (question.displayTruthTableReadOnly) {
    activeSection.innerHTML = `
      <div class="question-card ${solved ? "solved" : ""}">
        <span class="clue-header-badge">TRACK ${questionIndex + 1} OF ${pathway.questions.length}</span>
        <h3>${question.title}</h3>
        <p style="margin-bottom: 1rem;">${question.prompt}</p>
        
        <div class="truth-table-keypad-layout">
          <div class="truth-table-container">
            <table class="truth-table">
              <thead>
                <tr><th>A</th><th>B</th><th>C</th><th>Y Output</th></tr>
              </thead>
              <tbody>
                ${question.truthTableData.map((r) => `
                  <tr>
                    <td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td>
                    <td style="font-weight: 800; color: var(--green);">${r[3]}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>

          <div>
            <form class="answer-form" data-question-id="${question.id}">
              <input type="text" name="answer" placeholder="${solved ? "Solved" : "Enter expression Y (e.g. A ⊕ C)..."}" ${isLogicQuestion ? "readonly" : ""} autocomplete="off">
              <button class="button" type="submit">${solved ? "Check Solved" : "Check Expression"}</button>
            </form>
            <div style="margin-top: 0.85rem;">
              ${renderVirtualLogicKeypadHTML()}
            </div>
          </div>
        </div>
        <div class="feedback" hidden style="margin-top: 1rem;"></div>
      </div>
    `;
    setupFormListener(activeSection, question, pathway, questionIndex);
    return;
  }

  // 8-Row Interactive Truth Table & Side-by-Side Keypad Layout (Question 5)
  if (question.displayTruthTable) {
    const truthRows = [
      ["0", "0", "0"], ["0", "0", "1"], ["0", "1", "0"], ["0", "1", "1"],
      ["1", "0", "0"], ["1", "0", "1"], ["1", "1", "0"], ["1", "1", "1"]
    ];

    activeSection.innerHTML = `
      <div class="question-card ${solved ? "solved" : ""}">
        <span class="clue-header-badge">TRACK ${questionIndex + 1} OF ${pathway.questions.length}</span>
        <h3>${question.title}</h3>
        <p style="margin-bottom: 1rem; white-space: pre-wrap; font-family: inherit;">${question.prompt}</p>
        
        <div class="truth-table-keypad-layout">
          <div class="truth-table-container">
            <form class="truth-table-form" data-question-id="${question.id}">
              <table class="truth-table">
                <thead>
                  <tr><th>A</th><th>B</th><th>C</th><th>Y Output</th></tr>
                </thead>
                <tbody>
                  ${truthRows.map((r, i) => `
                    <tr>
                      <td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td>
                      <td>
                        <input type="text" class="truth-table-input" name="row_${i}" maxlength="1" ${isLogicQuestion ? "readonly" : ""} autocomplete="off" placeholder="-">
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
              <button class="button" type="submit">${solved ? "Check Solved" : "Check Table"}</button>
            </form>
          </div>

          ${renderVirtualLogicKeypadHTML()}
        </div>
        <div class="feedback" hidden style="margin-top: 1rem;"></div>
      </div>
    `;

    setupTruthTableListener(activeSection, question, pathway, questionIndex);
    return;
  }

  // Multiple Output Boxes Form (for Code Cuts questions with multiple outputs)
  if (question.multipleOutputs) {
    activeSection.innerHTML = `
      <div class="question-card ${solved ? "solved" : ""}">
        <span class="clue-header-badge">TRACK ${questionIndex + 1} OF ${pathway.questions.length}</span>
        <h3>${question.title}</h3>
        <div style="margin-bottom: 1rem; white-space: pre-wrap; font-family: monospace, monospace; background: #121212; padding: 1rem; border-radius: 6px; border: 1px solid #282828; color: #e0e0e0; font-size: 0.9rem;">${question.prompt}</div>
        <form class="multi-output-form" data-question-id="${question.id}">
          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem;">
            ${question.multipleOutputs.map((out, idx) => `
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <label style="font-weight: 600; min-width: 140px; color: var(--muted); font-size: 0.9rem;">${out.label}:</label>
                <input type="text" class="multi-output-input" name="output_${idx}" placeholder="${solved ? "Solved" : "Enter output..."}" autocomplete="off" style="flex: 1;">
              </div>
            `).join("")}
          </div>
          <button class="button" type="submit">${solved ? "Check Solved" : "Check Outputs"}</button>
        </form>
        <div class="feedback" hidden style="margin-top: 0.85rem;"></div>
      </div>
    `;
    setupMultiOutputFormListener(activeSection, question, pathway, questionIndex);
    return;
  }

  // Standard Single Output Question Form (Audio playback ONLY for Morse question)
  activeSection.innerHTML = `
    <div class="question-card ${solved ? "solved" : ""}">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <span class="clue-header-badge">TRACK ${questionIndex + 1} OF ${pathway.questions.length}</span>
        ${
          question.isMorseQuestion
            ? `<button type="button" class="morse-play-circle-btn" id="morsePlayBtn" title="Play Morse Code Transmission (Slower speed)"><span class="morse-play-icon"></span></button>`
            : ""
        }
      </div>
      <h3>${question.title}</h3>
      <div style="margin-bottom: 0.75rem; white-space: pre-wrap; font-family: monospace, monospace; background: #121212; padding: 0.85rem 1rem; border-radius: 6px; border: 1px solid #282828; color: #e0e0e0; font-size: 0.9rem;">${question.prompt}</div>
      
      ${
        question.isMorseQuestion
          ? `
            <div class="morse-reference-table-container">
              <div class="morse-table-title">MORSE CODE REFERENCE DICTIONARY</div>
              <div class="morse-alphabet-grid">
                <div class="morse-row"><strong>A</strong> <span>• —</span></div>
                <div class="morse-row"><strong>B</strong> <span>— • • •</span></div>
                <div class="morse-row"><strong>C</strong> <span>— • — •</span></div>
                <div class="morse-row"><strong>D</strong> <span>— • •</span></div>
                <div class="morse-row"><strong>E</strong> <span>•</span></div>
                <div class="morse-row"><strong>F</strong> <span>• • — •</span></div>
                <div class="morse-row"><strong>G</strong> <span>— — •</span></div>
                <div class="morse-row"><strong>H</strong> <span>• • • •</span></div>
                <div class="morse-row"><strong>I</strong> <span>• •</span></div>
                <div class="morse-row"><strong>J</strong> <span>• — — —</span></div>
                <div class="morse-row"><strong>K</strong> <span>— • —</span></div>
                <div class="morse-row"><strong>L</strong> <span>• — • •</span></div>
                <div class="morse-row"><strong>M</strong> <span>— —</span></div>
                <div class="morse-row"><strong>N</strong> <span>— •</span></div>
                <div class="morse-row"><strong>O</strong> <span>— — —</span></div>
                <div class="morse-row"><strong>P</strong> <span>• — — •</span></div>
                <div class="morse-row"><strong>Q</strong> <span>— — • —</span></div>
                <div class="morse-row"><strong>R</strong> <span>• — •</span></div>
                <div class="morse-row"><strong>S</strong> <span>• • •</span></div>
                <div class="morse-row"><strong>T</strong> <span>—</span></div>
                <div class="morse-row"><strong>U</strong> <span>• • —</span></div>
                <div class="morse-row"><strong>V</strong> <span>• • • —</span></div>
                <div class="morse-row"><strong>W</strong> <span>• — —</span></div>
                <div class="morse-row"><strong>X</strong> <span>— • • —</span></div>
                <div class="morse-row"><strong>Y</strong> <span>— • — —</span></div>
                <div class="morse-row"><strong>Z</strong> <span>— — • •</span></div>
              </div>
            </div>
          `
          : ""
      }

      <form class="answer-form" data-question-id="${question.id}">
        <input type="text" name="answer" placeholder="${solved ? "Solved" : (isLogicQuestion ? "Use virtual keypad below..." : "Enter answer")}" ${isLogicQuestion ? "readonly" : ""} autocomplete="off">
        <button class="button" type="submit">${solved ? "Check Solved" : "Check"}</button>
      </form>
      
      ${isLogicQuestion ? renderVirtualLogicKeypadHTML() : ""}

      <div class="feedback" hidden style="margin-top: 0.85rem;"></div>
    </div>
  `;

  if (question.isMorseQuestion) {
    const morseBtn = activeSection.querySelector("#morsePlayBtn");
    if (morseBtn) {
      morseBtn.addEventListener("click", () => {
        playMorseAudioSequence(question.morseCode);
      });
    }
  }

  setupFormListener(activeSection, question, pathway, questionIndex);
}

function setupHexVaultListener(activeSection, question, pathway, questionIndex = 0) {
  const form = activeSection.querySelector(".hex-vault-form");
  const input = activeSection.querySelector(".hex-vault-input");
  const numpadBtns = activeSection.querySelectorAll(".numpad-btn");
  const checkBtn = form.querySelector("button[type='submit']");

  // Block physical keyboard keydown completely for this question
  const blockPhysicalKeyboard = (e) => {
    // Only prevent keydown if currently focused on or active inside this section
    if (document.body.contains(input)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  input.addEventListener("keydown", blockPhysicalKeyboard);
  
  numpadBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.val;
      const action = btn.dataset.action;

      if (action === "clear") {
        input.value = "";
      } else if (action === "backspace") {
        input.value = input.value.slice(0, -1);
      } else if (val) {
        if (input.value.length < 10) {
          input.value += val;
        }
      }
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isPenaltyActive()) return;

    const feedback = activeSection.querySelector(".feedback");
    feedback.hidden = false;

    if (isQuestionSolved(question.id)) {
      feedback.textContent = "Points already awarded.";
      feedback.style.color = "var(--yellow)";
      return;
    }

    const userVal = input.value.trim();
    const isCorrect = question.answer.includes(userVal);

    if (isCorrect) {
      triggerConfetti(checkBtn);
      progress.solved[question.id] = true;
      progress.awarded[question.id] = question.points;
      saveProgress();
      feedback.textContent = "Vault Unlocked! Points awarded.";
      feedback.style.color = "var(--green)";
      renderScore();

      const nextIdx = questionIndex + 1 < pathway.questions.length ? questionIndex + 1 : questionIndex;
      renderPathway(pathway.id, nextIdx);
    } else {
      startPenaltyTimer(30);
    }
  });
}

function setupFormListener(activeSection, question, pathway, questionIndex = 0) {
  const form = activeSection.querySelector("form");
  if (!form) return;

  const answerInput = form.querySelector("input[name='answer']");
  const checkBtn = form.querySelector("button[type='submit']") || form.querySelector("button");

  bindVirtualKeypad(activeSection, () => answerInput);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isPenaltyActive()) return;

    const feedback = activeSection.querySelector(".feedback");
    feedback.hidden = false;

    if (isQuestionSolved(question.id)) {
      feedback.textContent = "Points already awarded.";
      feedback.style.color = "var(--yellow)";
      return;
    }

    const val = answerInput ? answerInput.value.trim().toLowerCase() : "";
    const isCorrect = Array.isArray(question.answer)
      ? question.answer.some((ans) => ans.toLowerCase() === val)
      : question.answer.toLowerCase() === val;

    if (isCorrect) {
      triggerConfetti(checkBtn);
      progress.solved[question.id] = true;
      progress.awarded[question.id] = question.points;
      saveProgress();
      feedback.textContent = "Correct! Points awarded.";
      feedback.style.color = "var(--green)";
      renderScore();

      const nextIdx = questionIndex + 1 < pathway.questions.length ? questionIndex + 1 : questionIndex;
      renderPathway(pathway.id, nextIdx);
    } else {
      startPenaltyTimer(30);
    }
  });
}

function setupMultiOutputFormListener(activeSection, question, pathway, questionIndex = 0) {
  const form = activeSection.querySelector(".multi-output-form");
  if (!form) return;

  const checkBtn = form.querySelector("button[type='submit']") || form.querySelector("button");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isPenaltyActive()) return;

    const feedback = activeSection.querySelector(".feedback");
    feedback.hidden = false;

    if (isQuestionSolved(question.id)) {
      feedback.textContent = "Points already awarded.";
      feedback.style.color = "var(--yellow)";
      return;
    }

    const inputs = Array.from(form.querySelectorAll(".multi-output-input"));
    const userVals = inputs.map((inp) => inp.value.trim().toLowerCase());

    const allCorrect = question.multipleOutputs.every((expected, idx) => {
      const val = userVals[idx];
      return expected.answer.some((ans) => ans.toLowerCase() === val);
    });

    if (allCorrect) {
      triggerConfetti(checkBtn);
      progress.solved[question.id] = true;
      progress.awarded[question.id] = question.points;
      saveProgress();
      feedback.textContent = "All outputs correct! Points awarded.";
      feedback.style.color = "var(--green)";
      renderScore();

      const nextIdx = questionIndex + 1 < pathway.questions.length ? questionIndex + 1 : questionIndex;
      renderPathway(pathway.id, nextIdx);
    } else {
      startPenaltyTimer(30);
    }
  });
}

function setupTruthTableListener(activeSection, question, pathway, questionIndex = 0) {
  const form = activeSection.querySelector(".truth-table-form");
  const checkBtn = form.querySelector("button[type='submit']") || form.querySelector("button");
  let activeInput = activeSection.querySelector(".truth-table-input");

  const inputs = Array.from(activeSection.querySelectorAll(".truth-table-input"));

  inputs.forEach((input, idx) => {
    input.addEventListener("focus", () => {
      activeInput = input;
    });

    // Physical Keyboard Backspace / Delete support across cells
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        if (input.value !== "") {
          input.value = "";
        } else if (idx > 0) {
          inputs[idx - 1].value = "";
          inputs[idx - 1].focus();
          activeInput = inputs[idx - 1];
        }
      }
    });
  });

  function getTruthTableTarget() {
    if (activeInput && activeSection.contains(activeInput)) {
      return activeInput;
    }
    return inputs.find((inp) => inp.value.trim() === "") || inputs[0];
  }

  bindVirtualKeypad(activeSection, getTruthTableTarget);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (isPenaltyActive()) return;

    const feedback = activeSection.querySelector(".feedback");
    feedback.hidden = false;

    const anyEmpty = inputs.some((inp) => inp.value.trim() === "");
    if (anyEmpty) {
      feedback.textContent = "Please fill out all 8 rows before checking.";
      feedback.style.color = "var(--yellow)";
      return;
    }

    if (isQuestionSolved(question.id)) {
      feedback.textContent = "Points already awarded.";
      feedback.style.color = "var(--yellow)";
      return;
    }

    const userVals = inputs.map((inp) => inp.value.trim().toLowerCase());
    const isCorrect = question.answers.every((expectedGroup, idx) => {
      const uVal = userVals[idx];
      return expectedGroup.some((exp) => exp.toLowerCase() === uVal);
    });

    if (isCorrect) {
      triggerConfetti(checkBtn);
      progress.solved[question.id] = true;
      progress.awarded[question.id] = question.points;
      saveProgress();
      feedback.textContent = "Truth table verified! Points awarded.";
      feedback.style.color = "var(--green)";
      renderScore();

      const nextIdx = questionIndex + 1 < pathway.questions.length ? questionIndex + 1 : questionIndex;
      renderPathway(pathway.id, nextIdx);
    } else {
      startPenaltyTimer(30);
    }
  });
}

function setupSidebarNavListeners() {
  document.querySelectorAll(".sidebar-nav .nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const href = item.getAttribute("href");
      if (href && href.includes("treasure-trails")) {
        if (totalPoints() < 250) {
          e.preventDefault();
        }
      }
    });
  });
}

function setupGlobalPlayerControls() {
  const prevBtn = document.querySelector("#prevQuestion");
  const nextBtn = document.querySelector("#nextQuestion");

  if (prevBtn && !prevBtn.dataset.bound) {
    prevBtn.dataset.bound = "true";
    prevBtn.addEventListener("click", () => {
      if (!currentPathwayId || !location.hash.startsWith("#/pathway/")) return;
      const pathway = pathways.find((p) => p.id === currentPathwayId);
      if (!pathway) return;

      const targetIdx = currentQuestionIndex - 1;
      if (targetIdx >= 0 && !isQuestionLocked(pathway, targetIdx)) {
        renderActiveQuestion(pathway, targetIdx);
      }
    });
  }

  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.dataset.bound = "true";
    nextBtn.addEventListener("click", () => {
      if (!currentPathwayId || !location.hash.startsWith("#/pathway/")) return;
      const pathway = pathways.find((p) => p.id === currentPathwayId);
      if (!pathway) return;

      const targetIdx = currentQuestionIndex + 1;
      if (targetIdx < pathway.questions.length && !isQuestionLocked(pathway, targetIdx)) {
        renderActiveQuestion(pathway, targetIdx);
      }
    });
  }
}

function render() {
  ensurePenaltyLoop();
  renderScore();

  const hash = location.hash || "#/";
  if (hash === "#/") {
    renderHome();
    renderNowPlaying(null);
  } else if (hash === "#/deluxe") {
    renderDeluxe();
    renderNowPlaying(null);
  } else if (hash.startsWith("#/pathway/")) {
    const pathwayId = hash.replace("#/pathway/", "");
    renderPathway(pathwayId);
    renderNowPlaying(pathwayId);
  }

  setupSidebarNavListeners();
  setupGlobalPlayerControls();
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
