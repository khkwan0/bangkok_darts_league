---
name: release-notes
description: >-
  Persists player-facing release notes for the Bangkok pool and darts leagues
  after a coding task. Use at the end of every completed task that changes
  code in bangkok_pool_league, bangkok_darts_league, or bkkleague_backend,
  including features, bug fixes, and behavior changes. Calls the bkkleague
  MCP tool create_release_note before the final reply.
---

# Release notes

When a task changed product code, persist one release note before the final reply.

## When to write one

Write a note when a player or admin can notice the change: a feature, a bug fix, or a behavior change in the app, website, or API.

Skip it when the task was only a question, a review, a plan, or a change with no user-visible effect (comments, formatting, tests only, or a refactor with the same behavior). If you skip it, say why in one sentence in the final reply.

## How

Call the bkkleague MCP tool `create_release_note` once. Do not insert SQL yourself.

- `title`: one short sentence for players
- `body`: markdown bullets of what changed, written for players
- `kind`: `feature`, `fix`, or `change`
- `audiences`: `all` for every league, web, and app. Otherwise combine `web` and/or `mobile` with `pool` and/or `darts`. A sport tag alone shows on that sport's website and app. A client tag alone shows on that client for both sports. Naming both means both must match.

The tool needs an authenticated admin session on the bkkleague MCP server. If the call is denied, say so in the final reply. Do not write the row another way.

One note per finished task. Do not create a second note for the same change in the same turn.

## Correcting a note

`admin_manage_release_notes` is the full CRUD tool. Actions: `list`, `get`, `create`, `update`, `delete`. `id` is required for get, update, and delete. `update` may change `title`, `body`, `kind`, `audiences`, and `hidden`. `list` includes hidden notes. `delete` removes the row.
