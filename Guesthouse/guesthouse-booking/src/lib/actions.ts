"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, getSession } from "@/lib/auth";
import { createBooking } from "@/lib/booking-service";

function s(v: FormDataEntryValue | null){ return String(v ?? "").trim(); }
function n(v: FormDataEntryValue | null){ return Number(v ?? 0); }
async function admin(){ const x=await getSession(); if(!x||x.role!=="ADMIN") redirect("/login?next=/admin"); return x; }
async function audit(action:string,entity:string,entityId?:string,metadata?:Record<string,unknown>){ const x=await getSession(); await prisma.auditLog.create({data:{actorId:x?.userId,action,entity,entityId,metadata}}); }

export async function loginAction(form:FormData){
  const phone=s(form.get("phone")).replace(/[^+\d]/g,""); const password=s(form.get("password"));
  const user=await prisma.user.findUnique({where:{phone}});
  if(!user?.passwordHash || !(await bcrypt.compare(password,user.passwordHash))) redirect("/login?error=1");
  await createSession({userId:user.id,role:user.role,name:user.name}); redirect(user.role==="ADMIN"?"/admin":"/account");
}
export async function registerAction(form:FormData){
  const phone=s(form.get("phone")).replace(/[^+\d]/g,""); const name=s(form.get("name")); const password=s(form.get("password"));
  if(name.length<2||phone.length<7||password.length<8) redirect("/login?registerError=1");
  const passwordHash=await bcrypt.hash(password,12);
  const user=await prisma.user.upsert({where:{phone},update:{name,passwordHash,phoneVerified:new Date()},create:{phone,name,passwordHash,phoneVerified:new Date(),customer:{create:{}}}});
  await createSession({userId:user.id,role:user.role,name:user.name}); redirect("/account");
}
export async function logoutAction(){ const {cookies}=await import("next/headers"); (await cookies()).delete("session"); redirect("/"); }

export async function createBookingAction(form:FormData){
  const session=await getSession();
  const booking=await createBooking({roomId:s(form.get("roomId")),checkIn:new Date(s(form.get("checkIn"))+"T00:00:00Z"),checkOut:new Date(s(form.get("checkOut"))+"T00:00:00Z"),guestsCount:n(form.get("guestsCount")),guestName:s(form.get("guestName")),guestPhone:s(form.get("guestPhone")),userId:session?.userId});
  redirect(`/payment/${booking.id}`);
}
export async function completeTestPaymentAction(form:FormData){
  if(process.env.NODE_ENV==="production") throw new Error("Тестовая оплата запрещена"); const bookingId=s(form.get("bookingId"));
  await prisma.$transaction(async tx=>{const b=await tx.booking.findUniqueOrThrow({where:{id:bookingId}}); if(["PAID","CONFIRMED"].includes(b.status)) return; const p=await tx.payment.upsert({where:{idempotencyKey:`test:${bookingId}`},update:{status:"SUCCEEDED"},create:{bookingId,provider:"test",providerPaymentId:`test_${bookingId}`,idempotencyKey:`test:${bookingId}`,amountMinor:b.prepaymentMinor,status:"SUCCEEDED"}}); await tx.paymentEvent.upsert({where:{providerEventId:`test_event_${bookingId}`},update:{},create:{paymentId:p.id,providerEventId:`test_event_${bookingId}`,type:"payment.succeeded",payloadJson:{bookingId},processedAt:new Date()}}); await tx.booking.update({where:{id:bookingId},data:{status:"CONFIRMED",holdExpiresAt:null,history:{create:{fromStatus:b.status,toStatus:"CONFIRMED",note:"Тестовая оплата подтверждена"}}}})}); redirect(`/account?paid=${bookingId}`);
}

