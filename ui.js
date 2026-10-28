import {createActivity,advance,prompt,saveDraft,loadDraft} from './flow.js';

const $=id=>document.getElementById(id);
let state=null,voices=[],utterance=null;
let recognition=null, listening=false, capturedBase="", finalTranscript="";
// The getter itself may throw when browser storage is disabled.
let storage;try{storage=window.localStorage;}catch{}
function persist(){
  const ok=saveDraft(storage,{state,count:$('count').value,work:$('work').value,answer:$('answer').value});
  $('save-status').textContent=ok?'入力内容をこのブラウザに自動保存しました。再読み込み後も続けられます。':'このブラウザでは自動保存できません。再読み込みや終了をすると入力内容が失われます。';
}
let synth;try{synth=window.speechSynthesis;}catch{}
// Voice metadata has no standardized gender field. Prefer known voice names, never pitch-shift a voice to fake gender.
const names={female:/(nanami|haruka|ayumi|sayaka|kyoko|o-ren|shiori|mizuki|ななみ|はるか|female|woman|女性)/i,male:/(keita|ichiro|takumi|otoya|けいた|いちろう|male|man|男性)/i};
function selectedVoice(){
  if($('voice').value!=='auto')return voices.find(v=>v.voiceURI===$('voice').value);
  const candidates=voices.filter(v=>names[$('gender').value].test(v.name));
  return candidates.find(v=>v.localService)||candidates[0];
}
function voiceStatus(){
  const v=selectedVoice();
  const status=!synth?'このブラウザは音声読み上げに対応していません。':!voices.length?'日本語音声が見つかりません。端末の音声設定をご確認ください。':!v?'選択した性別と判別できる声がありません。音声一覧から手動で選択してください。':`使用音声：${v.name}（${v.localService?'端末内':'ブラウザ提供の音声'}）。声の性別は端末によって異なります。`;
  $('voice-status').textContent=status;
  for(const id of ['speak','replay'])$(id).disabled=!synth||!v;
}
function loadVoices(){
  const prior=$('voice').value;
  voices=synth?synth.getVoices().filter(v=>/^ja(?:[-_]|$)/i.test(v.lang)):[];
  $('voice').replaceChildren(new Option('性別から自動選択','auto'));
  voices.forEach(v=>$('voice').add(new Option(`${v.name} ${v.localService?'（端末内）':'（ブラウザ）'}`,v.voiceURI)));
  if(voices.some(v=>v.voiceURI===prior))$('voice').value=prior;
  voiceStatus();
}
function stop(){if(synth)synth.cancel();utterance=null;$('speech-status').textContent='読み上げ停止中';}
// A less scripted, conversational delivery. Only the narration changes; written KY records remain untouched.
function naturalPrompt(){
  if(!state)return '本日の作業内容と、人数を教えてください。';
  const who=`${state.index+1}人目の方`;
  const casual=$('style').value==='friendly';
  if(state.phase==='danger')return casual?`${who}。今日の作業で、どんな危険がありそうですか？`:`${who}、危険だと思うことを教えてください。`;
  if(state.phase==='measure')return casual?`ありがとうございます。では、その危険を防ぐには、どうしたらいいでしょうか？`:`ありがとうございます。その危険への対策をお願いします。`;
  if(state.phase==='ack')return casual?'ありがとうございます。では、次に進みましょう。':'ありがとうございます。次の方、お願いします。';
  if(state.phase==='goal')return '皆さん、ありがとうございます。最後に、今日の重点安全目標を決めましょう。';
  if(state.phase==='confirm')return `今日の重点安全目標は、${state.goal}。この内容でよろしいですか？`;
  return '皆さん、ありがとうございました。今日も一日、ご安全に。';
}
function speak(){
  stop();const v=selectedVoice();if(!v||!synth)return;
  const u=new SpeechSynthesisUtterance(naturalPrompt());utterance=u;
  u.voice=v;u.lang='ja-JP';
  // Exaggerated pitch made each voice sound synthetic and often disguised gender differences.
  u.rate=$('style').value==='bright'?1.04:0.92;
  u.pitch=1.0;u.volume=1;
  u.onstart=()=>{$('speech-status').textContent='読み上げ中';};
  u.onend=()=>{if(utterance===u)$('speech-status').textContent='読み上げ完了';};
  u.onerror=e=>{if(utterance===u)$('speech-status').textContent=`読み上げに失敗しました（${e.error}）。別の声を選ぶか、文字で進めてください。`;};
  synth.speak(u);
}
// SpeechRecognition is optional and may use browser-provider cloud processing.
const SpeechRecognizer=window.SpeechRecognition||window.webkitSpeechRecognition;
function micMessage(message){$('mic-status').textContent=message;}
function micStop(){
  if(recognition){try{recognition.stop();}catch{}}
  listening=false;
  $('mic-start').disabled=false;$('mic-stop').disabled=true;
}
function micStart(){
  if(!SpeechRecognizer||!state||!['danger','measure','goal'].includes(state.phase))return;
  micStop();
  capturedBase=$('answer').value.trim();finalTranscript='';$('mic-preview').textContent='';
  try{
    recognition=new SpeechRecognizer();
    recognition.lang='ja-JP';recognition.continuous=true;recognition.interimResults=true;
    recognition.onstart=()=>{listening=true;$('mic-start').disabled=true;$('mic-stop').disabled=false;micMessage('聞き取り中です。話し終えたら「音声入力を停止」を押してください。');};
    recognition.onresult=event=>{
      let interim='';
      // Rebuild from this session to prevent duplicate interim text.
      let confirmed='';
      for(let i=0;i<event.results.length;i++){
        const phrase=event.results[i][0]?.transcript||'';
        if(event.results[i].isFinal)confirmed+=phrase;
        else interim+=phrase;
      }
      finalTranscript=confirmed;
      const joined=[capturedBase,confirmed].filter(Boolean).join(capturedBase?'\n':'');
      $('answer').value=joined.slice(0,4000);
      $('mic-preview').textContent=interim?`認識中：${interim}`:'';
      persist();
    };
    recognition.onerror=e=>{
      const messages={'not-allowed':'マイクが許可されていません。ブラウザのサイト設定で許可してください。','no-speech':'声を検出できませんでした。もう一度お試しください。','audio-capture':'マイクを使用できません。端末の設定を確認してください。','network':'音声認識サービスに接続できません。テキスト入力をご利用ください。'};
      micMessage(messages[e.error]||`音声認識エラー：${e.error}。手入力もできます。`);
    };
    recognition.onend=()=>{listening=false;$('mic-start').disabled=false;$('mic-stop').disabled=true;$('mic-preview').textContent='';if($('mic-status').textContent.startsWith('聞き取り中'))micMessage('音声入力を停止しました。回答を確認してください。');};
    recognition.start();
  }catch(err){micMessage(`マイクを開始できませんでした：${err.message}`);micStop();}
}
$('mic-start').onclick=micStart;
$('mic-stop').onclick=micStop;
function render(){
  micStop();
  $('setup').hidden=true;$('session').hidden=false;$('question').textContent=prompt(state);
  const answered=state.answers.filter(a=>a.measure).length;
  $('progress').textContent=`${state.count}名のKY活動 ・ 回答完了 ${answered} / ${state.count}名`;
  $('progress-bar').max=state.count;$('progress-bar').value=answered;
  $('work-display').textContent=`本日の作業：${state.work}`;
  $('previous').textContent=state.phase==='measure'?`あなたの危険予知：${state.answers[state.index].danger}`:'';
  const needs=['danger','measure','goal'].includes(state.phase);
  $('mic-panel').hidden=!needs;
  if(needs){micMessage(SpeechRecognizer?'マイクボタンを押して音声回答できます。音声はブラウザ提供元で処理される場合があります。':'このブラウザでは音声認識を利用できません。テキストで回答してください。');$('mic-start').disabled=!SpeechRecognizer;}
  $('answer').hidden=!needs;$('answer-label').hidden=!needs;$('answer').required=needs;$('answer').value='';
  $('answer-label').textContent=state.phase==='goal'?'本日の重点安全目標':state.phase==='measure'?'危険に対する対策':'予想される危険';
  $('next').hidden=state.phase==='complete';$('next').textContent=state.phase==='ack'?'次の確認へ →':state.phase==='confirm'?'重点安全目標を確認して完了': '回答を確定して次へ →';
  $('summary').hidden=!['goal','confirm','complete'].includes(state.phase);
  $('answers').replaceChildren();
  state.answers.forEach((a,i)=>{const card=document.createElement('article');card.className='answer-card';const h=document.createElement('h4');h.textContent=`${i+1}人目`;card.append(h);for(const [label,value] of [['危険',a.danger],['対策',a.measure]]){const p=document.createElement('p');p.textContent=`${label}：${value}`;card.append(p);}$('answers').append(card);});
  $('goal-result').hidden=!state.goal;$('goal-result').textContent=`重点安全目標${state.phase==='complete'?'（確認済み）':''}\n${state.goal}`;
  $('question').focus();
}
$('setup-form').addEventListener('submit',e=>{e.preventDefault();try{state=createActivity(Number($('count').value),$('work').value);$('error').textContent='';stop();render();persist();}catch(err){$('error').textContent=err.message;}});
$('answer-form').addEventListener('submit',e=>{e.preventDefault();try{state=advance(state,$('answer').value);$('error').textContent='';stop();render();persist();}catch(err){$('error').textContent=err.message;}});
$('reset').onclick=()=>{micStop();if(!confirm('回答と進行状況を消去して最初からやり直しますか？ 作業内容と人数は残ります。'))return;stop();state=null;$('answer').value='';$('session').hidden=true;$('setup').hidden=false;$('error').textContent='';persist();$('count').focus();};
$('clear-draft').onclick=()=>{micStop();if(!confirm('このブラウザに保存した作業内容・人数・すべての回答を消去しますか？'))return;stop();state=null;$('count').value='3';$('work').value='';$('answer').value='';$('session').hidden=true;$('setup').hidden=false;$('error').textContent='';persist();$('work').focus();};
for(const id of ['count','work','answer'])$(id).addEventListener('input',persist);
$('gender').onchange=()=>{stop();$('voice').value='auto';voiceStatus();};$('voice').onchange=()=>{stop();voiceStatus();};$('style').onchange=stop;
$('speak').onclick=speak;$('replay').onclick=speak;$('stop').onclick=stop;
try{if(synth)synth.addEventListener('voiceschanged',loadVoices);loadVoices();}catch{$('voice-status').textContent='音声機能を初期化できません。テキストで進行できます。';}
window.addEventListener('pagehide',()=>{stop();micStop();});
const restored=loadDraft(storage);
if(restored.draft){const d=restored.draft;$('count').value=d.count;$('work').value=d.work;state=d.state;if(state)render();$('answer').value=d.answer;$('save-status').textContent='保存していた入力内容を復元しました。';}
else if(restored.error)$('save-status').textContent='保存内容を復元できませんでした。ブラウザの保存設定を確認してください。';
$('start').disabled=false;
$('boot-status').textContent='起動完了：入力して開始できます。';
window.kyReady=true;
