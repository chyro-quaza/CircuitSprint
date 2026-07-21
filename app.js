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
    id: "logic-grooves",
    title: "Logic Grooves",
    artist: "DJ Boolean & The De Morgans",
    description: "Boolean gates, truth tables, and bit-level reasoning.",
    accent: "#1ed760",
    icon: "gates",
    coverImage: "logic-cover.png",
    coverZoom: "cover",
    coverPosition: "center",
    questions: [
      {
        id: "logic-1",
        title: "Bohemian Boolean",
        prompt: "Simplify the Boolean expression: Y = (A + B)' + (A + B')'",
        answer: ["A'", "A`", "A'", "a'", "a`"],
        points: 35
      },
      {
        id: "logic-2",
        title: "Stairway to Logic",
        prompt: "Simplify the Boolean expression: Y = (A + B + C)(A + B + C')",
        answer: ["A+B", "A + B", "a+b", "a + b", "(a+b)"],
        points: 35
      },
      {
        id: "logic-3",
        title: "Absorption Child O' Mine",
        prompt: "Simplify the Boolean expression: Y = (A + B')(A' + B)(A + B)",
        answer: ["AB", "A·B", "A*B", "A.B", "A B", "ab", "a·b", "a*b"],
        points: 35
      },
      {
        id: "logic-4",
        title: "Hotel Inversion",
        prompt: "Simplify the Boolean expression: Y = ((AB + C')')'",
        answer: ["AB+C'", "AB + C'", "A·B+C'", "A·B + C'", "ab+c'", "ab + c'"],
        points: 35
      },
      {
        id: "logic-5",
        title: "Smells Like XOR Spirit",
        prompt: "Fill in the output column Y for the expression: Y = (A ⊕ B)C",
        displayTruthTable: true,
        answers: [
          ["0"], ["0"], ["0"], ["1"],
          ["0"], ["1"], ["0"], ["0"]
        ],
        points: 35
      },
      {
        id: "logic-6",
        title: "Another Parity in the Wall",
        prompt: "Find the simplified Boolean expression Y for the truth table below:",
        displayTruthTableReadOnly: true,
        truthTableData: [
          ["0", "0", "0", "0"],
          ["0", "0", "1", "1"],
          ["0", "1", "0", "0"],
          ["0", "1", "1", "1"],
          ["1", "0", "0", "1"],
          ["1", "0", "1", "0"],
          ["1", "1", "0", "1"],
          ["1", "1", "1", "0"]
        ],
        answer: ["A⊕C", "A ⊕ C", "A⊕C", "A XOR C", "A xor C", "a⊕c", "a ⊕ c", "a xor c", "A+C", "A+C'"],
        points: 36
      }
    ]
  },
  {
    id: "circuit-breaks",
    title: "Circuit Breaks",
    artist: "Resistor Resistance",
    description: "Resistors, LEDs, power rails, and practical electronics.",
    accent: "#4cc9f0",
    icon: "circuit",
    coverImage: "circuit-cover.png",
    coverZoom: "cover",
    coverPosition: "center",
    questions: [
      {
        id: "circuit-1",
        title: "Under Voltage",
        prompt: "Two 10 kΩ resistors are connected in series across a 10 V supply. What voltage in volts (V) is measured at the midpoint between the two resistors?",
        answer: ["5", "5V", "5 V", "5 volts"],
        points: 25
      },
      {
        id: "circuit-2",
        title: "Resistor in the Sky",
        prompt: "A resistor has 4 color bands followed by a gold tolerance band: Yellow, Violet, Orange, Gold. What is its nominal resistance value in kilohms (kΩ)?",
        answer: ["47", "47k", "47 k", "47 kohm", "47000"],
        points: 25
      },
      {
        id: "circuit-3",
        title: "Analog Read Me Maybe",
        prompt: "What built-in C++ function is used to read an analog input voltage on an Arduino?",
        answer: ["analogRead()", "analogRead", "analogread()", "analogread"],
        points: 25
      },
      {
        id: "circuit-4",
        title: "Currentstruck",
        prompt: "A resistor has 10 V across it and carries a current of 0.2 A. What is the power dissipated by the resistor in watts (W)?",
        answer: ["2", "2W", "2 W", "2 watts"],
        points: 25
      },
      {
        id: "circuit-5",
        title: "Comfortably Grounded",
        prompt: "An ultrasonic distance sensor emits a pulse that reflects off an obstacle and returns in time duration t = 1000 µs. Given the speed of sound v = 0.034 cm/µs, calculate distance d in centimeters (cm) using: d = (v × t) / 2",
        answer: ["17", "17cm", "17 cm"],
        points: 25
      },
      {
        id: "circuit-6",
        title: "Silicon Haze",
        prompt: "How many dedicated GND (Ground) header pins are present across the power and digital pin headers of a standard Arduino Uno board?",
        answer: ["3", "3 pins", "three"],
        points: 25
      },
      {
        id: "circuit-7",
        title: "Born to Loop",
        prompt: "An LED is connected to Arduino pin 8 through a 220 Ω resistor. The LED's cathode is connected to pin 8, and its anode is connected to +5 V. Fill in the blank to light up the LED:\n\ndigitalWrite(8, ******);",
        answer: ["LOW", "low", "0"],
        points: 25
      },
      {
        id: "circuit-8",
        title: "Bitwise Jean",
        prompt: "An Arduino Uno features a 10-bit ADC. What is the maximum integer value returned by calling analogRead()?",
        answer: ["1023"],
        points: 25
      }
    ]
  },
  {
    id: "code-cuts",
    title: "Code Cuts",
    artist: "Stack Orchestra",
    description: "Embedded loops, pin states, and C/Python output prediction challenges.",
    accent: "#ffd166",
    icon: "code",
    coverImage: "code-cover.png",
    coverZoom: "cover",
    coverPosition: "center",
    questions: [
      {
        id: "code-1",
        title: "Increment Dreams",
        prompt: "Predict the output of the C code snippet:\n\n#include <stdio.h>\n\nint main() {\n    int x = 4;\n    printf(\"%d\\n\", x++);\n    printf(\"%d\\n\", ++x);\n    return 0;\n}",
        multipleOutputs: [
          { label: "Output 1", answer: ["4"] },
          { label: "Output 2", answer: ["6"] }
        ],
        points: 25
      },
      {
        id: "code-2",
        title: "Single Equals Like You",
        prompt: "Predict the output of the C code snippet:\n\n#include <stdio.h>\n\nint main() {\n    int a = 10;\n\n    if (a = 5)\n        printf(\"YES\");\n    else\n        printf(\"NO\");\n\n    return 0;\n}",
        answer: ["YES", "yes"],
        points: 25
      },
      {
        id: "code-3",
        title: "Don't Stop Believin' (in Exponents)",
        prompt: "What is printed by this Python snippet?\n\na = 3\nb = 4\nc = 2\n\nprint(a + b * c ** 2)",
        answer: ["19"],
        points: 25
      },
      {
        id: "code-4",
        title: "Shape of Division",
        prompt: "Predict the output of the C code snippet:\n\n#include <stdio.h>\n\nint main() {\n    int x = 7;\n    int y = 3;\n\n    printf(\"%d\\n\", x * y + x / y);\n    return 0;\n}",
        answer: ["23"],
        points: 25
      },
      {
        id: "code-5",
        title: "Uptown Double Slash",
        prompt: "What is printed by this Python snippet?\n\nx = 2\n\nprint((x + 3) * (x ** 3 - 1) // 5)",
        answer: ["7"],
        points: 25
      },
      {
        id: "code-6",
        title: "Looping in the Dark",
        prompt: "What value of x is printed after executing this Python loop?\n\nx = 3\n\nfor i in range(1, 5):\n    x = x * 2 - i\n\nprint(x)",
        answer: ["22"],
        points: 25
      },
      {
        id: "code-7",
        title: "Boolean Rhapsody",
        prompt: "What boolean values are printed by this Python snippet?\n\na = False\nb = True\nc = False\n\nprint(a or b and c)\nprint((a or b) and c)",
        multipleOutputs: [
          { label: "Output 1", answer: ["false"] },
          { label: "Output 2", answer: ["false"] }
        ],
        points: 25
      },
      {
        id: "code-8",
        title: "Take On Truth",
        prompt: "What boolean output is printed by this Python snippet?\n\nx = 7\ny = 4\nz = 10\n\nprint((x > y and z < 20) or not (x + y == z))",
        answer: ["True", "true"],
        points: 25
      }
    ]
  },
  {
    id: "flag-session",
    title: "Flag Session",
    artist: "Base64 Battalion",
    description: "Decoding, base conversions, and hidden string flags.",
    accent: "#ff4fd8",
    icon: "flag",
    coverImage: "flag-cover.png",
    coverZoom: "cover",
    coverPosition: "center",
    questions: [
      {
        id: "flag-caesar",
        title: "Caesar's Cipher O' Mine",
        prompt: "A Roman general flanks his enemies by shifting his soldiers 3 positions to the right. Mid-battle, his messenger drops an encoded scroll in the mud:\n\nDWWDFN WKH HQHPB DW GDZQ\n\nFind the general's lost message.",
        answer: ["attack the enemy at dawn", "attacktheenemyatdawn"],
        points: 35
      },
      {
        id: "flag-binary-add",
        title: "Binary Add It",
        prompt: "Add the following binary numbers together, then convert the sum to decimal:\n\n1001011110101₂ + 110110101011₂",
        answer: ["8352"],
        points: 35
      },
      {
        id: "flag-2",
        title: "Hex on Fire",
        prompt: "Convert hex 0x9FC to binary and decimal.",
        multipleOutputs: [
          { label: "Binary", answer: ["100111111100", "100111111100₂"] },
          { label: "Decimal", answer: ["2556"] }
        ],
        points: 35
      },
      {
        id: "flag-hex-vault",
        title: "Welcome to the Hex Vault",
        prompt: "0xBEE",
        answer: ["3054"],
        isHexVaultQuestion: true,
        points: 35
      },
      {
        id: "flag-morse",
        title: "Radioactive Morse",
        prompt: "Listen closely to the audio transmission from the play button above.\n\nWhat phrase is being transmitted?",
        answer: ["hello ween", "helloween", "hello-ween", "hello_ween"],
        isMorseQuestion: true,
        morseCode: ".... . .-.. .-.. --- / .-- . . -.",
        points: 37
      },
      {
        id: "flag-5",
        title: "Sweet Dreams of XOR",
        prompt: "XOR 1100 with 1010. What is the 4-bit binary result?",
        answer: ["0110", "110"],
        points: 35
      }
    ]
  },
  {
    id: "treasure-trails",
    title: "Treasure Trails",
    artist: "Sir Vibesalot",
    description: "Single release challenge: unlock the final passcode vault.",
    accent: "#a78bfa",
    icon: "key",
    coverImage: "treasure-cover.png",
    unlockThreshold: 500,
    questions: [
      {
        id: "treasure-1",
        title: "Eye of the Passcode",
        prompt: "Descend to the castle's lowest halls where the coldest spring grants relief to the passing traveller",
        answer: [
          "by the power of greyskull",
          "by the power of grayskull",
          "bythepowerofgreyskull",
          "bythepowerofgrayskull"
        ],
        points: 200
      }
    ]
  },
  {
    id: "deluxe-1",
    title: "Logic Gate Symphony",
    artist: "VIP Master Series",
    description: "Exclusive Tier 1 Deluxe Challenge: Multi-stage gate networks, cascaded parity, and wire fault analysis.",
    accent: "#ffd166",
    icon: "gates",
    coverImage: "deluxe1-cover.png",
    coverZoom: "cover",
    coverPosition: "center",
    unlockThreshold: 350,
    isDeluxe: true,
    questions: [
      {
        id: "deluxe1-1",
        title: "Seven Nation Network",
        prompt: "A 3-level logic gate network has inputs A, B, C, D. An XOR gate takes (A, B). A NOR gate takes (C, D). The outputs of both gates feed into a final NAND gate. Which Boolean expression matches this circuit output Y?",
        answer: ["((A⊕B)+(C+D)')'", "((A ⊕ B) + (C + D)')'", "((A⊕B)(C+D)')'", "((A ⊕ B)(C + D)')'", "((A⊕B)+(C+D)')'", "NAND(XOR(A,B), NOR(C,D))"],
        points: 35
      },
      {
        id: "deluxe1-2",
        title: "Parity Like It's 1999",
        prompt: "A 3-bit odd parity generator circuit (Output Y = 1 when total number of 1s in A, B, C is odd) uses two 2-input logic gates in series: Gate 1 takes (A, B), and Gate 2 takes (Output of Gate 1, C). An engineer mistakenly used an XNOR gate for Gate 2 instead of an XOR gate. Which single gate is incorrect?",
        answer: ["Gate 2", "gate 2", "XNOR", "XNOR gate", "the XNOR gate", "gate 2 (XNOR)"],
        points: 35
      },
      {
        id: "deluxe1-3",
        title: "Highway to MUX",
        prompt: "In an active-high 4-to-1 Multiplexer with Select lines (S1, S0) driving 4 internal AND gates, an engineer wants to route Input I2 (binary 10) to output when S1=1, S0=0. However, Gate 2 receives (I2, S1, S0) instead of (I2, S1, S0'). Which one select wire (S1 or S0) is connected directly without an inverter, causing the wrong selection?",
        answer: ["S0", "s0", "S0 wire", "wire S0", "S0 select wire"],
        points: 35
      },
      {
        id: "deluxe1-4",
        title: "Livin' on a Combinational",
        prompt: "Consider a 4-input logic function Y = (A · B)' · (C ⊕ D). Out of all 16 possible 4-bit binary input combinations (ABCD), how many input combinations produce a HIGH (1) output?",
        answer: ["6"],
        points: 35
      },
      {
        id: "deluxe1-5",
        title: "Masked Variable in the Dark",
        prompt: "Evaluate the 4-input Boolean function: Y = A · B + A · B' + (C ⊕ C') · D · 0. Simplifying this circuit shows one or more inputs are completely masked. Which input (A, B, C, or D) has no effect on the output?",
        answer: ["B", "b", "C", "c", "D", "d", "B, C, D"],
        points: 35
      },
      {
        id: "deluxe1-6",
        title: "Ignition (Remix Vector)",
        prompt: "An active-high emergency beacon LED is driven by Y = (A · B) + (C · D'). Which 4-bit binary input vector (ABCD) with A=1, B=1, C=0, D=1 is guaranteed to turn the LED ON?",
        answer: ["1101", "ABCD=1101", "1 1 0 1"],
        points: 35
      }
    ]
  },
  {
    id: "deluxe-2",
    title: "Logic Circuit Suite",
    artist: "VIP Master Series",
    description: "Exclusive Tier 2 Deluxe Challenge: Ripple carry delays, priority encoders, synchronous counters, and SR latch hazards.",
    accent: "#ff4fd8",
    icon: "circuit",
    coverImage: "deluxe2-cover.png",
    coverZoom: "cover",
    coverPosition: "center",
    unlockThreshold: 750,
    isDeluxe: true,
    questions: [
      {
        id: "deluxe2-1",
        title: "Ripple Carry in the Deep",
        prompt: "A 4-bit Ripple Carry Adder consists of 4 cascaded Full Adders. If each Full Adder has a propagation delay of 12 nanoseconds (ns) for the carry signal to stabilize, what is the total worst-case propagation delay in nanoseconds (ns) for the final Carry-Out to stabilize?",
        answer: ["48", "48ns", "48 ns"],
        points: 40
      },
      {
        id: "deluxe2-2",
        title: "Encoder of the Night",
        prompt: "A 4-to-2 Priority Encoder receives active-high inputs (D3, D2, D1, D0) where D3 has highest priority. If the input vector is D3=0, D2=1, D1=1, D0=1, what 2-bit binary output (Y1 Y0) will the encoder produce?",
        answer: ["10", "Y1=1 Y0=0", "1 0"],
        points: 40
      },
      {
        id: "deluxe2-3",
        title: "Count On Me",
        prompt: "A 3-bit modulo-8 binary up-counter is initialized at state 101₂ (decimal 5). After 4 active clock pulses, what is the 3-bit binary state of the counter?",
        answer: ["001", "001₂", "1"],
        points: 40
      },
      {
        id: "deluxe2-4",
        title: "Latch Me If You Can",
        prompt: "In an active-HIGH NOR-based SR Latch, what binary input combination (S, R) causes an unstable / invalid forbidden state where both Q and Q' outputs are forced to 0?",
        answer: ["11", "S=1 R=1", "S=1, R=1", "1,1", "1 1"],
        points: 40
      }
    ]
  },
  {
    id: "deluxe-3",
    title: "Arduino Circuit Sessions",
    artist: "VIP Master Series",
    description: "Exclusive Tier 3 Deluxe Challenge: Timer prescalers, SPI protocols, ADC quantum steps, and ISR vectors.",
    accent: "#4cc9f0",
    icon: "code",
    coverImage: "deluxe3-cover.png",
    coverZoom: "cover",
    coverPosition: "center",
    unlockThreshold: 1023,
    isDeluxe: true,
    questions: [
      {
        id: "deluxe3-1",
        title: "Time After Prescaler",
        prompt: "An Arduino Uno runs at a system clock frequency of 16 MHz. Timer1 is configured with a prescaler of 64. What is the timer counter tick frequency in kilohertz (kHz)?",
        answer: ["250", "250kHz", "250 kHz"],
        points: 45
      },
      {
        id: "deluxe3-2",
        title: "Master of Signals",
        prompt: "An Arduino communicates with an SD card module via SPI protocol. Which pin line transmits data from Arduino Master to the Slave device: MOSI or MISO?",
        answer: ["MOSI", "mosi"],
        points: 45
      },
      {
        id: "deluxe3-3",
        title: "Quantum Step O' Mine",
        prompt: "A 10-bit ADC on a 5.0V Arduino reference reads an analog sensor output. What is the voltage resolution (voltage per step) in millivolts (mV)? (Round to 2 decimal places)",
        answer: ["4.88", "4.88mV", "4.88 mV", "4.89"],
        points: 45
      },
      {
        id: "deluxe3-4",
        title: "Interrupt the Silence",
        prompt: "On an Arduino Uno (ATmega328P), which external interrupt pin corresponds to INT0: Digital Pin 2 or Digital Pin 3?",
        answer: ["2", "Digital Pin 2", "pin 2", "Pin 2"],
        points: 45
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
        <span class="clue-header-badge">FINAL VAULT CLUE</span>
        <h2 style="font-size: 1.35rem; font-weight: 800; color: #ffffff; margin: 0.4rem 0 0.5rem;">${question.title}</h2>
        <p class="treasure-prompt-text" style="font-size: 1rem; color: #e0e0e0; font-family: Georgia, serif; font-style: italic; line-height: 1.5; margin: 0;">"${question.prompt}"</p>
      </div>

      <div class="grand-vault-card medieval-vault ${solved ? "solved" : ""}">
        <div class="vault-header">
          <div>
            <h3 class="vault-title">Passcode Vault</h3>
            <p class="vault-subtitle">Enter ancient passcode below to unlock</p>
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
