"use client";

import { useRef, useState } from "react";
import { Message } from "@/components/message";
import { useScrollToBottom } from "@/components/use-scroll-to-bottom";
import { motion } from "framer-motion";
import { GitIcon, MasonryIcon, VercelIcon } from "@/components/icons";
import Link from "next/link";
import { useChat } from "ai/react";
import { ReasoningStep } from "@/components/reasoning-step";

export default function Home() {
  const { messages, handleSubmit, input, setInput, append, data } = useChat();
  
  // Extract reasoning steps from data stream
  const reasoningSteps = data?.filter((item: any) => item.type === "reasoning-step").map((item: any) => item.content) || [];
  const finalTextItem = data?.find((item: any) => item.type === "text");
  const finalText = (finalTextItem && typeof finalTextItem === 'object' && 'content' in finalTextItem) ? String(finalTextItem.content) : "";

  const inputRef = useRef<HTMLInputElement>(null);
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const suggestedActions = [
    {
      title: "Ethical Reasoning",
      label: "Should we implement universal basic income?",
      action: "Should we implement universal basic income? Consider all stakeholders and trade-offs.",
    },
    {
      title: "Strategic Decision",
      label: "How should we approach climate change policy?",
      action: "How should we approach climate change policy? Think through multiple perspectives and uncertainties.",
    },
    {
      title: "Complex Problem",
      label: "Is AI safety more important than AI capabilities?",
      action: "Is AI safety more important than AI capabilities? Examine assumptions and interdependencies.",
    },
  ];

  return (
    <div className="flex flex-row justify-center pb-20 h-dvh bg-white dark:bg-zinc-900">
      <div className="flex flex-col justify-between gap-4">
        <div
          ref={messagesContainerRef}
          className="flex flex-col gap-6 h-full w-dvw items-center overflow-y-scroll"
        >
          {messages.length === 0 && (
            <motion.div className="h-[350px] px-4 w-full md:w-[500px] md:px-0 pt-20">
              <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm dark:text-zinc-400 dark:border-zinc-700">
                {/* Contemplative Lotus Icon */}
                <div className="flex flex-row justify-center items-center">
                  <svg
                    className="w-12 h-12 text-purple-600 dark:text-purple-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    {/* Lotus flower - symbol of contemplative wisdom */}
                    <path d="M12 2C9.5 5 8 7.5 8 10c0 2.21 1.79 4 4 4s4-1.79 4-4c0-2.5-1.5-5-4-8z" opacity="0.6" />
                    <path d="M7 10c-2 1-3.5 2.5-4 4.5-.5 2 0 3.5 2 4.5 1.5.7 3 .5 4.5-.5-1-1-1.5-2.5-1.5-4 0-1.5.5-3 1-4.5-.7 0-1.4 0-2 0z" />
                    <path d="M17 10c2 1 3.5 2.5 4 4.5.5 2 0 3.5-2 4.5-1.5.7-3 .5-4.5-.5 1-1 1.5-2.5 1.5-4 0-1.5-.5-3-1-4.5.7 0 1.4 0 2 0z" />
                    <path d="M12 14c-1.5 2-2.5 4-2.5 6 0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5c0-2-.5-4-2.5-6z" opacity="0.8" />
                  </svg>
                </div>
                
                {/* Research Title */}
                <h2 className="text-center text-zinc-900 dark:text-zinc-50 font-semibold text-base">
                  Contemplative Dharma Reasoning
                </h2>
                
                {/* Research Description */}
                <p className="text-center leading-relaxed">
                  An <strong>auto-iterative reasoning system</strong> that guides AI thinking toward contemplative wisdom through LLM-generated feedback on four principles: <em>mindfulness</em>, <em>emptiness</em>, <em>non-duality</em>, and <em>boundless care</em>.
                </p>
                
                {/* Tech Stack */}
                <p className="text-center text-xs">
                  Powered by{" "}
                  <Link
                    className="text-purple-600 dark:text-purple-400 hover:underline"
                    href="https://openai.com"
                    target="_blank"
                  >
                    GPT-4
                  </Link>
                  {" "}with server-controlled iteration via{" "}
                  <Link
                    className="text-purple-600 dark:text-purple-400 hover:underline"
                    href="https://sdk.vercel.ai"
                    target="_blank"
                  >
                    Vercel AI SDK
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {messages.map((message, i) => {
            // Check if this is the last assistant message (where reasoning happens)
            const isLastAssistantMessage = message.role === "assistant" && i === messages.length - 1;
            
            return (
              <div key={message.id} className="flex flex-col gap-6 w-full items-center">
                <Message
                  role={message.role}
                  content={message.content}
                  toolInvocations={message.toolInvocations}
                  reasoningMessages={[]}
                />
                
                {/* Show reasoning steps after the last assistant message */}
                {isLastAssistantMessage && reasoningSteps.length > 0 && (
                  <div className="flex flex-col gap-6 w-full md:w-[500px] px-4 md:px-0">
                    {reasoningSteps.map((step: any, stepIdx: number) => (
                      <ReasoningStep key={stepIdx} step={step} />
                    ))}
                  </div>
                )}
                
                {/* Show final text after reasoning steps */}
                {isLastAssistantMessage && finalText && (
                  <div className="flex flex-row gap-4 px-4 w-full md:w-[500px] md:px-0">
                    <div className="size-[24px] flex-shrink-0"></div>
                    <div className="text-zinc-800 dark:text-zinc-300 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                      <h3 className="font-semibold mb-2">Final Answer:</h3>
                      <p className="whitespace-pre-wrap">{finalText}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="grid sm:grid-cols-1 gap-2 w-full px-4 md:px-0 mx-auto md:max-w-[500px] mb-4">
          {messages.length === 0 &&
            suggestedActions.map((suggestedAction, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
                key={index}
                className={index > 1 ? "hidden sm:block" : "block"}
              >
                <button
                  onClick={async () => {
                    append({
                      role: "user",
                      content: suggestedAction.action,
                    });
                  }}
                  className="w-full text-left border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 rounded-lg p-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex flex-col"
                >
                  <span className="font-medium">{suggestedAction.title}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {suggestedAction.label}
                  </span>
                </button>
              </motion.div>
            ))}
        </div>

        <form
          className="flex flex-col gap-2 relative items-center"
          onSubmit={handleSubmit}
        >
          <input
            ref={inputRef}
            className="bg-zinc-100 rounded-md px-2 py-1.5 w-full outline-none dark:bg-zinc-700 text-zinc-800 dark:text-zinc-300 md:max-w-[500px] max-w-[calc(100dvw-32px)]"
            placeholder="Send a message..."
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
            }}
          />
        </form>
      </div>
    </div>
  );
}
