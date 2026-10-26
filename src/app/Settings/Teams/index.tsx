import {AdaptiveSplit} from '@/components/layout/AdaptiveSplit'
import {EmptySplitDetail} from '@/components/layout/EmptySplitDetail'
import TeamList from '@/components/Teams'
import TeamMembers from '@/components/Teams/Team'
import {useSettingsSplitLayout} from '@/hooks/useSettingsSplitLayout'
import {useNavigation} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'

export default function TeamsHome() {
  const navigation = useNavigation()
  const {t} = useTranslation()
  const isSplit = useSettingsSplitLayout()
  const [selected, setSelected] = React.useState<{
    teamId: number
    seasonId: number | null
  } | null>(null)

  React.useEffect(() => {
    navigation.setOptions({
      title: t('teams'),
    })
  }, [navigation, t])

  const handleSelectTeam = React.useCallback(
    (teamId: number, seasonId: number | null) => {
      setSelected({teamId, seasonId})
    },
    [],
  )

  if (!isSplit) {
    return <TeamList />
  }

  return (
    <AdaptiveSplit
      split
      listWidth={320}
      list={
        <TeamList
          onSelectTeam={handleSelectTeam}
          selectedTeamId={selected?.teamId ?? null}
        />
      }
      detail={
        selected != null ? (
          <TeamMembers
            key={`${selected.teamId}-${selected.seasonId ?? 'current'}`}
            teamId={selected.teamId}
            seasonId={selected.seasonId}
          />
        ) : null
      }
      emptyDetail={<EmptySplitDetail message={t('select_a_team')} />}
    />
  )
}
