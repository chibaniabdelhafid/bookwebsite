import { useState } from 'react'
import { useFieldSuggestions } from '../hooks/useFieldSuggestions'

interface Props {
  field: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  style?: React.CSSProperties
  label?: string
}

const inp = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,253,248,0.05)', border: '1.5px solid rgba(232,184,0,0.15)',
  borderRadius: '10px', color: '#FFF8E7', fontSize: '16px',
  outline: 'none', boxSizing: 'border-box' as const, fontFamily: 'inherit',
  transition: 'border-color 0.2s'
}

export default function AutocompleteInput({ field, value, onChange, placeholder, style }: Props) {
  const { getSuggestions, saveToHistory } = useFieldSuggestions()
  const [open, setOpen] = useState(false)
  const suggestions = getSuggestions(field, value)

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => { setOpen(true); e.target.style.borderColor = '#E8B800' }}
        onBlur={e => {
          setTimeout(() => setOpen(false), 150)
          e.target.style.borderColor = 'rgba(232,184,0,0.15)'
          saveToHistory(field, value)
        }}
        placeholder={placeholder}
        style={{ ...inp, ...style }}
      />

      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 999,
          background: '#1A1208', border: '1px solid rgba(232,184,0,0.2)',
          borderRadius: '10px', overflow: 'hidden',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)'
        }}>
          {suggestions.map((s, i) => (
            <div
              key={i}
              onMouseDown={() => { onChange(s); setOpen(false) }}
              style={{
                padding: '9px 14px', cursor: 'pointer',
                color: value && s.toLowerCase().includes(value.toLowerCase())
                  ? '#FFD700' : 'rgba(232,184,0,0.7)',
                fontSize: '13px', transition: 'background 0.15s',
                borderBottom: i < suggestions.length - 1 ? '1px solid rgba(232,184,0,0.06)' : 'none'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(232,184,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              🕐 {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}