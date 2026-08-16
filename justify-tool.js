(() => {
  const $ = s => document.querySelector(s);
  const oldButton = $('#justifyText');
  if (oldButton) oldButton.replaceWith(oldButton.cloneNode(true));

  function distribute(line, width) {
    const words = line.trim().split(/\s+/).filter(Boolean);
    if (words.length <= 1 || line.length >= width) return line.trim();
    const letters = words.reduce((n, w) => n + w.length, 0);
    const gaps = words.length - 1;
    let spaces = width - letters;
    const base = Math.floor(spaces / gaps);
    let extra = spaces % gaps;
    return words.map((word, i) => {
      if (i === words.length - 1) return word;
      const count = base + (extra-- > 0 ? 1 : 0);
      return word + ' '.repeat(Math.max(1, count));
    }).join('');
  }

  function wrapParagraph(text, width) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      if (!line) { line = word; continue; }
      if ((line.length + 1 + word.length) <= width) line += ' ' + word;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines;
  }

  function justify() {
    const input = $('#justifyInput').value.replace(/\r/g, '');
    const width = Math.max(20, Math.min(120, Number($('#justifyWidth').value) || 42));
    const justifyLast = $('#justifyLast').value === 'justify';
    const paragraphs = input.split(/\n\s*\n/);
    const output = paragraphs.map(paragraph => {
      if (!paragraph.trim()) return '';
      const lines = wrapParagraph(paragraph, width);
      return lines.map((line, index) => {
        const isLast = index === lines.length - 1;
        return (!isLast || justifyLast) ? distribute(line, width) : line;
      }).join('\n');
    }).join('\n\n');
    $('#justifyOutput').value = output;
  }

  $('#justifyText').addEventListener('click', justify);
  $('#justifyInput').addEventListener('input', justify);
  $('#justifyWidth').addEventListener('input', justify);
  $('#justifyLast').addEventListener('change', justify);
  $('#copyJustify').addEventListener('click', async e => {
    try { await navigator.clipboard.writeText($('#justifyOutput').value); const old=e.currentTarget.textContent; e.currentTarget.textContent='Copied'; setTimeout(()=>e.currentTarget.textContent=old,900); } catch {}
  });
  $('#clearJustify').addEventListener('click', () => { $('#justifyInput').value=''; $('#justifyOutput').value=''; $('#justifyInput').focus(); });
  justify();
})();
