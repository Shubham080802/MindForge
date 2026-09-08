import { describe, expect, it, vi } from "vitest";
import { readAIStream } from "@/lib/sse-stream";

function streamChunks(...chunks: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe("AI SSE reader", () => {
  it("reassembles JSON events split across network chunks", async () => {
    const onContent = vi.fn();
    const stream = streamChunks(
      'data: {"content":"Machine","done":fa',
      'lse}\n\ndata: {"content":" learning","done":false}\n\n',
      'data: {"message":{"id":"answer-1","content":"Machine learning"},"done":true}\n\ndata: [DONE]\n\n',
    );

    await expect(readAIStream(stream, onContent)).resolves.toEqual({
      content: "Machine learning",
      message: { id: "answer-1", content: "Machine learning" },
    });
    expect(onContent).toHaveBeenNthCalledWith(1, "Machine");
    expect(onContent).toHaveBeenNthCalledWith(2, "Machine learning");
  });

  it("surfaces provider errors instead of completing with a blank answer", async () => {
    const stream = streamChunks(
      'data: {"error":"Failed to generate response","done":true}\n\ndata: [DONE]\n\n',
    );

    await expect(readAIStream(stream)).rejects.toThrow("Failed to generate response");
  });
});
