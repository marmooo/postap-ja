const playPanel = document.getElementById("playPanel");
const infoPanel = document.getElementById("infoPanel");
const countPanel = document.getElementById("countPanel");
const scorePanel = document.getElementById("scorePanel");
const japanese = document.getElementById("japanese");
const gameTime = 120;
let gameTimer;
// https://dova-s.jp/bgm/play18400.html
const bgm = new Audio("mp3/bgm.mp3");
bgm.volume = 0.1;
bgm.loop = true;
let solvedCount = 0;
let problemCount = 0;
let correctCount = 0;
let incorrectCount = 0;
let targetProblems = [];
let problems = [];
const audioContext = new AudioContext();
const audioBufferCache = {};
loadAudio("end", "mp3/end.mp3");
loadAudio("correct", "mp3/correct3.mp3");
loadAudio("incorrect", "mp3/cat.mp3");
loadConfig();

function loadConfig() {
  if (localStorage.getItem("darkMode") == 1) {
    document.documentElement.dataset.theme = "dark";
  }
  if (localStorage.getItem("bgm") != 1) {
    document.getElementById("bgmOn").classList.add("d-none");
    document.getElementById("bgmOff").classList.remove("d-none");
  }
}

function toggleBGM() {
  if (localStorage.getItem("bgm") == 1) {
    document.getElementById("bgmOn").classList.add("d-none");
    document.getElementById("bgmOff").classList.remove("d-none");
    localStorage.setItem("bgm", 0);
    bgm.pause();
  } else {
    document.getElementById("bgmOn").classList.remove("d-none");
    document.getElementById("bgmOff").classList.add("d-none");
    localStorage.setItem("bgm", 1);
    bgm.play();
  }
}

function toggleDarkMode() {
  if (localStorage.getItem("darkMode") == 1) {
    localStorage.setItem("darkMode", 0);
    delete document.documentElement.dataset.theme;
  } else {
    localStorage.setItem("darkMode", 1);
    document.documentElement.dataset.theme = "dark";
  }
}

async function playAudio(name, volume) {
  const audioBuffer = await loadAudio(name, audioBufferCache[name]);
  const sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = audioBuffer;
  if (volume) {
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(audioContext.destination);
    sourceNode.connect(gainNode);
    sourceNode.start();
  } else {
    sourceNode.connect(audioContext.destination);
    sourceNode.start();
  }
}

async function loadAudio(name, url) {
  if (audioBufferCache[name]) return audioBufferCache[name];
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  audioBufferCache[name] = audioBuffer;
  return audioBuffer;
}

function unlockAudio() {
  audioContext.resume();
}

async function loadProblems() {
  const response = await fetch(`problems.json`);
  const json = await response.json();
  problems = json;
  setProblemCache();
}

