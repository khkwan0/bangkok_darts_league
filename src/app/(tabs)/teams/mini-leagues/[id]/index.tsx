import Button from '@/components/Button'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useMiniLeagues} from '@/hooks/useMiniLeagues'
import {useTheme} from 'expo-router/react-navigation'
import {router, useFocusEffect, useLocalSearchParams} from 'expo-router'
import React from 'react'
import {ActivityIndicator, Pressable, ScrollView} from 'react-native'

export default function MiniLeagueOverviewScreen() {
  const {id} = useLocalSearchParams<{id: string}>()
  const miniId = Number(id)
  const api = useMiniLeagues()
  const {colors} = useTheme()
  const {state, setCompetition} = useLeagueContext()
  const [loading, setLoading] = React.useState(true)
  const [mini, setMini] = React.useState<any>(null)
  const [memberCount, setMemberCount] = React.useState(0)
  const [teamCount, setTeamCount] = React.useState(0)
  const [matchCount, setMatchCount] = React.useState(0)

  const refresh = React.useCallback(async () => {
    if (!miniId) return
    const [m, mem, t, mt] = await Promise.all([
      api.get(miniId),
      api.listMembers(miniId),
      api.listTeams(miniId),
      api.listMatches(miniId),
    ])
    if (m?.status === 'ok') {
      setMini(m.data)
      if (m.data?.member_status === 'active') {
        await setCompetition({
          type: 'mini',
          id: miniId,
          name: m.data.name || 'Mini league',
        })
      }
    }
    if (mem?.status === 'ok') setMemberCount((mem.data || []).length)
    if (t?.status === 'ok') setTeamCount((t.data || []).length)
    if (mt?.status === 'ok') setMatchCount((mt.data || []).length)
  }, [api, miniId, setCompetition])

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true)
      refresh().finally(() => setLoading(false))
    }, [refresh]),
  )

  if (loading || !mini) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    )
  }

  if (mini.member_status === 'pending') {
    return (
      <View className="flex-1 p-4 justify-center">
        <Text className="text-xl font-semibold mb-2">{mini.name}</Text>
        <Text className="mb-4 opacity-70">You have been invited.</Text>
        <Button
          onPress={async () => {
            await api.respondInvite(miniId, 'accept')
            await refresh()
          }}>
          <Text className="text-white">Accept invite</Text>
        </Button>
      </View>
    )
  }

  const isSiteAdmin = isLeagueAdmin(state.user)
  const isAdmin = Boolean(mini.is_admin) || isSiteAdmin
  const links: {
    label: string
    href: string
    adminOnly?: boolean
    hint?: string
    params?: Record<string, string>
  }[] = [
      {
        label: 'Players',
        href: `/teams/mini-leagues/${miniId}/players`,
        hint: `${memberCount} members`,
      },
      {
        label: 'Teams',
        href: `/teams/mini-leagues/${miniId}/teams`,
        hint: `${teamCount} teams`,
      },
      {
        label: 'Create match',
        href: `/teams/mini-leagues/${miniId}/create-match`,
        adminOnly: true,
        hint: `${matchCount} matches`,
      },
      {
        label: 'Tournaments',
        href: '/(tabs)/(index)/cups/manage',
        adminOnly: true,
        hint: 'Create & manage tournaments',
        params: {mini_league_id: String(miniId)},
      },
      {
        label: 'Add from main league',
        href: `/teams/mini-leagues/${miniId}/copy`,
        adminOnly: true,
      },
      {
        label: 'Settings',
        href: `/teams/mini-leagues/${miniId}/settings`,
        adminOnly: true,
      },
    ]

  return (
    <ScrollView className="flex-1" style={{backgroundColor: colors.background}}>
      <View className="px-4 pt-4 pb-8">
        <Text className="text-2xl font-bold">{mini.name}</Text>
        <Text className="text-sm opacity-70 mt-1 mb-4">
          {isAdmin ? 'You are an admin' : 'Member'}
          {mini.enabled === false || Number(mini.status) === 0
            ? ' · Disabled'
            : ''}
        </Text>
        <Button
          onPress={() =>
            setCompetition({
              type: 'mini',
              id: miniId,
              name: mini.name,
            }).then(() => router.navigate('/(tabs)/(index)' as any))
          }>
          <Text className="text-white">Use as current competition</Text>
        </Button>

        <View className="mt-6">
          {links
            .filter(l => !l.adminOnly || isAdmin)
            .map(l => (
              <Pressable
                key={l.href}
                onPress={() =>
                  router.push(
                    l.params
                      ? ({pathname: l.href, params: l.params} as any)
                      : (l.href as any),
                  )
                }
                className="py-4 border-b border-slate-200 dark:border-slate-700 flex-row justify-between items-center">
                <View>
                  <Text className="font-semibold text-base">{l.label}</Text>
                  {l.hint ? (
                    <Text className="text-sm opacity-60 mt-0.5">{l.hint}</Text>
                  ) : null}
                </View>
                <Text style={{color: colors.primary}}>Open</Text>
              </Pressable>
            ))}
        </View>
      </View>
    </ScrollView>
  )
}
