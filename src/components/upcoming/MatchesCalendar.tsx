import type {MatchInfoDataType} from '@/components/Match/types'
import {AdaptiveSplit} from '@/components/layout/AdaptiveSplit'
import MatchCard from '@/components/upcoming/MatchCard'
import MatchCardOld from '@/components/upcoming/MatchCardOld'
import {useLeagueContext} from '@/context/LeagueContext'
import {useIsRegularLayout} from '@/hooks/useLayoutMode'
import {BANGKOK_ZONE, nowInBangkok, toBangkok} from '@/lib/bangkokTime'
import {
  getMatchDisplayDate,
  isPostponedDateLabel,
} from '@/lib/postponedProposal'
import {MaterialIcons} from '@expo/vector-icons'
import {DateTime} from 'luxon'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'

const ACCENT = '#37003C'

export type CalendarFixture = {
  date?: string
  original_date?: string
  ad_spot?: boolean
  key?: string
  home_team_id?: number
  away_team_id?: number
  home_team_short_name?: string
  away_team_short_name?: string
  division_name?: string
  name?: string
  location?: string
  tournament_id?: number | string
  round?: number | null
  stage_label?: string | null
  stage_key?: string | null
  game_type_label?: string | null
  home_logo?: string | null
  away_logo?: string | null
  home_confirmed?: number | string
  away_confirmed?: number | string
  homeStats?: {rank?: number; won?: number; lost?: number; tied?: number}
  awayStats?: {rank?: number; won?: number; lost?: number; tied?: number}
}

type IndexedMatch = {index: number; match: CalendarFixture}

type Props = {
  fixtures: CalendarFixture[]
  onOpenMatch: (index: number) => void
  refreshing: boolean
  onRefresh: () => void
  onScrollBeginDrag?: () => void
  contentContainerStyle?: StyleProp<ViewStyle>
  /** Route for match card scoresheet Links (Settings stack needs its own path). */
  scoresheetPathname?: string
}

function matchDayKey(match: CalendarFixture): string | null {
  if (match.ad_spot) return null
  const raw = getMatchDisplayDate({
    date: match.date ?? '',
    original_date: match.original_date,
  })
  if (!raw || isPostponedDateLabel(raw)) return null
  const iso = toBangkok(raw)
  if (iso.isValid) return iso.toFormat('yyyy-MM-dd')
  const sql = DateTime.fromSQL(raw, {zone: BANGKOK_ZONE})
  if (sql.isValid) return sql.toFormat('yyyy-MM-dd')
  return null
}

function groupFixtures(fixtures: CalendarFixture[]) {
  const byDay = new Map<string, IndexedMatch[]>()
  const unscheduled: IndexedMatch[] = []
  fixtures.forEach((match, index) => {
    if (match?.ad_spot) return
    const key = matchDayKey(match)
    if (!key) {
      unscheduled.push({index, match})
      return
    }
    const bucket = byDay.get(key) ?? []
    bucket.push({index, match})
    byDay.set(key, bucket)
  })
  for (const bucket of byDay.values()) {
    bucket.sort((a, b) => {
      const aTime = toBangkok(
        getMatchDisplayDate({
          date: a.match.date ?? '',
          original_date: a.match.original_date,
        }),
      )
      const bTime = toBangkok(
        getMatchDisplayDate({
          date: b.match.date ?? '',
          original_date: b.match.original_date,
        }),
      )
      if (!aTime.isValid || !bTime.isValid) return 0
      return aTime.toMillis() - bTime.toMillis()
    })
  }
  return {byDay, unscheduled}
}

/** Prefer today if it has matches, else the next upcoming match day. */
function initialFocus(fixtures: CalendarFixture[]) {
  const {byDay} = groupFixtures(fixtures)
  const today = nowInBangkok()
  const todayKey = today.toFormat('yyyy-MM-dd')
  const keys = [...byDay.keys()].sort()
  const pick =
    keys.find(key => key >= todayKey) ?? keys[keys.length - 1] ?? todayKey
  const month = DateTime.fromISO(pick, {zone: BANGKOK_ZONE})
  return {
    selectedKey: pick,
    visibleMonth: (month.isValid ? month : today).startOf('month'),
  }
}

function monthGrid(month: DateTime): DateTime[] {
  const start = month.startOf('month')
  const gridStart = start.minus({days: start.weekday % 7})
  const days = Array.from({length: 42}, (_, i) => gridStart.plus({days: i}))
  while (
    days.length > 35 &&
    days.slice(-7).every(day => !day.hasSame(month, 'month'))
  ) {
    days.splice(-7, 7)
  }
  return days
}

