import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed с демонстрационными данными запрещен в production");
  }

  const passwordHash = await bcrypt.hash(process.env.DEV_ADMIN_PASSWORD ?? "ChangeMe123!", 12);
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      propertyName: "Тихая усадьба",
      address: "Укажите адрес в разделе «Настройки»",
      phone: "+7 900 000-00-00",
      description: "Гостевые номера на частной территории",
      cancellationRules: "Бесплатная отмена определяется владельцем объекта.",
      refundRules: "Возврат производится по правилам, опубликованным на сайте.",
      privacyPolicy: "Демонстрационный текст. Перед публикацией замените юридически проверенным документом.",
      personalDataConsent: "Демонстрационный текст согласия на обработку персональных данных.",
    },
  });

  await prisma.user.upsert({
    where: { phone: "+79990000000" },
    update: { role: "ADMIN", passwordHash },
    create: { phone: "+79990000000", name: "Администратор", role: "ADMIN", passwordHash, phoneVerified: new Date() },
  });

  const rooms = [
    { code: "Н-1", slug: "family", name: "Семейный номер", description: "Просторный номер с отдельным санузлом и кухней.", basePriceMinor: 650000, capacity: 4, isRecommended: true },
    { code: "Н-2", slug: "cozy", name: "Уютный номер", description: "Тихий номер для пары с видом на сад.", basePriceMinor: 480000, capacity: 2 },
    { code: "Д-1", slug: "house", name: "Большой домик", description: "Отдельный домик для семьи или компании.", basePriceMinor: 920000, capacity: 6 },
  ];
  for (const room of rooms) await prisma.room.upsert({ where: { code: room.code }, update: room, create: room });

  const attrs = [
    { key: "bathroom", name: "Отдельный санузел", type: "BOOLEAN" as const, isFilterable: true },
    { key: "wifi", name: "Wi‑Fi", type: "BOOLEAN" as const, isFilterable: true },
    { key: "floor", name: "Этаж", type: "NUMBER" as const, unit: "этаж" },
    { key: "view", name: "Вид из окна", type: "SELECT" as const, isFilterable: true },
  ];
  for (const attr of attrs) await prisma.attributeDefinition.upsert({ where: { key: attr.key }, update: attr, create: attr });

  const family = await prisma.room.findUniqueOrThrow({ where: { code: "Н-1" } });
  await prisma.pricingRule.createMany({
    data: [{ roomId: family.id, name: "Высокий сезон", startsAt: new Date("2026-07-01"), endsAt: new Date("2026-09-01"), priceMinor: 750000, priority: 10 }],
    skipDuplicates: true,
  });
}

main().finally(() => prisma.$disconnect());
