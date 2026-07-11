/* eslint-disable @typescript-eslint/no-explicit-any */
import { calculateNights, calculatePrepayment, calculateStayPrice } from "@/lib/domain";

export async function createBooking(input: { roomId: string; checkIn: Date; checkOut: Date; guestsCount: number; guestName: string; guestPhone: string; userId?: string }) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.$transaction(async (tx: any) => {
    const [room, settings, overlapping, blocks, rules] = await Promise.all([
      tx.room.findUniqueOrThrow({ where: { id: input.roomId } }),
      tx.appSettings.upsert({ where: { id: "singleton" }, update: {}, create: {} }),
      tx.booking.findFirst({ where: { roomId: input.roomId, checkIn: { lt: input.checkOut }, checkOut: { gt: input.checkIn }, OR: [{ status: { in: ["PAID", "CONFIRMED"] } }, { status: "AWAITING_PAYMENT", holdExpiresAt: { gt: new Date() } }] } }),
      tx.roomBlock.findFirst({ where: { roomId: input.roomId, startsAt: { lt: input.checkOut }, endsAt: { gt: input.checkIn } } }),
      tx.pricingRule.findMany({ where: { OR: [{ roomId: input.roomId }, { roomId: null }], startsAt: { lt: input.checkOut }, endsAt: { gt: input.checkIn } } }),
    ]);
    if (!room.isActive || room.archivedAt) throw new Error("Номер недоступен");
    if (overlapping || blocks) throw new Error("Номер уже занят на выбранные даты");
    const nights = calculateNights(input.checkIn, input.checkOut);
    if (nights < room.minNights || nights > room.maxNights) throw new Error("Недопустимая длительность проживания");
    if (input.guestsCount < 1 || input.guestsCount > room.capacity) throw new Error("Некорректное количество гостей");
    const totalMinor = calculateStayPrice(input.checkIn, input.checkOut, room.basePriceMinor, rules);
    const mode = settings.prepaymentMode as "FIXED" | "PERCENT" | "FULL";
    const prepaymentMinor = calculatePrepayment(totalMinor, mode, settings.prepaymentValue, settings.minimumPrepaymentMinor);
    const number = `БР-${Date.now().toString(36).toUpperCase()}`;
    return tx.booking.create({ data: { number, roomId: room.id, userId: input.userId, status: "AWAITING_PAYMENT", checkIn: input.checkIn, checkOut: input.checkOut, nights, guestsCount: input.guestsCount, totalMinor, prepaymentMinor, balanceMinor: totalMinor - prepaymentMinor, holdExpiresAt: new Date(Date.now() + settings.holdMinutes * 60000), guestName: input.guestName, guestPhone: input.guestPhone, history: { create: { toStatus: "AWAITING_PAYMENT", note: "Бронь создана" } } } });
  }, { isolationLevel: "Serializable" });
}


export async function expireStaleBookings() {
  const { prisma } = await import("@/lib/prisma");
  const stale = await prisma.booking.findMany({
    where: { status: "AWAITING_PAYMENT", holdExpiresAt: { lte: new Date() } },
    select: { id: true, status: true },
    take: 200,
  });
  if (!stale.length) return 0;
  await prisma.$transaction(
    stale.map((booking) =>
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: "EXPIRED",
          holdExpiresAt: null,
          history: { create: { fromStatus: booking.status, toStatus: "EXPIRED", note: "Срок оплаты истек автоматически" } },
        },
      }),
    ),
  );
  return stale.length;
}
