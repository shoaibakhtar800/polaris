import { convex } from "@/lib/convex-client";
import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

interface CreateFolderToolOptions {
  internalKey: string;
  projectId: Id<"projects">;
}

const paramsSchema = z.object({
  parentId: z.string(),
  name: z.string().min(1, "Name is required"),
});

export const createCreateFolderTool = ({
  internalKey,
  projectId,
}: CreateFolderToolOptions) => {
  return createTool({
    name: "createFolder",
    description:
      "Create a new folder in the same folder. Use this to batch create files that share the same parent folder. More efficient than creating files one by one.",
    parameters: z.object({
      parentId: z
        .string()
        .describe(
          "The ID (not name!) of the parent folder from listFiles, or empty string for root level",
        ),
      name: z.string().describe("The name of the folder to create"),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { parentId, name } = parsed.data;

      try {
        return await toolStep?.run("create-folder", async () => {
          if (parentId) {
            const parentFolder = await convex.query(api.system.getFileById, {
              internalKey,
              fileId: parentId as Id<"files">,
            });

            if (!parentFolder || parentFolder.type !== "folder") {
              return `Error: Parent ID ${parentId} does not exist or is not a folder`;
            }
          }

          const folderId = await convex.mutation(api.system.createFolder, {
            internalKey,
            projectId,
            parentId: parentId ? (parentId as Id<"files">) : undefined,
            name,
          });

          return `Folder created with Id: ${folderId}`;
        });
      } catch (error) {
        return `Error creating folder: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
