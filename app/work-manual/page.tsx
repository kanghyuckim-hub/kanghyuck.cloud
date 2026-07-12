import WorkManualClient from "./WorkManualClient";
import { getSessionMember } from "@/lib/auth";

export default async function WorkManualPage() {
  const member = await getSessionMember();
  const isAdmin = member?.role === "master" || member?.role === "admin";
  return <WorkManualClient isAdmin={isAdmin} />;
}
