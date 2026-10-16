const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d');
const ui=Object.fromEntries(['made','streak','best','status'].map(id=>[id,document.getElementById(id)]));
const W=480,H=360, gravity=400, home={x:240,y:294}, rimY=104;
let made=0,streak=0,best=0,ball,phase='ready',drag=null,particles=[],resetAt=0,clock=0,net=0,last=0,acc=0,shotStarted=0;
try{best=Number(localStorage.getItem('half-court-best'))||0}catch{}
function scores(){for(const [key,value] of Object.entries({made,streak,best}))ui[key].textContent=String(value).padStart(2,'0')}
function reset(){ball={...home,vx:0,vy:0,ax:0,r:9,scored:false,rotation:0,depth:0,depthV:0,rimHits:0,boardHits:0};phase='ready';drag=null}
function message(s){ui.status.textContent=s}
function finish(hit){if(phase==='result')return;phase='result';resetAt=clock+(hit?1.6:1.15);if(hit){ball.ax=0;ball.vx=0;ball.x=240;ball.vy*=.35;made++;streak++;best=Math.max(best,streak);if(!captureMode)try{localStorage.setItem('half-court-best',String(best))}catch{}message(streak>1?`${streak} in a row. Keep it going.`:'Nothing but net. Again?');net=1;for(let i=0;i<45;i++)particles.push({x:240,y:104,vx:(Math.random()-.5)*210,vy:-Math.random()*170-30,life:1.4+Math.random(),color:['#f5cf78','#eb9063','#a6cbb5'][i%3]})}else{streak=0;message('Next one’s yours.')}scores()}
function shoot(dx,dy,ms){
 if(phase!=='ready')return;if(dy<15){drag=null;return}
 const speed=dy/Math.max(ms,90)*1000;
 const power=Math.max(280,Math.min(590,310+dy*.85+speed*.045));
 ball.vx=Math.max(-170,Math.min(170,dx*1.05));ball.vy=-433;
 // Shot strength controls distance into the court, rather than giving every
 // upward flick the same landing spot. The visual arc stays readable.
 const arrival=(433+Math.sqrt(433**2-2*gravity*(home.y-rimY)))/gravity;
 ball.depthV=(power/433)/arrival;
 phase='flight';shotStarted=clock;drag=null;message('…');
}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
canvas.addEventListener('pointerdown',e=>{const p=point(e);if(phase!=='ready'||Math.hypot(p.x-ball.x,p.y-ball.y)>42)return;drag={start:p,end:p,time:performance.now(),id:e.pointerId};canvas.setPointerCapture(e.pointerId);e.preventDefault()});
canvas.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.id)drag.end=point(e)});
canvas.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const p=point(e);shoot(p.x-drag.start.x,drag.start.y-p.y,performance.now()-drag.time)});
canvas.addEventListener('pointercancel',()=>{drag=null});canvas.addEventListener('lostpointercapture',()=>{drag=null});
let exiting=false;
function exitGame(){if(exiting)return;exiting=true;window.location.assign('https://github.com/sebtsang')}
function handleEscape(e){if(e.key==='Escape'||e.key==='Esc'||e.code==='Escape'){e.preventDefault();e.stopPropagation();exitGame()}}
window.addEventListener('keydown',handleEscape,true);
window.addEventListener('keyup',handleEscape,true);
// Focus the game on entry and on every pointer interaction so keyboard controls work immediately.
if(!new URLSearchParams(location.search).has('capture'))canvas.focus({preventScroll:true});
canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));
canvas.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();shoot(0,120,260)}});
function tick(dt){
 clock+=dt;net=Math.max(0,net-dt*2);
 if(phase==='flight'||phase==='result'){
  const oldY=ball.y,oldDepth=ball.depth;
  ball.vy+=gravity*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
  ball.depth+=ball.depthV*dt;ball.rotation+=ball.vx*dt*.02;
  if(phase==='flight'){
   // The backboard is behind the hoop. An overpowered shot reaches it
   // while still airborne and rebounds toward the shooter.
   if(ball.depthV>0&&oldDepth<1.08&&ball.depth>=1.08&&ball.x>202-ball.r&&ball.x<278+ball.r&&ball.y+ball.r>=64&&ball.y-ball.r<=110){
    ball.depth=1.08;ball.depthV*=-1.1;ball.vy=Math.abs(ball.vy)*.75+55;ball.vx*=.85;ball.boardHits++;message('Off the glass.');
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
   if(ball.y>H+20||ball.x<-30||ball.x>W+30||clock-shotStarted>5)finish(false);
  }
  if(phase==='result'&&clock>=resetAt)reset();
 }
 particles=particles.filter(p=>p.life>0);
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=240*dt;p.life-=dt}
}
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function line(points,c,width=1){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke()}
function drawBall(x,y,r,rotation=0){ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(rotation);ctx.fillStyle='#ef9b50';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#6d422c';ctx.lineWidth=1.5;ctx.stroke();line([[-r,0],[r,0]],'#74472d');line([[0,-r],[0,r]],'#74472d');ctx.beginPath();ctx.ellipse(0,0,r*.45,r,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
function draw(){ctx.clearRect(0,0,W,H);rect(0,0,W,H,'#253b39');rect(0,0,W,91,'#1c302f');
 // Fence, trees and warm lamps: all art is drawn locally.
 for(let x=0;x<W;x+=16){line([[x,35],[x,91]],'#344b43');line([[x,37],[x+32,69],[x,91]],'#2b423b')}line([[0,36],[480,36]],'#4a5d4b',2);
 for(const x of [32,448]){rect(x,15,3,76,'#71816a');rect(x-7,14,17,4,'#eed4a0');rect(x-4,18,11,2,'#ad9567')}
 rect(16,94,448,250,'#416555');rect(26,103,428,232,'#345848');
 for(let y=107;y<335;y+=7)for(let x=29+(y%3);x<452;x+=13)rect(x,y,1,1,'#3b5e4d');
 line([[31,330],[31,107],[449,107],[449,330],[31,330]],'#adbd94',2);
 rect(188,107,104,99,'#52745c');line([[188,107],[188,206],[292,206],[292,107]],'#adbd94',2);
 ctx.strokeStyle='#adbd94';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(240,206,52,29,0,0,Math.PI);ctx.stroke();ctx.beginPath();ctx.ellipse(240,127,171,151,0,0,Math.PI);ctx.stroke();line([[69,107],[69,127]],'#adbd94',2);line([[411,107],[411,127]],'#adbd94',2);
 ctx.beginPath();ctx.ellipse(240,330,48,22,0,Math.PI,Math.PI*2);ctx.stroke();
 rect(237,48,6,63,'#142827');rect(202,64,76,46,'#172d2c');rect(205,67,70,40,'#c7cfaf');rect(210,72,60,30,'#789a87');line([[228,104],[228,86],[252,86],[252,104]],'#e8e4bd',2);
 ctx.fillStyle='#10272566';ctx.beginPath();ctx.ellipse(ball.x,313,Math.max(4,13-(294-ball.y)*.02),3,0,0,Math.PI*2);ctx.fill();
 if(drag){const dx=drag.end.x-drag.start.x,dy=drag.end.y-drag.start.y;ctx.setLineDash([2,5]);line([[ball.x,ball.y],[ball.x+dx*.55,ball.y+Math.max(-135,dy*.55)]],'#e1cda7',2);ctx.setLineDash([])}
 const rising=phase==='flight'&&ball.vy<0;
 if(!rising){
  // Keep the scored ball inside the net silhouette until it emerges below it.
  ctx.save();
  if(ball.scored&&ball.y-ball.r<rimY+27){
   ctx.beginPath();ctx.moveTo(220,0);ctx.lineTo(260,0);ctx.lineTo(260,rimY+2);ctx.lineTo(250,rimY+27);ctx.lineTo(W,rimY+27);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.lineTo(0,rimY+27);ctx.lineTo(230,rimY+27);ctx.lineTo(220,rimY+2);ctx.closePath();ctx.clip();
  }
  drawBall(ball.x,ball.y,ball.r,ball.rotation);ctx.restore();
 }
 // Net flexes briefly after a basket.
 const sag=net*3*Math.sin(clock*28);
 for(let i=0;i<7;i++){
  const x=220+i*40/6,bottom=230+i*20/6+sag;
  line([[x,rimY+2],[bottom,rimY+27]],'#e0e5c6',1.5);
 }
 for(let row=1;row<=4;row++){
  const y=rimY+2+row*6,t=row*6/25;
  line([[220+10*t,y],[260-10*t,y]],'#d4ddbc',1.5);
 }
 rect(218,rimY-2,44,3,'#e99a61');rect(220,rimY+1,40,2,'#a95435');
 if(rising)drawBall(ball.x,ball.y,ball.r,ball.rotation);
 for(const p of particles)rect(p.x,p.y,3,3,p.color);
 if(!captureMode&&phase==='ready'&&!drag){ctx.fillStyle='#c8d3b1';ctx.font='8px monospace';ctx.textAlign='center';ctx.fillText('FLICK TO SHOOT',240,270);const bob=Math.round(Math.sin(clock*3)*2);line([[238,277+bob],[240,275+bob],[242,277+bob]],'#c8d3b1')}
}
function frame(time){if(!last)last=time;acc+=Math.min((time-last)/1000,.05);last=time;while(acc>=1/120){tick(1/120);acc-=1/120}draw();requestAnimationFrame(frame)}
scores();reset();
const captureMode=new URLSearchParams(location.search).has('capture');
if(!captureMode)requestAnimationFrame(frame);
// Render the README preview with this exact simulation and artwork.
export function capturePreviewFrames(start,count){
 const random=Math.random;let seed=42;Math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 made=0;streak=0;best=0;clock=0;net=0;particles=[];reset();
 const images=[];let fired=false;
 for(let i=0;i<start+count;i++){
  if(clock>=.45&&!fired){shoot(0,120,260);fired=true}
  for(let j=0;j<4;j++)tick(1/120);
  draw();
  if(i>=start)images.push(canvas.toDataURL('image/png').split(',')[1]);
 }
 Math.random=random;return images;
}
