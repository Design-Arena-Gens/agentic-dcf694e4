import { NextRequest } from "next/server";
import { formatContext } from "../../../lib/faq";

export const runtime = "edge";

// Stream helper for simple text streaming
async function streamText(text: string) {
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function callOpenAI(system: string, user: string) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const body = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      stream: true,
    } as const;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok || !res.body) return null;

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = res.body!.getReader();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content ?? "";
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // ignore
            }
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return null;
  }
}

function ruleBasedFallback(query: string): string {
  const q = query.toLowerCase();
  if (/(refund|money back)/.test(q)) {
    return "We offer a 30-day money-back guarantee. Share your order ID to start a refund.";
  }
  if (/(password|reset|change)/.test(q)) {
    return "To change your password: Settings ? Security ? Change Password.";
  }
  if (/(invoice|receipt)/.test(q)) {
    return "View and download invoices from Billing ? Invoices in your dashboard.";
  }
  if (/(cancel).*subscription/.test(q)) {
    return "Cancel anytime from Billing ? Subscription. Access continues until period end.";
  }
  return "I'm here to help. Could you provide a bit more detail about your question?";
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const user = messages?.filter((m: any) => m.role === "user").slice(-1)[0]?.content ?? "";

  const context = formatContext(user);
  const system = [
    "You are a concise, helpful customer support AI.",
    "Only answer based on policies and facts. If uncertain, ask clarifying questions.",
    "If a refund is requested within 30 days, explain the steps and requirements.",
    context,
  ]
    .filter(Boolean)
    .join("\n\n");

  const openaiResponse = await callOpenAI(system, user);
  if (openaiResponse) return openaiResponse;

  const fallback = ruleBasedFallback(user);
  const composed = context ? `${fallback}\n\n${context}` : fallback;
  return streamText(composed);
}
