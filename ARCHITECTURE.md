# Server-Controlled Auto-Iterative Dharma Reasoning Architecture

## Overview

This implementation uses a **server-controlled loop** architecture where the server (not the AI model) drives the iteration process. This ensures consistent multi-step reasoning with hard-coded termination policies.

## Key Architecture Changes

### Previous Approach (Tool-Based)
- Model called `addReasoningStep` tool multiple times
- Model decided when to stop via `nextStep` parameter
- Relied on prompt engineering to enforce multi-step reasoning
- Model could "one-shot" by bundling all reasoning into one tool call

### New Approach (Server-Controlled Loop)
- **Server runs a `while` loop** that calls the model repeatedly
- Each loop iteration generates **one reasoning step**
- Server decides when to continue/stop based on hard-coded rules
- Model cannot bypass the loop - it's enforced at the infrastructure level

## Architecture Flow

```
User Question
    ↓
POST /api/chat
    ↓
[SERVER LOOP START]
    ↓
Step 1: Generate reasoning step
    ↓
Server: Score step, track convergence
    ↓
Server: Check termination conditions
    ↓
Continue? → YES → Step 2: Generate reasoning step
    ↓                    ↓
    |                 (repeat...)
    |                    ↓
    |              Step 4: Generate reasoning step
    |                    ↓
    |              Server: Check termination
    |                    ↓
    NO ← Continue?
    ↓
[SERVER LOOP END]
    ↓
Generate Final Synthesis
    ↓
Return: All reasoning steps + final answer
```

## Code Architecture

### Backend: `/app/(preview)/api/chat/route.ts`

#### 1. Server-Controlled Loop (Lines 49-266)
```typescript
while (shouldContinue && convergenceState.stepIndex < DHARMA_MAX_STEPS) {
  // Generate ONE reasoning step
  // Score it with heuristic
  // Decide whether to continue
  // Stream step to frontend
}
```

#### 2. Model Call Per Step (Lines 108-113)
```typescript
const result = await generateText({
  model: openai("gpt-4o"),
  system: systemMessage,
  messages: contextMessages,
  maxTokens: 2000,
});
```

**Key**: Uses `generateText` (blocking) not `streamText`. Each step is a separate, complete API call.

#### 3. Termination Logic (Lines 174-198)
Hard-coded priority order:
1. **Max steps reached** → Stop (safety limit)
2. **Below minimum steps** → Continue (enforce at least 4 steps)
3. **Converged + above min quality** → Stop (plateau detected)
4. **Target score reached** → Stop (high quality achieved)
5. **Otherwise** → Continue

#### 4. Final Synthesis (Lines 268-315)
After loop completes:
- Builds prompt with all reasoning steps
- Calls model one final time for synthesis
- Returns clean, actionable answer

#### 5. Data Stream Format
```typescript
// Each reasoning step
dataStream.writeData({
  type: "reasoning-step",
  content: enrichedStep,
});

// Final answer
dataStream.writeData({
  type: "text",
  content: finalResult.text,
});
```

### Frontend: `/app/(preview)/page.tsx`

#### 1. Data Stream Consumption (Lines 13-17)
```typescript
const { messages, handleSubmit, input, setInput, append, data } = useChat();

const reasoningSteps = data?.filter((item: any) => item.type === "reasoning-step")
  .map((item: any) => item.content) || [];
const finalText = data?.find((item: any) => item.type === "text")?.content || "";
```

#### 2. Rendering (Lines 68-102)
- Renders regular chat messages
- For last assistant message:
  - Shows all reasoning steps (cards with full internal state)
  - Shows final answer (clean text response)

## Termination Policy

### Hard-Coded Rules (in priority order)

1. **DHARMA_MAX_STEPS** (default: 10)
   - Safety limit - never exceed this
   - Prevents infinite loops

2. **MINIMUM_STEPS** (hard-coded: 4)
   - Enforces deep thinking
   - Cannot be overridden by environment variables

3. **Convergence Detection**
   - Uses `DHARMA_EPSILON` (default: 0.02) and `DHARMA_PATIENCE` (default: 2)
   - Stops if score plateaus: no improvement >epsilon for >patience steps
   - Only stops if score is above `DHARMA_MIN_SCORE` (default: 0.50)

4. **Target Achievement**
   - Stops if server score reaches `DHARMA_TARGET` (default: 0.75)
   - High-quality threshold

### Environment Variables (`.env.local`)

```bash
DHARMA_TARGET=0.75          # High quality threshold (stop early if reached)
DHARMA_EPSILON=0.02         # Convergence sensitivity (smaller = stricter)
DHARMA_PATIENCE=2           # Steps to wait for improvement
DHARMA_MAX_STEPS=10         # Safety limit (hard stop)
DHARMA_MIN_SCORE=0.50       # Minimum acceptable quality
```

## Scoring System

### Dual Scoring (Model + Server)

#### Model Self-Evaluation
- Model generates dharma scores for its own reasoning
- Provides `mindfulness`, `emptiness`, `nonDuality`, `boundlessCare` (0-1)
- Includes rationale for scores
- **Purpose**: Research comparison - how does model assess itself?

