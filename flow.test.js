import test from 'node:test';
import assert from 'node:assert/strict';
import {createActivity,advance,prompt} from './flow.js';
test('人数の範囲と空白入力を検証',()=>{for(const n of [0,21,1.5,NaN])assert.throws(()=>createActivity(n,'作業'));assert.throws(()=>createActivity(1,'  '));assert.throws(()=>advance(createActivity(1,'作業'),' '));});
for(const count of [1,3,20])test(`${count}名の危険→対策→受け止め→目標確認を順番に完了`,()=>{let s=createActivity(count,'本日の作業');for(let i=0;i<count;i++){assert.equal(s.index,i);assert.equal(s.phase,'danger');assert.match(prompt(s),/どのような危険/);s=advance(s,`危険${i}`);assert.equal(s.phase,'measure');s=advance(s,`対策${i}`);assert.equal(s.phase,'ack');s=advance(s);}assert.equal(s.phase,'goal');assert.deepEqual(s.answers,Array.from({length:count},(_,i)=>({danger:`危険${i}`,measure:`対策${i}`})));s=advance(s,'自分たちの目標');assert.equal(s.phase,'confirm');s=advance(s);assert.equal(s.phase,'complete');assert.equal(s.goal,'自分たちの目標');});
