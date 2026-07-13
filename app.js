const STORAGE_KEY = "circuitSprintProgress.v1";

const pathways = [
  {
    id: "resistor-rush",
    title: "Resistor Rush",
    description: "Decode resistance, current, and voltage clues before moving deeper into the build.",
    accent: "#1ed760",
    questions: [
      {
        id: "rr-1",
        prompt: "A resistor has bands brown, black, red, gold. What is its resistance in ohms?",
        answer: ["1000", "1k", "1 kilo ohm", "1kohm"],
        points: 20
      },
      {
        id: "rr-2",
        prompt: "Using Ohm's law, what current flows through a 220 ohm resistor on 5 V? Answer in mA, rounded to one decimal.",
        answer: ["22.7", "22.7ma", "22.73", "22.73ma"],
        points: 30
      }
    ]
  },
  {
    id: "led-lab",
    title: "LED Lab",
    description: "Work through polarity, safe current, and indicator logic.",
    accent: "#ff4fd8",
    questions: [
      {
        id: "ll-1",
        prompt: "Which LED leg usually connects to the positive side: anode or cathode?",
        answer: ["anode"],
        points: 20
      },
      {
        id: "ll-2",
        prompt: "What component should be placed in series with an LED to limit current?",
        answer: ["resistor", "a resistor"],
        points: 20
      }
    ]
  },
  {
    id: "logic-loop",
    title: "Logic Loop",
    description: "Solve digital logic gates and signal flow questions.",
    accent: "#ffd166",
    questions: [
      {
        id: "lo-1",
        prompt: "What is the output of an AND gate when inputs are 1 and 0?",
        answer: ["0", "false", "low"],
        points: 20
      },
      {
        id: "lo-2",
        prompt: "What is the output of an OR gate when inputs are 1 and 0?",
        answer: ["1", "true", "high"],
        points: 20
      }
    ]
  },
  {
    id: "sensor-sprint",
    title: "Sensor Sprint",
    description: "Read clues about inputs, analog values, and measurement.",
    accent: "#4cc9f0",
    questions: [
      {
        id: "ss-1",
        prompt: "A potentiometer usually acts as what kind of adjustable component?",
        answer: ["variable resistor", "resistor", "adjustable resistor"],
        points: 25
      },
      {
        id: "ss-2",
        prompt: "An LDR changes resistance based on what?",
        answer: ["light", "brightness", "light level"],
        points: 25
      }
    ]
  },
  {
    id: "power-play",
    title: "Power Play",
    description: "Handle supply rails, grounds, and practical build safety.",
    accent: "#ff5a5f",
    questions: [
      {
        id: "pp-1",
        prompt: "What shared reference point must all parts of a circuit usually connect to?",
        answer: ["ground", "gnd"],
        points: 25
      },
      {
        id: "pp-2",
        prompt: "In a breadboard, the red rail is conventionally used for what?",
        answer: ["positive", "vcc", "power", "plus"],
        points: 20
      }
    ]
  },
  {
    id: "debug-deck",
    title: "Debug Deck",
    description: "Find faults before they cost build time.",
    accent: "#a78bfa",
    questions: [
      {
        id: "dd-1",
        prompt: "What meter mode is commonly used to check whether two points are connected?",
        answer: ["continuity", "continuity mode"],
        points: 25
      },
      {
        id: "dd-2",
        prompt: "What problem occurs when positive and ground are directly connected with almost no resistance?",
        answer: ["short circuit", "short"],
        points: 30
      }
    ]
  }
];

const unlocks = [
  { id: "blueprint", name: "Circuit Blueprint", threshold: 60, description: "Final build schematic and placement hints." },
  { id: "resistor-pack", name: "Resistor Pack", threshold: 105, description: "Core resistors for LED and divider stages." },
  { id: "led-pack", name: "LED Pack", threshold: 145, description: "Indicator LEDs for testing the build." },
  { id: "sensor", name: "Sensor Module", threshold: 190, description: "Input component for the interactive stage." },
  { id: "ic", name: "Logic IC", threshold: 235, description: "Digital logic stage component." },
  { id: "final-kit", name: "Final Connector Kit", threshold: 280, description: "Wires and finishing components." }
];

let progress = loadProgress();

function loadProgress() {
  const fallback = { solved: {}, awarded: {} };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== "object") {
      return fallback;
    }
    return {
      solved: saved.solved && typeof saved.solved === "object" ? saved.solved : {},
      awarded: saved.awarded && typeof saved.awarded === "object" ? saved.awarded : {}
    };
  } catch {
    return fallback;
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  renderScore();
}

function totalPoints() {
  return Object.values(progress.awarded).reduce((sum, points) => sum + Number(points || 0), 0);
}

function maxUnlockPoints() {
  return unlocks[unlocks.length - 1].threshold;
}

