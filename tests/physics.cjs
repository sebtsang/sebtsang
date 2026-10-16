const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const nodes = Object.fromEntries(['made', 'streak', 'best', 'status'].map(id => [id, {textContent: ''}]));
const storage = {};
const context = {
 document: {querySelector: () => ({getContext: () => ({}), focus() {}, addEventListener() {}}), getElementById: id => nodes[id]},
 window: {addEventListener() {}}, location: {search: ''}, URLSearchParams,
 localStorage: {getItem: key => storage[key], setItem: (key, value) => storage[key] = value},
 requestAnimationFrame() {}, Math, performance: {now: () => 0},
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('docs/game.js', 'utf8').replace('export function', 'function') + `
globalThis.game = {shoot, tick, reset, beginCharge, releaseCharge, cancelCharge, chargeLevel, sweepSpeed, aimVelocity, centerAim:()=>{aimPhase=0}, state: () => ({phase, made, streak, best, ball})};`, context);
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
result = shot(0, 433);
assert.equal(result.streak, 2);
assert.equal(storage['half-court-best'], '2');
result = shot(0, 382);
assert.equal(result.ball.scored, false, 'Underpowered centered shot misses');
assert.equal(result.streak, 0);
result = shot(0, 463);
assert.ok(result.ball.boardHits > 0, 'Overpowered shot rebounds off backboard');
assert.equal(result.ball.scored, false);
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
game.beginCharge('pointer');
for(let i=0;i<71;i++)game.tick(1/120);
assert.ok(Math.abs(game.chargeLevel()-.493)<.01,'Hold duration builds predictable power');
game.centerAim();game.releaseCharge('pointer');
assert.equal(game.state().phase,'flight');
assert.equal(game.state().ball.vx,0,'Release locks the current aim');
for(let i=0;i<500;i++)game.tick(1/120);
assert.ok(game.sweepSpeed()>baseline,'A make increases sweep speed');
game.reset();game.beginCharge('keyboard');
for(let i=0;i<240;i++)game.tick(1/120);
assert.equal(game.chargeLevel(),1,'Power caps on long holds');
game.cancelCharge();
assert.equal(game.chargeLevel(),0);
assert.equal(game.state().phase,'ready','Interrupted hold cancels without shooting');
game.releaseCharge('wrong-id');
assert.equal(game.state().phase,'ready');
console.log('PASS: clean shots, power window, backboard rebounds, rim-ins, rim-outs, streaks, saved record, resets, hold/release, capped power, cancellation, and streak-based sweep speed.');
