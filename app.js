const $=(s)=>document.querySelector(s);
const randomItem=(arr)=>arr[Math.floor(Math.random()*arr.length)];
const randomString=(len=10,chars='abcdefghijklmnopqrstuvwxyz0123456789')=>Array.from({length:len},()=>randomItem(chars)).join('');

const root=document.documentElement;
const saved=localStorage.getItem('wishy-theme');
if(saved) root.dataset.theme=saved;
function setThemeIcon(){const b=$('#themeToggle');if(b)b.textContent=root.dataset.theme==='dark'?'☀':'☾'}
setThemeIcon();
$('#themeToggle')?.addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';localStorage.setItem('wishy-theme',root.dataset.theme);setThemeIcon()});

async function copyText(text,btn){try{await navigator.clipboard.writeText(text);const old=btn.textContent;btn.textContent='Copied';setTimeout(()=>btn.textContent=old,1000)}catch{}}
document.querySelectorAll('[data-copy]').forEach(btn=>btn.addEventListener('click',()=>copyText($('#'+btn.dataset.copy)?.value||'',btn)));
document.querySelectorAll('[data-copy-text]').forEach(btn=>btn.addEventListener('click',()=>copyText($('#'+btn.dataset.copyText)?.textContent||'',btn)));

/* Documented sandbox/test PANs. Arbitrary pasted prefixes generate deliberately non-Luhn mock PANs. */
const TEST_PREFIXES={
 '424242':{number:'4242424242424242',label:'Visa Test',network:'visa',cvvLength:3},
 '400005':{number:'4000056655665556',label:'Visa Debit Test',network:'visa',cvvLength:3},
 '555555':{number:'5555555555554444',label:'Mastercard Test',network:'mastercard',cvvLength:3},
 '510510':{number:'5105105105105100',label:'Mastercard Test',network:'mastercard',cvvLength:3},
 '378282':{number:'378282246310005',label:'American Express Test',network:'amex',cvvLength:4},
 '601111':{number:'6011111111111117',label:'Discover Test',network:'discover',cvvLength:3}
};
const TEST_CARDS=Object.values(TEST_PREFIXES);

function futureExpiry(monthChoice,yearChoice){
 const now=new Date();
 const m=monthChoice==='random'?String(Math.floor(Math.random()*12)+1).padStart(2,'0'):monthChoice;
 const y=yearChoice==='random'?String((now.getFullYear()+2+Math.floor(Math.random()*5))%100).padStart(2,'0'):yearChoice;
 return `${m}/${y}`;
}

function detectNetwork(value){
 const v=(value||'').replace(/\D/g,'');
 if(/^3[47]/.test(v))return {key:'amex',label:'American Express',length:15,cvvLength:4};
 if(/^4/.test(v))return {key:'visa',label:'Visa',length:16,cvvLength:3};
 if(/^(5[1-5]|2[2-7])/.test(v))return {key:'mastercard',label:'Mastercard',length:16,cvvLength:3};
 if(/^(6011|65|64[4-9])/.test(v))return {key:'discover',label:'Discover',length:16,cvvLength:3};
 return {key:'unknown',label:'Mock Prefix',length:16,cvvLength:3};
}

function matchSandboxInput(value){
 const digits=(value||'').replace(/\D/g,'');
 if(!digits)return null;
 for(const [prefix,data] of Object.entries(TEST_PREFIXES)){
   if(digits===prefix || data.number.startsWith(digits))return {prefix,...data};
 }
 return null;
}

function luhnValid(number){
 const digits=String(number).replace(/\D/g,'').split('').reverse().map(Number);
 let sum=0;
 for(let i=0;i<digits.length;i++){
   let d=digits[i];
   if(i%2===1){d*=2;if(d>9)d-=9}
   sum+=d;
 }
 return sum%10===0;
}

function makeInvalidMockPan(prefix){
 const clean=(prefix||'').replace(/\D/g,'').slice(0,12);
 const network=detectNetwork(clean);
 const targetLength=network.length;
 let pan=clean;
 while(pan.length<targetLength)pan+=Math.floor(Math.random()*10);
 pan=pan.slice(0,targetLength);
 if(luhnValid(pan)){
   const last=Number(pan.at(-1));
   pan=pan.slice(0,-1)+String((last+1)%10);
 }
 return {number:pan,label:`${network.label} · Mock`,network:network.key,cvvLength:network.cvvLength,isMock:true};
}

