import { getTabPositionsHumanized } from './tablature.js';

export function renderScaleMiniSheet(
    containerId, 
    rootKey, 
    selectedModeKey, 
    accidentalMode, 
    selectedClef, 
    baseOctave, 
    tuningMode, 
    VF, 
    noteToPitch, 
    pitchToVexSharp, 
    pitchToVexFlat, 
    modeDefinitions
) {
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

        return {
            pitchIndex: noteIdx,
            absolutePitch: absPitch,
            key: `${rawNote}/${currentOctave}`,
            octave: currentOctave,
            accidental: accidental
        };
    });

    const renderHeight = (tuningMode !== 'notes') ? 150 : 110;
    const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
    renderer.resize(420, renderHeight);
    const context = renderer.getContext();

    if (tuningMode === 'notes') {
        // Pentagramma Standard
        const stave = new VF.Stave(10, 0, 400);
        stave.addClef(selectedClef).setContext(context).draw();

        const vexNotes = scaleNotes.map(nObj => {
            const sn = new VF.StaveNote({ keys: [nObj.key], duration: "q", clef: selectedClef });
            if (nObj.accidental) sn.addModifier(new VF.Accidental(nObj.accidental), 0);
            return sn;
        });

        const voice = new VF.Voice({ num_beats: scaleNotes.length, beat_value: 4 });
        voice.addTickables(vexNotes);

        const formatter = new VF.Formatter();
        if (typeof formatter.joinAndFormat === 'function') {
            formatter.joinAndFormat([voice], 320);
        } else {
            formatter.format([voice], 320);
        }
        voice.draw(context, stave);

    } else {
        // Tablatura
        const strings = tuningMode.split(',');
        const tabStave = new VF.TabStave(10, 10, 400);
        tabStave.setNumLines(strings.length);
        tabStave.setContext(context).draw();

        const vexTabNotes = scaleNotes.map(nObj => {
            const positions = getTabPositionsHumanized([nObj], strings, noteToPitch);
            // Fallback se l'algoritmo non trova una posizione valida sulla tastiera
            const validPositions = (positions && positions.length > 0) ? positions : [{ str: 1, fret: 0 }];
            return new VF.TabNote({ positions: validPositions, duration: "q" });
        });

        const voice = new VF.Voice({ num_beats: scaleNotes.length, beat_value: 4 });
        voice.addTickables(vexTabNotes);

        const formatter = new VF.Formatter();
        if (typeof formatter.joinAndFormat === 'function') {
            formatter.joinAndFormat([voice], 320);
        } else {
            formatter.format([voice], 320);
        }
        voice.draw(context, tabStave);
    }
}
