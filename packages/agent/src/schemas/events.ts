export type AgentEvent =
  | { type: "plan"; steps: string[] }
  | { type: "tool_call"; callId: string; toolName: string; args: unknown }
  | {
      type: "tool_output";
      callId: string;
      toolName: string;
      output: string;
      screenshot?: Buffer;
    }
  | { type: "message"; text: string }
  | { type: "error"; message: string };
