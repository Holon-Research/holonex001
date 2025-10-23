"use client";

import { type ReasoningStep as TReasoningStep } from "@/lib/schema";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

/**
 * ReasoningStep Component - Interpretability Display
 * 
 * Shows internal state for transparency:
 * - Step metadata (number, progress)
 * - Model's self-evaluation (dharma scores)
 * - Model's philosophical rationale
 * - LLM-generated server feedback (unique and targeted)
 * - Full reasoning content
 * 
 * Features:
 * - Collapsible content with chevron icon
 * - Smooth animations for expand/collapse
 * 
 * Links to: route.ts execute function (data source), schema.ts (types)
 */
export const ReasoningStep = ({ step }: { step: TReasoningStep }) => {
  // Collapsible state - starts collapsed for cleaner UI
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if dharma self-evaluation exists
  const hasModelScores = step.dharmaScore !== undefined;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-50 p-4 rounded-lg flex flex-col w-full gap-3 border border-zinc-200 dark:border-zinc-700"
    >
      {/* STEP METADATA HEADER - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          {/* Chevron icon - rotates when expanded */}
          <svg
            className={`w-4 h-4 text-zinc-500 dark:text-zinc-400 transition-transform duration-200 ${
              isExpanded ? "rotate-90" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          
          <p className="text-[10px] uppercase text-zinc-500 dark:text-zinc-400 font-semibold">
            reasoning step
          </p>
          
          {/* Step number badge - shows progress through maxSteps */}
          {step.stepIndex !== undefined && (
            <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
              {step.stepIndex}/{step.maxSteps || "?"}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Decision indicator - shows what model chose */}
          {step.nextStep && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              step.nextStep === "finalAnswer" 
                ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
            }`}>
              {step.nextStep === "finalAnswer" ? "FINAL" : "CONTINUE"}
            </span>
          )}
        </div>
      </button>
      
      {/* STEP TITLE - Always visible */}
      <h3 className="font-bold text-base">{step.title}</h3>
      
      {/* COLLAPSIBLE CONTENT - Expands when chevron clicked */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-3">
              {/* STEP CONTENT - The actual reasoning */}
              <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                {step.content}
              </p>
              
              {/* CONTEMPLATIVE EVALUATION SECTION */}
              {hasModelScores && (
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700 space-y-3">
                  
                  {/* MODEL SELF-EVALUATION - Dharma principle scores */}
                  {step.dharmaBreakdown && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase text-blue-600 dark:text-blue-400 font-semibold">
                          Contemplative Self-Evaluation
                        </p>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {step.dharmaScore}
                        </span>
                      </div>
                      
                      {/* Individual dharma principle scores */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Mindfulness:</span>
                          <span className="font-medium">{step.dharmaBreakdown.mindfulness}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Emptiness:</span>
                          <span className="font-medium">{step.dharmaBreakdown.emptiness}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Non-duality:</span>
                          <span className="font-medium">{step.dharmaBreakdown.nonDuality}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-600 dark:text-zinc-400">Boundless Care:</span>
                          <span className="font-medium">{step.dharmaBreakdown.boundlessCare}</span>
                        </div>
                      </div>
                      
                      {/* Model's philosophical rationale */}
                      {step.dharma?.rationale && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 italic">
                          {step.dharma.rationale}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* LLM-GENERATED SERVER FEEDBACK - Unique and targeted guidance */}
                  {step.serverFeedback && (
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <p className="text-[10px] uppercase text-purple-600 dark:text-purple-400 mb-1 font-semibold">
                        Server Feedback (LLM-Generated)
                      </p>
                      <p className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 p-2 rounded leading-relaxed">
                        {step.serverFeedback}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
