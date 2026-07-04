import { redirect } from "next/navigation";
import { getSessionMember } from "@/lib/auth";
import AccessRequestClient from "./AccessRequestClient";

export default async function AccessRequestPage() {
  const member = await getSessionMember();
  if (!member) {
    redirect("/api/auth/login?returnTo=/access-request");
  }
  return <AccessRequestClient />;
}