export async function saveRoomAction(form:FormData){ await admin(); const id=s(form.get("id")); const data={code:s(form.get("code")),slug:s(form.get("slug")),name:s(form.get("name")),description:s(form.get("description")),rules:s(form.get("rules"))||null,basePriceMinor:Math.round(n(form.get("price"))*100),capacity:n(form.get("capacity")),minNights:n(form.get("minNights"))||1,maxNights:n(form.get("maxNights"))||30,isActive:form.get("isActive")==="on",isRecommended:form.get("isRecommended")==="on"}; const room=id?await prisma.room.update({where:{id},data}):await prisma.room.create({data}); await audit(id?"UPDATE":"CREATE","Room",room.id); revalidatePath("/admin/rooms"); redirect("/admin/rooms"); }
export async function archiveRoomAction(form:FormData){await admin();const id=s(form.get("id"));await prisma.room.update({where:{id},data:{archivedAt:new Date(),isActive:false}});await audit("ARCHIVE","Room",id);revalidatePath("/admin/rooms");}
export async function addImageAction(form:FormData){await admin();const roomId=s(form.get("roomId")),url=s(form.get("url"));if(!/^https?:\/\//.test(url)&&!url.startsWith("/"))throw new Error("Некорректный URL");await prisma.roomImage.create({data:{roomId,url,alt:s(form.get("alt")),isPrimary:form.get("isPrimary")==="on"}});revalidatePath("/admin/rooms");}
export async function saveAttributeAction(form:FormData){await admin();const id=s(form.get("id"));const key=s(form.get("key")).toLowerCase().replace(/[^a-z0-9_-]/g,"-");const data={key,name:s(form.get("name")),type:s(form.get("type")) as "TEXT"|"NUMBER"|"BOOLEAN"|"SELECT",unit:s(form.get("unit"))||null,isRequired:form.get("isRequired")==="on",isVisible:form.get("isVisible")==="on",isFilterable:form.get("isFilterable")==="on",sortOrder:n(form.get("sortOrder"))};const a=id?await prisma.attributeDefinition.update({where:{id},data}):await prisma.attributeDefinition.create({data});await audit(id?"UPDATE":"CREATE","AttributeDefinition",a.id);revalidatePath("/admin/attributes");}
export async function saveSettingsAction(form:FormData){await admin();await prisma.appSettings.upsert({where:{id:"singleton"},update:{propertyName:s(form.get("propertyName")),address:s(form.get("address")),phone:s(form.get("phone")),description:s(form.get("description")),timezone:s(form.get("timezone")),currency:s(form.get("currency")),checkInTime:s(form.get("checkInTime")),checkOutTime:s(form.get("checkOutTime")),prepaymentMode:s(form.get("prepaymentMode")),prepaymentValue:n(form.get("prepaymentValue")),minimumPrepaymentMinor:Math.round(n(form.get("minimumPrepayment"))*100),holdMinutes:n(form.get("holdMinutes")),cancellationRules:s(form.get("cancellationRules")),refundRules:s(form.get("refundRules")),privacyPolicy:s(form.get("privacyPolicy")),personalDataConsent:s(form.get("personalDataConsent"))},create:{}});await audit("UPDATE","AppSettings","singleton");revalidatePath("/");revalidatePath("/admin/settings");}
export async function saveBlockAction(form:FormData){await admin();await prisma.roomBlock.create({data:{roomId:s(form.get("roomId")),startsAt:new Date(s(form.get("startsAt"))+"T00:00:00Z"),endsAt:new Date(s(form.get("endsAt"))+"T00:00:00Z"),reason:s(form.get("reason"))}});revalidatePath("/admin/calendar");}
export async function savePriceRuleAction(form:FormData){await admin();await prisma.pricingRule.create({data:{roomId:s(form.get("roomId"))||null,name:s(form.get("name")),startsAt:new Date(s(form.get("startsAt"))+"T00:00:00Z"),endsAt:new Date(s(form.get("endsAt"))+"T00:00:00Z"),priceMinor:Math.round(n(form.get("price"))*100),priority:n(form.get("priority"))}});revalidatePath("/admin/prices");}
export async function updateBookingStatusAction(form:FormData){await admin();const id=s(form.get("id"));const status=s(form.get("status")) as "DRAFT"|"AWAITING_PAYMENT"|"PAID"|"CONFIRMED"|"CANCELLED"|"COMPLETED"|"EXPIRED";const b=await prisma.booking.findUniqueOrThrow({where:{id}});await prisma.booking.update({where:{id},data:{status,holdExpiresAt:status==="AWAITING_PAYMENT"?b.holdExpiresAt:null,history:{create:{fromStatus:b.status,toStatus:status,note:"Изменено администратором"}}}});await audit("STATUS_CHANGE","Booking",id,{from:b.status,to:status});revalidatePath("/admin/bookings");revalidatePath(`/admin/bookings/${id}`);}


export async function cancelOwnBookingAction(form: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const id = s(form.get("id"));
  const booking = await prisma.booking.findFirst({ where: { id, userId: session.userId } });
  if (!booking) throw new Error("Бронирование не найдено");
  if (!["AWAITING_PAYMENT", "PAID", "CONFIRMED"].includes(booking.status)) throw new Error("Эту бронь нельзя отменить");
  if (booking.checkIn <= new Date()) throw new Error("После наступления даты заезда отмена через кабинет недоступна");
  await prisma.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      holdExpiresAt: null,
      history: { create: { fromStatus: booking.status, toStatus: "CANCELLED", note: "Отменено клиентом" } },
    },
  });
  revalidatePath("/account");
}

export async function markPaymentManuallyAction(form: FormData) {
  await admin();
  const bookingId = s(form.get("id"));
  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (["CANCELLED", "COMPLETED", "EXPIRED"].includes(booking.status)) throw new Error("Нельзя отметить оплату для закрытой брони");
    const payment = await tx.payment.upsert({
      where: { idempotencyKey: `manual:${bookingId}` },
      update: { status: "SUCCEEDED", amountMinor: booking.prepaymentMinor },
      create: { bookingId, provider: "manual", idempotencyKey: `manual:${bookingId}`, amountMinor: booking.prepaymentMinor, status: "SUCCEEDED" },
    });
    await tx.paymentEvent.upsert({
      where: { providerEventId: `manual:${bookingId}` },
      update: {},
      create: { paymentId: payment.id, providerEventId: `manual:${bookingId}`, type: "manual.payment", payloadJson: { bookingId }, processedAt: new Date() },
    });
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED", holdExpiresAt: null, history: { create: { fromStatus: booking.status, toStatus: "CONFIRMED", note: "Предоплата отмечена администратором" } } },
    });
  });
  await audit("MANUAL_PAYMENT", "Booking", bookingId);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
}
