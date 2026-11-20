import { apiRequest } from './api.ts'
import type { MessageResponse } from '../types/auth.ts'
import type {
  CreatePostInput,
  PostListResponse,
  PostResponse,
  PostType,
  UpdatePostInput,
} from '../types/post.ts'

interface GetPostsParams {
  page: number
  limit: number
  type?: PostType
}

function getPosts({ page, limit, type }: GetPostsParams): Promise<PostListResponse> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })

  if (type) {
    params.set('type', type)
  }

  return apiRequest<PostListResponse>(`/api/posts?${params.toString()}`)
}

function createPost(input: CreatePostInput): Promise<PostResponse> {
  return apiRequest<PostResponse>('/api/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

function updatePost(id: string, input: UpdatePostInput): Promise<PostResponse> {
  return apiRequest<PostResponse>(`/api/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

function deletePost(id: string): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/api/posts/${id}`, { method: 'DELETE' })
}

export { getPosts, createPost, updatePost, deletePost }