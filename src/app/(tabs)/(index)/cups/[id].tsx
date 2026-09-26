import BracketTree, {
  type BracketTreeMatch,
  type BracketTreeStage,
} from '@/components/cups/BracketTree'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeague} from '@/hooks'
import {useTournaments} from '@/hooks/useTournaments'
import {useLocalSearchParams, useRouter} from 'expo-router'
import React from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  useColorScheme,
} from 'react-native'

type CompletedMatch = {
  match_id: number
  date: string | null
  home_display: string | null
  away_display: string | null
  home_frames: number | null
  away_frames: number | null
  home_team_id: number | null
  away_team_id: number | null
  venue_name: string | null
}

export default function CupBracketScreen() {
  const {id} = useLocalSearchParams<{id: string}>()
  const tournamentId = Number(id)
  const api = useTournaments()
  const apiRef = React.useRef(api)
  apiRef.current = api
  const league = useLeague()
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const [name, setName] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [stages, setStages] = React.useState<BracketTreeStage[]>([])
  const [completed, setCompleted] = React.useState<CompletedMatch[]>([])
  const [loading, setLoading] = React.useState(true)
  const [openingId, setOpeningId] = React.useState<number | null>(null)
  const [canSignup, setCanSignup] = React.useState(false)
  const [alreadyEntered, setAlreadyEntered] = React.useState(false)
  const [openSignup, setOpenSignup] = React.useState(false)
  const [signingUp, setSigningUp] = React.useState(false)
  const [entryCount, setEntryCount] = React.useState<number | null>(null)

  const load = React.useCallback(async () => {
    if (!tournamentId) return
    const [signupRes, bracketRes, completedRes] = await Promise.all([
      apiRef.current.getSignupStatus(tournamentId).catch(() => null),
      apiRef.current.getBracket(tournamentId).catch(() => null),
      apiRef.current.getCompletedMatches(tournamentId).catch(() => null),
    ])
    if (signupRes?.status === 'ok') {
      setName(signupRes.tournament?.name ?? '')
      setStatus(signupRes.tournament?.status ?? '')
      setOpenSignup(Boolean(signupRes.tournament?.open_signup))
      setCanSignup(Boolean(signupRes.can_signup))
      setAlreadyEntered(Boolean(signupRes.already_entered))
      setEntryCount(
        signupRes.tournament?.entry_count != null
          ? Number(signupRes.tournament.entry_count)
          : null,
      )
    }
    if (bracketRes?.status === 'ok') {
      setName(bracketRes.tournament?.name ?? '')
      setStatus(bracketRes.tournament?.status ?? '')
      setStages(Array.isArray(bracketRes.stages) ? bracketRes.stages : [])
    } else {
      setStages([])
    }
    if (completedRes?.status === 'ok') {
      setCompleted(
        Array.isArray(completedRes.matches) ? completedRes.matches : [],
      )
    } else {
      setCompleted([])
    }
  }, [tournamentId])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    load().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [load])

  async function onSignup() {
    setSigningUp(true)
    try {
      const res = await api.selfSignup(tournamentId)
      if (res?.status === 'ok') {
        Alert.alert('Entered', 'You are registered in this tournament.')
        await load()
      } else {
        Alert.alert('Could not sign up', res?.error || 'Try again later.')
      }
    } finally {
      setSigningUp(false)
    }
  }

  function scoringIds(match: {
    home_team_id?: number | null
    away_team_id?: number | null
    home_tournament_team_id?: number | null
    away_tournament_team_id?: number | null
  }) {
    const home =
      match.home_team_id || match.home_tournament_team_id || null
    const away =
      match.away_team_id || match.away_tournament_team_id || null
    return {home, away}
  }

  async function openMatch(
    match: Pick<
      BracketTreeMatch,
      | 'match_id'
      | 'home_team_id'
      | 'away_team_id'
      | 'home_tournament_team_id'
      | 'away_tournament_team_id'
      | 'status_id'
    >,
  ) {
    const {home, away} = scoringIds(match)
    if (!match.match_id || !home || !away) return
    setOpeningId(match.match_id)
    try {
      const res = await league.GetMatchById(match.match_id)
      const info =
        res?.status === 'ok' && res.data
          ? res.data
          : res?.match_id
            ? res
            : null
      if (info) {
        const payload = {
          ...info,
          home_team_id: info.home_team_id || home,
          away_team_id: info.away_team_id || away,
        }
        const homeId = Number(payload.home_team_id ?? 0)
        const awayId = Number(payload.away_team_id ?? 0)
        if (!homeId || !awayId) return
        if (match.status_id === 3 || Number(info.status_id) === 3) {
          router.push({
            pathname: '/completed/Match',
            params: {
              params: JSON.stringify({matchId: match.match_id}),
            },
          })
          return
        }
        router.push({
          pathname: '/Match',
          params: {params: JSON.stringify(payload)},
        })
      }
    } finally {
      setOpeningId(null)
    }
  }

  if (loading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator />
      </View>
    )
  }

  const isDraftOpen = status === 'draft' && openSignup
  const showEmpty =
    !isDraftOpen && stages.length === 0 && completed.length === 0

  return (
    <ScrollView
      horizontal={false}
      contentContainerStyle={{padding: 16, paddingBottom: 40}}>
      <Text style={{fontSize: 22, fontWeight: '800'}}>
        {name || `Tournament #${tournamentId}`}
      </Text>
      <Text style={{marginTop: 4, opacity: 0.6, textTransform: 'capitalize'}}>
        {(status || 'unknown').replace(/_/g, ' ')}
        {entryCount != null ? ` · ${entryCount} entries` : ''}
      </Text>

      {isDraftOpen ? (
        <View
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDark ? '#334155' : '#bfdbfe',
            backgroundColor: isDark ? '#0f172a' : '#eff6ff',
          }}>
          <Text style={{fontWeight: '700', marginBottom: 6}}>
            Open for signup
          </Text>
          <Text style={{fontSize: 13, opacity: 0.75, marginBottom: 12}}>
            {alreadyEntered
              ? 'You are already entered in this tournament.'
              : canSignup
                ? 'Register yourself before the organizer generates the bracket.'
                : 'Log in as a player to enter this tournament.'}
          </Text>
          {canSignup ? (
            <Pressable
              disabled={signingUp}
              onPress={onSignup}
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 8,
                backgroundColor: isDark ? '#2563eb' : '#1d4ed8',
                opacity: signingUp ? 0.6 : 1,
              }}>
              <Text style={{color: '#fff', fontWeight: '700'}}>
                {signingUp ? 'Signing up…' : 'Sign up'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showEmpty ? (
        <Text style={{marginTop: 24, opacity: 0.55}}>
          Bracket is not ready yet.
        </Text>
      ) : null}

      <BracketTree
        stages={stages}
        onMatchPress={openMatch}
        openingId={openingId}
      />

      {completed.length > 0 ? (
        <View style={{marginTop: 28}}>
          <Text style={{fontSize: 17, fontWeight: '700', marginBottom: 10}}>
            Completed matches
          </Text>
          {completed.map(m => (
            <Pressable
              key={`c-${m.match_id}`}
              disabled={openingId === m.match_id}
              onPress={() =>
                openMatch({
                  match_id: m.match_id,
                  home_team_id: m.home_team_id,
                  away_team_id: m.away_team_id,
                  status_id: 3,
                })
              }
              style={{
                marginBottom: 10,
                padding: 12,
                borderRadius: 10,
                backgroundColor: isDark ? '#1f1f1f' : '#fff',
                borderWidth: 1,
                borderColor: isDark ? '#333' : '#e2e8f0',
              }}>
              <Text style={{fontWeight: '600'}}>
                {m.home_display || 'TBD'} {m.home_frames ?? 0} –{' '}
                {m.away_frames ?? 0} {m.away_display || 'TBD'}
              </Text>
              <Text style={{marginTop: 6, fontSize: 11, opacity: 0.55}}>
                #{m.match_id}
                {m.date ? ` · ${String(m.date).slice(0, 10)}` : ''}
                {m.venue_name ? ` · ${m.venue_name}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  )
}
