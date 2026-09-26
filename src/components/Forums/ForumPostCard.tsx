import Button from '@/components/Button'
import {ForumContentInput} from '@/components/Forums/ForumContentInput'
import {ChatMarkdown} from '@/components/ChatMarkdown'
import {formatForumDate} from '@/components/Forums/formatForumDate'
import {ForumIconBadge, ForumStatChip} from '@/components/Forums/ForumUiParts'
import ForumPollResults from '@/components/Forums/ForumPollResults'
import ForumPostReactions from '@/components/Forums/ForumPostReactions'
import {FORUM_STAT_COLORS, forumListCardStyle, getForumAccent} from '@/components/Forums/forumUi'
import {ThemedText as Text} from '@/components/ThemedText'
import type {
  ForumPost,
  ForumPostReactionState,
  ForumReactionIcon,
  ForumTopicDetail,
} from '@/types/forums'
import MCI from '@expo/vector-icons/MaterialCommunityIcons'
import {useTheme} from "expo-router/react-navigation"
import {useRouter} from 'expo-router'
import React from 'react'
import {useTranslation} from 'react-i18next'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  useColorScheme,
  View as RNView,
} from 'react-native'

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

function formatPostAuthorLabel(
  post: ForumPost,
  t: (key: string) => string,
): string {
  if (!post.is_anonymous) return post.author_name
  if (post.author_real_name) {
    return `${t('forums_anonymous')} (${post.author_real_name})`
  }
  return t('forums_anonymous')
}

function emptyReactions(): ForumPostReactionState {
  return {counts: {}, userIconId: null}
}

function canNavigateToPostAuthor(post: ForumPost): boolean {
  if (!post.is_anonymous) return true
  return Boolean(post.author_real_name)
}

function navigateToPlayer(router: ReturnType<typeof useRouter>, authorId: number) {
  router.push({
    pathname: '/Settings/Players/PlayerInfo',
    params: {params: JSON.stringify({playerId: authorId})},
  })
}

type ForumPostCardProps = {
  post: ForumPost
  accentIndex: number
  isOriginalPost?: boolean
  reactionIcons?: ForumReactionIcon[]
  reactions?: ForumPostReactionState
  onReact?: (iconId: number) => void
  submittingReactionIconId?: number | null
  reactionError?: string | null
  canEdit?: boolean
  editing?: boolean
  editContent?: string
  onEditStart?: () => void
  onEditChange?: (text: string) => void
  onEditSave?: () => void
  onEditCancel?: () => void
  editSubmitting?: boolean
  editError?: string | null
  editMaxLength?: number
}

