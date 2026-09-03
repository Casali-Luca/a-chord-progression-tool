export function renderPianoSVG(container, scaleNotes) {
  const activePitchIndices = new Set(scaleNotes.map(n => n.pitchIndex));
  const whiteKeys = [0, 2, 4, 5, 7, 9, 11]; // Indici semitoni (C, D, E, F, G, A, B)
  const blackKeys = [{p: 1, x: 28}, {p: 3, x: 68}, {p: 6, x: 148}, {p: 8, x: 188}, {p: 10, x: 228}];
  
  let svg = `<svg viewBox="0 0 280 120" width="100%" height="150" xmlns="http://www.w3.org/2000/svg">`;
  
  // Tasti Bianchi
  whiteKeys.forEach((pitch, i) => {
    const isHighlighted = activePitchIndices.has(pitch);
    const fill = isHighlighted ? '#4CAF50' : '#ffffff';
    svg += `<rect x="${i * 40}" y="10" width="38" height="100" fill="${fill}" stroke="#333" rx="3"/>`;
  });

  // Tasti Neri
  blackKeys.forEach(k => {
    const isHighlighted = activePitchIndices.has(k.p);
    const fill = isHighlighted ? '#FF5722' : '#000000';
    svg += `<rect x="${k.x}" y="10" width="24" height="60" fill="${fill}" stroke="#333" rx="2"/>`;
  });

  svg += `</svg>`;
  container.innerHTML = svg;
}