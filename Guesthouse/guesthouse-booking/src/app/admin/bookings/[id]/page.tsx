import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/domain";
import { bookingStatusLabel, paymentStatusLabel } from "@/lib/booking-status";
import { markPaymentManuallyAction, updateBookingStatusAction } from "@/lib/actions";

export default async function Page({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const b=await prisma.booking.findUnique({where:{id},include:{room:true,payments:{orderBy:{createdAt:"desc"}},history:{orderBy:{createdAt:"desc"}}}});
  if(!b)notFound();
  return <>
    <h1 className="text-3xl font-bold">Бронь {b.number}</h1>
    <div className="card mt-6 grid gap-4 md:grid-cols-2">
      <p><b>Гость:</b> {b.guestName}</p><p><b>Телефон:</b> <a className="underline" href={`tel:${b.guestPhone}`}>{b.guestPhone}</a></p>
      <p><b>Номер:</b> {b.room.name}</p><p><b>Даты:</b> {b.checkIn.toLocaleDateString("ru-RU")} — {b.checkOut.toLocaleDateString("ru-RU")}</p>
      <p><b>Ночей:</b> {b.nights}</p><p><b>Гостей:</b> {b.guestsCount}</p>
      <p><b>Стоимость:</b> {formatMoney(b.totalMinor)}</p><p><b>Предоплата:</b> {formatMoney(b.prepaymentMinor)}</p>
      <p><b>Остаток:</b> {formatMoney(b.balanceMinor)}</p><p><b>Статус:</b> {bookingStatusLabel[b.status]}</p>
      <p><b>Источник:</b> {b.source}</p><p><b>Создано:</b> {b.createdAt.toLocaleString("ru-RU")}</p>
      {b.guestComment && <p className="md:col-span-2"><b>Комментарий гостя:</b> {b.guestComment}</p>}
      {b.internalComment && <p className="md:col-span-2"><b>Внутренний комментарий:</b> {b.internalComment}</p>}
    </div>
    <div className="card mt-6"><h2 className="text-xl font-bold">Оплата</h2>{b.payments.length ? b.payments.map(p=><p className="border-t py-3" key={p.id}>{paymentStatusLabel[p.status]} · {formatMoney(p.amountMinor)} · {p.provider} {p.providerPaymentId ? `· ${p.providerPaymentId}` : ""}</p>) : <p className="mt-3">Платежей нет.</p>}
      {!b.payments.some(p=>p.status==="SUCCEEDED") && !["CANCELLED","COMPLETED","EXPIRED"].includes(b.status) && <form action={markPaymentManuallyAction} className="mt-4"><input type="hidden" name="id" value={b.id}/><button className="btn">Отметить предоплату вручную</button></form>}
    </div>
    <form action={updateBookingStatusAction} className="card mt-6 flex flex-wrap gap-3"><input type="hidden" name="id" value={b.id}/><select className="field max-w-sm" name="status" defaultValue={b.status}>{["AWAITING_PAYMENT","PAID","CONFIRMED","CANCELLED","COMPLETED","EXPIRED"].map(x=><option key={x} value={x}>{bookingStatusLabel[x as keyof typeof bookingStatusLabel]}</option>)}</select><button className="btn">Изменить статус</button><span className="btn btn-secondary">Для печати: Ctrl/Cmd + P</span></form>
    <div className="card mt-6"><h2 className="text-xl font-bold">История</h2>{b.history.map(h=><p className="border-t py-3" key={h.id}>{h.createdAt.toLocaleString("ru-RU")}: {h.fromStatus ? bookingStatusLabel[h.fromStatus] : "—"} → {bookingStatusLabel[h.toStatus]}. {h.note}</p>)}</div>
  </>;
}
