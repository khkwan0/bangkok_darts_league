import Markdown, {
  MarkdownIt,
  renderRules as defaultRenderRules,
} from 'react-native-markdown-display'
import {useFocusEffect} from 'expo-router'
import React from 'react'
import {ScrollView, Text, View, useColorScheme} from 'react-native'
import {
  ForumImageViewer,
  ForumPostImage,
} from '@/components/Forums/ForumImageViewer'
import {parseForumImageTag, resolveForumImageFullUrl, resolveForumImageUrl} from '@/lib/forumImage'
import {
  isAnnouncementImageUrl,
  resolveAnnouncementImageUrl,
} from '@/lib/announcementContent'
import {useLeagueContext} from '@/context/LeagueContext'
import {
  extractColorFromStyle,
  normalizeForumMarkdown,
} from '@/components/forumMarkdownNormalize'
import {preserveForumImageTags} from '@/lib/forumImage'

const markdownItInstance = MarkdownIt({
  typographer: true,
  linkify: true,
  html: true,
})

const SPAN_CLOSE_RE = /^<\/span>$/i
const IMG_TAG_RE = /<img\b/i

function renderForumImageHtml(
  content: string,
  nodeKey: string,
  onImagePress: (fullUri: string) => void,
): React.ReactNode {
  if (!IMG_TAG_RE.test(content)) {
    return null
  }
  const parsed = parseForumImageTag(content)
  if (!parsed) {
    return null
  }
  return (
    <ForumPostImage
      key={nodeKey}
      displayUri={parsed.displayUrl}
      fullUri={parsed.fullUrl}
      onPress={onImagePress}
    />
  )
}

type MarkdownRule = (
  node: {key: string; content?: string; attributes?: {href?: string}},
  children: React.ReactNode,
  parent: unknown,
  styles: Record<string, object>,
  ...rest: unknown[]
) => React.ReactNode

function createColoredSpanRules(
  onImagePress?: (fullUri: string) => void,
): Record<string, MarkdownRule> {
  const colorStack: string[] = []

  const activeColorStyle = (): {color: string} | null => {
    const color = colorStack[colorStack.length - 1]
    return color ? {color} : null
  }

  return {
    body: (node, children, parent, styles) => {
      colorStack.length = 0
      return defaultRenderRules.body(node, children, parent, styles)
    },
    html_block: node => {
      if (!onImagePress) {
        return null
      }
      return renderForumImageHtml(node.content?.trim() ?? '', node.key, onImagePress)
    },
    html_inline: node => {
      const content = node.content?.trim() ?? ''
      if (SPAN_CLOSE_RE.test(content)) {
        colorStack.pop()
        return null
      }
      if (onImagePress) {
        const image = renderForumImageHtml(content, node.key, onImagePress)
        if (image) {
          return image
        }
      }
      if (/^<span\b/i.test(content)) {
        const styleMatch = content.match(/\bstyle=["']([^"']*)["']/i)
        if (styleMatch) {
          const color = extractColorFromStyle(styleMatch[1] ?? '')
          if (color) colorStack.push(color)
        }
      }
      return null
    },
    text: (node, children, parent, styles, inheritedStyles = {}) => (
      <Text
        key={node.key}
        style={[styles.text, inheritedStyles, activeColorStyle()]}>
        {node.content}
      </Text>
    ),
    textgroup: (node, children, parent, styles, inheritedStyles = {}) => (
      <Text
        key={node.key}
        style={[styles.textgroup, inheritedStyles, activeColorStyle()]}>
        {children}
      </Text>
    ),
    inline: (node, children, parent, styles, inheritedStyles = {}) => (
      <Text key={node.key} style={[inheritedStyles, activeColorStyle()]}>
        {children}
      </Text>
    ),
    strong: (node, children, parent, styles, inheritedStyles = {}) => (
      <Text
        key={node.key}
        style={[styles.strong, inheritedStyles, activeColorStyle()]}>
        {children}
      </Text>
    ),
    em: (node, children, parent, styles, inheritedStyles = {}) => (
      <Text
        key={node.key}
        style={[styles.em, inheritedStyles, activeColorStyle()]}>
        {children}
      </Text>
    ),
    s: (node, children, parent, styles, inheritedStyles = {}) => (
      <Text
        key={node.key}
        style={[styles.s, inheritedStyles, activeColorStyle()]}>
        {children}
      </Text>
    ),
    code_inline: (node, children, parent, styles, inheritedStyles = {}) => (
      <Text
        key={node.key}
        style={[styles.code_inline, inheritedStyles, activeColorStyle()]}>
        {node.content}
      </Text>
    ),
    heading2: (node, children, parent, styles) => (
      <Text key={node.key} style={styles.heading2}>
        {children}
      </Text>
    ),
    heading3: (node, children, parent, styles) => (
      <Text key={node.key} style={styles.heading3}>
        {children}
      </Text>
    ),
  }
}

