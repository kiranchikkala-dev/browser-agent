"use client";
import ChatInput from "@/components/chat/chat-input";
import React from "react";

const ChatPage = () => {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="flex min-h-0 flex-1 items-center justify-center px-6" aria-label="New browser task"><div className="max-w-xl text-center"><p className="mb-3 text-sm font-medium text-muted-foreground">Browser Agent</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What should I do on the web?</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Describe a browser task and I’ll run it for you, step by step.</p></div></main>
      <div className="w-full px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