function nextProblem() {
  solvedCount = 0;
  setProblem();
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function kanaToHira(str) {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
}

function getFuriganaHTML(morpheme) {
  let html = "";
  const furiganas = getFuriganas(morpheme);
  if (furiganas) {
    furiganas.forEach((furigana) => {
      if (furigana[1]) {
        html += `<ruby>${furigana[0]}<rt>${furigana[1]}</rt></ruby>`;
      } else {
        html += `<span>${furigana[0]}</span>`;
      }
    });
  } else {
    html += `<span>${morpheme.surface}</span>`;
  }
  return html;
}

function getFuriganas(morpheme) {
  const reading = morpheme.reading;
  if (!reading) return undefined;
  const surface = morpheme.surface;
  if (surface == reading) return undefined;
  const hiraSurface = kanaToHira(surface);
  const hiraReading = kanaToHira(reading);
  if (hiraSurface == hiraReading) return undefined;
  // 楽しい --> ([ぁ-ん+])しい --> (たの)しい --> ["たの"]
  // 行き来 --> ([ぁ-ん+])き([ぁ-ん]+) --> (い)き(き), --> ["い", "き"]
  const searchString = hiraSurface.replaceAll(/[一-龠々ヵヶ]+/g, "([ぁ-ん]+)");
  const furiganaRegexp = new RegExp(searchString);
  const furiganas = hiraReading.match(furiganaRegexp).slice(1);
  const map = new Map();
  const kanjis = surface.match(/([一-龠々ヵヶ]+)/g);
  kanjis.forEach((kanji, i) => {
    map.set(kanji, furiganas[i]);
  });
  const words = surface.split(/([一-龠々ヵヶ]+)/g).filter((s) => s != "");
  const result = words.map((word) => {
    const furigana = map.get(word);
    if (furigana) {
      return [word, furigana];
    } else {
      return [word, undefined];
    }
  });
  return result;
}

function mergePOS(problem) {
  const gradeOption = document.getElementById("gradeOption");
  const gradeNode = gradeOption.options[gradeOption.selectedIndex];
  const grade = gradeNode.value;
  if (grade != "大人") {
    problem = mergeAdjectiveVerbs(problem);
  }
  if (grade == "小学生") {
    problem = mergeAuxiliaryVerbs(problem);
  }
  return problem;
}

function mergeAuxiliaryVerbs(problem) {
  const newProblem = [];
  let merged = false;
  problem.forEach((morpheme, i) => {
    const nextMorpheme = problem[i + 1];
    if (
      morpheme.feature == "動詞" &&
      nextMorpheme &&
      nextMorpheme.feature == "助動詞"
    ) {
      merged = true;
      const m = {
        feature: "動詞",
        surface: morpheme.surface + nextMorpheme.surface,
        reading: morpheme.reading + nextMorpheme.reading,
        featureDetails: morpheme.featureDetails,
        conjugationForms: morpheme.conjugationForms,
      };
      newProblem.push(m);
    } else if (merged) {
      merged = false;
    } else {
      newProblem.push(morpheme);
    }
  });
  return newProblem;
}

function mergeAdjectiveVerbs(problem) {
  const newProblem = [];
  let merged = false;
  problem.forEach((morpheme, i) => {
    const nextMorpheme = problem[i + 1];
    if (
      morpheme.featureDetails[0] == "形容動詞語幹" &&
      nextMorpheme &&
      nextMorpheme.feature == "助動詞"
    ) {
      merged = true;
      const m = {
        feature: "形容動詞",
        surface: morpheme.surface + nextMorpheme.surface,
        reading: morpheme.surface + nextMorpheme.reading,
        featureDetails: ["*", "*", "*"],
        conjugationForms: nextMorpheme.conjugationForms,
      };
      newProblem.push(m);
    } else if (merged) {
      merged = false;
    } else {
      newProblem.push(morpheme);
    }
  });
  return newProblem;
}

function setSearchingChoice(course, morpheme, wrapperNode) {
  wrapperNode.className = "btn btn-light btn-lg m-1 px-2 choice";
  const surfaceNode = document.createElement("div");
  const html = getFuriganaHTML(morpheme);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const spans = [...doc.body.childNodes];
  surfaceNode.replaceChildren(...spans);
  const button = document.createElement("button");
  button.textContent = course + "？";
  button.className = "btn btn-sm btn-primary";
  button.dataset.answer = morpheme.feature;
  button.onclick = () => {
    if (course == morpheme.feature) {
      correctCount += 1;
      wrapperNode.classList.add("border", "border-primary");
      button.textContent = course;
      playAudio("correct");
      solvedCount += 1;
      if (problemCount <= solvedCount) nextProblem();
    } else {
      incorrectCount += 1;
      wrapperNode.classList.add("bg-danger");
      button.textContent = morpheme.feature;
      playAudio("incorrect");
    }
    button.disabled = true;
  };
  wrapperNode.appendChild(surfaceNode);
  wrapperNode.appendChild(button);
}

function setProblemCache() {
  const selectNode = document.getElementById("courseOption");
  const courseNode = selectNode.options[selectNode.selectedIndex];
  const course = courseNode.value;
  if (course == "形容動詞") {
    targetProblems = problems.filter((morphemes) => {
      return morphemes.find((morpheme, i) => {
        const nextMorpheme = morphemes[i + 1];
        if (
          morpheme.featureDetails[0] == "形容動詞語幹" &&
          nextMorpheme &&
          nextMorpheme.feature == "助動詞"
        ) return true;
      });
    });
  } else {
    targetProblems = problems.filter((morphemes) => {
      return morphemes.find((morpheme) => morpheme.feature == course);
    });
  }
}

function setProblem() {
  const selectNode = document.getElementById("courseOption");
  const courseNode = selectNode.options[selectNode.selectedIndex];
  const course = courseNode.value;
  document.getElementById("explanation").textContent =
    `${course}を選んでください`;
  let problem = targetProblems[getRandomInt(0, targetProblems.length)];
  problem = mergePOS(problem);
  const nextProblems = [];
  let choiceCount = 0;
  problem.forEach((morpheme) => {
    const wrapperNode = document.createElement("div");
    switch (morpheme.feature) {
      case "フィラー":
      case "間投詞":
      case "記号":
        wrapperNode.className = "btn btn-light btn-lg m-1 px-2";
        wrapperNode.textContent = morpheme.surface;
        break;
      default:
        setSearchingChoice(course, morpheme, wrapperNode);
        if (course == morpheme.feature) choiceCount += 1;
    }
    nextProblems.push(wrapperNode);
  });
  problemCount = choiceCount;
  japanese.replaceChildren(...nextProblems);
}

function countdown() {
  correctCount = incorrectCount = 0;
  countPanel.classList.remove("d-none");
  infoPanel.classList.add("d-none");
  playPanel.classList.add("d-none");
  scorePanel.classList.add("d-none");
  counter.textContent = 3;
  const timer = setInterval(() => {
    const counter = document.getElementById("counter");
    const colors = ["skyblue", "greenyellow", "violet", "tomato"];
    if (parseInt(counter.textContent) > 1) {
      const t = parseInt(counter.textContent) - 1;
      counter.style.backgroundColor = colors[t];
      counter.textContent = t;
    } else {
      clearInterval(timer);
      countPanel.classList.add("d-none");
      infoPanel.classList.remove("d-none");
      playPanel.classList.remove("d-none");
      setProblem();
      startGameTimer();
      if (localStorage.getItem("bgm") == 1) {
        bgm.play();
      }
    }
  }, 1000);
}

function startGame() {
  clearInterval(gameTimer);
  initTime();
  countdown();
}

function startGameTimer() {
  const timeNode = document.getElementById("time");
  gameTimer = setInterval(() => {
    const t = parseInt(timeNode.textContent);
    if (t > 0) {
      timeNode.textContent = t - 1;
    } else {
      clearInterval(gameTimer);
      bgm.pause();
      playAudio("end");
      playPanel.classList.add("d-none");
      scorePanel.classList.remove("d-none");
      scoring();
    }
  }, 1000);
}

function initTime() {
  document.getElementById("time").textContent = gameTime;
}

function scoring() {
  document.getElementById("score").textContent = correctCount;
  document.getElementById("count").textContent = correctCount + incorrectCount;
}

function showAnswer() {
  const selectNode = document.getElementById("courseOption");
  const courseNode = selectNode.options[selectNode.selectedIndex];
  const course = courseNode.value;
  const morphemes = [...japanese.children];
  morphemes.forEach((wrapperNode) => {
    if (!wrapperNode.classList.contains("choice")) return false;
    const button = wrapperNode.querySelector("button");
    const answer = button.dataset.answer;
    button.disabled = true;
    button.textContent = answer;
    if (course == answer) {
      wrapperNode.classList.add("bg-danger");
    } else {
      wrapperNode.classList.remove("bg-danger");
    }
  });
  answerButton.disabled = true;
  setTimeout(() => {
    answerButton.disabled = false;
    nextProblem();
  }, 5000);
}

loadProblems();

document.getElementById("toggleDarkMode").onclick = toggleDarkMode;
document.getElementById("toggleBGM").onclick = toggleBGM;
document.getElementById("courseOption").onchange = setProblemCache;
document.getElementById("startButton").onclick = startGame;
document.getElementById("answerButton").onclick = showAnswer;
document.addEventListener("click", unlockAudio, {
  once: true,
  useCapture: true,
});
