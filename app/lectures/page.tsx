import LecturesClient from "./LecturesClient";
import { getSessionMember } from "@/lib/auth";

export default async function LecturesPage() {
  const member = await getSessionMember();
  const isAdmin = member?.role === "master" || member?.role === "admin";
  return <LecturesClient isAdmin={isAdmin} />;
}
