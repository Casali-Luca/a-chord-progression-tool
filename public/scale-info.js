import Swiper from 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.mjs';
import { getTabPositionsHumanized } from './tablature.js';

const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

function getSpelledNoteName(rootKey, interval, accidentalMode) {
    const cleanRoot = rootKey.replace(/\d+$/, '');
    const letterMatch = cleanRoot.match(/^[A-G]/i);
    if (!letterMatch) return null;
    
    const rootLetter = letterMatch[0].toUpperCase();
    const rootLetterIdx = NOTE_LETTERS.indexOf(rootLetter);
    const rootPitch = noteToPitchGlobal[cleanRoot];
    if (rootPitch === undefined) return null;

    const targetPitch = (rootPitch + interval) % 12;

    let targetLetterIdx = -1;
    if (interval === 0) targetLetterIdx = rootLetterIdx;
    else if (interval === 1 || interval === 2) targetLetterIdx = (rootLetterIdx + 1) % 7;
    else if (interval === 3 || interval === 4) targetLetterIdx = (rootLetterIdx + 2) % 7;
    else if (interval === 5 || interval === 6) targetLetterIdx = (rootLetterIdx + 3) % 7;
    else if (interval === 7 || interval === 8) targetLetterIdx = (rootLetterIdx + 4) % 7;
    else if (interval === 9 || interval === 10) targetLetterIdx = (rootLetterIdx + 5) % 7;
    else if (interval === 11) targetLetterIdx = (rootLetterIdx + 6) % 7;

    const targetLetter = NOTE_LETTERS[targetLetterIdx];
    const basePitches = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
    const basePitch = basePitches[targetLetter];

    let diff = (targetPitch - basePitch) % 12;
    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;

    if (diff === 0) return targetLetter;
    if (diff === 1) return targetLetter + '#';
    if (diff === 2) return targetLetter + '##';
    if (diff === -1) return targetLetter + 'b';
    if (diff === -2) return targetLetter + 'bb';

    const pitchMap = (accidentalMode === 'flat') ? pitchToVexFlatGlobal : pitchToVexSharpGlobal;
    return pitchMap[targetPitch];
}

let noteToPitchGlobal = {};
let pitchToVexSharpGlobal = {};
let pitchToVexFlatGlobal = {};

