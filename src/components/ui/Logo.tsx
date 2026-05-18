import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const imgClasses = {
    sm: 'w-9 h-9',
    md: 'w-11 h-11 md:w-12 md:h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  }

  const titleClasses = {
    sm: 'text-lg',
    md: 'text-2xl md:text-[28px]',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 md:gap-3 rtl:flex-row-reverse',
        className,
      )}
    >
      <div
        className={cn(
          'rounded-xl overflow-hidden flex-shrink-0 border border-white/10 shadow-md',
          imgClasses[size],
        )}
      >
        <img
          src="/rally-logo.jpg"
          alt="Rally Logo"
          className="w-full h-full object-cover"
        />
      </div>
      {showText && (
        <div className="flex flex-col leading-none" dir="ltr">
          <span
            className={cn(
              'font-display font-black tracking-tight text-rally-accent leading-none',
              titleClasses[size],
            )}
          >
            Rally
          </span>
          {size !== 'sm' && (
            <span className="mt-1.5 text-[10px] md:text-[11px] uppercase font-bold tracking-wider text-rally-text-muted leading-none whitespace-nowrap">
              Less Admin,{' '}
              <span className="text-rally-accent">More Padel.</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
