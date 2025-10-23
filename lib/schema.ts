import { z } from "zod";

// Dharma evaluation schema - assesses reasoning against 4 Buddhist principles
export const dharmaSchema = z.object({
  mindfulness: z.number().min(0).max(1).describe(
    "Meta-awareness score: Does this step show awareness of its own reasoning process, biases, or assumptions? (0-1)"
  ),
  emptiness: z.number().min(0).max(1).describe(
    "Flexibility score: Does this step hold beliefs/conclusions lightly, remain open to revision, avoid dogmatic certainty? (0-1)"
  ),
  nonDuality: z.number().min(0).max(1).describe(
    "Interconnection score: Does this step recognize interdependence, avoid zero-sum framing, consider multiple perspectives as valid? (0-1)"
  ),
  boundlessCare: z.number().min(0).max(1).describe(
    "Universal concern score: Does this step consider impact on all stakeholders, minimize harm, expand circle of care? (0-1)"
  ),
  rationale: z.string().describe(
    "Brief explanation of the dharma scores for this step"
  )
});

// Breakdown of individual dharma scores (formatted as strings for display)
export const dharmaBreakdownSchema = z.object({
  mindfulness: z.string(),
  emptiness: z.string(),
  nonDuality: z.string(),
  boundlessCare: z.string(),
});

// Updated reasoning step schema to include dharma evaluation
// This matches what the execute function returns in route.ts
export const reasoningStepSchema = z.object({
  title: z.string().describe("The title of the reasoning step"),
  content: z.string().describe("The content of the reasoning step."),
  dharma: dharmaSchema.optional(), // Model's self-evaluation (optional for backwards compatibility)
  dharmaScore: z.string().optional(), // Model's aggregate score (model-calculated)
  dharmaBreakdown: dharmaBreakdownSchema.optional(), // Model's individual scores formatted for display
  
  // Display metadata for interpretability
  stepIndex: z.number().optional(), // Which step this is (1-based)
  maxSteps: z.number().optional(), // Total allowed steps
  
  // LLM-generated feedback from server (targeted and unique per step)
  serverFeedback: z.string().optional(), // Server's LLM-generated guidance for next step
  
  nextStep: z
    .enum(["continue", "finalAnswer"])
    .describe(
      "Whether to continue with another step or provide the final answer",
    ),
});

export type ReasoningStep = z.infer<typeof reasoningStepSchema>;
export type DharmaEvaluation = z.infer<typeof dharmaSchema>;
export type DharmaBreakdown = z.infer<typeof dharmaBreakdownSchema>;
