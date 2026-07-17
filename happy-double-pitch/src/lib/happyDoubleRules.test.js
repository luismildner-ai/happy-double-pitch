import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCard, bankTurn, initialState, resolveRoll } from './happyDoubleRules.js';

/* Run with `npm test`. These cover the paths the UI cannot reach on demand —
 * the dice are random, so bust and shield are impractical to reach by clicking. */

test('marks the higher die and scores it', () => {
  const { state, event } = resolveRoll(initialState(), 3, 9);
  assert.equal(event.type, 'mark');
  assert.deepEqual(state.turnMarks, [9]);
  assert.equal(state.turnScore, 9);
});

test('distinct rolls accumulate', () => {
  let { state } = resolveRoll(initialState(), 3, 9);
  ({ state } = resolveRoll(state, 4, 2));
  assert.deepEqual(state.turnMarks, [9, 4]);
  assert.equal(state.turnScore, 13);
});

test('re-rolling a marked number busts and wipes the turn', () => {
  let { state } = resolveRoll(initialState(), 3, 9);
  const { state: after, event } = resolveRoll(state, 9, 1);
  assert.equal(event.type, 'bust');
  assert.equal(after.turnScore, 0);
  assert.deepEqual(after.turnMarks, []);
});

test('a pair pauses scoring and changes nothing', () => {
  const before = { ...initialState(), turnMarks: [7], turnScore: 7 };
  const { state, event } = resolveRoll(before, 6, 6);
  assert.equal(event.type, 'pasch');
  assert.deepEqual(state, before);
});

test('the shield absorbs one bust, then is spent', () => {
  const armed = { ...initialState(), turnMarks: [9], turnScore: 9, shield: true };
  const first = resolveRoll(armed, 9, 2);
  assert.equal(first.event.type, 'shield');
  assert.equal(first.state.turnScore, 9, 'turn survives');
  assert.equal(first.state.shield, false, 'shield consumed');

  const second = resolveRoll(first.state, 9, 2);
  assert.equal(second.event.type, 'bust', 'shield is one-shot');
  assert.equal(second.state.turnScore, 0);
});

test('action card effects', () => {
  assert.equal(applyCard({ ...initialState(), turnScore: 10 }, 'bonus').turnScore, 15);
  assert.equal(applyCard({ ...initialState(), turnScore: 10 }, 'double').turnScore, 20);
  assert.equal(applyCard(initialState(), 'shield').shield, true);
});

test('card effects are not idempotent — the UI must apply each draw once', () => {
  // Guards the regression where the modal's exit-animation copy re-fired its
  // stale onClick and compounded the effect (11 -> 22 -> 44 -> ...).
  const once = applyCard({ ...initialState(), turnScore: 10 }, 'double');
  assert.equal(applyCard(once, 'double').turnScore, 40);
});

test('banking locks the score and its marks', () => {
  const banked = bankTurn({ ...initialState(), turnMarks: [9, 4], turnScore: 13 });
  assert.equal(banked.banked, 13);
  assert.deepEqual(banked.bankedMarks, [9, 4]);
  assert.equal(banked.turnScore, 0);
  assert.deepEqual(banked.turnMarks, []);
});

test('banking an empty turn is a no-op', () => {
  assert.deepEqual(bankTurn(initialState()), initialState());
});

test('a banked number is rollable again next turn', () => {
  const banked = bankTurn({ ...initialState(), turnMarks: [9, 4], turnScore: 13 });
  const { state, event } = resolveRoll(banked, 9, 1);
  assert.equal(event.type, 'mark');
  assert.equal(state.turnScore, 9);
});

test('a bust never touches banked points', () => {
  const banked = bankTurn({ ...initialState(), turnMarks: [9, 4], turnScore: 13 });
  const pushing = { ...banked, turnMarks: [5], turnScore: 5 };
  const { state } = resolveRoll(pushing, 5, 1);
  assert.equal(state.banked, 13);
  assert.equal(state.turnScore, 0);
});
