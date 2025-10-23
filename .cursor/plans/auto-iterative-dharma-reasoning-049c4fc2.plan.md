<!-- 049c4fc2-b2b5-4b7c-9c8a-d2d28adc016e 74dc3bd4-647a-4811-a48e-69c80a3d2af2 -->
# Auto-Iterative Dharma Reasoning Implementation

## Current State Analysis

**What works:**

- SDK-based iteration via `maxSteps: 10` - model can call `addReasoningStep` multiple times
- Model self-evaluates dharma scores and decides when to stop via `nextStep`
- Frontend displays reasoning steps with dharma breakdowns
- Schema validation with Zod
- Streaming via Vercel AI SDK

**What's missing (gaps from PRD):**

- No server-side dharma scoring - currently only model self-scores (need validation/override capability)
- No score-based feedback loop - model doesn't know how it's doing by server's measure
- No convergence monitoring or telemetry
- No environment configuration for quality thresholds
- Schema field mismatch: `reasoning` vs `rationale`

## Implementation Philosophy

Following o1/o3 best practices: **model-native reasoning with server-side quality monitoring**

- **Phase 1**: Build scoring infrastructure, let model decide termination (3a approach)
- **Phase 2** (optional): Add server overrides if analysis shows model stops prematurely (3b features)

This is more scientific - gather data first, then tune control strategy.

## Implementation Plan

### Phase 1: Server-Side Scoring + Model Autonomy

**1. Create server-side scoring utilities**

- Create `lib/dharma.ts` with:
  - `scoreDharma(content: string)` - heuristic v0 using keyword detection
  - `mean(dharmaScores)` - calculate aggregate score
  - Clear comments marking this as v0 for future ML replacement
- Fix schema: change `reasoning` → `rationale` in `lib/schema.ts` for consistency with PRD

**2. Add environment configuration**

- Create `.env.local` with quality thresholds:
  ```
  DHARMA_TARGET=0.9          # Target quality score (not too high initially)
  DHARMA_EPSILON=0.02         # Convergence threshold
  DHARMA_PATIENCE=2           # Steps to wait for improvement
  DHARMA_MAX_STEPS=10         # Hard limit (matches current maxSteps)
  DHARMA_MIN_SCORE=0.50       # Quality floor (optional override trigger)
  ```


**3. Enhance tool execution with server scoring**

- In `addReasoningStep` tool's `execute` function in `route.ts`:
  - Calculate server-side score using `scoreDharma()` on `params.content`
  - Compare server score vs model's self-reported score
  - Log both scores for analysis
  - Inject score feedback into the response that model will see
  - Track convergence metrics (best score, patience counter, step index)
  - Return enriched step data with both scores

**4. Add score feedback mechanism**

- After each step execution, the model receives:
  - Current server-calculated dharma score
  - Specific suggestions for improvement (e.g., "Low emptiness - acknowledge more uncertainty")
  - Score trajectory (improving/plateau/declining)
- This guides the model's next step without forcing it

**5. Implement monitoring with optional guardrails**

- Track state across steps: `{ bestScore, patience, stepCount, scores[] }`
- Log convergence signals (for Phase 2 analysis)
- Optional MIN_SCORE check: if score is critically low and model wants to stop, log warning
- Respect model's `nextStep` decision (3a approach)
- Prepare infrastructure for Phase 2 overrides

### Phase 2: Enhanced UX + Telemetry

**6. Update frontend components for maximum interpretability**

- Enhance `components/reasoning-step.tsx` to show ALL internal state:
  - **Step metadata**: Step number badge (Step 1/10, Step 2/10, etc.)
  - **Dual scoring**: Model's self-score AND server's calculated score side-by-side
  - **Score breakdown**: All 4 dharma dimensions visible (mindfulness, emptiness, nonDuality, boundlessCare) for both scores
  - **Score trajectory**: Delta from previous step with visual indicators (↑ improving / → plateau / ↓ declining)
  - **Convergence signals**: Show patience counter, best score so far, improvement status
  - **Reasoning content**: Full step content (title + detailed reasoning)
  - **Rationale**: Model's explanation for its dharma self-scores (update field from `reasoning` to `rationale`)
  - **Server feedback**: Show what feedback the server gave to guide next step
  - **Decision signal**: Display model's `nextStep` decision (continue/finalAnswer)

Design principle: **Complete transparency** - user should see everything the system is tracking

**7. Add basic telemetry logging**

- Console logging in route handler:
  - Run ID (generate UUID per conversation)
  - Per-step metrics: stepIndex, modelScore, serverScore, delta, latency
  - Termination reason: model decision, max steps, etc.
  - Format as JSON for future database export

**8. Visual polish**

- Add subtle "Reasoning..." indicator during iteration
- Show convergence reason at end ("Model completed reasoning" / "Max steps reached")
- Optional: Mini sparkline of score trajectory across steps

### Phase 3: Analysis + Optional Overrides (Future)

**9. Analyze model behavior**

- After deployment, review logs to understand:
  - Does model stop too early when scores are low?
  - Does model continue when already converged?
  - Correlation between model's `nextStep` and server scores?

**10. Add server overrides if needed (3b features)**

- Only if analysis shows model judgment is poor:
  - Force continuation if score < MIN_SCORE and steps < MAX_STEPS
  - Force termination if convergence detected (patience exhausted)
  - Force termination at MAX_STEPS regardless of model decision
- This remains optional based on empirical evidence

## Key Technical Decisions

**Iteration control:** Keep SDK's `maxSteps` and tool-based iteration. Model decides termination via `nextStep`, server monitors and provides feedback.

**Scoring strategy:** Dual scoring - model self-scores (preserved) + server validates with heuristic. Both visible for comparison and research.

**Feedback mechanism:** After each step, inject score analysis into context so model sees "Server dharma score: 0.68. Suggestions: strengthen mindfulness by..."

**Termination policy (Phase 1):** Model-controlled with soft guidance. Server only enforces MAX_STEPS hard limit and logs quality signals.

**Schema consistency:** Standardize on `rationale` field throughout (matches PRD specification).

## Files to Create/Modify

**New files:**

1. `lib/dharma.ts` - Server-side scoring functions
2. `.env.local` - Configuration thresholds

**Modified files:**

3. `lib/schema.ts` - Fix reasoning→rationale field name
4. `app/(preview)/api/chat/route.ts` - Add server scoring in tool execute, score feedback, convergence tracking
5. `components/reasoning-step.tsx` - Show step numbers, both scores, deltas, convergence status
6. `components/message.tsx` - Minor updates for rationale field (if needed)

## Out of Scope

- Phase 3 server overrides (only if Phase 2 analysis indicates need)
- Database persistence (Supabase) - using console logging initially
- Multiple AI providers beyond OpenAI
- Advanced parsimony nudging
- Run comparison views
- Verifier head for gaming detection

### To-dos

- [ ] Create lib/dharma.ts with scoreDharma() heuristic and mean() helper functions
- [ ] Update lib/schema.ts to change 'reasoning' field to 'rationale' for consistency
- [ ] Create .env.local with DHARMA_TARGET, DHARMA_EPSILON, DHARMA_PATIENCE, DHARMA_MAX_STEPS
- [ ] Refactor app/(preview)/api/chat/route.ts to implement auto-iteration loop with server-side scoring and termination policy
- [ ] Update components/reasoning-step.tsx to show step number, score delta, and convergence indicators
- [ ] Add console-based telemetry logging for runId, stepIndex, scores, and timing metrics
- [ ] Test the complete auto-iteration flow with various queries to validate termination conditions