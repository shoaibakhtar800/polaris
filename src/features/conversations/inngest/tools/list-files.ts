import { convex } from "@/lib/convex-client";
import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface ReadFilesToolInput {
  internalKey: string;
}

const paramsSchema = z.object({
  fileIds: z
    .array(z.string().min(1, "File Id is required"))
    .min(1, "At least one file id is required"),
});

export const createReadFilesTool = ({ internalKey }: ReadFilesToolInput) => {
  return createTool({
    name: "read-files",
    description:
      "Read the content of files from the project, Returns file contents.",
    parameters: z.object({
      fileIds: z.array(z.string()).describe("Array of file Ids to read"),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);

      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { fileIds } = parsed.data;

      try {
        return await toolStep?.run("read-files", async () => {
          const results: { id: string; name: string; content: string }[] = [];

          for (const fileId of fileIds) {
            const file = await convex.query(api.system.getFileById, {
              internalKey,
              fileId: fileId as Id<"files">,
            });

            if (file && file.content) {
              results.push({
                id: fileId,
                name: file.name,
                content: file.content,
              });
            }
          }

          if (results.length === 0) {
            return "Error: No files found with provided Ids. Use lastFiles to get valid file Ids.";
          }

          return JSON.stringify(results);
        });
      } catch (error) {
        return `Error reading files: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
