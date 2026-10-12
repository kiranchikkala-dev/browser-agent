"use client";
import React from "react";
import { Textarea } from "../ui/textarea";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { createTask, notifyTasksChanged } from "@/lib/tasks";
import { useRouter } from "next/navigation";

const ChatInput = () => {
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const handleSubmit = async () => {
    const prompt = inputValue.trim();
    if (!prompt || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const task = await createTask(prompt);
      notifyTasksChanged();
      setInputValue("");
      router.push(`/task/${task.id}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create task",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSubmit();
  };
  return (
    <>
      <form onSubmit={handleFormSubmit} aria-label="Create browser task">
        <div className="rounded-3xl border border-input bg-background shadow-sm">
          <Textarea
            ref={inputRef}
            aria-label="Chat message"
            placeholder="Message Browser Agent..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSubmitting}
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
                disabled={isSubmitting || !inputValue.trim()}
                aria-label={isSubmitting ? "Creating task" : "Submit task"}
                className="h-9 w-9 rounded-4xl transition-[opacity,translate-x] duration-200"
              >
                {isSubmitting ? (
                  <Loader2 className="!size-4 animate-spin" />
                ) : (
                  <ArrowUp className="!size-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
        {error ? (
          <p className="mt-2 px-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </>
  );
};

export default ChatInput;
