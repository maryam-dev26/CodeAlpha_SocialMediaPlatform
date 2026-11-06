const mongoose = require('mongoose')

const EMAIL_PATTERN =
  /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/

const tagValidator = {
  validator: (tags) =>
  tags.every((tag) => tag.trim().length > 0 && tag.trim().length <= 30),
  message: 'Each tag must be between 1 and 30 characters',
}

const tagArrayValidator = {
  validator: (tags) => tags.length <= 20,
  message: 'A user can have at most 20 entries',
}

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [USERNAME_PATTERN, 'Username may only contain letters, numbers, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
      match: [EMAIL_PATTERN, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [128, 'Password cannot exceed 128 characters'],
      select: false,
    },
    bio: {
      type: String,
      trim: true,
      default: '',
      maxlength: [280, 'Bio cannot exceed 280 characters'],
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2048, 'Avatar URL cannot exceed 2048 characters'],
    },
    skills: {
      type: [String],
      default: [],
      validate: [tagValidator, tagArrayValidator],
    },
    interests: {
      type: [String],
      default: [],
      validate: [tagValidator, tagArrayValidator],
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model('User', userSchema)
