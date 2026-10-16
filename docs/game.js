const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d');
const ui=Object.fromEntries(['made','streak','best','status'].map(id=>[id,document.getElementById(id)]));
const W=480,H=360, gravity=400, home={x:240,y:294}, rimY=119;
let made=0,streak=0,best=0,ball,phase='ready',drag=null,particles=[],resetAt=0,clock=0,net=0,last=0,acc=0,shotStarted=0;
try{best=Number(localStorage.getItem('half-court-best'))||0}catch{}
function scores(){for(const [key,value] of Object.entries({made,streak,best}))ui[key].textContent=String(value).padStart(2,'0')}
function reset(){ball={...home,vx:0,vy:0,ax:0,r:9,scored:false,rotation:0};phase='ready';drag=null}
function message(s){ui.status.textContent=s}
function finish(hit){if(phase==='result')return;phase='result';resetAt=clock+(hit?1.6:1.15);if(hit){ball.ax=0;ball.vx*=.15;made++;streak++;best=Math.max(best,streak);try{localStorage.setItem('half-court-best',String(best))}catch{}message(streak>1?`${streak} in a row. Keep it going.`:'Nothing but net. Again?');net=1;for(let i=0;i<45;i++)particles.push({x:240,y:118,vx:(Math.random()-.5)*210,vy:-Math.random()*170-30,life:1.4+Math.random(),color:['#f5cf78','#eb9063','#a6cbb5'][i%3]})}else{streak=0;message('Next one’s yours.')}scores()}
function shoot(dx,dy,ms){if(phase!=='ready')return;if(dy<15){drag=null;return}const speed=dy/Math.max(ms,90)*1000;ball.vx=Math.max(-170,Math.min(170,dx*1.05));ball.vy=-Math.max(365,Math.min(550,310+dy*.85+speed*.045));const flight=(-ball.vy+Math.sqrt(Math.max(0,ball.vy**2-2*gravity*(home.y-rimY))))/gravity;ball.vx-=135;ball.ax=270/flight;phase='flight';shotStarted=clock;drag=null;message('…')}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
canvas.addEventListener('pointerdown',e=>{const p=point(e);if(phase!=='ready'||Math.hypot(p.x-ball.x,p.y-ball.y)>42)return;drag={start:p,end:p,time:performance.now(),id:e.pointerId};canvas.setPointerCapture(e.pointerId);e.preventDefault()});
canvas.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.id)drag.end=point(e)});
canvas.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const p=point(e);shoot(p.x-drag.start.x,drag.start.y-p.y,performance.now()-drag.time)});
canvas.addEventListener('pointercancel',()=>{drag=null});canvas.addEventListener('lostpointercapture',()=>{drag=null});
canvas.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();shoot(0,120,260)}});
function tick(dt){clock+=dt;net=Math.max(0,net-dt*2);if(phase==='flight'||phase==='result'){const oldY=ball.y;ball.vy+=gravity*dt;ball.x+=ball.vx*dt+ball.ax*dt*dt/2;ball.vx+=ball.ax*dt;ball.y+=ball.vy*dt;ball.rotation+=ball.vx*dt*.02;
 if(phase==='flight'){
 // The side-on arc clears the net on ascent and arrives over the rim on descent.
 // Score only when the entire ball fits through the hoop, travelling down.
 if(ball.vy>0&&oldY<rimY&&ball.y>=rimY&&Math.abs(ball.x-240)<10){ball.scored=true;finish(true)}
 else{for(const x of [220,260]){const dx=ball.x-x,dy=ball.y-rimY,d=Math.hypot(dx,dy);if(d<ball.r+2&&d>0){const nx=dx/d,ny=dy/d,dot=ball.vx*nx+ball.vy*ny;if(dot<0){ball.vx-=1.6*dot*nx;ball.vy-=1.6*dot*ny;ball.x=x+nx*(ball.r+2);ball.y=rimY+ny*(ball.r+2)}}}
 if(ball.y>H+20||ball.x<-30||ball.x>W+30||clock-shotStarted>5)finish(false)}
 }if(phase==='result'&&clock>=resetAt)reset();}
 particles=particles.filter(p=>p.life>0);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=240*dt;p.life-=dt}}
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
 // Net flexes briefly after a basket.
 const sag=net*5*Math.sin(clock*28);for(let i=0;i<6;i++){const x=221+i*7.6;line([[x,120],[232+i*3.3+sag,145]],'#cbd2ad')}line([[222,129],[258,129]],'#a7baa0');line([[227,138],[253,138]],'#a7baa0');
 ctx.fillStyle='#10272566';ctx.beginPath();ctx.ellipse(ball.x,313,Math.max(4,13-(294-ball.y)*.02),3,0,0,Math.PI*2);ctx.fill();
 if(drag){const dx=drag.end.x-drag.start.x,dy=drag.end.y-drag.start.y;ctx.setLineDash([2,5]);line([[ball.x,ball.y],[ball.x+dx*.55,ball.y+Math.max(-135,dy*.55)]],'#e1cda7',2);ctx.setLineDash([])}
 drawBall(ball.x,ball.y,ball.r,ball.rotation);rect(218,117,44,3,'#e99a61');rect(220,120,40,2,'#a95435');
 for(const p of particles)rect(p.x,p.y,3,3,p.color);
 if(phase==='ready'&&!drag){ctx.fillStyle='#c8d3b1';ctx.font='8px monospace';ctx.textAlign='center';ctx.fillText('FLICK TO SHOOT',240,270);const bob=Math.round(Math.sin(clock*3)*2);line([[238,277+bob],[240,275+bob],[242,277+bob]],'#c8d3b1')}
}
function frame(time){if(!last)last=time;acc+=Math.min((time-last)/1000,.05);last=time;while(acc>=1/120){tick(1/120);acc-=1/120}draw();requestAnimationFrame(frame)}
scores();reset();requestAnimationFrame(frame);
