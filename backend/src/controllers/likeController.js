import mongoose from 'mongoose'

import Like from '../models/Like.js'
import Post from '../models/Post.js'

const postNotFound = (res) => res.status(404).json({ message: 'Post not found' })

export const likePost = async (req, res) => {
  const { postId } = req.params

  if (!mongoose.isValidObjectId(postId)) {
    return postNotFound(res)
  }

  try {
    if (!(await Post.exists({ _id: postId }))) {
      return postNotFound(res)
    }

    try {
      await Like.create({ post: postId, user: req.user.id })
    } catch (error) {
      if (error?.code !== 11000) {
        throw error
      }
    }

    const likeCount = await Like.countDocuments({ post: postId })

    return res.status(200).json({ liked: true, likeCount })
  } catch (error) {
    console.error('likePost error:', error)
    return res.status(500).json({ message: 'Could not like post' })
  }
}

export const unlikePost = async (req, res) => {
  const { postId } = req.params

  if (!mongoose.isValidObjectId(postId)) {
    return postNotFound(res)
  }

  try {
    if (!(await Post.exists({ _id: postId }))) {
      return postNotFound(res)
    }

    await Like.deleteOne({ post: postId, user: req.user.id })

    const likeCount = await Like.countDocuments({ post: postId })

    return res.status(200).json({ liked: false, likeCount })
  } catch (error) {
    console.error('unlikePost error:', error)
    return res.status(500).json({ message: 'Could not unlike post' })
  }
}