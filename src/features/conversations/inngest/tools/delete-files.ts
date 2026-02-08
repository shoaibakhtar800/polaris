import { convex } from "@/lib/convex-client";
import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface DeleteFilesToolOptions {
  internalKey: string;
}

const paramsSchema = z.object({
  fileIds: z
    .array(z.string().min(1, "File Id cannot be empty"))
    .min(1, "At least one file ID is required"),
});

export const createDeleteFilesTool = ({
  internalKey,
}: DeleteFilesToolOptions) => {
  return createTool({
    name: "deleteFiles",
    description:
      "Delete files or folders from the project. If deleting a folder, all contents will be deleted recursively.",
    parameters: z.object({
      fileIds: z
        .array(z.string())
        .describe("Array of file or folder Ids to delete"),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { fileIds } = parsed.data;

      const filesToDelete: {
        id: string;
        name: string;
        type: "file" | "folder";
      }[] = [];

      for (const fileId of fileIds) {
        const file = await convex.query(api.system.getFileById, {
          internalKey,
          fileId: fileId as Id<"files">,
        });

        if (!file) {
          return `Error: File "${fileId}" not found. Use listFiles to get valid file IDs.`;
        }

        filesToDelete.push({
          id: file._id,
          name: file.name,
          type: file.type,
        });
      }

      try {
        return await toolStep?.run("delete-files", async () => {
          const results: string[] = [];

          for (const file of filesToDelete) {
            try {
              await convex.mutation(api.system.deleteFile, {
                internalKey,
                fileId: file.id as Id<"files">,
              });

              results.push(`Deleted ${file.type} ${file.name} successfully.`);
            } catch (error) {
              results.push(
                `Error deleting ${file.type} ${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
              );
            }
          }

          return results.join("\n");
        });
      } catch (error) {
        return `Error deleting files: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
