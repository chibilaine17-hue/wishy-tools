const ALLOWED=new Set(['health','balance','stock','accounts','messages','message']);
const json=(statusCode,payload)=>({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},body:JSON.stringify(payload)});

exports.handler=async event=>{
  if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});

  const q=event.queryStringParameters||{};
  const action=String(q.action||'');
  if(!ALLOWED.has(action))return json(400,{error:'Unsupported Outlook API action'});

  const base=(process.env.OUTLOOK_API_BASE||'https://api.outlook.taqiyyanz.com').replace(/\/$/,'');

  // The provider explicitly documents /health as a public endpoint.
  if(action==='health'){
    try{
      const r=await fetch(base+'/health',{headers:{Accept:'application/json'}});
      const t=await r.text();
      let b;try{b=t?JSON.parse(t):{}}catch{b={message:t}}
      return json(r.status,b);
    }catch(e){
      return json(502,{error:'Could not reach Outlook API',details:e.message});
    }
  }

  const key=process.env.OUTLOOK_API_KEY;
  if(!key)return json(503,{error:'OUTLOOK_API_KEY is not available to this Netlify Function. Confirm the variable is enabled for Functions/Runtime in the current deploy context, then trigger a new deploy.'});

  let path;
  if(action==='balance')path='/v1/balance';
  if(action==='stock')path='/v1/accounts/available';
  if(action==='accounts')path='/v1/accounts';

  const aid=String(q.account_id||'');
  const mid=String(q.message_id||'');

  if(action==='messages'){
    if(!aid)return json(400,{error:'account_id is required'});
    const top=Math.max(1,Math.min(50,Number(q.top)||20));
    path=`/v1/accounts/${encodeURIComponent(aid)}/messages?top=${top}`;
  }

  if(action==='message'){
    if(!aid||!mid)return json(400,{error:'account_id and message_id are required'});
    path=`/v1/accounts/${encodeURIComponent(aid)}/messages/${encodeURIComponent(mid)}`;
  }

  try{
    const r=await fetch(base+path,{headers:{Authorization:`Bearer ${key}`,Accept:'application/json'}});
    const t=await r.text();
    let b;try{b=t?JSON.parse(t):{}}catch{b={message:t}}
    return json(r.status,b);
  }catch(e){
    return json(502,{error:'Could not reach Outlook API',details:e.message});
  }
};
