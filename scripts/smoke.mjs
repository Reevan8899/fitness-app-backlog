import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createAuth } from '../src/auth.js';
const auth=createAuth();const app=createApp(auth);
await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${app.address().port}`;
try {
  assert.equal((await fetch(base)).status,200);console.log('PASS registration form: HTTP 200');
  const response=await fetch(base+'/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'smoke@example.com',password:'Training2026',confirmPassword:'Training2026'})});
  assert.equal(response.status,201);console.log('PASS registration: HTTP 201');
  const me=await fetch(base+'/api/me',{headers:{cookie:response.headers.get('set-cookie').split(';')[0]}});
  assert.equal(me.status,200);console.log('PASS automatic login: HTTP 200');
  assert.equal(auth.outbox.length,1);console.log('PASS welcome email: delivered to test outbox');
}finally{await new Promise(resolve=>app.close(resolve));}
