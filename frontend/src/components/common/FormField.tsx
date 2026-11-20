interface FormFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
  autoComplete?: string
}

export default function FormField({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-800">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-2 focus:outline-teal-700 ${
          error ? 'border-red-500' : 'border-slate-300'
        }`}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}