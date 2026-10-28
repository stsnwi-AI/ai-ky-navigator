// External speech adapter: generated VOICEVOX WAV, no device speechSynthesis fallback.
export class VoicevoxPlayer {
  constructor({status=()=>{}}={}) {this.status=status;this.audio=null;this.currentUrl=null;this.controller=null;}
  stop(){if(this.controller){this.controller.abort();this.controller=null;}if(this.audio){this.audio.pause();this.audio.currentTime=0;this.audio=null;}if(this.currentUrl){URL.revokeObjectURL(this.currentUrl);this.currentUrl=null;}}
  async speak({endpoint,text,speaker,style='friendly'}){
    this.stop();
    const url=String(endpoint||'').replace(/\/$/,'');
    if(!/^https:\/\//i.test(url)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url))throw new Error('HTTPSかローカルのVOICEVOXアドレスを指定してください。');
    if(!text.trim())return;
    const controller=new AbortController();this.controller=controller;
    const params=new URLSearchParams({text,speaker:String(speaker)});
    this.status('外部エンジンで音声を生成しています…');
    const query=await fetch(`${url}/audio_query?${params}`,{method:'POST',signal:controller.signal});
    if(!query.ok)throw new Error(`音声クエリに失敗しました (${query.status})`);
    const config=await query.json();
    config.speedScale=style==='bright'?1.08:0.96;
    config.pitchScale=0; // Avoid artificial gender simulation.
    config.intonationScale=style==='bright'?1.1:1.0;
    const r=await fetch(`${url}/synthesis?speaker=${encodeURIComponent(speaker)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(config),signal:controller.signal});
    if(!r.ok)throw new Error(`音声生成に失敗しました (${r.status})`);
    const wav=await r.blob();if(controller.signal.aborted)return;
    this.currentUrl=URL.createObjectURL(wav);
    const audio=new Audio(this.currentUrl);this.audio=audio;
    audio.onended=()=>{if(this.audio===audio)this.status('読み上げ完了');};
    this.status('外部音声を再生中');await audio.play();
  }
}
export async function fetchSpeakers(endpoint){
  const url=String(endpoint||'').replace(/\/$/,'');
  if(!/^https:\/\//i.test(url)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url))throw new Error('HTTPSかローカルのVOICEVOXアドレスを指定してください。');
  const r=await fetch(`${url}/speakers`,{signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw new Error(`音声一覧を取得できません (${r.status})`);
  const list=await r.json();
  return list.flatMap(s=>(s.styles||[]).filter(v=>v.type===undefined||v.type==='talk').map(v=>({id:v.id,label:`${s.name} / ${v.name}`})));
}