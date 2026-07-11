-- Выполняется после стандартной миграции Prisma.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Booking" ADD CONSTRAINT "booking_no_overlap"
EXCLUDE USING gist (
  "roomId" WITH =,
  daterange("checkIn", "checkOut", '[)') WITH &&
)
WHERE ("status" IN ('AWAITING_PAYMENT','PAID','CONFIRMED'));

ALTER TABLE "RoomBlock" ADD CONSTRAINT "room_block_valid_range"
CHECK ("startsAt" < "endsAt");
