import {ThemedText as Text} from '@/components/ThemedText'
import {useMiniLeagues} from '@/hooks/useMiniLeagues'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {Pressable, ScrollView, View} from 'react-native'

type SeasonRow = {
  id: number
  name: string
  short_name?: string
  is_active?: boolean
}

export function useMiniSeasonSelection(miniLeagueId: number) {
  const api = useMiniLeagues()
  const apiRef = React.useRef(api)
  apiRef.current = api
  const [seasons, setSeasons] = React.useState<SeasonRow[]>([])
  const [seasonId, setSeasonId] = React.useState<number | null>(null)
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    setReady(false)
    setSeasonId(null)
    async function load() {
      const res = await apiRef.current.listSeasons(miniLeagueId)
      if (cancelled) return
      if (res?.status === 'ok') {
        const rows: SeasonRow[] = res.data || []
        setSeasons(rows)
        const active = rows.find(s => s.is_active) || rows[0]
        setSeasonId(active?.id ? Number(active.id) : null)
      } else {
        setSeasons([])
        setSeasonId(null)
      }
      if (!cancelled) setReady(true)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [miniLeagueId])

  return {seasons, seasonId, setSeasonId, ready}
}

export function MiniSeasonChips({
  seasons,
  seasonId,
  onSelect,
}: {
  seasons: SeasonRow[]
  seasonId: number | null
  onSelect: (id: number) => void
}) {
  const {colors} = useTheme()
  if (seasons.length <= 1) return null

  return (
    <View className="mb-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {seasons.map(s => {
          const active = Number(s.id) === Number(seasonId)
          return (
            <Pressable
              key={s.id}
              onPress={() => onSelect(Number(s.id))}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                marginRight: 8,
                backgroundColor: active ? colors.primary : colors.background,
                borderWidth: 1,
                borderColor: active ? colors.primary : '#8884',
              }}>
              <Text
                style={{
                  color: active ? '#fff' : colors.text,
                  fontWeight: active ? '700' : '500',
                  fontSize: 13,
                }}>
                {s.short_name || s.name}
                {s.is_active ? ' ·' : ''}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
