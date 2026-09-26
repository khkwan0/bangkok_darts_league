import {TournamentListCard} from '@/components/cups/TournamentListCard'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useMiniLeagues} from '@/hooks/useMiniLeagues'
import {useTournaments} from '@/hooks/useTournaments'
import {isMiniCompetition} from '@/types/competition'
import Ionicons from '@expo/vector-icons/Ionicons'
import {LinearGradient} from 'expo-linear-gradient'
import {useFocusEffect, useLocalSearchParams, useRouter} from 'expo-router'
import React from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  useColorScheme,
} from 'react-native'

type CupRow = {
  id: number
  name: string
  status: string
  game_type_label?: string
  entry_count?: number
  participant_mode?: string
  open_signup?: boolean
}

function scopeFromParams(miniLeagueId: number | null) {
  if (miniLeagueId && miniLeagueId > 0) {
    return {type: 'mini' as const, id: miniLeagueId}
  }
  return {type: 'site' as const}
}

export default function CupsManageScreen() {
  const params = useLocalSearchParams<{mini_league_id?: string}>()
  const paramMiniId = Number(params.mini_league_id || 0) || null
  const api = useTournaments()
  const miniApi = useMiniLeagues()
  const apiRef = React.useRef(api)
  const miniApiRef = React.useRef(miniApi)
  apiRef.current = api
  miniApiRef.current = miniApi
  const {state} = useLeagueContext()
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const [rows, setRows] = React.useState<CupRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [allowed, setAllowed] = React.useState(false)
  const [denied, setDenied] = React.useState(false)

  const competition = state.competition
  const miniLeagueId =
    paramMiniId ??
    (isMiniCompetition(competition) ? competition.id : null)
  const scope = scopeFromParams(miniLeagueId)
  const isSiteAdmin = isLeagueAdmin(state.user)
  const miniId = scope.type === 'mini' ? scope.id : 0
  const scopeType = scope.type

  const load = React.useCallback(async () => {
    const currentScope =
      scopeType === 'mini' ? {type: 'mini' as const, id: miniId} : {type: 'site' as const}
    let canManage = isSiteAdmin
    if (currentScope.type === 'mini') {
      const m = await miniApiRef.current.get(miniId)
      canManage = isSiteAdmin || Boolean(m?.data?.is_admin)
    }
    if (!canManage) {
      setAllowed(false)
      setDenied(true)
      setRows([])
      return
    }
    setAllowed(true)
    setDenied(false)
    const res = await apiRef.current.adminList(currentScope)
    if (res?.status === 'ok') {
      setRows(Array.isArray(res.tournaments) ? res.tournaments : [])
    } else {
      setRows([])
    }
  }, [isSiteAdmin, miniId, scopeType])

  const hasHydrated = React.useRef(false)

  React.useEffect(() => {
    hasHydrated.current = false
    setLoading(true)
  }, [miniId, scopeType])

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

  if (loading && !hasHydrated.current) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator />
      </View>
    )
  }

  if (denied || !allowed) {
    return (
      <View style={{flex: 1, padding: 24, justifyContent: 'center'}}>
        <Text style={{textAlign: 'center', opacity: 0.7}}>
          Only league or mini-league admins can manage tournaments.
        </Text>
      </View>
    )
  }

  return (
    <View style={{flex: 1}}>
      <View style={{paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4}}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(tabs)/(index)/cups/manage/create',
              params: miniLeagueId
                ? {mini_league_id: String(miniLeagueId)}
                : {},
            })
          }
          style={({pressed}) => ({opacity: pressed ? 0.9 : 1})}>
          <LinearGradient
            colors={['#1d4ed8', '#0f766e']}
            start={{x: 0, y: 0.5}}
            end={{x: 1, y: 0.5}}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={{color: '#fff', fontWeight: '700'}}>
              Create tournament
            </Text>
          </LinearGradient>
        </Pressable>
        <Text style={{marginTop: 8, fontSize: 12, opacity: 0.55}}>
          {scope.type === 'mini'
            ? 'Managing tournaments for this mini league (includes drafts).'
            : 'Managing canonical league tournaments (includes drafts).'}
        </Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{padding: 16, gap: 12, flexGrow: 1}}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await load()
              setRefreshing(false)
            }}
          />
        }
        ListEmptyComponent={
          <View style={{alignItems: 'center', marginTop: 48, gap: 10}}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isDark
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(180, 83, 9, 0.1)',
              }}>
              <Ionicons
                name="trophy-outline"
                size={30}
                color={isDark ? '#fbbf24' : '#b45309'}
              />
            </View>
            <Text style={{opacity: 0.6, textAlign: 'center'}}>
              No tournaments yet. Create one to get started.
            </Text>
          </View>
        }
        renderItem={({item}) => (
          <TournamentListCard
            item={item}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/(index)/cups/manage/[tournamentId]',
                params: {
                  tournamentId: String(item.id),
                  ...(miniLeagueId
                    ? {mini_league_id: String(miniLeagueId)}
                    : {}),
                },
              })
            }
          />
        )}
      />
    </View>
  )
}
