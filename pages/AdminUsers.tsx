import { useEffect, useState } from "react";
import AdminBackButton from "./AdminBackButton";
import { API_BASE_URL } from "../config/api";

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  provider: string;
};

type CurrentAuthUser = {
  id?: string;
  _id?: string;
  email?: string;
  role?: string;
};

const DEV_EMAILS = [
  import.meta.env.VITE_DEV_EMAIL || "",
  import.meta.env.VITE_SUPER_ADMIN_EMAILS || "",
  import.meta.env.VITE_SUPER_ADMIN_EMAIL || "",
  "anishpatankar974@gmail.com",
  "sticktoon.xyz@gmail.com",
]
  .join(",")
  .split(",")
  .map((email) => email.toLowerCase().trim())
  .filter(Boolean);

export default function AdminUsers() {
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");

  // Read current logged in admin user
  const [currentUser, setCurrentUser] = useState<CurrentAuthUser | null>(() => {
    try {
      const rawAdmin = localStorage.getItem("adminUser");
      const rawUser = localStorage.getItem("user");
      return rawAdmin ? JSON.parse(rawAdmin) : rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  });

  const isSuperAdmin = Boolean(
    currentUser?.role === "superadmin" ||
    (currentUser?.email && DEV_EMAILS.includes(currentUser.email.toLowerCase().trim()))
  );

  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "user", newPassword: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Add Admin Modal State
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [addAdminForm, setAddAdminForm] = useState({ name: "", email: "", password: "" });
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const flash = (type: "success" | "error", msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 3500);
  };

  const jsonHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchUsers = () => {
    fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      name: u.name || "",
      email: u.email || "",
      role: u.role || "user",
      newPassword: "",
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    const id = editing._id;

    if (!form.name.trim() || !form.email.trim()) {
      flash("error", "Name and email are required");
      return;
    }
    if (form.newPassword.trim() && form.newPassword.trim().length < 6) {
      flash("error", "Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      // 1. Name / email
      if (form.name.trim() !== editing.name || form.email.trim() !== editing.email) {
        const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
          method: "PATCH",
          headers: jsonHeaders,
          body: JSON.stringify({ name: form.name.trim(), email: form.email.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to update user");
      }

      // 2. Role
      if (form.role !== editing.role) {
        const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}/role`, {
          method: "PATCH",
          headers: jsonHeaders,
          body: JSON.stringify({ role: form.role }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to update role");
      }

      // 3. Password (super admin only — backend enforces)
      if (form.newPassword.trim()) {
        const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}/reset-password`, {
          method: "PATCH",
          headers: jsonHeaders,
          body: JSON.stringify({ newPassword: form.newPassword.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to reset password");
      }

      flash("success", "User updated successfully");
      closeEdit();
      fetchUsers();
    } catch (e: any) {
      flash("error", e.message || "Something went wrong");
      setSaving(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAdminForm.email.trim() || !addAdminForm.password.trim()) {
      flash("error", "Email and password are required");
      return;
    }
    if (addAdminForm.password.length < 6) {
      flash("error", "Password must be at least 6 characters");
      return;
    }

    setCreatingAdmin(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/create-admin`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          name: addAdminForm.name.trim(),
          email: addAdminForm.email.trim(),
          password: addAdminForm.password.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to create admin");

      flash("success", data.message || "Admin account created successfully!");
      setShowAddAdminModal(false);
      setAddAdminForm({ name: "", email: "", password: "" });
      fetchUsers();
    } catch (e: any) {
      flash("error", e.message || "Failed to create admin");
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handlePromoteToAdmin = async (u: User) => {
    setActionLoadingId(u._id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${u._id}/promote`, {
        method: "PATCH",
        headers: jsonHeaders,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to promote user to Admin");

      flash("success", `"${u.name || u.email}" is now an Admin!`);
      fetchUsers();
    } catch (e: any) {
      flash("error", e.message || "Failed to make Admin");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDemoteFromAdmin = async (u: User) => {
    if (!window.confirm(`Remove admin privileges from "${u.name || u.email}"?`)) return;

    setActionLoadingId(u._id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${u._id}/demote`, {
        method: "PATCH",
        headers: jsonHeaders,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to remove Admin privileges");

      flash("success", `Admin privileges removed for "${u.name || u.email}"`);
      fetchUsers();
    } catch (e: any) {
      flash("error", e.message || "Failed to remove Admin");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (u: User) => {
    if (!window.confirm(`Delete user "${u.name || u.email}"? This cannot be undone.`)) return;
    setDeletingId(u._id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${u._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to delete user");
      flash("success", "User deleted");
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
    } catch (e: any) {
      flash("error", e.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
            👑 Super Admin
          </span>
        );
      case "admin":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1 w-fit">
            🛡️ Admin
          </span>
        );
      case "influencer":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 w-fit inline-block">
            ⭐ Influencer
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 w-fit inline-block">
            👤 User
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* 🔙 BACK BUTTON */}
        <AdminBackButton />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 flex items-center gap-3">
              Users Management
              {isSuperAdmin && (
                <span className="text-xs font-black bg-amber-500 text-slate-900 px-3 py-1 rounded-full uppercase tracking-wider">
                  Super Admin Mode
                </span>
              )}
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">
              View and manage user accounts, admins, and permissions.
            </p>
          </div>

          {/* 👑 ADD ADMIN BUTTON (SUPER ADMIN ONLY) */}
          {isSuperAdmin && (
            <button
              onClick={() => setShowAddAdminModal(true)}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 self-start md:self-auto"
            >
              <span>➕</span> Add New Admin
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="p-2 md:p-4 w-12 md:w-16">Sr.No</th>
                <th className="p-2 md:p-4 text-left">User ID</th>
                <th className="p-2 md:p-4 text-left">Name</th>
                <th className="p-2 md:p-4 text-left">Email</th>
                <th className="p-2 md:p-4 text-left">Role</th>
                <th className="p-2 md:p-4 text-left">Provider</th>
                <th className="p-2 md:p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u, index) => (
                <tr key={u._id} className="border-t hover:bg-slate-50">
                  <td className="p-2 md:p-3 font-semibold text-slate-500">{index + 1}</td>
                  <td className="p-2 md:p-4 font-mono text-xs text-slate-500">{u._id}</td>
                  <td className="p-2 md:p-4 font-bold text-slate-900">{u.name || "N/A"}</td>
                  <td className="p-2 md:p-4 text-xs md:text-sm text-slate-700">{u.email}</td>
                  <td className="p-2 md:p-4">{renderRoleBadge(u.role)}</td>
                  <td className="p-2 md:p-4 capitalize text-xs md:text-sm text-slate-500">{u.provider}</td>
                  <td className="p-2 md:p-4">
                    <div className="flex items-center justify-end gap-2">
                      {/* 👑 SUPER ADMIN CONTROLS: MAKE ADMIN / REMOVE ADMIN */}
                      {isSuperAdmin && u.role !== "superadmin" && (
                        <>
                          {u.role === "admin" ? (
                            <button
                              onClick={() => handleDemoteFromAdmin(u)}
                              disabled={actionLoadingId === u._id}
                              className="px-3 py-1.5 rounded-lg text-xs font-black bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition flex items-center gap-1 disabled:opacity-50"
                              title="Remove Admin privileges (demote to regular user)"
                            >
                              <span>➖</span> Remove Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePromoteToAdmin(u)}
                              disabled={actionLoadingId === u._id}
                              className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition flex items-center gap-1 disabled:opacity-50"
                              title="Promote this user to Admin"
                            >
                              <span>🛡️</span> Make Admin
                            </button>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => openEdit(u)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={deletingId === u._id || u.role === "superadmin"}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition disabled:opacity-50"
                      >
                        {deletingId === u._id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="p-4 md:p-6 text-center text-slate-400 text-xs md:text-sm"
                  >
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 👑 ADD NEW ADMIN MODAL ================= */}
      {showAddAdminModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-amber-50">
              <div>
                <h3 className="text-slate-900 font-black text-xl flex items-center gap-2">
                  <span>🛡️</span> Add New Admin
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">Create a new Admin user account.</p>
              </div>
              <button
                onClick={() => setShowAddAdminModal(false)}
                className="text-slate-400 hover:text-slate-900 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Admin User"
                  value={addAdminForm.name}
                  onChange={(e) => setAddAdminForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@sticktoon.com"
                  value={addAdminForm.email}
                  onChange={(e) => setAddAdminForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={addAdminForm.password}
                  onChange={(e) => setAddAdminForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddAdminModal(false)}
                  disabled={creatingAdmin}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="px-5 py-2.5 rounded-xl text-sm font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition shadow-md disabled:opacity-50"
                >
                  {creatingAdmin ? "Creating..." : "Create Admin Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= EDIT USER MODAL ================= */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Fixed header */}
            <div className="flex-shrink-0 px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-slate-900 font-extrabold text-2xl flex items-center gap-2">
                  <span>✏️</span> Edit User
                </h3>
                <p className="text-slate-500 text-xs font-mono mt-1">{editing.email || editing._id}</p>
              </div>
              <button
                onClick={closeEdit}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 text-xl font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 capitalize focus:outline-none focus:bg-white focus:border-indigo-600 transition-all"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} className="capitalize">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">
                  🔐 Change Password (Super Admin)
                </label>
                <input
                  type="text"
                  value={form.newPassword}
                  onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-4 py-3 bg-white border border-amber-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all"
                />
                <p className="text-[11px] text-amber-800 font-semibold mt-2">
                  ⚠️ Min 6 characters. Requires super-admin access.
                </p>
              </div>
            </div>

            {/* Fixed footer */}
            <div className="flex-shrink-0 px-6 sm:px-8 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-md hover:shadow-indigo-500/20 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= NOTICE TOAST ================= */}
      {notice && (
        <div
          className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
            notice.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {notice.msg}
        </div>
      )}
    </div>
  );
}
