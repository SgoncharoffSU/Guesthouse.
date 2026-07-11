import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/domain";

export const dynamic = "force-dynamic";

type Query = Record<string, string | undefined>;

export default async function Rooms({ searchParams }: { searchParams: Promise<Query> }) {
  const q = await searchParams;
  const guests = Math.max(1, Number(q.guests || 1));
  const checkIn = q.checkIn ? new Date(`${q.checkIn}T00:00:00Z`) : null;
  const checkOut = q.checkOut ? new Date(`${q.checkOut}T00:00:00Z`) : null;
  const sort = q.sort || "recommended";

  const where: Record<string, unknown> = {
    isActive: true,
    archivedAt: null,
    capacity: { gte: guests },
  };

  if (checkIn && checkOut && checkOut > checkIn) {
    where.bookings = {
      none: {
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        OR: [
          { status: { in: ["PAID", "CONFIRMED"] } },
          { status: "AWAITING_PAYMENT", holdExpiresAt: { gt: new Date() } },
        ],
      },
    };
    where.blocks = {
      none: { startsAt: { lt: checkOut }, endsAt: { gt: checkIn } },
    };
  }

  const orderBy =
    sort === "cheap"
      ? { basePriceMinor: "asc" as const }
      : sort === "expensive"
        ? { basePriceMinor: "desc" as const }
        : sort === "capacity"
          ? { capacity: "desc" as const }
          : [{ isRecommended: "desc" as const }, { basePriceMinor: "asc" as const }];

  const rooms = await prisma.room.findMany({
    where,
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      attributeValues: { include: { definition: true } },
    },
    orderBy,
  });

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-3xl font-bold">Свободные номера</h1>
      <form className="card mt-6 grid gap-4 md:grid-cols-5">
        <input className="field" type="date" name="checkIn" defaultValue={q.checkIn} />
        <input className="field" type="date" name="checkOut" defaultValue={q.checkOut} />
        <input className="field" name="guests" type="number" min="1" defaultValue={guests} />
        <select className="field" name="sort" defaultValue={sort}>
          <option value="recommended">Сначала рекомендуемые</option>
          <option value="cheap">Сначала дешевле</option>
          <option value="expensive">Сначала дороже</option>
          <option value="capacity">По вместимости</option>
        </select>
        <button className="btn">Обновить</button>
      </form>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {rooms.map((room) => (
          <article className="card overflow-hidden p-0" key={room.id}>
            {room.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={room.images[0].url} alt={room.images[0].alt || room.name} className="h-48 w-full object-cover" />
            ) : (
              <div className="flex h-48 items-center justify-center bg-slate-200">Нет фотографии</div>
            )}
            <div className="p-5">
              <h2 className="text-xl font-bold">{room.name}</h2>
              <p className="mt-2 text-slate-600">{room.description}</p>
              <p className="mt-4 font-bold">до {room.capacity} гостей</p>
              <p className="mt-1 text-2xl font-bold">
                {formatMoney(room.basePriceMinor)} <span className="text-sm font-normal">за ночь</span>
              </p>
              <Link
                href={`/booking/${room.id}?checkIn=${q.checkIn ?? ""}&checkOut=${q.checkOut ?? ""}&guests=${guests}`}
                className="btn mt-5 w-full"
              >
                Выбрать
              </Link>
            </div>
          </article>
        ))}
        {rooms.length === 0 && <div className="card md:col-span-3">Свободных подходящих номеров не найдено.</div>}
      </div>
    </main>
  );
}
