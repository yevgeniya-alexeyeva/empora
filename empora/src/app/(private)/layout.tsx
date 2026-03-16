import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type PrivateLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function PrivateLayout({ children }: PrivateLayoutProps) {
  const cookieStore = await cookies();
  const session = cookieStore.get("empora_session");

  if (!session) {
    redirect("/login");
  }

  return <>{children}</>;
}
