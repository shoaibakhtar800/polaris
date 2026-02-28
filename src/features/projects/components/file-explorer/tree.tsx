import { useState } from "react";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import {
  useCreateFile,
  useCreateFolder,
  useDeleteFile,
  useFolderContents,
  useRenameFile,
} from "../../hooks/use-files";
import { TreeItemWrapper } from "./tree-item-wrapper";
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingRow } from "./loading-row";
import { getItemPadding } from "./constants";
import { CreateInput } from "./create-input";
import { RenameInput } from "./rename-input";
import { useEditor } from "@/features/editor/hooks/use-editor";

export const Tree = ({
  item,
  level,
  projectId,
}: {
  item: Doc<"files">;
  level?: number;
  projectId: Id<"projects">;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);

  const renameFile = useRenameFile({
    projectId,
    parentId: item.parentId,
  });
  const deleteFile = useDeleteFile({
    projectId,
    parentId: item.parentId,
  });
  const createFile = useCreateFile();
  const createFolder = useCreateFolder();

  const { openFile, closeTab, activeTabId } = useEditor(projectId);

  const folderContents = useFolderContents({
    projectId,
    parentId: item._id,
    enabled: item.type === "folder",
  });

  const startCreating = (type: "file" | "folder") => {
    setCreating(type);
    setIsOpen(true);
  };

  const handleRename = (newName: string) => {
    if (newName === item.name) {
      setIsRenaming(false);
      return;
    }

    renameFile({ fileId: item._id, name: newName });
    setIsRenaming(false);
  };

  const handleCreate = (name: string) => {
    if (creating === "file") {
      createFile({ projectId, name, content: "", parentId: item._id });
    } else {
      createFolder({ projectId, name, parentId: item._id });
    }
    setCreating(null);
  };

  if (item.type === "file") {
    const fileName = item.name;
    const isActive = item._id === activeTabId;

    if (isRenaming) {
      return (
        <RenameInput
          type="file"
          defaultValue={fileName}
          level={level ?? 0}
          onSubmit={handleRename}
          onCancel={() => setIsRenaming(false)}
        />
      );
    }

    return (
      <TreeItemWrapper
        item={item}
        level={level ?? 0}
        isActive={isActive}
        onClick={() => openFile(item._id, { pinned: false })}
        onDoubleClick={() => openFile(item._id, { pinned: true })}
        onRename={() => setIsRenaming(true)}
        onDelete={() => {
          deleteFile({ fileId: item._id });
          closeTab(item._id);
        }}
        onCreateFile={() => {
          startCreating("file");
        }}
        onCreateFolder={() => {
          startCreating("folder");
        }}
      >
        <FileIcon fileName={fileName} autoAssign className="size-5" />
        <span className="truncate text-sm">{fileName}</span>
      </TreeItemWrapper>
    );
  }

  const folderName = item.name;

  const folderRender = (
    <>
      <div className="flex items-center gap-0.5">
        <ChevronRightIcon
          className={cn(
            "size-5 shrink-0 text-muted-foreground",
            isOpen && "rotate-90",
          )}
        />
        <FolderIcon folderName={folderName} className="size-5" />
      </div>
      <span className="truncate text-sm">{folderName}</span>
    </>
  );

  if (creating) {
    return (
      <>
        <button
          onClick={() => setIsOpen((value) => !value)}
          className="group flex items-center gap-1 h-5.5 hover:bg-accent/30 w-full"
          style={{ paddingLeft: getItemPadding(level ?? 0, false) }}
        >
          {folderRender}
        </button>
        {isOpen && (
          <>
            {folderContents === undefined && (
              <LoadingRow level={(level ?? 0) + 1} />
            )}
            <CreateInput
              type={creating}
              level={(level ?? 0) + 1}
              onSubmit={handleCreate}
              onCancel={() => setCreating(null)}
            />
            {folderContents?.map((subItem) => (
              <Tree
                key={subItem._id}
                item={subItem}
                level={(level ?? 0) + 1}
                projectId={projectId}
              />
            ))}
          </>
        )}
      </>
    );
  }

  if (isRenaming) {
    return (
      <>
        <RenameInput
          type="folder"
          defaultValue={folderName}
          isOpen={isOpen}
          level={level ?? 0}
          onSubmit={handleRename}
          onCancel={() => setIsRenaming(false)}
        />
        {isOpen && (
          <>
            {folderContents === undefined && (
              <LoadingRow level={(level ?? 0) + 1} />
            )}
            {folderContents?.map((subItem) => (
              <Tree
                key={subItem._id}
                item={subItem}
                level={(level ?? 0) + 1}
                projectId={projectId}
              />
            ))}
          </>
        )}
      </>
    );
  }

  return (
    <>
      <TreeItemWrapper
        item={item}
        level={level ?? 0}
        onClick={() => setIsOpen((value) => !value)}
        onRename={() => setIsRenaming(true)}
        onDelete={() => {
          deleteFile({ fileId: item._id });
        }}
        onCreateFile={() => {
          startCreating("file");
        }}
        onCreateFolder={() => {
          startCreating("folder");
        }}
      >
        {folderRender}
      </TreeItemWrapper>
      {isOpen && (
        <>
          {folderContents === undefined && (
            <LoadingRow level={(level ?? 0) + 1} />
          )}
          {folderContents?.map((subItem) => (
            <Tree
              key={subItem._id}
              item={subItem}
              level={(level ?? 0) + 1}
              projectId={projectId}
            />
          ))}
        </>
      )}
    </>
  );
};
