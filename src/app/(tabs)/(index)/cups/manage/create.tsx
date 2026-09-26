import Button from '@/components/Button'
import {StructureComposer} from '@/components/cups/StructureComposer'
import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import {useLeagueContext} from '@/context/LeagueContext'
import {isLeagueAdmin} from '@/lib/isLeagueAdmin'
import {useLeague} from '@/hooks'
import {useMiniLeagues} from '@/hooks/useMiniLeagues'
import {useNetwork} from '@/hooks/useNetwork'
import {useTournaments} from '@/hooks/useTournaments'
import {
  buildStructureFromPreset,
  emptyStructure,
  getTournamentPreset,
  listTournamentPresets,
  type TournamentStructure,
} from '@/lib/tournaments/structure'
import {isMiniCompetition} from '@/types/competition'
import {useLocalSearchParams, useRouter} from 'expo-router'
import React from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  useColorScheme,
  View as RNView,
} from 'react-native'

const PRESET_FALLBACK = listTournamentPresets().map(p => ({
  key: p.key,
  label: p.label,
  description: p.description,
  explanation: p.explanation,
}))

const REGIONAL_TWO_REGION = new Set([
  'regional_single_elimination',
  'regional_double_elimination',
])

const PARTICIPANT_HELP: Record<'team' | 'player' | 'mixed', string> = {
  team: 'Bracket sides are league/mini teams. Season teams can be auto-imported.',
  player:
    'Bracket sides are individual players (add player entries after create).',
  mixed: 'Entries may be teams or players.',
}

type MatchFormat = {
  id: number
  name: string
  game_type: string
  format?: string
}

type GameType = {id: number; code: string; label: string}
type Season = {id: number; name: string; identifier: number}
type MiniLeagueOption = {id: number; name: string; season_id: number | null}
type Preset = {
  key: string
  label: string
  description?: string
  explanation?: string
}

function needsRaceTarget(formatJson?: string) {
  if (!formatJson) return false
  try {
    const parsed =
      typeof formatJson === 'string' ? JSON.parse(formatJson) : formatJson
    const mode = parsed?.mode || parsed?.[0]?.mode
    return mode === 'race_to' || mode === 'best_of'
  } catch {
    return /"mode"\s*:\s*"(race_to|best_of)"/.test(String(formatJson))
  }
}

function NumberField({
  label,
  value,
  onChange,
  onBlur,
  isDark,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  isDark: boolean
}) {
  return (
    <RNView style={{flex: 1, minWidth: 90}}>
      <Text style={{fontWeight: '600', marginBottom: 6, fontSize: 13}}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        onBlur={onBlur}
        keyboardType="number-pad"
        style={{
          borderWidth: 1,
          borderColor: isDark ? '#333' : '#e2e8f0',
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: isDark ? '#fff' : '#0f172a',
          backgroundColor: isDark ? '#1f1f1f' : '#fff',
        }}
      />
    </RNView>
  )
}

