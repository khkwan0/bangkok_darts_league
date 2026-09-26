import Button from '@/components/Button'
import ConfirmDialog from '@/components/ConfirmDialog'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {useMatch} from '@/hooks/useMatch'
import {
  bangkokDefaultProposeTimeForPicker,
  bangkokMinimumPickerDate,
  formatBangkok,
  formatBangkokWeekdayDate,
  isoToPickerDate,
  nowInBangkok,
  pickerWallClockToBangkokIso,
} from '@/lib/bangkokTime'
import {
  formatPostponedProposalDisplay,
  getProposingTeamShortName,
  parsePostponedProposal,
} from '@/lib/postponedProposal'
import DateTimePicker from '@expo/ui/community/datetime-picker'
import {Ionicons} from '@expo/vector-icons'
import {useNavigation} from "expo-router/react-navigation"
import {router} from 'expo-router'
import React, {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {ActivityIndicator} from 'react-native'

export default function Postpone({matchInfo}: {matchInfo: any}) {
  const parsedMatchInfo =
    typeof matchInfo === 'string' ? JSON.parse(matchInfo) : matchInfo
  const postponedProposal = parsePostponedProposal(
    parsedMatchInfo.postponed_proposal,
  )
  const hasValidProposal = postponedProposal !== null
  const canConfirmOpponentProposal =
    hasValidProposal &&
    !!postponedProposal?.newDate &&
    ((postponedProposal.isHome &&
      parsedMatchInfo.player_team_id !== parsedMatchInfo.home_team_id) ||
      (!postponedProposal.isHome &&
        parsedMatchInfo.player_team_id === parsedMatchInfo.home_team_id))

  const {state, RefreshUpcoming} = useLeagueContext()
  const user = state.user
  const match = useMatch()
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [postponedDate, setPostponedDate] = useState(
    postponedProposal?.newDate
      ? isoToPickerDate(postponedProposal.newDate)
      : null,
  )
  const [dateSelected, setDateSelected] = useState(false)
  const [showConfirmPostponeDate, setShowConfirmPostponeDate] = useState(false)
  const [showConfirmPostponeIndefinitely, setShowConfirmPostponeIndefinitely] =
    useState(false)
  const [newDate, setNewDate] = useState<Date | null>(null)
  const [newDateBangkokIso, setNewDateBangkokIso] = useState<string | null>(
    null,
  )
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dialogSubmitting, setDialogSubmitting] = useState(false)
  const [error, setError] = useState('')
  const {t} = useTranslation()
  const navigation = useNavigation()

  function exitPostponeScreen() {
    if (router.canGoBack()) {
      router.back()
      return
    }
    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }
    router.dismissTo('/(tabs)/(index)')
  }

  const handleConfirmDatePostpone = async () => {
    setDialogSubmitting(true)
    try {
      setError('')
      const res = await match.ProposeRescheduleMatch({
        matchId: parsedMatchInfo.match_id,
        proposedData: {
          isHome:
            parsedMatchInfo.player_team_id === parsedMatchInfo.home_team_id,
          userId: user.id,
          newDate: newDateBangkokIso,
          teamId: parsedMatchInfo.player_team_id,
          timestamp: nowInBangkok().toISO() ?? new Date().toISOString(),
        },
      })
      if (res.status === 'ok') {
        setPostponedDate(newDate)
        setShowConfirmPostponeDate(false)
        RefreshUpcoming()
        exitPostponeScreen()
      } else {
        setError('Failed to postpone to date')
        setLoading(false)
      }
    } catch (error) {
      setError('Failed to postpone to date')
      setLoading(false)
    } finally {
      setDialogSubmitting(false)
    }
  }

  const handleConfirmMatch = async () => {
    setLoading(true)
    try {
      const res = await match.AcceptRescheduleProposal(
        parsedMatchInfo.match_id,
        parsedMatchInfo.player_team_id,
      )
      if (res.status === 'ok') {
        RefreshUpcoming()
        exitPostponeScreen()
      } else {
        setError(t('failed_to_confirm_match'))
      }
    } catch (error) {
      console.error('Failed to confirm match:', error)
      setError(t('failed_to_confirm_match'))
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    navigation.setOptions({
      title: t('reschedule_match'),
    })
    setIsMounted(true)
  }, [])

  function handleCancel() {
    setLoading(false)
    setShowDatePicker(false)
  }

  function handleOpenDatePicker() {
    setShowDatePicker(true)
  }

  async function postponeIndefinitely() {
    setDialogSubmitting(true)
    try {
      const res = await match.ProposeRescheduleMatch({
        matchId: parsedMatchInfo.match_id,
        proposedData: {
          isHome:
            parsedMatchInfo.player_team_id === parsedMatchInfo.home_team_id,
          userId: user.id,
          newDate: null,
          teamId: parsedMatchInfo.player_team_id,
          timestamp: nowInBangkok().toISO() ?? new Date().toISOString(),
        },
      })
      if (res.status === 'ok') {
        setShowConfirmPostponeIndefinitely(false)
        RefreshUpcoming()
        exitPostponeScreen()
      } else {
        setError(t('failed_to_postpone'))
        setLoading(false)
      }
    } catch (e) {
      console.error('Failed to postpone indefinitely:', e)
      setError(t('failed_to_postpone'))
      setLoading(false)
    } finally {
      setDialogSubmitting(false)
    }
  }

  if (isMounted) {
    return (
      <View className="flex-1 p-6 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <View className="w-full rounded-xl bg-white dark:bg-gray-800 p-6 shadow-md">
            {hasValidProposal && postponedProposal && (
              <View className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <Text
                  type="subtitle"
                  className="text-center text-amber-800 dark:text-amber-200 mb-2 font-semibold">
                  {t('latest_proposal')}
                </Text>
                <Text
                  type="title"
                  className="text-center font-bold text-lg text-gray-900 dark:text-gray-100">
                  {getProposingTeamShortName(
                    parsedMatchInfo,
                    postponedProposal,
                  )}
                </Text>
                <Text className="text-center text-gray-600 dark:text-gray-400 mt-2">
                  {t('proposed_date')}:
                </Text>
                <Text
                  type="subtitle"
                  className="text-center font-semibold text-gray-800 dark:text-gray-200">
                  {formatPostponedProposalDisplay(postponedProposal, {
                    indefinite: t('indefinite'),
                    noDate: t('no_date_selected'),
                  })}
                </Text>
              </View>
            )}

            {/* Original Date Section */}
            <View className="mb-8">
              <Text
                type="subtitle"
                className="text-center text-gray-500 dark:text-gray-400 mb-1">
                {t('original_date')}
              </Text>
              <Text type="title" className="text-center font-bold text-lg">
                {formatBangkokWeekdayDate(
                  parsedMatchInfo.original_date ?? parsedMatchInfo.date,
                )}
              </Text>
            </View>

            <Text className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('times_in_bangkok')}
            </Text>

            {/* Action Buttons */}
            <View className="mt-4">
              {loading ? (
                <View className="mt-4">
                  <ActivityIndicator size="large" color="#0000ff" />
                </View>
              ) : (
                <>
                  <Button
                    onPress={() => {
                      setLoading(true)
                      handleOpenDatePicker()
                    }}>
                    {postponedProposal?.newDate
                      ? t('propose_a_new_date')
                      : t('reschedule')}
                  </Button>
                  {!hasValidProposal && (
                    <View className="mt-4">
                      <Button
                        onPress={() => {
                          setLoading(true)
                          setShowConfirmPostponeIndefinitely(true)
                        }}>
                        {t('postpone_indefinitely')}
                      </Button>
                    </View>
                  )}
                </>
              )}

              {canConfirmOpponentProposal && (
                <View className="mt-4 w-full">
                  <Button
                    onPress={() => handleConfirmMatch()}
                    disabled={loading || dialogSubmitting}
                    style={{
                      width: '100%',
                      minHeight: 52,
                      backgroundColor: '#16a34a',
                    }}
                    icon={
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={22}
                        color="white"
                      />
                    }>
                    confirm_proposed_date
                  </Button>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Error Message */}
        {error ? (
          <View className="my-4 bg-red-100 p-4 rounded-lg">
            <Text className="text-red-600 text-center font-medium">
              {t('failed_to_postpone')}
            </Text>
          </View>
        ) : null}

        {/* Date Picker */}
        {showDatePicker ? (
          <DateTimePicker
            value={newDate ?? bangkokDefaultProposeTimeForPicker()}
            minimumDate={bangkokMinimumPickerDate()}
            mode="datetime"
            is24Hour={false}
            presentation="dialog"
            onDismiss={handleCancel}
            onValueChange={(_event, date) => {
              setNewDate(date)
              setNewDateBangkokIso(pickerWallClockToBangkokIso(date))
              setDateSelected(true)
              setShowDatePicker(false)
              setShowConfirmPostponeDate(true)
            }}
          />
        ) : null}

        {/* Confirmation Dialog */}
        <ConfirmDialog
          isVisible={showConfirmPostponeDate}
          title={t('schedule_for_later')}
          message={t('confirm_postpone_date', {
            date: newDateBangkokIso
              ? `${formatBangkok(newDateBangkokIso)} (${t('bangkok_timezone_abbr')})`
              : t('no_date_selected'),
          })}
          onConfirm={handleConfirmDatePostpone}
          onCancel={() => {
            if (!dialogSubmitting) {
              setShowConfirmPostponeDate(false)
              setLoading(false)
            }
          }}
          submitting={dialogSubmitting}
        />
        <ConfirmDialog
          isVisible={showConfirmPostponeIndefinitely}
          title={t('postpone_indefinitely')}
          message={t('confirm_postpone_indefinitely')}
          onConfirm={postponeIndefinitely}
          onCancel={() => {
            if (!dialogSubmitting) {
              setShowConfirmPostponeIndefinitely(false)
              setLoading(false)
            }
          }}
          submitting={dialogSubmitting}
        />
      </View>
    )
  } else {
    return null
  }
}
