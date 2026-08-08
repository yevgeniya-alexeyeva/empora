"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { api, User } from "@/shared/api/client";

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void api.me().then((current) => {
      setUser(current);
      setName(current.name);
    });
  }, []);

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const updated = await api.updateProfile(name);
    setUser(updated);
    setMessage("Profile saved");
  }

  async function logout() {
    await api.logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <section className="space-y-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
      {user ? (
        <form className="max-w-sm space-y-3" onSubmit={save}>
          <p className="text-sm text-black/60">
            {user.email} · {user.role}
          </p>
          <label className="block text-sm">
            Name
            <input
              className="mt-1 w-full rounded-md border border-black/20 px-3 py-2"
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          {message && <p className="text-sm text-green-700">{message}</p>}
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white"
            type="submit"
          >
            Save profile
          </button>
        </form>
      ) : (
        <p>Loading profile...</p>
      )}
      <button
        onClick={() => void logout()}
        type="button"
        className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium"
      >
        Sign out
      </button>
    </section>
  );
}