const COLUMN_MIN_WIDTH = 108
const COLUMN_MAX_WIDTH = 160

export function markdownContainsTable(content: string): boolean {
  return /^\s*\|.+\|\s*$/m.test(content)
}

function getMarkdownTableColumnCount(markdown: string): number {
  let maxCols = 0

  for (const line of markdown.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.includes('|')) {
      continue
    }

    // GFM separator row: | --- | --- |
    if (/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(trimmed)) {
      continue
    }

    const parts = trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|')
    maxCols = Math.max(maxCols, parts.length)
  }

  return maxCols
}

type ChatMarkdownProps = {
  content: string
  textColor: string
}

export function ChatMarkdown({content, textColor}: ChatMarkdownProps) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const {apiUrl} = useLeagueContext()
  const [viewerUri, setViewerUri] = React.useState<string | null>(null)
  const handleImagePress = React.useCallback((fullUri: string) => {
    setViewerUri(fullUri)
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setViewerUri(null)
      }
    }, []),
  )
  const resolveImageUrl = React.useCallback(
    (src: string) => {
      if (isAnnouncementImageUrl(src)) {
        return resolveAnnouncementImageUrl(src, apiUrl)
      }
      return resolveForumImageUrl(src)
    },
    [apiUrl],
  )
  const normalizedContent = React.useMemo(
    () => preserveForumImageTags(normalizeForumMarkdown(content)),
    [content],
  )
  const borderColor = isDark ? '#374151' : '#d1d5db'
  const headerBg = isDark ? '#14532d' : '#bbf7d0'
  const blockquoteBg = isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(0, 0, 0, 0.06)'
  const blockquoteBorder = isDark ? '#6ee7b7' : '#166534'
  const codeBg = isDark ? '#111827' : '#e5e7eb'

  const columnCount = React.useMemo(
    () => getMarkdownTableColumnCount(normalizedContent),
    [normalizedContent],
  )
  const columnWidth = React.useMemo(() => {
    if (columnCount <= 0) {
      return COLUMN_MIN_WIDTH
    }
    return Math.max(
      COLUMN_MIN_WIDTH,
      Math.min(COLUMN_MAX_WIDTH, Math.floor(360 / columnCount)),
    )
  }, [columnCount])

  const cellLayout = React.useMemo(
    () => ({
      width: columnWidth,
      flexGrow: 0,
      flexShrink: 0,
    }),
    [columnWidth],
  )

  const markdownStyles = React.useMemo(
    () => ({
      body: {color: textColor},
      text: {color: textColor, fontSize: 15, lineHeight: 21},
      textgroup: {color: textColor},
      paragraph: {
        marginTop: 2,
        marginBottom: 2,
        flexDirection: 'column' as const,
        flexWrap: 'wrap' as const,
        width: '100%',
      },
      strong: {color: textColor, fontWeight: '700' as const},
      em: {color: textColor, fontStyle: 'italic' as const},
      link: {color: isDark ? '#93c5fd' : '#2563eb'},
      bullet_list: {marginVertical: 4},
      ordered_list: {marginVertical: 4},
      blockquote: {
        backgroundColor: blockquoteBg,
        borderLeftWidth: 4,
        borderLeftColor: blockquoteBorder,
        borderColor: blockquoteBorder,
        marginVertical: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
      },
      hr: {
        backgroundColor: borderColor,
        height: 1,
        marginVertical: 12,
      },
      heading1: {color: textColor, fontSize: 22, fontWeight: '700' as const, marginVertical: 8},
      heading2: {color: textColor, fontSize: 20, fontWeight: '700' as const, marginVertical: 8},
      heading3: {color: textColor, fontSize: 18, fontWeight: '600' as const, marginVertical: 6},
      heading4: {color: textColor, fontSize: 16, fontWeight: '600' as const, marginVertical: 6},
      heading5: {color: textColor, fontSize: 15, fontWeight: '600' as const, marginVertical: 4},
      heading6: {color: textColor, fontSize: 14, fontWeight: '600' as const, marginVertical: 4},
      code_inline: {
        backgroundColor: codeBg,
        color: textColor,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: 14,
      },
      code_block: {
        backgroundColor: codeBg,
        color: textColor,
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
        fontSize: 13,
        borderWidth: 0,
      },
      fence: {
        backgroundColor: codeBg,
        color: textColor,
        padding: 12,
        borderRadius: 8,
        marginVertical: 8,
        fontSize: 13,
        borderWidth: 0,
      },
      table: {
        borderWidth: 1,
        borderColor,
        borderRadius: 8,
        alignSelf: 'flex-start' as const,
      },
      thead: {
        backgroundColor: headerBg,
      },
      tbody: {},
      tr: {
        flexDirection: 'row' as const,
        alignSelf: 'flex-start' as const,
        borderBottomWidth: 1,
        borderColor,
      },
      th: {
        ...cellLayout,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontWeight: '600' as const,
        fontSize: 12,
        color: isDark ? '#ecfdf5' : '#14532d',
        justifyContent: 'center' as const,
      },
      td: {
        ...cellLayout,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        color: textColor,
        justifyContent: 'center' as const,
      },
    }),
    [
      textColor,
      isDark,
      borderColor,
      headerBg,
      blockquoteBg,
      blockquoteBorder,
      codeBg,
      cellLayout,
    ],
  )

  const tableRules = React.useMemo(
    () => ({
      table: (
        node: {key: string},
        children: React.ReactNode,
        _parent: unknown,
        styles: Record<string, object>,
      ) => (
        <ScrollView
          key={node.key}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator
          style={{marginVertical: 8, flexGrow: 0}}
          contentContainerStyle={{flexGrow: 1}}>
          <View style={styles._VIEW_SAFE_table}>{children}</View>
        </ScrollView>
      ),
      thead: (
        node: {key: string},
        children: React.ReactNode,
        _parent: unknown,
        styles: Record<string, object>,
      ) => (
        <View key={node.key} style={styles._VIEW_SAFE_thead}>
          {children}
        </View>
      ),
      tbody: (
        node: {key: string},
        children: React.ReactNode,
        _parent: unknown,
        styles: Record<string, object>,
      ) => (
        <View key={node.key} style={styles._VIEW_SAFE_tbody}>
          {children}
        </View>
      ),
      tr: (
        node: {key: string},
        children: React.ReactNode,
        _parent: unknown,
        styles: Record<string, object>,
      ) => (
        <View key={node.key} style={styles._VIEW_SAFE_tr}>
          {children}
        </View>
      ),
      th: (
        node: {key: string},
        children: React.ReactNode,
        _parent: unknown,
        styles: Record<string, object>,
      ) => (
        <View
          key={node.key}
          style={[styles._VIEW_SAFE_th, {width: columnWidth, flexGrow: 0, flexShrink: 0}]}>
          {children}
        </View>
      ),
      td: (
        node: {key: string},
        children: React.ReactNode,
        _parent: unknown,
        styles: Record<string, object>,
      ) => (
        <View
          key={node.key}
          style={[styles._VIEW_SAFE_td, {width: columnWidth, flexGrow: 0, flexShrink: 0}]}>
          {children}
        </View>
      ),
    }),
    [columnWidth],
  )

  const renderRules = React.useMemo(
    () => ({
      ...defaultRenderRules,
      ...createColoredSpanRules(handleImagePress),
      image: (
        node: {key: string; attributes?: {src?: string; alt?: string}},
        _children: React.ReactNode,
        _parent: unknown,
        _styles: Record<string, object>,
      ) => {
        const src = node.attributes?.src
        if (!src) return null
        const displayUri = resolveImageUrl(src)
        const fullUri = isAnnouncementImageUrl(src)
          ? displayUri
          : resolveForumImageFullUrl(src)
        return (
          <ForumPostImage
            key={node.key}
            displayUri={displayUri}
            fullUri={fullUri}
            onPress={handleImagePress}
          />
        )
      },
      ...tableRules,
    }),
    [tableRules, handleImagePress, resolveImageUrl],
  )

  if (!normalizedContent.trim()) {
    return null
  }

  return (
    <>
      <Markdown
        markdownit={markdownItInstance}
        style={markdownStyles}
        rules={renderRules}
        mergeStyle>
        {normalizedContent}
      </Markdown>
      <ForumImageViewer uri={viewerUri} onClose={() => setViewerUri(null)} />
    </>
  )
}
