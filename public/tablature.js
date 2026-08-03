export function getTabPositionsHumanized(parsedNotes, stringTunings, noteToPitch) {
    const numStrings = stringTunings.length;
    const targetPitches = parsedNotes.map(n => n.pitchIndex);
    let bestPositions = [];
    let minSpan = 999;

    for (let baseFret = 0; baseFret <= 10; baseFret++) {
        const currentPositions = [];
        const usedStrings = new Set();
        let valid = true;

        for (const pitch of targetPitches) {
            let foundString = false;
            for (let s = 0; s < numStrings; s++) {
                if (usedStrings.has(s)) continue;
                const stringRootMidi = (noteToPitch[stringTunings[s]] || 0) % 12;
                let fret = (pitch - stringRootMidi + 12) % 12;

                if (fret < baseFret && (fret + 12 - baseFret) <= 4) fret += 12;

                if (fret === 0 || (fret >= baseFret && fret <= baseFret + 4)) {
                    currentPositions.push({ str: numStrings - s, fret: fret });
                    usedStrings.add(s);
                    foundString = true;
                    break;
                }
            }
            if (!foundString) { valid = false; break; }
        }

        if (valid && currentPositions.length === targetPitches.length) {
            const frets = currentPositions.map(p => p.fret).filter(f => f > 0);
            const span = frets.length > 0 ? (Math.max(...frets) - Math.min(...frets)) : 0;
            if (span < minSpan) {
                minSpan = span;
                bestPositions = currentPositions;
            }
        }
    }

    if (bestPositions.length === 0) {
        return parsedNotes.map((n, i) => ({ str: numStrings - i, fret: (n.pitchIndex % 5) + 1 }));
    }
    return bestPositions;
}
