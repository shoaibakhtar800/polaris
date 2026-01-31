import { convex } from "@/lib/convex-client";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { inngest } from "@/inngest/client";

const requestSchema = z.object({
  conversationId: z.string(),
  message: z.string(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;
  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  const result = requestSchema.safeParse(await req.json());
  if (!result.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { conversationId, message } = result.data;

  const conversation = await convex.query(api.system.getConversationById, {
    conversationId: conversationId as Id<"conversations">,
    internalKey,
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 },
    );
  }

  const projectId = conversation.projectId;

  const processingMessages = await convex.query(
    api.system.getProcessingMessages,
    {
      projectId,
      internalKey,
    },
  );

  if (processingMessages.length > 0) {
    await Promise.all(
      processingMessages.map(async (msg) => {
        await inngest.send({
          name: "message/cancel",
          data: {
            messageId: msg._id,
          },
        });

        await convex.mutation(api.system.updateMessageStatus, {
          messageId: msg._id,
          status: "cancelled",
          internalKey,
        });
      }),
    );
  }

  await convex.mutation(api.system.createMessage, {
    conversationId: conversationId as Id<"conversations">,
    projectId,
    internalKey,
    content: message,
    role: "user",
  });

  const assistantMessageId = await convex.mutation(api.system.createMessage, {
    conversationId: conversationId as Id<"conversations">,
    projectId,
    internalKey,
    content: "",
    role: "assistant",
    status: "processing",
  });

  const event = await inngest.send({
    name: "message/sent",
    data: {
      messageId: assistantMessageId,
      conversationId,
      projectId,
      message,
    },
  });

  return NextResponse.json({
    success: true,
    eventId: event.ids[0],
    messageId: assistantMessageId,
  });
}