#### Server-Side Heuristic Scoring
- Independent validation using keyword detection
- Links to `lib/dharma.ts` → `scoreDharma(text)` function
- Not influenced by model's self-perception
- **Purpose**: Objective quality gate for termination decisions

### Score Tracking (Lines 143-172)
- Maintains history: `convergenceState.scores[]`
- Tracks best score achieved
- Calculates deltas (improvement/decline)
- Detects convergence patterns
- Generates feedback for next step

## Data Flow

### Request → Response

1. **User submits question** → `POST /api/chat`
2. **Server initializes session** → Creates `runId`, `convergenceState`
3. **Loop Step 1** → Call model for reasoning
4. **Server scores** → Calculate server dharma score
5. **Server decides** → Continue or stop?
6. **Stream to client** → Send reasoning step card
7. **Loop Step 2-N** → Repeat until termination
8. **Final synthesis** → Call model one last time
9. **Stream final answer** → Send text response
10. **Client renders** → Show all cards + final answer

### Streaming Format

```typescript
// Frontend receives array of data items:
[
  { type: "reasoning-step", content: { title, content, dharma, serverDharma, ... } },
  { type: "reasoning-step", content: { ... } },
  { type: "reasoning-step", content: { ... } },
  { type: "reasoning-step", content: { ... } },
  { type: "text", content: "Final synthesized answer..." }
]
```

## Key Benefits

### 1. Guaranteed Multi-Step Reasoning
- Server loop **cannot be bypassed**
- Minimum 4 steps enforced at infrastructure level
- No reliance on prompt engineering

### 2. Server-Side Quality Control
- Termination decisions use server scores, not model scores
- Convergence detection prevents wasted computation
- Target-based early stopping when quality is high

### 3. Maximum Interpretability
- All internal state visible in reasoning cards
- Telemetry logs every decision point
- Dual scoring shows model vs server assessment

### 4. Research-Ready
- Clean separation: model reasoning vs server control
- Comprehensive telemetry for analysis
- Can experiment with termination policies without model changes

## Telemetry

### Console Logs (JSON format)

Each step logs:
```json
{
  "event": "reasoning_step",
  "runId": "uuid-here",
  "stepIndex": 1,
  "maxSteps": 10,
  "modelScore": "0.750",
  "serverScore": "0.328",
  "scoreDelta": "0.328",
  "bestScore": "0.328",
  "stepsSinceBest": 0,
  "converged": false,
  "targetReached": false,
  "belowMinimum": true,
  "terminationReason": "minimum_steps_required",
  "shouldContinue": true,
  "latencyMs": 1234,
  "title": "Step title here"
}
```

### Session Start/End
```
[Dharma Reasoning] Starting session {runId}
[Dharma Reasoning] Session {runId} completed with N steps. Generating final synthesis...
[Dharma Reasoning] Session {runId} completed in XXXXms
```

## Frontend Components

### Reasoning Step Card (`components/reasoning-step.tsx`)

Displays:
- **Step metadata**: Number (e.g., "Step 2 of 10"), CONTINUE/FINAL badge
- **Reasoning content**: Title + detailed content
- **Server Score**: Heuristic v0 with breakdown (M/E/N/B scores)
- **Model Self-Score**: Model's self-evaluation with breakdown
- **Score Delta**: Improvement/decline indicator (colored)
- **Convergence Status**: Best score, steps since improvement
- **Server Feedback**: Guidance for next step

### Final Answer Section

- Clear visual separation (border-top)
- "Final Answer:" header
- Clean text synthesis of all reasoning

## Future Enhancements

### Potential Improvements
1. **Learned Scorer**: Replace keyword heuristic with trained model
2. **Dynamic Termination**: Adjust policy based on question complexity
3. **Parallel Reasoning**: Generate multiple perspectives simultaneously
4. **Score Calibration**: Tune thresholds based on empirical analysis
5. **Database Persistence**: Store telemetry in Supabase for long-term research

### Research Questions
1. How does model self-score correlate with server score?
2. What's the optimal number of reasoning steps per question type?
3. Does convergence detection save computation without harming quality?
4. Can we predict termination point from early steps?

## Configuration

### Required Environment Variables

Create `.env.local`:
```bash
# Required: OpenAI API key
OPENAI_API_KEY=sk-...

# Optional: Dharma quality thresholds (defaults shown)
DHARMA_TARGET=0.75
DHARMA_EPSILON=0.02
DHARMA_PATIENCE=2
DHARMA_MAX_STEPS=10
DHARMA_MIN_SCORE=0.50
```

### Hard-Coded Constants

In `route.ts`:
```typescript
const MINIMUM_STEPS = 4;  // Cannot be configured - ensures deep thinking
```

## Running the System

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:3000

# Monitor telemetry in terminal (JSON logs)
```

## Summary

This architecture provides:
✅ **Guaranteed multi-step reasoning** (server-controlled loop)
✅ **Objective quality gates** (server-side scoring + termination)
✅ **Maximum interpretability** (all state visible in UI + telemetry)
✅ **Research-ready** (comprehensive logging, dual scoring)
✅ **No model hacks** (clean separation of concerns)

The key insight: **Don't ask the model to control iteration - make it the server's job.**

