import { apiRequest } from './api.ts'
import type { MessageResponse } from '../types/auth.ts'
import type {
  CommentListResponse,
  CommentResponse,
  CreateCommentInput,
} from '../types/comment.ts'

function getComments(postId: string): Promise<CommentListResponse> {
  return apiRequest<CommentListResponse>(
    `/api/posts/${postId}/comments`,
  )
}

function createComment(
  postId: string,
  input: CreateCommentInput,
): Promise<CommentResponse> {
  return apiRequest<CommentResponse>(
    `/api/posts/${postId}/comments`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  )
}

function deleteComment(
  postId: string,
  commentId: string,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(
    `/api/posts/${postId}/comments/${commentId}`,
    {
      method: 'DELETE',
    },
  )
}

export { getComments, createComment, deleteComment }