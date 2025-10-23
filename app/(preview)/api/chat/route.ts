import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { createDataStreamResponse } from "ai";
import { z } from "zod";
import { dharmaSchema, reasoningStepSchema } from "@/lib/schema";
import { generateDharmaFeedback, mean, ScoreHistoryEntry } from "@/lib/dharma";
import { randomUUID } from "crypto";

// Environment-based configuration
// Server regulates iteration with MIN/MAX steps and uses LLM feedback to guide quality
const DHARMA_TARGET = Number(process.env.DHARMA_TARGET ?? 0.75);
const DHARMA_MAX_STEPS = Number(process.env.DHARMA_MAX_STEPS ?? 10);
const MINIMUM_STEPS = 4; // Hard-coded minimum reasoning steps

// Schema for a single reasoning step (what the model generates)
const singleStepSchema = z.object({
  title: z.string().describe("The title of this reasoning step"),
  content: z.string().describe("The content of the reasoning step. WRITE OUT ALL OF YOUR WORK."),
  dharma: dharmaSchema.describe("Evaluate this reasoning step against the four contemplative principles"),
});

export async function POST(request: Request) {
  const { messages } = await request.json();
  
  // Generate a unique run ID for this reasoning session
  const runId = randomUUID();
  const startTime = Date.now();
  
  console.log(`[Dharma Reasoning] Starting session ${runId}`);
  
  // Create a streaming response that we'll write to manually
  return createDataStreamResponse({
    execute: async (dataStream) => {
      // Score history tracking for LLM feedback generation
      // This stores all previous steps' scores to analyze trajectory
      const scoreHistory: ScoreHistoryEntry[] = [];
      
      // Iteration state
      const iterationState = {
        stepIndex: 0,
        allSteps: [] as any[], // Store all reasoning steps for final synthesis
        previousFeedback: "", // LLM-generated feedback from previous step
      };
      
      // SERVER-CONTROLLED LOOP: Keep generating reasoning steps until termination condition
      let shouldContinue = true;
      
      while (shouldContinue && iterationState.stepIndex < DHARMA_MAX_STEPS) {
        const stepStartTime = Date.now();
        iterationState.stepIndex += 1;
        
        // Build context with feedback from previous steps
        const contextMessages = [...messages];
        
        // FEEDBACK INJECTION: Add LLM-generated feedback from previous step
        // This guides the model toward higher dharma alignment
        if (iterationState.stepIndex > 1 && iterationState.previousFeedback) {
          contextMessages.push({
            role: "assistant",
            content: `[Server Feedback from Step ${iterationState.stepIndex - 1}]: ${iterationState.previousFeedback}`,
          });
        }
        
        // Prompt the model to generate ONE reasoning step
        contextMessages.push({
          role: "user",
          content: `Generate reasoning step ${iterationState.stepIndex} of ${DHARMA_MAX_STEPS}. 
Focus on ONE specific aspect, method, or perspective. 
Be thorough in your analysis and evaluate your reasoning against the dharma principles.
${iterationState.previousFeedback ? '\n\nIncorporate the server feedback from your previous step.' : ''}`,
        });
        
        // System prompt: Just generate reasoning content, no tool calls
        const systemMessage = `You are an expert AI assistant that explains your reasoning step by step while cultivating contemplative wisdom.

Your task: Generate ONE reasoning step that explores a specific aspect of the problem.

CONTEMPLATIVE DHARMA PRINCIPLES:
For each reasoning step, you must evaluate four principles (0-1 scale):

1. MINDFULNESS (Meta-Awareness): Are you monitoring your own reasoning process, noticing assumptions and biases?
2. EMPTINESS (Conceptual Flexibility): Are you holding conclusions provisionally and acknowledging uncertainty?
3. NON-DUALITY (Relational Thinking): Are you recognizing interdependence and multiple valid perspectives?
4. BOUNDLESS CARE (Universal Consideration): Are you considering impact on all affected parties?

Respond with a JSON object containing:
- title: A concise title for this reasoning step
- content: Your detailed reasoning (be thorough, show your work)
- dharma: Your self-evaluation of the four principles with rationale

Example:
{
  "title": "Initial Analysis of Core Problem",
  "content": "Let me start by breaking down the key assumptions...",
  "dharma": {
    "mindfulness": 0.8,
    "emptiness": 0.7,
    "nonDuality": 0.6,
    "boundlessCare": 0.7,
    "rationale": "I'm aware of my reasoning process and acknowledging limitations..."
  }
}`;
        
        try {
          // Generate one reasoning step (blocking call, not streaming)
          const result = await generateText({
            model: openai("gpt-4o"),
            system: systemMessage,
            messages: contextMessages,
            maxTokens: 2000,
          });
          
          // Parse the model's response
          let stepData;
          try {
            // Try to extract JSON from the response
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              stepData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error("No JSON found in response");
            }
          } catch (parseError) {
            // Fallback if model didn't return proper JSON
            stepData = {
              title: `Reasoning Step ${iterationState.stepIndex}`,
              content: result.text,
              dharma: {
                mindfulness: 0.5,
                emptiness: 0.5,
                nonDuality: 0.5,
                boundlessCare: 0.5,
                rationale: "Auto-generated (parsing failed)",
              },
            };
          }
          
          // Validate with schema
          const validatedStep = singleStepSchema.parse(stepData);
          
          // Calculate model's self-evaluation score
          // Links to lib/dharma.ts mean() function
          const modelDharmaScore = mean(validatedStep.dharma);
          
          // Add to score history for trajectory analysis
          scoreHistory.push({
            step: iterationState.stepIndex,
            scores: {
              mindfulness: validatedStep.dharma.mindfulness,
              emptiness: validatedStep.dharma.emptiness,
              nonDuality: validatedStep.dharma.nonDuality,
              boundlessCare: validatedStep.dharma.boundlessCare,
            },
            mean: modelDharmaScore,
            content: validatedStep.content, // Store content for LLM context
          });
          
          // GENERATE LLM-BASED FEEDBACK: Call feedback LLM to evaluate and guide
          // This replaces keyword-based heuristics with philosophical analysis
          // Links to lib/dharma.ts generateDharmaFeedback() function
          const llmFeedback = await generateDharmaFeedback(
            validatedStep.dharma,
            scoreHistory.slice(0, -1), // All previous steps (not including current)
            DHARMA_TARGET
          );
          
          // Store feedback for next iteration
          iterationState.previousFeedback = llmFeedback;
          
          // Calculate latency
          const latencyMs = Date.now() - stepStartTime;
          
          // TERMINATION LOGIC: Server enforces MIN/MAX steps only
          // No convergence detection - just hard limits
          let terminationReason = "";
          
          if (iterationState.stepIndex >= DHARMA_MAX_STEPS) {
            shouldContinue = false;
            terminationReason = "max_steps_reached";
          } else if (iterationState.stepIndex < MINIMUM_STEPS) {
            shouldContinue = true; // Always continue until minimum steps
            terminationReason = "minimum_steps_required";
          } else if (modelDharmaScore >= DHARMA_TARGET) {
            shouldContinue = false;
            terminationReason = "target_reached";
          } else {
            shouldContinue = true;
            terminationReason = "continuing";
          }
          
          // TELEMETRY: Log detailed step metrics with rich context
          console.log(JSON.stringify({
            event: "reasoning_step",
            runId,
            stepIndex: iterationState.stepIndex,
            maxSteps: DHARMA_MAX_STEPS,
            modelSelfScore: modelDharmaScore.toFixed(3),
            modelScoreBreakdown: {
              mindfulness: validatedStep.dharma.mindfulness.toFixed(2),
              emptiness: validatedStep.dharma.emptiness.toFixed(2),
              nonDuality: validatedStep.dharma.nonDuality.toFixed(2),
              boundlessCare: validatedStep.dharma.boundlessCare.toFixed(2),
            },
            targetThreshold: DHARMA_TARGET,
            targetReached: modelDharmaScore >= DHARMA_TARGET,
            terminationReason,
            shouldContinue,
            latencyMs,
            title: validatedStep.title,
            feedbackLength: llmFeedback.length, // Track feedback generation
          }));
          
          // Build enriched step for frontend (links to components/reasoning-step.tsx)
          const enrichedStep = {
            ...validatedStep,
            nextStep: shouldContinue ? "continue" : "finalAnswer",
            // Model's self-evaluation
            dharmaScore: modelDharmaScore.toFixed(3),
            dharmaBreakdown: {
              mindfulness: validatedStep.dharma.mindfulness.toFixed(2),
              emptiness: validatedStep.dharma.emptiness.toFixed(2),
              nonDuality: validatedStep.dharma.nonDuality.toFixed(2),
              boundlessCare: validatedStep.dharma.boundlessCare.toFixed(2),
            },
            // Display metadata
            stepIndex: iterationState.stepIndex,
            maxSteps: DHARMA_MAX_STEPS,
            // LLM-generated feedback (unique and targeted)
            serverFeedback: llmFeedback,
          };
          
          // Store step for final synthesis
          iterationState.allSteps.push(enrichedStep);
          
          // STREAM the reasoning step to the frontend
          dataStream.writeData({
            type: "reasoning-step",
            content: enrichedStep,
          });
          
        } catch (error) {
          console.error(`[Dharma Reasoning] Error in step ${iterationState.stepIndex}:`, error);
          shouldContinue = false;
        }
      }
      
      // FINAL SYNTHESIS: After all reasoning steps, generate a final answer
      console.log(`[Dharma Reasoning] Session ${runId} completed with ${iterationState.stepIndex} steps. Generating final synthesis...`);
      
      // Build synthesis prompt with all reasoning steps
      const synthesisPrompt = `You have completed ${iterationState.stepIndex} reasoning steps:

${iterationState.allSteps.map((step, idx) => `
Step ${idx + 1}: ${step.title}
${step.content}
`).join('\n')}

Now provide a clear, concise final answer that synthesizes all of your reasoning. 
Be direct and actionable. This is your final response to the user.`;
      
      const synthesisMessages = [
        ...messages,
        {
          role: "assistant",
          content: synthesisPrompt,
        },
        {
          role: "user",
          content: "Please provide your final synthesized answer based on all reasoning steps.",
        },
      ];
      
      try {
        const finalResult = await generateText({
          model: openai("gpt-4o"),
          messages: synthesisMessages,
          maxTokens: 1000,
        });
        
        // Stream the final text answer
        dataStream.writeData({
          type: "text",
          content: finalResult.text,
        });
        
        console.log(`[Dharma Reasoning] Session ${runId} completed in ${Date.now() - startTime}ms`);
        
      } catch (error) {
        console.error(`[Dharma Reasoning] Error generating synthesis:`, error);
        dataStream.writeData({
          type: "text",
          content: "Error generating final synthesis. Please review the reasoning steps above.",
        });
      }
    },
  });
}
