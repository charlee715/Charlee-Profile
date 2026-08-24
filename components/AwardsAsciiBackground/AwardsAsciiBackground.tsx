"use client";

import { useEffect, useRef } from "react";
import { createLinearTexture, createWebGLProgram } from "@/lib/webgl";
import styles from "./AwardsAsciiBackground.module.css";

const SYMBOLS = ["0", "1"];
const FEEDBACK_SIZE = 128;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const VERTEX_SHADER = `#version 300 es
out vec2 vUv;
const vec2 POSITIONS[3] = vec2[3](vec2(-1.0,-1.0),vec2(3.0,-1.0),vec2(-1.0,3.0));
void main(){vec2 p=POSITIONS[gl_VertexID];vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;

const FEEDBACK_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;out vec4 outColor;
uniform sampler2D uPrevious;
uniform vec2 uPointerStart,uPointerEnd,uVelocity;
uniform float uAspect,uRadius,uAmount,uFade,uFlowDecay,uActive;
vec2 segmentInfo(vec2 p,vec2 a,vec2 b){
  vec2 aspect=vec2(uAspect,1.);vec2 line=(b-a)*aspect;vec2 offset=(p-a)*aspect;
  float t=clamp(dot(offset,line)/max(dot(line,line),.000001),0.,1.);
  return vec2(length(offset-line*t),t);
}
float cellNoise(vec2 p){
  vec2 cell=floor(p*128.);
  return fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453123);
}
void main(){
  vec4 previous=texture(uPrevious,vUv);
  // Preserve the soft multiplicative tail, then apply only a tiny linear loss
  // so RGBA8 values cannot remain trapped on a quantisation level forever.
  float trail=max(0.,previous.r*uFade-(1.-uFade)*.08);
  vec2 flow=(previous.gb*2.-1.)*uFlowDecay;
  if(trail<.006)trail=0.;
  if(length(flow)<.012)flow=vec2(0.);
  if(uActive>.5){
    vec2 brush=segmentInfo(vUv,uPointerStart,uPointerEnd);
    float gaussian=exp(-(brush.x*brush.x)/max(uRadius*uRadius,.000001));
    float taper=mix(.52,1.,smoothstep(0.,1.,brush.y));
    float grain=mix(.76,1.18,cellNoise(vUv));
    float deposit=gaussian*taper*grain*uAmount;
    trail=min(1.,trail+deposit);
    flow=clamp(flow+uVelocity*deposit*.74,vec2(-1.),vec2(1.));
  }
  outColor=vec4(trail,flow*.5+.5,1.);
}`;

