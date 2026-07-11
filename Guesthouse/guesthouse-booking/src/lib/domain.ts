import { differenceInCalendarDays, eachDayOfInterval, subDays } from "date-fns";

export type PriceRule = { startsAt: Date; endsAt: Date; priceMinor: number; priority?: number };
export type AvailabilityItem = { checkIn: Date; checkOut: Date; status: string; holdExpiresAt?: Date | null };

export function calculateNights(checkIn: Date, checkOut: Date): number {
  const nights = differenceInCalendarDays(checkOut, checkIn);
  if (!Number.isInteger(nights) || nights < 1) throw new Error("Дата выезда должна быть позже даты заезда");
  return nights;
}

export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isBlockingBooking(item: AvailabilityItem, now = new Date()): boolean {
  if (["PAID", "CONFIRMED"].includes(item.status)) return true;
  return item.status === "AWAITING_PAYMENT" && Boolean(item.holdExpiresAt && item.holdExpiresAt > now);
}

export function isRoomAvailable(checkIn: Date, checkOut: Date, bookings: AvailabilityItem[], blocks: { startsAt: Date; endsAt: Date }[], now = new Date()): boolean {
  calculateNights(checkIn, checkOut);
  return !bookings.some((b) => isBlockingBooking(b, now) && rangesOverlap(checkIn, checkOut, b.checkIn, b.checkOut))
    && !blocks.some((b) => rangesOverlap(checkIn, checkOut, b.startsAt, b.endsAt));
}

export function calculateStayPrice(checkIn: Date, checkOut: Date, basePriceMinor: number, rules: PriceRule[]): number {
  if (!Number.isInteger(basePriceMinor) || basePriceMinor < 0) throw new Error("Некорректная базовая цена");
  const nights = calculateNights(checkIn, checkOut);
  const dates = eachDayOfInterval({ start: checkIn, end: subDays(checkOut, 1) });
  const total = dates.reduce((sum, date) => {
    const matched = rules
      .filter((r) => date >= r.startsAt && date < r.endsAt)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
    return sum + (matched?.priceMinor ?? basePriceMinor);
  }, 0);
  if (dates.length !== nights) throw new Error("Ошибка расчета количества ночей");
  return total;
}

export function calculatePrepayment(totalMinor: number, mode: "FIXED" | "PERCENT" | "FULL", value: number, minimumMinor: number): number {
  const raw = mode === "FULL" ? totalMinor : mode === "FIXED" ? value : Math.ceil(totalMinor * value / 100);
  return Math.min(totalMinor, Math.max(raw, minimumMinor));
}

export function formatMoney(minor: number, currency = "RUB"): string {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}
