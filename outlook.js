const $=s=>document.querySelector(s);

const api=async(action,params={})=>{
  const q=new URLSearchParams({action,...params});
  const r=await fetch(`/.netlify/functions/outlook?${q}`,{headers:{Accept:'application/json'}});
  const t=await r.text();
  let d;
  try{d=t?JSON.parse(t):{}}catch{d={message:t}}
  if(!r.ok)throw new Error(d.error||d.message||`Request failed (${r.status})`);
  return d;
};

// The Outlook API wraps its main payload in `data`. Depending on the
// endpoint/version, lists may appear as data[], data.accounts, data.items,
// accounts, or items. Accept all documented/common shapes.
const arr=(d,k)=>{
  if(Array.isArray(d))return d;
  if(Array.isArray(d?.[k]))return d[k];
  if(Array.isArray(d?.data))return d.data;
  if(Array.isArray(d?.data?.[k]))return d.data[k];
  if(Array.isArray(d?.data?.items))return d.data.items;
  if(Array.isArray(d?.items))return d.items;
  return [];
};

const pick=(o,ks,f='')=>{for(const k of ks)if(o?.[k]!=null&&o[k]!=='')return o[k];return f};
const aid=a=>String(pick(a,['id','account_id','accountId','uuid']));
const email=a=>String(pick(a,['email','address','username','mail','login'],''));
const mid=m=>String(pick(m,['id','message_id','messageId','uuid']));
const sender=m=>{const x=pick(m,['from','sender','from_address','fromAddress','sender_email','senderEmail'],'Unknown sender');return typeof x==='object'?String(pick(x,['email','address','name'],'Unknown sender')):String(x)};
const subject=m=>String(pick(m,['subject','title'],'(No subject)'));
const when=m=>pick(m,['received_at','receivedAt','created_at','createdAt','date','timestamp','sent_at','sentAt'],'');
const body=m=>{const x=pick(m,['body','content','html','text','message'],'');return typeof x==='object'?String(pick(x,['content','text','html','value'],JSON.stringify(x,null,2))):String(x||'')};
const time=x=>{if(!x)return'';const d=new Date(x);return Number.isNaN(d.getTime())?String(x):d.toLocaleString()};

let accounts=[];
function showError(x){const e=$('#outlookError');e.hidden=!x;e.textContent=x||''}
function status(ok,t){$('#outlookStatusDot')?.classList.toggle('online',ok);if($('#outlookStatusText'))$('#outlookStatusText').textContent=t}

function renderResults(list){
  const box=$('#outlookResults');
  box.innerHTML='';
  if(!list.length){box.innerHTML='<div class="empty-state">No matching Outlook account found.</div>';return}
  list.forEach(a=>{
    const id=aid(a),em=email(a),row=document.createElement('div');
    row.className='account-result';
    const info=document.createElement('div');
    const title=document.createElement('strong');title.textContent=em||'Unnamed account';
    const meta=document.createElement('div');meta.className='account-meta';meta.textContent='Authorized Outlook mailbox';
    info.append(title,meta);
    const btn=document.createElement('button');btn.type='button';btn.className='primary';btn.textContent='View Inbox';btn.disabled=!id;btn.onclick=()=>selectAccount(id,em);
    row.append(info,btn);box.append(row)
  })
}

async function selectAccount(id,em){$('#outlookAccountLabel').textContent=em||id;await loadInbox(id)}

