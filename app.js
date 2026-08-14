const $ = (s) => document.querySelector(s);
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomString = (len=10) => Array.from({length:len},()=>randomItem('abcdefghijklmnopqrstuvwxyz0123456789')).join('');

// Edit this list to domains you own/control. Receiving mail still requires your mail-routing backend.
const EMAIL_DOMAINS = ['example.com', 'example.net', 'example.org'];

const TEST_CARDS = {
  visa: [
    { number: '4242 4242 4242 4242', cvv: '123', note: 'Visa sandbox/test' },
    { number: '4000 0566 5566 5556', cvv: '123', note: 'Visa debit sandbox/test' }
  ],
  mastercard: [
    { number: '5555 5555 5555 4444', cvv: '123', note: 'Mastercard sandbox/test' },
    { number: '5105 1051 0510 5100', cvv: '123', note: 'Mastercard sandbox/test' }
  ],
  amex: [
    { number: '3782 822463 10005', cvv: '1234', note: 'Amex sandbox/test' }
  ]
};

const ADDRESS_DATA = {
  US: [
    {city:'New York', region:'NY', postal:'10001'}, {city:'Beverly Hills', region:'CA', postal:'90210'},
    {city:'Chicago', region:'IL', postal:'60601'}, {city:'San Francisco', region:'CA', postal:'94105'},
    {city:'Miami', region:'FL', postal:'33101'}
  ],
  UK: [
    {city:'London', region:'England', postal:'SW1A 1AA'}, {city:'London', region:'England', postal:'W1A 1AA'},
    {city:'Manchester', region:'England', postal:'M1 1AE'}, {city:'Birmingham', region:'England', postal:'B1 1BB'},
    {city:'Edinburgh', region:'Scotland', postal:'EH1 1YZ'}
  ],
  PH: [
    {city:'Manila', region:'Metro Manila', postal:'1000'}, {city:'Quezon City', region:'Metro Manila', postal:'1100'},
    {city:'Cebu City', region:'Cebu', postal:'6000'}, {city:'Davao City', region:'Davao del Sur', postal:'8000'},
    {city:'Sariaya', region:'Quezon', postal:'4322'}
  ]
};
const STREET_WORDS = ['Aurora','Luna','Starlight','Orchid','Sakura','Rose','Moonbeam','Petal','Nova','Willow'];
const STREET_TYPES = ['Street','Avenue','Road','Lane','Drive'];

function futureExpiry(){
  const now = new Date();
  const month = String(Math.floor(Math.random()*12)+1).padStart(2,'0');
  const year = String((now.getFullYear()+2+Math.floor(Math.random()*4))%100).padStart(2,'0');
  return `${month}/${year}`;
}

$('#generateCards').addEventListener('click',()=>{
  const network = $('#cardNetwork').value;
  const qty = Math.max(1,Math.min(20,Number($('#cardQty').value)||1));
  const networks = Object.keys(TEST_CARDS);
  const rows=[];
  for(let i=0;i<qty;i++){
    const key = network==='random'?randomItem(networks):network;
    const c = randomItem(TEST_CARDS[key]);
    rows.push(`${i+1}. ${c.number}|${futureExpiry()}|${c.cvv} — ${c.note}`);
  }
  $('#cardOutput').value=rows.join('\n');
});
$('#clearCards').addEventListener('click',()=>$('#cardOutput').value='');

$('#generateAddress').addEventListener('click',()=>{
  const country=$('#country').value, loc=randomItem(ADDRESS_DATA[country]);
  const num=Math.floor(Math.random()*899)+100;
  const street=`${num} ${randomItem(STREET_WORDS)} ${randomItem(STREET_TYPES)}`;
  const countryName={US:'United States',UK:'United Kingdom',PH:'Philippines'}[country];
  $('#addressOutput').textContent=`${street}\n${loc.city}, ${loc.region} ${loc.postal}\n${countryName}`;
});

function loadDomains(){ EMAIL_DOMAINS.forEach(d=>$('#emailDomain').insertAdjacentHTML('beforeend',`<option value="${d}">${d}</option>`)); }
loadDomains();
$('#generateEmails').addEventListener('click',()=>{
  const domain=$('#emailDomain').value, n=Math.max(1,Math.min(100,Number($('#emailCount').value)||1));
  $('#emailOutput').value=Array.from({length:n},()=>`${randomString(12)}@${domain}`).join('\n');
});

$('#calculateRefund').addEventListener('click',()=>{
  const amount=Number($('#refundAmount').value), purchased=Number($('#daysPurchased').value), remaining=Number($('#daysRemaining').value), fee=Number($('#serviceFee').value);
  if(!Number.isFinite(amount)||!Number.isFinite(purchased)||!Number.isFinite(remaining)||purchased<=0||remaining<0){ $('#refundResult').textContent='Check your inputs'; return; }
  const refund=(amount/purchased)*remaining*fee;
  $('#refundResult').textContent=`₱${refund.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
});

function encodeUrl(url){ return btoa(unescape(encodeURIComponent(url))).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''); }
function decodeUrl(token){ let t=token.replaceAll('-','+').replaceAll('_','/'); while(t.length%4)t+='='; return decodeURIComponent(escape(atob(t))); }
function safeSlug(s){return s.toLowerCase().replace(/[^a-z0-9-_]/g,'').slice(0,24)}

// Same-site static redirect scheme: /?go=<encoded URL>. It does not store server-side state.
$('#makeShortlink').addEventListener('click',()=>{
  const value=$('#longUrl').value.trim();
  try{
    const url=new URL(value); if(!['http:','https:'].includes(url.protocol)) throw new Error();
    const slug=safeSlug($('#customSlug').value.trim());
    const base=location.origin+location.pathname;
    const token=encodeUrl(url.href);
    const out=slug?`${base}?s=${slug}&go=${token}`:`${base}?go=${token}`;
    $('#shortlinkOutput').textContent=out;
  }catch{ $('#shortlinkOutput').textContent='Enter a valid http/https URL.'; }
});

const params=new URLSearchParams(location.search);
if(params.has('go')){
  try{ const target=decodeUrl(params.get('go')); const u=new URL(target); if(['http:','https:'].includes(u.protocol)) location.replace(u.href); }catch{}
}

$('#formatEmails').addEventListener('click',()=>{
  const emails=$('#emailsInput').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const pwd=$('#passwordInput').value, start=Math.max(1,Number($('#startNumber').value)||1);
  $('#formattedOutput').value=emails.map((e,i)=>`${start+i}. ${e}|${pwd}`).join('\n');
});

async function copyText(text, btn){
  try{await navigator.clipboard.writeText(text); const old=btn.textContent; btn.textContent='Copied'; setTimeout(()=>btn.textContent=old,1000);}catch{}
}
document.querySelectorAll('[data-copy]').forEach(btn=>btn.addEventListener('click',()=>copyText($('#'+btn.dataset.copy).value,btn)));
document.querySelectorAll('[data-copy-text]').forEach(btn=>btn.addEventListener('click',()=>copyText($('#'+btn.dataset.copyText).textContent,btn)));

const root=document.documentElement;
const saved=localStorage.getItem('wishy-theme');
if(saved) root.dataset.theme=saved;
function setThemeIcon(){ $('#themeToggle').textContent=root.dataset.theme==='dark'?'☀':'☾'; }
setThemeIcon();
$('#themeToggle').addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';localStorage.setItem('wishy-theme',root.dataset.theme);setThemeIcon();});