function normalize(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isSolved(questionId) {
  return Boolean(progress.solved[questionId]);
}

function renderScore() {
  const points = totalPoints();
  const max = maxUnlockPoints();
  const percent = Math.min(100, Math.round((points / max) * 100));
  document.querySelector("#totalPoints").textContent = points;
  document.querySelector("#maxPoints").textContent = `/${max}`;
  document.querySelector("#topProgressFill").style.setProperty("--progress", `${percent}%`);
}

function renderHome() {
  const app = document.querySelector("#app");
  app.replaceChildren(document.querySelector("#homeTemplate").content.cloneNode(true));

  const pathwayGrid = document.querySelector("#pathwayGrid");
  pathways.forEach((pathway) => {
    const solvedCount = pathway.questions.filter((question) => isSolved(question.id)).length;
    const totalAvailable = pathway.questions.reduce((sum, question) => sum + question.points, 0);
    const card = document.createElement("a");
    card.className = "pathway-card";
    card.href = `#/pathway/${pathway.id}`;
    card.style.setProperty("--accent", pathway.accent);
    card.innerHTML = `
      <div>
        <h3>${pathway.title}</h3>
        <p>${pathway.description}</p>
      </div>
      <div class="card-meta">
        <span class="tag">${solvedCount}/${pathway.questions.length} solved</span>
        <span class="tag alt">${totalAvailable} pts</span>
      </div>
    `;
    pathwayGrid.append(card);
  });

  const unlockGrid = document.querySelector("#unlockGrid");
  const points = totalPoints();
  unlocks.forEach((unlock) => {
    const unlocked = points >= unlock.threshold;
    const card = document.createElement("article");
    card.className = `unlock-card ${unlocked ? "" : "locked"}`;
    const percent = Math.min(100, Math.round((points / unlock.threshold) * 100));
    card.innerHTML = `
      <div class="unlock-head">
        <span class="unlock-icon" aria-hidden="true">${unlocked ? "ON" : "$"}</span>
        <h3>${unlock.name}</h3>
      </div>
      <p>${unlock.description}</p>
      <div class="unlock-status">
        <div class="progress" aria-label="${percent}% progress">
          <span style="--progress: ${percent}%"></span>
        </div>
        <span class="${unlocked ? "solved-label" : ""}">${unlocked ? "Unlocked" : `${unlock.threshold} pts`}</span>
      </div>
    `;
    unlockGrid.append(card);
  });
}

function renderPathway(pathwayId) {
  const pathway = pathways.find((item) => item.id === pathwayId);
  if (!pathway) {
    location.hash = "#/";
    return;
  }

  const app = document.querySelector("#app");
  app.replaceChildren(document.querySelector("#pathwayTemplate").content.cloneNode(true));
  document.querySelector("#pathwayEyebrow").textContent = `${pathway.questions.length} questions`;
  document.querySelector("#pathwayTitle").textContent = pathway.title;
  document.querySelector("#pathwayDescription").textContent = pathway.description;

  const list = document.querySelector("#questionList");
  pathway.questions.forEach((question, index) => {
    const solved = isSolved(question.id);
    const card = document.createElement("article");
    card.className = `question-card ${solved ? "solved" : ""}`;
    card.innerHTML = `
      <div class="card-meta">
        <span class="tag">Question ${index + 1}</span>
        <span class="tag alt">${question.points} pts</span>
      </div>
      <h3>${question.prompt}</h3>
      <form class="answer-row" data-question-id="${question.id}">
        <input type="text" name="answer" autocomplete="off" ${solved ? "disabled" : ""} placeholder="${solved ? "Already solved" : "Enter answer"}">
        <button class="button" type="submit" ${solved ? "disabled" : ""}>${solved ? "Solved" : "Check"}</button>
      </form>
      <p class="feedback">${solved ? "Points already awarded." : ""}</p>
    `;
    list.append(card);
  });

  list.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.target;
    const question = pathway.questions.find((item) => item.id === form.dataset.questionId);
    const feedback = form.closest(".question-card").querySelector(".feedback");
    const submitted = normalize(new FormData(form).get("answer") || "");
    const answers = question.answer.map(normalize);

    if (!answers.includes(submitted)) {
      feedback.textContent = "Not quite. Check the clue and try again.";
      return;
    }

    progress.solved[question.id] = true;
    progress.awarded[question.id] = question.points;
    saveProgress();
    renderPathway(pathway.id);
  });
}

function render() {
  renderScore();
  const [, route, id] = location.hash.split("/");
  if (route === "pathway") {
    renderPathway(id);
  } else {
    renderHome();
  }
  document.querySelector("#app").focus({ preventScroll: true });
}

window.addEventListener("hashchange", render);
render();
