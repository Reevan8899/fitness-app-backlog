import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuth } from '../src/auth.js';
const valid = { email: 'athlete@example.com', password: 'Training2026', confirmPassword: 'Training2026' };

test('registration normalizes email, starts session and sends welcome message', async () => {
  const auth=createAuth(); const result=await auth.register({...valid,email:' ATHLETE@EXAMPLE.COM '});
  assert.equal(result.user.email,valid.email); assert.equal(result.token.length,64);
  assert.deepEqual(auth.getUser(result.token),result.user); assert.equal(auth.outbox[0].to,valid.email);
  assert.match(auth.outbox[0].subject,/Добро пожаловать/); assert.equal(result.user.passwordHash,undefined);
  result.user.email='changed'; assert.equal(auth.getUser(result.token).email,valid.email);
});
test('duplicate addresses are rejected regardless of case', async () => {
  const auth=createAuth(); await auth.register(valid);
  await assert.rejects(auth.register({...valid,email:'ATHLETE@example.com'}),{status:409});
  assert.equal(auth.outbox.length,1);
});
test('validation rejects malformed input and permits minimum password length', async () => {
  for(const input of [undefined,{}, {...valid,email:42},{...valid,email:'wrong'}, {...valid,email:'x'.repeat(250)+'@a.test'}, {...valid,password:2},{...valid,password:'short'}, {...valid,password:'a'.repeat(129)},{...valid,confirmPassword:'different'}]) {
    await assert.rejects(createAuth().register(input),{status:400});
  }
  const result=await createAuth().register({...valid,password:'12345678',confirmPassword:'12345678'});
  assert.ok(result.user.id);
});
test('unknown session is unauthenticated',()=>assert.equal(createAuth().getUser('unknown'),null));
test('mail transport failure rolls back user and allows retry',async()=>{
  let calls=0;const auth=createAuth({sendWelcome:async()=>{if(++calls===1)throw new Error('mail offline');}});
  await assert.rejects(auth.register(valid),{status:503}); assert.ok((await auth.register(valid)).token);
});
test('concurrent duplicate registration is rejected',async()=>{
  let finish; const auth=createAuth({sendWelcome:()=>new Promise(resolve=>{finish=resolve;})});
  const pending=auth.register(valid);await assert.rejects(auth.register(valid),{status:409});finish();await pending;
});
