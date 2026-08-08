import axios from 'axios';
import { PublicBracketSchema, type PublicBracketData } from '../types';

/**
 * Deliberately NOT the shared `services/api/client.ts` instance: that one attaches a
 * Supabase access token, force-signs-out on 401 and opens the profile modal on 403.
 * This page has no user — the share token in the URL path is the only access control.
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

const publicClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30_000,
});

export async function fetchPublicBracket(token: string): Promise<PublicBracketData> {
    const { data } = await publicClient.get(`/public/tournaments/${token}/bracket`);
    return PublicBracketSchema.parse(data.data ?? data);
}