function updateBinUI(){
 const input=$('#cardBin'); if(!input)return;
 input.value=input.value.replace(/\D/g,'').slice(0,12);
 const value=input.value;
 const sandbox=matchSandboxInput(value);
 const network=detectNetwork(value);
 const badge=$('#binBadge');
 const msg=$('#binMessage');
 document.querySelectorAll('.bin-chip').forEach(chip=>chip.classList.toggle('active',value===chip.dataset.testBin));
 if(!value){
   if(badge)badge.textContent='Random Test';
   if(msg){msg.textContent='Paste a 6–12 digit prefix, choose a sandbox preset, or leave blank for a random documented test card.';msg.className='field-message'}
 }else if(value.length<6){
   if(badge)badge.textContent=network.label;
   if(msg){msg.textContent='Enter at least 6 digits.';msg.className='field-message error'}
 }else if(sandbox){
   if(badge)badge.textContent=sandbox.label;
   if(msg){msg.textContent='This matches a bundled documented sandbox/test card.';msg.className='field-message ok'}
 }else{
   if(badge)badge.textContent=`${network.label} · Mock`;
   if(msg){msg.textContent='This prefix will be preserved in generated mock PANs. The completed numbers are intentionally forced to fail Luhn validation.';msg.className='field-message ok'}
 }
}
$('#cardBin')?.addEventListener('input',updateBinUI);
document.querySelectorAll('.bin-chip').forEach(chip=>chip.addEventListener('click',()=>{const input=$('#cardBin');if(input){input.value=chip.dataset.testBin;updateBinUI();input.focus()}}));
updateBinUI();

$('#generateCards')?.addEventListener('click',()=>{
 const qty=Math.max(1,Math.min(50,Number($('#cardQty').value)||1));
 const month=$('#cardMonth').value;
 const year=$('#cardYear').value;
 const cvvInput=$('#cardCvv').value.trim().replace(/\D/g,'').slice(0,4);
 const bin=($('#cardBin')?.value||'').replace(/\D/g,'').slice(0,12);
 if(bin && bin.length<6){alert('Enter at least 6 digits for the BIN / prefix.');return}
 const sandbox=bin?matchSandboxInput(bin):null;
 const rows=[];
 for(let i=0;i<qty;i++){
   const card=bin?(sandbox||makeInvalidMockPan(bin)):randomItem(TEST_CARDS);
   const cvv=cvvInput||randomString(card.cvvLength,'0123456789');
   rows.push(`${card.number}|${futureExpiry(month,year)}|${cvv}`);
 }
 $('#cardOutput').value=rows.join('\n');
 const count=$('#cardCountLabel'); if(count)count.textContent=`${qty} card${qty===1?'':'s'} generated`;
});
$('#clearCards')?.addEventListener('click',()=>{const out=$('#cardOutput');if(out)out.value='';const count=$('#cardCountLabel');if(count)count.textContent='0 cards generated'});

const EMAIL_NAMES=['olivia','emma','amelia','isla','sophia','mia','ava','luna','noah','liam','oliver','mason','ethan','lucas','maria','angelica','janelle','paolo','miguel','carlo'];
$('#generateEmails')?.addEventListener('click',()=>{
 let domain=$('#emailDomainInput').value.trim().toLowerCase().replace(/^@/,'');
 const n=Math.max(1,Math.min(100,Number($('#emailCount').value)||1));
 const style=$('#emailStyle')?.value||'name-number';
 if(!domain||!domain.includes('.')){alert('Enter a valid domain, e.g. example.com');return}
 const aliases=Array.from({length:n},()=>{
   let local='';
   if(style==='name-number') local=`${randomItem(EMAIL_NAMES)}${Math.floor(Math.random()*9000+100)}`;
   else if(style==='alphabet') local=randomString(12,'abcdefghijklmnopqrstuvwxyz');
   else local=randomString(10,'0123456789');
   return `${local}@${domain}`;
 });
 $('#emailOutput').value=aliases.join('\n')
});

