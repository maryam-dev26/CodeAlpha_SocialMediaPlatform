import type { PostType } from '../types/post.ts'

export const postTypes: PostType[] = ['journey', 'help', 'showcase', 'resource']

export const postTypeLabels: Record<PostType, string> = {
  journey: 'Learning journey',
  help: 'Ask for help',
  showcase: 'Project showcase',
  resource: 'Knowledge & resources',
}

export const postTypeStyles: Record<PostType, string> = {
  journey: 'bg-teal-50 text-teal-900',
  help: 'bg-amber-50 text-amber-900',
  showcase: 'bg-indigo-50 text-indigo-900',
  resource: 'bg-slate-100 text-slate-800',
}