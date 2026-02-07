import { convex } from "@/lib/convex-client";
import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface CreateFilesToolOptions {
  internalKey: string;
  projectId: Id<"projects">;
}

const paramsSchema = z.object({
  parentId: z.string(),
  files: z
    .array(
      z.object({
        name: z.string().min(1, "Name is required"),
        content: z.string(),
      }),
    )
    .min(1, "At least one file is required"),
});

export const createCreateFilesTool = ({
  internalKey,
  projectId,
}: CreateFilesToolOptions) => {
  return createTool({
    name: "createFiles",
    description:
      "Create multiple files at once in the same folder. Use this to batch create files that share the same parent folder. More efficient than creating files one by one.",
    parameters: z.object({
      parentId: z
        .string()
        .describe(
          "The ID of the parent folder. Use empty string for root level. Must be a valid foder ID from listFiles.",
        ),
      files: z
        .array(
          z.object({
            name: z.string().describe("The name including extension"),
            content: z.string().describe("The content of the file"),
          }),
        )
        .describe("Array of files to create"),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { parentId, files } = parsed.data;

      try {
        return await toolStep?.run("create-files", async () => {
          let resolvedParentId: Id<"files"> | undefined;

          if (parentId && parentId !== "") {
            try {
              resolvedParentId = parentId as Id<"files">;
              const parentFolder = await convex.query(api.system.getFileById, {
                internalKey,
                fileId: parentId as Id<"files">,
              });

              if (!parentFolder) {
                return `Error: Parent ID ${parentId} does not exist. Use listFiles to get valid folder IDs.`;
              }

              if (parentFolder.type !== "folder") {
                return `Error: The Id "${parentId}" is a file, not a folder. Use a folder ID as parentId.`;
              }
            } catch {
              return `Error: Invalid parentId "${parentId}". Use listFiles to get valid folder IDs, or use empty string for root level.`;
            }
          }

          const results = await convex.mutation(api.system.createFiles, {
            internalKey,
            projectId,
            parentId: resolvedParentId,
            files,
          });

          const created = results.filter((r) => !r.error);
          const failed = results.filter((r) => r.error);

          let response = `Created ${created.length} files`;

          if (created.length > 0) {
            response += `\nCreated files: ${created.map((f) => f.name).join(", ")} \n`;
          }

          if (failed.length > 0) {
            response += `\nFailed to create ${failed.length} files: ${failed.map((f) => f.error).join(", ")} \n`;
          }

          return response;
        });
      } catch (error) {
        return `Error creating files: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
