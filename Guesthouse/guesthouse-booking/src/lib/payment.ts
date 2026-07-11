export type CreatePaymentInput = { paymentId: string; amountMinor: number; currency: string; returnUrl: string };
export type CreatePaymentResult = { providerPaymentId: string; paymentUrl: string };
export interface PaymentProvider { name: string; createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>; verifyWebhook(rawBody: string, signature: string | null): Promise<{ eventId: string; providerPaymentId: string; status: "SUCCEEDED" | "FAILED" }> }

export class TestPaymentProvider implements PaymentProvider {
  name = "test";
  async createPayment(input: CreatePaymentInput) { return { providerPaymentId: `test_${input.paymentId}`, paymentUrl: `${input.returnUrl}?testPayment=${input.paymentId}` }; }
  async verifyWebhook(rawBody: string, signature: string | null) {
    if (process.env.NODE_ENV === "production") throw new Error("Тестовый провайдер запрещен в production");
    if (signature !== process.env.TEST_PAYMENT_WEBHOOK_SECRET) throw new Error("Неверная подпись webhook");
    const body = JSON.parse(rawBody) as { eventId: string; providerPaymentId: string; status: "SUCCEEDED" | "FAILED" };
    return body;
  }
}

export function getPaymentProvider(): PaymentProvider { return new TestPaymentProvider(); }