const COMPOSITE_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;out vec4 outColor;
uniform sampler2D uBase,uFeedback;
uniform vec2 uFeedbackTexel;
uniform float uAspect;
float cellNoise(vec2 p){
  vec2 cell=floor(p*128.);
  return fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453123);
}
void main(){
  vec4 state=texture(uFeedback,vUv);
  float neighbours=texture(uFeedback,vUv+vec2(uFeedbackTexel.x,0.)).r+
    texture(uFeedback,vUv-vec2(uFeedbackTexel.x,0.)).r+
    texture(uFeedback,vUv+vec2(0.,uFeedbackTexel.y)).r+
    texture(uFeedback,vUv-vec2(0.,uFeedbackTexel.y)).r;
  float field=state.r*.5+neighbours*.125;
  float noise=cellNoise(vUv);
  // Both boundaries use stochastic coverage rather than colour opacity:
  // cells switch cleanly between black and green while their density fades.
  float dyedField=step(.012+noise*.068,field);
  float core=step(.085+noise*.065,field);
  vec2 flow=state.gb*2.-1.;
  vec2 displacement=flow*vec2(.03/max(uAspect,.001),.03);
  vec3 baseSample=texture(uBase,vUv).rgb;
  vec3 shiftedSample=texture(uBase,clamp(vUv+displacement,0.,1.)).rgb;
  vec3 echoSample=texture(uBase,clamp(vUv-displacement*.38,0.,1.)).rgb;
  // Ink masks stay discrete for green replacement, while the untouched ASCII
  // background keeps its original anti-aliased rendering.
  float baseInk=step(.12,1.-baseSample.r);
  float shiftedInk=step(.12,1.-shiftedSample.r);
  float echoInk=step(.12,1.-echoSample.r);
  // Wordmark glyphs are stored with a hidden blue-channel marker. Only those
  // pixels are reduced to binary black/white; surrounding ASCII stays smooth.
  float wordmarkSignal=max(0.,baseSample.b-baseSample.r);
  float wordmarkRegion=step(.001,wordmarkSignal);
  float binaryWordmarkInk=step(.12,wordmarkSignal);
  float baseLuma=mix(baseSample.r,1.-binaryWordmarkInk,wordmarkRegion);
  vec3 base=vec3(baseLuma);
  float transition=dyedField*(1.-core);
  vec3 green=vec3(.53,.95,.73);
  float displacedInk=max(shiftedInk,max(baseInk*.55,echoInk*.22));
  float dyedGlyph=transition*step(.16,displacedInk);
  vec3 color=mix(base,green,dyedGlyph);
  color=mix(color,green,core);
  outColor=vec4(color,1.);
}`;

export function AwardsAsciiBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const section = host?.closest("section");
    if (!canvas || !host || !section) return;
    const gl = canvas.getContext("webgl2", {alpha:false,antialias:false,depth:false,stencil:false,powerPreference:"high-performance"});
    if (!gl) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const baseCanvas = document.createElement("canvas");
    const baseContext = baseCanvas.getContext("2d");
    if (!baseContext) return;

    let feedbackProgram: WebGLProgram;
    let compositeProgram: WebGLProgram;
    try {
      feedbackProgram = createWebGLProgram(gl, VERTEX_SHADER, FEEDBACK_SHADER);
      compositeProgram = createWebGLProgram(gl, VERTEX_SHADER, COMPOSITE_SHADER);
    } catch (error) {
      console.error("Awards feedback shader failed to initialize", error);return;
    }
    const vertexArray=gl.createVertexArray(),framebuffer=gl.createFramebuffer();
    const baseTexture=createLinearTexture(gl),feedbackTextures=[createLinearTexture(gl),createLinearTexture(gl)];
    if (!vertexArray || !framebuffer) return;
    for (const texture of feedbackTextures) {
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,FEEDBACK_SIZE,FEEDBACK_SIZE,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
      gl.viewport(0,0,FEEDBACK_SIZE,FEEDBACK_SIZE);gl.clearColor(0,.5,.5,1);gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindVertexArray(vertexArray);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);

    let width=1,height=1,cellSize=6,columns=1,rows=1;
    let pattern=new Uint8Array(1),wordmarkMask=new Uint8Array(1),readTexture=0,frame=0;
    let visible=true,previousFrame=performance.now(),previousPatternUpdate=-Infinity;
    let lastPointerX=-1,lastPointerY=-1,lastPointerTime=0;
    let pointerStartX=0,pointerStartY=0,pointerEndX=0,pointerEndY=0;
    let smoothedVelocityX=0,smoothedVelocityY=0,pointerDistance=0,pointerMoved=false;

    const hash=(x:number,y:number,seed:number)=>{let value=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(seed+1,1442695041);value=Math.imul(value^(value>>>13),1274126177);return ((value^(value>>>16))>>>0)/4294967295;};
    const smooth=(value:number)=>value*value*(3-2*value);
    const valueNoise=(x:number,y:number,seed:number)=>{const x0=Math.floor(x),y0=Math.floor(y),tx=smooth(x-x0),ty=smooth(y-y0);const top=hash(x0,y0,seed)*(1-tx)+hash(x0+1,y0,seed)*tx;const bottom=hash(x0,y0+1,seed)*(1-tx)+hash(x0+1,y0+1,seed)*tx;return top*(1-ty)+bottom*ty;};
    const fractalNoise=(x:number,y:number,seed:number)=>valueNoise(x,y,seed)*.56+valueNoise(x*2.17+19,y*2.17-11,seed+17)*.29+valueNoise(x*4.63-7,y*4.63+23,seed+43)*.15;

    const rebuildWordmarkMask=()=>{
      const maskCanvas=document.createElement("canvas");maskCanvas.width=columns;maskCanvas.height=rows;
      const maskContext=maskCanvas.getContext("2d");if(!maskContext)return;
      let wordmarkSize=Math.min(width*.36,height*.17);
      maskContext.font=`700 ${wordmarkSize/cellSize}px "Arial Nova", "Helvetica Neue", sans-serif`;
      const measuredWidth=Math.max(maskContext.measureText("AWA").width,maskContext.measureText("RDS").width)*cellSize;
      if(measuredWidth>width*.88)wordmarkSize*=width*.88/measuredWidth;
      const hostRectangle=host.getBoundingClientRect();
      const awardsList=section.querySelector<HTMLElement>("[data-awards-list]");
      const listRectangle=awardsList?.getBoundingClientRect();
      const centerY=listRectangle?(listRectangle.top+listRectangle.height/2-hostRectangle.top)/cellSize:rows/2;
      const lineGap=wordmarkSize*1.18/cellSize;
      maskContext.font=`700 ${wordmarkSize/cellSize}px "Arial Nova", "Helvetica Neue", sans-serif`;
      maskContext.textAlign="center";maskContext.textBaseline="middle";maskContext.fillStyle="#000";
      maskContext.fillText("AWA",columns/2,centerY-lineGap/2);maskContext.fillText("RDS",columns/2,centerY+lineGap/2);
      const pixels=maskContext.getImageData(0,0,columns,rows).data;wordmarkMask=new Uint8Array(columns*rows);
      for(let index=0;index<wordmarkMask.length;index+=1)wordmarkMask[index]=pixels[index*4+3];
    };

    const rebuildBaseTexture=(time:number)=>{
      const temporalPosition=(reducedMotion?0:time)/2800,seed=Math.floor(temporalPosition),blend=smooth(temporalPosition-seed);
      baseContext.clearRect(0,0,width,height);baseContext.fillStyle="#fff";baseContext.fillRect(0,0,width,height);
      baseContext.textAlign="center";baseContext.textBaseline="middle";
      for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){
        const first=fractalNoise(column*.052,row*.052,seed),second=fractalNoise(column*.052,row*.052,seed+1),density=first*(1-blend)+second*blend;
        const index=row*columns+column;pattern[index]=hash(column,row,97)<.16+density*.7?1:0;
        const maskStrength=(wordmarkMask[index]??0)/255,insideWordmark=maskStrength>.025;
        const symbol=SYMBOLS[pattern[index]];
        baseContext.font=`${insideWordmark?900:500} ${cellSize*(insideWordmark?1.22:1.13)}px "Courier New", monospace`;
        baseContext.fillStyle=insideWordmark?`rgba(0,0,255,${.58+Math.pow(maskStrength,.62)*.42})`:"#000";
        baseContext.fillText(symbol,column*cellSize+cellSize/2,row*cellSize+cellSize/2);
      }
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,baseTexture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,baseCanvas);previousPatternUpdate=time;
    };

    const uniform=(program:WebGLProgram,name:string)=>gl.getUniformLocation(program,name);
    const draw=(time:number)=>{
      if(!visible){frame=0;return;}
      const deltaSeconds=clamp((time-previousFrame)/1000,1/240,.05);previousFrame=time;
      if(time-previousPatternUpdate>180)rebuildBaseTexture(time);
      const writeTexture=1-readTexture;
      gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,feedbackTextures[writeTexture],0);
      gl.viewport(0,0,FEEDBACK_SIZE,FEEDBACK_SIZE);gl.useProgram(feedbackProgram);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,feedbackTextures[readTexture]);
      gl.uniform1i(uniform(feedbackProgram,"uPrevious"),0);
      gl.uniform2f(uniform(feedbackProgram,"uPointerStart"),pointerStartX,pointerStartY);
      gl.uniform2f(uniform(feedbackProgram,"uPointerEnd"),pointerEndX,pointerEndY);
      gl.uniform1f(uniform(feedbackProgram,"uAspect"),width/height);gl.uniform1f(uniform(feedbackProgram,"uRadius"),.0175);
      gl.uniform1f(uniform(feedbackProgram,"uAmount"),clamp(pointerDistance*42*deltaSeconds,.16,.92));
      gl.uniform1f(uniform(feedbackProgram,"uFade"),reducedMotion?0:Math.max(0,1-deltaSeconds/.32));
      gl.uniform1f(uniform(feedbackProgram,"uFlowDecay"),Math.max(0,1-3*deltaSeconds));
      gl.uniform1f(uniform(feedbackProgram,"uActive"),pointerMoved?1:0);
      const speed=Math.hypot(smoothedVelocityX,smoothedVelocityY),velocityScale=clamp(speed*.038,0,1);
      gl.uniform2f(uniform(feedbackProgram,"uVelocity"),speed>0?smoothedVelocityX/speed*velocityScale:0,speed>0?smoothedVelocityY/speed*velocityScale:0);
      gl.drawArrays(gl.TRIANGLES,0,3);readTexture=writeTexture;pointerMoved=false;
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.useProgram(compositeProgram);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,baseTexture);gl.uniform1i(uniform(compositeProgram,"uBase"),0);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,feedbackTextures[readTexture]);gl.uniform1i(uniform(compositeProgram,"uFeedback"),1);
      gl.uniform2f(uniform(compositeProgram,"uFeedbackTexel"),1/FEEDBACK_SIZE,1/FEEDBACK_SIZE);gl.uniform1f(uniform(compositeProgram,"uAspect"),width/height);
      gl.drawArrays(gl.TRIANGLES,0,3);
      if(!reducedMotion)frame=requestAnimationFrame(draw);else frame=0;
    };
    const wake=()=>{if(frame||!visible)return;previousFrame=performance.now();frame=requestAnimationFrame(draw);};
    const resize=()=>{
      const rectangle=host.getBoundingClientRect();width=Math.max(1,rectangle.width);height=Math.max(1,rectangle.height);
      cellSize=clamp(Math.round(width/170),6,9);columns=Math.ceil(width/cellSize);rows=Math.ceil(height/cellSize);
      pattern=new Uint8Array(columns*rows);baseCanvas.width=Math.ceil(width);baseCanvas.height=Math.ceil(height);
      const pixelRatio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(width*pixelRatio));canvas.height=Math.max(1,Math.round(height*pixelRatio));
      rebuildWordmarkMask();rebuildBaseTexture(performance.now());wake();
    };
    const resetPointer=()=>{lastPointerX=-1;lastPointerY=-1;lastPointerTime=0;smoothedVelocityX=0;smoothedVelocityY=0;pointerMoved=false;};
    const handlePointerMove=(event:PointerEvent)=>{
      if(reducedMotion)return;const rectangle=host.getBoundingClientRect();
      if(event.clientX<rectangle.left||event.clientX>rectangle.right||event.clientY<rectangle.top||event.clientY>rectangle.bottom){resetPointer();return;}
      const x=clamp((event.clientX-rectangle.left)/width,0,1),y=clamp(1-(event.clientY-rectangle.top)/height,0,1),now=performance.now();
      if(lastPointerX<0||lastPointerY<0){lastPointerX=x;lastPointerY=y;lastPointerTime=now;return;}
      const deltaTime=clamp((now-lastPointerTime)/1000,1/240,.05),deltaX=x-lastPointerX,deltaY=y-lastPointerY,aspect=width/height;
      pointerDistance=Math.hypot(deltaX*aspect,deltaY);if(pointerDistance<.0005)return;
      const rawVelocityX=deltaX/deltaTime,rawVelocityY=deltaY/deltaTime;
      smoothedVelocityX=smoothedVelocityX*.85+rawVelocityX*.15;smoothedVelocityY=smoothedVelocityY*.85+rawVelocityY*.15;
      pointerStartX=lastPointerX;pointerStartY=lastPointerY;pointerEndX=x;pointerEndY=y;pointerMoved=true;
      lastPointerX=x;lastPointerY=y;lastPointerTime=now;wake();
    };
    const handlePointerOut=(event:PointerEvent)=>{if(!event.relatedTarget)resetPointer();};
    const resizeObserver=new ResizeObserver(resize);
    const intersectionObserver=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)wake();});
    resizeObserver.observe(host);const awardsList=section.querySelector<HTMLElement>("[data-awards-list]");if(awardsList)resizeObserver.observe(awardsList);
    intersectionObserver.observe(host);window.addEventListener("pointermove",handlePointerMove,{passive:true});window.addEventListener("pointerout",handlePointerOut,{passive:true});
    return()=>{cancelAnimationFrame(frame);resizeObserver.disconnect();intersectionObserver.disconnect();window.removeEventListener("pointermove",handlePointerMove);window.removeEventListener("pointerout",handlePointerOut);gl.deleteProgram(feedbackProgram);gl.deleteProgram(compositeProgram);gl.deleteTexture(baseTexture);feedbackTextures.forEach(texture=>gl.deleteTexture(texture));gl.deleteFramebuffer(framebuffer);gl.deleteVertexArray(vertexArray);};
  }, []);

  return <div className={styles.field}><canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" /></div>;
}
