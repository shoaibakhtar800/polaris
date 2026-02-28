import { convex } from "@/lib/convex-client";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";
import z from "zod";
import { api } from "../../../../../convex/_generated/api";
import { DEFAULT_CONVERSATION_TITLE } from "@/features/conversations/constants/constants";
import { inngest } from "@/inngest/client";

const requestSchema = z.object({
  prompt: z.string().min(1),
});

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal API key not found" },
      { status: 500 },
    );
  }

  const body = await req.json();

  const { prompt } = requestSchema.parse(body);

  if (!prompt) {
    return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
  }

  const projectName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals, colors],
    length: 3,
    separator: "-",
  });

  const { projectId, conversationId } = await convex.mutation(
    api.system.createProjectWithConversation,
    {
      internalKey,
      projectName,
      ownerId: userId,
      conversationTitle: DEFAULT_CONVERSATION_TITLE,
    },
  );

  await convex.mutation(api.system.createMessage, {
    internalKey,
    conversationId,
    projectId,
    role: "user",
    content: prompt,
  });

  const assistantMessageId = await convex.mutation(api.system.createMessage, {
    internalKey,
    conversationId,
    projectId,
    role: "assistant",
    content: "",
    status: "processing",
  });

  await inngest.send({
    name: "message/sent",
    data: {
      messageId: assistantMessageId,
      conversationId,
      projectId,
      message: prompt,
    },
  });

  return NextResponse.json({
    projectId,
  });
}
