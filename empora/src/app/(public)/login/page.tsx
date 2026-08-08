"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/shared/api/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function login(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await api.login(email, password);
      router.replace("/myProfile");
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Unable to sign in",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
      <p className="text-sm tex-main-color/60">
        Sign in to access your profile and employee surveys.
      </p>
      <form className="max-w-sm space-y-3" onSubmit={login}>
        <label className="block text-sm">
          Email
          <input
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-black/20 px-3 py-2"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-black/20 px-3 py-2"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}
