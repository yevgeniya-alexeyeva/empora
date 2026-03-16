import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function MyProfilePage() {
  async function logoutAction() {
    "use server";

    const cookieStore = await cookies();
    cookieStore.delete("empora_session");
    redirect("/login");
  }

  return (
    <section className="space-y-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
      <p className="text-sm tex-main-color/60">
        This page is protected by the private route group layout.
      </p>
      <form action={logoutAction}>
        <button
          type="submit"
          className="rounded-md border border-black/20 px-4 py-2 text-sm font-medium"
        >
          Sign out
        </button>
      </form>
    </section>
  );
}
