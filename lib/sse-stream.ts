type AIStreamMessage = { id: string; content: string; [key: string]: unknown };

type AIStreamEvent = {
  content?: string;
  done?: boolean;
  error?: string;
  message?: AIStreamMessage;
};

export async function readAIStream(
  stream: ReadableStream<Uint8Array>,
  onContent: (content: string) => void = () => undefined,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let content = "";
  let message: AIStreamMessage | undefined;
  let buffer = "";

  const processFrame = (frame: string) => {
    const payload = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!payload || payload === "[DONE]") return;

    const event = JSON.parse(payload) as AIStreamEvent;
    if (event.error) throw new Error(event.error);
    if (event.content && !event.done) {
      content += event.content;
      onContent(content);
    }
    if (event.done && event.message) message = event.message;
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) processFrame(frame);
    if (done) {
      if (buffer.trim()) processFrame(buffer);
      break;
    }
  }

  return { content, message };
}
