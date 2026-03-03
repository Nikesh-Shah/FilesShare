import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Shield, Activity, UserX, UserCheck, Trash2, RefreshCw,
  LogOut, ChevronDown, ChevronUp, Search, Globe, Monitor, Clock,
  BarChart3, ArrowLeft,
} from 'lucide-react';
import { adminGetStats, adminGetUsers, adminToggleUserActive, adminDeleteUser } from '../api/api';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes] = await Promise.all([adminGetStats(), adminGetUsers()]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate('/login');
        return;
      }
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleActive = async (user) => {
    setActionLoading(user._id);
    try {
      const res = await adminToggleUserActive(user._id);
      showToast(res.data.message);
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: res.data.isActive } : u));
      // Refresh stats
      const statsRes = await adminGetStats();
      setStats(statsRes.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(null);
      setConfirmModal(null);
    }
  };

  const handleDeleteUser = async (user) => {
    setActionLoading(user._id);
    try {
      await adminDeleteUser(user._id);
      showToast('User deleted.');
      setUsers(prev => prev.filter(u => u._id !== user._id));
      const statsRes = await adminGetStats();
      setStats(statsRes.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Delete failed.');
    } finally {
      setActionLoading(null);
      setConfirmModal(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('email');
    sessionStorage.removeItem('role');
    window.dispatchEvent(new Event('userLogin'));
    navigate('/login');
  };

  // Sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  // Filter & sort
  const filteredUsers = users
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.email?.toLowerCase().includes(q) ||
        u.lastLoginIp?.toLowerCase().includes(q) ||
        u.registrationIp?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === 'createdAt' || sortField === 'lastLoginAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (sortField === 'loginCount') {
        aVal = aVal || 0;
        bVal = bVal || 0;
      }
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const timeAgo = (d) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-500">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">{confirmModal.title}</h3>
            <p className="mb-5 text-sm text-gray-600">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                disabled={actionLoading}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm ${
                  confirmModal.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50`}
              >
                {actionLoading ? 'Processing...' : confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" /> Home
            </button>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="blue" />
            <StatCard icon={UserCheck} label="Active Users" value={stats.activeUsers} color="green" />
            <StatCard icon={Shield} label="Admins" value={stats.adminCount} color="purple" />
            <StatCard icon={Activity} label="Logins (24h)" value={stats.recentLogins} color="amber" />
            <StatCard icon={BarChart3} label="New (7d)" value={stats.newUsersThisWeek} color="cyan" />
          </div>
        )}

        {/* Search */}
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email, IP, role..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <span className="text-sm text-gray-500">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort('email')}>
                    <span className="flex items-center gap-1">Email <SortIcon field="email" /></span>
                  </th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort('lastLoginIp')}>
                    <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> IP <SortIcon field="lastLoginIp" /></span>
                  </th>
                  <th className="px-4 py-3">
                    <span className="flex items-center gap-1"><Monitor className="h-3 w-3" /> Browser</span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort('loginCount')}>
                    <span className="flex items-center gap-1">Logins <SortIcon field="loginCount" /></span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort('lastLoginAt')}>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Last Login <SortIcon field="lastLoginAt" /></span>
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => handleSort('createdAt')}>
                    <span className="flex items-center gap-1">Registered <SortIcon field="createdAt" /></span>
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                      {search ? 'No users match your search.' : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className={`transition hover:bg-gray-50/60 ${!user.isActive ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          user.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        <div>{user.lastLoginIp || '—'}</div>
                        {user.registrationIp && user.registrationIp !== user.lastLoginIp && (
                          <div className="text-gray-400" title="Registration IP">reg: {user.registrationIp}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate" title={user.userAgent || ''}>
                        {parseBrowser(user.userAgent)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {user.loginCount || 0}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{formatDate(user.lastLoginAt)}</div>
                        {user.lastLoginAt && (
                          <div className="text-xs text-gray-400">{timeAgo(user.lastLoginAt)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.role !== 'admin' && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setConfirmModal({
                                title: user.isActive ? 'Deactivate User' : 'Activate User',
                                message: `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.email}?`,
                                confirmText: user.isActive ? 'Deactivate' : 'Activate',
                                danger: user.isActive,
                                onConfirm: () => handleToggleActive(user),
                              })}
                              disabled={actionLoading === user._id}
                              className={`rounded-lg p-2 text-xs font-medium transition ${
                                user.isActive
                                  ? 'text-amber-700 hover:bg-amber-50'
                                  : 'text-green-700 hover:bg-green-50'
                              } disabled:opacity-50`}
                              title={user.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => setConfirmModal({
                                title: 'Delete User',
                                message: `Are you sure you want to permanently delete ${user.email}? This cannot be undone.`,
                                confirmText: 'Delete',
                                danger: true,
                                onConfirm: () => handleDeleteUser(user),
                              })}
                              disabled={actionLoading === user._id}
                              className="rounded-lg p-2 text-xs font-medium text-red-700 hover:bg-red-50 transition disabled:opacity-50"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

/* ── Reusable stat card ── */
const colorMap = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  purple: 'bg-purple-50 text-purple-700',
  amber: 'bg-amber-50 text-amber-700',
  cyan: 'bg-cyan-50 text-cyan-700',
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-3">
      <div className={`rounded-lg p-2 ${colorMap[color] || colorMap.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  </div>
);

/* ── Parse User-Agent into a short browser string ── */
function parseBrowser(ua) {
  if (!ua) return '—';
  // Try to extract browser + OS concisely
  let browser = 'Unknown';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

  let os = '';
  if (ua.includes('Windows')) os = 'Win';
  else if (ua.includes('Mac OS')) os = 'Mac';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return os ? `${browser} / ${os}` : browser;
}

export default AdminPanel;
