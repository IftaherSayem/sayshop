import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

const SYSTEM_PROMPT =
  "You are a helpful shopping assistant for Say Shop, an e-commerce store. Help users find products, answer questions about orders, shipping, returns, and provide recommendations. Be friendly, concise, and helpful. Current store info: We have electronics, fashion, home & kitchen, sports, books, and beauty categories. Free shipping on orders over $50. 30-day returns. 24/7 customer support. Use coupon codes: WELCOME10 (10% off, min $50) and SAVE20 (20% off, min $100).";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body as {
      messages: { role: string; content: string }[];
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const zai = await getZAI();

    const apiMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
    ];

    const completion = await zai.chat.completions.create({
      messages: apiMessages,
      thinking: { type: "disabled" },
    });

    const response = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response. Please try again.";

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { message: "I'm having trouble connecting right now. Please try again in a moment." },
      { status: 200 }
    );
  }
}
