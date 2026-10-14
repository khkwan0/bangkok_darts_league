import {ThemedText as Text} from '@/components/ThemedText'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  usePredictions,
  type PredictedSide,
  type PredictionMatchPayload,
} from '@/hooks/usePredictions'
import {Ionicons} from '@expo/vector-icons'
import {
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from 'expo-router'
import {useTheme} from 'expo-router/react-navigation'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  useColorScheme,
  View,
} from 'react-native'

export default function MatchPredictionsScreen() {
  const {t} = useTranslation()
  const {colors} = useTheme()
  const navigation = useNavigation()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const params = useLocalSearchParams<{matchId?: string}>()
  const matchId = Number(params.matchId)
  const {state} = useLeagueContext()
  const predictions = usePredictions()

  const [payload, setPayload] = React.useState<PredictionMatchPayload | null>(
    null,
  )
  const [loading, setLoading] = React.useState(true)
  const [side, setSide] = React.useState<PredictedSide>('home')
  const [margin, setMargin] = React.useState(1)
  const [submitting, setSubmitting] = React.useState(false)

  const muted = isDark ? 'rgba(226,232,240,0.65)' : 'rgba(51,65,85,0.7)'
  const cardBg = isDark ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.95)'
  const border = isDark ? 'rgba(148,163,184,0.25)' : 'rgba(15,23,42,0.08)'
  const accent = colors.primary

  const load = React.useCallback(async () => {
    if (!matchId) return
    setLoading(true)
    try {
      const res = await predictions.getMatch(matchId)
      if (res.ok && res.data) {
        setPayload(res.data)
        if (res.data.prediction) {
          setSide(res.data.prediction.predicted_side)
          setMargin(res.data.prediction.predicted_margin)
        } else {
          setSide('home')
          setMargin(1)
        }
      } else {
        setPayload(null)
      }
    } finally {
      setLoading(false)
    }
  }, [matchId, predictions.getMatch])

  React.useEffect(() => {
    void load()
  }, [load])

  const matchup = payload?.matchup
  React.useEffect(() => {
    const title = matchup
      ? `${matchup.home_team_short_name} vs ${matchup.away_team_short_name}`
      : t('predictions_title')
    navigation.setOptions({
      title,
      headerBackTitle: t('back'),
    })
  }, [navigation, matchup, t])

  const maxMargin = Math.max(1, Number(payload?.max_margin ?? 1))
  const windowOpen = payload?.window_status === 'open'
  const canEdit = windowOpen && (!payload?.prediction || payload.prediction.status === 'open')

  const submit = async () => {
    if (!matchId || !canEdit) return
    setSubmitting(true)
    try {
      const res = await predictions.upsert({
        matchId,
        predictedSide: side,
        predictedMargin: margin,
      })
      if (res.ok) {
        Alert.alert(t('predictions_saved'))
        await load()
      } else {
        Alert.alert(
          t('predictions_save_failed'),
          t(res.error, {defaultValue: res.error}),
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!state.predictionsEnabled) {
    return (
      <View style={{flex: 1, padding: 20, justifyContent: 'center'}}>
        <Text style={{textAlign: 'center', color: muted}}>
          {t('predictions_disabled_body')}
        </Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator color={accent} />
      </View>
    )
  }

  if (!payload || !matchup) {
    return (
      <View style={{flex: 1, padding: 20, justifyContent: 'center'}}>
        <Text style={{textAlign: 'center', color: muted}}>
          {t('predictions_load_failed')}
        </Text>
      </View>
    )
  }

  const tip = payload.prediction
  const statusLabel = tip
    ? t(`predictions_status_${tip.status}`, {
        defaultValue: tip.status,
      })
    : windowOpen
      ? t('predictions_status_open')
      : t(`predictions_window_${payload.window_status}`, {
          defaultValue: payload.window_status,
        })

  return (
    <ScrollView
      style={{flex: 1}}
      contentContainerStyle={{padding: 16, paddingBottom: 40}}>
      <View
        style={{
          backgroundColor: cardBg,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: border,
          padding: 16,
          marginBottom: 16,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
          <TeamBadge
            name={matchup.home_team_short_name}
            logo={matchup.home_logo}
            muted={muted}
            colors={colors}
          />
          <Text style={{fontWeight: '800', color: muted}}>VS</Text>
          <TeamBadge
            name={matchup.away_team_short_name}
            logo={matchup.away_logo}
            muted={muted}
            colors={colors}
          />
        </View>
        {matchup.home && matchup.away ? (
          <View style={{marginTop: 16}}>
            <StatRow
              label={t('betting_stat_record')}
              homeVal={`${matchup.home.wins}-${matchup.home.losses}-${matchup.home.ties}`}
              awayVal={`${matchup.away.wins}-${matchup.away.losses}-${matchup.away.ties}`}
              colors={colors}
              muted={muted}
              border={border}
            />
            <StatRow
              label={t('betting_stat_for')}
              homeVal={String(matchup.home.frames_for)}
              awayVal={String(matchup.away.frames_for)}
              colors={colors}
              muted={muted}
              border={border}
            />
            <StatRow
              label={t('betting_stat_against')}
              homeVal={String(matchup.home.frames_against)}
              awayVal={String(matchup.away.frames_against)}
              colors={colors}
              muted={muted}
              border={border}
            />
          </View>
        ) : null}
        <Text style={{marginTop: 12, color: muted, fontSize: 13}}>
          {t('predictions_scoring_help')}
        </Text>
        <Text style={{marginTop: 6, color: muted, fontSize: 13}}>
          {t('predictions_status_label')}: {statusLabel}
          {tip && tip.status === 'scored'
            ? ` · ${t('predictions_points', {count: tip.points})}`
            : ''}
        </Text>
        {payload.home_frames != null && payload.away_frames != null ? (
          <Text style={{marginTop: 4, color: muted, fontSize: 13}}>
            {t('predictions_final_score', {
              home: payload.home_frames,
              away: payload.away_frames,
            })}
          </Text>
        ) : null}
      </View>

      <Text
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: colors.text,
          marginBottom: 10,
        }}>
        {t('predictions_pick_winner')}
      </Text>
      <View style={{flexDirection: 'row', gap: 10, marginBottom: 20}}>
        {(['home', 'away'] as PredictedSide[]).map(key => {
          const active = side === key
          const label =
            key === 'home'
              ? matchup.home_team_short_name
              : matchup.away_team_short_name
          return (
            <Pressable
              key={key}
              disabled={!canEdit}
              onPress={() => setSide(key)}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: active ? accent : border,
                backgroundColor: active ? accent : cardBg,
                alignItems: 'center',
                opacity: canEdit ? 1 : 0.7,
              }}>
              <Text
                style={{
                  fontWeight: '800',
                  color: active ? '#fff' : colors.text,
                }}>
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <Text
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: colors.text,
          marginBottom: 10,
        }}>
        {t('predictions_pick_margin')}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          marginBottom: 12,
        }}>
        <Pressable
          disabled={!canEdit || margin <= 1}
          onPress={() => setMargin(m => Math.max(1, m - 1))}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !canEdit || margin <= 1 ? 0.4 : 1,
          }}>
          <Ionicons name="remove" size={24} color={colors.text} />
        </Pressable>
        <View style={{alignItems: 'center', minWidth: 80}}>
          <Text style={{fontSize: 32, fontWeight: '800', color: colors.text}}>
            {margin}
          </Text>
          <Text style={{fontSize: 12, color: muted}}>
            {t('predictions_frames')}
          </Text>
        </View>
        <Pressable
          disabled={!canEdit || margin >= maxMargin}
          onPress={() => setMargin(m => Math.min(maxMargin, m + 1))}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: cardBg,
            borderWidth: 1,
            borderColor: border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: !canEdit || margin >= maxMargin ? 0.4 : 1,
          }}>
          <Ionicons name="add" size={24} color={colors.text} />
        </Pressable>
      </View>
      <Text
        style={{
          textAlign: 'center',
          color: muted,
          fontSize: 12,
          marginBottom: 24,
        }}>
        {t('predictions_margin_range', {max: maxMargin})}
      </Text>

      {canEdit ? (
        <Pressable
          disabled={submitting}
          onPress={() => void submit()}
          style={{
            backgroundColor: accent,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
            opacity: submitting ? 0.7 : 1,
          }}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{color: '#fff', fontWeight: '800', fontSize: 16}}>
              {tip ? t('predictions_update') : t('predictions_submit')}
            </Text>
          )}
        </Pressable>
      ) : (
        <Text style={{textAlign: 'center', color: muted}}>
          {t('predictions_locked_body')}
        </Text>
      )}

      <Pressable
        onPress={() => router.push('/Settings/Predictions')}
        style={{
          marginTop: 16,
          paddingVertical: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: border,
          backgroundColor: cardBg,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
        }}>
        <Ionicons name="trophy-outline" size={18} color={accent} />
        <Text style={{color: colors.text, fontWeight: '700', fontSize: 15}}>
          {t('predictions_settings')}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={muted} />
      </Pressable>
    </ScrollView>
  )
}

