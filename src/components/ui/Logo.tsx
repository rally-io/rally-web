import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
}

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  }

  const textClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'rounded-xl overflow-hidden shadow-sm flex-shrink-0 border border-slate-700/50',
          sizeClasses[size],
        )}
      >
        <img src="/rally-logo.jpg" alt="Rally Logo" className="w-full h-full object-cover" />
      </div>
      {showText && (
        <div className="flex flex-col">
          <h1
            className={cn('font-bold leading-tight tracking-tight text-electric-green', textClasses[size])}
          >
            Rally
          </h1>
          {size !== 'sm' && (
            <p className="text-[10px] uppercase font-black tracking-[0.2em] leading-none text-slate-400">
              Padel Platform
            </p>
          )}
        </div>
      )}
    </div>
  )
}