const ADDRESS_DATA={
 US:[{city:'New York',region:'NY',postal:'10001'},{city:'Beverly Hills',region:'CA',postal:'90210'},{city:'Chicago',region:'IL',postal:'60601'},{city:'San Francisco',region:'CA',postal:'94105'},{city:'Miami',region:'FL',postal:'33101'}],
 UK:[{city:'London',region:'England',postal:'SW1A 1AA'},{city:'Manchester',region:'England',postal:'M1 1AE'},{city:'Birmingham',region:'England',postal:'B1 1BB'},{city:'Edinburgh',region:'Scotland',postal:'EH1 1YZ'}],
 PH:[{city:'Manila',region:'Metro Manila',postal:'1000'},{city:'Quezon City',region:'Metro Manila',postal:'1100'},{city:'Cebu City',region:'Cebu',postal:'6000'},{city:'Davao City',region:'Davao del Sur',postal:'8000'},{city:'Sariaya',region:'Quezon',postal:'4322'}]
};
const FIRST_NAMES={US:['Olivia','Emma','Noah','Liam','Avery','Mason'],UK:['Amelia','Isla','Oliver','George','Freya','Harry'],PH:['Maria','Angelica','Janelle','Paolo','Miguel','Carlo']};
const LAST_NAMES={US:['Miller','Johnson','Taylor','Anderson','Clark'],UK:['Smith','Brown','Wilson','Davies','Evans'],PH:['Santos','Reyes','Cruz','Garcia','Mendoza']};
const STREET_WORDS=['Aurora','Luna','Starlight','Orchid','Sakura','Rose','Moonbeam','Petal','Nova','Willow'];
const STREET_TYPES=['Street','Avenue','Road','Lane','Drive'];
function phoneFor(country){if(country==='US')return `+1 ${Math.floor(Math.random()*700+200)}-${Math.floor(Math.random()*800+200)}-${String(Math.floor(Math.random()*10000)).padStart(4,'0')}`;if(country==='UK')return `+44 7${String(Math.floor(Math.random()*1000000000)).padStart(9,'0')}`;return `+63 9${String(Math.floor(Math.random()*1000000000)).padStart(9,'0')}`}
$('#generateAddress')?.addEventListener('click',()=>{const country=$('#country').value;const loc=randomItem(ADDRESS_DATA[country]);const name=`${randomItem(FIRST_NAMES[country])} ${randomItem(LAST_NAMES[country])}`;const street=`${Math.floor(Math.random()*899)+100} ${randomItem(STREET_WORDS)} ${randomItem(STREET_TYPES)}`;const countryName={US:'United States',UK:'United Kingdom',PH:'Philippines'}[country];$('#addressOutput').textContent=`Name: ${name}\nPhone: ${phoneFor(country)}\nAddress: ${street}\n${loc.city}, ${loc.region} ${loc.postal}\n${countryName}`});

$('#calculateRefund')?.addEventListener('click',()=>{const amount=Number($('#refundAmount').value),purchased=Number($('#daysPurchased').value),remaining=Number($('#daysRemaining').value),fee=Number($('#serviceFee').value);if(!Number.isFinite(amount)||!Number.isFinite(purchased)||!Number.isFinite(remaining)||purchased<=0||remaining<0){$('#refundResult').textContent='Check your inputs';return}const refund=(amount/purchased)*remaining*fee;$('#refundResult').textContent=`₱${refund.toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`});

function encodeUrl(url){return btoa(unescape(encodeURIComponent(url))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
function decodeUrl(token){let t=token.replaceAll('-','+').replaceAll('_','/');while(t.length%4)t+='=';return decodeURIComponent(escape(atob(t)))}
$('#makeShortlink')?.addEventListener('click',()=>{const value=$('#longUrl').value.trim();try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol))throw new Error();const base=location.origin+location.pathname;$('#shortlinkOutput').textContent=`${base}?go=${encodeUrl(url.href)}`}catch{$('#shortlinkOutput').textContent='Enter a valid http/https URL.'}});
const params=new URLSearchParams(location.search);if(params.has('go')){try{const target=decodeUrl(params.get('go'));const u=new URL(target);if(['http:','https:'].includes(u.protocol))location.replace(u.href)}catch{}}

$('#formatEmails')?.addEventListener('click',()=>{const emails=$('#emailsInput').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);const pwd=$('#passwordInput').value,start=Math.max(1,Number($('#startNumber').value)||1);$('#formattedOutput').value=emails.map((e,i)=>`${start+i}. ${e}|${pwd}`).join('\n')});
