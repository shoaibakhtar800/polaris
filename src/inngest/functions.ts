import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "demo/error" },
  async ({ event, step }) => {
    await step.run("fail", async () => {
      throw new Error("Inngest error: Something went wrong");
    });
  }
);
