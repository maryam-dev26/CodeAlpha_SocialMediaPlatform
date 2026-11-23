import { Router } from 'express'

import {
  createPost,
  deletePost,
  listPosts,
  updatePost,
} from '../controllers/postController.js'
import {
  createComment,
  deleteComment,
  listComments,
} from '../controllers/commentController.js'
import { likePost, unlikePost } from '../controllers/likeController.js'
import { optionalAuth, protect } from '../middleware/authMiddleware.js'
import { validateRequestOrigin } from '../middleware/validateRequestOrigin.js'

const router = Router()

router.use(validateRequestOrigin)

router.get('/', optionalAuth, listPosts)
router.get('/:postId/comments', listComments)

router.post('/', protect, createPost)
router.patch('/:id', protect, updatePost)
router.delete('/:id', protect, deletePost)
router.post('/:postId/comments', protect, createComment)
router.delete('/:postId/comments/:commentId', protect, deleteComment)
router.post('/:postId/like', protect, likePost)
router.delete('/:postId/like', protect, unlikePost)

export default router