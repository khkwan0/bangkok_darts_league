import {
  useScoresheetTheme,
  type SidePalette,
} from '@/components/Match/components/scoresheetTheme'
import {useMatch} from '@/hooks'
import {formatBangkokDateMed} from '@/lib/bangkokTime'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useNavigation, useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {FlatList, Pressable, Text, View} from 'react-native'

type Frame = {
  frameId: number
  homePlayers: {nickName: string; playerId: number}[]
  awayPlayers: {nickName: string; playerId: number}[]
  homeWin: number
}

type MatchDetails = Frame[]

type MatchMetadata = {
  matchDate: string
  home_team_id: number
  away_team_id: number
  home_team_name: string
  away_team_name: string
  home_frames: number
  away_frames: number
  first_break_home_team: number
}

function CompletedSide({
  players,
  won,
  dim,
  pressed,
  onPressIn,
  onPressOut,
  align,
  palette,
  winColor,
  onOpenPlayer,
}: {
  players: Frame['homePlayers']
  won: boolean
  dim: boolean
  pressed: boolean
  onPressIn: () => void
  onPressOut: () => void
  align: 'left' | 'right'
  palette: SidePalette
  winColor: string
  onOpenPlayer: (playerId: number) => void
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 10,
        backgroundColor: won ? palette.panelWinner : palette.panel,
        borderWidth: won ? 1.5 : 1,
        borderColor: won ? palette.accent : palette.border,
        opacity: dim && !won ? 0.72 : 1,
        justifyContent: 'space-between',
      }}>
      <View
        style={{
          alignItems: align === 'left' ? 'flex-start' : 'flex-end',
          gap: 4,
        }}>
        {players.map((player, idx) => (
          <Pressable
            key={`${player.playerId}-${idx}`}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            onPress={() => onOpenPlayer(player.playerId)}
            style={{opacity: pressed ? 0.55 : 1}}>
            <Text
              style={{
                color: palette.ink,
                fontSize: 16,
                fontWeight: '800',
                textAlign: align === 'left' ? 'left' : 'right',
              }}>
              {player.nickName}
            </Text>
          </Pressable>
        ))}
      </View>
      {won ? (
        <View
          style={{
            marginTop: 8,
            alignSelf: 'stretch',
            minHeight: 32,
            borderRadius: 10,
            backgroundColor: winColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <MCI name="check" size={18} color="#FFFFFF" />
        </View>
      ) : null}
    </View>
  )
}

function FrameRow({frame, index}: {frame: Frame; index: number}) {
  const {t} = useTranslation()
  const router = useRouter()
  const theme = useScoresheetTheme()
  const [homePressed, setHomePressed] = React.useState(false)
  const [awayPressed, setAwayPressed] = React.useState(false)
  const homeWon = frame.homeWin === 1
  const awayWon = frame.homeWin === 0

  function openPlayer(playerId: number) {
    router.replace({
      pathname: './Player',
      params: {
        params: JSON.stringify({playerId}),
      },
    })
  }

  return (
    <View
      style={[
        {
          borderRadius: 18,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.cardBorder,
          paddingBottom: 10,
        },
        theme.shadow,
      ]}>
      <Text
        style={{
          color: theme.muted,
          fontSize: 12,
          fontWeight: '800',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 8,
        }}>
        {t('frame')} {index + 1}
      </Text>
      <View style={{flexDirection: 'row', gap: 8, paddingHorizontal: 10}}>
        <CompletedSide
          players={frame.homePlayers}
          won={homeWon}
          dim={homeWon || awayWon}
          pressed={homePressed}
          onPressIn={() => setHomePressed(true)}
          onPressOut={() => setHomePressed(false)}
          align="left"
          palette={theme.home}
          winColor={theme.win}
          onOpenPlayer={openPlayer}
        />
        <CompletedSide
          players={frame.awayPlayers}
          won={awayWon}
          dim={homeWon || awayWon}
          pressed={awayPressed}
          onPressIn={() => setAwayPressed(true)}
          onPressOut={() => setAwayPressed(false)}
          align="right"
          palette={theme.away}
          winColor={theme.win}
          onOpenPlayer={openPlayer}
        />
      </View>
    </View>
  )
}

