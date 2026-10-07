import { isAxiosError } from 'axios';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchPublicBracket } from '../api/publicBracket';
import { toLiveBoard } from '../americano';
import type { PublicBracketData } from '../types';

const POLL_INTERVAL = parseInt(import.meta.env.VITE_POLL_INTERVAL ?? '10000', 10);

type UsePublicBracketResult = {
    bracket: PublicBracketData | null;
    isLoading: boolean;
    isExpired: boolean;
    isHardError: boolean;
    isReconnecting: boolean;
    updatedAt: Date | null;
};

export function usePublicBracket(token: string | undefined): UsePublicBracketResult {
    const query = useQuery({
        queryKey: ['public-bracket', token],
        queryFn: () => fetchPublicBracket(token ?? ''),
        enabled: Boolean(token),
        refetchInterval: POLL_INTERVAL,
        placeholderData: keepPreviousData,
        // An Americano is drawn with the league's layout; every other bracket passes through as
        // the same object. Module-level, so TanStack re-runs it only when the data changes.
        select: toLiveBoard,
        retry: 1,
    });
    const httpStatus = isAxiosError(query.error) ? query.error.response?.status : undefined;
    return {
        bracket: query.data ?? null,
        isLoading: query.isPending,
        isExpired: query.isError && !query.data && (httpStatus === 404 || httpStatus === 403),
        isHardError: query.isError && !query.data,
        isReconnecting: query.isError && Boolean(query.data),
        updatedAt: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
    };
}
