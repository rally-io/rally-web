import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { BlockIcon } from './BlockIcon'
import { EXPLAINER_BLOCKS } from './explainerBlocks'

export interface LevelExplainerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LevelExplainerSheet({ open, onOpenChange }: LevelExplainerSheetProps) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose className="flex w-full flex-col bg-rally-surface sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-xl font-black text-rally-text">{t('level.explainer.title')}</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex-1 overflow-y-auto">
          <ol className="flex flex-col gap-5">
            {EXPLAINER_BLOCKS.map((block) => (
              <li key={block.key} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rally-surface-2">
                  <BlockIcon icon={block.icon} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-rally-text">{t(`level.explainer.${block.key}.title`)}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-rally-text-2">{t(`level.explainer.${block.key}.body`, block.values)}</p>
                </div>
              </li>
            ))}
          </ol>
        </SheetBody>
        <SheetFooter className="gap-2 sm:justify-between">
          <Link
            to="/level"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center justify-center rounded-full border border-rally-border px-5 text-sm font-semibold text-rally-text"
          >
            {t('level.explainer.readMore')}
          </Link>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 items-center justify-center rounded-full bg-rally-accent px-5 text-sm font-bold text-rally-accent-text hover:bg-rally-accent-hover"
          >
            {t('level.explainer.close')}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
