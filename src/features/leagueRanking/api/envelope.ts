import type { TypeOf, ZodTypeAny } from 'zod';
import { ApiEnvelopeSchema, type LeagueFetch } from '../types';

/** A league call that reached the server and came back refused or unusable. */
export class LeagueApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeagueApiError';
  }
}

/**
 * Unwrap `{ success, data, error }` and parse the payload, throwing if the call
 * did not succeed. `error` is a plain string on this API, not `{ code, message }`.
 */
export function unwrapLeagueData<S extends ZodTypeAny>(raw: unknown, schema: S): TypeOf<S> {
  const envelope = ApiEnvelopeSchema.parse(raw);
  if (!envelope.success) {
    throw new LeagueApiError(envelope.error ?? 'The league API returned an unsuccessful response');
  }
  return schema.parse(envelope.data);
}

/**
 * As above, but for the two endpoints where HTTP 200 with `success: false` is
 * the API's way of saying "there is no active season".
 *
 * That is a valid answer to a valid request, not a failure, so it comes back in
 * the data channel: a caller must be able to tell it apart both from an error
 * and from an empty table, which would wrongly claim "nobody is ranked". The
 * branch keys on the flag, never on the message text. On these endpoints every
 * genuine refusal (frame=circle, a missing band) is an HTTP 4xx, which axios
 * has already turned into a rejection before this function runs.
 */
export function unwrapSeasonalLeagueData<S extends ZodTypeAny>(
  raw: unknown,
  schema: S,
): LeagueFetch<TypeOf<S>> {
  const envelope = ApiEnvelopeSchema.parse(raw);
  if (!envelope.success) {
    return { kind: 'no-active-season', message: envelope.error ?? 'No active season' };
  }
  return { kind: 'ok', data: schema.parse(envelope.data) };
}
