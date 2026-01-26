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

export default function AdminUsers() {
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
   fetch(`${API_BASE_URL}/api/admin/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    })
      .then((res) => res.json())
      .then(setUsers)
      .catch(console.error);
  }, []);

  // 🔐 Admin protection
  if (currentUser.role !== "admin") {
    window.location.href = "/";
    return null;
  }

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
              </tr>
            </thead>

            <tbody>
              {users.map((u,index) => (
                <tr key={u._id} className="border-t hover:bg-slate-50">
                    <td className="p-2 md:p-3 font-semibold text-slate-500">
        {index + 1}
      </td>
                  <td className="p-2 md:p-4 font-mono text-xs text-slate-500">
                    {u._id}
                  </td>
                  <td className="p-2 md:p-4 font-medium">{u.name}</td>
                  <td className="p-2 md:p-4 text-xs md:text-sm">{u.email}</td>
                  <td className="p-2 md:p-4 capitalize text-xs md:text-sm">{u.role}</td>
                  <td className="p-2 md:p-4 capitalize text-xs md:text-sm">{u.provider}</td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
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
    </div>
  );
}
