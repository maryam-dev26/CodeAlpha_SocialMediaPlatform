const toSafeUser = (user) => {
  const source = typeof user.toObject === 'function' ? user.toObject() : user

  return {
    id: source._id ? source._id.toString() : source.id,
    name: source.name,
    username: source.username,
    email: source.email,
    bio: source.bio,
    avatarUrl: source.avatarUrl,
    skills: source.skills,
    interests: source.interests,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}

export { toSafeUser }