function isCup(match: CalendarFixture): boolean {
  return Number(match.tournament_id) > 0
}

export default function MatchesCalendar({
  fixtures,
  onOpenMatch,
  refreshing,
  onRefresh,
  onScrollBeginDrag,
  contentContainerStyle,
  scoresheetPathname = '/Match',
}: Props) {
  const {t, i18n} = useTranslation()
  const {state} = useLeagueContext()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const locale = i18n.language?.startsWith('th') ? 'th' : 'en'
  const screenBg = isDark ? '#1A1A1A' : '#F5F5F5'
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF'
  const textColor = isDark ? '#F8FAFC' : '#111827'
  const mutedColor = isDark ? '#94A3B8' : '#64748B'
  const gridBorder = isDark ? '#2A2A2A' : '#E5E7EB'
  const isRegular = useIsRegularLayout()
  const {width, height} = useWindowDimensions()
  // Duo open landscape (and other regular-width landscape): calendar | matches.
  const useSplit = isRegular && width > height

  const {byDay, unscheduled} = React.useMemo(
    () => groupFixtures(fixtures),
    [fixtures],
  )
  const [selectedKey, setSelectedKey] = React.useState(
    () => initialFocus(fixtures).selectedKey,
  )
  const [visibleMonth, setVisibleMonth] = React.useState(
    () => initialFocus(fixtures).visibleMonth,
  )
  const userPickedRef = React.useRef(false)
  const compactScrollRef = React.useRef<ScrollView>(null)
  const detailScrollRef = React.useRef<ScrollView>(null)
  const matchesOffsetY = React.useRef(0)
  const pendingScrollRef = React.useRef(false)

  const scrollMatchesIntoView = React.useCallback(() => {
    pendingScrollRef.current = true
    const run = () => {
      if (!pendingScrollRef.current) return
      pendingScrollRef.current = false
      if (useSplit) {
        detailScrollRef.current?.scrollTo({y: 0, animated: true})
        return
      }
      compactScrollRef.current?.scrollTo({
        y: Math.max(0, matchesOffsetY.current),
        animated: true,
      })
    }
    // Defer so month-grid height / day cards can relayout first.
    requestAnimationFrame(() => {
      setTimeout(run, 32)
    })
  }, [useSplit])

  // Fixtures often load after mount — auto-select next upcoming (until the user picks a day).
  React.useEffect(() => {
    if (fixtures.length === 0) return
    const focus = initialFocus(fixtures)
    const grouped = groupFixtures(fixtures)
    setSelectedKey(prev => {
      if (!userPickedRef.current) return focus.selectedKey
      if (!grouped.byDay.has(prev)) {
        userPickedRef.current = false
        return focus.selectedKey
      }
      return prev
    })
    if (!userPickedRef.current) {
      setVisibleMonth(focus.visibleMonth)
    }
  }, [fixtures])

  const days = React.useMemo(
    () => monthGrid(visibleMonth),
    [visibleMonth],
  )
  /** Week rows of 7 — avoids flexWrap + floor(width/7) rounding that drops a column. */
  const weeks = React.useMemo(() => {
    const rows: DateTime[][] = []
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7))
    }
    return rows
  }, [days])
  const weekdayLabels = React.useMemo(() => {
    const sunday = DateTime.fromObject(
      {year: 2024, month: 1, day: 7},
      {zone: BANGKOK_ZONE},
    ).setLocale(locale)
    return Array.from({length: 7}, (_, i) =>
      sunday.plus({days: i}).toFormat('ccc'),
    )
  }, [locale])

  const selectedMatches = byDay.get(selectedKey) ?? []
  const selectedLabel = React.useMemo(() => {
    const dt = DateTime.fromISO(selectedKey, {zone: BANGKOK_ZONE}).setLocale(
      locale,
    )
    return dt.isValid ? dt.toLocaleString(DateTime.DATE_HUGE) : selectedKey
  }, [locale, selectedKey])

  const monthCount = React.useMemo(() => {
    const prefix = visibleMonth.toFormat('yyyy-MM')
    let count = 0
    for (const [key, items] of byDay) {
      if (key.startsWith(prefix)) count += items.length
    }
    return count
  }, [byDay, visibleMonth])

  function selectDay(day: DateTime) {
    userPickedRef.current = true
    setSelectedKey(day.toFormat('yyyy-MM-dd'))
    if (!day.hasSame(visibleMonth, 'month')) {
      setVisibleMonth(day.startOf('month'))
    }
    scrollMatchesIntoView()
  }

  function goToToday() {
    userPickedRef.current = true
    const now = nowInBangkok()
    setVisibleMonth(now.startOf('month'))
    setSelectedKey(now.toFormat('yyyy-MM-dd'))
    scrollMatchesIntoView()
  }

  const todayKey = nowInBangkok().toFormat('yyyy-MM-dd')

  const monthHeader = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
      }}>
      <View style={{flex: 1, minWidth: 0}}>
        <Text className="text-xl font-bold" style={{color: textColor}}>
          {visibleMonth.setLocale(locale).toFormat('LLLL yyyy')}
        </Text>
        <Text style={{color: mutedColor, marginTop: 2}}>
          {monthCount} {monthCount === 1 ? t('match') : t('matches')}
        </Text>
      </View>
      <NavButton
        icon="chevron-left"
        label={t('previous_month')}
        isDark={isDark}
        onPress={() => setVisibleMonth(month => month.minus({months: 1}))}
      />
      <Pressable
        accessibilityRole="button"
        onPress={goToToday}
        style={({pressed}) => ({
          backgroundColor: pressed ? '#2A002E' : ACCENT,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
        })}>
        <Text className="font-semibold" style={{color: '#FFFFFF'}}>
          {t('today')}
        </Text>
      </Pressable>
      <NavButton
        icon="chevron-right"
        label={t('next_month')}
        isDark={isDark}
        onPress={() => setVisibleMonth(month => month.plus({months: 1}))}
      />
    </View>
  )

  const monthGridView = (
    <View
      style={{
        backgroundColor: cardBg,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: isDark ? 0 : 1,
        borderColor: gridBorder,
      }}>
      <View style={{flexDirection: 'row'}}>
        {weekdayLabels.map(label => (
          <View
            key={label}
            style={{
              flex: 1,
              minWidth: 0,
              paddingVertical: 8,
            }}>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 12,
                fontWeight: '600',
                color: mutedColor,
              }}>
              {label}
            </Text>
          </View>
        ))}
      </View>
      {weeks.map((week, weekIndex) => (
        <View key={`week-${weekIndex}`} style={{flexDirection: 'row'}}>
          {week.map(day => {
            const key = day.toFormat('yyyy-MM-dd')
            const items = byDay.get(key) ?? []
            const inMonth = day.hasSame(visibleMonth, 'month')
            const selected = key === selectedKey
            const isToday = key === todayKey
            const hasCup = items.some(item => isCup(item.match))
            const count = items.length
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{selected}}
                accessibilityLabel={`${day.setLocale(locale).toLocaleString(DateTime.DATE_MED)}, ${count} ${count === 1 ? t('match') : t('matches')}`}
                onPress={() => selectDay(day)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  aspectRatio: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTopWidth: 1,
                  borderTopColor: gridBorder,
                  backgroundColor: selected
                    ? ACCENT
                    : count > 0
                      ? isDark
                        ? '#2A1230'
                        : '#F6EEF7'
                      : 'transparent',
                  opacity: inMonth ? 1 : 0.38,
                }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: isToday || selected ? '700' : '500',
                    color: selected
                      ? '#FFFFFF'
                      : isToday
                        ? isDark
                          ? '#F0ABFC'
                          : ACCENT
                        : textColor,
                  }}>
                  {day.day}
                </Text>
                {count > 0 ? (
                  <View
                    style={{
                      marginTop: 2,
                      minWidth: 18,
                      paddingHorizontal: 4,
                      borderRadius: 999,
                      backgroundColor: selected
                        ? 'rgba(255,255,255,0.22)'
                        : ACCENT,
                      alignItems: 'center',
                    }}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: '#FFFFFF',
                      }}>
                      {count > 9 ? '9+' : String(count)}
                    </Text>
                  </View>
                ) : (
                  <View style={{height: 14, marginTop: 2}} />
                )}
                {hasCup ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#F59E0B',
                    }}
                  />
                ) : null}
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )

  const dayMatchesList = (
    <View
      collapsable={false}
      onLayout={event => {
        matchesOffsetY.current = event.nativeEvent.layout.y
        if (pendingScrollRef.current) {
          pendingScrollRef.current = false
          if (useSplit) {
            detailScrollRef.current?.scrollTo({y: 0, animated: true})
          } else {
            compactScrollRef.current?.scrollTo({
              y: Math.max(0, matchesOffsetY.current),
              animated: true,
            })
          }
        }
      }}>
      <Text
        className="font-bold"
        style={{
          color: textColor,
          marginTop: useSplit ? 0 : 18,
          marginBottom: 8,
          paddingHorizontal: useSplit ? 16 : 0,
        }}>
        {selectedLabel}
      </Text>
      {selectedMatches.length === 0 ? (
        <Text
          style={{
            color: mutedColor,
            marginBottom: 12,
            paddingHorizontal: useSplit ? 16 : 0,
          }}>
          {t('no_matches_on_day')}
        </Text>
      ) : null}
      {selectedMatches.map(item => (
        <DayMatchCard
          key={`${item.index}-${item.match.home_team_id}-${item.match.away_team_id}`}
          match={item.match}
          index={item.index}
          isNewMatchCard={state.isNewMatchCard}
          onOpenMatch={onOpenMatch}
          scoresheetPathname={scoresheetPathname}
        />
      ))}
      {unscheduled.length > 0 ? (
        <View style={{marginTop: 8}}>
          <Text
            className="font-bold"
            style={{
              color: textColor,
              marginBottom: 8,
              paddingHorizontal: 16,
            }}>
            {t('unscheduled_matches')}
          </Text>
          {unscheduled.map(item => (
            <DayMatchCard
              key={`unscheduled-${item.index}`}
              match={item.match}
              index={item.index}
              isNewMatchCard={state.isNewMatchCard}
              onOpenMatch={onOpenMatch}
              scoresheetPathname={scoresheetPathname}
            />
          ))}
        </View>
      ) : null}
    </View>
  )

  if (useSplit) {
    return (
      <AdaptiveSplit
        split
        keepEmptyDetail={false}
        listWidth={400}
        list={
          <ScrollView
            style={{flex: 1, backgroundColor: screenBg}}
            contentContainerStyle={{padding: 16, paddingBottom: 24}}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={onScrollBeginDrag}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {monthHeader}
            {monthGridView}
          </ScrollView>
        }
        detail={
          <ScrollView
            ref={detailScrollRef}
            style={{flex: 1, backgroundColor: screenBg}}
            contentContainerStyle={[
              {paddingTop: 16, paddingBottom: 24},
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={onScrollBeginDrag}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            {dayMatchesList}
          </ScrollView>
        }
      />
    )
  }

  return (
    <ScrollView
      ref={compactScrollRef}
      style={{flex: 1, backgroundColor: screenBg}}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      onScrollBeginDrag={onScrollBeginDrag}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={{paddingHorizontal: 16}}>
        {monthHeader}
        {monthGridView}
      </View>
      {dayMatchesList}
    </ScrollView>
  )
}

function NavButton({
  icon,
  label,
  isDark,
  onPress,
}: {
  icon: 'chevron-left' | 'chevron-right'
  label: string
  isDark: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({pressed}) => ({
        backgroundColor: isDark
          ? pressed
            ? '#2A2A2A'
            : '#1E1E1E'
          : pressed
            ? '#E5E7EB'
            : '#FFFFFF',
        borderRadius: 8,
        padding: 8,
        borderWidth: isDark ? 0 : 1,
        borderColor: '#E5E7EB',
      })}>
      <MaterialIcons
        name={icon}
        size={22}
        color={isDark ? '#FFFFFF' : ACCENT}
      />
    </Pressable>
  )
}

function DayMatchCard({
  match,
  index,
  isNewMatchCard,
  onOpenMatch,
  scoresheetPathname,
}: {
  match: CalendarFixture
  index: number
  isNewMatchCard: boolean
  onOpenMatch: (index: number) => void
  scoresheetPathname: string
}) {
  const matchInfo = match as MatchInfoDataType
  if (isNewMatchCard) {
    return (
      <MatchCard
        matchInfo={matchInfo}
        idx={index}
        handlePress={onOpenMatch}
        embedded
        scoresheetPathname={scoresheetPathname}
      />
    )
  }
  return (
    <MatchCardOld
      matchInfo={matchInfo}
      idx={index}
      handlePress={onOpenMatch}
      scoresheetPathname={scoresheetPathname}
    />
  )
}
