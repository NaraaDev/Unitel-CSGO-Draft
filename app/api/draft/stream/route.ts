import { buildDraftState } from "@/lib/draft-state";

export const dynamic = "force-dynamic";

const POLL_MS = 1000;

export async function GET(req: Request): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastSerialized = "";
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Initial state
      try {
        const state = await buildDraftState();
        lastSerialized = JSON.stringify(state);
        send("state", state);
      } catch (err) {
        send("error", { message: (err as Error).message });
      }

      const interval = setInterval(async () => {
        if (closed) return;
        try {
          const state = await buildDraftState();
          const serialized = JSON.stringify(state);
          if (serialized !== lastSerialized) {
            lastSerialized = serialized;
            send("state", state);
          } else {
            send("ping", { t: Date.now() });
          }
        } catch (err) {
          send("error", { message: (err as Error).message });
        }
      }, POLL_MS);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
