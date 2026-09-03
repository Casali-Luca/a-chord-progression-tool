let audioCtx = null;
let bpm = 120;
let beatsPerMeasure = 9;
let timeSignatureBase = 8;
let currentBeat = 0;
let isRunning = false;
let timerId = null;
let beatAccents = [];
const bpmInput = document.getElementById('bpm');
const bpmVal = document.getElementById('bpmVal');
const beatsInput = document.getElementById('beats');
const baseInput = document.getElementById('base');
const accentGrid = document.getElementById('accentGrid');
const startStopBtn = document.getElementById('startStop');
function updateAccentGrid() {
    beatsPerMeasure = parseInt(beatsInput.value);
    while (beatAccents.length < beatsPerMeasure) {
    beatAccents.push(beatAccents.length === 0 ? 'high' : 'low');
    }
    beatAccents = beatAccents.slice(0, beatsPerMeasure);
    accentGrid.innerHTML = '';
    beatAccents.forEach((accent, index) => {
    const btn = document.createElement('button');
    btn.className = `accent-btn ${accent}`;
    btn.innerText = index + 1;
    btn.id = `beat-btn-${index}`;
    btn.onclick = () => {
        if (beatAccents[index] === 'high') beatAccents[index] = 'low';
        else if (beatAccents[index] === 'low') beatAccents[index] = 'mute';
        else beatAccents[index] = 'high';
        btn.className = `accent-btn ${beatAccents[index]}`;
    };
    accentGrid.appendChild(btn);
    });
}
function playTone(accentType, time) {
    if (accentType === 'mute') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = accentType === 'high' ? 880 : 440;
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
}
function highlightBeat(beatIndex) {
    document.querySelectorAll('.accent-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`beat-btn-${beatIndex}`);
    if (activeBtn) activeBtn.classList.add('active');
}
function nextTick() {
    if (!isRunning) return;
    playTone(beatAccents[currentBeat], audioCtx.currentTime);
    highlightBeat(currentBeat);
    currentBeat = (currentBeat + 1) % beatsPerMeasure;
    const intervalInSeconds = (60 / bpm) * (4 / timeSignatureBase);
    timerId = setTimeout(nextTick, intervalInSeconds * 1000);
}
function toggleMetronome() {
    if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
            audioCtx.resume();
    }
    if (isRunning) {
    isRunning = false;
    clearTimeout(timerId);
    startStopBtn.innerText = 'Start';
    startStopBtn.classList.remove('running');
    document.querySelectorAll('.accent-btn').forEach(btn => btn.classList.remove('active'));
    } else {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    isRunning = true;
    currentBeat = 0;
    startStopBtn.innerText = 'Stop';
    startStopBtn.classList.add('running');
    nextTick();
    }
}
bpmInput.oninput = (e) => {
    bpm = parseInt(e.target.value);
    bpmVal.innerText = bpm;
};
beatsInput.onchange = () => {
    updateAccentGrid();
};
baseInput.onchange = (e) => {
    timeSignatureBase = parseInt(e.target.value);
};
startStopBtn.onclick = toggleMetronome;
updateAccentGrid();
