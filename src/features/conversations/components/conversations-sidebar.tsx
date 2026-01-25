import { Button } from "@/components/ui/button";
import { Id } from "../../../../convex/_generated/dataModel";
import { DEFAULT_CONVERSATION_TITLE } from "../../../../convex/constants";
import { useConversationsByProjectId } from "../hooks/use-conversations";
import { HistoryIcon, PlusIcon } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

export const ConversationsSidebar = ({
  projectId,
}: {
  projectId: Id<"projects">;
}) => {
  const conversations = useConversationsByProjectId(projectId);

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="h-8.75 flex items-center justify-between border-b">
        <div className="text-sm truncate pl-3">
          {DEFAULT_CONVERSATION_TITLE}
        </div>
        <div className="flex items-center px-1 gap-1">
          <Button variant="highlight" size="icon-xs">
            <HistoryIcon className="size-4" />
          </Button>
          <Button variant="highlight" size="icon-xs">
            <PlusIcon className="size-4" />
          </Button>
        </div>
      </div>
      <Conversation className="flex-1">
        <ConversationContent>
          <p>messages</p>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="p-3">
        <PromptInput className="mt-2" onSubmit={() => {}}>
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Ask a question or start a conversation"
              onChange={() => {}}
              value=""
              disabled={false}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit disabled={false} status="ready" />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};
