"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function Home() {
  const projects = useQuery(api.projects.get);
  const createProject = useMutation(api.projects.create);

  return (
    <div>
      <Button onClick={() => createProject({ name: "New Project" })}>
        Add New
      </Button>
      {projects?.map((project) => (
        <div key={project._id}>
          {project.name}
          {project.ownerId}
        </div>
      ))}
    </div>
  );
}
