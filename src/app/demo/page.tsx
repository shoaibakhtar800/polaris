"use client";

import { Button } from "@/components/ui/button";

export default function DemoPage() {
  const handleClientError = () => {
    throw new Error("Client error: Someting went wrong");
  };

  const handleApiError = async () => {
    await fetch("/api/demo/error", { method: "POST" });
  };

  const handleInngestError = async () => {
    await fetch("/api/demo/inngest-error", { method: "POST" });
  };

  const handleBlocking = async () => {
    await fetch("/api/demo/blocking", { method: "POST" });
  };

  return (
    <div className="p-8 space-x-4">
      <Button onClick={handleClientError} variant="destructive">
        Client Error
      </Button>
      <Button onClick={handleApiError} variant="destructive">
        API Error
      </Button>
      <Button onClick={handleInngestError} variant="destructive">
        Inngest Error
      </Button>
      <Button onClick={handleBlocking}>Blocking</Button>
    </div>
  );
}
