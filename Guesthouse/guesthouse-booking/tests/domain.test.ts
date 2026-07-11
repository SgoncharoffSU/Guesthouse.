import { describe,it,expect } from 'vitest';
import { calculateNights, calculateStayPrice, isRoomAvailable, calculatePrepayment } from '../src/lib/domain';
describe('booking domain',()=>{
 it('calculates nights',()=>expect(calculateNights(new Date('2026-07-01'),new Date('2026-07-04'))).toBe(3));
 it('rejects invalid dates',()=>expect(()=>calculateNights(new Date('2026-07-04'),new Date('2026-07-04'))).toThrow());
 it('applies seasonal price',()=>expect(calculateStayPrice(new Date('2026-07-01'),new Date('2026-07-04'),50000,[{startsAt:new Date('2026-07-02'),endsAt:new Date('2026-07-03'),priceMinor:80000}])).toBe(180000));
 it('detects overlapping booking',()=>expect(isRoomAvailable(new Date('2026-07-02'),new Date('2026-07-04'),[{checkIn:new Date('2026-07-03'),checkOut:new Date('2026-07-05'),status:'CONFIRMED'}],[])).toBe(false));
 it('ignores expired hold',()=>expect(isRoomAvailable(new Date('2026-07-02'),new Date('2026-07-04'),[{checkIn:new Date('2026-07-03'),checkOut:new Date('2026-07-05'),status:'AWAITING_PAYMENT',holdExpiresAt:new Date('2026-01-01')}],[],new Date('2026-07-01'))).toBe(true));
 it('calculates prepayment',()=>expect(calculatePrepayment(1000000,'PERCENT',30,100000)).toBe(300000));
});
