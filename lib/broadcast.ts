export type Source='dock'|'party';
export type Shot={id:number;kind:'ident'|'plate'|'caller'|'pressure'|'closing';image:string;caption:string;source?:Source};
export type Cut={ident:string;preview:string;source:Source;onAir:string;shots:Shot[];decision:'pending'|'call'|'hold'|'switch'|'revise';corrected:boolean;pressure:'pending'|'air'|'protect'};
export const emptyCut:Cut={ident:'',preview:'',source:'dock',onAir:'',shots:[],decision:'pending',corrected:false,pressure:'pending'};
export type Action={type:'ident';image:string}|{type:'save';image:string;source:Source}|{type:'live'}|{type:'decide';decision:Cut['decision'];image?:string}|{type:'pressure';choice:'air'|'protect';image:string}|{type:'close';image?:string}|{type:'rewind'};
export function cutReducer(c:Cut,a:Action):Cut{
 if(a.type==='rewind'){const first=c.shots.find(s=>s.kind==='plate');return first?{...c,preview:first.image,onAir:first.image,source:first.source??'dock',shots:c.shots.slice(0,2),decision:'pending',corrected:false,pressure:'pending'}:c;}
 if(a.type==='pressure'){if(c.pressure!=='pending')return c;return {...c,pressure:a.choice,onAir:a.choice==='air'?a.image:c.onAir,shots:[...c.shots,{id:c.shots.length+1,kind:'pressure',image:a.choice==='air'?a.image:c.onAir,caption:a.choice==='air'?'You put the intimidation on record.':'You kept the source out of the frame.'}]};}
 if(a.type==='ident')return {...emptyCut,ident:a.image,onAir:a.image,shots:[{id:1,kind:'ident',image:a.image,caption:'The station is yours.'}]};
 if(a.type==='save')return {...c,preview:a.image,source:a.source};
 if(a.type==='live'){if(!c.preview)return c;return {...c,onAir:c.preview,corrected:c.decision!=='pending',shots:[...c.shots,{id:c.shots.length+1,kind:'plate',image:c.preview,source:c.source,caption:c.decision==='pending'?'The first cut.':'A different picture.'}]};}
 if(a.type==='decide'){if(c.decision!=='pending')return c;const im=a.decision==='switch'&&a.image?a.image:c.onAir;return {...c,decision:a.decision,onAir:im,shots:[...c.shots,{id:c.shots.length+1,kind:'caller',image:im,caption:a.decision==='call'?(c.source==='dock'?'Caller: “The fish is a prop.”':'Caller: “Our trophy is missing.”'):a.decision==='switch'?'You switched to the second angle.':a.decision==='revise'?'You opened the picture for a second look.':'You held the shot.'}]};}
 return {...c,shots:[...c.shots,{id:c.shots.length+1,kind:'closing',image:a.image??c.onAir,caption:ending(c)}]};
}
export function ending(c:Cut){return c.pressure==='air'?'They wanted silence. You made television.':c.pressure==='protect'?'The source stayed safe. The picture got out.':c.corrected?'You changed the picture. That matters.':c.decision==='switch'?'Two cameras. A different story.':c.decision==='call'?'You gave the other voice airtime.':'You stood by the first cut.';}
