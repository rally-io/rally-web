import { useQuery } from '@tanstack/react-query'
import { fetchCorporateEvent, fetchRegistrationStatus, fetchRoster } from './api'
import type { ApiFailure } from './types'

/**
 * `GET /public/corporate-events/{slug}`. `data === null` once settled means "the API has no such
 * event" (404) — the dispatcher then tries the legacy hardcoded registry. Any other failure is an
 * `error` (the dispatcher ALSO falls back on those: a legacy link must keep working while the API
 * is down).
 */
export function useCorporateEventConfig(slug: string | undefined) {
  return useQuery({
    queryKey: ['corporate-event', slug],
    queryFn: () => fetchCorporateEvent(slug ?? ''),
    enabled: Boolean(slug),
    staleTime: 30_000,
    // No automatic retry: a 404 is an answer, and on any other failure the dispatcher falls back to the
    // legacy registry at once (or offers a retry button) instead of holding a legacy link behind a backoff.
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export function useRegistrationStatus(registrationId: string | undefined, token: string | undefined) {
  return useQuery({
    queryKey: ['corporate-registration', registrationId],
    queryFn: () => fetchRegistrationStatus(registrationId ?? '', token ?? ''),
    enabled: Boolean(registrationId && token),
    retry: (count, error) => {
      const status = (error as unknown as ApiFailure | null)?.status
      return !(status === 401 || status === 403 || status === 404) && count < 1
    },
    refetchOnWindowFocus: false,
  })
}

export function useRoster(rosterToken: string | undefined) {
  return useQuery({
    queryKey: ['corporate-roster', rosterToken],
    queryFn: () => fetchRoster(rosterToken ?? ''),
    enabled: Boolean(rosterToken),
    retry: false,
    refetchOnWindowFocus: false,
  })
}
