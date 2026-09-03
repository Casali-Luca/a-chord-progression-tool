export function renderFretboardSVG(container, scaleNotes, stringTuning = ['E','A','D','G','B','E'], numFrets = 12) {
  const activePitchIndices = new Set(scaleNotes.map(n => n.pitchIndex));
  const numStrings = stringTuning.length;
  
  const width = 400;
  const height = 120;
  const fretWidth = width / numFrets;
  const stringSpacing = height / (numStrings + 1);

  let svg = `<svg viewBox="0 0 ${width + 20} ${height}" width="100%" height="150" xmlns="http://www.w3.org/2000/svg">`;

  // Capotasto e Tasti
  for (let i = 0; i <= numFrets; i++) {
    const x = i * fretWidth + 10;
    const strokeWidth = i === 0 ? 4 : 1;
    svg += `<line x1="${x}" y1="10" x2="${x}" y2="${height - 10}" stroke="#555" stroke-width="${strokeWidth}"/>`;
  }

  // Corde e Note
  stringTuning.forEach((openNotePitch, sIdx) => {
    const y = (sIdx + 1) * stringSpacing;
    svg += `<line x1="10" y1="${y}" x2="${width + 10}" y2="${y}" stroke="#888" stroke-width="${1 + sIdx * 0.5}"/>`;

    for (let fret = 0; fret <= numFrets; fret++) {
      const currentPitch = (openNotePitch + fret) % 12;
      if (activePitchIndices.has(currentPitch)) {
        const cx = fret === 0 ? 10 : (fret - 0.5) * fretWidth + 10;
        svg += `<circle cx="${cx}" cy="${y}" r="7" fill="#2196F3" stroke="#fff" stroke-width="1.5"/>`;
      }
    }
  });

  svg += `</svg>`;
  container.innerHTML = svg;
}