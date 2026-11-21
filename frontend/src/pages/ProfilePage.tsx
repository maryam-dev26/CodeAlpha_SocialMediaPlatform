import { useAuth } from '../hooks/useAuth.ts'

export default function ProfilePage() {
  const { user } = useAuth()

  if (!user) return null

  const createdAt = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
        <p className="mt-1 text-sm text-slate-600">@{user.username}</p>
        <p className="mt-3 text-sm text-slate-700">{user.email}</p>
        <p className="mt-2 text-sm text-slate-500">Joined {createdAt}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">About</h2>
        <p className="mt-2 whitespace-pre-wrap text-slate-700">
          {user.bio.trim() || 'No bio added yet.'}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Skills</h2>
        {user.skills.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {user.skills.map((skill) => (
              <li
                key={skill}
                className="rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-800"
              >
                {skill}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No skills added yet.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Interests</h2>
        {user.interests.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <li
                key={interest}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
              >
                {interest}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No interests added yet.</p>
        )}
      </section>
    </div>
  )
}