export function ForumPostCard({
  post,
  accentIndex,
  isOriginalPost = false,
  reactionIcons = [],
  reactions,
  onReact,
  submittingReactionIconId = null,
  reactionError = null,
  canEdit = false,
  editing = false,
  editContent = '',
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  editSubmitting = false,
  editError = null,
  editMaxLength,
}: ForumPostCardProps) {
  const {t, i18n} = useTranslation()
  const {colors} = useTheme()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const accent = isOriginalPost ? getForumAccent(0) : getForumAccent(accentIndex)
  const displayName = formatPostAuthorLabel(post, t)
  const avatarName = post.author_real_name ?? post.author_name
  const authorNavigable = canNavigateToPostAuthor(post)
  const inputBg = isDark ? '#1e293b' : '#f1f5f9'
  const inputBorder = isDark ? 'rgba(96, 165, 250, 0.35)' : 'rgba(33, 150, 243, 0.28)'
  const accentColor = isDark ? '#60a5fa' : '#1565C0'

  const handleAuthorPress = () => {
    if (authorNavigable) {
      navigateToPlayer(router, post.author_id)
    }
  }

  const avatarContent = (
    <RNView
      className="h-11 w-11 items-center justify-center rounded-full"
      style={{
        backgroundColor: isOriginalPost
          ? 'rgba(33, 150, 243, 0.2)'
          : accent.bg,
      }}>
      <Text
        className="text-sm font-bold"
        style={{color: isOriginalPost ? '#1565C0' : accent.fg}}>
        {post.is_anonymous && !post.author_real_name
          ? '?'
          : authorInitials(avatarName)}
      </Text>
    </RNView>
  )

  const nameContent = (
    <Text
      className={`text-base font-bold ${authorNavigable ? 'text-blue-600 dark:text-blue-400' : ''}`}>
      {displayName}
    </Text>
  )

  return (
    <RNView
      className="mb-3 overflow-hidden rounded-xl"
      style={{
        ...forumListCardStyle(
          colors.card,
          isDark,
          isOriginalPost ? 'rgba(33, 150, 243, 0.2)' : accent.border,
        ),
      }}>
      {!isOriginalPost ? (
        <RNView
          className="absolute bottom-0 left-0 top-0 w-0.5"
          style={{backgroundColor: accent.fg}}
        />
      ) : null}
      <RNView className={`px-4 py-3.5 ${isOriginalPost ? '' : 'pl-5'}`}>
        <RNView className="flex-row items-start">
          {authorNavigable ? (
            <Pressable
              onPress={handleAuthorPress}
              accessibilityRole="button"
              accessibilityLabel={displayName}>
              {avatarContent}
            </Pressable>
          ) : (
            avatarContent
          )}
          <RNView className="ml-3 flex-1">
            <RNView className="flex-row flex-wrap items-center gap-2">
              {authorNavigable ? (
                <Pressable
                  onPress={handleAuthorPress}
                  accessibilityRole="button"
                  accessibilityLabel={displayName}>
                  {nameContent}
                </Pressable>
              ) : (
                nameContent
              )}
              {isOriginalPost ? (
                <ForumStatChip
                  icon="star-circle"
                  label={t('forums_original_post')}
                  fg="#1565C0"
                  bg="rgba(33, 150, 243, 0.14)"
                />
              ) : (
                <ForumStatChip
                  icon="numeric"
                  label={String(post.post_number)}
                  fg={accent.fg}
                  bg={accent.bg}
                />
              )}
            </RNView>
            <RNView className="mt-0.5 flex-row flex-wrap items-center gap-x-2">
              <Text className="text-xs opacity-60">
                {formatForumDate(post.created_at, i18n.language)}
                {post.edited_at ? ` · ${t('forums_edited')}` : ''}
              </Text>
              {canEdit && !editing ? (
                <Pressable onPress={onEditStart} hitSlop={8}>
                  <Text className="text-xs font-semibold" style={{color: accentColor}}>
                    {t('forums_edit_post')}
                  </Text>
                </Pressable>
              ) : null}
            </RNView>
          </RNView>
        </RNView>
        <RNView className="mt-3">
          {editing ? (
            <>
              <ForumContentInput
                value={editContent ?? ''}
                onChangeText={text => onEditChange?.(text)}
                attachDisabled={editSubmitting}
                placeholder={t('forums_message_placeholder')}
                multiline
                maxLength={editMaxLength}
                textAlignVertical="top"
                scrollEnabled
                containerStyle={{
                  alignItems: 'stretch',
                  minHeight: 140,
                  backgroundColor: inputBg,
                  borderColor: inputBorder,
                  borderRadius: 12,
                  paddingVertical: 0,
                }}
                inputStyle={{
                  minHeight: 120,
                  paddingTop: 12,
                  paddingBottom: 12,
                  paddingHorizontal: 14,
                  lineHeight: 22,
                  fontSize: 16,
                }}
              />
              {editError ? (
                <Text className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {editError}
                </Text>
              ) : null}
              <RNView className="mt-3 flex-row gap-3">
                <RNView className="flex-1">
                  <Button
                    type="outline"
                    onPress={onEditCancel}
                    disabled={editSubmitting}
                    small>
                    cancel
                  </Button>
                </RNView>
                <RNView className="flex-1">
                  <Button
                    onPress={onEditSave}
                    disabled={
                      editSubmitting ||
                      !editContent.trim() ||
                      (editMaxLength != null && editContent.length > editMaxLength)
                    }
                    small
                    icon={
                      editSubmitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : undefined
                    }>
                    {editSubmitting ? 'forums_saving' : 'forums_save_post'}
                  </Button>
                </RNView>
              </RNView>
            </>
          ) : (
            <ChatMarkdown
              content={post.content}
              textColor={isDark ? '#f8fafc' : '#0f172a'}
            />
          )}
        </RNView>
        {!editing && onReact && reactionIcons.length > 0 ? (
          <ForumPostReactions
            icons={reactionIcons}
            reactions={reactions ?? emptyReactions()}
            onReact={onReact}
            submittingIconId={submittingReactionIconId}
            error={reactionError}
          />
        ) : null}
      </RNView>
    </RNView>
  )
}

