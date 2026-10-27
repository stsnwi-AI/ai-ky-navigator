import test from 'node:test';
import assert from 'node:assert/strict';
import {createActivity,advance} from './flow.js';
import {saveDraft,loadDraft} from './flow.js';
const memory=()=>({value:null,getItem(){return this.value;},setItem(key,value){this.value=value;}});
test('開始前の人数と作業内容を再読み込み用に保持する',()=>{const storage=memory();const d={state:null,count:'5',work:'配管取付\n午後は検査',answer:''};assert.equal(saveDraft(storage,d),true);assert.deepEqual(loadDraft(storage).draft,{version:1,...d});});
test('20名の各質問段階と未確定の文章を復元する',()=>{const storage=memory();let state=createActivity(20,'作業内容');for(let step=0;step<63;step++){const d={state,count:'20',work:'作業内容',answer:'入力途中の文章'};assert.equal(saveDraft(storage,d),true);assert.deepEqual(loadDraft(storage).draft,{version:1,...d});if(state.phase==='complete')break;state=advance(state,['danger','measure','goal'].includes(state.phase)?`回答${step}`:'');}assert.equal(state.phase,'complete');});
test('保存不可と破損データを検出し、アプリを停止させない',()=>{assert.equal(saveDraft(undefined,{}),false);assert.equal(loadDraft(undefined).error,true);const storage=memory();storage.value='{';assert.equal(loadDraft(storage).error,true);saveDraft(storage,{state:{...createActivity(1,'作業'),index:10},count:'1',work:'作業',answer:''});assert.equal(loadDraft(storage).error,true);});

