# LLM-Based Contemplative Dharma Reasoning System

## Overview

This is a **server-controlled auto-iterative reasoning system** that uses **LLM-generated feedback** to guide multi-step reasoning toward contemplative wisdom alignment (dharma principles).

The system replaces keyword-based heuristics with philosophical LLM evaluation, creating a feedback loop where:
1. Model generates a reasoning step and self-evaluates against dharma principles
2. Server logs the self-evaluation scores
3. Server calls a **Feedback LLM** to analyze the score trajectory and generate targeted guidance
4. Feedback is injected into the next reasoning step's context
5. Server enforces minimum (4) and maximum (10) steps

## Core Philosophy

**Contemplative AI**: Reasoning should cultivate:
- **Mindfulness**: Meta-awareness of the reasoning process itself
- **Emptiness**: Holding conclusions lightly and acknowledging uncertainty
- **Non-Duality**: Recognizing interdependence and multiple valid perspectives
- **Boundless Care**: Considering impact on all stakeholders

## Architecture

### Server-Controlled Loop

```typescript
while (shouldContinue && stepIndex < MAX_STEPS) {
  1. Generate reasoning step (model self-evaluates with dharma scores)
  2. Log scores to history
  3. Call Feedback LLM to evaluate trajectory and generate guidance
  4. Inject feedback into next step's context
  5. Stream reasoning step to frontend
  6. Check termination: MIN_STEPS (4) < steps < MAX_STEPS (10)
}

After loop: Generate final synthesis answer
```

### LLM-Based Feedback System

**Location**: `lib/dharma.ts::generateDharmaFeedback()`

**How it works**:
1. Takes current step's self-scores (model's dharma evaluation)
2. Takes full score history (all previous steps)
3. Injects philosophical definitions of 4 dharma principles into prompt
4. Calls GPT-4 to analyze:
   - Is trajectory moving toward target (0.75)?
   - Which principles are weakest?
   - What specific guidance would help?
5. Returns 2-3 sentences of targeted, actionable feedback
6. Feedback is unique per step (not template-based)

**Key insight**: By re-injecting principle definitions, we prevent LLM drift and ensure consistent evaluation.

### Termination Policy

**Simple and hard-coded**:
- **Minimum**: 4 steps (always enforced)
- **Maximum**: 10 steps (hard limit)
- **Target-based**: Stop if model self-score reaches 0.75
- **No convergence detection** (removed from previous version)

## Key Implementation Details

### 1. Score History Tracking

```typescript
type ScoreHistoryEntry = {
  step: number;
  scores: DharmaScores; // { mindfulness, emptiness, nonDuality, boundlessCare }
  mean: number;
  content: string; // For LLM context
}
```

Server maintains history to:
- Show feedback LLM the full trajectory
- Enable analysis: "Are scores improving?"
- Provide context: "What has the model tried so far?"

### 2. Feedback Injection

After each step, feedback is added to model's context:

```typescript
contextMessages.push({
  role: "assistant",
  content: `[Server Feedback from Step ${stepIndex - 1}]: ${llmFeedback}`,
});
```

This creates a recursive improvement loop where the model sees:
- Its own reasoning
- Its self-evaluation
- Server's philosophical analysis
- Specific guidance for next step

### 3. Telemetry

Rich JSON logging for each step:

```json
{
  "event": "reasoning_step",
  "runId": "uuid",
  "stepIndex": 3,
  "maxSteps": 10,
  "modelSelfScore": "0.825",
  "modelScoreBreakdown": {
    "mindfulness": "0.90",
    "emptiness": "0.75",
    "nonDuality": "0.85",
    "boundlessCare": "0.80"
  },
  "targetThreshold": 0.75,
  "targetReached": true,
  "terminationReason": "target_reached",
  "latencyMs": 5234,
  "feedbackLength": 187
}
```

### 4. Frontend Display

**Components**: `components/reasoning-step.tsx`

Shows:
- Step number and progress (e.g., "3/10")
- Continue/Final badge
- Reasoning content
- **Contemplative Self-Evaluation**: Model's dharma scores with breakdown
- **Model's rationale**: Philosophical explanation of scores
- **Server Feedback (LLM-Generated)**: Unique, targeted guidance

## File Structure

### New/Modified Files

1. **`lib/dharma.ts`** - LLM-based feedback system
   - `generateDharmaFeedback()`: Main LLM evaluation function
   - `mean()`: Calculate aggregate dharma score
   - Type: `ScoreHistoryEntry`

2. **`lib/schema.ts`** - Simplified schema
   - Removed: `serverDharma`, `serverDharmaScore`, `serverDharmaBreakdown`
   - Removed: `scoreDelta`, `bestScore`, `stepsSinceBest`
   - Added: `serverFeedback` (LLM-generated string)

3. **`app/(preview)/api/chat/route.ts`** - Server loop with LLM feedback
   - Replaced keyword scorer with `generateDharmaFeedback()`
   - Removed convergence detection
   - Simplified termination: MIN_STEPS → MAX_STEPS
   - Enhanced telemetry