type ForumTopicHeaderProps = {
  detail: ForumTopicDetail
  canReply: boolean
}

export function ForumTopicHeader({detail, canReply}: ForumTopicHeaderProps) {
  const {t, i18n} = useTranslation()
  const {colors} = useTheme()
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const {topic, forum, poll} = detail
  const isLocked = (topic.is_locked || forum.is_locked) && !canReply
  const headerIcon = topic.is_locked
    ? 'lock'
    : poll
      ? 'poll'
      : 'comment-text-multiple-outline'
  const dividerColor = isDark
    ? 'rgba(148, 163, 184, 0.2)'
    : 'rgba(148, 163, 184, 0.25)'

  return (
    <RNView
      className="mb-4 py-4"
      style={{
        paddingLeft: 8,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: dividerColor,
      }}>
      <RNView className="flex-row items-start">
        <ForumIconBadge
          icon={headerIcon}
          fg="#1565C0"
          bg={isDark ? 'rgba(21, 101, 192, 0.35)' : 'rgba(21, 101, 192, 0.12)'}
          size={48}
        />
        <RNView className="ml-3 flex-1">
          <Text
            className="text-lg font-bold leading-6"
            style={{color: colors.text}}>
            {topic.title}
          </Text>
          <Text className="mt-1 text-sm font-medium opacity-80">
            {topic.author_name}
          </Text>
          <Text className="mt-0.5 text-xs opacity-60">
            {formatForumDate(topic.created_at, i18n.language)}
          </Text>
        </RNView>
      </RNView>
      <RNView className="mt-3 flex-row flex-wrap gap-2">
        <ForumStatChip
          icon="reply"
          label={t('forums_replies_count', {count: topic.reply_count})}
          fg={FORUM_STAT_COLORS.replies.fg}
          bg={FORUM_STAT_COLORS.replies.bg}
        />
        <ForumStatChip
          icon="eye-outline"
          label={t(
            topic.view_count === 1
              ? 'forums_view_count'
              : 'forums_views_count',
            {count: topic.view_count},
          )}
          fg={FORUM_STAT_COLORS.views.fg}
          bg={FORUM_STAT_COLORS.views.bg}
        />
        {topic.is_pinned ? (
          <ForumStatChip
            icon="pin"
            label={t('forums_pinned')}
            fg={FORUM_STAT_COLORS.pinned.fg}
            bg={FORUM_STAT_COLORS.pinned.bg}
          />
        ) : null}
        {topic.is_hidden ? (
          <ForumStatChip
            icon="eye-off-outline"
            label={t('forums_hidden')}
            fg={FORUM_STAT_COLORS.locked.fg}
            bg={FORUM_STAT_COLORS.locked.bg}
          />
        ) : null}
        {isLocked ? (
          <ForumStatChip
            icon="lock"
            label={t('forums_locked_short')}
            fg={FORUM_STAT_COLORS.locked.fg}
            bg={FORUM_STAT_COLORS.locked.bg}
          />
        ) : null}
      </RNView>
      {poll ? <ForumPollResults poll={poll} /> : null}
    </RNView>
  )
}
