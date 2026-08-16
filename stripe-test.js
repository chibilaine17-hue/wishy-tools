(() => {
  const $ = s => document.querySelector(s);
  const cards = [
    { number:'4242424242424242', label:'Visa · Success', cvc:3 },
    { number:'5555555555554444', label:'Mastercard · Success', cvc:3 },
    { number:'378282246310005', label:'American Express · Success', cvc:4 },
    { number:'4000000000000002', label:'Visa · Declined', cvc:3 },
    { number:'4000000000003220', label:'Visa · 3DS Required', cvc:3 }
  ];
  const random = a => a[Math.floor(Math.random() * a.length)];
  const digits = v => String(v || '').replace(/\D/g, '');
  const match = value => { const d = digits(value); if (!d) return null; return cards.find(c => c.number === d || c.number.startsWith(d)) || null; };
  const futureExpiry = () => {
    const m = String(Math.floor(Math.random()*12)+1).padStart(2,'0');
    const y = String((new Date().getFullYear()+2+Math.floor(Math.random()*5))%100).padStart(2,'0');
    return `${m}/${y}`;
  };
  const randomCvc = len => Array.from({length:len}, () => Math.floor(Math.random()*10)).join('');

  // Remove the old card-page listeners from app.js without affecting its theme/copy utilities.
  ['#cardBin','#generateCards','#clearCards'].forEach(sel => {
    const old = $(sel); if (old) old.replaceWith(old.cloneNode(true));
  });

  const input = $('#cardBin'), badge = $('#binBadge'), message = $('#binMessage');
  function update() {
    input.value = digits(input.value);
    const d = input.value, found = match(d);
    document.querySelectorAll('.bin-chip').forEach(c => c.classList.toggle('active', d === digits(c.dataset.testBin)));
    if (!d) { badge.textContent='Random Test'; message.textContent="Leave blank for a random Stripe test card, or paste a supported Stripe test card/prefix."; message.className='field-message'; return; }
    if (found) { badge.textContent=found.label; message.textContent='Supported Stripe test credential.'; message.className='field-message ok'; }
    else { badge.textContent='Not supported'; message.textContent='That prefix is not in the bundled Stripe test-card list. Use one of the presets or a supported Stripe test card.'; message.className='field-message error'; }
  }
  input.addEventListener('input', update);
  document.querySelectorAll('.bin-chip').forEach(chip => chip.addEventListener('click', () => { input.value=digits(chip.dataset.testBin); update(); input.focus(); }));
  update();

  $('#generateCards').addEventListener('click', () => {
    const qty = Math.max(1, Math.min(50, Number($('#cardQty').value) || 1));
    const requested = digits(input.value);
    const selected = requested ? match(requested) : random(cards);
    if (!selected) { message.textContent='Choose a Stripe test-card preset or paste a supported test-card number/prefix.'; message.className='field-message error'; return; }
    const month = $('#cardMonth').value, year = $('#cardYear').value, cvc = digits($('#cardCvv').value);
    const expiry = () => month === 'random' || year === 'random' ? futureExpiry() : `${month}/${year}`;
    const rows = Array.from({length:qty}, () => `${selected.number}|${expiry()}|${cvc || randomCvc(selected.cvc)}`);
    $('#cardOutput').value = rows.join('\n'); $('#cardCountLabel').textContent=`${qty} test card${qty===1?'':'s'} generated`;
  });
  $('#clearCards').addEventListener('click', () => { $('#cardOutput').value=''; $('#cardCountLabel').textContent='0 cards generated'; });
})();
