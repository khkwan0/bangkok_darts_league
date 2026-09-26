import {StyleSheet} from 'react-native'

export type ForumAccent = {
  fg: string
  bg: string
  border: string
  soft: string
}

export const FORUM_ACCENTS: ForumAccent[] = [
  {
    fg: '#2196F3',
    bg: 'rgba(33, 150, 243, 0.18)',
    border: 'rgba(33, 150, 243, 0.45)',
    soft: 'rgba(33, 150, 243, 0.08)',
  },
  {
    fg: '#4CAF50',
    bg: 'rgba(76, 175, 80, 0.18)',
    border: 'rgba(76, 175, 80, 0.45)',
    soft: 'rgba(76, 175, 80, 0.08)',
  },
  {
    fg: '#9C27B0',
    bg: 'rgba(156, 39, 176, 0.18)',
    border: 'rgba(156, 39, 176, 0.45)',
    soft: 'rgba(156, 39, 176, 0.08)',
  },
  {
    fg: '#FF9800',
    bg: 'rgba(255, 152, 0, 0.18)',
    border: 'rgba(255, 152, 0, 0.45)',
    soft: 'rgba(255, 152, 0, 0.08)',
  },
  {
    fg: '#009688',
    bg: 'rgba(0, 150, 136, 0.18)',
    border: 'rgba(0, 150, 136, 0.45)',
    soft: 'rgba(0, 150, 136, 0.08)',
  },
  {
    fg: '#E91E63',
    bg: 'rgba(233, 30, 99, 0.18)',
    border: 'rgba(233, 30, 99, 0.45)',
    soft: 'rgba(233, 30, 99, 0.08)',
  },
]

export function getForumAccent(index: number): ForumAccent {
  return FORUM_ACCENTS[index % FORUM_ACCENTS.length]!
}

export function forumListCardBorderColor(isDark: boolean, accentBorder?: string) {
  return accentBorder ?? (isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.35)')
}

export function forumListCardStyle(
  cardBackground: string,
  isDark: boolean,
  accentBorder?: string,
) {
  return {
    backgroundColor: cardBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: forumListCardBorderColor(isDark, accentBorder),
  }
}

export const FORUM_STAT_COLORS = {
  topics: {fg: '#2196F3', bg: 'rgba(33, 150, 243, 0.14)'},
  posts: {fg: '#4CAF50', bg: 'rgba(76, 175, 80, 0.14)'},
  activity: {fg: '#9C27B0', bg: 'rgba(156, 39, 176, 0.14)'},
  replies: {fg: '#FF9800', bg: 'rgba(255, 152, 0, 0.14)'},
  views: {fg: '#009688', bg: 'rgba(0, 150, 136, 0.14)'},
  pinned: {fg: '#E91E63', bg: 'rgba(233, 30, 99, 0.14)'},
  locked: {fg: '#F59E0B', bg: 'rgba(245, 158, 11, 0.14)'},
}
