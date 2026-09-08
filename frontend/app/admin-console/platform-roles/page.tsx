import { redirect } from "next/navigation";

export default function PlatformRolesRedirectPage() {
  redirect("/admin-console/admins");
}
