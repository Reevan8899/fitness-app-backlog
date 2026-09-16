import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createAuth } from '../src/auth.js';
async function withApp(callback,auth){const app=createApp(auth);await new Promise(r=>app.listen(0,'127.0.0.1',r));try{await callback(`http://127.0.0.1:${app.address().port}`);}finally{await new Promise(r=>app.close(r));}}
const valid={email:'runner@example.com',password:'Training2026',confirmPassword:'Training2026'};
test('HTTP form, registration, session cookie and duplicate flow',()=>withApp(async base=>{
  const page=await fetch(base);assert.equal(page.status,200);assert.match(await page.text(),/confirmPassword/);
  assert.equal((await fetch(base+'/api/me')).status,401);
  const response=await fetch(base+'/api/register',{method:'POST',body:JSON.stringify(valid)});
  assert.equal(response.status,201);const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly; SameSite=Strict/);
  const me=await fetch(base+'/api/me',{headers:{cookie:'other=x; '+cookie.split(';')[0]}});assert.equal(me.status,200);assert.equal((await me.json()).user.email,valid.email);
  assert.equal((await fetch(base+'/api/register',{method:'POST',body:JSON.stringify(valid)})).status,409);
  assert.equal((await fetch(base+'/missing')).status,404);
}));
test('HTTP malformed, null, array and oversized input',()=>withApp(async base=>{
  for(const body of ['{','null','[]','123','"text"','{}']) assert.equal((await fetch(base+'/api/register',{method:'POST',body})).status,400);
  assert.equal((await fetch(base+'/api/register',{method:'POST',body:'x'.repeat(9000)})).status,413);
}));
test('HTTP mail failure is service unavailable',()=>withApp(async base=>{
  assert.equal((await fetch(base+'/api/register',{method:'POST',body:JSON.stringify(valid)})).status,503);
},createAuth({sendWelcome:async()=>{throw new Error('down');}})));
test('unexpected exceptions return generic error without details',()=>withApp(async base=>{
  const response=await fetch(base+'/api/me');assert.equal(response.status,500);assert.deepEqual(await response.json(),{error:'Внутренняя ошибка.'});
},{getUser(){throw new Error('private details');}}));
