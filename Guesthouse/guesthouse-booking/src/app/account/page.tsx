import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/domain";
import { bookingStatusLabel } from "@/lib/booking-status";
import { cancelOwnBookingAction, logoutAction } from "@/lib/actions";
import { expireStaleBookings } from "@/lib/booking-service";

export const dynamic = "force-dynamic";

export default async function Account({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  await expireStaleBookings();
  const q = await searchParams;
  const bookings = await prisma.booking.findMany({
    where: { userId: session.userId },
    include: { room: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  return <main className="mx-auto max-w-5xl px-5 py-10">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-bold">Мои бронирования</h1>
      <form action={logoutAction}><button className="btn btn-secondary">Выйти</button></form>
    </div>
    {q.paid && <div className="mt-5 rounded-xl border border-green-300 bg-green-50 p-4 font-bold">Оплата подтверждена.</div>}
    <div className="mt-6 grid gap-4">
      {bookings.length === 0 ? <div className="card">Бронирований пока нет. <Link className="underline" href="/rooms">Выбрать номер</Link></div> : bookings.map((b) => <article className="card" key={b.id}>
        <div className="flex flex-wrap justify-between gap-3">
          <div><h2 className="text-xl font-bold">{b.room.name}</h2><p>{b.number} · {b.checkIn.toLocaleDateString("ru-RU")} — {b.checkOut.toLocaleDateString("ru-RU")}</p></div>
          <b>{bookingStatusLabel[b.status]}</b>
        </div>
        <p className="mt-3">Стоимость: {formatMoney(b.totalMinor)} · Предоплата: {formatMoney(b.prepaymentMinor)}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {b.status === "AWAITING_PAYMENT" && <Link className="btn" href={`/payment/${b.id}`}>Перейти к оплате</Link>}
          {["AWAITING_PAYMENT", "PAID", "CONFIRMED"].includes(b.status) && b.checkIn > new Date() && <form action={cancelOwnBookingAction}><input type="hidden" name="id" value={b.id}/><button className="btn btn-secondary">Отменить бронь</button></form>}
        </div>
      </article>)}
    </div>
  </main>;
}
