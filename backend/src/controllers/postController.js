import mongoose from 'mongoose'

import Comment from '../models/Comment.js'
import Post from '../models/Post.js'
import {
  createPostSchema,
  listPostsQuerySchema,
  updatePostSchema,
} from '../validators/postValidator.js'

const validationErrorResponse = (error) => ({
  message: 'Validation failed',
  errors: error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  })),
})

const AUTHOR_FIELDS = 'name username avatarUrl'

const toPostResponse = (post) => {
  const source = typeof post.toObject === 'function' ? post.toObject() : post

  return {
    id: source._id.toString(),
    type: source.type,
    title: source.title,
    content: source.content,
    author: {
      id: source.author._id.toString(),
      name: source.author.name,
      username: source.author.username,
      avatarUrl: source.author.avatarUrl,
    },
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}

const postNotFound = (res) => res.status(404).json({ message: 'Post not found' })

const isUsableId = (id) => mongoose.isValidObjectId(id)

export const createPost = async (req, res) => {
  const result = createPostSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json(validationErrorResponse(result.error))
  }

  try {
    const post = await Post.create({ ...result.data, author: req.user.id })
    await post.populate('author', AUTHOR_FIELDS)

    return res.status(201).json({
      message: 'Post created',
      post: toPostResponse(post),
    })
  } catch (error) {
    console.error('createPost error:', error)
    return res.status(500).json({ message: 'Could not create post' })
  }
}

// Public: guests can read the feed.
export const listPosts = async (req, res) => {
  const result = listPostsQuerySchema.safeParse(req.query)

  if (!result.success) {
    return res.status(400).json(validationErrorResponse(result.error))
  }

  const { page, limit, type } = result.data
  const filter = type ? { type } : {}

  try {
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('author', AUTHOR_FIELDS)
        .lean(),
      Post.countDocuments(filter),
    ])

    return res.status(200).json({
      posts: posts.map(toPostResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('listPosts error:', error)
    return res.status(500).json({ message: 'Could not load posts' })
  }
}

export const updatePost = async (req, res) => {
  if (!isUsableId(req.params.id)) {
    return postNotFound(res)
  }

  const result = updatePostSchema.safeParse(req.body)

  if (!result.success) {
    return res.status(400).json(validationErrorResponse(result.error))
  }

  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return postNotFound(res)
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own posts' })
    }

    post.title = result.data.title
    post.content = result.data.content
    await post.save()
    await post.populate('author', AUTHOR_FIELDS)

    return res.status(200).json({
      message: 'Post updated',
      post: toPostResponse(post),
    })
  } catch (error) {
    console.error('updatePost error:', error)
    return res.status(500).json({ message: 'Could not update post' })
  }
}

export const deletePost = async (req, res) => {
  if (!isUsableId(req.params.id)) {
    return postNotFound(res)
  }

  try {
    const post = await Post.findById(req.params.id)

    if (!post) {
      return postNotFound(res)
    }

    // Auhtorization: same ownership rule as updatePost.
    if (post.author.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: 'You can only delete your own posts' })
    }

    await post.deleteOne()
    await Comment.deleteMany({ post: post._id })

    return res.status(200).json({ message: 'Post deleted' })
  } catch (error) {
    console.error('deletePost error:', error)
    return res.status(500).json({ message: 'Could not delete post' })
  }
}