import type { RedirectFrom } from '../types/routing.ts'

const defaultDestination = '/'

export function getSafeDestination(from?: RedirectFrom): string {
  if (!from?.pathname) return defaultDestination

  const { pathname, search = '', hash = '' } = from

  const isInAppPath =
    pathname.startsWith('/') &&
    !pathname.startsWith('//') &&
    !pathname.includes('\\')

  return isInAppPath ? `${pathname}${search}${hash}` : defaultDestination
}