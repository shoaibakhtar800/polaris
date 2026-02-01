import { Button } from "@/components/ui/button";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  useConversationById,
  useConversationsByProjectId,
  useCreateConversation,
  useMessagesByConversationId,
} from "../hooks/use-conversations";
import { CopyIcon, HistoryIcon, LoaderIcon, PlusIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useState } from "react";
import { toast } from "sonner";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import ky from "ky";
import { PastConversationsDialog } from "./past-conversations-dialog";
import { DEFAULT_CONVERSATION_TITLE } from "../constants/constants";

export const ConversationsSidebar = ({
  projectId,
}: {
  projectId: Id<"projects">;
}) => {
  const [input, setInput] = useState("");
  const [selectedConversationId, setSelectedConversationId] =
    useState<Id<"conversations"> | null>(null);
  const [pastConversationsOpen, setPastConversationsOpen] = useState(false);

  const createConversation = useCreateConversation();
  const conversations = useConversationsByProjectId(projectId);

  const activeConversationId =
    selectedConversationId ?? conversations?.[0]?._id ?? null;

  const activeConversation = useConversationById(activeConversationId);
  const conversationMessages =
    useMessagesByConversationId(activeConversationId);

  const isProcessing = conversationMessages?.some(
    (message) => message.status === "processing",
  );

  const handleCreateConversation = async () => {
    try {
      const conversationId = await createConversation({
        projectId,
        title: DEFAULT_CONVERSATION_TITLE,
      });
      setSelectedConversationId(conversationId);
      return conversationId;
    } catch (error) {
      toast.error("Failed to create conversation");
      console.error("Failed to create conversation", error);
      return null;
    }
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    if (isProcessing && !message.text) {
      await handleCancel();
      setInput("");
      return;
    }

    let conversationId = activeConversationId;

    if (!conversationId) {
      conversationId = await handleCreateConversation();
    }

    if (!conversationId) {
      return;
    }

    try {
      await ky.post("/api/messages", {
        json: {
          conversationId,
          message: message.text,
        },
      });
      setInput("");
    } catch (error) {
      toast.error("Message failed to send");
      console.error("Message failed to send", error);
    }
  };

  const handleCancel = async () => {
    try {
      await ky.post("/api/messages/cancel", {
        json: {
          projectId,
        },
      });
      toast.success("Request cancelled");
    } catch (error) {
      toast.error("Failed to cancel request");
      console.error("Failed to cancel request ", error);
    }
  };

  const handleSelect = (conversationId: Id<"conversations">) => {
    setSelectedConversationId(conversationId);
    setPastConversationsOpen(false);
  };

  return (
    <>
      <PastConversationsDialog
        projectId={projectId}
        open={pastConversationsOpen}
        onOpenChange={setPastConversationsOpen}
        onSelect={handleSelect}
      />
      <div className="flex flex-col h-full bg-sidebar">
        <div className="h-8.75 flex items-center justify-between border-b">
          <div className="text-sm truncate pl-3">
            {activeConversation?.title ?? DEFAULT_CONVERSATION_TITLE}
          </div>
          <div className="flex items-center px-1 gap-1">
            <Button
              variant="highlight"
              size="icon-xs"
              onClick={() => setPastConversationsOpen(true)}
            >
              <HistoryIcon className="size-4" />
            </Button>
            <Button
              variant="highlight"
              size="icon-xs"
              onClick={handleCreateConversation}
            >
              <PlusIcon className="size-4" />
            </Button>
          </div>
        </div>
        <Conversation className="flex-1">
          <ConversationContent>
            {conversationMessages?.map((message, idx) => (
              <Message
                key={idx}
                from={message.role === "user" ? "user" : "assistant"}
              >
                <MessageContent>
                  {message.status === "processing" ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <LoaderIcon className="size-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  ) : message.status === "cancelled" ? (
                    <span className="text-muted-foreground italic">
                      Request cancelled
                    </span>
                  ) : (
                    <MessageResponse>{message.content}</MessageResponse>
                  )}
                </MessageContent>
                {message.role === "assistant" &&
                  message.status === "completed" &&
                  idx === (conversationMessages?.length ?? 0) - 1 && (
                    <MessageActions>
                      <MessageAction
                        onClick={() => {
                          navigator.clipboard.writeText(message.content);
                          toast.success("Copied to clipboard");
                        }}
                        label="Copy"
                      >
                        <CopyIcon className="size-4" />
                      </MessageAction>
                    </MessageActions>
                  )}
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="p-3">
          <PromptInput className="mt-2" onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Ask a question or start a conversation"
                onChange={(e) => setInput(e.target.value)}
                value={input}
                disabled={isProcessing}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit
                disabled={isProcessing ? false : !input}
                status={isProcessing ? "streaming" : undefined}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </>
  );
};
