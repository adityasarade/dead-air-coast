/** One licensed recording, one player, conservative gain. No generated oscillators or layered stems. */
export class StationAudio {
 private ctx:AudioContext|null=null;
 private player:HTMLAudioElement|null=null;
 private gain:GainNode|null=null;
 private source:MediaElementAudioSourceNode|null=null;
 private state='intro'; private epoch=0; private wanted=false;
 private channel:BroadcastChannel|null=null;
 constructor(private onExternalMute:()=>void=()=>{}){
  if(typeof BroadcastChannel!=='undefined'){this.channel=new BroadcastChannel('dead-air-music-owner');this.channel.onmessage=()=>{if(this.wanted){this.stop();this.onExternalMute();}};}
 }
 async start(){
  const epoch=++this.epoch;this.wanted=true;
  this.ctx??=new AudioContext();
  if(!this.player){this.player=new Audio('/audio/chase-pulse.mp3');this.player.loop=true;this.player.preload='auto';this.source=this.ctx.createMediaElementSource(this.player);this.gain=this.ctx.createGain();this.gain.gain.value=0;this.source.connect(this.gain);this.gain.connect(this.ctx.destination);}
  await this.ctx.resume();if(epoch!==this.epoch)return;
  await this.player.play();if(epoch!==this.epoch){if(!this.wanted)this.player.pause();return;}
  this.channel?.postMessage('playing');this.setScene(this.state);
 }
 setScene(state:string){this.state=state;if(!this.ctx||!this.gain)return;const volume=['pressure','call'].includes(state)?.16:['watch','desk','replay'].includes(state)?.32:.24;this.gain.gain.cancelScheduledValues(this.ctx.currentTime);this.gain.gain.setTargetAtTime(this.wanted?volume:0,this.ctx.currentTime,.18);}
 cue(_kind:'live'|'message'|'cut'){/* Visual cues carry these events; no harsh overlay beeps. */}
 stop(){this.epoch++;this.wanted=false;if(this.ctx&&this.gain){this.gain.gain.cancelScheduledValues(this.ctx.currentTime);this.gain.gain.setTargetAtTime(0,this.ctx.currentTime,.04);}const epoch=this.epoch;setTimeout(()=>{if(this.epoch===epoch&&!this.wanted)this.player?.pause();},180);}
 close(){this.stop();this.player?.pause();this.player?.removeAttribute('src');this.player?.load();this.player=null;this.source?.disconnect();this.gain?.disconnect();void this.ctx?.close();this.ctx=null;this.channel?.close();}
}
