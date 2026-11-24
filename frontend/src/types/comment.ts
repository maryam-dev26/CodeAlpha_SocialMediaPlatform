export interface CommentAuthor {
  id: string
  name: string
  username: string
  avatarUrl: string
}

export interface Comment {
  id: string
  content: string
  author: CommentAuthor
  createdAt: string
}

export interface CommentListResponse {
  comments: Comment[]
}

export interface CreateCommentInput {
  content: string
}

export interface CommentResponse {
  message: string
  comment: Comment
}