function renderMessages(ms){
  const l=$('#outlookMessages');l.innerHTML='';$('#outlookMessageCount').textContent=ms.length;
  if(!ms.length){l.innerHTML='<div class="empty-state">No messages found for this account.</div>';return}
  ms.forEach((m,i)=>{
    const b=document.createElement('button');b.type='button';b.className='message-item';b.dataset.account=window.selectedAccount||'';
    const top=document.createElement('div');top.className='message-item-top';
    const s=document.createElement('strong');s.textContent=sender(m);
    const tm=document.createElement('span');tm.textContent=time(when(m));top.append(s,tm);
    const sub=document.createElement('div');sub.className='message-subject';sub.textContent=subject(m);
    const p=document.createElement('div');p.className='message-preview';p.textContent=String(pick(m,['preview','snippet','text_preview','textPreview','body_preview','bodyPreview','text'],'')).replace(/\s+/g,' ').trim()||'Open message to view content.';
    b.append(top,sub,p);b.onclick=()=>openMessage(mid(m),b);l.append(b);if(i===0)setTimeout(()=>b.click(),0)
  })
}

async function openMessage(id,b){
  const account=b?.dataset?.account||window.selectedAccount;if(!account||!id)return;
  document.querySelectorAll('.message-item').forEach(x=>x.classList.toggle('active',x===b));
  const v=$('#outlookMessageView');v.className='message-view empty-state';v.textContent='Loading message…';
  try{
    const d=await api('message',{account_id:account,message_id:id});
    const m=d?.message||d?.data?.message||d?.data||d;
    v.className='message-view';v.innerHTML='';
    const h=document.createElement('h2');h.textContent=subject(m);
    const meta=document.createElement('div');meta.className='message-meta';
    const f=document.createElement('span');f.textContent=`From: ${sender(m)}`;
    const dt=document.createElement('span');dt.textContent=time(when(m));meta.append(f,dt);
    const pre=document.createElement('pre');pre.className='message-body';pre.textContent=body(m)||'No message body returned by the API.';v.append(h,meta,pre)
  }catch(e){v.textContent=e.message}
}

async function loadInbox(id){
  if(!id){renderMessages([]);return}
  window.selectedAccount=id;
  const btn=$('#searchOutlook');btn.disabled=true;btn.textContent='Loading…';showError('');
  try{
    const d=await api('messages',{account_id:id,top:$('#outlookTop').value||20});
    const ms=arr(d,'messages');
    renderMessages(ms);
    $('#outlookLastUpdated').textContent=`Updated ${new Date().toLocaleTimeString()}`
  }catch(e){showError(e.message)}finally{btn.disabled=false;btn.textContent='Search'}
}

async function search(){
  const q=$('#outlookSearch').value.trim().toLowerCase();
  if(!q){$('#outlookSearchStatus').textContent='Enter an Outlook email address first.';$('#outlookResults').innerHTML='';return}
  showError('');$('#outlookSearchStatus').textContent='Searching connected Outlook accounts…';
  try{
    if(!accounts.length){
      const d=await api('accounts');
      accounts=arr(d,'accounts');
    }
    const matches=accounts.filter(a=>email(a).toLowerCase().includes(q));
    renderResults(matches);
    $('#outlookSearchStatus').textContent=matches.length?`${matches.length} matching account${matches.length===1?'':'s'} found.`:'No matching account found.'
  }catch(e){showError(e.message);$('#outlookSearchStatus').textContent='Unable to search the Outlook API.'}
}

async function init(){
  try{await api('health');status(true,'API connected')}catch(e){status(false,'API unavailable');showError(`${e.message}. Add OUTLOOK_API_KEY to Netlify environment variables and redeploy.`)}
  try{
    const d=await api('balance');
    $('#outlookBalance').textContent=String(pick(d,['balance','credits','amount'],pick(d?.data||{},['balance','credits','amount'],'—')))
  }catch{}
  try{
    const d=await api('accounts');
    accounts=arr(d,'accounts');
    $('#outlookSearchStatus').textContent=accounts.length?`${accounts.length} authorized Outlook account${accounts.length===1?'':'s'} available. Type an address to search.`:'No authorized Outlook accounts are currently available.'
  }catch(e){showError(e.message)}
}

$('#searchOutlook')?.addEventListener('click',search);
$('#outlookSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter')search()});
$('#outlookTop')?.addEventListener('change',()=>{if(window.selectedAccount)loadInbox(window.selectedAccount)});
init();
