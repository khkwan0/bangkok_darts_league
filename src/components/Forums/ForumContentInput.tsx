import TextInput from '@/components/TextInput'
import {ForumCharCounter} from '@/components/Forums/ForumCharCounter'
import {ForumImageAttachButton} from '@/components/Forums/ForumImageAttachButton'
import {
  forumComposerImageNumbers,
  forumImageToken,
  parseForumComposerContent,
  parseForumImageTag,
  serializeForumComposerContent,
  type ForumComposerContent,
} from '@/lib/forumImage'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {Image} from 'expo-image'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Pressable, Text, View} from 'react-native'

type ForumContentInputProps = Omit<
  React.ComponentProps<typeof TextInput>,
  'value' | 'onChangeText' | 'maxLength' | 'onSelectionChange'
> & {
  /** Raw post content, including `<img>` embeds. */
  value: string
  onChangeText: (raw: string) => void
  maxLength?: number
  attachDisabled?: boolean
}

const THUMB_SIZE = 72

export function ForumContentInput({
  value,
  onChangeText,
  maxLength,
  attachDisabled = false,
  ...inputProps
}: ForumContentInputProps) {
  const {t} = useTranslation()
  const [content, setContent] = React.useState<ForumComposerContent>(() =>
    parseForumComposerContent(value),
  )
  const [prevValue, setPrevValue] = React.useState(value)
  const [selection, setSelection] = React.useState<{start: number; end: number} | null>(
    null,
  )

  if (value !== prevValue) {
    setPrevValue(value)
    if (value !== serializeForumComposerContent(content)) {
      setContent(parseForumComposerContent(value))
    }
  }

  function commit(next: ForumComposerContent) {
    setContent(next)
    onChangeText(serializeForumComposerContent(next))
  }

  function handleChangeText(text: string) {
    const next = {...content, text}
    if (maxLength != null) {
      const nextLength = serializeForumComposerContent(next).length
      if (nextLength > maxLength && nextLength > value.length) return
    }
    commit(next)
  }

  function insertImage(snippet: string) {
    const tag = snippet.trim()
    const images = [...content.images, tag]
    const token = forumImageToken(images.length)
    const {text} = content
    const start = selection?.start ?? text.length
    const end = selection?.end ?? text.length
    const before = text.slice(0, start)
    const after = text.slice(end)
    const lead = before && !before.endsWith('\n') ? '\n' : ''
    const trail = after.startsWith('\n') ? '' : '\n'
    const inserted = `${lead}${token}${trail}`
    const caret = before.length + inserted.length
    setSelection({start: caret, end: caret})
    commit({images, text: `${before}${inserted}${after}`})
  }

  function removeImage(n: number) {
    const token = forumImageToken(n).replace(/[[\]]/g, '\\$&')
    const text = content.text.replace(new RegExp(`\\n?${token}\\n?`, 'g'), match =>
      match.startsWith('\n') && match.endsWith('\n') ? '\n' : '',
    )
    commit({...content, text})
  }

  const imageNumbers = forumComposerImageNumbers(content)

  return (
    <>
      <TextInput
        {...inputProps}
        value={content.text}
        onChangeText={handleChangeText}
        onSelectionChange={e => setSelection(e.nativeEvent.selection)}
      />
      {maxLength ? (
        <ForumCharCounter length={value.length} maxLength={maxLength} className="mt-1" />
      ) : null}
      {imageNumbers.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {imageNumbers.map(n => {
            const parsed = parseForumImageTag(content.images[n - 1] ?? '')
            if (!parsed) return null
            return (
              <View
                key={n}
                className="overflow-hidden rounded-lg"
                style={{width: THUMB_SIZE, height: THUMB_SIZE}}>
                <Image
                  source={{uri: parsed.displayUrl}}
                  contentFit="cover"
                  style={{width: THUMB_SIZE, height: THUMB_SIZE}}
                  accessibilityLabel={forumImageToken(n)}
                />
                <View
                  className="absolute bottom-1 left-1 rounded px-1.5"
                  style={{backgroundColor: 'rgba(0,0,0,0.6)'}}>
                  <Text className="text-xs font-semibold text-white">{n}</Text>
                </View>
                <Pressable
                  onPress={() => removeImage(n)}
                  disabled={attachDisabled}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('forums_remove_image')}
                  className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full"
                  style={{backgroundColor: 'rgba(0,0,0,0.6)'}}>
                  <MCI name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            )
          })}
        </View>
      ) : null}
      <View className="mt-2">
        <ForumImageAttachButton disabled={attachDisabled} onInsert={insertImage} />
      </View>
    </>
  )
}
