import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useDrawerSide } from '@/hooks/useMediaQuery'
import { useReturnFocus } from '@/hooks/useReturnFocus'
import { cn } from '@/lib/utils'

/** The deck's drawers (matches, search): from the bottom on a phone, from the end side on a
    wider screen. Escape, the overlay and the close button all call onClose; closing gives focus
    back to what opened it. */
export function PartnerDrawer({
  open,
  title,
  onClose,
  testId,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  testId: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  const side = useDrawerSide()
  const returnFocus = useReturnFocus()
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        {...returnFocus}
        side={side}
        closeLabel={t('partners.close')}
        aria-describedby={undefined}
        data-testid={testId}
        className={cn('border-rally-border bg-rally-surface', side === 'bottom' && 'h-[85dvh]')}
      >
        <SheetHeader className="border-rally-border pe-16">
          <SheetTitle dir="auto" className="text-rally-text">
            {title}
          </SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
