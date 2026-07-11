export type BookingStatusKey = "DRAFT"|"AWAITING_PAYMENT"|"PAID"|"CONFIRMED"|"CANCELLED"|"COMPLETED"|"EXPIRED";
export type PaymentStatusKey = "PENDING"|"SUCCEEDED"|"FAILED"|"CANCELLED"|"REFUNDED";
export const bookingStatusLabel: Record<BookingStatusKey,string>={DRAFT:"Черновик",AWAITING_PAYMENT:"Ожидает оплаты",PAID:"Предоплата получена",CONFIRMED:"Подтверждено",CANCELLED:"Отменено",COMPLETED:"Проживание завершено",EXPIRED:"Срок оплаты истек"};
export const paymentStatusLabel: Record<PaymentStatusKey,string>={PENDING:"Ожидает оплаты",SUCCEEDED:"Оплачено",FAILED:"Ошибка оплаты",CANCELLED:"Отменено",REFUNDED:"Возвращено"};
