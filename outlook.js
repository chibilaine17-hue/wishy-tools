const outlookApi = async (action, params={}) => {
  const qs = new URLSearchParams({action, ...params});
  const res = await fetch(`/.netlify/functions/outlook?${qs.toString()}`, {headers:{Accept:'application/json'}});
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = {message:text}; }
  if(!res.ok){
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
};

const oq = (s)=>document.querySelector(s);
const firstValue = (obj, keys, fallback='') => {
  for(const key of keys){
    const value = obj?.[key];
    if(value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
};
const asArray = (value, keys=[]) => {
  if(Array.isArray(value)) return value;
  for(const key of keys){ if(Array.isArray(value?.[key])) return value[key]; }
  if(Array.isArray(value?.data)) return value.data;
  if(Array.isArray(value?.items)) return value.items;
  if(Array.isArray(value?.results)) return value.results;
  return [];
};
const accountId = (a)=>String(firstValue(a,['id','account_id','accountId','uuid'],'')).trim();
const accountEmail = (a)=>String(firstValue(a,['email','address','username','mail','login'],accountId(a))).trim();
const messageId = (m)=>String(firstValue(m,['id','message_id','messageId','uuid'],'')).trim();
const messageSubject = (m)=>String(firstValue(m,['subject','title'],'(No subject)'));
const messageSender = (m)=>{
  const raw = firstValue(m,['from','sender','from_address','fromAddress','sender_email','senderEmail'],'Unknown sender');
  if(typeof raw === 'object' && raw){ return String(firstValue(raw,['email','address','name'],'Unknown sender')); }
  return String(raw);
};
const messageTime = (m)=>firstValue(m,['received_at','receivedAt','created_at','createdAt','date','timestamp','sent_at','sentAt'],'');
const messagePreview = (m)=>String(firstValue(m,['preview','snippet','text_preview','textPreview','body_preview','bodyPreview','text'],'')).replace(/\s+/g,' ').trim();
const messageBody = (m)=>{
  const raw = firstValue(m,['body','content','html','text','message'],'');
  if(typeof raw === 'object' && raw){ return String(firstValue(raw,['content','text','html','value'],JSON.stringify(raw,null,2))); }
  return String(raw || '');
};
const prettyTime = (value)=>{
  if(!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
};

function setOutlookStatus(ok, text){
  const dot=oq('#outlookStatusDot'), label=oq('#outlookStatusText');
  if(dot) dot.classList.toggle('online',!!ok);
  if(label) label.textContent=text;
}
function showOutlookError(message=''){
  const el=oq('#outlookError'); if(!el)return;
  el.hidden=!message; el.textContent=message;
}
function setLoading(button, loading, text='Loading…'){
  if(!button)return;
  if(loading){button.dataset.oldText=button.textContent;button.disabled=true;button.textContent=text;}
  else{button.disabled=false;button.textContent=button.dataset.oldText||'Refresh Inbox';}
}

function renderAccounts(accounts){
  const select=oq('#outlookAccount'); if(!select)return;
  select.innerHTML='';
  if(!accounts.length){
    const opt=document.createElement('option'); opt.value=''; opt.textContent='No Outlook accounts found'; select.append(opt); return;
  }
  for(const account of accounts){
    const id=accountId(account); if(!id)continue;
    const opt=document.createElement('option'); opt.value=id; opt.textContent=accountEmail(account)||id; select.append(opt);
  }
  if(select.options.length) select.selectedIndex=0;
}

function renderMessages(messages){
  const list=oq('#outlookMessages'); if(!list)return;
  list.innerHTML='';
  oq('#outlookMessageCount').textContent=String(messages.length);
  if(!messages.length){
    const empty=document.createElement('div'); empty.className='empty-state'; empty.textContent='No messages found for this account.'; list.append(empty); return;
  }
  messages.forEach((m,index)=>{
    const id=messageId(m); if(!id)return;
    const btn=document.createElement('button'); btn.type='button'; btn.className='message-item'; btn.dataset.messageId=id;
    const top=document.createElement('div'); top.className='message-item-top';
    const sender=document.createElement('strong'); sender.textContent=messageSender(m);
    const time=document.createElement('span'); time.textContent=prettyTime(messageTime(m));
    top.append(sender,time);
    const subject=document.createElement('div'); subject.className='message-subject'; subject.textContent=messageSubject(m);
    const preview=document.createElement('div'); preview.className='message-preview'; preview.textContent=messagePreview(m)||'Open message to view content.';
    btn.append(top,subject,preview);
    btn.addEventListener('click',()=>openMessage(id,btn));
    list.append(btn);
    if(index===0) setTimeout(()=>btn.click(),0);
  });
}

function renderMessage(message){
  const view=oq('#outlookMessageView'); if(!view)return;
  view.innerHTML=''; view.className='message-view';
  const subject=document.createElement('h2'); subject.textContent=messageSubject(message);
  const meta=document.createElement('div'); meta.className='message-meta';
  const from=document.createElement('span'); from.textContent=`From: ${messageSender(message)}`;
  const date=document.createElement('span'); date.textContent=prettyTime(messageTime(message));
  meta.append(from,date);
  const body=document.createElement('pre'); body.className='message-body'; body.textContent=messageBody(message) || messagePreview(message) || 'No message body returned by the API.';
  view.append(subject,meta,body);
}

async function openMessage(id, button){
  const account=oq('#outlookAccount')?.value; if(!account||!id)return;
  document.querySelectorAll('.message-item').forEach(el=>el.classList.toggle('active',el===button));
  const view=oq('#outlookMessageView'); if(view){view.className='message-view empty-state';view.textContent='Loading message…';}
  try{
    const data=await outlookApi('message',{account_id:account,message_id:id});
    const message=data?.message || data?.data || data;
    renderMessage(message);
  }catch(err){
    if(view){view.className='message-view empty-state';view.textContent=err.message;}
  }
}

async function loadInbox(){
  const account=oq('#outlookAccount')?.value;
  if(!account){renderMessages([]);return;}
  const refresh=oq('#refreshOutlook'); setLoading(refresh,true,'Refreshing…'); showOutlookError('');
  oq('#outlookAccountLabel').textContent=oq('#outlookAccount')?.selectedOptions?.[0]?.textContent || account;
  try{
    const top=oq('#outlookTop')?.value || '20';
    const data=await outlookApi('messages',{account_id:account,top});
    const messages=asArray(data,['messages']);
    renderMessages(messages);
    oq('#outlookLastUpdated').textContent=`Updated ${new Date().toLocaleTimeString()}`;
  }catch(err){showOutlookError(err.message);renderMessages([]);}finally{setLoading(refresh,false);}
}

async function initOutlook(){
  if(!oq('#outlookAccount'))return;
  showOutlookError('');
  try{
    await outlookApi('health');
    setOutlookStatus(true,'API connected');
  }catch(err){
    setOutlookStatus(false,'API unavailable');
    showOutlookError(`${err.message}. If this is your first deploy, add OUTLOOK_API_KEY in Netlify → Site configuration → Environment variables, then redeploy.`);
  }

  try{
    const balanceData=await outlookApi('balance');
    const balance=firstValue(balanceData,['balance','credits','amount'], firstValue(balanceData?.data||{},['balance','credits','amount'],'—'));
    oq('#outlookBalance').textContent=String(balance ?? '—');
  }catch{ oq('#outlookBalance').textContent='—'; }

  try{
    const data=await outlookApi('accounts');
    const accounts=asArray(data,['accounts']);
    renderAccounts(accounts);
    if(accounts.length) await loadInbox();
  }catch(err){
    renderAccounts([]);
    showOutlookError(err.message);
  }
}

oq('#refreshOutlook')?.addEventListener('click',loadInbox);
oq('#outlookAccount')?.addEventListener('change',loadInbox);
oq('#outlookTop')?.addEventListener('change',()=>{ if(oq('#outlookAccount')?.value) loadInbox(); });
initOutlook();
