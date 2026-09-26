import {ThemedText as Text} from '@/components/ThemedText'
import {ThemedView as View} from '@/components/ThemedView'
import type {
  StageKind,
  StructureEdge,
  StructureStage,
  TournamentStructure,
} from '@/lib/tournaments/structure'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import React from 'react'
import {
  Pressable,
  TextInput,
  useColorScheme,
  View as RNView,
} from 'react-native'

const STAGE_GRAPH_HELP =
  'The stage graph is the tournament’s bracket blueprint: ordered stages (knockout, groups, consolation, final) plus advancement edges that say who moves where (winners, round losers, or group placements). Presets fill this in for you — edit stages and edges to rename Plate/Spoon, add consolation paths, or change how groups feed the knockout.'

const STAGE_KINDS: {value: StageKind; label: string}[] = [
  {value: 'single_elimination', label: 'Single elimination'},
  {value: 'double_elimination', label: 'Double elimination'},
  {value: 'round_robin', label: 'Round robin groups'},
  {value: 'consolation', label: 'Consolation (Plate/Spoon/…)'},
  {value: 'final', label: 'Final / championship'},
]

const EDGE_SOURCES: {value: StructureEdge['source']; label: string}[] = [
  {value: 'winners', label: 'Winners'},
  {value: 'losers', label: 'Losers'},
  {value: 'round_losers', label: 'Round losers'},
  {value: 'placement', label: 'Placement (RR)'},
]

type Props = {
  value: TournamentStructure
  onChange: (next: TournamentStructure) => void
  readOnly?: boolean
}

