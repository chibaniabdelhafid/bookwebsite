

export function useFieldSuggestions() {
  function getHistory(field: string): string[] {
    try { return JSON.parse(localStorage.getItem(`field_history_${field}`) || '[]') } catch { return [] }
  }

  function saveToHistory(field: string, value: string) {
    if (!value.trim()) return
    const prev = getHistory(field)
    const updated = [value.trim(), ...prev.filter(v => v !== value.trim())].slice(0, 8)
    localStorage.setItem(`field_history_${field}`, JSON.stringify(updated))
  }

  function getSuggestions(field: string, current: string): string[] {
    const history = getHistory(field)
    if (!current.trim()) return history
    return history.filter(v => v.toLowerCase().includes(current.toLowerCase()))
  }

  return { saveToHistory, getSuggestions, getHistory }
}