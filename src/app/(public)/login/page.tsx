import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { routes } from "@/lib/routes";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(routes.appHome);
  }

  return <LoginForm />;
}
