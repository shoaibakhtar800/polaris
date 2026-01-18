import { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { verifyAuth } from "./auth";
import { v } from "convex/values";

export const getFiles = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity!.subject) {
      throw new Error("Unauthorized to access this project");
    }

    return await ctx.db
      .query("files")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getFile = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    const project = await ctx.db.get(file.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity!.subject) {
      throw new Error("Unauthorized to access this file");
    }

    return file;
  },
});

export const getFolderContents = query({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity!.subject) {
      throw new Error("Unauthorized to access this project");
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId),
      )
      .collect();

    return files.sort((a, b) => {
      if (a.type === "folder" && b.type === "file") return -1;
      if (a.type === "file" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
  },
});

export const createFile = mutation({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity!.subject) {
      throw new Error("Unauthorized to access this project");
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId),
      )
      .collect();

    const existing = files.find(
      (f) => f.name === args.name && f.type === "file",
    );

    if (existing) {
      throw new Error("File already exists");
    }

    await ctx.db.insert("files", {
      projectId: args.projectId,
      parentId: args.parentId,
      name: args.name,
      type: "file",
      content: args.content,
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.projectId, {
      updatedAt: Date.now(),
    });
  },
});

export const createFolder = mutation({
  args: {
    projectId: v.id("projects"),
    parentId: v.optional(v.id("files")),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const project = await ctx.db.get(args.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity!.subject) {
      throw new Error("Unauthorized to access this project");
    }

    const files = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", args.projectId).eq("parentId", args.parentId),
      )
      .collect();

    const existing = files.find(
      (f) => f.name === args.name && f.type === "folder",
    );

    if (existing) {
      throw new Error("Folder already exists");
    }

    await ctx.db.insert("files", {
      projectId: args.projectId,
      parentId: args.parentId,
      name: args.name,
      type: "folder",
      updatedAt: Date.now(),
    });

    await ctx.db.patch(args.projectId, {
      updatedAt: Date.now(),
    });
  },
});

export const renameFile = mutation({
  args: {
    fileId: v.id("files"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    const project = await ctx.db.get(file.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity!.subject) {
      throw new Error("Unauthorized to access this file");
    }

    const siblings = await ctx.db
      .query("files")
      .withIndex("by_project_parent", (q) =>
        q.eq("projectId", file.projectId).eq("parentId", file.parentId),
      )
      .collect();

    const existing = siblings.find(
      (f) =>
        f.name === args.name && f.type === file.type && f._id !== args.fileId,
    );

    if (existing) {
      throw new Error(`A ${file.type} named "${args.name}" already exists`);
    }

    await ctx.db.patch(args.fileId, {
      name: args.name,
      updatedAt: Date.now(),
    });

    await ctx.db.patch(file.projectId, {
      updatedAt: Date.now(),
    });
  },
});

export const deleteFile = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    const project = await ctx.db.get(file.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity!.subject) {
      throw new Error("Unauthorized to access this file");
    }

    const deleteRecursive = async (fileId: Id<"files">) => {
      const item = await ctx.db.get(fileId);

      if (!item) {
        return;
      }

      if (item.type === "folder") {
        const children = await ctx.db
          .query("files")
          .withIndex("by_project_parent", (q) =>
            q.eq("projectId", item.projectId).eq("parentId", item._id),
          )
          .collect();
        for (const child of children) {
          await deleteRecursive(child._id);
        }
      }

      if (item.storageId) {
        await ctx.storage.delete(item.storageId);
      }

      await ctx.db.delete(fileId);
    };

    await deleteRecursive(args.fileId);

    await ctx.db.patch(file.projectId, {
      updatedAt: Date.now(),
    });
  },
});

export const updateFile = mutation({
  args: {
    fileId: v.id("files"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    const project = await ctx.db.get(file.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity!.subject) {
      throw new Error("Unauthorized to access this file");
    }

    if (file.type !== "file") {
      throw new Error("File is not a file");
    }

    await ctx.db.patch(args.fileId, {
      content: args.content,
      updatedAt: Date.now(),
    });

    await ctx.db.patch(file.projectId, {
      updatedAt: Date.now(),
    });
  },
});

export const getFilePath = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyAuth(ctx);

    const file = await ctx.db.get(args.fileId);

    if (!file) {
      throw new Error("File not found");
    }

    const project = await ctx.db.get(file.projectId);

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.ownerId !== identity!.subject) {
      throw new Error("Unauthorized to access this file");
    }

    const path: { _id: string; name: string }[] = [];
    let currentId: Id<"files"> | undefined = args.fileId;

    while (currentId) {
      const file = (await ctx.db.get(currentId)) as Doc<"files"> | undefined;

      if (!file) {
        break;
      }

      path.unshift({ _id: file._id, name: file.name });
      currentId = file.parentId;
    }

    return path;
  },
});
