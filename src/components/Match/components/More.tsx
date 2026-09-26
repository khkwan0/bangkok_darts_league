import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {router} from 'expo-router'
import {useTranslation} from 'react-i18next'
import {Pressable, Text} from 'react-native'
import {useScoresheetTheme} from './scoresheetTheme'

export default function More({matchId}: {matchId: number}) {
  const {t} = useTranslation()
  const theme = useScoresheetTheme()

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/Match/History',
          params: {params: JSON.stringify({match_id: matchId})},
        })
      }
      style={{
        marginHorizontal: 12,
        marginTop: 10,
        marginBottom: 8,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        backgroundColor: theme.card,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}>
      <MCI name="history" size={18} color={theme.muted} />
      <Text style={{color: theme.text, fontSize: 15, fontWeight: '700'}}>
        {t('more')}
      </Text>
      <MCI name="chevron-right" size={18} color={theme.muted} />
    </Pressable>
  )
}