function ensureZoomModal() {
    let modal = document.getElementById('global-zoom-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'global-zoom-modal';
        modal.className = 'zoom-modal';
        modal.innerHTML = `
            <div class="zoom-modal-content">
                <button class="zoom-modal-close" id="zoom-modal-close">&times;</button>
                <div id="zoom-modal-body" style="width:100%; text-align:center;"></div>
            </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('#zoom-modal-close');
        const hideModal = () => modal.classList.remove('active');
        
        closeBtn.addEventListener('click', hideModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) hideModal();
        });
    }
    return modal;
}

function getOptimalBaseOctave(startLetter, clef) {
    const letter = startLetter.toUpperCase();
    if (clef === 'bass') {
        return ['F', 'G', 'A', 'B'].includes(letter) ? 2 : 3;
    } else if (clef === 'alto') {
        return ['G', 'A', 'B'].includes(letter) ? 3 : 4;
    } else {
        return letter === 'B' ? 3 : 4;
    }
}

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
    modeDefinitions,
    degreeIndex = 0
) {
    noteToPitchGlobal = noteToPitch;
    pitchToVexSharpGlobal = pitchToVexSharp;
    pitchToVexFlatGlobal = pitchToVexFlat;

    const mainContainer = document.getElementById(containerId);
    if (!mainContainer) return;
    mainContainer.innerHTML = '';

    const modeData = modeDefinitions[selectedModeKey] || modeDefinitions.ionian;
    const cleanRoot = rootKey.replace(/\d+$/, '');
    const rootP = noteToPitch[cleanRoot] ?? 0;
    const currentDegreeInfo = modeData.degrees ? modeData.degrees[degreeIndex] : null;
    const degreeSemiShift = currentDegreeInfo ? currentDegreeInfo.semi : 0;

    const firstInterval = modeData.intervals[0] || 0;
    const firstShift = firstInterval + degreeSemiShift;
    let firstRawNote = getSpelledNoteName(cleanRoot, firstShift, accidentalMode);
    if (!firstRawNote) {
        const pitchMap = (accidentalMode === 'flat') ? pitchToVexFlat : pitchToVexSharp;
        firstRawNote = pitchMap[(rootP + firstShift) % 12];
    }

    const startLetter = firstRawNote.charAt(0).toUpperCase();
    const startLetterIdx = NOTE_LETTERS.indexOf(startLetter);

    const currentBaseOctave = (baseOctave !== undefined && baseOctave !== null) 
        ? baseOctave 
        : getOptimalBaseOctave(startLetter, selectedClef);

    const scaleNotes = modeData.intervals.map((interval, idx) => {
        const totalShift = interval + degreeSemiShift;
        const absPitch = (rootP + totalShift) % 12;
        
        let rawNote = getSpelledNoteName(cleanRoot, totalShift, accidentalMode);
        if (!rawNote) {
            const pitchMap = (accidentalMode === 'flat') ? pitchToVexFlat : pitchToVexSharp;
            rawNote = pitchMap[absPitch];
        }

        const octaveOffset = Math.floor((startLetterIdx + idx) / 7);
        const calculatedOctave = currentBaseOctave + octaveOffset;

        let accidental = null;
        if (rawNote.includes('##')) {
            accidental = '##';
        } else if (rawNote.includes('#')) {
            accidental = '#';
        } else if (rawNote.includes('bb')) {
            accidental = 'bb';
        } else if (rawNote.length > 1 && rawNote.endsWith('b')) {
            accidental = 'b';
        }

        return {
            pitchIndex: absPitch,
            name: rawNote.toUpperCase(),
            key: `${rawNote.toLowerCase()}/${calculatedOctave}`,
            octave: calculatedOctave,
            accidental: accidental
        };
    });

    const swiperEl = document.createElement('div');
    swiperEl.className = 'swiper mini-scale-swiper';
    swiperEl.style.position = 'relative';

    const zoomBtn = document.createElement('button');
    zoomBtn.className = 'zoom-btn';
    zoomBtn.type = 'button';
    zoomBtn.innerHTML = '+';
    swiperEl.appendChild(zoomBtn);

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

    const swiperInstance = new Swiper(swiperEl, {
        slidesPerView: 1,
        spaceBetween: 10,
        observer: true,
        observeParents: true,
        pagination: {
            el: pagination,
            clickable: true,
        },
    });

    zoomBtn.addEventListener('click', () => {
        const activeSlideIndex = swiperInstance.activeIndex;
        const activeSlide = document.getElementById(`${containerId}-slide-${activeSlideIndex}`);
        if (!activeSlide) return;

        const svgEl = activeSlide.querySelector('svg');
        if (svgEl) {
            const modal = ensureZoomModal();
            const modalBody = modal.querySelector('#zoom-modal-body');
            modalBody.innerHTML = '';

            const svgClone = svgEl.cloneNode(true);
            svgClone.style.maxWidth = '100%';
            svgClone.style.height = 'auto';

            if (activeSlideIndex <= 2) {
                svgClone.style.color = '#ffffff';
                const styleEl = document.createElement('style');
                styleEl.textContent = `
                    #zoom-modal-body svg * {
                        fill: #ffffff !important;
                        stroke: #ffffff !important;
                    }
                `;
                modalBody.appendChild(styleEl);
            }

            modalBody.appendChild(svgClone);
            modal.classList.add('active');
        }
    });
}

function renderVexflowSlide(targetEl, scaleNotes, tMode, selectedClef, VF, noteToPitch) {
    if (!targetEl) return;
    const rawWidth = targetEl.clientWidth || 420;
    const width = Math.min(rawWidth, 480); 
    const staveWidth = width - 20;
    const staveHeight = 130;

    const renderer = new VF.Renderer(targetEl, VF.Renderer.Backends.SVG);
    renderer.resize(width, staveHeight);
    const context = renderer.getContext();
    
    const svgEl = targetEl.querySelector('svg');
    if (svgEl) {
        svgEl.setAttribute('viewBox', `0 0 ${width} ${staveHeight}`);
        svgEl.style.width = '100%';
        svgEl.style.maxWidth = `${width}px`;
        svgEl.style.height = 'auto';
        svgEl.style.margin = '0 auto';
        svgEl.style.overflow = 'visible'; 
    }

    if (tMode === 'notes') {
        
        const stave = new VF.Stave(10, 25, staveWidth);
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
            formatter.joinAndFormat([voice], staveWidth - 50);
        } else {
            formatter.format([voice], staveWidth - 50);
        }
        voice.draw(context, stave);
    } else {
        const strings = tMode.split(',');
        const tabStave = new VF.TabStave(10, 20, staveWidth);
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
            formatter.joinAndFormat([voice], staveWidth - 50);
        } else {
            formatter.format([voice], staveWidth - 50);
        }
        voice.draw(context, tabStave);
    }
}

function renderPianoSVG(container, scaleNotes) {
    let svg = `<svg viewBox="0 0 350 140" xmlns="http://www.w3.org/2000/svg">`;
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
    const whiteWidth = 42;
    const startX = 28;
    const blackWidth = 22;

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
        svg += `<rect x="${x}" y="15" width="${whiteWidth - 2}" height="110" fill="${fill}" stroke="${colors.whiteStroke}" stroke-width="1.5" rx="3"/>`;
        if (isHighlighted) {
            svg += `<circle cx="${x + (whiteWidth - 2) / 2}" cy="108" r="4" fill="${colors.indicatorActive}"/>`;
        }
    });

    blackKeys.forEach(k => {
        const isHighlighted = activePitches.has(k.p);
        const fill = isHighlighted ? colors.blackKeyActive : colors.blackKeyBg;
        svg += `<rect x="${k.x}" y="15" width="${blackWidth}" height="68" fill="${fill}" stroke="${colors.blackStroke}" stroke-width="1" rx="2"/>`;
        if (isHighlighted) {
            svg += `<circle cx="${k.x + blackWidth / 2}" cy="68" r="3.5" fill="${colors.indicatorActive}"/>`;
        }
    });

    svg += `</svg>`;
    container.innerHTML = svg;
}

function renderFretboardSVG(container, scaleNotes, stringTunings, numFrets = 12, isGuitar = false) {
    const pitchToNoteMap = {};
    scaleNotes.forEach(n => { pitchToNoteMap[n.pitchIndex] = n.name; });

    const numStrings = stringTunings.length;
    const width = 380;
    const height = 90;
    const startX = 20;
    const startY = 25;
    const fretWidth = width / numFrets;
    const stringSpacing = height / (numStrings > 1 ? numStrings - 1 : 1);

    const noteRadius = isGuitar ? 7 : 8.5;
    const fontSize = isGuitar ? 7.5 : 9;

    let svg = `<svg viewBox="0 0 420 140" xmlns="http://www.w3.org/2000/svg">`;

    const singleInlays = [3, 5, 7, 9];
    singleInlays.forEach(fret => {
        const cx = (fret - 0.5) * fretWidth + startX;
        svg += `<circle cx="${cx}" cy="${startY + height / 2}" r="3" fill="#444444"/>`;
    });

    const cx12 = (12 - 0.5) * fretWidth + startX;
    svg += `<circle cx="${cx12}" cy="${startY + height / 2 - 12}" r="3" fill="#444444"/>`;
    svg += `<circle cx="${cx12}" cy="${startY + height / 2 + 12}" r="3" fill="#444444"/>`;

    for (let i = 0; i <= numFrets; i++) {
        const x = i * fretWidth + startX;
        const strokeWidth = i === 0 ? 4 : 1;
        const color = i === 0 ? '#ffffff' : '#333333';
        svg += `<line x1="${x}" y1="${startY}" x2="${x}" y2="${startY + height}" stroke="${color}" stroke-width="${strokeWidth}"/>`;
    }

    stringTunings.forEach((openPitch, sIdx) => {
        const y = startY + (sIdx * stringSpacing);
        svg += `<line x1="${startX}" y1="${y}" x2="${width + startX}" y2="${y}" stroke="#666666" stroke-width="${1 + sIdx * 0.4}"/>`;

        for (let fret = 0; fret <= numFrets; fret++) {
            const currentPitch = (openPitch + fret) % 12;
            const noteName = pitchToNoteMap[currentPitch];

            if (noteName !== undefined) {
                const cx = fret === 0 ? startX : (fret - 0.5) * fretWidth + startX;
                svg += `<circle cx="${cx}" cy="${y}" r="${noteRadius}" fill="#ffffff" stroke="#000000" stroke-width="1.2"/>`;
                svg += `<text x="${cx}" y="${y + (isGuitar ? 2.5 : 3)}" font-size="${fontSize}" font-weight="bold" fill="#000000" text-anchor="middle" dominant-baseline="central">${noteName}</text>`;
            }
        }
    });

    svg += `</svg>`;
    container.innerHTML = svg;
}