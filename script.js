const NUM_SCALES = 24; //音階数
const NUM_NOTES = 25;  //鍵盤数
let currentQuestion = 0;
let correctAnswers = 0;
let mode = "single";
let correctNoteIndices = [];

const context = new (window.AudioContext || window.webkitAudioContext)();

function startQuiz(selectedMode) {
  mode = selectedMode;
  currentQuestion = 0;
  correctAnswers = 0;
  document.getElementById('mode-select').style.display = 'none';
  document.getElementById('quiz').style.display = 'block';
  document.getElementById('result').style.display = 'none';
  document.getElementById('history').innerText = '';
  generateKeyboard();
  nextQuestion();
}

function generateKeyboard() {
  const noteNames = ["ド(C4)", "ド♯", "レ", "レ♯", "ミ", "ファ", "ファ♯", "ソ", "ソ♯", "ラ", "ラ♯", "シ", "ド(C5)"];
  const keyboard = document.getElementById("keyboard");
  keyboard.innerHTML = '';

  for (let i = 0; i < NUM_NOTES; i++) {
    const key = document.createElement('div');
    key.className = 'key';

    if (i % 2 === 0) {
      const semitoneIndex = i / 2;
      const noteName = noteNames[semitoneIndex % 12];
      key.innerText = noteName;
      key.title = `index ${i}`;
    } else {
      key.innerText = i.toString();
    }

    key.onclick = () => checkAnswer(i);
    keyboard.appendChild(key);
  }
}

function nextQuestion() {
  currentQuestion++;
  document.getElementById("question-number").innerText = `第${currentQuestion}問 / 10`;
  userSelections = [];
  correctNoteIndices = [];

  const numNotes = mode === 'single' ? 1 : mode === 'double' ? 2 : 3;
  while (correctNoteIndices.length < numNotes) {
    const rand = Math.floor(Math.random() * NUM_NOTES);
    if (!correctNoteIndices.includes(rand)) correctNoteIndices.push(rand);
  }

  // キーボードの選択ハイライトをクリア
  const keys = document.querySelectorAll(".key");
  keys.forEach(key => key.classList.remove('selected-key'));

  playQuestion();
}

function playQuestion() {
  const now = context.currentTime;
  correctNoteIndices.forEach((noteIndex, i) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';

    const freq = 440 * Math.pow(2, (noteIndex - (NUM_SCALES / 12) * 9) / NUM_SCALES);
    osc.frequency.value = freq;
    gain.gain.value = 0.3;

    osc.connect(gain).connect(context.destination);
    osc.start(now + i * 0.05);
    osc.stop(now + 1 + i * 0.05);
  });
}

function playEffect(correct) {
  const osc1 = context.createOscillator();
  const osc2 = correct ? context.createOscillator() : null;
  const gain = context.createGain();

  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.2, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5);

  if (correct) {
    // 「ピンポン！」っぽい2音
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, context.currentTime); // ピン
    osc1.connect(gain);
    osc1.start(context.currentTime);
    osc1.stop(context.currentTime + 0.2);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(660, context.currentTime + 0.2); // ポン
    osc2.connect(gain);
    osc2.start(context.currentTime + 0.2);
    osc2.stop(context.currentTime + 0.4);
  } else {
    // 「ブー」っぽい1音（低めでブザー風）
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(150, context.currentTime);
    osc1.connect(gain);
    osc1.start(context.currentTime);
    osc1.stop(context.currentTime + 0.5);
  }
}


function updateHistory(correct) {
  const history = document.getElementById("history");
  const span = document.createElement("span");
  span.textContent = correct ? "〇" : "✖";
  span.style.color = correct ? "green" : "red";
  span.style.marginRight = "5px";
  history.appendChild(span);
}

function highlightCorrectKeys() {
  const keys = document.querySelectorAll(".key");
  correctNoteIndices.forEach(i => {
    keys[i].classList.add("correct-key");
  });

  setTimeout(() => {
    correctNoteIndices.forEach(i => {
      keys[i].classList.remove("correct-key");
    });
    if (currentQuestion >= 10) {
      endQuiz();
    } else {
      nextQuestion();
    }
  }, 500);
}

let userSelections = [];

function checkAnswer(index) {
  const keys = document.querySelectorAll(".key");

  const selectedIndex = userSelections.indexOf(index);
  if (selectedIndex === -1) {
    // 選択されていなければ追加
    userSelections.push(index);
    keys[index].classList.add('selected-key');
  } else {
    // すでに選択されていれば解除
    userSelections.splice(selectedIndex, 1);
    keys[index].classList.remove('selected-key');
  }

  const numNotes = mode === 'single' ? 1 : mode === 'double' ? 2 : 3;

  if (userSelections.length === numNotes) {
    // 判定
    const sortedUser = userSelections.slice().sort((a,b) => a-b);
    const sortedCorrect = correctNoteIndices.slice().sort((a,b) => a-b);
    const isCorrect = sortedUser.length === sortedCorrect.length && sortedUser.every((v,i) => v === sortedCorrect[i]);

    if (isCorrect) correctAnswers++;

    playEffect(isCorrect);
    updateHistory(isCorrect);
    highlightCorrectKeys();

    // 次の問題に行く前に選択リセットしてUIもクリア
    userSelections = [];
    keys.forEach(key => key.classList.remove('selected-key'));
  }
}

function endQuiz() {
  document.getElementById('quiz').style.display = 'none';
  const result = document.getElementById('result');
  result.style.display = 'block';

  let modeText = "";
  if (mode === "single") modeText = "単音モード";
  else if (mode === "double") modeText = "2音モード";
  else if (mode === "triple") modeText = "3音モード";

  let levelText = "";
  const score = correctAnswers;
  if (mode == "single") {
    if (score === 10) levelText = "あなたは完璧な単音識別マスターです！";
    else if (score >= 7) levelText = "単音の聞き分けがとても上手ですね！";
    else if (score >= 4) levelText = "単音識別、頑張りましたね！";
    else levelText = "単音識別は難しいですが、練習で上達します！";
  }
  else if (mode == "double") {
    if (score === 10) levelText = "2音識別のプロフェッショナルですね！";
    else if (score >= 7) levelText = "2音の聞き分けがかなり得意です！";
    else if (score >= 4) levelText = "2音クイズ、よく頑張りました！";
    else levelText = "2音識別は難しいので、挑戦し続けてください！";
  }
  else if (mode == "triple") {
    if (score === 10) levelText = "3音識別の天才です！称賛に値します！";
    else if (score >= 7) levelText = "3音の聞き分けがかなり優秀です！";
    else if (score >= 4) levelText = "3音識別に挑戦してすごいです！";
    else levelText = "3音は難関ですが、諦めずに挑戦しましょう！";
  }
  result.innerHTML = `${modeText} の結果<br>✅ 正解数：${correctAnswers} / 10<br>${levelText}<br>`;

  const backButton = document.createElement('button');
  backButton.innerText = "モード選択画面に戻る";
  backButton.onclick = () => {
    result.style.display = 'none';
    document.getElementById('mode-select').style.display = 'block';
  };
  result.appendChild(backButton);

  const postButton = document.createElement('button');
  postButton.innerText = "Xに投稿する";
  postButton.style.marginLeft = "10px";

  postButton.onclick = () => {
    const score = correctAnswers;
    const text = `${modeText}で10問中${score}問正解！ #${NUM_SCALES}音階当てクイズ\nhttps://startcpp.github.io/microtonal-quiz/`;
    const url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
    window.open(url, '_blank');
  };
  result.appendChild(postButton);
}
