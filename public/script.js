import { renderScaleMiniSheet } from './scale-info.js';
import { getTabPositionsHumanized } from './tablature.js';
document.addEventListener('DOMContentLoaded', async () => {
    let modeDefinitions = {};
    let modePresets = {};
    try {
        const [modesRes, presetsRes] = await Promise.all([
            fetch('./modes.json'),
            fetch('./presets.json')
        ]);
        modeDefinitions = await modesRes.json();
        modePresets = await presetsRes.json();
    } catch (err) {
        console.error("Errore nel caricamento dei dati JSON:", err);
        return;
    }
    const chordsContainer = document.getElementById('chords-container');
    const addChordBtn = document.getElementById('add-chord-btn');
    const generateBtn = document.getElementById('generate-btn');
    const sheetsContainer = document.getElementById('sheets-container');
    const clearBtn = document.getElementById('clear-btn');
    const presetBtns = document.querySelectorAll('.btn-preset[data-preset]');
    const modeSelectElem = document.getElementById('mode-select');
    const noteToPitch = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
        'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
        'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    const pitchToVexSharp = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
    const pitchToVexFlat  = ["c", "db", "d", "eb", "e", "f", "gb", "g", "ab", "a", "bb", "b"];
    const chordTypes = [
        { label: "Triade (std)", ext: [0, 4, 7], extMin: [0, 3, 7], extDim: [0, 3, 6] },
        { label: "7a (Dominante / Maj7)", ext: [0, 4, 7, 10], extMin: [0, 3, 7, 10], extDim: [0, 3, 6, 9] },
        { label: "Maj7", ext: [0, 4, 7, 11], extMin: [0, 3, 7, 11], extDim: [0, 3, 6, 10] },
        { label: "Sus4", ext: [0, 5, 7], extMin: [0, 5, 7], extDim: [0, 5, 7] }
    ];
    function getCurrentModeDegrees() {
        const selectedModeKey = modeSelectElem?.value || 'ionian';
        return modeDefinitions[selectedModeKey]?.degrees || modeDefinitions.ionian.degrees;
    }
    function updateChordSelectors() {
        const degrees = getCurrentModeDegrees();
        const selectors = document.querySelectorAll('.degree-select');
        selectors.forEach(sel => {
            const currentVal = sel.value;
            sel.innerHTML = '';
            degrees.forEach((deg, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = deg.label;
                sel.appendChild(opt);
            });
            if (currentVal < degrees.length) sel.value = currentVal;
        });
    }
    function createChordElement(defaultDegreeIdx = 0, defaultType = 0) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chord-tag';
        const degreeSelect = document.createElement('select');
        degreeSelect.className = 'degree-select';
        const degrees = getCurrentModeDegrees();
        degrees.forEach((deg, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = deg.label;
            if (idx === defaultDegreeIdx) opt.selected = true;
            degreeSelect.appendChild(opt);
        });
        const typeSelect = document.createElement('select');
        typeSelect.className = 'type-select';
        chordTypes.forEach((type, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = type.label;
            if (idx === defaultType) opt.selected = true;
            typeSelect.appendChild(opt);
        });
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => wrapper.remove());
        wrapper.appendChild(degreeSelect);
        wrapper.appendChild(typeSelect);
        wrapper.appendChild(removeBtn);
        chordsContainer.appendChild(wrapper);
    }
    function loadProgression(list) {
        chordsContainer.innerHTML = '';
        list.forEach((item) => {
            createChordElement(item.degreeIdx || 0, item.type || 0);
        });
    }
    function resetCustomChordUI() {
        chordsContainer.style.display = 'flex';
        if (addChordBtn) addChordBtn.style.display = 'inline-block';
        if (clearBtn) clearBtn.style.display = 'inline-block';
    }
    if (modeSelectElem) {
        modeSelectElem.addEventListener('change', () => {
            updateChordSelectors();
            resetCustomChordUI();
        });
    }
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const presetStyle = btn.dataset.preset;
            const selectedMode = modeSelectElem?.value || 'ionian';
            const presetsForMode = modePresets[selectedMode] || modePresets.ionian;
            const targetProgression = presetsForMode[presetStyle] || presetsForMode.pop;
            if (targetProgression) {
                loadProgression(targetProgression);
            }
        });
    });
    clearBtn.addEventListener('click', () => {
        chordsContainer.innerHTML = '';
        resetCustomChordUI();
    });
    addChordBtn.addEventListener('click', () => {
        resetCustomChordUI();
        createChordElement(0, 0);
    });
    loadProgression([{ degreeIdx: 0 }, { degreeIdx: 3 }, { degreeIdx: 4 }]);
    generateBtn.addEventListener('click', () => {
        sheetsContainer.innerHTML = '';
        const rootKey = document.getElementById('key-select').value;
        const rootPitch = noteToPitch[rootKey] ?? 0;
        const selectedModeKey = modeSelectElem?.value || 'ionian';
        const selectedClef = document.getElementById('clef-select').value;
        const accidentalMode = document.getElementById('accidental-select').value;
        const tuningMode = document.getElementById('tuning-select').value;
        const chordTags = document.querySelectorAll('.chord-tag');
        const baseOctave = (selectedClef === 'bass') ? 2 : 4;
        if (chordTags.length === 0) {
            alert('Inserisci almeno un grado!');
            return;
        }
        const VF = window.Vex ? window.Vex.Flow : null;
        if (!VF) return;
        const currentModeDegrees = modeDefinitions[selectedModeKey].degrees;
        const pitchMap = (accidentalMode === 'flat') ? pitchToVexFlat : pitchToVexSharp;
        chordTags.forEach((tag, index) => {
            try {
                const degIdx = parseInt(tag.querySelector('.degree-select').value);
                const typeIdx = parseInt(tag.querySelector('.type-select').value);
                const degInfo = currentModeDegrees[degIdx] || currentModeDegrees[0];
                const typeInfo = chordTypes[typeIdx];
                let intervals = typeInfo.ext;
                if (degInfo.quality === "min") intervals = typeInfo.extMin;
                if (degInfo.quality === "dim") intervals = typeInfo.extDim;
                const parsedNotes = intervals.map(interval => {
                    const absolutePitch = rootPitch + degInfo.semi + interval;
                    const noteIndex = absolutePitch % 12;
                    const octave = baseOctave + Math.floor(absolutePitch / 12);
                    const rawNote = pitchMap[noteIndex];
                    let accidental = null;
                    if (rawNote.includes('#')) {
                        accidental = '#';
                    } else if (rawNote.length > 1 && rawNote.endsWith('b')) {
                        accidental = 'b';
                    }
                    return {
                        pitchIndex: noteIndex,
                        absolutePitch: absolutePitch,
                        key: `${rawNote}/${octave}`,
                        octave: octave,
                        accidental: accidental
                    };
                });
                parsedNotes.sort((a, b) => a.absolutePitch - b.absolutePitch);
                const vexKeys = parsedNotes.map(n => n.key);
                const chordRootPitch = (rootPitch + degInfo.semi) % 12;
                const chordRootName = pitchMap[chordRootPitch].toUpperCase();
                const card = document.createElement('div');
                card.className = 'sheet-card';
                const cardHeader = document.createElement('div');
                cardHeader.style.display = 'flex';
                cardHeader.style.justifyContent = 'space-between';
                cardHeader.style.alignItems = 'center';
                const title = document.createElement('h3');
                title.textContent = `Grado [ ${degInfo.label} ] — ${chordRootName} (${degInfo.quality})`;
                const infoBtn = document.createElement('button');
                infoBtn.className = 'btn btn-outline';
                infoBtn.textContent = `ⓘ Scala ${rootKey} ${modeDefinitions[selectedModeKey].name}`;
                infoBtn.style.padding = '2px 8px';
                infoBtn.style.fontSize = '0.85rem';
                cardHeader.appendChild(title);
                cardHeader.appendChild(infoBtn);
                card.appendChild(cardHeader);
                const miniScaleContainer = document.createElement('div');
                miniScaleContainer.id = `mini-scale-${index}`;
                miniScaleContainer.style.display = 'none';
                miniScaleContainer.style.marginTop = '8px';
                miniScaleContainer.style.padding = '8px';
                miniScaleContainer.style.background = 'rgba(0,0,0,0.03)';
                miniScaleContainer.style.borderRadius = '6px';
                const miniScaleTitle = document.createElement('small');
                miniScaleTitle.style.fontWeight = 'bold';
                miniScaleTitle.textContent = `Alterazioni scala ${rootKey} (${modeDefinitions[selectedModeKey].name}):`;
                miniScaleContainer.appendChild(miniScaleTitle);
                const miniCanvasDiv = document.createElement('div');
                miniCanvasDiv.id = `mini-canvas-${index}`;
                miniScaleContainer.appendChild(miniCanvasDiv);
                card.appendChild(miniScaleContainer);
                const divCanvas = document.createElement('div');
                divCanvas.id = `sheet-${index}`;
                card.appendChild(divCanvas);
                sheetsContainer.appendChild(card);
                infoBtn.addEventListener('click', () => {
                    const isHidden = miniScaleContainer.style.display === 'none';
                    miniScaleContainer.style.display = isHidden ? 'block' : 'none';
                    if (isHidden && miniCanvasDiv.children.length === 0) {
                        renderScaleMiniSheet(`mini-canvas-${index}`, rootKey, selectedModeKey, accidentalMode, selectedClef, baseOctave, VF, noteToPitch, pitchToVexSharp, pitchToVexFlat, modeDefinitions);
                    }
                });
                const renderHeight = (tuningMode !== 'notes') ? 160 : 130;
                const renderer = new VF.Renderer(divCanvas, VF.Renderer.Backends.SVG);
                renderer.resize(450, renderHeight);
                const context = renderer.getContext();
                if (tuningMode === 'notes') {
                    const stave = new VF.Stave(20, 10, 400);
                    stave.addClef(selectedClef).setContext(context).draw();
                    const staveNote = new VF.StaveNote({ keys: vexKeys, duration: "w", clef: selectedClef });
                    parsedNotes.forEach((noteObj, idx) => {
                        if (noteObj.accidental) {
                            staveNote.addModifier(new VF.Accidental(noteObj.accidental), idx);
                        }
                    });
                    const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
                    voice.addTickables([staveNote]);
                    const formatter = new VF.Formatter();
                    if (typeof formatter.joinAndFormat === 'function') {
                        formatter.joinAndFormat([voice], 320);
                    } else {
                        formatter.format([voice], 320);
                    }
                    voice.draw(context, stave);
                } else {
                    const strings = tuningMode.split(',');
                    const tabStave = new VF.TabStave(20, 10, 400);
                    tabStave.setNumLines(strings.length);
                    tabStave.setContext(context).draw();
                    const tabPositions = getTabPositionsHumanized(parsedNotes, strings, noteToPitch);
                    const tabNote = new VF.TabNote({ positions: tabPositions, duration: "w" });
                    const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
                    voice.addTickables([tabNote]);
                    const formatter = new VF.Formatter();
                    if (typeof formatter.joinAndFormat === 'function') {
                        formatter.joinAndFormat([voice], 320);
                    } else {
                        formatter.format([voice], 320);
                    }
                    voice.draw(context, tabStave);
                }
            } catch (err) {
                console.error(`Errore nel rendering dello spartito ${index + 1}:`, err);
            }
        });
    });
});
