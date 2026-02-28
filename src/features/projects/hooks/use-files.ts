import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const sortFiles = <T extends { type: "file" | "folder"; name: string }>(
  files: T[],
): T[] => {
  return [...files].sort((a, b) => {
    if (a.type === "folder" && b.type === "file") {
      return -1;
    }
    if (a.type === "file" && b.type === "folder") {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });
};

export const useFiles = (projectId: Id<"projects">) => {
  return useQuery(api.files.getFiles, projectId ? { projectId } : "skip");
};

export const useCreateFile = () => {
  return useMutation(api.files.createFile).withOptimisticUpdate(
    (localStorage, args) => {
      const existingFiles = localStorage.getQuery(api.files.getFolderContents, {
        projectId: args.projectId,
        parentId: args.parentId,
      });

      if (existingFiles !== undefined) {
        // eslint-disable-next-line react-hooks/purity -- convex's optimistic updates are not pure
        const now = Date.now();
        const newFile = {
          _id: crypto.randomUUID() as Id<"files">,
          _creationTime: now,
          _updatedTime: now,
          projectId: args.projectId,
          parentId: args.parentId,
          name: args.name,
          type: "file" as const,
          updatedAt: now,
          content: args.content,
        };
        localStorage.setQuery(
          api.files.getFolderContents,
          { projectId: args.projectId, parentId: args.parentId },
          sortFiles([...existingFiles, newFile]),
        );
      }
    },
  );
};

export const useCreateFolder = () => {
  return useMutation(api.files.createFolder).withOptimisticUpdate(
    (localStorage, args) => {
      const existingFiles = localStorage.getQuery(api.files.getFolderContents, {
        projectId: args.projectId,
        parentId: args.parentId,
      });

      if (existingFiles !== undefined) {
        // eslint-disable-next-line react-hooks/purity -- convex's optimistic updates are not pure
        const now = Date.now();
        const newFolder = {
          _id: crypto.randomUUID() as Id<"files">,
          _creationTime: now,
          _updatedTime: now,
          projectId: args.projectId,
          parentId: args.parentId,
          name: args.name,
          type: "folder" as const,
          updatedAt: now,
        };
        localStorage.setQuery(
          api.files.getFolderContents,
          { projectId: args.projectId, parentId: args.parentId },
          sortFiles([...existingFiles, newFolder]),
        );
      }
    },
  );
};

export const useFolderContents = ({
  projectId,
  parentId,
  enabled = true,
}: {
  projectId: Id<"projects">;
  parentId?: Id<"files">;
  enabled?: boolean;
}) => {
  return useQuery(
    api.files.getFolderContents,
    enabled ? { projectId, parentId } : "skip",
  );
};

export const useRenameFile = ({
  projectId,
  parentId,
}: {
  projectId: Id<"projects">;
  parentId?: Id<"files">;
}) => {
  return useMutation(api.files.renameFile).withOptimisticUpdate(
    (localStorage, args) => {
      const existingFiles = localStorage.getQuery(api.files.getFolderContents, {
        projectId,
        parentId,
      });

      if (existingFiles !== undefined) {
        const updatedFiles = existingFiles.map((file) =>
          file._id === args.fileId ? { ...file, name: args.name } : file,
        );

        localStorage.setQuery(
          api.files.getFolderContents,
          { projectId, parentId },
          sortFiles(updatedFiles),
        );
      }
    },
  );
};

export const useDeleteFile = ({
  projectId,
  parentId,
}: {
  projectId: Id<"projects">;
  parentId?: Id<"files">;
}) => {
  return useMutation(api.files.deleteFile).withOptimisticUpdate(
    (localStorage, args) => {
      const existingFiles = localStorage.getQuery(api.files.getFolderContents, {
        projectId,
        parentId,
      });

      if (existingFiles !== undefined) {
        localStorage.setQuery(
          api.files.getFolderContents,
          { projectId, parentId },
          existingFiles.filter((file) => file._id !== args.fileId),
        );
      }
    },
  );
};

export const useFile = (fileId: Id<"files"> | null) => {
  return useQuery(api.files.getFile, fileId ? { fileId } : "skip");
};

export const useFilePath = (fileId: Id<"files"> | null) => {
  return useQuery(api.files.getFilePath, fileId ? { fileId } : "skip");
};

export const useUpdateFile = () => {
  return useMutation(api.files.updateFile);
};
