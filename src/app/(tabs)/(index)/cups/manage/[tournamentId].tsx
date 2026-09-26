import BracketTree from '@/components/cups/BracketTree'
import SeedReorderList from '@/components/cups/SeedReorderList'
import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useMiniLeagues} from '@/hooks/useMiniLeagues'
import {useTournaments} from '@/hooks/useTournaments'
import {useTournamentAdminSocket} from '@/hooks/useTournamentAdminSocket'
import {isMiniCompetition} from '@/types/competition'
import {useFocusEffect, useLocalSearchParams, useRouter} from 'expo-router'
import React from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  useColorScheme,
  View as RNView,
} from 'react-native'

type Entry = {
  id: number
  participant_type: string
  seed: number
  team_id?: number | null
  player_id?: number | null
  label?: string | null
  display_name?: string | null
}

type PlayerHit = {
  id: number
  nickname: string
  firstname: string
  lastname: string
}

type UnplacedItem = {
  entry_id: number
  display_name: string
  seed?: number
}

function UnplacedTray({
  items,
  selectedId,
  onSelect,
  isDark,
}: {
  items: UnplacedItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  isDark: boolean
}) {
  return (
    <View style={{marginTop: 12, marginBottom: 8}}>
      <Text style={{fontSize: 13, fontWeight: '700', marginBottom: 6}}>
        Unplaced ({items.length})
      </Text>
      {items.length === 0 ? (
        <Text style={{fontSize: 12, opacity: 0.55}}>
          All entries are placed in round 1.
        </Text>
      ) : (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
          {items.map(item => {
            const selected = selectedId === item.entry_id
            return (
              <Pressable
                key={item.entry_id}
                onPress={() => onSelect(item.entry_id)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: selected
                    ? isDark
                      ? '#60a5fa'
                      : '#2563eb'
                    : isDark
                      ? '#333'
                      : '#e2e8f0',
                  backgroundColor: selected
                    ? isDark
                      ? '#1e3a5f'
                      : '#dbeafe'
                    : isDark
                      ? '#1f1f1f'
                      : '#fff',
                }}>
                <Text style={{fontWeight: '600', fontSize: 13}}>
                  {item.display_name}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}
      {selectedId ? (
        <Text style={{marginTop: 6, fontSize: 12, opacity: 0.6}}>
          Tap an empty round-1 slot to place this player.
        </Text>
      ) : null}
    </View>
  )
}

export default function CupsManageDetailScreen() {
  const params = useLocalSearchParams<{
    tournamentId: string
    mini_league_id?: string
  }>()
  const tournamentId = Number(params.tournamentId)
  const paramMiniId = Number(params.mini_league_id || 0) || null
  const {state} = useLeagueContext()
  const api = useTournaments()
  const miniApi = useMiniLeagues()
  const apiRef = React.useRef(api)
  const miniApiRef = React.useRef(miniApi)
  apiRef.current = api
  miniApiRef.current = miniApi
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'

  const competition = state.competition
  const miniLeagueId =
    paramMiniId ??
    (isMiniCompetition(competition) ? competition.id : null)
  const scope =
    miniLeagueId && miniLeagueId > 0
      ? {type: 'mini' as const, id: miniLeagueId}
      : {type: 'site' as const}
  const isSiteAdmin = isLeagueAdmin(state.user)

  const [loading, setLoading] = React.useState(true)
  const [allowed, setAllowed] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [busyMessage, setBusyMessage] = React.useState('Working…')
  const [tournament, setTournament] = React.useState<any>(null)
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [teams, setTeams] = React.useState<any[]>([])
  const [teamIdInput, setTeamIdInput] = React.useState('')
  const [playerIdInput, setPlayerIdInput] = React.useState('')
  const [playerSearch, setPlayerSearch] = React.useState('')
  const [playerHits, setPlayerHits] = React.useState<PlayerHit[]>([])
  const [allPlayers, setAllPlayers] = React.useState<PlayerHit[]>([])
  const [playersLoaded, setPlayersLoaded] = React.useState(false)
  const [draftStages, setDraftStages] = React.useState<any[]>([])
  const [liveStages, setLiveStages] = React.useState<any[]>([])
  const [hasDraft, setHasDraft] = React.useState(false)
  const [unplaced, setUnplaced] = React.useState<
    Array<{entry_id: number; display_name: string; seed?: number}>
  >([])
  const [selectedUnplacedId, setSelectedUnplacedId] = React.useState<
    number | null
  >(null)
  const pageScrollRef = React.useRef<ScrollView>(null)
  const pageScrollOffsetRef = React.useRef(0)
  const [seedDragging, setSeedDragging] = React.useState(false)

  const miniId = scope.type === 'mini' ? scope.id : 0
  const scopeType = scope.type

  const load = React.useCallback(async () => {
    if (!tournamentId) return
    const currentScope =
      scopeType === 'mini' ? {type: 'mini' as const, id: miniId} : {type: 'site' as const}
    let canManage = isSiteAdmin
    if (currentScope.type === 'mini') {
      const m = await miniApiRef.current.get(miniId)
      canManage = isSiteAdmin || Boolean(m?.data?.is_admin)
      if (canManage) {
        const t = await miniApiRef.current.listTeams(miniId)
        if (t?.status === 'ok') setTeams(t.data || [])
      }
    }
    if (!canManage) {
      setAllowed(false)
      return
    }
    setAllowed(true)
    const [res, playersRes, draftRes] = await Promise.all([
      apiRef.current.adminGet(currentScope, tournamentId),
      apiRef.current.listAllPlayers().catch(() => null),
      apiRef.current.adminGetBracketDraft(currentScope, tournamentId).catch(() => null),
    ])
    let tournamentStatus = ''
    if (res?.status === 'ok') {
      const t = res.tournament || res
      setTournament(t)
      setEntries(Array.isArray(res.entries) ? res.entries : [])
      tournamentStatus = String(t?.status || '')
    }
    if (
      draftRes?.status === 'ok' &&
      draftRes.draft &&
      Array.isArray(draftRes.stages)
    ) {
      setDraftStages(draftRes.stages)
      setHasDraft(true)
      setUnplaced(Array.isArray(draftRes.unplaced) ? draftRes.unplaced : [])
    } else {
      setDraftStages([])
      setHasDraft(false)
      setUnplaced([])
      setSelectedUnplacedId(null)
    }
    if (tournamentStatus && tournamentStatus !== 'draft') {
      const bracketRes = await apiRef.current
        .getBracket(tournamentId)
        .catch(() => null)
      if (bracketRes?.status === 'ok' && Array.isArray(bracketRes.stages)) {
        setLiveStages(bracketRes.stages)
      } else {
        setLiveStages([])
      }
    } else {
      setLiveStages([])
    }
    const raw = Array.isArray(playersRes)
      ? playersRes
      : Array.isArray(playersRes?.data)
        ? playersRes.data
        : []
    setAllPlayers(
      raw
        .filter(
          (p: any) =>
            Number(p?.id) > 0 && Number(p?.merged_with_id ?? 0) === 0,
        )
        .map((p: any) => ({
          id: Number(p.id),
          nickname: String(p.nickname || ''),
          firstname: String(p.firstname || p.first_name || ''),
          lastname: String(p.lastname || p.last_name || ''),
        })),
    )
    setPlayersLoaded(true)
  }, [isSiteAdmin, miniId, scopeType, tournamentId])

  const hasHydrated = React.useRef(false)

  const onRemoteTournamentUpdate = React.useCallback(() => {
    void load()
  }, [load])

  const {others: otherEditors} = useTournamentAdminSocket({
    tournamentId,
    enabled: allowed && tournamentId > 0,
    onRemoteUpdate: onRemoteTournamentUpdate,
  })

  React.useEffect(() => {
    hasHydrated.current = false
    setLoading(true)
    setTournament(null)
  }, [tournamentId, miniId, scopeType])

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false
      if (!hasHydrated.current) setLoading(true)
      load().finally(() => {
        if (!cancelled) {
          hasHydrated.current = true
          setLoading(false)
        }
      })
      return () => {
        cancelled = true
      }
    }, [load]),
  )

  async function addTeamEntry(teamId: number) {
    if (!teamId) return
    setBusy(true)
    try {
      const res = await api.adminAddEntry(scope, tournamentId, {
        type: 'team',
        team_id: teamId,
      })
      if (res?.status === 'ok') {
        setTeamIdInput('')
        await load()
      } else {
        Alert.alert('Error', res?.error || 'Could not add team')
      }
    } finally {
      setBusy(false)
    }
  }

  async function addPlayerEntry(playerId?: number) {
    const id = playerId ?? parseInt(playerIdInput, 10)
    if (!id) {
      Alert.alert('Player', 'Search and select a player, or enter an id.')
      return
    }
    setBusy(true)
    try {
      const res = await api.adminAddEntry(scope, tournamentId, {
        type: 'player',
        player_id: id,
      })
      if (res?.status === 'ok') {
        setPlayerIdInput('')
        setPlayerSearch('')
        setPlayerHits([])
        await load()
      } else {
        Alert.alert('Error', res?.error || 'Could not add player')
      }
    } finally {
      setBusy(false)
    }
  }

  function onPlayerSearchChange(text: string) {
    setPlayerSearch(text)
    const q = text.trim().toLowerCase()
    if (q.length < 1) {
      setPlayerHits([])
      return
    }
    const hits = allPlayers
      .filter(p => {
        const nick = p.nickname.toLowerCase()
        const first = p.firstname.toLowerCase()
        const last = p.lastname.toLowerCase()
        const full = `${first} ${last}`.trim()
        return (
          nick.includes(q) ||
          first.includes(q) ||
          last.includes(q) ||
          full.includes(q) ||
          String(p.id) === q
        )
      })
      .slice(0, 50)
    setPlayerHits(hits)
  }

  async function toggleOpenSignup(value: boolean) {
    const previous = Boolean(tournament?.open_signup)
    // Optimistic: controlled Switch snaps back if we wait for the API.
    setTournament((t: any) => (t ? {...t, open_signup: value} : t))
    setBusy(true)
    try {
      const res = await api.adminUpdate(scope, tournamentId, {
        open_signup: value,
      })
      if (res?.status !== 'ok') {
        setTournament((t: any) => (t ? {...t, open_signup: previous} : t))
        Alert.alert('Error', res?.error || 'Could not update signup setting')
      }
    } catch {
      setTournament((t: any) => (t ? {...t, open_signup: previous} : t))
      Alert.alert('Error', 'Could not update signup setting')
    } finally {
      setBusy(false)
    }
  }

  async function removeEntry(entryId: number) {
    setBusy(true)
    try {
      const res = await api.adminRemoveEntry(scope, tournamentId, entryId)
      if (res?.status === 'ok') await load()
      else Alert.alert('Error', res?.error || 'Could not remove entry')
    } finally {
      setBusy(false)
    }
  }

  async function reorderSeeds(orderedIds: number[]) {
    setEntries(prev => {
      const byId = new Map(prev.map(e => [e.id, e]))
      return orderedIds
        .map((id, i) => {
          const e = byId.get(id)
          return e ? {...e, seed: i + 1} : null
        })
        .filter(Boolean) as Entry[]
    })
    const res = await api.adminReorderSeeds(scope, tournamentId, orderedIds)
    if (res?.status !== 'ok') {
      Alert.alert('Error', res?.error || 'Could not reorder seeds')
      await load()
    }
  }

  async function runBusy(
    message: string,
    work: () => Promise<void>,
  ) {
    setBusyMessage(message)
    setBusy(true)
    // Let the blocking modal paint before the network call starts.
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
    try {
      await work()
    } finally {
      setBusy(false)
    }
  }

  async function generate() {
    Alert.alert(
      'Generate draft bracket?',
      'Creates a preview only. Matches are not locked until you confirm.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Generate draft',
          onPress: () => {
            void runBusy('Generating draft…', async () => {
              const res = await api.adminGenerateBracket(scope, tournamentId)
              if (res?.status === 'ok') {
                if (Array.isArray(res.stages)) {
                  setDraftStages(res.stages)
                  setHasDraft(true)
                }
                setUnplaced(
                  Array.isArray(res.unplaced) ? res.unplaced : [],
                )
                setSelectedUnplacedId(null)
                Alert.alert(
                  'Draft ready',
                  `Preview built (${res.match_count ?? 0} matches). Review then lock in.`,
                )
                await load()
              } else {
                Alert.alert('Error', res?.error || 'Generate failed')
              }
            })
          },
        },
      ],
    )
  }

  async function confirmDraft() {
    Alert.alert(
      'Lock in bracket?',
      'Creates real matches and locks entries. This cannot be undone without a full reset.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Lock in',
          onPress: () => {
            void runBusy('Locking bracket…', async () => {
              const res = await api.adminConfirmBracket(scope, tournamentId)
              if (res?.status === 'ok') {
                setHasDraft(false)
                setDraftStages([])
                setUnplaced([])
                setSelectedUnplacedId(null)
                Alert.alert(
                  'Locked',
                  `Bracket locked (${res.match_count ?? 0} matches)`,
                )
                await load()
              } else {
                Alert.alert('Error', res?.error || 'Confirm failed')
              }
            })
          },
        },
      ],
    )
  }

  async function discardDraft() {
    Alert.alert('Discard draft?', 'Removes the preview bracket.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          void runBusy('Discarding draft…', async () => {
            const res = await api.adminDiscardBracketDraft(scope, tournamentId)
            if (res?.status === 'ok') {
              setHasDraft(false)
              setDraftStages([])
              setUnplaced([])
              setSelectedUnplacedId(null)
              await load()
            } else {
              Alert.alert('Error', res?.error || 'Discard failed')
            }
          })
        },
      },
    ])
  }

  async function reset() {
    Alert.alert(
      'Reset bracket?',
      'Deletes tournament matches and returns the tournament to draft.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            void runBusy('Resetting bracket…', async () => {
              const res = await api.adminResetBracket(scope, tournamentId)
              if (res?.status === 'ok') {
                await load()
              } else {
                Alert.alert('Error', res?.error || 'Reset failed')
              }
            })
          },
        },
      ],
    )
  }

  async function removeCup() {
    Alert.alert('Delete draft tournament?', 'This cannot be undone.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void runBusy('Deleting tournament…', async () => {
            const res = await api.adminDelete(scope, tournamentId)
            if (res?.status === 'ok') {
              router.back()
            } else {
              Alert.alert('Error', res?.error || 'Delete failed')
            }
          })
        },
      },
    ])
  }

  if (loading && !hasHydrated.current) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!allowed || !tournament) {
    return (
      <View style={{flex: 1, padding: 24, justifyContent: 'center'}}>
        <Text style={{textAlign: 'center', opacity: 0.7}}>
          Tournament not found or you do not have access.
        </Text>
      </View>
    )
  }

  const status = String(tournament.status || '')
  const isDraft = status === 'draft'
  const mode = String(tournament.participant_mode || 'team')
  const openSignup = Boolean(tournament.open_signup)
  const tablesAvailable =
    tournament.tables_available != null &&
    Number(tournament.tables_available) > 0
      ? Number(tournament.tables_available)
      : null
  const allowsPlayerEntries = mode === 'player' || mode === 'mixed'

  return (
    <>
    <Modal visible={busy} transparent animationType="fade" statusBarTranslucent>
      <RNView
        pointerEvents="auto"
        style={{
          flex: 1,
          backgroundColor: 'rgba(15,23,42,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}>
        <RNView
          style={{
            minWidth: 220,
            maxWidth: 320,
            borderRadius: 14,
            paddingVertical: 22,
            paddingHorizontal: 20,
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            alignItems: 'center',
            gap: 12,
          }}>
          <ActivityIndicator size="large" color={isDark ? '#93c5fd' : '#1d4ed8'} />
          <Text style={{fontSize: 15, fontWeight: '700', textAlign: 'center'}}>
            {busyMessage}
          </Text>
          <Text style={{fontSize: 12, opacity: 0.6, textAlign: 'center'}}>
            Please wait — do not leave this screen
          </Text>
        </RNView>
      </RNView>
    </Modal>
    <ScrollView
      ref={pageScrollRef}
      style={{flex: 1}}
      contentContainerStyle={{padding: 16, paddingBottom: 48}}
      scrollEventThrottle={16}
      scrollEnabled={!seedDragging && !busy}
      onScroll={e => {
        pageScrollOffsetRef.current = e.nativeEvent.contentOffset.y
      }}>
      <Text style={{fontSize: 22, fontWeight: '800'}}>{tournament.name}</Text>
      <Text style={{marginTop: 4, opacity: 0.6}}>
        {status.replace(/_/g, ' ')} · {mode}
        {tournament.game_type_label ? ` · ${tournament.game_type_label}` : ''}
      </Text>
      {otherEditors.length > 0 ? (
        <RNView
          style={{
            marginTop: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: isDark ? '#1e3a5f' : '#dbeafe',
            borderWidth: 1,
            borderColor: isDark ? '#3b82f6' : '#93c5fd',
          }}>
          <Text style={{fontSize: 13, fontWeight: '600'}}>
            Also editing:{' '}
            {otherEditors.map(e => e.nickname).join(', ')}
          </Text>
        </RNView>
      ) : null}

      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16}}>
        {!isDraft ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(tabs)/(index)/cups/[id]',
                params: {id: String(tournamentId)},
              })
            }
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: isDark ? '#334155' : '#e2e8f0',
            }}>
            <Text style={{fontWeight: '600'}}>View bracket</Text>
          </Pressable>
        ) : null}
        {isDraft ? (
          <>
            <Pressable
              onPress={generate}
              disabled={busy}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: isDark ? '#2563eb' : '#1d4ed8',
              }}>
              <Text style={{color: '#fff', fontWeight: '700'}}>
                {hasDraft ? 'Regenerate draft' : 'Generate draft'}
              </Text>
            </Pressable>
            {hasDraft ? (
              <>
                <Pressable
                  onPress={confirmDraft}
                  disabled={busy}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: isDark ? '#15803d' : '#166534',
                  }}>
                  <Text style={{color: '#fff', fontWeight: '700'}}>
                    Lock in bracket
                  </Text>
                </Pressable>
                <Pressable
                  onPress={discardDraft}
                  disabled={busy}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: isDark ? '#334155' : '#e2e8f0',
                  }}>
                  <Text style={{fontWeight: '600'}}>Discard draft</Text>
                </Pressable>
              </>
            ) : null}
          </>
        ) : (
          <Pressable
            onPress={reset}
            disabled={busy}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: isDark ? '#7f1d1d' : '#b91c1c',
            }}>
            <Text style={{color: '#fff', fontWeight: '700'}}>
              Reset to draft
            </Text>
          </Pressable>
        )}
      </View>

      {hasDraft && draftStages.length > 0 ? (
        <View style={{marginTop: 20}}>
          <Text style={{fontSize: 17, fontWeight: '700'}}>
            Draft bracket preview
          </Text>
          <Text style={{marginTop: 4, fontSize: 12, opacity: 0.6}}>
            Preview only — × clears a slot (player goes to Unplaced). Select
            Unplaced then tap an empty slot to place.
            {tablesAvailable
              ? ` Tap table badges to cycle through 1–${tablesAvailable}.`
              : ''}
          </Text>
          <UnplacedTray
            items={unplaced}
            selectedId={selectedUnplacedId}
            isDark={isDark}
            onSelect={id =>
              setSelectedUnplacedId(prev => (prev === id ? null : id))
            }
          />
          <BracketTree
            stages={draftStages}
            editableRound1
            tablesAvailable={tablesAvailable}
            verticalScrollRef={pageScrollRef}
            verticalScrollOffsetRef={pageScrollOffsetRef}
            selectedUnplacedEntryId={selectedUnplacedId}
            onSwapRound1Slots={async (from, to) => {
              const res = await api.adminSwapBracketDraftSlots(
                scope,
                tournamentId,
                from,
                to,
              )
              if (res?.status === 'ok' && Array.isArray(res.stages)) {
                setDraftStages(res.stages)
                setUnplaced(Array.isArray(res.unplaced) ? res.unplaced : [])
              } else {
                Alert.alert('Swap failed', res?.error || 'Could not update draft')
              }
            }}
            onClearRound1Slot={async slot => {
              const res = await api.adminClearBracketDraftSlot(
                scope,
                tournamentId,
                slot,
              )
              if (res?.status === 'ok' && Array.isArray(res.stages)) {
                setDraftStages(res.stages)
                setUnplaced(Array.isArray(res.unplaced) ? res.unplaced : [])
                setSelectedUnplacedId(null)
              } else {
                Alert.alert('Clear failed', res?.error || 'Could not clear slot')
              }
            }}
            onAssignRound1Slot={async slot => {
              if (!selectedUnplacedId) return
              const res = await api.adminAssignBracketDraftSlot(
                scope,
                tournamentId,
                slot,
                selectedUnplacedId,
              )
              if (res?.status === 'ok' && Array.isArray(res.stages)) {
                setDraftStages(res.stages)
                setUnplaced(Array.isArray(res.unplaced) ? res.unplaced : [])
                setSelectedUnplacedId(null)
              } else {
                Alert.alert(
                  'Place failed',
                  res?.error || 'Could not place player',
                )
              }
            }}
            onCycleMatchTable={async match => {
              if (!tablesAvailable || !match.temp_id) return
              const current =
                match.table_number != null ? Number(match.table_number) : 0
              const next =
                current >= tablesAvailable ? null : current + 1 || 1
              const res = await api.adminSetBracketDraftTable(
                scope,
                tournamentId,
                match.temp_id,
                next,
              )
              if (res?.status === 'ok' && Array.isArray(res.stages)) {
                setDraftStages(res.stages)
                setUnplaced(Array.isArray(res.unplaced) ? res.unplaced : [])
              } else {
                Alert.alert(
                  'Table update failed',
                  res?.error || 'Could not set table',
                )
              }
            }}
          />
        </View>
      ) : null}

      {!isDraft && liveStages.length > 0 ? (
        <View style={{marginTop: 20}}>
          <Text style={{fontSize: 17, fontWeight: '700'}}>Bracket tables</Text>
          <Text style={{marginTop: 4, fontSize: 12, opacity: 0.6}}>
            {tablesAvailable
              ? `Tap table badges to cycle through 1–${tablesAvailable} (or clear).`
              : 'Set tables available below, then assign tables to matches.'}
          </Text>
          <BracketTree
            stages={liveStages}
            tablesAvailable={tablesAvailable}
            verticalScrollRef={pageScrollRef}
            verticalScrollOffsetRef={pageScrollOffsetRef}
            onCycleMatchTable={async match => {
              if (!tablesAvailable || !match.match_id) return
              const current =
                match.table_number != null ? Number(match.table_number) : 0
              const next =
                current >= tablesAvailable ? null : current + 1 || 1
              const res = await api.adminSetMatchTable(
                scope,
                tournamentId,
                match.match_id,
                next,
              )
              if (res?.status === 'ok') {
                setLiveStages(prev =>
                  prev.map((stage: any) => ({
                    ...stage,
                    matches: (stage.matches || []).map((m: any) =>
                      Number(m.match_id) === Number(match.match_id)
                        ? {...m, table_number: next}
                        : m,
                    ),
                  })),
                )
              } else {
                Alert.alert(
                  'Table update failed',
                  res?.error || 'Could not set table',
                )
              }
            }}
          />
        </View>
      ) : null}

      <Text style={{marginTop: 24, fontSize: 17, fontWeight: '700'}}>
        Entries ({entries.length})
      </Text>

      <RNView
        style={{
          marginTop: 12,
          marginBottom: 4,
          padding: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: isDark ? '#333' : '#e2e8f0',
          backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
        }}>
        <Text style={{fontWeight: '600'}}>Tables available</Text>
        <Text style={{fontSize: 12, opacity: 0.6, marginTop: 4}}>
          {isDraft
            ? 'Used when generating the draft bracket to assign table numbers. Regenerate the draft after changing this.'
            : 'Change anytime. Matches with a table above the new max are cleared.'}
        </Text>
        <TextInput
          value={tablesAvailable != null ? String(tablesAvailable) : ''}
          onChangeText={async text => {
            const cleaned = text.replace(/[^0-9]/g, '')
            const n = cleaned ? parseInt(cleaned, 10) : null
            setTournament((t: any) =>
              t
                ? {
                    ...t,
                    tables_available: n != null && n >= 1 ? n : null,
                  }
                : t,
            )
          }}
          onEndEditing={async e => {
            const cleaned = String(e.nativeEvent.text || '').replace(
              /[^0-9]/g,
              '',
            )
            const n = cleaned ? parseInt(cleaned, 10) : null
            const value = n != null && n >= 1 ? n : null
            setBusy(true)
            try {
              const res = await api.adminUpdate(scope, tournamentId, {
                tables_available: value,
              })
              if (res?.status !== 'ok') {
                Alert.alert(
                  'Error',
                  res?.error || 'Could not update tables',
                )
                await load()
              } else if (!isDraft) {
                await load()
              }
            } finally {
              setBusy(false)
            }
          }}
          keyboardType="number-pad"
          placeholder="e.g. 4"
          placeholderTextColor={isDark ? '#666' : '#94a3b8'}
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: isDark ? '#333' : '#e2e8f0',
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: isDark ? '#fff' : '#0f172a',
            backgroundColor: isDark ? '#1f1f1f' : '#fff',
            width: 120,
          }}
        />
      </RNView>

      {isDraft && allowsPlayerEntries ? (
        <RNView
          style={{
            marginTop: 12,
            marginBottom: 4,
            padding: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: isDark ? '#333' : '#e2e8f0',
            backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}>
          <RNView style={{flex: 1}}>
            <Text style={{fontWeight: '600'}}>Allow player self-signup</Text>
            <Text style={{fontSize: 12, opacity: 0.6, marginTop: 4}}>
              {openSignup
                ? 'Players can register themselves while this tournament is draft.'
                : 'Only organizers can add entries. Search by name below.'}
            </Text>
          </RNView>
          <Switch
            value={openSignup}
            disabled={busy}
            onValueChange={toggleOpenSignup}
          />
        </RNView>
      ) : null}

      {isDraft ? (
        <View style={{marginTop: 10, marginBottom: 8}}>
          {(mode === 'team' || mode === 'mixed') && teams.length > 0 ? (
            <View style={{marginBottom: 12}}>
              <Text style={{opacity: 0.65, marginBottom: 6}}>Add mini team</Text>
              <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
                {teams.map((t: any) => (
                  <Pressable
                    key={t.id}
                    disabled={busy}
                    onPress={() => addTeamEntry(Number(t.id))}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 8,
                      marginRight: 8,
                      marginBottom: 8,
                      backgroundColor: isDark ? '#333' : '#e2e8f0',
                    }}>
                    <Text>{t.name || `Team ${t.id}`}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {(mode === 'team' || mode === 'mixed') && (
            <View style={{flexDirection: 'row', marginBottom: 10}}>
              <TextInput
                value={teamIdInput}
                onChangeText={setTeamIdInput}
                placeholder="Team ID"
                keyboardType="number-pad"
                placeholderTextColor={isDark ? '#666' : '#94a3b8'}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: isDark ? '#333' : '#e2e8f0',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  marginRight: 8,
                  color: isDark ? '#fff' : '#0f172a',
                }}
              />
              <Pressable
                disabled={busy}
                onPress={() => addTeamEntry(parseInt(teamIdInput, 10))}
                style={{
                  paddingHorizontal: 12,
                  justifyContent: 'center',
                  borderRadius: 8,
                  backgroundColor: isDark ? '#2563eb' : '#1d4ed8',
                }}>
                <Text style={{color: '#fff', fontWeight: '600'}}>Add</Text>
              </Pressable>
            </View>
          )}

          {allowsPlayerEntries && (
            <View style={{marginBottom: 10}}>
              <Text style={{opacity: 0.65, marginBottom: 6}}>
                Search all players (nickname, first or last name)
              </Text>
              <TextInput
                value={playerSearch}
                onChangeText={onPlayerSearchChange}
                placeholder={
                  playersLoaded
                    ? 'Type a name…'
                    : 'Loading player directory…'
                }
                editable={playersLoaded}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={isDark ? '#666' : '#94a3b8'}
                style={{
                  borderWidth: 1,
                  borderColor: isDark ? '#333' : '#e2e8f0',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  color: isDark ? '#fff' : '#0f172a',
                  marginBottom: 6,
                }}
              />
              {playerSearch.trim().length > 0 && playerHits.length === 0 ? (
                <Text style={{fontSize: 12, opacity: 0.5, marginBottom: 6}}>
                  No matches
                </Text>
              ) : null}
              {playerHits.map(p => (
                <Pressable
                  key={p.id}
                  disabled={busy}
                  onPress={() => addPlayerEntry(p.id)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    marginBottom: 6,
                    backgroundColor: isDark ? '#262626' : '#f1f5f9',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                  <View style={{flex: 1, paddingRight: 8}}>
                    <Text style={{fontWeight: '700'}}>
                      {p.nickname || '—'}{' '}
                      <Text style={{fontWeight: '600', opacity: 0.55}}>
                        #{p.id}
                      </Text>
                    </Text>
                    <Text style={{fontSize: 12, opacity: 0.55, marginTop: 2}}>
                      {[p.firstname, p.lastname].filter(Boolean).join(' ') ||
                        'No name on file'}
                    </Text>
                  </View>
                  <Text style={{color: isDark ? '#93c5fd' : '#1d4ed8', fontWeight: '600'}}>
                    Add
                  </Text>
                </Pressable>
              ))}
              <View style={{flexDirection: 'row', marginTop: 4}}>
                <TextInput
                  value={playerIdInput}
                  onChangeText={setPlayerIdInput}
                  placeholder="Or player ID"
                  keyboardType="number-pad"
                  placeholderTextColor={isDark ? '#666' : '#94a3b8'}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: isDark ? '#333' : '#e2e8f0',
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    marginRight: 8,
                    color: isDark ? '#fff' : '#0f172a',
                  }}
                />
                <Pressable
                  disabled={busy}
                  onPress={() => addPlayerEntry()}
                  style={{
                    paddingHorizontal: 12,
                    justifyContent: 'center',
                    borderRadius: 8,
                    backgroundColor: isDark ? '#2563eb' : '#1d4ed8',
                  }}>
                  <Text style={{color: '#fff', fontWeight: '600'}}>Add</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ) : (
        <Text style={{marginTop: 8, opacity: 0.55, marginBottom: 8}}>
          Entries are locked after the bracket is generated.
        </Text>
      )}

      {entries.length === 0 ? (
        <Text style={{opacity: 0.55, marginTop: 8}}>
          No entries yet.
          {isDraft && mode === 'team'
            ? ' Team tournaments may auto-import teams on create; you can still add more.'
            : ''}
        </Text>
      ) : (
        <SeedReorderList
          entries={entries}
          editable={isDraft}
          busy={busy}
          onReorder={reorderSeeds}
          onRemove={isDraft ? removeEntry : undefined}
          onDraggingChange={setSeedDragging}
          verticalScrollRef={pageScrollRef}
          verticalScrollOffsetRef={pageScrollOffsetRef}
        />
      )}

      {isDraft ? (
        <View style={{marginTop: 24}}>
          <Button onPress={removeCup} disabled={busy}>
            <Text style={{color: '#fff', fontWeight: '700'}}>
              Delete draft tournament
            </Text>
          </Button>
        </View>
      ) : null}
    </ScrollView>
    </>
  )
}
