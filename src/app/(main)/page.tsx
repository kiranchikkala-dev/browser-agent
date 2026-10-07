"use client";
import ChatInput from "@/components/chat/chat-input";
import React from "react";

const ChatPage = () => {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <main className="min-h-0 flex-1" aria-label="Chat conversation" />
      <div className="w-full px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
        <div className="mx-auto w-full max-w-3xl">
          <ChatInput />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