export function StructureComposer({
  value,
  onChange,
  readOnly = false,
}: Props) {
  const isDark = useColorScheme() === 'dark'
  const [showHelp, setShowHelp] = React.useState(false)
  const stages = value.stages ?? []
  const edges = value.edges ?? []

  const border = isDark ? '#333' : '#e2e8f0'
  const inputBg = isDark ? '#1f1f1f' : '#fff'
  const textColor = isDark ? '#fff' : '#0f172a'
  const muted = isDark ? '#94a3b8' : '#64748b'
  const chipBg = isDark ? '#333' : '#e2e8f0'
  const chipActive = isDark ? '#2563eb' : '#1d4ed8'

  const inputStyle = {
    borderWidth: 1,
    borderColor: border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    color: textColor,
    backgroundColor: inputBg,
  } as const

  const emit = (stagesNext: StructureStage[], edgesNext: StructureEdge[]) => {
    onChange({version: 1, stages: stagesNext, edges: edgesNext})
  }

  const updateStage = (index: number, patch: Partial<StructureStage>) => {
    emit(
      stages.map((s, i) => (i === index ? {...s, ...patch} : s)),
      edges,
    )
  }

  const addStage = () => {
    emit(
      [
        ...stages,
        {
          stage_key: `stage-${stages.length + 1}`,
          label: `Stage ${stages.length + 1}`,
          stage_order: stages.length,
          kind: 'single_elimination',
          config: {},
        },
      ],
      edges,
    )
  }

  const removeStage = (index: number) => {
    const removed = stages[index]
    emit(
      stages
        .filter((_, i) => i !== index)
        .map((s, i) => ({...s, stage_order: i})),
      edges.filter(
        e =>
          e.from_stage !== removed.stage_key &&
          e.to_stage !== removed.stage_key,
      ),
    )
  }

  const addEdge = () => {
    if (stages.length < 2) return
    emit(stages, [
      ...edges,
      {
        id: `edge-${Date.now()}`,
        from_stage: stages[0].stage_key,
        to_stage: stages[1].stage_key,
        source: 'winners',
        slot_policy: 'fixed_bracket_slots',
      },
    ])
  }

  const updateEdge = (index: number, patch: Partial<StructureEdge>) => {
    emit(
      stages,
      edges.map((e, i) => (i === index ? {...e, ...patch} : e)),
    )
  }

  const removeEdge = (index: number) => {
    emit(
      stages,
      edges.filter((_, i) => i !== index),
    )
  }

  const ChipRow = ({
    options,
    value: selected,
    onSelect,
  }: {
    options: {value: string; label: string}[]
    value: string
    onSelect: (v: string) => void
  }) => (
    <RNView style={{flexDirection: 'row', flexWrap: 'wrap', marginTop: 4}}>
      {options.map(opt => {
        const active = opt.value === selected
        return (
          <Pressable
            key={opt.value}
            disabled={readOnly}
            onPress={() => onSelect(opt.value)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              marginRight: 6,
              marginBottom: 6,
              backgroundColor: active ? chipActive : chipBg,
              opacity: readOnly ? 0.7 : 1,
            }}>
            <Text style={{fontSize: 12, color: active ? '#fff' : undefined}}>
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </RNView>
  )

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: border,
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
      }}>
      <RNView
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: showHelp ? 8 : 10,
        }}>
        <RNView style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <Text style={{fontWeight: '700'}}>Stage graph</Text>
          <Pressable
            onPress={() => setShowHelp(v => !v)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={
              showHelp ? 'Hide stage graph help' : 'Explain stage graph'
            }
            accessibilityState={{expanded: showHelp}}>
            <MCI
              name={showHelp ? 'information' : 'information-outline'}
              size={18}
              color={showHelp ? chipActive : muted}
            />
          </Pressable>
        </RNView>
        {!readOnly ? (
          <Pressable
            onPress={addStage}
            style={{
              backgroundColor: isDark ? '#475569' : '#334155',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
            }}>
            <Text style={{color: '#fff', fontSize: 12, fontWeight: '600'}}>
              Add stage
            </Text>
          </Pressable>
        ) : null}
      </RNView>

      {showHelp ? (
        <RNView
          style={{
            borderWidth: 1,
            borderColor: border,
            backgroundColor: isDark ? '#1e293b' : '#f8fafc',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 12,
          }}>
          <Text style={{fontSize: 13, lineHeight: 19, color: muted}}>
            {STAGE_GRAPH_HELP}
          </Text>
        </RNView>
      ) : null}

      {stages.length === 0 ? (
        <Text style={{fontSize: 12, color: muted, marginBottom: 8}}>
          No stages yet. Pick a preset or add stages manually.
        </Text>
      ) : null}

      {stages.map((stage, index) => (
        <RNView
          key={`${stage.stage_key}-${index}`}
          style={{
            borderWidth: 1,
            borderColor: border,
            borderRadius: 10,
            padding: 10,
            marginBottom: 10,
          }}>
          <Text style={{fontSize: 12, fontWeight: '600', marginBottom: 2}}>
            Key
          </Text>
          <TextInput
            value={stage.stage_key}
            editable={!readOnly}
            onChangeText={v => updateStage(index, {stage_key: v})}
            style={inputStyle}
          />
          <Text style={{fontSize: 12, fontWeight: '600', marginTop: 8}}>
            Label
          </Text>
          <TextInput
            value={stage.label}
            editable={!readOnly}
            onChangeText={v => updateStage(index, {label: v})}
            style={inputStyle}
          />
          <Text style={{fontSize: 12, fontWeight: '600', marginTop: 8}}>
            Kind
          </Text>
          <ChipRow
            options={STAGE_KINDS}
            value={stage.kind}
            onSelect={v => updateStage(index, {kind: v as StageKind})}
          />
          {stage.kind === 'round_robin' ? (
            <RNView
              style={{flexDirection: 'row', gap: 8, marginTop: 4}}>
              {(
                [
                  ['Groups', 'group_count', 4],
                  ['Per group', 'teams_per_group', 4],
                  ['Advance', 'advance_per_group', 2],
                ] as const
              ).map(([label, key, fallback]) => (
                <RNView key={key} style={{flex: 1}}>
                  <Text style={{fontSize: 11, fontWeight: '600'}}>{label}</Text>
                  <TextInput
                    keyboardType="number-pad"
                    editable={!readOnly}
                    value={String(Number(stage.config[key]) || fallback)}
                    onChangeText={v =>
                      updateStage(index, {
                        config: {
                          ...stage.config,
                          [key]: Number(v) || fallback,
                        },
                      })
                    }
                    style={inputStyle}
                  />
                </RNView>
              ))}
            </RNView>
          ) : null}
          {!readOnly ? (
            <Pressable onPress={() => removeStage(index)} style={{marginTop: 8}}>
              <Text style={{color: '#dc2626', fontSize: 12}}>Remove stage</Text>
            </Pressable>
          ) : null}
        </RNView>
      ))}

      <RNView
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 4,
          marginBottom: 10,
        }}>
        <Text style={{fontWeight: '700'}}>Advancement edges</Text>
        {!readOnly ? (
          <Pressable
            onPress={addEdge}
            disabled={stages.length < 2}
            style={{
              backgroundColor: isDark ? '#475569' : '#334155',
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              opacity: stages.length < 2 ? 0.4 : 1,
            }}>
            <Text style={{color: '#fff', fontSize: 12, fontWeight: '600'}}>
              Add edge
            </Text>
          </Pressable>
        ) : null}
      </RNView>

      {edges.length === 0 ? (
        <Text style={{fontSize: 12, color: muted}}>No cross-stage edges</Text>
      ) : null}

      {edges.map((edge, index) => (
        <RNView
          key={edge.id}
          style={{
            borderWidth: 1,
            borderColor: border,
            borderRadius: 10,
            padding: 10,
            marginBottom: 10,
          }}>
          <Text style={{fontSize: 12, fontWeight: '600'}}>From</Text>
          <ChipRow
            options={stages.map(s => ({value: s.stage_key, label: s.label}))}
            value={edge.from_stage}
            onSelect={v => updateEdge(index, {from_stage: v})}
          />
          <Text style={{fontSize: 12, fontWeight: '600'}}>To</Text>
          <ChipRow
            options={stages.map(s => ({value: s.stage_key, label: s.label}))}
            value={edge.to_stage}
            onSelect={v => updateEdge(index, {to_stage: v})}
          />
          <Text style={{fontSize: 12, fontWeight: '600'}}>Source</Text>
          <ChipRow
            options={EDGE_SOURCES}
            value={edge.source}
            onSelect={v =>
              updateEdge(index, {source: v as StructureEdge['source']})
            }
          />
          {edge.source === 'round_losers' ? (
            <>
              <Text style={{fontSize: 12, fontWeight: '600'}}>Round</Text>
              <TextInput
                keyboardType="number-pad"
                editable={!readOnly}
                value={String(Number(edge.filter?.round) || 1)}
                onChangeText={v =>
                  updateEdge(index, {
                    filter: {round: Number(v) || 1},
                  })
                }
                style={[inputStyle, {width: 80}]}
              />
            </>
          ) : null}
          {!readOnly ? (
            <Pressable onPress={() => removeEdge(index)} style={{marginTop: 8}}>
              <Text style={{color: '#dc2626', fontSize: 12}}>Remove edge</Text>
            </Pressable>
          ) : null}
        </RNView>
      ))}
    </View>
  )
}
