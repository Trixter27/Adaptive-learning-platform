import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    redirect("/dashboard");
  }

  return <SignIn />;
}