export default function CompletedMatchDetails({matchId}: {matchId: number}) {
  const matchHook = useMatch()
  const [matchDetails, setMatchDetails] = React.useState<MatchDetails | null>(
    null,
  )
  const [loading, setLoading] = React.useState(true)
  const navigation = useNavigation()
  const [matchMetadata, setMatchMetadata] =
    React.useState<MatchMetadata | null>(null)
  const [homePressed, setHomePressed] = React.useState(false)
  const [awayPressed, setAwayPressed] = React.useState(false)
  const router = useRouter()
  const theme = useScoresheetTheme()
  const {t} = useTranslation()

  React.useEffect(() => {
    async function getMatchDetails(matchId: number) {
      try {
        const res = await matchHook.GetMatchDetails(matchId)
        setMatchDetails(res.data)
        const res2 = await matchHook.GetMatchMetadata(matchId)
        setMatchMetadata(res2.data)
      } catch (error) {
        console.error('Failed to fetch match details:', error)
      } finally {
        setLoading(false)
      }
    }

    if (matchId) {
      getMatchDetails(matchId)
    }
  }, [matchId])

  React.useEffect(() => {
    navigation.setOptions({
      title: `Match #${matchId}`,
    })
  }, [matchId])

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.canvas,
        }}>
        <Text style={{color: theme.muted}}>Loading...</Text>
      </View>
    )
  }

  if (!matchDetails) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.canvas,
        }}>
        <Text style={{color: theme.text}}>Match not found</Text>
      </View>
    )
  }

  const homeFrames = matchMetadata?.home_frames ?? 0
  const awayFrames = matchMetadata?.away_frames ?? 0
  const tied = homeFrames === awayFrames
  const total = homeFrames + awayFrames

  return (
    <View style={{flex: 1, backgroundColor: theme.canvas}}>
      <View
        style={[
          {
            marginHorizontal: 12,
            marginTop: 12,
            marginBottom: 8,
            borderRadius: 18,
          },
          theme.shadow,
        ]}>
        <View
          style={{
            borderRadius: 18,
            overflow: 'hidden',
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.cardBorder,
            paddingBottom: 16,
          }}>
        <View style={{flexDirection: 'row', height: 4}}>
          <View style={{flex: 1, backgroundColor: theme.home.accent}} />
          <View style={{flex: 1, backgroundColor: theme.away.accent}} />
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 14,
          }}>
          <Text style={{color: theme.muted, fontSize: 13, fontWeight: '700'}}>
            Match #{matchId}
          </Text>
          {typeof matchMetadata?.matchDate === 'string' && (
            <Text style={{color: theme.muted, fontSize: 13, fontWeight: '600'}}>
              {formatBangkokDateMed(matchMetadata.matchDate)}
            </Text>
          )}
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            paddingHorizontal: 12,
            paddingTop: 14,
          }}>
          <Pressable
            style={{flex: 1, alignItems: 'center', opacity: homePressed ? 0.55 : 1}}
            onPressIn={() => setHomePressed(true)}
            onPressOut={() => setHomePressed(false)}
            onPress={() => {
              router.push({
                pathname: '/Completed/Match/Team',
                params: {
                  params: JSON.stringify({teamId: matchMetadata?.home_team_id}),
                },
              })
            }}>
            <Text
              numberOfLines={2}
              style={{
                textAlign: 'center',
                color: theme.text,
                fontSize: 18,
                fontWeight: '800',
              }}>
              {matchMetadata?.home_team_name}
            </Text>
            <View
              style={{
                marginTop: 8,
                width: 36,
                height: 3,
                borderRadius: 2,
                backgroundColor: theme.home.accent,
              }}
            />
          </Pressable>
          <View style={{width: 44, alignItems: 'center', paddingTop: 4}}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: theme.faint,
              }}>
              <Text
                style={{
                  color: theme.muted,
                  fontSize: 11,
                  fontWeight: '800',
                  letterSpacing: 1,
                }}>
                VS
              </Text>
            </View>
          </View>
          <Pressable
            style={{flex: 1, alignItems: 'center', opacity: awayPressed ? 0.55 : 1}}
            onPressIn={() => setAwayPressed(true)}
            onPressOut={() => setAwayPressed(false)}
            onPress={() => {
              router.push({
                pathname: '/Completed/Match/Team',
                params: {
                  params: JSON.stringify({teamId: matchMetadata?.away_team_id}),
                },
              })
            }}>
            <Text
              numberOfLines={2}
              style={{
                textAlign: 'center',
                color: theme.text,
                fontSize: 18,
                fontWeight: '800',
              }}>
              {matchMetadata?.away_team_name}
            </Text>
            <View
              style={{
                marginTop: 8,
                width: 36,
                height: 3,
                borderRadius: 2,
                backgroundColor: theme.away.accent,
              }}
            />
          </Pressable>
        </View>
        <View style={{paddingHorizontal: 16, paddingTop: 12}}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 44,
                lineHeight: 48,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                color:
                  tied || homeFrames > awayFrames ? theme.home.accent : theme.muted,
              }}>
              {homeFrames}
            </Text>
            <Text
              style={{
                width: 28,
                textAlign: 'center',
                color: theme.muted,
                fontSize: 22,
                fontWeight: '600',
              }}>
              –
            </Text>
            <Text
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 44,
                lineHeight: 48,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                color:
                  tied || awayFrames > homeFrames ? theme.away.accent : theme.muted,
              }}>
              {awayFrames}
            </Text>
          </View>
          <View
            style={{
              marginTop: 8,
              height: 6,
              borderRadius: 999,
              overflow: 'hidden',
              flexDirection: 'row',
              backgroundColor: theme.faint,
            }}>
            {total === 0 ? (
              <View style={{flex: 1}} />
            ) : (
              <>
                {homeFrames > 0 && (
                  <View
                    style={{flex: homeFrames, backgroundColor: theme.home.accent}}
                  />
                )}
                {awayFrames > 0 && (
                  <View
                    style={{flex: awayFrames, backgroundColor: theme.away.accent}}
                  />
                )}
              </>
            )}
          </View>
        </View>
        {(matchMetadata?.first_break_home_team === 1 ||
          matchMetadata?.first_break_home_team === 0) && (
          <Text
            style={{
              textAlign: 'center',
              marginTop: 12,
              color: theme.muted,
              fontSize: 12,
              fontWeight: '700',
            }}>
            {t('first_break')}:{' '}
            {matchMetadata?.first_break_home_team === 1
              ? matchMetadata?.home_team_name
              : matchMetadata?.away_team_name}
          </Text>
        )}
        </View>
      </View>

      <FlatList
        style={{flex: 1}}
        contentContainerStyle={{paddingBottom: 24, paddingHorizontal: 12}}
        data={matchDetails}
        renderItem={({item, index}) => <FrameRow frame={item} index={index} />}
        ItemSeparatorComponent={() => <View style={{height: 8}} />}
        keyExtractor={item => item.frameId.toString()}
      />
    </View>
  )
}
