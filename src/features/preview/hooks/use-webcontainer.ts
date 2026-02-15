import { useFiles } from "@/features/projects/hooks/use-files";
import { WebContainer } from "@webcontainer/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { buildFileTree, getFilePath } from "../utils/file-tree";

let webContainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

const getWebContainer = async (): Promise<WebContainer> => {
  if (webContainerInstance) {
    return webContainerInstance;
  }

  if (!bootPromise) {
    bootPromise = WebContainer.boot({ coep: "credentialless" });
  }

  webContainerInstance = await bootPromise;
  return webContainerInstance;
};

const teardownWebContainer = () => {
  if (webContainerInstance) {
    webContainerInstance.teardown();
    webContainerInstance = null;
  }
  bootPromise = null;
};

interface UseWebContainerProps {
  projectId: Id<"projects">;
  enabled: boolean;
  settings?: {
    installCommand?: string;
    devCommand?: string;
  };
}

export function useWebContainer({
  projectId,
  enabled,
  settings,
}: UseWebContainerProps) {
  const [status, setStatus] = useState<
    "idle" | "booting" | "installing" | "running" | "error"
  >("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0);
  const [terminalOutput, setTerminalOutput] = useState("");

  const containerRef = useRef<WebContainer | null>(null);
  const hasStartedRef = useRef(false);
  const processInputRef = useRef<WritableStreamDefaultWriter | null>(null);

  const files = useFiles(projectId);

  useEffect(() => {
    if (!enabled || !files || files.length === 0 || hasStartedRef.current) {
      return;
    }

    const start = async () => {
      try {
        setStatus("booting");
        setError(null);
        setTerminalOutput("");

        const appendOutput = (data: string) => {
          setTerminalOutput((prev) => prev + data);
        };

        const webcontainer = await getWebContainer();
        containerRef.current = webcontainer;
        hasStartedRef.current = true;

        const fileTree = buildFileTree(files);
        await webcontainer.mount(fileTree);

        webcontainer.on("server-ready", (_port, url) => {
          setPreviewUrl(url);
          setStatus("running");
        });

        setStatus("installing");

        const installCmd = settings?.installCommand || "npm install";
        const [installBin, ...installArgs] = installCmd.split(" ");
        appendOutput(`\n$ ${installCmd}\n`);

        const installProcess = await webcontainer.spawn(
          installBin,
          installArgs,
        );
        processInputRef.current = installProcess.input.getWriter();
        installProcess.output.pipeTo(
          new WritableStream({
            write(chunk: string) {
              appendOutput(chunk);
            },
          }),
        );

        const installExitCode = await installProcess.exit;
        processInputRef.current?.releaseLock();
        processInputRef.current = null;

        if (installExitCode !== 0) {
          throw new Error(
            `Installation failed with ${installCmd} exit code ${installExitCode}`,
          );
        }

        const devCmd = settings?.devCommand || "npm run dev";
        const [devBin, ...devArgs] = devCmd.split(" ");
        appendOutput(`\n$ ${devCmd}\n`);

        const devProcess = await webcontainer.spawn(devBin, devArgs);
        processInputRef.current = devProcess.input.getWriter();
        devProcess.output.pipeTo(
          new WritableStream({
            write(chunk: string) {
              appendOutput(chunk);
            },
          }),
        );
      } catch (err) {
        console.error("Failed to start WebContainer: ", err);
        setError(err instanceof Error ? err.message : "Unknown error");
        setStatus("error");
      }
    };

    start();
  }, [
    enabled,
    files,
    restartKey,
    settings?.installCommand,
    settings?.devCommand,
  ]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !files || status !== "running") {
      return;
    }

    const filesMap = new Map(files.map((f) => [f._id, f]));

    for (const file of files) {
      if (file.type !== "file" || file.storageId || !file.content) continue;

      const filePath = getFilePath(file, filesMap);
      container.fs.writeFile(filePath, file.content);
    }
  }, [files, status]);

  useEffect(() => {
    if (!enabled) {
      hasStartedRef.current = false;
      setStatus("idle");
      setPreviewUrl(null);
      setError(null);
    }
  }, [enabled]);

  const restart = useCallback(() => {
    teardownWebContainer();
    containerRef.current = null;
    hasStartedRef.current = false;
    setStatus("idle");
    setPreviewUrl(null);
    setError(null);
    setRestartKey((prev) => prev + 1);
  }, []);

  const writeToTerminal = useCallback((data: string) => {
    processInputRef.current?.write(data);
  }, []);

  return {
    status,
    previewUrl,
    error,
    terminalOutput,
    restart,
    writeToTerminal,
  };
}
