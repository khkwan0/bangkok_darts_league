import assert from 'node:assert/strict'
import {describe, it} from 'node:test'
import {
  cardScoreShowsLive,
  mergeLiveCardScoreSnapshot,
  parseLiveCardScoreEvent,
  parseLiveCardScoreSnapshot,
  readLiveCardScores,
  resolveCardLiveScore,
} from './liveCardScore.ts'

describe('match card live scores during a match', () => {
  it('seeds from the upcoming API payload', () => {
    assert.deepEqual(
      readLiveCardScores({live_home_score: 2, live_away_score: 1}),
      {home: 2, away: 1},
    )
    assert.equal(readLiveCardScores({}), null)
  })

  it('applies socket updates over the API seed', () => {
    const api = {live_home_score: 1, live_away_score: 0}
    assert.deepEqual(resolveCardLiveScore(undefined, api), {
      home: 1,
      away: 0,
    })
    assert.deepEqual(
      resolveCardLiveScore({home: 3, away: 2}, api),
      {home: 3, away: 2},
    )
    assert.equal(cardScoreShowsLive({home: 3, away: 2}), true)
  })

  it('parses live socket events as the score changes', () => {
    const first = parseLiveCardScoreEvent({
      matchId: 99,
      home: 0,
      away: 0,
    })
    assert.deepEqual(first, {
      matchId: 99,
      score: {home: 0, away: 0},
    })
    const mid = parseLiveCardScoreEvent({
      matchId: 99,
      home: 4,
      away: 2,
    })
    assert.deepEqual(mid?.score, {home: 4, away: 2})
    assert.equal(cardScoreShowsLive(mid!.score), true)
  })

  it('keeps numbers after finalize and drops the LIVE label', () => {
    const event = parseLiveCardScoreEvent({
      matchId: 99,
      home: 5,
      away: 3,
      final: true,
    })
    assert.deepEqual(event?.score, {home: 5, away: 3, final: true})
    assert.equal(cardScoreShowsLive(event!.score), false)

    const fromApi = readLiveCardScores({
      live_home_score: 5,
      live_away_score: 3,
      live_score_final: true,
    })
    assert.deepEqual(fromApi, {home: 5, away: 3, final: true})
    assert.equal(cardScoreShowsLive(fromApi), false)
  })

  it('honors clear events by blanking the card score', () => {
    const cleared = parseLiveCardScoreEvent({
      matchId: 99,
      clear: true,
    })
    assert.deepEqual(cleared, {matchId: 99, score: null})
    assert.equal(resolveCardLiveScore(null, {live_home_score: 2, live_away_score: 1}), null)
    assert.equal(cardScoreShowsLive(null), false)
  })

  it('merges a Redis snapshot after resume and clears removed matches', () => {
    const snapshot = parseLiveCardScoreSnapshot({
      '10886': {home: 1, away: 2},
      junk: {home: 9, away: 9},
      '12': {home: 0, away: 0},
    })
    assert.deepEqual(snapshot, {
      '10886': {home: 1, away: 2},
      '12': {home: 0, away: 0},
    })
    const merged = mergeLiveCardScoreSnapshot(
      {'10886': {home: 1, away: 1}, '55': {home: 3, away: 0}},
      snapshot!,
    )
    assert.deepEqual(merged['10886'], {home: 1, away: 2})
    assert.equal(merged['55'], null)
    assert.deepEqual(merged['12'], {home: 0, away: 0})
  })
})
