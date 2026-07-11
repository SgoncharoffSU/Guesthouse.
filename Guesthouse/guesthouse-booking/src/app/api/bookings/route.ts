import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBooking } from "@/lib/booking-service";
const schema=z.object({roomId:z.string().min(1),checkIn:z.coerce.date(),checkOut:z.coerce.date(),guestsCount:z.coerce.number().int().min(1),guestName:z.string().min(2).max(100),guestPhone:z.string().min(7).max(30)});
export async function POST(req:NextRequest){try{const form=Object.fromEntries(await req.formData());const input=schema.parse(form);const booking=await createBooking(input);return NextResponse.redirect(new URL(`/payment/${booking.id}`,req.url),303)}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Ошибка создания бронирования'},{status:400})}}
