const ALLOWED_ACTIONS = new Set(['health','balance','accounts','messages','message']);

function json(statusCode, payload){
  return {
    statusCode,
    headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'},
    body:JSON.stringify(payload)
  };
}

exports.handler = async (event) => {
  if(event.httpMethod !== 'GET') return json(405,{error:'Method not allowed'});

  const apiKey = process.env.OUTLOOK_API_KEY;
  const apiBase = (process.env.OUTLOOK_API_BASE || 'https://api.outlook.taqiyyanz.com').replace(/\/$/,'');
  if(!apiKey) return json(503,{error:'OUTLOOK_API_KEY is not configured in Netlify environment variables'});

  const q = event.queryStringParameters || {};
  const action = String(q.action || '').trim();
  if(!ALLOWED_ACTIONS.has(action)) return json(400,{error:'Unsupported Outlook API action'});

  let path;
  if(action === 'health') path = '/health';
  if(action === 'balance') path = '/v1/balance';
  if(action === 'accounts') path = '/v1/accounts';

  const accountId = String(q.account_id || '').trim();
  const messageId = String(q.message_id || '').trim();

  if(action === 'messages'){
    if(!accountId) return json(400,{error:'account_id is required'});
    const top = Math.max(1,Math.min(50,Number(q.top)||20));
    path = `/v1/accounts/${encodeURIComponent(accountId)}/messages?top=${top}`;
  }

  if(action === 'message'){
    if(!accountId || !messageId) return json(400,{error:'account_id and message_id are required'});
    path = `/v1/accounts/${encodeURIComponent(accountId)}/messages/${encodeURIComponent(messageId)}`;
  }

  try{
    const upstream = await fetch(`${apiBase}${path}`, {
      method:'GET',
      headers:{
        'Authorization':`Bearer ${apiKey}`,
        'Accept':'application/json'
      }
    });

    const text = await upstream.text();
    let body;
    try { body = text ? JSON.parse(text) : {}; }
    catch { body = {message:text}; }

    return json(upstream.status, body);
  }catch(err){
    return json(502,{error:'Could not reach Outlook API',details:err.message});
  }
};
