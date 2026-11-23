import mongoose from 'mongoose'

import Comment from '../models/Comment.js'
import Post from '../models/Post.js'
import { createCommentSchema } from '../validators/commentValidator.js'

const authorFields = 'name username avatarUrl'

const validationErrorResponse = (error) => ({
  message: 'Validation failed',
  errors: error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  })),
})

const toCommentResponse = (comment) => {
  const source =
    typeof comment.toObject === 'function' ? comment.toObject() : comment

  return {
    id: source._id.toString(),
    content: source.content,
    author: {
      id: source.author._id.toString(),
      name: source.author.name,
      username: source.author.username,
      avatarUrl: source.author.avatarUrl,
    },
    createdAt: source.createdAt,
  }
}

const postNotFound = (res) => res.status(404).json({ message: 'Post not found' })
const commentNotFound = (res) =>
  res.status(404).json({ message: 'Comment not found' })

export const listComments = async (req, res) => {
  const { postId } = req.params

  if (!mongoose.isValidObjectId(postId)) {
    return postNotFound(res)
  }

  try {
    const post = await Post.findById(postId)

    if (!post) {
      return postNotFound(res)
    }

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1, _id: 1 })
      .populate('author', authorFields)
      .lean()

    return res.status(200).json({
      comments: comments.map(toCommentResponse),
    })
  } catch (error) {
    console.error('listComments error:', error)
    return res.status(500).json({ message: 'Could not load comments' })
  }
}

export const createComment = async (req, res) => {
  const result = createCommentSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json(validationErrorResponse(result.error))
  }

  const { postId } = req.params

  if (!mongoose.isValidObjectId(postId)) {
    return postNotFound(res)
  }

  try {
    const post = await Post.findById(postId)

    if (!post) {
      return postNotFound(res)
    }

    const comment = await Comment.create({
      ...result.data,
      post: postId,
      author: req.user.id,
    })
    await comment.populate('author', authorFields)

    return res.status(201).json({
      message: 'Comment created',
      comment: toCommentResponse(comment),
    })
  } catch (error) {
    console.error('createComment error:', error)
    return res.status(500).json({ message: 'Could not create comment' })
  }
}

export const deleteComment = async (req, res) => {
  const { postId, commentId } = req.params
  const isValidPostId = mongoose.isValidObjectId(postId)
  const isValidCommentId = mongoose.isValidObjectId(commentId)

  if (!isValidPostId || !isValidCommentId) {
    return commentNotFound(res)
  }

  try {
    const post = await Post.findById(postId)

    if (!post) {
      return postNotFound(res)
    }

    const comment = await Comment.findOne({ _id: commentId, post: postId })

    if (!comment) {
      return commentNotFound(res)
    }

    const userId = req.user.id.toString()
    const isCommentAuthor = comment.author.toString() === userId
    const isPostAuthor = post.author.toString() === userId

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ message: 'You cannot delete this comment' })
    }

    await comment.deleteOne()

    return res.status(200).json({ message: 'Comment deleted' })
  } catch (error) {
    console.error('deleteComment error:', error)
    return res.status(500).json({ message: 'Could not delete comment' })
  }
}
