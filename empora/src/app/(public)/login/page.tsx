import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function LoginPage() {
  async function loginAction() {
    "use server";

    const cookieStore = await cookies();

    cookieStore.set("empora_session", "demo-user", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    redirect("/myProfile");
  }

  return (
    <section className="space-y-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Login</h1>
      <p className="text-sm tex-main-color/60">
        Temporary demo login to access private routes.
      </p>
      <form action={loginAction}>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Sign in
        </button>
      </form>
    </section>
  );
}
