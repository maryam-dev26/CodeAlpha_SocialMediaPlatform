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
import { protect } from '../middleware/authMiddleware.js'
import { validateRequestOrigin } from '../middleware/validateRequestOrigin.js'

const router = Router()

router.use(validateRequestOrigin)

// Public: guests can read the feed
router.get('/', listPosts)
router.get('/:postId/comments', listComments)

// Authentication (protect) runs first; ownership is checked inside the controller
router.post('/', protect, createPost)
router.patch('/:id', protect, updatePost)
router.delete('/:id', protect, deletePost)
router.post('/:postId/comments', protect, createComment)
router.delete('/:postId/comments/:commentId', protect, deleteComment)

export default router