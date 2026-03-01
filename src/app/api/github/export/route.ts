import { inngest } from "@/inngest/client";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import z from "zod";

const requestSchema = z.object({
  projectId: z.string(),
  repoName: z.string().min(1).max(100),
  visibility: z.enum(["public", "private"]).default("public"),
  description: z.string().max(350).optional(),
});

export async function POST(request: Request) {
  const { userId, has } = await auth();

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const hasPro = has({ plan: "pro" });

  if (!hasPro) {
    return NextResponse.json(
      { success: false, error: "Pro plan required" },
      { status: 403 },
    );
  }

  const body = await request.json();

  const { projectId, repoName, visibility, description } =
    requestSchema.parse(body);

  if (!projectId) {
    return NextResponse.json(
      { success: false, error: "Project id is required" },
      { status: 400 },
    );
  }

  const client = await clerkClient();
  const tokens = await client.users.getUserOauthAccessToken(userId, "github");
  const githubToken = tokens.data[0]?.token;

  if (!githubToken) {
    return NextResponse.json(
      {
        success: false,
        error: "Github is not connected, please connect it first",
      },
      { status: 400 },
    );
  }

  const internalKey = process.env.POLARIS_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { success: false, error: "Internal key not found" },
      { status: 500 },
    );
  }

  const event = await inngest.send({
    name: "github/export.repo",
    data: {
      projectId,
      repoName,
      visibility,
      description,
      githubToken,
      internalKey,
    },
  });

  return NextResponse.json({
    success: true,
    eventId: event.ids[0],
    projectId,
  });
}
