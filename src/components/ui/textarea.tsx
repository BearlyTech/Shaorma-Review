import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-md border border-ink/15 bg-white/80 px-3 py-2 text-sm outline-none ring-paprika/30 placeholder:text-ink/40 focus:border-paprika focus:ring-2',
        className,
      )}
      {...props}
    />
  )
}
