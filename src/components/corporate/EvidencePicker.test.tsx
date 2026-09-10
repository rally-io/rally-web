import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@/i18n'
import { EvidencePicker } from './EvidencePicker'

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type })
}

describe('EvidencePicker', () => {
  it('picks two valid files and reports them via onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onError = vi.fn()
    render(
      <EvidencePicker id="ev-1" label="My evidence" files={[]} onChange={onChange} onError={onError} />,
    )
    const f1 = makeFile('id.jpg', 'image/jpeg')
    const f2 = makeFile('bill.pdf', 'application/pdf')

    await user.upload(screen.getByLabelText('My evidence'), [f1, f2])

    expect(onChange).toHaveBeenCalledWith([f1, f2])
    expect(onError).not.toHaveBeenCalled()
  })

  it('rejects a third file as evidenceTooMany and does not call onChange', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onError = vi.fn()
    const existing = [makeFile('a.jpg', 'image/jpeg'), makeFile('b.jpg', 'image/jpeg')]
    render(
      <EvidencePicker id="ev-2" label="My evidence" files={existing} onChange={onChange} onError={onError} />,
    )

    await user.upload(screen.getByLabelText('My evidence'), makeFile('c.jpg', 'image/jpeg'))

    expect(onError).toHaveBeenCalledWith('evidenceTooMany')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('rejects a non-accepted file type as evidenceBadFile and does not call onChange', async () => {
    // The real `accept` attribute is only a picker hint — a user can still supply a
    // mismatched file (drag-drop, "All Files"), which is exactly what the app's own
    // validateEvidenceFiles check guards against. `applyAccept: false` disables
    // user-event's own accept-based filtering so that path gets exercised here.
    const user = userEvent.setup({ applyAccept: false })
    const onChange = vi.fn()
    const onError = vi.fn()
    render(
      <EvidencePicker id="ev-3" label="My evidence" files={[]} onChange={onChange} onError={onError} />,
    )

    await user.upload(screen.getByLabelText('My evidence'), makeFile('note.txt', 'text/plain'))

    expect(onError).toHaveBeenCalledWith('evidenceBadFile')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes a chip via its remove button', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const f1 = makeFile('a.jpg', 'image/jpeg')
    const f2 = makeFile('b.jpg', 'image/jpeg')
    render(
      <EvidencePicker id="ev-4" label="My evidence" files={[f1, f2]} onChange={onChange} onError={vi.fn()} />,
    )
    expect(screen.getByText('a.jpg')).toBeInTheDocument()
    expect(screen.getByText('b.jpg')).toBeInTheDocument()

    const removeButtons = screen.getAllByRole('button', { name: 'Remove file' })
    expect(removeButtons).toHaveLength(2)
    await user.click(removeButtons[0])

    expect(onChange).toHaveBeenCalledWith([f2])
  })

  it('disables the pick button and the file input when disabled', () => {
    render(
      <EvidencePicker id="ev-5" label="My evidence" files={[]} onChange={vi.fn()} onError={vi.fn()} disabled />,
    )
    expect(screen.getByRole('button', { name: 'Choose files' })).toBeDisabled()
    expect(screen.getByLabelText('My evidence')).toBeDisabled()
  })

  // M5 — the hidden file input is visible to assistive tech (needed for
  // Field's htmlFor / getByLabelText) but must not be a phantom tab stop
  // ahead of the visible "Choose files" button.
  it('excludes the hidden file input from the tab order', () => {
    render(
      <EvidencePicker id="ev-7" label="My evidence" files={[]} onChange={vi.fn()} onError={vi.fn()} />,
    )
    expect(screen.getByLabelText('My evidence')).toHaveAttribute('tabIndex', '-1')
  })

  it('renders the error message through Field as an alert', () => {
    render(
      <EvidencePicker
        id="ev-6"
        label="My evidence"
        files={[]}
        onChange={vi.fn()}
        onError={vi.fn()}
        error="Something is wrong"
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Something is wrong')
  })
})
