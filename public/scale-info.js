import Swiper from 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.mjs';
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
    const mainContainer = document.getElementById(containerId);
    if (!mainContainer) return;
    mainContainer.innerHTML = '';
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
            name: rawNote.toUpperCase(),
            key: `${rawNote}/${currentOctave}`,
            octave: currentOctave,
            accidental: accidental
        };
    });
    const swiperEl = document.createElement('div');
    swiperEl.className = 'swiper mini-scale-swiper';
    const wrapper = document.createElement('div');
    wrapper.className = 'swiper-wrapper';
    for (let i = 0; i < 6; i++) {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';
        slide.id = `${containerId}-slide-${i}`;
        wrapper.appendChild(slide);
    }
    swiperEl.appendChild(wrapper);
    const pagination = document.createElement('div');
    pagination.className = 'swiper-pagination';
    swiperEl.appendChild(pagination);
    mainContainer.appendChild(swiperEl);
    renderVexflowSlide(document.getElementById(`${containerId}-slide-0`), scaleNotes, 'notes', selectedClef, VF);
    renderVexflowSlide(document.getElementById(`${containerId}-slide-1`), scaleNotes, 'E,A,D,G,B,E', selectedClef, VF, noteToPitch);
    renderVexflowSlide(document.getElementById(`${containerId}-slide-2`), scaleNotes, 'E,A,D,G', selectedClef, VF, noteToPitch);
    renderPianoSVG(document.getElementById(`${containerId}-slide-3`), scaleNotes);
    renderFretboardSVG(document.getElementById(`${containerId}-slide-4`), scaleNotes, [4, 9, 2, 7, 11, 4], 12, true);
    renderFretboardSVG(document.getElementById(`${containerId}-slide-5`), scaleNotes, [4, 9, 2, 7], 12, false);
    new Swiper(swiperEl, {
        slidesPerView: 1,
        spaceBetween: 10,
        pagination: {
            el: pagination,
            clickable: true,
        },
    });
}
function renderVexflowSlide(targetEl, scaleNotes, tMode, selectedClef, VF, noteToPitch) {
    const renderer = new VF.Renderer(targetEl, VF.Renderer.Backends.SVG);
    renderer.resize(420, 120);
    const context = renderer.getContext();
    if (tMode === 'notes') {
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
        const strings = tMode.split(',');
        const tabStave = new VF.TabStave(10, 0, 400);
        tabStave.setNumLines(strings.length);
        tabStave.setContext(context).draw();
        const vexTabNotes = scaleNotes.map(nObj => {
            const positions = getTabPositionsHumanized([nObj], strings, noteToPitch);
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
function renderPianoSVG(container, scaleNotes) {
    let svg = `<svg viewBox="0 0 420 130" width="100%" height="120" xmlns="http://www.w3.org/2000/svg">`;
    const activePitches = new Set(scaleNotes.map(n => n.pitchIndex));
    const colors = {
        whiteKeyBg: '#222222',          
        whiteKeyActive: '#dcd6cd',      
        whiteStroke: '#333333',
        blackKeyBg: '#111111',          
        blackKeyActive: '#a39b8b',      
        blackStroke: '#444444',
        indicatorActive: '#8c4227'     
    };
    const whiteKeys = [0, 2, 4, 5, 7, 9, 11];
    const whiteWidth = 46;
    const startX = 25;
    const blackWidth = 26;
    const blackKeys = [
        { p: 1,  x: startX + whiteWidth * 1 - (blackWidth / 2) }, 
        { p: 3,  x: startX + whiteWidth * 2 - (blackWidth / 2) }, 
        { p: 6,  x: startX + whiteWidth * 4 - (blackWidth / 2) }, 
        { p: 8,  x: startX + whiteWidth * 5 - (blackWidth / 2) }, 
        { p: 10, x: startX + whiteWidth * 6 - (blackWidth / 2) }  
    ];
    whiteKeys.forEach((pitch, i) => {
        const isHighlighted = activePitches.has(pitch);
        const x = startX + i * whiteWidth;
        const fill = isHighlighted ? colors.whiteKeyActive : colors.whiteKeyBg;
        svg += `<rect x="${x}" y="10" width="${whiteWidth - 2}" height="105" fill="${fill}" stroke="${colors.whiteStroke}" stroke-width="1.5" rx="3"/>`;
        if (isHighlighted) {
            svg += `<circle cx="${x + (whiteWidth - 2) / 2}" cy="98" r="4" fill="${colors.indicatorActive}"/>`;
        }
    });
    blackKeys.forEach(k => {
        const isHighlighted = activePitches.has(k.p);
        const fill = isHighlighted ? colors.blackKeyActive : colors.blackKeyBg;
        svg += `<rect x="${k.x}" y="10" width="${blackWidth}" height="65" fill="${fill}" stroke="${colors.blackStroke}" stroke-width="1" rx="2"/>`;
        if (isHighlighted) {
            svg += `<circle cx="${k.x + blackWidth / 2}" cy="60" r="3.5" fill="${colors.indicatorActive}"/>`;
        }
    });
    svg += `</svg>`;
    container.innerHTML = svg;
}
function renderFretboardSVG(container, scaleNotes, stringTunings, numFrets = 12, isGuitar = false) {
    const pitchToNoteMap = {};
    scaleNotes.forEach(n => { pitchToNoteMap[n.pitchIndex] = n.name; });
    const numStrings = stringTunings.length;
    const width = 390;
    const height = 100;
    const fretWidth = width / numFrets;
    const stringSpacing = height / (numStrings + 1);
    const noteRadius = isGuitar ? 6.5 : 8.5;
    const fontSize = isGuitar ? 7 : 8.5;
    let svg = `<svg viewBox="0 0 420 130" width="100%" height="120" xmlns="http://www.w3.org/2000/svg">`;
    const singleInlays = [3, 5, 7, 9];
    singleInlays.forEach(fret => {
        const cx = (fret - 0.5) * fretWidth + 15;
        svg += `<circle cx="${cx}" cy="${height / 2 + 10}" r="3" fill="#444444"/>`;
    });
    const cx12 = (12 - 0.5) * fretWidth + 15;
    svg += `<circle cx="${cx12}" cy="${height / 2 - 5}" r="3" fill="#444444"/>`;
    svg += `<circle cx="${cx12}" cy="${height / 2 + 25}" r="3" fill="#444444"/>`;
    for (let i = 0; i <= numFrets; i++) {
        const x = i * fretWidth + 15;
        const strokeWidth = i === 0 ? 4 : 1;
        const color = i === 0 ? '#ffffff' : '#333333';
        svg += `<line x1="${x}" y1="10" x2="${x}" y2="${height + 10}" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    }
    stringTunings.forEach((openPitch, sIdx) => {
        const y = (sIdx + 1) * stringSpacing + 10;
        svg += `<line x1="15" y1="${y}" x2="${width + 15}" y2="${y}" stroke="#666666" stroke-width="${1 + sIdx * 0.4}"/>`;
        for (let fret = 0; fret <= numFrets; fret++) {
            const currentPitch = (openPitch + fret) % 12;
            const noteName = pitchToNoteMap[currentPitch];
            if (noteName !== undefined) {
                const cx = fret === 0 ? 15 : (fret - 0.5) * fretWidth + 15;
                svg += `<circle cx="${cx}" cy="${y}" r="${noteRadius}" fill="#ffffff" stroke="#000000" stroke-width="1"/>`;
                svg += `<text x="${cx}" y="${y + (isGuitar ? 2.5 : 3)}" font-size="${fontSize}" font-weight="bold" fill="#000000" text-anchor="middle">${noteName}</text>`;
            }
        }
    });
    svg += `</svg>`;
    container.innerHTML = svg;
}
