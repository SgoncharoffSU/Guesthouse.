import { AdminNav } from "@/components/AdminNav";import { getSession } from "@/lib/auth";import { redirect } from "next/navigation";
export const dynamic="force-dynamic";
export default async function AdminLayout({children}:{children:React.ReactNode}){const s=await getSession();if(!s||s.role!=="ADMIN")redirect("/login?next=/admin");return <div className="lg:flex"><AdminNav/><main className="min-w-0 flex-1 p-5 lg:p-8">{children}</main></div>}
