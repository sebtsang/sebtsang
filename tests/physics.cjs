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
globalThis.game = {shoot, tick, reset, state: () => ({phase, made, streak, best, ball})};`, context);
const game = context.game;
function shot(dx, dy, duration = 260) {
 game.reset(); game.shoot(dx, dy, duration);
 for (let i = 0; i < 720; i++) {
  game.tick(1 / 120);
  if (game.state().phase === 'result') return game.state();
 }
 throw new Error('Shot did not resolve');
}
let result = shot(0, 120);
assert.equal(result.ball.scored, true, 'Centered, correctly powered shot scores');
result = shot(0, 120);
assert.equal(result.streak, 2);
assert.equal(storage['half-court-best'], '2');
result = shot(0, 70);
assert.equal(result.ball.scored, false, 'Underpowered centered shot misses');
assert.equal(result.streak, 0);
result = shot(0, 150);
assert.ok(result.ball.boardHits > 0, 'Overpowered shot rebounds off backboard');
assert.equal(result.ball.scored, false);
result = shot(0, 220);
assert.ok(result.ball.boardHits > 0);
assert.equal(result.ball.scored, false, 'Very strong shot cannot become an automatic bank shot');
result = shot(7, 120);
assert.ok(result.ball.rimHits > 0);
assert.equal(result.ball.scored, true, 'An inward rim rebound can score');
result = shot(9, 120);
assert.ok(result.ball.rimHits > 0);
assert.equal(result.ball.scored, false, 'A slightly different rim impact bounces out');
for(let i = 0; i < 240; i++) game.tick(1 / 120);
assert.equal(game.state().phase, 'ready', 'Miss automatically resets');
game.shoot(0, 2, 100);
assert.equal(game.state().phase, 'ready', 'Accidental click does not fire a shot');
console.log('PASS: clean shots, power window, backboard rebounds, rim-ins, rim-outs, streaks, saved record, and resets.');
