const playPanel=document.getElementById("playPanel"),infoPanel=document.getElementById("infoPanel"),countPanel=document.getElementById("countPanel"),scorePanel=document.getElementById("scorePanel"),japanese=document.getElementById("japanese"),gameTime=120;let gameTimer;const bgm=new Audio("mp3/bgm.mp3");bgm.volume=.1,bgm.loop=!0;let solvedCount=0,problemCount=0,correctCount=0,incorrectCount=0,targetProblems=[],problems=[];const audioContext=new AudioContext,audioBufferCache={};loadAudio("end","mp3/end.mp3"),loadAudio("correct","mp3/correct3.mp3"),loadAudio("incorrect","mp3/cat.mp3"),loadConfig();function loadConfig(){localStorage.getItem("darkMode")==1&&(document.documentElement.dataset.theme="dark"),localStorage.getItem("bgm")!=1&&(document.getElementById("bgmOn").classList.add("d-none"),document.getElementById("bgmOff").classList.remove("d-none"))}function toggleBGM(){localStorage.getItem("bgm")==1?(document.getElementById("bgmOn").classList.add("d-none"),document.getElementById("bgmOff").classList.remove("d-none"),localStorage.setItem("bgm",0),bgm.pause()):(document.getElementById("bgmOn").classList.remove("d-none"),document.getElementById("bgmOff").classList.add("d-none"),localStorage.setItem("bgm",1),bgm.play())}function toggleDarkMode(){localStorage.getItem("darkMode")==1?(localStorage.setItem("darkMode",0),delete document.documentElement.dataset.theme):(localStorage.setItem("darkMode",1),document.documentElement.dataset.theme="dark")}async function playAudio(b,c){const d=await loadAudio(b,audioBufferCache[b]),a=audioContext.createBufferSource();if(a.buffer=d,c){const b=audioContext.createGain();b.gain.value=c,b.connect(audioContext.destination),a.connect(b),a.start()}else a.connect(audioContext.destination),a.start()}async function loadAudio(a,c){if(audioBufferCache[a])return audioBufferCache[a];const d=await fetch(c),e=await d.arrayBuffer(),b=await audioContext.decodeAudioData(e);return audioBufferCache[a]=b,b}function unlockAudio(){audioContext.resume()}async function loadProblems(){const a=await fetch(`problems.json`),b=await a.json();problems=b,setProblemCache()}function nextProblem(){solvedCount=0,setProblem()}function getRandomInt(a,b){return a=Math.ceil(a),b=Math.floor(b),Math.floor(Math.random()*(b-a))+a}function kanaToHira(a){return a.replace(/[\u30a1-\u30f6]/g,a=>{const b=a.charCodeAt(0)-96;return String.fromCharCode(b)})}function getFuriganaHTML(b){let a="";const c=getFuriganas(b);return c?c.forEach(b=>{b[1]?a+=`<ruby>${b[0]}<rt>${b[1]}</rt></ruby>`:a+=`<span>${b[0]}</span>`}):a+=`<span>${b.surface}</span>`,a}function getFuriganas(c){const b=c.reading;if(!b)return void 0;const a=c.surface;if(a==b)return void 0;const d=kanaToHira(a),e=kanaToHira(b);if(d==e)return void 0;const g=d.replaceAll(/[一-龠々ヵヶ]+/g,"([ぁ-ん]+)"),h=new RegExp(g),i=e.match(h).slice(1),f=new Map,j=a.match(/([一-龠々ヵヶ]+)/g);j.forEach((a,b)=>{f.set(a,i[b])});const k=a.split(/([一-龠々ヵヶ]+)/g).filter(a=>a!=""),l=k.map(a=>{const b=f.get(a);return b?[a,b]:[a,void 0]});return l}function mergePOS(a){const b=document.getElementById("gradeOption"),d=b.options[b.selectedIndex],c=d.value;return c!="大人"&&(a=mergeAdjectiveVerbs(a)),c=="小学生"&&(a=mergeAuxiliaryVerbs(a)),a}function mergeAuxiliaryVerbs(c){const a=[];let b=!1;return c.forEach((d,f)=>{const e=c[f+1];if(d.feature=="動詞"&&e&&e.feature=="助動詞"){b=!0;const c={feature:"動詞",surface:d.surface+e.surface,reading:d.reading+e.reading,featureDetails:d.featureDetails,conjugationForms:d.conjugationForms};a.push(c)}else b?b=!1:a.push(d)}),a}function mergeAdjectiveVerbs(c){const a=[];let b=!1;return c.forEach((e,f)=>{const d=c[f+1];if(e.featureDetails[0]=="形容動詞語幹"&&d&&d.feature=="助動詞"){b=!0;const c={feature:"形容動詞",surface:e.surface+d.surface,reading:e.surface+d.reading,featureDetails:["*","*","*"],conjugationForms:d.conjugationForms};a.push(c)}else b?b=!1:a.push(e)}),a}function setSearchingChoice(d,c,b){b.className="btn btn-light btn-lg m-1 px-2 choice";const e=document.createElement("div"),f=getFuriganaHTML(c),g=(new DOMParser).parseFromString(f,"text/html"),h=[...g.body.childNodes];e.replaceChildren(...h);const a=document.createElement("button");a.textContent=d+"？",a.className="btn btn-sm btn-primary",a.dataset.answer=c.feature,a.onclick=()=>{d==c.feature?(correctCount+=1,b.classList.add("border","border-primary"),a.textContent=d,playAudio("correct"),solvedCount+=1,problemCount<=solvedCount&&nextProblem()):(incorrectCount+=1,b.classList.add("bg-danger"),a.textContent=c.feature,playAudio("incorrect")),a.disabled=!0},b.appendChild(e),b.appendChild(a)}function setProblemCache(){const a=document.getElementById("courseOption"),c=a.options[a.selectedIndex],b=c.value;b=="形容動詞"?targetProblems=problems.filter(a=>a.find((c,d)=>{const b=a[d+1];if(c.featureDetails[0]=="形容動詞語幹"&&b&&b.feature=="助動詞")return!0})):targetProblems=problems.filter(a=>a.find(a=>a.feature==b))}function setProblem(){const c=document.getElementById("courseOption"),f=c.options[c.selectedIndex],a=f.value;document.getElementById("explanation").textContent=`${a}を選んでください`;let b=targetProblems[getRandomInt(0,targetProblems.length)];b=mergePOS(b);const d=[];let e=0;b.forEach(b=>{const c=document.createElement("div");switch(b.feature){case"フィラー":case"間投詞":case"記号":c.className="btn btn-light btn-lg m-1 px-2",c.textContent=b.surface;break;default:setSearchingChoice(a,b,c),a==b.feature&&(e+=1)}d.push(c)}),problemCount=e,japanese.replaceChildren(...d)}function countdown(){correctCount=incorrectCount=0,countPanel.classList.remove("d-none"),infoPanel.classList.add("d-none"),playPanel.classList.add("d-none"),scorePanel.classList.add("d-none"),counter.textContent=3;const a=setInterval(()=>{const b=document.getElementById("counter"),c=["skyblue","greenyellow","violet","tomato"];if(parseInt(b.textContent)>1){const a=parseInt(b.textContent)-1;b.style.backgroundColor=c[a],b.textContent=a}else clearInterval(a),countPanel.classList.add("d-none"),infoPanel.classList.remove("d-none"),playPanel.classList.remove("d-none"),setProblem(),startGameTimer(),localStorage.getItem("bgm")==1&&bgm.play()},1e3)}function startGame(){clearInterval(gameTimer),initTime(),countdown()}function startGameTimer(){const a=document.getElementById("time");gameTimer=setInterval(()=>{const b=parseInt(a.textContent);b>0?a.textContent=b-1:(clearInterval(gameTimer),bgm.pause(),playAudio("end"),playPanel.classList.add("d-none"),scorePanel.classList.remove("d-none"),scoring())},1e3)}function initTime(){document.getElementById("time").textContent=gameTime}function scoring(){document.getElementById("score").textContent=correctCount,document.getElementById("count").textContent=correctCount+incorrectCount}function showAnswer(){const a=document.getElementById("courseOption"),b=a.options[a.selectedIndex],c=b.value,d=[...japanese.children];d.forEach(a=>{if(!a.classList.contains("choice"))return!1;const b=a.querySelector("button"),d=b.dataset.answer;b.disabled=!0,b.textContent=d,c==d?a.classList.add("bg-danger"):a.classList.remove("bg-danger")}),answerButton.disabled=!0,setTimeout(()=>{answerButton.disabled=!1,nextProblem()},5e3)}loadProblems(),document.getElementById("toggleDarkMode").onclick=toggleDarkMode,document.getElementById("toggleBGM").onclick=toggleBGM,document.getElementById("courseOption").onchange=setProblemCache,document.getElementById("startButton").onclick=startGame,document.getElementById("answerButton").onclick=showAnswer,document.addEventListener("click",unlockAudio,{once:!0,useCapture:!0})