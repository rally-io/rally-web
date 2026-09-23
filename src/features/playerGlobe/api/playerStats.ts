import { z } from 'zod'
import client from '@/services/api/client'
import type { ApiResponse } from '@/types/api'

/* The public career block — the same eight fields the league player page shows. */
export const publicPlayerStatsSchema = z.object({
  matches_played: z.number().int().nonnegative(),
  matches_won: z.number().int().nonnegative(),
  matches_lost: z.number().int().nonnegative(),
  win_rate: z.number().int().min(0).max(100),
  current_streak: z.number().int().nonnegative(),
  best_streak: z.number().int().nonnegative(),
  tournaments_played: z.number().int().nonnegative(),
  tournaments_won: z.number().int().nonnegative(),
})
export type PublicPlayerStats = z.infer<typeof publicPlayerStatsSchema>

export const skillPointSchema = z.object({ skill_level: z.number(), recorded_at: z.string() })
export type SkillPoint = z.infer<typeof skillPointSchema>

const partnerSummarySchema = z.object({
  player_id: z.string(),
  display_name: z.string(),
  avatar_url: z.string().nullish(),
  matches_played: z.number().int().nonnegative(),
})
const clubSummarySchema = z.object({
  club_id: z.string(),
  name: z.string(),
  logo_url: z.string().nullish(),
  matches_played: z.number().int().nonnegative(),
})

/* The mobile app's stats payload — signed-in and in-network only (spec B6.1). */
export const fullPlayerStatsSchema = publicPlayerStatsSchema.extend({
  skill_history: z.array(skillPointSchema),
  top_partners: z.array(partnerSummarySchema),
  top_clubs: z.array(clubSummarySchema),
})
export type FullPlayerStats = z.infer<typeof fullPlayerStatsSchema>

const unwrap = <T>(res: ApiResponse<unknown>, schema: z.ZodType<T>): T => {
  if (!res.success) throw new Error(res.error.message)
  return schema.parse(res.data)
}

export async function fetchPublicPlayerStats(playerId: string): Promise<PublicPlayerStats> {
  const res = (await client.get(`/public/players/${playerId}/stats`, {
    headers: { 'X-Skip-Auth': '1' },
  })) as ApiResponse<unknown>
  return unwrap(res, publicPlayerStatsSchema)
}

/** Rejects on 404 — the caller maps that to "not visible" rather than an error. The
    client's interceptor takes two different shapes to a 404 here depending on the
    response body: a bare 404 becomes `{ status: 404, isNotFound: true, ... }`, but this
    endpoint's actual handler returns an enveloped `{ success: false, error: "..." }`
    body, which the interceptor's envelope branch catches first and rejects with
    `{ status: 404, code, message }` — no `isNotFound` key. `isNotFound()` below checks
    both. */
export async function fetchFullPlayerStats(playerId: string): Promise<FullPlayerStats> {
  const res = (await client.get(`/rally/v1/players/${playerId}/stats`)) as ApiResponse<unknown>
  return unwrap(res, fullPlayerStatsSchema)
}

const socialProfileSchema = z.object({ relationship: z.object({ is_following: z.boolean() }) })

export async function fetchSocialProfile(playerId: string): Promise<{ isFollowing: boolean }> {
  const res = (await client.get(`/rally/v1/social/profile/${playerId}`)) as ApiResponse<unknown>
  const profile = unwrap(res, socialProfileSchema)
  return { isFollowing: profile.relationship.is_following }
}

export async function followPlayer(playerId: string): Promise<void> {
  const res = (await client.post(`/rally/v1/social/follow/${playerId}`)) as ApiResponse<unknown>
  if (!res.success) throw new Error(res.error.message)
}

export async function unfollowPlayer(playerId: string): Promise<void> {
  const res = (await client.delete(`/rally/v1/social/follow/${playerId}`)) as ApiResponse<unknown>
  if (!res.success) throw new Error(res.error.message)
}

export const isNotFound = (err: unknown): boolean => {
  if (typeof err !== 'object' || err === null) return false
  const e = err as { isNotFound?: boolean; status?: number }
  return e.isNotFound === true || e.status === 404
}
