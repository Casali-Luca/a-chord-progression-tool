export function renderScaleMiniSheet(containerId, rootKey, selectedModeKey, accidentalMode, selectedClef, baseOctave, VF, noteToPitch, pitchToVexSharp, pitchToVexFlat, modeDefinitions) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const modeData = modeDefinitions[selectedModeKey] || modeDefinitions.ionian;
    const rootP = noteToPitch[rootKey] ?? 0;
    const pitchMap = (accidentalMode === 'flat') ? pitchToVexFlat : pitchToVexSharp;

    let currentOctave = baseOctave;
    let prevPitchValue = -1;

    const scaleNotes = modeData.intervals.map(interval => {
        const absPitch = rootP + interval;
        const noteIdx = absPitch % 12;
        const rawNote = pitchMap[noteIdx];

        if (prevPitchValue !== -1 && noteIdx < prevPitchValue) {
            currentOctave++;
        }
        prevPitchValue = noteIdx;

        let accidental = null;
        if (rawNote.includes('#')) {
            accidental = '#';
        } else if (rawNote.length > 1 && rawNote.endsWith('b')) {
            accidental = 'b';
        }

        return { key: `${rawNote}/${currentOctave}`, accidental };
    });

    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(400, 110);
    const context = renderer.getContext();

    const stave = new VF.Stave(10, 0, 380);
    stave.addClef(selectedClef).setContext(context).draw();

    const vexNotes = scaleNotes.map(nObj => {
        const sn = new VF.StaveNote({ keys: [nObj.key], duration: "q", clef: selectedClef });
        if (nObj.accidental) sn.addModifier(new VF.Accidental(nObj.accidental), 0);
        return sn;
    });

    const voice = new VF.Voice({ num_beats: 7, beat_value: 4 });
    voice.addTickables(vexNotes);

    const formatter = new VF.Formatter();
    if (typeof formatter.joinAndFormat === 'function') {
        formatter.joinAndFormat([voice], 300);
    } else {
        formatter.format([voice], 300);
    }
    voice.draw(context, stave);
}
