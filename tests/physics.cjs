const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const animationLog=[];
const nodes = Object.fromEntries(['made', 'streak', 'best', 'status'].map(id => [id, {textContent: '',animate:(frames,options)=>animationLog.push({id,frames,options})}]));
const storage = {};
const drawLog=[];
const drawingContext=new Proxy({}, {get(target,key){
 if(key==='createRadialGradient')return ()=>({addColorStop(){}});
 return key in target?target[key]:(...args)=>drawLog.push([key,...args]);
}});
const context = {
 document: {querySelector: () => ({getContext: () => drawingContext, focus() {}, addEventListener() {}}), getElementById: id => nodes[id]},
 window: {addEventListener() {}}, location: {search: ''}, URLSearchParams,
 localStorage: {getItem: key => storage[key], setItem: (key, value) => storage[key] = value},
 requestAnimationFrame() {}, Math, performance: {now: () => 0},
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('docs/game.js', 'utf8').replace('export function', 'function') + `
globalThis.game = {shoot, tick, reset, draw, beginDrag, updateDrag, releaseDrag, cancelDrag, powerLevel, sweepSpeed, aimVelocity, netShape, centerAim:()=>{aimPhase=0}, state: () => ({phase, made, streak, best, ball})};`, context);
const game = context.game;
function shot(vx, power) {
 game.reset(); game.shoot(vx, power);
 for (let i = 0; i < 720; i++) {
  game.tick(1 / 120);
  if (game.state().phase === 'result') return game.state();
 }
 throw new Error('Shot did not resolve');
}
let result = shot(0, 433);
assert.equal(result.ball.scored, true, 'Centered, correctly powered shot scores');
assert.deepEqual(animationLog.map(a=>a.id),['made','streak'],'Only score counters highlight on a make');
assert.ok(animationLog.every(a=>a.options.duration<=600),'Highlights are brief');
const restingNet=game.netShape().bottomY;
for(let i=0;i<15;i++)game.tick(1/120);
assert.ok(game.netShape().bottomY>restingNet+4,'Net stretches downward after a make');
for(let i=0;i<150;i++)game.tick(1/120);
assert.equal(game.netShape().bottomY,restingNet,'Net settles back to its resting geometry');
result = shot(0, 433);
assert.equal(result.streak, 2);
assert.equal(storage['half-court-best'], '2');
result = shot(0, 382);
assert.equal(result.ball.scored, false, 'Underpowered centered shot misses');
assert.equal(result.streak, 0);
result = shot(0, 463);
assert.ok(result.ball.boardHits > 0, 'Overpowered shot rebounds off backboard');
assert.equal(result.ball.scored, true,'Controlled glass rebound can bank in');
result = shot(0, 535);
assert.ok(result.ball.boardHits > 0);
assert.equal(result.ball.scored, false, 'Very strong shot cannot become an automatic bank shot');
result = shot(7.35, 433);
assert.ok(result.ball.rimHits > 0);
assert.equal(result.ball.scored, true, 'An inward rim rebound can score');
result = shot(9.45, 433);
assert.ok(result.ball.rimHits > 0);
assert.equal(result.ball.scored, false, 'A slightly different rim impact bounces out');
for(let i = 0; i < 240; i++) game.tick(1 / 120);
assert.equal(game.state().phase, 'ready', 'Miss automatically resets');
const baseline=game.sweepSpeed();
assert.equal(baseline,1.25,'Miss resets aim speed');
game.beginDrag('pointer',294);
for(let i=0;i<71;i++)game.tick(1/120);
assert.equal(game.powerLevel(),0,'Holding still does not add power');
game.updateDrag('pointer',195.3);
assert.ok(Math.abs(game.powerLevel()-.4935)<.001,'Upward drag sets power');
game.centerAim();game.releaseDrag('pointer');
assert.equal(game.state().phase,'flight');
assert.equal(game.state().ball.vx,0,'Release locks the current aim');
for(let i=0;i<500;i++)game.tick(1/120);
assert.ok(game.sweepSpeed()>baseline,'A make increases sweep speed');
game.reset();game.beginDrag('pointer',294);
game.updateDrag('pointer',-100);
for(let i=0;i<240;i++)game.tick(1/120);
assert.equal(game.powerLevel(),1,'Power caps on long upward drags');
game.cancelDrag();
assert.equal(game.powerLevel(),0);
assert.equal(game.state().phase,'ready','Interrupted hold cancels without shooting');
game.releaseDrag('wrong-id');
assert.equal(game.state().phase,'ready');
console.log('PASS: clean shots, power window, backboard rebounds, rim-ins, rim-outs, streaks, saved record, resets, drag/release, capped power, cancellation, and streak-based sweep speed.');

function assertBallLayer(behind){
 drawLog.length=0;game.draw();
 const ballIndex=drawLog.findIndex(call=>call[0]==='arc');
 const meshIndex=drawLog.findIndex(call=>call[0]==='moveTo'&&call[1]===220&&call[2]===106);
 const rimIndex=drawLog.findIndex(call=>call[0]==='fillRect'&&call[1]===218&&call[2]===102);
 assert.ok(ballIndex>=0&&meshIndex>=0&&rimIndex>=0);
 assert.equal(ballIndex<meshIndex,behind,'Only scored balls draw behind the net');
 assert.equal(ballIndex<rimIndex,behind,'Only scored balls draw behind the rim');
}
game.reset();game.shoot(0,382);
while(game.state().ball.vy<0)game.tick(1/120);
assert.equal(game.state().ball.scored,false);
assertBallLayer(false);
shot(0,433);assertBallLayer(true);
shot(9.45,433);assertBallLayer(false);
console.log('PASS: descending unscored shots and misses stay in front; confirmed baskets pass behind rim and net.');

game.reset();game.shoot(0,490);
for(let i=0;i<600&&game.state().ball.boardHits===0;i++)game.tick(1/120);
assert.equal(game.state().ball.boardHits,1);
assert.ok(game.state().ball.depthV<0,'Glass sends the ball back toward the shooter');
assert.ok(game.state().ball.vy<0,'Glass contact visibly reverses the descending ball');
for(let i=0;i<5;i++)game.tick(1/120);
drawLog.length=0;game.draw();
assert.ok(drawLog.some(c=>c[0]==='translate'&&c[2]===0&&Math.abs(c[1])>0&&Math.abs(c[1])<2),'Only the backboard gets a small impact vibration');
for(let i=0;i<45;i++)game.tick(1/120);
drawLog.length=0;game.draw();
assert.ok(drawLog.some(c=>c[0]==='translate'&&c[1]===0&&c[2]===0),'Board vibration settles quickly');
console.log('PASS: glass reverses flight, sends ball toward shooter, supports bank shots, and briefly shakes the board.');
