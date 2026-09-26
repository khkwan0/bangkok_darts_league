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
import {useRouter} from 'expo-router'
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
  open_signup?: boolean
}

export default function CupsListScreen() {
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
  const [canManage, setCanManage] = React.useState(false)

  const competition = state.competition
  const isMini = isMiniCompetition(competition)
  const miniId = isMini ? competition.id : 0
  const isSiteAdmin = isLeagueAdmin(state.user)

  const load = React.useCallback(async () => {
    const opts = isMini ? {mini_league_id: miniId} : undefined
    const res = await apiRef.current.list(opts)
    if (res?.status === 'ok') {
      setRows(Array.isArray(res.data) ? res.data : [])
    }
    if (isSiteAdmin) {
      setCanManage(true)
    } else if (isMini) {
      const m = await miniApiRef.current.get(miniId)
      setCanManage(Boolean(m?.data?.is_admin))
    } else {
      setCanManage(false)
    }
  }, [isMini, isSiteAdmin, miniId])

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

  if (loading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <View style={{flex: 1}}>
      {canManage ? (
        <View style={{paddingHorizontal: 16, paddingTop: 12}}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(tabs)/(index)/cups/manage',
                params: isMini ? {mini_league_id: String(miniId)} : {},
              })
            }
            style={({pressed}) => ({opacity: pressed ? 0.9 : 1})}>
            <LinearGradient
              colors={isDark ? ['#1d4ed8', '#0f766e'] : ['#1d4ed8', '#0f766e']}
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
              <Ionicons name="settings-outline" size={18} color="#fff" />
              <Text style={{color: '#fff', fontWeight: '700'}}>
                Manage tournaments
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : null}
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
              No tournaments yet in this competition.
            </Text>
          </View>
        }
        renderItem={({item}) => (
          <TournamentListCard
            item={item}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/(index)/cups/[id]',
                params: {id: String(item.id)},
              })
            }
          />
        )}
      />
    </View>
  )
}
