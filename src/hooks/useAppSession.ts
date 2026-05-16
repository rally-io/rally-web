import { useContext } from 'react'
import { AppSessionContext } from '@/contexts/AppSessionContext'

export function useAppSession() {
  const ctx = useContext(AppSessionContext)
  if (!ctx) throw new Error('useAppSession must be used inside <AppSessionProvider>')
  return ctx
}
