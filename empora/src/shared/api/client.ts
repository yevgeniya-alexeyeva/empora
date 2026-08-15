export type User = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
};

export type SurveyOption = { id: string; value: number; label: string };
export type SurveyQuestion = {
  id: string;
  title: string;
  position: number;
  options: SurveyOption[];
};
export type Survey = {
  id: string;
  title: string;
  description: string;
  isAnonymous: boolean;
  questions: SurveyQuestion[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (
    response.status === 401 &&
    retry &&
    !path.startsWith("/auth/login") &&
    !path.startsWith("/auth/refresh")
  ) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refreshed.ok) return request<T>(path, init, false);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: { message?: string } | string; message?: string }
      | null;
    const message =
      typeof body?.error === "object"
        ? (body.error.message ?? "Request failed")
        : body?.message ?? String(body?.error ?? "Request failed");
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<User>("/auth/me"),
  updateProfile: (name: string) =>
    request<User>("/users/me", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),
  surveys: () => request<Array<Omit<Survey, "questions">>>("/surveys"),
  survey: (id: string) => request<Survey>(`/surveys/${id}`),
  submitSurvey: (
    id: string,
    payload: {
      answers: Array<{ questionId: string; optionId: string }>;
      comment?: string;
    },
  ) =>
    request(`/surveys/${id}/responses`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
