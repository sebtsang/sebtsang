const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d');
const ui=Object.fromEntries(['made','streak','best','status'].map(id=>[id,document.getElementById(id)]));
const W=480,H=360,gravity=400,home={x:240,y:294};
const hoopLift=34,rimY=104-hoopLift;
const backboard={left:202,right:278,top:rimY-40,bottom:rimY+6};
// Retain the same clearance above the rim after raising the hoop.
const launchSpeed=Math.sqrt(433**2+2*gravity*hoopLift);
let made=0,streak=0,best=0,ball,phase='ready',drag=null,particles=[],resetAt=0,clock=0,net=0,last=0,acc=0,shotStarted=0,aimPhase=-Math.PI/2,boardImpact={age:1,strength:0};
try{best=Number(localStorage.getItem('half-court-best'))||0}catch{}
function scores(){for(const [key,value] of Object.entries({made,streak,best}))ui[key].textContent=String(value).padStart(2,'0')}
function reset(){ball={...home,vx:0,vy:0,ax:0,r:9,scored:false,rotation:0,depth:0,depthV:0,rimHits:0,boardHits:0,power:433,groundY:null,groundV:0,floorHits:0,settled:false};boardImpact.age=1;phase='ready';drag=null}
function message(s){ui.status.textContent=s}
function finish(hit){if(phase==='result')return;phase='result';resetAt=Infinity;if(hit){ball.ax=0;ball.vx=0;ball.x=240;ball.vy*=.35;ball.depth=1;ball.depthV=0;made++;streak++;best=Math.max(best,streak);if(!captureMode)try{localStorage.setItem('half-court-best',String(best))}catch{}message(streak>1?`${streak} in a row. Keep it going.`:'Nothing but net. Again?');net=1;for(let i=0;i<45;i++)particles.push({x:240,y:rimY,vx:(Math.random()-.5)*210,vy:-Math.random()*170-30,life:1.4+Math.random(),color:['#f5cf78','#eb9063','#a6cbb5'][i%3]})}else{streak=0;message('Next one’s yours.')}scores();if(hit)highlightScores()}
function highlightScores(){
 if(captureMode||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
 for(const key of ['made','streak'])ui[key].animate?.([
  {color:'#ffffff',textShadow:'0 0 12px rgba(255,235,196,.55)'},
  {color:'#f1f0ea',textShadow:'0 0 0 rgba(255,235,196,0)'}
 ],{duration:500,easing:'ease-out'});
}
const fullPowerDrag=200;
const aimWidth=58;
const shotArrival=(launchSpeed+Math.sqrt(launchSpeed**2-2*gravity*(home.y-rimY)))/gravity;
function sweepSpeed(){return Math.min(3.8,1.25+streak*.18)}
function aimVelocity(){return Math.sin(aimPhase)*aimWidth/shotArrival}
function powerLevel(){return drag?Math.min(1,Math.max(0,(drag.startY-drag.endY)/fullPowerDrag)):0}
function beginDrag(id,y){
 if(phase!=='ready'||drag)return;
 drag={id,startY:y,endY:y};message('Drag up for power. Release to shoot.');
}
function updateDrag(id,y){if(drag&&drag.id===id)drag.endY=y}
function releaseDrag(id){
 if(!drag||drag.id!==id)return;
 const level=powerLevel(),vx=aimVelocity();
 drag=null;if(level<.03){cancelDrag();return}shoot(vx,280+310*level);
}
function cancelDrag(){drag=null;if(phase==='ready')message('Drag up for power. Release to shoot.')}
function shoot(vx,power){
 if(phase!=='ready')return;
 ball.vx=vx;ball.vy=-launchSpeed;ball.power=power;
 ball.depthV=(Math.max(280,Math.min(590,power))/433)/shotArrival;
 phase='flight';shotStarted=clock;drag=null;message('…');
}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
canvas.addEventListener('pointerdown',e=>{
 const p=point(e);if(phase!=='ready'||drag||Math.hypot(p.x-ball.x,p.y-ball.y)>50)return;
 canvas.focus({preventScroll:true});beginDrag(e.pointerId,p.y);canvas.setPointerCapture(e.pointerId);e.preventDefault();
});
canvas.addEventListener('pointermove',e=>updateDrag(e.pointerId,point(e).y));
canvas.addEventListener('pointerup',e=>{updateDrag(e.pointerId,point(e).y);releaseDrag(e.pointerId)});
canvas.addEventListener('pointercancel',cancelDrag);
canvas.addEventListener('lostpointercapture',cancelDrag);
window.addEventListener('blur',cancelDrag);
let exiting=false;
function exitGame(){if(exiting)return;exiting=true;window.location.assign('https://github.com/sebtsang')}
function handleEscape(e){if(e.key==='Escape'||e.key==='Esc'||e.code==='Escape'){e.preventDefault();e.stopPropagation();exitGame()}}
window.addEventListener('keydown',handleEscape,true);
window.addEventListener('keyup',handleEscape,true);
// Focus the game on entry and on every pointer interaction so keyboard controls work immediately.
if(!new URLSearchParams(location.search).has('capture'))canvas.focus({preventScroll:true});
canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
canvas.addEventListener('keydown',e=>{
 if(e.code==='Space'){e.preventDefault();if(!e.repeat)beginDrag('keyboard',home.y)}
 if(drag?.id==='keyboard'&&(e.code==='ArrowUp'||e.code==='ArrowDown')){
  e.preventDefault();updateDrag('keyboard',Math.max(home.y-fullPowerDrag,Math.min(home.y,drag.endY+(e.code==='ArrowUp'?-10:10))));
 }
});
window.addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();releaseDrag('keyboard')}},true);
function floorSurface(){
 if(ball.groundY!==null)return ball.groundY;
 const landingDepth=ball.scored?1:(ball.boardHits||ball.rimHits?ball.depth:ball.power/433*.85);
 return 276-100*Math.max(0,Math.min(1.3,landingDepth));
}
function settleBall(){
 ball.settled=true;ball.y=floorSurface()-ball.r;ball.vy=0;ball.groundV=0;
 ball.vx*=.25;resetAt=clock+.35;
}
function floorContact(){
 const surface=floorSurface();
 if(ball.vy<=0||ball.y+ball.r<surface)return;
 if(phase==='flight')finish(false);
 if(ball.groundY===null){
  ball.groundY=surface;
  // Carry travel back from the glass into a small downcourt drift.
  ball.groundV=Math.max(-30,Math.min(45,-ball.depthV*45));
  ball.depthV=0;
 }
 const impactSpeed=Math.max(0,ball.vy-ball.groundV);
 ball.floorHits++;ball.y=ball.groundY-ball.r;
 if(ball.floorHits>=3||impactSpeed<45){settleBall();return}
 ball.vy=ball.groundV-impactSpeed*.48;
 ball.vx*=.72;ball.groundV*=.7;
 ball.rotation+=.22*Math.sign(ball.vx||ball.groundV||1);
}
function tick(dt){
 clock+=dt;boardImpact.age+=dt;if(phase==='ready')aimPhase+=sweepSpeed()*dt;net=Math.max(0,net-dt/1.1);
 if(phase==='flight'||phase==='result'){
  const oldY=ball.y,oldDepth=ball.depth;
  if(ball.groundY!==null){
   ball.groundY=Math.max(146,Math.min(292,ball.groundY+ball.groundV*dt));
   if(ball.groundY===146||ball.groundY===292)ball.groundV=0;
  }
  if(ball.settled){
   ball.x+=ball.vx*dt;ball.vx*=Math.exp(-9*dt);ball.y=floorSurface()-ball.r;
  }else{
   ball.vy+=gravity*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
   ball.depth+=ball.depthV*dt;
  }
  // Keep rebounds on the visible court instead of losing the ball off-screen.
  if(ball.x<35||ball.x>445){ball.x=Math.max(35,Math.min(445,ball.x));ball.vx*=-.5}
  ball.rotation+=(ball.vx*.02+ball.groundV*.01)*dt;
  if(phase==='flight'){
   // The backboard is behind the hoop. An overpowered shot reaches it
   // while still airborne and rebounds toward the shooter.
   if(ball.depthV>0&&oldDepth<1.08&&ball.depth>=1.08&&ball.x>backboard.left-ball.r&&ball.x<backboard.right+ball.r&&ball.y+ball.r>=backboard.top&&ball.y-ball.r<=backboard.bottom){
    const impactSpeed=Math.abs(ball.vy);
    const rebound=.22+Math.min(.88,Math.max(0,ball.power-470)/100);
    ball.depth=1.08;ball.depthV*=-rebound;
    // A crisp upward kick reverses a descending approach instead of
    // letting the ball simply carry on falling along the same path.
    ball.vy=-Math.max(65,Math.min(125,impactSpeed*.55));
    ball.vx=ball.vx*.65+(ball.x-240)*.7;
    ball.boardHits++;boardImpact={age:0,strength:Math.min(1,impactSpeed/220+.35)};
    message('Off the glass.');
   }
   const atHoop=ball.depth>=.90&&ball.depth<=1.10;
   let collided=false;
   if(atHoop&&ball.vy>0){
    for(const x of [220,260]){
     const dx=ball.x-x,dy=ball.y-rimY,d=Math.hypot(dx,dy),contact=ball.r+3;
     if(d<contact&&d>0){
      const nx=dx/d,ny=dy/d,dot=ball.vx*nx+ball.vy*ny;
      if(dot<0){
       ball.vx-=1.82*dot*nx;ball.vy-=1.82*dot*ny;
       ball.x=x+nx*contact;ball.y=rimY+ny*contact;
       ball.depth=1;ball.depthV=0;ball.rimHits++;collided=true;message('On the rim…');
      }
     }
    }
   }
   // A clean make needs both the correct distance and centered entry.
   if(!collided&&ball.vy>0&&oldY<rimY&&ball.y>=rimY&&Math.abs(ball.x-240)<=7&&Math.abs(ball.depth-1)<=.055){
    ball.scored=true;finish(true);
   }

  }
  if(!ball.settled)floorContact();
  if(clock-shotStarted>8&&!ball.settled){
   if(phase==='flight')finish(false);
   ball.groundY=floorSurface();settleBall();
  }
  if(phase==='result'&&clock>=resetAt)reset();
 }
 particles=particles.filter(p=>p.life>0);
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=240*dt;p.life-=dt}
}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function line(points,c,width=1){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()}
function netShape(){
 const age=(1-net)*1.1;
 const spring=net>0?Math.exp(-4.5*age)*Math.sin(14*age):0;
 return {bottomY:rimY+27+16*spring,halfWidth:10+3*spring,sway:net>0?1.5*Math.exp(-5*age)*Math.sin(19*age):0};
}
function drawBall(x,y,r,rotation=0){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(rotation);ctx.fillStyle='#d98b52';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6d422c';ctx.lineWidth=1.5;ctx.stroke();line([[-r,0],[r,0]],'#74472d');line([[0,-r],[0,r]],'#74472d');ctx.beginPath();ctx.ellipse(0,0,r*.45,r,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
function draw(){ctx.clearRect(0,0,W,H);rect(0,0,W,H,'#202226');rect(0,0,W,91,'#17191d');
 // Fence, trees and warm lamps: all art is drawn locally.
 for(let x=0;x<W;x+=16){line([[x,35],[x,91]],'#50555d');line([[x,37],[x+32,69],[x,91]],'#444951')}line([[0,36],[480,36]],'#686e77',2);
 for(const x of [32,448]){rect(x,15,3,76,'#777c83');rect(x-7,14,17,4,'#e5e5df');rect(x-4,18,11,2,'#969a9e')}
 rect(16,94,448,250,'#15171a');rect(26,103,428,232,'#c7a16d');
 // Staggered maple planks, with restrained grain and seams.
 const wood=['#cba675','#c6a06d','#cfac7c','#c8a370'];
 for(let row=0,y=103;y<335;row++,y+=8){
  for(let x=26-(row%3)*28;x<454;x+=84){
   const left=Math.max(26,x),right=Math.min(454,x+84);
   rect(left,y,right-left,Math.min(8,335-y),wood[(row+Math.floor((x+84)/84))%4]);
   line([[left,y],[right,y]],'#af8c5b',.5);
   if(x>26)line([[x,y],[x,Math.min(335,y+8)]],'#b18e5e',.5);
  }
 }
 line([[31,330],[31,107],[449,107],[449,330],[31,330]],'#25272b',2);
 // A static pool of warm light keeps the floor dimensional without flicker.
 ctx.save();ctx.beginPath();ctx.rect(26,103,428,232);ctx.clip();
 ctx.translate(240,145);ctx.scale(1.65,1);
 const light=ctx.createRadialGradient(0,0,8,0,0,155);
 light.addColorStop(0,'rgba(255,239,205,.13)');
 light.addColorStop(.55,'rgba(255,239,205,.055)');
 light.addColorStop(1,'rgba(255,239,205,0)');
 ctx.fillStyle=light;ctx.fillRect(-155,-155,310,310);ctx.restore();
 line([[188,107],[188,206],[292,206],[292,107]],'#25272b',2);
 ctx.strokeStyle='#25272b';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(240,206,52,29,0,0,Math.PI);ctx.stroke();ctx.beginPath();ctx.ellipse(240,127,171,151,0,0,Math.PI);ctx.stroke();line([[69,107],[69,127]],'#25272b',2);line([[411,107],[411,127]],'#25272b',2);
 ctx.beginPath();ctx.ellipse(240,330,48,22,0,Math.PI,Math.PI*2);ctx.stroke();
 // A glass impact briefly vibrates just the board; the court stays still.
 ctx.save();
 const shake=boardImpact.age<.3&&!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  ?Math.sin(boardImpact.age*95)*1.5*boardImpact.strength*Math.exp(-12*boardImpact.age):0;
 ctx.translate(shake,-hoopLift);
 // Transparent backboard with a pale frame, target and reflected light.
 line([[202,110],[202,64],[278,64],[278,110],[202,110]],'#101216',3);rect(205,67,70,40,'rgba(191,210,216,.22)');
 line([[205,107],[205,67],[275,67],[275,107],[205,107]],'#d8d8d2',2);
 line([[211,76],[221,70]],'rgba(255,255,255,.20)',2);
 line([[214,82],[234,70]],'rgba(255,255,255,.10)',2);
 line([[228,104],[228,86],[252,86],[252,104]],'#f1f0ea',2);ctx.restore();
 const surface=floorSurface(),height=Math.max(0,surface-ball.r-ball.y);
 if(phase==='ready'||ball.groundY!==null||(ball.vy>0&&height<48)){
  const proximity=phase==='ready'?1:Math.max(0,1-height/55);
  ctx.fillStyle=`rgba(8,9,11,${.3*proximity})`;ctx.beginPath();
  ctx.ellipse(ball.x,phase==='ready'?313:surface,7+5*proximity,2+proximity,0,0,Math.PI*2);ctx.fill();
 }
 if(!captureMode&&phase==='ready'&&drag){
  // The drag sets the line length; the sweep alone sets its direction.
  const angle=Math.atan2(Math.sin(aimPhase)*aimWidth,home.y-rimY);
  const netBottom=rimY+27;
  const maxLength=(ball.y-netBottom-10)/Math.cos(angle);
  const length=powerLevel()*Math.min(fullPowerDrag,maxLength);
  const endX=ball.x+Math.sin(angle)*length;
  const endY=ball.y-Math.cos(angle)*length;
  ctx.setLineDash([3,5]);
  line([[ball.x,ball.y],[endX,endY]],'#f1f0ea',1.5);
  ctx.setLineDash([]);
 }
 const mesh=netShape();
 // Only a confirmed basket can pass behind the rim and mesh.
 if(ball.scored){
  // Keep the scored ball inside the net silhouette until it emerges below it.
  ctx.save();
  if(ball.scored&&ball.y-ball.r<mesh.bottomY){
   ctx.beginPath();ctx.moveTo(220,0);ctx.lineTo(260,0);ctx.lineTo(260,rimY+2);ctx.lineTo(240+mesh.halfWidth+mesh.sway,mesh.bottomY);ctx.lineTo(W,mesh.bottomY);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.lineTo(0,mesh.bottomY);ctx.lineTo(240-mesh.halfWidth+mesh.sway,mesh.bottomY);ctx.lineTo(220,rimY+2);ctx.closePath();ctx.clip();
  }
  drawBall(ball.x,ball.y,ball.r,ball.rotation);ctx.restore();
 }
 // Use one neutral white for every strand, including the bottom seam.
 const netColor='#f2f2f2';
 // The top stays fixed to the rim while the woven net stretches and settles.
 for(let i=0;i<7;i++){
  const topX=220+i*40/6;
  const bottomX=240-mesh.halfWidth+mesh.sway+i*mesh.halfWidth*2/6;
  line([[topX,rimY+2],[bottomX,mesh.bottomY]],netColor,1.5);
 }
 for(let row=1;row<=4;row++){
  const t=row/4,y=rimY+2+(mesh.bottomY-rimY-2)*t;
  const halfWidth=20+(mesh.halfWidth-20)*t,center=240+mesh.sway*t;
  line([[center-halfWidth,y],[center+halfWidth,y]],netColor,1.5);
 }
 rect(218,rimY-2,44,3,'#e78b42');rect(220,rimY+1,40,2,'#a94f28');
 if(!ball.scored)drawBall(ball.x,ball.y,ball.r,ball.rotation);
 for(const p of particles)rect(p.x,p.y,3,3,p.color);
 if(!captureMode&&phase==='ready')drawPrompt(drag?'RELEASE TO SHOOT':'DRAG UP FOR POWER');

}
function drawPrompt(label,size=10){
 ctx.font=`bold ${size}px monospace`;ctx.textAlign='center';ctx.lineWidth=3;
 ctx.strokeStyle='#202226';ctx.strokeText(label,240,255);
 ctx.fillStyle='#f1f0ea';ctx.fillText(label,240,255);
}
function frame(time){if(!last)last=time;acc+=Math.min((time-last)/1000,.05);last=time;while(acc>=1/120){tick(1/120);acc-=1/120}draw();requestAnimationFrame(frame)}
scores();reset();
const captureMode=new URLSearchParams(location.search).has('capture');
if(!captureMode)requestAnimationFrame(frame);
// Render the README preview with this exact simulation and artwork.
export function capturePreviewFrames(start,count,power=433){
 const random=Math.random;let seed=42;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 made=0;streak=0;best=0;clock=0;net=0;particles=[];reset();
 const images=[];let fired=false;
 for(let i=0;i<start+count;i++){
  if(clock>=.45&&!fired){shoot(0,power);fired=true}
  for(let j=0;j<4;j++)tick(1/120);
  draw();drawPrompt('CLICK TO PLAY',12);
  if(i>=start)images.push(canvas.toDataURL('image/png').split(',')[1]);
 }
 Math.random=random;return images;
}
