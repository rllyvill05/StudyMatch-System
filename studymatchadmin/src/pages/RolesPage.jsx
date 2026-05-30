import { useEffect, useState } from 'react'
import { getRoles, assignRole, revokeRole } from '../api/roles'
import { getUsers, createUser } from '../api/user'

const RoleBadge = ({ name }) => {
  const styles = {
    super_admin: 'bg-purple-100 text-purple-700',
    admin:       'bg-indigo-100 text-indigo-700',
    student:     'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[name] ?? 'bg-gray-100 text-gray-600'}`}>
      {name}
    </span>
  )
}

export default function RolesPage() {
  const [roles, setRoles]           = useState([])
  const [users, setUsers]           = useState([])
  const [actionMsg, setActionMsg]   = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [search, setSearch]         = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching]   = useState(false)
  const [assigning, setAssigning]   = useState(false)

  // Create user modal
  const [showCreate, setShowCreate] = useState(false)
  const [creating,   setCreating]   = useState(false)
  const [createError, setCreateError] = useState('')
  const [showPwd,    setShowPwd]    = useState(false)
  const [newUser, setNewUser] = useState({
    name: '', email: '', password: '', role: 'admin',
  })

  const fetchRoles = async () => {
    try {
      const res = await getRoles()
      const raw = Array.isArray(res.data?.roles) ? res.data.roles : []
      setRoles(raw.map(name => ({ id: name, name, permissions: [] })))
    } catch {
      setError('Failed to load roles.')
    }
  }

  const fetchAdmins = async () => {
    try {
      const res = await getUsers({ role: 'admin', page: 1 })
      const res2 = await getUsers({ role: 'super_admin', page: 1 })
      const combined = [
        ...res.data.data,
        ...res2.data.data,
      ]
      const unique = combined.filter(
        (u, i, self) => i === self.findIndex(x => x.id === u.id)
      )
      setUsers(unique)
    } catch {
      setError('Failed to load admin users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
    fetchAdmins()
  }, [])

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!search.trim()) return
    setSearching(true)
    try {
      const res = await getUsers({ search, page: 1 })
      setSearchResults(res.data.data)
    } catch {
      setError('Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const handleAssign = async (userId, role) => {
    setAssigning(true)
    try {
      await assignRole(userId, role)
      setActionMsg(`Role "${role}" assigned successfully.`)
      setSelectedUser(null)
      setSearch('')
      setSearchResults([])
      fetchAdmins()
    } catch {
      setActionMsg('Failed to assign role.')
    } finally {
      setAssigning(false)
    }
  }

  const handleRevoke = async (userId, role) => {
    if (!confirm(`Revoke "${role}" from this user?`)) return
    try {
      await revokeRole(userId, role)
      setActionMsg(`Role "${role}" revoked successfully.`)
      fetchAdmins()
    } catch {
      setActionMsg('Failed to revoke role.')
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$'
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  }

  const handleCreate = async () => {
    setCreateError('')
    if (!newUser.name.trim())     return setCreateError('Name is required.')
    if (!newUser.email.trim())    return setCreateError('Email is required.')
    if (newUser.password.length < 8) return setCreateError('Password must be at least 8 characters.')
    setCreating(true)
    try {
      await createUser(newUser)
      setActionMsg(`User "${newUser.name}" (${newUser.role}) created successfully.`)
      setShowCreate(false)
      setNewUser({ name: '', email: '', password: '', role: 'admin' })
      fetchAdmins()
    } catch (err) {
      setCreateError(err?.response?.data?.message || 'Failed to create user.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Role Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage admin roles and access control
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError('') }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Create User
        </button>
      </div>

      {/* Action message */}
      {actionMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          {actionMsg}
          <button
            onClick={() => setActionMsg('')}
            className="ml-3 text-green-500 hover:text-green-700 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">

        {/* Left column — roles overview */}
        <div className="col-span-1 space-y-4">

          {/* Roles list */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Available Roles
            </h2>
            {roles.length === 0 ? (
              <p className="text-gray-400 text-sm">No roles found.</p>
            ) : (
              <div className="space-y-3">
                {roles.map(role => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <RoleBadge name={role.name} />
                      <p className="text-xs text-gray-400 mt-1">
                        {role.permissions?.length ?? 0} permissions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role descriptions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Role Descriptions
            </h2>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                <p className="font-medium text-purple-700">super_admin</p>
                <p className="text-purple-500 text-xs mt-1">
                  Full platform access. Can manage roles, system config, and all modules.
                </p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <p className="font-medium text-indigo-700">admin</p>
                <p className="text-indigo-500 text-xs mt-1">
                  Standard admin access. Can manage users, sessions, complaints, and content.
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="font-medium text-gray-700">student</p>
                <p className="text-gray-500 text-xs mt-1">
                  Default role for all registered students. Mobile app access only.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right column — admin users + assign */}
        <div className="col-span-2 space-y-4">

          {/* Assign role to user */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Assign Role to User
            </h2>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search user by name or email..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              <button
                type="submit"
                disabled={searching}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden mb-2">
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                      selectedUser?.id === user.id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {user.role && <RoleBadge name={user.role} />}
                      </div>
                      <button
                        onClick={() => setSelectedUser(
                          selectedUser?.id === user.id ? null : user
                        )}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                          selectedUser?.id === user.id
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                        }`}
                      >
                        {selectedUser?.id === user.id ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Role assignment buttons */}
            {selectedUser && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-sm font-medium text-indigo-800 mb-3">
                  Assign role to{' '}
                  <span className="font-bold">{selectedUser.name}</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {['admin', 'super_admin'].map(role => (
                    <button
                      key={role}
                      onClick={() => handleAssign(selectedUser.id, role)}
                      disabled={assigning}
                      className="px-4 py-2 text-sm bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors font-medium"
                    >
                      {assigning ? 'Assigning...' : `+ Assign ${role}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current admins table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                Current Admins
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                All users with admin or super_admin roles
              </p>
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                Loading admins...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">
                No admin users found.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">User</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Email</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Role</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Joined</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {user.role && <RoleBadge name={user.role} />}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2 flex-wrap">
                          {user.role && (
                            <button
                              onClick={() => handleRevoke(user.id, user.role)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              Revoke {user.role}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">Create New User</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>

            {createError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
                {createError}
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. admin@studymatch.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-500">Password</label>
                  <button
                    type="button"
                    onClick={() => setNewUser(p => ({ ...p, password: generatePassword() }))}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min. 8 characters"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
                {newUser.password && (
                  <p className="text-xs text-gray-400 mt-1 font-mono break-all">{newUser.password}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                >
                  <option value="admin">admin — Standard admin access</option>
                  <option value="super_admin">super_admin — Full platform access</option>
                  <option value="tutor">tutor — Tutor account (pre-approved)</option>
                  <option value="student">student — Student account</option>
                </select>
              </div>

              {/* Info note */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                <strong>Note:</strong> The user's email will be marked as verified. Share the password with them — they can change it from their profile settings.
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {creating ? 'Creating...' : 'Create User'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}