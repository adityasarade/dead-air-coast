export class StationAudio {
 private ctx:AudioContext|null=null;
 private loading:Promise<AudioBuffer[]>|null=null;
 private gains:GainNode[]=[];
 private sources:AudioBufferSourceNode[]=[];
 private state='intro'; private master:GainNode|null=null; private epoch=0;
 async start(){
  const epoch=++this.epoch;this.ctx??=new AudioContext();const ctx=this.ctx;await ctx.resume();
  this.loading??=Promise.all(['bass','epiano','drums','tension'].map(async n=>{const r=await fetch('/audio/heist-'+n+'.wav');if(!r.ok)throw Error('Music is unavailable.');return ctx.decodeAudioData(await r.arrayBuffer());})).catch(e=>{this.loading=null;throw e;});
  const buffers=await this.loading;if(epoch!==this.epoch)return;if(this.sources.length)return;
  this.master=ctx.createGain();this.master.gain.value=.62;this.master.connect(ctx.destination);
  const when=ctx.currentTime+.06;
  this.sources=buffers.map(b=>{const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=b;source.loop=true;source.connect(gain);gain.connect(this.master!);this.gains.push(gain);source.start(when);return source;});this.setScene(this.state);
 }
 setScene(state:string){this.state=state;if(!this.ctx)return;const tense=['call','pressure'].includes(state),active=['watch','desk','call','pressure','replay','ending'].includes(state);const levels=tense?[.48,.32,.42,.80]:active?[.95,.7,.95,.28]:[.8,.55,.65,.12];this.gains.forEach((g,i)=>g.gain.setTargetAtTime(levels[i],this.ctx!.currentTime,.18));}
 cue(kind:'live'|'message'|'cut'){
  if(!this.ctx||!this.sources.length)return;const ctx=this.ctx,t=ctx.currentTime;
  for(let i=0;i<2;i++){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=kind==='message'?(i?880:660):kind==='live'?(i?440:220):(i?120:180);o.connect(g);g.connect(ctx.destination);g.gain.setValueAtTime(0,t+i*.11);g.gain.linearRampToValueAtTime(.035,t+i*.11+.008);g.gain.exponentialRampToValueAtTime(.001,t+i*.11+.095);o.start(t+i*.11);o.stop(t+i*.11+.10);}
 }
 stop(){this.epoch++;this.sources.forEach(s=>{try{s.stop();}catch{}});this.sources=[];this.gains.forEach(g=>g.disconnect());this.gains=[];this.master?.disconnect();}
 close(){this.stop();void this.ctx?.close();this.ctx=null;this.loading=null;}
}