function StatRow({
  label,
  homeVal,
  awayVal,
  colors,
  muted,
  border,
}: {
  label: string
  homeVal: string
  awayVal: string
  colors: {text: string}
  muted: string
  border: string
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: border,
      }}>
      <Text
        style={{
          flex: 1,
          textAlign: 'center',
          fontWeight: '700',
          color: colors.text,
        }}>
        {homeVal}
      </Text>
      <Text style={{width: 88, textAlign: 'center', fontSize: 12, color: muted}}>
        {label}
      </Text>
      <Text
        style={{
          flex: 1,
          textAlign: 'center',
          fontWeight: '700',
          color: colors.text,
        }}>
        {awayVal}
      </Text>
    </View>
  )
}

function TeamBadge({
  name,
  logo,
  muted,
  colors,
}: {
  name: string
  logo: string | null
  muted: string
  colors: {text: string}
}) {
  return (
    <View style={{flex: 1, alignItems: 'center', gap: 8}}>
      {logo ? (
        <Image
          source={{uri: logo}}
          style={{width: 48, height: 48, borderRadius: 8}}
        />
      ) : (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            backgroundColor: 'rgba(148,163,184,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text style={{fontWeight: '800', color: muted}}>
            {String(name || '?').slice(0, 2).toUpperCase()}
          </Text>
        </View>
      )}
      <Text
        style={{fontWeight: '700', color: colors.text, textAlign: 'center'}}
        numberOfLines={2}>
        {name}
      </Text>
    </View>
  )
}
