/** @typedef {{ no: number, name: string }} Player */
/**
 * @typedef {Object} BracketMatch
 * @property {string} id
 * @property {Player|null} a
 * @property {Player|null} b
 * @property {boolean} bye
 * @property {Player|null} winner
 * @property {Player|null} loser
 * @property {boolean} played
 * @property {string|null} nextMatchId
 * @property {'a'|'b'|null} nextSlot
 */
/** @typedef {{ label: string, matches: BracketMatch[] }} BracketRound */

function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function roundLabel(roundIndex, totalRounds) {
  const fromEnd = totalRounds - 1 - roundIndex;
  if (fromEnd === 0) return 'Final';
  if (fromEnd === 1) return 'Yarı Final';
  if (fromEnd === 2) return 'Çeyrek Final';
  return `Tur ${roundIndex + 1}`;
}

/** @param {Player[]} players */
export function buildBracketTree(players) {
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const size = nextPowerOf2(players.length);
  const totalRounds = Math.log2(size);
  /** @type {BracketRound[]} */
  const rounds = [];

  for (let r = 0; r < totalRounds; r += 1) {
    const matchCount = size / 2 ** (r + 1);
    /** @type {BracketMatch[]} */
    const matches = [];
    for (let m = 0; m < matchCount; m += 1) {
      matches.push({
        id: `r${r}-m${m}`,
        a: null,
        b: null,
        bye: false,
        winner: null,
        loser: null,
        played: false,
        nextMatchId: r < totalRounds - 1 ? `r${r + 1}-m${Math.floor(m / 2)}` : null,
        nextSlot: r < totalRounds - 1 ? (m % 2 === 0 ? 'a' : 'b') : null,
      });
    }
    rounds.push({ label: roundLabel(r, totalRounds), matches });
  }

  let pi = 0;
  for (const match of rounds[0].matches) {
    if (pi < shuffled.length) match.a = shuffled[pi++];
    if (pi < shuffled.length) match.b = shuffled[pi++];
    if (match.a && !match.b) {
      match.bye = true;
      match.winner = match.a;
      propagateWinner(match, rounds);
    }
  }

  return rounds;
}

/** @param {BracketMatch} match @param {BracketRound[]} rounds */
export function propagateWinner(match, rounds) {
  if (!match.winner || !match.nextMatchId || !match.nextSlot) return;
  const next = findMatchById(rounds, match.nextMatchId);
  if (!next) return;
  next[match.nextSlot] = match.winner;
}

/** @param {BracketRound[]} rounds @param {string} id */
export function findMatchById(rounds, id) {
  for (const round of rounds) {
    const found = round.matches.find((m) => m.id === id);
    if (found) return found;
  }
  return null;
}

/** @param {BracketRound[]} rounds */
export function findCurrentMatch(rounds) {
  for (const round of rounds) {
    for (const match of round.matches) {
      if (match.played) continue;
      if (!match.a) continue;
      if (match.bye || match.b) return match;
    }
  }
  return null;
}

/** @param {BracketRound[]} rounds */
export function findChampion(rounds) {
  const final = rounds[rounds.length - 1]?.matches[0];
  if (!final?.played || !final?.winner) return null;
  return final.winner;
}

function renderChampionColumn(champion, escapeHtml) {
  if (champion) {
    return `
      <div class="bracket-round bracket-round-champion" data-round="champion">
        <p class="bracket-round-title">Şampiyon</p>
        <div class="bracket-round-matches">
          <div class="bracket-champion">
            <div class="bracket-slot is-champion is-winner">
              <span class="bracket-seed">${champion.no}</span>
              <span class="bracket-name">${escapeHtml(champion.name)}</span>
            </div>
            <p class="bracket-champion-badge">Kazanan</p>
          </div>
        </div>
      </div>`;
  }

  return `
    <div class="bracket-round bracket-round-champion" data-round="champion">
      <p class="bracket-round-title">Şampiyon</p>
      <div class="bracket-round-matches">
        <div class="bracket-champion">
          <div class="bracket-slot is-empty">
            <span class="bracket-seed">?</span>
            <span class="bracket-name">—</span>
          </div>
        </div>
      </div>
    </div>`;
}

/** @param {BracketMatch} match @param {0|1|null} winnerSide @param {BracketRound[]} rounds */
export function recordMatchResult(match, winnerSide, rounds) {
  if (winnerSide === 0) {
    match.winner = match.a;
    match.loser = match.b;
  } else if (winnerSide === 1) {
    match.winner = match.b;
    match.loser = match.a;
  }
  match.played = true;
  propagateWinner(match, rounds);
}

/**
 * @param {BracketRound[]} rounds
 * @param {{ currentMatchId?: string|null, escapeHtml: (s: string) => string }} opts
 */
export function renderBracketTree(rounds, { currentMatchId = null, escapeHtml }) {
  const champion = findChampion(rounds);
  const roundHtml = rounds
    .map((round, roundIndex) => {
      const matchesHtml = round.matches
        .map((match) => {
          const isLive = match.id === currentMatchId;
          const isDone = match.played && match.winner;

          if (match.bye) {
            const player = match.a;
            const done = match.played;
            return `
              <div class="bracket-match is-bye ${isLive ? 'is-live' : ''} ${done ? 'is-done' : ''}" data-match-id="${match.id}">
                <div class="bracket-slot ${player && done ? 'is-winner' : player ? 'is-pending' : 'is-empty'}">
                  <span class="bracket-seed">${player?.no ?? '—'}</span>
                  <span class="bracket-name">${player ? escapeHtml(player.name) : '—'}</span>
                </div>
                <div class="bracket-slot is-bye-slot">
                  <span class="bracket-seed">—</span>
                  <span class="bracket-name">Bay</span>
                </div>
              </div>`;
          }

          const slot = (player) => {
            if (!player) {
              return `<div class="bracket-slot is-empty"><span class="bracket-seed">—</span><span class="bracket-name">—</span></div>`;
            }
            let state = 'is-pending';
            if (isDone && match.winner?.no === player.no) state = 'is-winner';
            else if (isDone && match.loser?.no === player.no) state = 'is-loser';
            else if (match.bye && match.winner?.no === player.no) state = 'is-winner';

            return `
              <div class="bracket-slot ${state}">
                <span class="bracket-seed">${player.no}</span>
                <span class="bracket-name">${escapeHtml(player.name)}</span>
              </div>`;
          };

          return `
            <div class="bracket-match ${isLive ? 'is-live' : ''} ${isDone ? 'is-done' : ''} ${match.bye ? 'is-bye' : ''}" data-match-id="${match.id}">
              ${slot(match.a)}
              ${slot(match.b)}
            </div>`;
        })
        .join('');

      return `
        <div class="bracket-round" data-round="${roundIndex}" style="--round-index: ${roundIndex}">
          <p class="bracket-round-title">${escapeHtml(round.label)}</p>
          <div class="bracket-round-matches">${matchesHtml}</div>
        </div>`;
    })
    .join('');

  return `
    <div class="bracket-tree-wrap">
      <div class="bracket-tree">${roundHtml}${renderChampionColumn(champion, escapeHtml)}</div>
    </div>`;
}
