import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export const useConversationById = (id: Id<"conversations"> | null) => {
  return useQuery(api.conversations.getById, id ? { id } : "skip");
};

export const useMessagesByConversationId = (
  conversationId: Id<"conversations"> | null,
) => {
  return useQuery(
    api.conversations.getMessages,
    conversationId ? { conversationId } : "skip",
  );
};

export const useConversationsByProjectId = (projectId: Id<"projects">) => {
  return useQuery(
    api.conversations.getByProject,
    projectId ? { projectId } : "skip",
  );
};

export const useCreateConversation = () => {
  return useMutation(api.conversations.create).withOptimisticUpdate(
    (localStorage, args) => {
      const existingConversations = localStorage.getQuery(
        api.conversations.getByProject,
        {
          projectId: args.projectId,
        },
      );

      if (existingConversations !== undefined) {
        // eslint-disable-next-line react-hooks/purity -- convex's optimistic updates are not pure
        const now = Date.now();
        const newConversation = {
          _id: crypto.randomUUID() as Id<"conversations">,
          _creationTime: now,
          _updatedTime: now,
          projectId: args.projectId,
          title: args.title,
          createdAt: now,
          updatedAt: now,
        };
        localStorage.setQuery(
          api.conversations.getByProject,
          { projectId: args.projectId },
          [newConversation, ...existingConversations],
        );
      }
    },
  );
};
