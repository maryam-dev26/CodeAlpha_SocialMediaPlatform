import mongoose from 'mongoose'

export const POST_TYPES = ['journey', 'help', 'showcase', 'resource']

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: {
        values: POST_TYPES,
        message: `Post type must be one of: ${POST_TYPES.join(', ')}`,
      },
      required: [true, 'Post type is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
  },
  {
    timestamps: true,
  },
)

postSchema.index({ createdAt: -1 })
postSchema.index({ type: 1, createdAt: -1 })

export default mongoose.model('Post', postSchema)