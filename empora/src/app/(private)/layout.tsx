import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type PrivateLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function PrivateLayout({ children }: PrivateLayoutProps) {
  const cookieStore = await cookies();
  const apiUrl = process.env.API_URL ?? "http://localhost:3001/api";
  const response = await fetch(`${apiUrl}/auth/me`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    redirect("/login");
  }

  return <>{children}</>;
}