export default function CupsCreateScreen() {
  const params = useLocalSearchParams<{mini_league_id?: string}>()
  const paramMiniId = Number(params.mini_league_id || 0) || null
  const {state} = useLeagueContext()
  const league = useLeague()
  const {Get} = useNetwork()
  const api = useTournaments()
  const miniApi = useMiniLeagues()
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'

  const competition = state.competition
  const routeMiniId =
    paramMiniId ??
    (isMiniCompetition(competition) ? competition.id : null)
  const isMiniRoute = routeMiniId != null && routeMiniId > 0
  const isSiteAdmin = isLeagueAdmin(state.user)

  const [loading, setLoading] = React.useState(true)
  const [allowed, setAllowed] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [presets, setPresets] = React.useState<Preset[]>(PRESET_FALLBACK)
  const [formats, setFormats] = React.useState<MatchFormat[]>([])
  const [gameTypes, setGameTypes] = React.useState<GameType[]>([])
  const [seasons, setSeasons] = React.useState<Season[]>([])
  const [miniLeagues, setMiniLeagues] = React.useState<MiniLeagueOption[]>([])

  const [name, setName] = React.useState('')
  const [preset, setPreset] = React.useState('single_elimination')
  const [participantMode, setParticipantMode] = React.useState<
    'team' | 'player' | 'mixed'
  >('team')
  const [gameTypeId, setGameTypeId] = React.useState<number | null>(null)
  const [matchFormatId, setMatchFormatId] = React.useState<number | null>(null)
  const [seasonId, setSeasonId] = React.useState<number | null>(
    null,
  )
  const [selectedMiniId, setSelectedMiniId] = React.useState<number | null>(
    isMiniRoute ? routeMiniId : null,
  )
  const [raceTo, setRaceTo] = React.useState('5')
  const [openSignup, setOpenSignup] = React.useState(false)
  const [tablesAvailable, setTablesAvailable] = React.useState('')
  const [regionCount, setRegionCount] = React.useState('4')
  const [teamsPerRegion, setTeamsPerRegion] = React.useState('4')
  const [groupCount, setGroupCount] = React.useState('4')
  const [teamsPerGroup, setTeamsPerGroup] = React.useState('4')
  const [advancePerGroup, setAdvancePerGroup] = React.useState('2')
  const [autoAssignRegions, setAutoAssignRegions] = React.useState(true)
  const [structure, setStructure] = React.useState<TournamentStructure>(() =>
    buildStructureFromPreset('single_elimination', {}),
  )

  const selectedFormat = formats.find(f => f.id === matchFormatId)
  const showRaceTo = needsRaceTarget(selectedFormat?.format)
  const selectedPresetMeta =
    presets.find(p => p.key === preset) || getTournamentPreset(preset)

  const effectiveMiniId = isMiniRoute ? routeMiniId : selectedMiniId
  // Mini-route uses mini-league API; site admin create (incl. picking a mini) uses admin API.
  const scope = isMiniRoute
    ? {type: 'mini' as const, id: routeMiniId!}
    : {type: 'site' as const}

  function presetConfigFor(
    formatKey: string,
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> {
    let base: Record<string, unknown> = {}
    if (formatKey === 'regional_final_four') {
      base = {
        region_count: parseInt(regionCount, 10) || 4,
        teams_per_region: parseInt(teamsPerRegion, 10) || 4,
        auto_assign_regions: autoAssignRegions,
      }
    } else if (REGIONAL_TWO_REGION.has(formatKey)) {
      base = {
        teams_per_region: parseInt(teamsPerRegion, 10) || 4,
        auto_assign_regions: autoAssignRegions,
      }
    } else if (formatKey === 'groups_knockout') {
      base = {
        group_count: parseInt(groupCount, 10) || 4,
        teams_per_group: parseInt(teamsPerGroup, 10) || 4,
        advance_per_group: parseInt(advancePerGroup, 10) || 2,
      }
    }
    return {...base, ...overrides}
  }

  function buildFormatConfig(): Record<string, unknown> {
    const base: Record<string, unknown> = {}
    if (showRaceTo && parseInt(raceTo, 10) > 0) {
      base.race_to = parseInt(raceTo, 10)
    }
    return {...base, ...presetConfigFor(preset)}
  }

  function applyPreset(
    formatKey: string,
    overrides: Record<string, unknown> = {},
  ) {
    setPreset(formatKey)
    if (typeof overrides.auto_assign_regions === 'boolean') {
      setAutoAssignRegions(overrides.auto_assign_regions)
    }
    try {
      setStructure(
        buildStructureFromPreset(
          formatKey,
          presetConfigFor(formatKey, overrides),
        ),
      )
    } catch {
      setStructure(emptyStructure())
    }
  }

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      let canManage = isSiteAdmin
      if (isMiniRoute && routeMiniId) {
        const m = await miniApi.get(routeMiniId)
        canManage = isSiteAdmin || Boolean(m?.data?.is_admin)
      }
      if (cancelled) return
      if (!canManage) {
        setAllowed(false)
        setLoading(false)
        return
      }
      setAllowed(true)

      const adminScope = isMiniRoute
        ? {type: 'mini' as const, id: routeMiniId!}
        : {type: 'site' as const}

      const [presetRes, formatRes, gtRes, seasonsRes, miniRes] =
        await Promise.all([
          api.adminPresets(adminScope),
          api.adminMatchFormats(adminScope),
          // Same source as web tournament admin (8-ball / 9-ball), not /gametypes frame types.
          Get('/league-game-types'),
          !isMiniRoute ? league.GetSeasons() : Promise.resolve(null),
          !isMiniRoute && isSiteAdmin
            ? miniApi.list()
            : Promise.resolve(null),
        ])
      if (cancelled) return

      if (presetRes?.status === 'ok') {
        const list = presetRes.formats || presetRes.presets || []
        if (Array.isArray(list) && list.length) {
          setPresets(
            list.map((p: any) => {
              const local = getTournamentPreset(String(p.key))
              return {
                key: String(p.key),
                label: String(p.label || local?.label || p.key),
                description: p.description || local?.description,
                explanation: p.explanation || local?.explanation,
              }
            }),
          )
        }
      }
      if (formatRes?.status === 'ok' && Array.isArray(formatRes.data)) {
        setFormats(
          formatRes.data.map((f: any) => ({
            id: Number(f.id),
            name: String(f.name || `Format ${f.id}`),
            game_type: String(f.game_type || ''),
            format:
              typeof f.format === 'string'
                ? f.format
                : f.format != null
                  ? JSON.stringify(f.format)
                  : '',
          })),
        )
      }
      const gtList = Array.isArray(gtRes)
        ? gtRes
        : Array.isArray(gtRes?.data)
          ? gtRes.data
          : []
      setGameTypes(
        gtList
          .map((g: any) => ({
            id: Number(g.id),
            code: String(g.code || ''),
            label: String(g.label || g.code || g.id),
          }))
          .filter((g: GameType) => g.id > 0),
      )
      if (seasonsRes?.data && Array.isArray(seasonsRes.data)) {
        setSeasons(
          seasonsRes.data.map((s: any) => ({
            id: Number(s.id),
            name: String(s.name || s.id),
            identifier: Number(s.identifier ?? s.id),
          })),
        )
      }
      const miniRows = Array.isArray(miniRes?.data)
        ? miniRes.data
        : Array.isArray(miniRes)
          ? miniRes
          : []
      setMiniLeagues(
        miniRows
          .map((m: any) => ({
            id: Number(m.id),
            name: String(m.name || `Mini ${m.id}`),
            season_id: m.season_id != null ? Number(m.season_id) : null,
          }))
          .filter((m: MiniLeagueOption) => m.id > 0),
      )
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredFormats = React.useMemo(() => {
    if (!gameTypeId) return formats
    const gt = gameTypes.find(g => g.id === gameTypeId)
    if (!gt) return formats
    const code = gt.code.toLowerCase()
    const matched = formats.filter(f => f.game_type.toLowerCase() === code)
    return matched.length ? matched : formats
  }, [formats, gameTypeId, gameTypes])

  async function onCreate() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter a tournament name.')
      return
    }
    if (!gameTypeId || !matchFormatId) {
      Alert.alert('Missing fields', 'Select a game type and match format.')
      return
    }
    if (!isMiniRoute && !seasonId && !selectedMiniId) {
      Alert.alert(
        'Scope required',
        'Choose a league season or a mini league for this tournament.',
      )
      return
    }
    if (showRaceTo && !(parseInt(raceTo, 10) >= 1)) {
      Alert.alert('Race to N', 'Enter a race/best-of target of at least 1.')
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        format: preset,
        preset_key: preset,
        participant_mode: participantMode,
        game_type_id: gameTypeId,
        match_format_id: matchFormatId,
        format_config: buildFormatConfig(),
        structure,
        open_signup:
          participantMode === 'player' || participantMode === 'mixed'
            ? openSignup
            : false,
        tables_available: (() => {
          const n = parseInt(tablesAvailable, 10)
          return Number.isFinite(n) && n >= 1 ? n : null
        })(),
      }
      if (isMiniRoute || selectedMiniId) {
        payload.mini_league_id = effectiveMiniId
        payload.season_id = null
      } else {
        payload.season_id = seasonId
        payload.mini_league_id = null
      }
      const res = await api.adminCreate(scope, payload)
      if (res?.status === 'ok' && res.id) {
        router.replace({
          pathname: '/(tabs)/(index)/cups/manage/[tournamentId]',
          params: {
            tournamentId: String(res.id),
            ...(effectiveMiniId
              ? {mini_league_id: String(effectiveMiniId)}
              : {}),
          },
        })
      } else {
        Alert.alert('Error', res?.error || 'Could not create tournament')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!allowed) {
    return (
      <View style={{flex: 1, padding: 24, justifyContent: 'center'}}>
        <Text style={{textAlign: 'center', opacity: 0.7}}>
          Only league or mini-league admins can create tournaments.
        </Text>
      </View>
    )
  }

  const chip = (active: boolean) => ({
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: active
      ? isDark
        ? '#2563eb'
        : '#1d4ed8'
      : isDark
        ? '#333'
        : '#e2e8f0',
  })

  const helpBox = {
    borderWidth: 1,
    borderColor: isDark ? '#334155' : '#e2e8f0',
    backgroundColor: isDark ? '#1e293b' : '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  } as const

  return (
    <ScrollView
      style={{flex: 1}}
      contentContainerStyle={{padding: 16, paddingBottom: 40}}
      keyboardShouldPersistTaps="handled">
      <Text style={{fontSize: 13, opacity: 0.6, marginBottom: 12}}>
        {isMiniRoute
          ? 'Tournament will belong to this mini league.'
          : 'Team tournaments must belong to a canonical season or a mini league (not both).'}
      </Text>

      <Text style={{fontWeight: '600', marginBottom: 6}}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Tournament name"
        placeholderTextColor={isDark ? '#666' : '#94a3b8'}
        style={{
          borderWidth: 1,
          borderColor: isDark ? '#333' : '#e2e8f0',
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 16,
          color: isDark ? '#fff' : '#0f172a',
          backgroundColor: isDark ? '#1f1f1f' : '#fff',
        }}
      />

      {!isMiniRoute ? (
        <>
          <Text style={{fontWeight: '600', marginBottom: 6}}>Season</Text>
          <RNView style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8}}>
            <Pressable
              onPress={() => setSeasonId(null)}
              style={chip(seasonId == null && !selectedMiniId)}>
              <Text
                style={{
                  color:
                    seasonId == null && !selectedMiniId
                      ? '#fff'
                      : undefined,
                }}>
                — None —
              </Text>
            </Pressable>
            {seasons.map(s => (
              <Pressable
                key={s.id}
                onPress={() => {
                  setSeasonId(s.id)
                  setSelectedMiniId(null)
                }}
                style={chip(seasonId === s.id)}>
                <Text
                  style={{
                    color:
                      seasonId === s.id ? '#fff' : undefined,
                  }}>
                  {s.name}
                </Text>
              </Pressable>
            ))}
          </RNView>

          {isSiteAdmin ? (
            <>
              <Text style={{fontWeight: '600', marginBottom: 6}}>
                Or mini league
              </Text>
              <RNView
                style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8}}>
                <Pressable
                  onPress={() => setSelectedMiniId(null)}
                  style={chip(selectedMiniId == null)}>
                  <Text
                    style={{color: selectedMiniId == null ? '#fff' : undefined}}>
                    — None —
                  </Text>
                </Pressable>
                {miniLeagues.map(m => (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      setSelectedMiniId(m.id)
                      setSeasonId(null)
                    }}
                    style={chip(selectedMiniId === m.id)}>
                    <Text
                      style={{
                        color: selectedMiniId === m.id ? '#fff' : undefined,
                      }}>
                      {m.name}
                      {m.season_id == null ? ' (no season shell)' : ''}
                    </Text>
                  </Pressable>
                ))}
              </RNView>
              {miniLeagues.length === 0 ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: '#b45309',
                    marginBottom: 8,
                  }}>
                  No active mini leagues found.
                </Text>
              ) : null}
            </>
          ) : null}
          <Text style={{fontSize: 12, opacity: 0.6, marginBottom: 16}}>
            Set one to None to switch to the other.
          </Text>
        </>
      ) : null}

      <Text style={{fontWeight: '600', marginBottom: 6}}>Match type</Text>
      <RNView style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8}}>
        {(
          [
            ['team', 'Teams'],
            ['player', 'Players'],
            ['mixed', 'Mixed'],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setParticipantMode(value)}
            style={chip(participantMode === value)}>
            <Text
              style={{
                color: participantMode === value ? '#fff' : undefined,
              }}>
              {label}
            </Text>
          </Pressable>
        ))}
      </RNView>
      <RNView style={helpBox}>
        <Text style={{fontSize: 13, opacity: 0.75}}>
          {PARTICIPANT_HELP[participantMode]}
        </Text>
      </RNView>

      {(participantMode === 'player' || participantMode === 'mixed') && (
        <RNView
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            gap: 12,
          }}>
          <RNView style={{flex: 1}}>
            <Text style={{fontWeight: '600'}}>Allow player self-signup</Text>
            <Text style={{fontSize: 12, opacity: 0.6, marginTop: 4}}>
              When on, logged-in players can enter themselves. When off, you
              add every entry.
            </Text>
          </RNView>
          <Switch value={openSignup} onValueChange={setOpenSignup} />
        </RNView>
      )}

      <Text style={{fontWeight: '600', marginBottom: 6}}>Tables available</Text>
      <TextInput
        value={tablesAvailable}
        onChangeText={setTablesAvailable}
        keyboardType="number-pad"
        placeholder="e.g. 4"
        placeholderTextColor={isDark ? '#666' : '#94a3b8'}
        style={{
          borderWidth: 1,
          borderColor: isDark ? '#333' : '#e2e8f0',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 6,
          color: isDark ? '#fff' : '#0f172a',
          backgroundColor: isDark ? '#1f1f1f' : '#fff',
          width: 120,
        }}
      />
      <Text style={{fontSize: 12, opacity: 0.55, marginBottom: 16}}>
        How many dartboards can run matches at once. Bracket slots will be
        assigned board numbers when you generate the draft (you can retap to
        change them).
      </Text>

      <Text style={{fontWeight: '600', marginBottom: 6}}>Preset</Text>
      <RNView style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8}}>
        {presets.map(p => (
          <Pressable
            key={p.key}
            onPress={() => applyPreset(p.key)}
            style={chip(preset === p.key)}>
            <Text style={{color: preset === p.key ? '#fff' : undefined}}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </RNView>
      {selectedPresetMeta ? (
        <RNView style={helpBox}>
          <Text style={{fontWeight: '600', marginBottom: 2}}>
            {selectedPresetMeta.label}
          </Text>
          {selectedPresetMeta.description ? (
            <Text style={{fontSize: 13, opacity: 0.7}}>
              {selectedPresetMeta.description}
            </Text>
          ) : null}
          {selectedPresetMeta.explanation ? (
            <Text style={{fontSize: 13, marginTop: 8, lineHeight: 18}}>
              {selectedPresetMeta.explanation}
            </Text>
          ) : null}
        </RNView>
      ) : null}

      {preset === 'groups_knockout' ? (
        <RNView style={{flexDirection: 'row', gap: 8, marginBottom: 16}}>
          <NumberField
            label="Groups"
            value={groupCount}
            onChange={setGroupCount}
            onBlur={() => applyPreset('groups_knockout')}
            isDark={isDark}
          />
          <NumberField
            label="Per group"
            value={teamsPerGroup}
            onChange={setTeamsPerGroup}
            onBlur={() => applyPreset('groups_knockout')}
            isDark={isDark}
          />
          <NumberField
            label="Advance"
            value={advancePerGroup}
            onChange={setAdvancePerGroup}
            onBlur={() => applyPreset('groups_knockout')}
            isDark={isDark}
          />
        </RNView>
      ) : null}

      {preset === 'regional_final_four' ? (
        <RNView style={{marginBottom: 16}}>
          <RNView style={{flexDirection: 'row', gap: 8, marginBottom: 10}}>
            <NumberField
              label="Regions"
              value={regionCount}
              onChange={setRegionCount}
              onBlur={() => applyPreset('regional_final_four')}
              isDark={isDark}
            />
            <NumberField
              label="Teams / region"
              value={teamsPerRegion}
              onChange={setTeamsPerRegion}
              onBlur={() => applyPreset('regional_final_four')}
              isDark={isDark}
            />
          </RNView>
          <RNView
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text style={{flex: 1, paddingRight: 12, fontSize: 13}}>
              Auto-assign regions by seed on generate
            </Text>
            <Switch
              value={autoAssignRegions}
              onValueChange={v =>
                applyPreset('regional_final_four', {auto_assign_regions: v})
              }
            />
          </RNView>
        </RNView>
      ) : null}

      {REGIONAL_TWO_REGION.has(preset) ? (
        <RNView style={{marginBottom: 16}}>
          <RNView style={{flexDirection: 'row', gap: 8, marginBottom: 10}}>
            <NumberField
              label="Teams / region"
              value={teamsPerRegion}
              onChange={setTeamsPerRegion}
              onBlur={() => applyPreset(preset)}
              isDark={isDark}
            />
          </RNView>
          <RNView
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text style={{flex: 1, paddingRight: 12, fontSize: 13}}>
              Auto-assign regions by seed on generate
            </Text>
            <Switch
              value={autoAssignRegions}
              onValueChange={v =>
                applyPreset(preset, {auto_assign_regions: v})
              }
            />
          </RNView>
        </RNView>
      ) : null}

      <Text style={{fontWeight: '600', marginBottom: 6}}>Game type</Text>
      <RNView style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16}}>
        {gameTypes.map(g => (
          <Pressable
            key={g.id}
            onPress={() => {
              setGameTypeId(g.id)
              setMatchFormatId(null)
            }}
            style={chip(gameTypeId === g.id)}>
            <Text style={{color: gameTypeId === g.id ? '#fff' : undefined}}>
              {g.label}
            </Text>
          </Pressable>
        ))}
        {gameTypes.length === 0 ? (
          <Text style={{opacity: 0.55}}>No game types available.</Text>
        ) : null}
      </RNView>

      <Text style={{fontWeight: '600', marginBottom: 6}}>Match format</Text>
      <RNView style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16}}>
        {filteredFormats.map(f => (
          <Pressable
            key={f.id}
            onPress={() => setMatchFormatId(f.id)}
            style={chip(matchFormatId === f.id)}>
            <Text style={{color: matchFormatId === f.id ? '#fff' : undefined}}>
              {f.name}
            </Text>
          </Pressable>
        ))}
        {filteredFormats.length === 0 ? (
          <Text style={{opacity: 0.55}}>No formats available.</Text>
        ) : null}
      </RNView>

      {showRaceTo ? (
        <>
          <Text style={{fontWeight: '600', marginBottom: 6}}>
            Race to N (wins) *
          </Text>
          <TextInput
            value={raceTo}
            onChangeText={setRaceTo}
            keyboardType="number-pad"
            placeholder="e.g. 7"
            placeholderTextColor={isDark ? '#666' : '#94a3b8'}
            style={{
              borderWidth: 1,
              borderColor: isDark ? '#333' : '#e2e8f0',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 6,
              color: isDark ? '#fff' : '#0f172a',
              backgroundColor: isDark ? '#1f1f1f' : '#fff',
              width: 120,
            }}
          />
          <Text style={{fontSize: 12, opacity: 0.55, marginBottom: 16}}>
            Applied to every tournament match scoresheet when the bracket is generated.
          </Text>
        </>
      ) : null}

      <StructureComposer value={structure} onChange={setStructure} />

      <Button onPress={onCreate} disabled={saving}>
        <Text style={{color: '#fff', fontWeight: '700'}}>
          {saving ? 'Creating…' : 'Create tournament'}
        </Text>
      </Button>
    </ScrollView>
  )
}
