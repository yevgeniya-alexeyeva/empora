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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

let refreshPromise: Promise<boolean> | null = null;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function messageFrom(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const messages = value
      .map(messageFrom)
      .filter((message): message is string => Boolean(message));
    return messages.length ? messages.join("; ") : undefined;
  }
  if (value && typeof value === "object" && "message" in value) {
    return messageFrom((value as { message?: unknown }).message);
  }
  return undefined;
}

export function parseApiErrorMessage(body: unknown): string {
  if (!body || typeof body !== "object") {
    return messageFrom(body) ?? "Request failed";
  }

  const errorBody = body as { error?: unknown; message?: unknown };
  return (
    messageFrom(errorBody.error) ??
    messageFrom(errorBody.message) ??
    "Request failed"
  );
}

function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
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

  if (response.status === 401 && retry && !path.startsWith("/auth/")) {
    if (await refreshAccessToken()) {
      return request<T>(path, init, false);
    }
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, parseApiErrorMessage(body));
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
  me: () => request<User>("/users/me"),
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
