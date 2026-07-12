// Shared PocketBase record types, mirroring pb/pb_migrations (see also
// docs/plans/03-record-types.md for the adoption plan).
//
// Conventions: PB serializes empty text/relation fields as '', numbers as 0,
// bools as false — no null/undefined in payloads. JSON fields arrive parsed
// in the JS SDK. Dates are 'YYYY-MM-DD HH:mm:ss.SSSZ' strings.

type PBDate = string

type BaseRecord = {
  id: string
  created: PBDate
  updated: PBDate
}

export type SessionStatus = 'waiting' | 'playing' | 'finished'
export type SessionMode = 'classic' | 'autonomous'
export type StopMethod = 'vote_unanimous' | 'host_choice'

export type SessionSettings = {
  max_buzz_attempts?: number
  rebuzz_delay?: number
  auto_reject_delay?: number
  continue_after_success?: boolean
  stop_method?: StopMethod
  force_equity?: boolean
  equity_margin?: number
  default_playback_duration?: number
}

export type SessionRecord = BaseRecord & {
  name: string
  slug: string
  status: SessionStatus
  host: string // relation → players
  irl_mode: boolean
  dj_player: string
  dj_candidate: string
  owner: string // relation → users
  settings: SessionSettings
  host_candidate: string
  paused: boolean
  mode: SessionMode
  playlist: string // relation → playlists (autonomous only)
}

export type PlayerRecord = BaseRecord & {
  session: string
  name: string
  secret: string
  ready: boolean
  last_seen: PBDate
  auth_user: string // relation → users, '' for guests
  avatar: string // denormalized from users by pb_hooks/player_avatar.pb.js
}

export type TrackStatus = 'queued' | 'playing' | 'done'
export type TrackPhase = 'guessing' | 'answering' | 'voting' | ''

export type TrackRecord = BaseRecord & {
  video: string // relation → videos
  session: string
  start_seconds: number
  added_by: string // relation → players, '' in autonomous mode
  status: TrackStatus
  order: number
  skip_votes: string[] // player ids; JSON field
  solved_by: string // relation → players
  is_duplicate: boolean
  playback_duration: number
  reveal_seconds: number
  skip_revealed: boolean
  phase: TrackPhase // autonomous mode only
  started_at: PBDate // server timestamp of the playing transition
  expand?: { video?: VideoRecord }
}

export type BuzzStatus = 'pending' | 'correct' | 'wrong'

export type BuzzRecord = BaseRecord & {
  player: string
  track: string
  answer: string
  status: BuzzStatus
}

export type VideoRecord = BaseRecord & {
  video_id: string // YouTube id
  title: string
  artist: string
  duration: number
  search_text: string
}

export type AnswerVoteRecord = Omit<BaseRecord, 'updated'> & {
  buzz: string
  voter: string // relation → players
  track: string // denormalized for per-track subscription
  value: boolean
}

export type PlaylistRecord = BaseRecord & {
  owner: string
  name: string
  description: string
  tags: string[] // JSON field
  public: boolean
}

export type PlaylistTrackRecord = BaseRecord & {
  playlist: string
  video: string
  order: number
  start_seconds: number
  playback_duration: number
  reveal_seconds: number
  expand?: { video?: VideoRecord }
}

export type FavoriteRecord = BaseRecord & {
  user: string
  video: string
  discovered_from_name: string
  discovered_from_user: string
  session_name: string
  guessed_right: boolean
  start_seconds: number
  expand?: { video?: VideoRecord }
}
