export function fbTrack(event: string, params?: Record<string, any>) {
  if (typeof (window as any).fbq === 'function') {
    (window as any).fbq('track', event, params)
  }
}