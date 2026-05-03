import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  const { apiKey } = (await req.json()) as { apiKey: string };
  if (!apiKey?.startsWith("sk-ant-")) {
    return NextResponse.json(
      { ok: false, error: "Key must start with sk-ant-" },
      { status: 400 }
    );
  }

  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 5,
      messages: [{ role: "user", content: "ok" }],
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = (err as Error).message;
    return NextResponse.json(
      {
        ok: false,
        error: msg.includes("401") || msg.includes("authentication")
          ? "Invalid API key"
          : msg.includes("credit") || msg.includes("billing")
          ? "Key valid but no credits — top up at console.anthropic.com"
          : msg,
      },
      { status: 400 }
    );
  }
}
