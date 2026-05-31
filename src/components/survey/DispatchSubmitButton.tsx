'use client'

import { useFormStatus } from 'react-dom'

interface Props {
  children: React.ReactNode
  disabled?: boolean
  className?: string
}

function SubmitInner({ children, disabled, className }: Props) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={disabled || pending} className={className}>
      {pending ? 'Enviando…' : children}
    </button>
  )
}

export function DispatchSubmitButton(props: Props) {
  return <SubmitInner {...props} />
}
