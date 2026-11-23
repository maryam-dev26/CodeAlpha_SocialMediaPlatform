import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import PostCard from '../components/post/PostCard.tsx'
import PostForm from '../components/post/PostForm.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import { deletePost, getPosts } from '../services/postService.ts'
import type { Pagination, Post, PostType } from '../types/post.ts'
import { parseApiError } from '../utils/formErrors.ts'
import { postTypes, postTypeLabels } from '../utils/postTypes.ts'

const PAGE_SIZE = 10

type TypeFilter = PostType | 'all'

const FILTERS: TypeFilter[] = ['all', ...postTypes]

export default function FeedPage() {
  const { user } = useAuth()

  const [filter, setFilter] = useState<TypeFilter>('all')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)

  const [posts, setPosts] = useState<Post[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    setIsLoading(true)
    setError('')

    getPosts({
      page,
      limit: PAGE_SIZE,
      type: filter === 'all' ? undefined : filter,
    })
      .then((data) => {
        if (!ignore) {
          setPosts(data.posts)
          setPagination(data.pagination)
        }
      })
      .catch((caught) => {
        if (!ignore) {
          setError(parseApiError(caught).message)
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [filter, page, reloadKey])

  const changeFilter = (next: TypeFilter) => {
    setFilter(next)
    setPage(1)
  }

  const handleCreated = () => {
    setPage(1)
    setReloadKey((key) => key + 1)
  }

  const handleUpdated = () => {
    setReloadKey((key) => key + 1)
  }

  const handleDelete = async (post: Post) => {
    if (!window.confirm('Delete this post? This cannot be undone.')) {
      return
    }

    try {
      await deletePost(post.id)

      if (posts.length === 1 && page > 1) {
        setPage(page - 1)
      }

      setReloadKey((key) => key + 1)
    } catch (caught) {
      setError(parseApiError(caught).message)
    }
  }

  const totalPages = pagination?.totalPages ?? 1

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      {user ? (
        <PostForm onCreated={handleCreated} />
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm">
          <Link to="/login" className="font-medium text-teal-700 hover:underline">
            Log in
          </Link>{' '}
          or{' '}
          <Link to="/register" className="font-medium text-teal-700 hover:underline">
            create an account
          </Link>{' '}
          to share a post.
        </p>
      )}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter posts by type">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => changeFilter(value)}
            aria-pressed={filter === value}
            className={`rounded-full border px-3 py-1 text-sm ${
              filter === value
                ? 'border-teal-700 bg-teal-700 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {value === 'all' ? 'All posts' : postTypeLabels[value]}
          </button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-center text-slate-500">Loading posts…</p>
      ) : posts.length === 0 ? (
        <p className="text-center text-slate-500">
          No posts here yet. Be the first to share something.
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canEdit={user?.id === post.author.id}
              // Compare ids: only the author sees the Delete button
              canDelete={user?.id === post.author.id}
              onUpdated={handleUpdated}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between" aria-label="Pagination">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || isLoading}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || isLoading}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  )
}