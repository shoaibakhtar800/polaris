import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";

export const useProjects = () => {
  return useQuery(api.projects.get);
};

export const useProjectsPartial = (limit: number) => {
  return useQuery(api.projects.getPartial, { limit });
};

export const useCreateProjects = () => {
  const { userId } = useAuth();

  if (!userId) {
    throw new Error("User is not authenticated");
  }

  return useMutation(api.projects.create).withOptimisticUpdate(
    (localStore, args) => {
      const existingProjects = localStore.getQuery(api.projects.get);

      if (existingProjects !== undefined) {
        const createNewProject = () => ({
          _id: crypto.randomUUID() as Id<"projects">,
          _creationTime: Date.now(),
          name: args.name,
          ownerId: userId,
          updatedAt: Date.now(),
        });

        const newProject = createNewProject();

        localStore.setQuery(api.projects.get, {}, [
          newProject,
          ...existingProjects,
        ]);
      }
    },
  );
};

export const useProjectById = (projectId: Id<"projects">) => {
  return useQuery(api.projects.getById, { id: projectId });
};

export const useRenameProject = () => {
  return useMutation(api.projects.rename).withOptimisticUpdate(
    (localStore, args) => {
      const getCurrentTime = () => Date.now();

      const existingProject = localStore.getQuery(api.projects.getById, {
        id: args.id,
      });

      if (existingProject !== undefined && existingProject !== null) {
        localStore.setQuery(
          api.projects.getById,
          { id: args.id },
          {
            ...existingProject,
            name: args.name,
            updatedAt: getCurrentTime(),
          },
        );
      }

      const existingProjects = localStore.getQuery(api.projects.get);

      if (existingProjects !== undefined && existingProjects !== null) {
        localStore.setQuery(
          api.projects.get,
          {},
          existingProjects.map((project) =>
            project._id === args.id
              ? { ...project, name: args.name, updatedAt: getCurrentTime() }
              : project,
          ),
        );
      }
    },
  );
};

export const useUpdateProjectSettings = () => {
  return useMutation(api.projects.updateSettings);
};
