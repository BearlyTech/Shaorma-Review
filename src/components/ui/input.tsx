import type { InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-md border border-ink/15 bg-white/80 px-3 text-sm outline-none ring-paprika/30 placeholder:text-ink/40 focus:border-paprika focus:ring-2',
        className,
      )}
      {...props}
    />
  )
}
