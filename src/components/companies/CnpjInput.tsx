'use client'

import { useState } from 'react'
import { formatCnpjDisplay, validateCnpj } from '@/lib/companies/cnpj'
import { normalizeCnpj } from '@/lib/companies/normalize'

interface Props {
  defaultValue?: string | null
  required?: boolean
}

export function CnpjInput({ defaultValue, required = true }: Props) {
  const initial = defaultValue ? formatCnpjDisplay(defaultValue) : ''
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  function handleBlur() {
    setTouched(true)
    const msg = validateCnpj(value)
    setError(msg)
    if (!msg && value) {
      setValue(formatCnpjDisplay(normalizeCnpj(value)))
    }
  }

  function handleChange(v: string) {
    setValue(v)
    if (touched) setError(validateCnpj(v))
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor="cnpj" className="block text-sm font-medium text-zinc-700">
        CNPJ {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id="cnpj"
        name="cnpj"
        required={required}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="00.000.000/0000-00"
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={Boolean(error)}
        className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-sm ${
          error ? 'border-red-400 focus:border-red-500' : 'border-zinc-300 focus:border-zinc-900'
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && touched && value && (
        <p className="text-xs text-emerald-700">CNPJ válido.</p>
      )}
    </div>
  )
}
