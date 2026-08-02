document.addEventListener('DOMContentLoaded', () => {
    const chordsContainer = document.getElementById('chords-container');
    const addChordBtn = document.getElementById('add-chord-btn');
    const generateBtn = document.getElementById('generate-btn');
    const sheetsContainer = document.getElementById('sheets-container');
    const clearBtn = document.getElementById('clear-btn');
    const presetBtns = document.querySelectorAll('.btn-preset[data-preset]');
    const noteToPitch = {
        'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
        'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
        'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    const pitchToVex = [
        "c", "c#", "d", "eb", "e", "f", "f#", "g", "g#", "a", "bb", "b"
    ];
    const availableDegrees = [
        { label: "I", semi: 0, quality: "maj" },
        { label: "ii", semi: 2, quality: "min" },
        { label: "bIII", semi: 3, quality: "maj" },
        { label: "iii", semi: 4, quality: "min" },
        { label: "IV", semi: 5, quality: "maj" },
        { label: "V", semi: 7, quality: "maj" },
        { label: "vi", semi: 9, quality: "min" },
        { label: "bVI", semi: 8, quality: "maj" },
        { label: "bVII", semi: 10, quality: "maj" },
        { label: "vii°", semi: 11, quality: "dim" }
    ];
    const chordTypes = [
        { label: "Triade (std)", ext: [0, 4, 7], extMin: [0, 3, 7], extDim: [0, 3, 6] },
        { label: "7a (Dominante / Maj7)", ext: [0, 4, 7, 10], extMin: [0, 3, 7, 10], extDim: [0, 3, 6, 9] },
        { label: "Maj7", ext: [0, 4, 7, 11], extMin: [0, 3, 7, 11], extDim: [0, 3, 6, 10] },
        { label: "Sus4", ext: [0, 5, 7], extMin: [0, 5, 7], extDim: [0, 5, 7] }
    ];
    function createChordElement(defaultDegree = "I", defaultType = 0) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chord-tag';
        const degreeSelect = document.createElement('select');
        degreeSelect.className = 'degree-select';
        availableDegrees.forEach((deg, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = deg.label;
            if (deg.label === defaultDegree) opt.selected = true;
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
        list.forEach(item => {
            createChordElement(item.degree, item.type || 0);
        });
    }
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const presetStr = btn.dataset.preset;
            if (!presetStr) return;
            const degrees = presetStr.split(',');
            const list = degrees.map(d => ({ degree: d, type: 0 }));
            loadProgression(list);
        });
    });
    clearBtn.addEventListener('click', () => {
        chordsContainer.innerHTML = '';
    });
    addChordBtn.addEventListener('click', () => createChordElement("I", 0));
    loadProgression([
        { degree: "ii", type: 0 },
        { degree: "V", type: 0 },
        { degree: "I", type: 0 }
    ]);
    generateBtn.addEventListener('click', () => {
    sheetsContainer.innerHTML = '';
    const rootKey = document.getElementById('key-select').value;
    const rootPitch = noteToPitch[rootKey] ?? 0;
    const selectedClef = document.getElementById('clef-select').value;
    const chordTags = document.querySelectorAll('.chord-tag');
    const baseOctave = (selectedClef === 'bass') ? 2 : 4;
    if (chordTags.length === 0) {
        alert('Inserisci almeno un grado!');
        return;
    }
    const VF = window.Vex ? window.Vex.Flow : null;
    if (!VF) {
        alert("Errore nel caricamento di VexFlow.");
        return;
    }
    chordTags.forEach((tag, index) => {
        try {
            const degIdx = parseInt(tag.querySelector('.degree-select').value);
            const typeIdx = parseInt(tag.querySelector('.type-select').value);
            const degInfo = availableDegrees[degIdx];
            const typeInfo = chordTypes[typeIdx];
            let intervals = typeInfo.ext;
            if (degInfo.quality === "min") intervals = typeInfo.extMin;
            if (degInfo.quality === "dim") intervals = typeInfo.extDim;
            const parsedNotes = intervals.map(interval => {
            const absolutePitch = rootPitch + degInfo.semi + interval;
            const noteIndex = absolutePitch % 12;
            const octave = baseOctave + Math.floor(absolutePitch / 12);
            const rawNote = pitchToVex[noteIndex];
            let accidental = null;
            if (rawNote.includes('#')) accidental = '#';
            else if (rawNote.includes('b')) accidental = 'b';
            return {
                absolutePitch: absolutePitch,
                key: `${rawNote}/${octave}`,
                accidental: accidental
            };
        });
            parsedNotes.sort((a, b) => a.absolutePitch - b.absolutePitch);
            const vexKeys = parsedNotes.map(n => n.key);
            const chordRootPitch = (rootPitch + degInfo.semi) % 12;
            const chordRootName = pitchToVex[chordRootPitch].toUpperCase();
            const card = document.createElement('div');
            card.className = 'sheet-card';
            const title = document.createElement('h3');
            title.textContent = `Spartito ${index + 1}: Grado [ ${degInfo.label} ] — ${chordRootName} (${degInfo.quality})`;
            card.appendChild(title);
            const divCanvas = document.createElement('div');
            divCanvas.id = `sheet-${index}`;
            card.appendChild(divCanvas);
            sheetsContainer.appendChild(card);
            const renderer = new VF.Renderer(divCanvas, VF.Renderer.Backends.SVG);
            renderer.resize(450, 130);
            const context = renderer.getContext();
            const stave = new VF.Stave(30, 10, 400);
            stave.addClef(selectedClef);
            stave.setContext(context).draw();
            const staveNote = new VF.StaveNote({
                keys: vexKeys,
                duration: "w",
                clef: selectedClef
            });
            parsedNotes.forEach((noteObj, idx) => {
                if (noteObj.accidental) {
                    staveNote.addModifier(new VF.Accidental(noteObj.accidental), idx);
                }
            });
const voice = new VF.Voice({ num_beats: 4, beat_value: 4 });
voice.addTickables([staveNote]);
const formatter = new VF.Formatter();
if (typeof formatter.joinAndFormat === 'function') {
    formatter.joinAndFormat([voice], 300);
} else {
    formatter.format([voice], 300);
}
voice.draw(context, stave);        } catch (err) {
            console.error(`Errore nel rendering dello spartito ${index + 1}:`, err);
        }
    });
});
});