4. **`components/reasoning-step.tsx`** - UI updated
   - Removed: Server scores, convergence status, score deltas
   - Kept: Model self-evaluation, LLM-generated feedback
   - Cleaner, more focused display

## Configuration

**Environment variables** (`.env.local`):

```bash
# Dharma target threshold (0-1 scale)
DHARMA_TARGET=0.75

# Maximum reasoning steps (hard limit)
DHARMA_MAX_STEPS=10

# OpenAI API key (required)
OPENAI_API_KEY=sk-...
```

**Hard-coded constants** (`route.ts`):

```typescript
const MINIMUM_STEPS = 4; // Always generate at least 4 steps
```

## Why This Approach?

### Advantages over Keyword Heuristics

1. **Semantic understanding**: LLM can evaluate genuine philosophical depth, not just keyword presence
2. **Contextual feedback**: Guidance is specific to the actual content and trajectory
3. **Harder to game**: Model can't just mention "bias" or "stakeholder" to score high
4. **Adaptive**: Feedback evolves based on what the model has already tried
5. **Research-aligned**: Follows the spirit of the Contemplative AI paper

### Advantages over Pure Model Self-Regulation

1. **Prevents drift**: Re-injecting definitions keeps evaluation grounded
2. **External validation**: Feedback LLM provides independent perspective
3. **Enforced iteration**: Server ensures minimum steps regardless of model behavior
4. **Logging**: Full score history for analysis and improvement

## Usage

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000`
3. Ask a question that requires reasoning
4. Watch as the system:
   - Generates 4+ reasoning steps
   - Shows model's self-evaluation per step
   - Displays unique LLM-generated feedback
   - Provides final synthesized answer

## Telemetry Analysis

To analyze logged scores:

```bash
# Extract all reasoning step logs
grep '"event":"reasoning_step"' logs.txt > reasoning_steps.jsonl

# Count sessions
cat reasoning_steps.jsonl | jq -r '.runId' | sort -u | wc -l

# Analyze score trajectories
cat reasoning_steps.jsonl | jq '{runId, stepIndex, modelSelfScore, targetReached}'

# Check feedback effectiveness
cat reasoning_steps.jsonl | jq '{runId, stepIndex, feedbackLength, latencyMs}'
```

## Future Enhancements

### Phase 1 (Current)
✅ LLM-based feedback generation  
✅ Score history tracking  
✅ Philosophical definition injection  
✅ Server-controlled iteration  
✅ Rich telemetry  

### Phase 2 (Next)
- [ ] Fine-tune feedback LLM on expert-labeled reasoning steps
- [ ] A/B test: keyword heuristic vs LLM feedback
- [ ] Add "quality gate": force retry if score drops significantly
- [ ] Visualize score trajectory as sparkline in UI
- [ ] Export telemetry to database (Supabase)

### Phase 3 (Research)
- [ ] Multi-model ensemble (GPT-4 + Claude as feedback evaluators)
- [ ] Learned scorer (fine-tuned classifier replacing LLM calls)
- [ ] Active learning: flag low-quality steps for human review
- [ ] Pareto frontier analysis: dharma score vs latency tradeoffs

## Technical Decisions

### Why Same Model for Feedback?

Using GPT-4 for both reasoning and feedback provides:
- **Consistency**: Same language understanding capabilities
- **Simplicity**: One API, one model to manage
- **Cost-effectiveness**: Already paying for reasoning tokens

Future: Could use cheaper model (GPT-3.5) for feedback to reduce cost.

### Why No Convergence Detection?

Removed epsilon/patience/convergence logic because:
- **Simplicity**: Easier to reason about "min 4, max 10, stop at 0.75"
- **Empirical**: Unclear if convergence detection actually helped
- **Feedback-driven**: LLM feedback creates natural pressure toward improvement

If analysis shows model often stops too early, can re-add.

### Why Min 4 Steps?

Empirically observed that:
- 1-2 steps: Model rushes to answer
- 3 steps: Better but still shallow
- 4+ steps: Meaningful multi-perspective exploration

Hard-coding 4 ensures quality baseline.

## Key Learnings

1. **Prompt engineering has limits**: Even with strong prompts, models will try to one-shot. Hard enforcement needed.
2. **LLM as judge works**: GPT-4 can meaningfully evaluate contemplative quality when given philosophical definitions.
3. **Feedback loop is powerful**: Injecting targeted guidance creates recursive improvement.
4. **Telemetry is essential**: Rich logging enables understanding of what's actually happening.
5. **Simplicity wins**: Removing convergence detection made system easier to understand without losing quality.

## References

- **Contemplative Artificial Intelligence** paper: Original research on dharma principles for AI reasoning
- **Vercel AI SDK**: Streaming and data stream response utilities
- **OpenAI GPT-4**: Both reasoning and feedback evaluation model
- **Zod**: Schema validation for structured outputs
