import { useParams } from 'react-router-dom'
import { getCorporateEvent } from '@/constants/corporateEvents'
import CorporateSignupPage from './CorporateSignupPage'
import CorporateRegistrationPage from './CorporateRegistrationPage'

/**
 * /join/:slug — one private link per corporate event, two kinds of page behind it.
 * Lead mode is the original sheet-backed signup; tournament mode registers and
 * pays on a real tournament. An unknown slug falls through to the lead page,
 * which renders the not-found card without confirming which slugs exist.
 */
export default function CorporateEventPage() {
  const { slug } = useParams<{ slug: string }>()
  const event = getCorporateEvent(slug)
  if (event?.mode === 'tournament') return <CorporateRegistrationPage event={event} />
  return <CorporateSignupPage />
}
