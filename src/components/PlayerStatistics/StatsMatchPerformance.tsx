import {Surface, useStatColors, winRateColor} from '@/components/PlayerStatistics/statUi'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {formatBangkokDateMed} from '@/lib/bangkokTime'
import {usePathname, useRouter} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {Pressable, Text as RNText, View as RNView} from 'react-native'

type StatType = {
  date: string
  matchId: number
  singlesWon: number
  singlesPlayed: number
  doublesWon: number
  doublesPlayed: number
}

const StatsMatchPerformance = ({
  stats,
  path,
  variant = 'table',
}: {
  stats: StatType[]
  path: string | undefined
  variant?: 'table' | 'cards'
}) => {
  const router = useRouter()
  const currentPath = usePathname()
  const {t} = useTranslation()
  const colors = useStatColors()
  
  // Determine the correct Match route path
  const getMatchPath = () => {
    // If path prop is provided, use it
    if (path) {
      return `${path}/Match`
    }
    
    // Otherwise, derive from current pathname
    if (currentPath.endsWith('/Player')) {
      // For statistics routes, handle special cases
      if (currentPath.includes('/statistics/')) {
        // Routes that have their own Match subdirectory
        if (currentPath.includes('/PlayerStatistics/Player')) {
          return '/statistics/PlayerStatistics/Match'
        }
        if (currentPath.includes('/TeamStatistics/Player')) {
          return '/statistics/TeamStatistics/Match'
        }
        if (currentPath.includes('/LeagueStandings/Player')) {
          return '/statistics/LeagueStandings/Match'
        }
        
        // Routes without Match subdirectory (like PlayerRankings) fall back to base
        return '/statistics/Match'
      }
      
      // For non-statistics routes, try replacing /Player with /Match
      return currentPath.replace('/Player', '/Match')
    }
    
    // Fallback: append /Match to current path
    return `${currentPath}/Match`
  }

  if (variant === 'cards') {
    return (
      <>
        {stats.map((stat: StatType, index: number) => {
          const played = stat.singlesPlayed + stat.doublesPlayed
          const won = stat.singlesWon + stat.doublesWon
          const tone =
            played === 0 ? colors.muted : winRateColor((won / played) * 100)
          return (
            <Pressable
              key={stat.matchId + '_' + index}
              onPress={() => {
                router.push({
                  pathname: getMatchPath() as any,
                  params: {params: JSON.stringify({matchId: stat.matchId})},
                } as any)
              }}
              style={({pressed}) => ({opacity: pressed ? 0.75 : 1})}>
              <Surface
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  marginBottom: 8,
                  borderLeftWidth: 4,
                  borderLeftColor: tone,
                }}>
                <Text type="link">{formatBangkokDateMed(stat.date)}</Text>
                <RNView style={{flexDirection: 'row', marginTop: 8}}>
                  <RNView style={{flex: 1}}>
                    <RNText style={{fontSize: 12, color: colors.muted}}>
                      {t('singles')}
                    </RNText>
                    <RNText
                      style={{
                        marginTop: 2,
                        fontSize: 16,
                        fontWeight: '700',
                        color: colors.text,
                      }}>
                      {stat.singlesWon}/{stat.singlesPlayed}
                    </RNText>
                  </RNView>
                  <RNView style={{flex: 1}}>
                    <RNText style={{fontSize: 12, color: colors.muted}}>
                      {t('doubles')}
                    </RNText>
                    <RNText
                      style={{
                        marginTop: 2,
                        fontSize: 16,
                        fontWeight: '700',
                        color: colors.text,
                      }}>
                      {stat.doublesWon}/{stat.doublesPlayed}
                    </RNText>
                  </RNView>
                </RNView>
              </Surface>
            </Pressable>
          )
        })}
      </>
    )
  }

  return (
    <View>
      {stats.map((stat: StatType, index: number) => {
        return (
          <View className="flex-row items-center" key={stat.date + '_' + index}>
            <View flex={3}>
              <Pressable
                style={{paddingVertical: 5}}
                onPress={() => {
                  const targetPath = getMatchPath()
                  console.log('Navigating to:', targetPath, 'with matchId:', stat.matchId)
                  router.push({
                    pathname: targetPath as any,
                    params: {params: JSON.stringify({matchId: stat.matchId})}
                  } as any)
                }}>
                <Text type="link">
                  {formatBangkokDateMed(stat.date)}
                </Text>
              </Pressable>
            </View>
            <View flex={2} className="items-center">
              <Text>
                {stat.singlesWon}/{stat.singlesPlayed}
              </Text>
            </View>
            <View flex={3} className="items-end">
              <Text>
                {stat.doublesWon}/{stat.doublesPlayed}
              </Text>
            </View>
          </View>
        )
      })}
    </View>
  )
}

export default StatsMatchPerformance
