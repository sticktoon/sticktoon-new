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

const ROLES = ["user", "influencer", "admin"];

export default function AdminUsers() {
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");

  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "user", newPassword: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* 🔙 BACK BUTTON */}
        <AdminBackButton />

        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black mb-6">Users</h1>

        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          <table className="w-full text-xs md:text-sm">
            <thead className="bg-slate-50 text-slate-600">
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
                  <td className="p-2 md:p-4 font-medium">{u.name}</td>
                  <td className="p-2 md:p-4 text-xs md:text-sm">{u.email}</td>
                  <td className="p-2 md:p-4 capitalize text-xs md:text-sm">{u.role}</td>
                  <td className="p-2 md:p-4 capitalize text-xs md:text-sm">{u.provider}</td>
                  <td className="p-2 md:p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        disabled={deletingId === u._id}
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

      {/* ================= EDIT USER MODAL ================= */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
            {/* Fixed header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-200 flex items-start justify-between">
              <div>
                <h3 className="text-slate-900 font-black text-xl">Edit User</h3>
                <p className="text-slate-400 text-xs font-mono mt-1">{editing._id}</p>
              </div>
              <button
                onClick={closeEdit}
                className="text-slate-400 hover:text-slate-900 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  Role
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white capitalize focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} className="capitalize">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  Change Password
                </label>
                <input
                  type="text"
                  value={form.newPassword}
                  onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Min 6 characters. Requires super-admin access.
                </p>
              </div>
            </div>

            {/* Fixed footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="px-4 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
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
