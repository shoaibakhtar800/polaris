import { inngest } from "@/inngest/client";

export async function POST(request: Request) {
  await inngest.send({ name: "demo/error", data: {} });

  return Response.json({ statue: "started" });
}
