export function createActivity(count,work) {
  if(!Number.isInteger(count)||count<1||count>20) throw new Error('作業人数は1～20名で入力してください。');
  if(!work.trim()) throw new Error('本日の作業内容を入力してください。');
  return {count,work:work.trim(),index:0,phase:'danger',answers:[],goal:''};
}
export function advance(s,input='') {
  const value=input.trim();
  if(['danger','measure','goal'].includes(s.phase)&&!value) throw new Error('回答を入力してください。');
  const n=structuredClone(s);
  if(s.phase==='danger'){n.answers.push({danger:value,measure:''});n.phase='measure';}
  else if(s.phase==='measure'){n.answers[n.index].measure=value;n.phase='ack';}
  else if(s.phase==='ack'){if(n.index+1<n.count){n.index++;n.phase='danger';}else n.phase='goal';}
  else if(s.phase==='goal'){n.goal=value;n.phase='confirm';}
  else if(s.phase==='confirm') n.phase='complete';
  return n;
}
export function prompt(s){
  if(s.phase==='danger') return `${s.index+1}人目の方、どのような危険がありますか？`;
  if(s.phase==='measure') return `${s.index+1}人目の方、その危険に対する対策は何ですか？`;
  if(s.phase==='ack') return '回答ありがとうございます。危険と対策を受け付けました。次へ進んでください。';
  if(s.phase==='goal') return '全員の回答がそろいました。一覧を確認して、本日の重点安全目標を入力してください。';
  if(s.phase==='confirm') return `本日の重点安全目標は「${s.goal}」です。この内容で確認を完了しますか？`;
  return '重点安全目標を確認しました。本日のKY活動は完了です。';
}
const KEY='ky-navigator-v06-draft';
// Rebuild through the flow rules so damaged drafts cannot introduce invalid steps.
function restoreState(saved){
  if(saved===null)return null;
  if(!saved||!Array.isArray(saved.answers))throw new Error('Invalid activity');
  let state=createActivity(saved.count,saved.work);
  for(let step=0;step<64;step++){
    if(JSON.stringify(state)===JSON.stringify(saved))return state;
    if(state.phase==='complete')break;
    const answer=saved.answers[state.index];
    const input=state.phase==='danger'?answer?.danger:state.phase==='measure'?answer?.measure:state.phase==='goal'?saved.goal:'';
    if(typeof input!=='string')throw new Error('Invalid answer');
    state=advance(state,input);
  }
  throw new Error('Invalid progress');
}
export function saveDraft(storage,draft){
  try{storage.setItem(KEY,JSON.stringify({version:1,...draft}));return true;}catch{return false;}
}
export function loadDraft(storage){
  try{
    const raw=storage.getItem(KEY);if(raw===null)return {draft:null,error:false};
    const draft=JSON.parse(raw);
    if(draft.version!==1||!['count','work','answer'].every(k=>typeof draft[k]==='string'))throw new Error('Invalid draft');
    draft.state=restoreState(draft.state);
    return {draft,error:false};
  }catch{return {draft:null,error:true};}
}

