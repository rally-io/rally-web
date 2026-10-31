import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PartnerDrawer } from './PartnerDrawer'

/* The drawers open from deck state, not from a Radix Trigger, so Radix has nothing to hand focus
   back to on close. */

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <PartnerDrawer open={open} title="Your matches" onClose={() => setOpen(false)} testId="drawer">
        <p>body</p>
      </PartnerDrawer>
    </>
  )
}

describe('PartnerDrawer', () => {
  it('gives focus back to the button that opened it when it closes', async () => {
    render(<Harness />)
    const opener = screen.getByRole('button', { name: 'Open' })
    opener.focus()
    fireEvent.click(opener)
    await screen.findByTestId('drawer')
    await waitFor(() => expect(opener).not.toHaveFocus())

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByTestId('drawer')).toBeNull())
    await waitFor(() => expect(opener).toHaveFocus())
  })
})
