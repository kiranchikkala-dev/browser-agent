"use client";
import React from "react";
import { Textarea } from "../ui/textarea";
import { ArrowBigDown, ArrowUp } from "lucide-react";
import { Button } from "../ui/button";
import { apiClient } from "@/lib/axiosInstance";
import { useRouter } from "next/navigation";

const ChatInput = () => {
  const [inputValue, setInputValue] = React.useState("");
  const router = useRouter();
  const handleSubmit = async () => {
    const { data } = await apiClient.get("/tasks");
    if (!data.status) {
    }
    const task = data[0];

    router.push(`/task/${task?.id}`);
  };
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim().length) {
      handleSubmit();
    }
  };
  return (
    <>
      <form onSubmit={handleFormSubmit}>
        <div className="rounded-3xl border border-input bg-background shadow-sm">
          <Textarea
            aria-label="Chat message"
            placeholder="Message Browser Agent..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="max-h-48 min-h-20 resize-none rounded-3xl border-0 bg-transparent px-4 py-3 shadow-none focus-visible:border-0 focus-visible:ring-0"
          />
          <div className="  flex w-full -mr-5 flex-row-reverse justify-between">
            <div
              className="flex items-center justify-center gap-2"
              aria-label="Message actions"
            >
              <Button
                variant="default"
                type="submit"
                size="icon"
                //   disabled={
                //     isLoading ||
                //     (!query.trim() && !attachmentUrl) ||
                //     uploadState.isUploading
                //   }
                className="transition-[opacity, translate-x] rounded-4xl h-9 w-9 duration-200"
              >
                <ArrowUp className="!size-5" />
              </Button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
};

export default ChatInput;
