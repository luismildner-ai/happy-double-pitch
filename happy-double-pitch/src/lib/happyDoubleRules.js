/*
 * Pure turn rules for the playable Happy Double demo.
 *
 * Kept free of React so the loop can be exercised deterministically in tests —
 * the UI is random by nature (two D12), which makes the interesting paths (bust,
 * shield, card effects) impractical to reach by clicking.
 *
 * Turn state shape:
 *   { banked, bankedMarks[], turnMarks[], turnScore, shield }
 */

export const ACTION_CARDS = [
  {
    id: 'shield',
    tag: 'Protect',
    title: 'Gold Shield',
    color: 'green',
    effect: 'Protects you from your next Bust.',
    resolved: 'Shield up. The next repeat number bounces off.',
  },
  {
    id: 'bonus',
    tag: 'Push',
    title: 'Bonus +5',
    color: 'pink',
    effect: 'Adds +5 to your temporary score.',
    resolved: '+5 added to this turn.',
  },
  {
    id: 'double',
    tag: 'Push',
    title: 'Double or Nothing',
    color: 'pink',
    effect: 'Doubles your temporary score — but it is still unbanked.',
    resolved: 'Turn score doubled. Bank it or push it.',
  },
];

export const initialState = () => ({
  banked: 0,
  bankedMarks: [],
  turnMarks: [],
  turnScore: 0,
  shield: false,
});

/*
 * Resolve one roll of two D12.
 * Returns { state, event } where event.type is one of:
 *   'pasch' — a pair; scoring pauses and the caller draws an Action Card
 *   'bust'  — the higher value was already marked this turn; turn is wiped
 *   'shield'— would have busted, but the Gold Shield absorbed it
 *   'mark'  — normal: the higher value is marked and scored
 */
export function resolveRoll(state, a, b) {
  if (a === b) return { state, event: { type: 'pasch', value: a } };

  const higher = Math.max(a, b);

  if (state.turnMarks.includes(higher)) {
    if (state.shield) {
      return { state: { ...state, shield: false }, event: { type: 'shield', value: higher } };
    }
    // Bust wipes the temporary score and the turn's marks. Banked progress is untouched.
    return {
      state: { ...state, turnMarks: [], turnScore: 0 },
      event: { type: 'bust', value: higher },
    };
  }

  return {
    state: {
      ...state,
      turnMarks: [...state.turnMarks, higher],
      turnScore: state.turnScore + higher,
    },
    event: { type: 'mark', value: higher },
  };
}

/* Apply a drawn Action Card's effect. Unknown ids are a no-op. */
export function applyCard(state, cardId) {
  switch (cardId) {
    case 'shield':
      return { ...state, shield: true };
    case 'bonus':
      return { ...state, turnScore: state.turnScore + 5 };
    case 'double':
      return { ...state, turnScore: state.turnScore * 2 };
    default:
      return state;
  }
}

/* Bank the turn: the temporary score and its marks become permanent. */
export function bankTurn(state) {
  if (state.turnScore === 0) return state;
  return {
    ...state,
    banked: state.banked + state.turnScore,
    bankedMarks: Array.from(new Set([...state.bankedMarks, ...state.turnMarks])),
    turnMarks: [],
    turnScore: 0,
  };
}
