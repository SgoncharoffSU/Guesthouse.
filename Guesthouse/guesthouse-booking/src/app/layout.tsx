import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
export const metadata: Metadata = { title:"Бронирование гостевых номеров", description:"Поиск и бронирование гостевых номеров" };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body><Header/>{children}</body></html>}
