/**
 * Map a Settings pathname to an i18n title key.
 * Used on iOS where Stack-in-Stack only paints the root header.
 */
export function settingsHeaderTitleKey(pathname: string): string {
  const path = pathname.replace(/\/$/, '') || '/Settings'
  if (path === '/Settings') return 'settings'

  const rules: Array<[string, string]> = [
    ['/Settings/Forums', 'forums'],
    ['/Settings/Support', 'support'],
    ['/Settings/Announcements', 'announcements'],
    ['/Settings/Achievements', 'achievements'],
    ['/Settings/Weeklies', 'weeklies'],
    ['/Settings/CueChat', 'ai_assistant'],
    ['/Settings/Admin', 'admin'],
    ['/Settings/CoinFlip', 'coin_flip'],
    ['/Settings/Info', 'info_and_guides'],
    ['/Settings/Venues', 'venues'],
    ['/Settings/Players', 'players'],
    ['/Settings/Betting', 'betting_settings'],
    ['/Settings/Predictions', 'predictions_settings'],
    ['/Settings/Preferences/ProfileQr', 'my_qr_code'],
    ['/Settings/Preferences/ClaimProfile', 'claim_existing_player'],
    ['/Settings/Preferences', 'preferences'],
    ['/Settings/ProfileClaims', 'admin_player_claims'],
    ['/Settings/Admin/PlayerClaims', 'admin_player_claims'],
    ['/Settings/Teams', 'teams'],
    ['/Settings/Tournaments', 'tournaments'],
    ['/Settings/RegisterTeam', 'register_team'],
    ['/Settings/MatchScreen', 'match'],
  ]

  for (const [prefix, key] of rules) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return key
    }
  }
  return 'settings'
}
