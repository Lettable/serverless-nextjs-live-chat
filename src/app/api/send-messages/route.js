import { connectDB } from "@/utils/config/db";
import Message from "@/utils/model/message";
import { NextResponse } from "next/server";

export async function POST(req) {
    await connectDB();
    const { username, content } = await req.json();

    if (!username || !content) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = await Message.create({ username, content });

    return NextResponse.json({ success: true, messageId: result._id }, { status: 201 });
}
