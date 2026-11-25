export type PostType = 'journey' | 'help' | 'showcase' | 'resource'

export interface PostAuthor {
  id: string
  name: string
  username: string
  avatarUrl: string
}

export interface Post {
  id: string
  type: PostType
  title: string
  content: string
  author: PostAuthor
  createdAt: string
  updatedAt: string
  likeCount: number
  likedByMe: boolean
}

export interface LikeResponse {
  liked: boolean
  likeCount: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PostListResponse {
  posts: Post[]
  pagination: Pagination
}

export interface PostResponse {
  message: string
  post: Post
}

export interface CreatePostInput {
  type: PostType
  title: string
  content: string
}

export interface UpdatePostInput {
  title: string
  content: string
}