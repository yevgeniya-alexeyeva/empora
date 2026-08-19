"use client";

import { useEffect, useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { api, type User } from "@/shared/api/client";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    setError("");
    setIsLoading(true);
    void api
      .me()
      .then((current) => {
        if (!isCurrent) return;
        setUser(current);
        setName(current.name);
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(errorMessage(loadError, "Unable to load profile"));
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [loadAttempt]);

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isLoggingOut) return;

    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      const updated = await api.updateProfile(name);
      setUser(updated);
      setMessage("Profile saved");
    } catch (saveError) {
      setError(errorMessage(saveError, "Unable to save profile"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function logout() {
    if (isLoggingOut || isSubmitting) return;

    setError("");
    setMessage("");
    setIsLoggingOut(true);
    try {
      await api.logout();
      router.replace("/login");
      router.refresh();
    } catch (logoutError) {
      setError(errorMessage(logoutError, "Unable to sign out"));
      setIsLoggingOut(false);
    }
  }

  return (
    <section className="space-y-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {isLoading && <p>Loading profile...</p>}
      {!isLoading && !user && (
        <button
          className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium"
          onClick={() => setLoadAttempt((value) => value + 1)}
          type="button"
        >
          Try again
        </button>
      )}
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
              disabled={isSubmitting || isLoggingOut}
              value={name}
            />
          </label>
          {message && <p className="text-sm text-green-700">{message}</p>}
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white"
            disabled={isSubmitting || isLoggingOut}
            type="submit"
          >
            {isSubmitting ? "Saving..." : "Save profile"}
          </button>
        </form>
      ) : null}
      <button
        disabled={isLoading || isSubmitting || isLoggingOut}
        onClick={() => void logout()}
        type="button"
        className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium"
      >
        {isLoggingOut ? "Signing out..." : "Sign out"}
      </button>
    </section>
  );
}
