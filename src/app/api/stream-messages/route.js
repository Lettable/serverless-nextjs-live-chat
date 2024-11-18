import { MongoClient } from "mongodb";
import { connectDB } from "@/utils/config/db";
import Message from "@/utils/model/message";
import { NextResponse } from "next/server";

export async function GET(req) {
  connectDB()
  const stream = new ReadableStream({
    start(controller) {
      const changeStream = Message.watch();

      changeStream.on("change", (change) => {
        if (change.operationType === "insert") {
          const newMessage = change.fullDocument;
          const messageString = `data: ${JSON.stringify(newMessage)}\n\n`;
          controller.enqueue(new TextEncoder().encode(messageString));
        }
      });

      req.signal.addEventListener("abort", () => {
        changeStream.close();
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
