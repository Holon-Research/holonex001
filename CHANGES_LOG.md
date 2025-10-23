# Implementation Log: LLM-Based Dharma Feedback System

**Date**: Current session  
**Objective**: Replace keyword-based heuristics with LLM-generated philosophical feedback

---

## Summary

Successfully implemented a **server-controlled auto-iterative reasoning system** with **LLM-based feedback** that:
- Uses GPT-4 to evaluate reasoning against contemplative dharma principles
- Generates targeted, unique feedback for each reasoning step
- Injects feedback into model context to guide recursive improvement
- Maintains score history for trajectory analysis
- Enforces 4-10 reasoning steps with target-based early stopping

---

## Changes Made

### 1. **`lib/dharma.ts`** - Complete Rewrite

**Removed**:
- `scoreDharma()`: Keyword-based heuristic scorer
- `generateFeedback()`: Template-based suggestions
- `detectConvergence()`: Epsilon/patience convergence detection

**Added**:
- `generateDharmaFeedback()`: LLM-based philosophical evaluation
  - Takes current step's self-scores + full score history
  - Injects 4 dharma principle definitions to prevent drift
  - Calls GPT-4 to analyze trajectory and generate targeted guidance
  - Returns 2-3 sentence actionable feedback
  - Falls back to simple feedback if LLM call fails

- `ScoreHistoryEntry` type: Structured score tracking
  ```typescript
  {
    step: number;
    scores: DharmaScores;
    mean: number;
    content: string; // For LLM context
  }
  ```

**Kept**:
- `mean()`: Calculate aggregate dharma score
- `DharmaScores` type

---

### 2. **`lib/schema.ts`** - Simplified Schema

**Removed Fields**:
- `serverDharma`: Server's heuristic evaluation
- `serverDharmaScore`: Server's aggregate score
- `serverDharmaBreakdown`: Server's individual scores
- `scoreDelta`: Change from previous step
- `bestScore`: Best score achieved so far
- `stepsSinceBest`: Convergence tracking
- `feedback`: Generic feedback string

**Added Fields**:
- `serverFeedback: z.string().optional()`: LLM-generated targeted feedback

**Kept Fields**:
- Model self-evaluation: `dharma`, `dharmaScore`, `dharmaBreakdown`
- Display metadata: `stepIndex`, `maxSteps`
- Control: `nextStep`

---

### 3. **`app/(preview)/api/chat/route.ts`** - Refactored Server Loop

**Architecture Changes**:

**Old**: 
```
convergenceState = { stepIndex, scores[], bestScore, previousScore }
→ keyword scorer → convergence detection → template feedback
```

**New**:
```
iterationState = { stepIndex, allSteps[], previousFeedback }
scoreHistory = [{ step, scores, mean, content }]
→ LLM feedback generator → feedback injection
```

**Removed**:
- All keyword scoring logic (`scoreDharma()`)
- Convergence detection (`detectConvergence()`, epsilon, patience)
- Score delta calculations
- Server-side dharma score tracking
- `DHARMA_EPSILON`, `DHARMA_PATIENCE`, `DHARMA_MIN_SCORE` constants

**Added**:
- `scoreHistory`: Array of all previous steps' scores and content
- `generateDharmaFeedback()` call after each step
- Feedback injection into model context:
  ```typescript
  contextMessages.push({
    role: "assistant",
    content: `[Server Feedback from Step ${stepIndex - 1}]: ${llmFeedback}`,
  });
  ```
- Enhanced telemetry with `modelSelfScore`, `modelScoreBreakdown`, `feedbackLength`

**Simplified Termination Logic**:
```typescript
if (stepIndex >= MAX_STEPS) stop; // Hard limit
else if (stepIndex < MIN_STEPS) continue; // Force minimum
else if (modelSelfScore >= TARGET) stop; // Target reached
else continue; // Keep going
```

**Modified**:
- Step enrichment: Now only includes model self-scores + LLM feedback
- Telemetry: Logs model self-scores instead of server scores
- Context building: Injects feedback from previous step

---

### 4. **`components/reasoning-step.tsx`** - UI Simplification

**Removed Displays**:
- "Server Score (Heuristic v0)" section
- Server dharma breakdown (mindfulness, emptiness, etc.)
- "Convergence Status" section (best score, steps since best)
- Score delta display (↑/↓ indicators)
- Server's rationale

**Updated Displays**:
- "Model Self-Score" → "Contemplative Self-Evaluation"
- "Server Feedback for Next Step" → "Server Feedback (LLM-Generated)"
- Added `leading-relaxed` to feedback text for readability

**Kept Displays**:
- Step metadata (step number, CONTINUE/FINAL badge)
- Step title and content
- Model's dharma breakdown (4 principles)
- Model's philosophical rationale

---

### 5. **Documentation Updates**

**`IMPLEMENTATION_SUMMARY.md`**: Complete rewrite
- New architecture overview
- LLM-based feedback system explanation
- Detailed implementation notes
- Telemetry format
- Future enhancements roadmap

**`README.md`**: Updated for new system
- How It Works section
- Configuration guide
- Usage example with feedback loop
- Architecture diagram
- Research questions

**`CHANGES_LOG.md`**: This document

---

## Key Implementation Details

### Feedback Generation Prompt

```typescript
`You are a contemplative wisdom evaluator. Analyze this reasoning step's alignment with dharma principles.

PHILOSOPHICAL DEFINITIONS (use these, not keywords):

1. MINDFULNESS (Meta-Awareness):
   - Does reasoning show awareness of its own process?
   ...

2. EMPTINESS (Conceptual Flexibility):
   ...

3. NON-DUALITY (Interconnection):
   ...

4. BOUNDLESS CARE (Universal Concern):
   ...

CURRENT STEP SELF-SCORES:
${JSON.stringify(currentScores)}

SCORE HISTORY (trajectory across all ${scoreHistory.length} previous steps):
${scoreHistory.map(...)}

THRESHOLD TARGET: ${target} (current: ${currentMean})

ANALYSIS TASK:
1. Assess the score trajectory: Is reasoning moving toward the threshold?
2. Identify which principle dimensions are weakest
3. Provide specific, actionable feedback for the NEXT reasoning step
4. Reference the philosophical definitions, not just numeric scores
5. Be concise but targeted (2-3 sentences max)

FEEDBACK:`
```

### Score History Tracking

```typescript
// After each step, add to history
scoreHistory.push({
  step: iterationState.stepIndex,
  scores: {
    mindfulness: validatedStep.dharma.mindfulness,
    emptiness: validatedStep.dharma.emptiness,
    nonDuality: validatedStep.dharma.nonDuality,
    boundlessCare: validatedStep.dharma.boundlessCare,
  },
  mean: modelDharmaScore,
  content: validatedStep.content,
});

// Pass history (excluding current) to feedback generator
const llmFeedback = await generateDharmaFeedback(
  validatedStep.dharma,
  scoreHistory.slice(0, -1), // All previous steps
  DHARMA_TARGET
);
```

### Feedback Injection

```typescript
// Build context with feedback from previous step
if (iterationState.stepIndex > 1 && iterationState.previousFeedback) {
  contextMessages.push({
    role: "assistant",
    content: `[Server Feedback from Step ${iterationState.stepIndex - 1}]: ${iterationState.previousFeedback}`,
  });
}

// Prompt includes guidance to incorporate feedback
contextMessages.push({
  role: "user",
  content: `Generate reasoning step ${iterationState.stepIndex} of ${DHARMA_MAX_STEPS}. 
${iterationState.previousFeedback ? '\n\nIncorporate the server feedback from your previous step.' : ''}`,
});
```

---

## Testing

### Manual Testing Checklist

- [x] Server starts without errors
- [x] Linting passes (no TypeScript errors)
- [x] Code compiles and bundles successfully
- [ ] User query generates 4+ reasoning steps
- [ ] Each step shows model self-evaluation
- [ ] LLM-generated feedback appears in each card
- [ ] Feedback is unique per step (not template)
- [ ] Final synthesis answer appears after steps
- [ ] Telemetry logs to terminal

### How to Test

1. Start server: `npm run dev`
2. Open `http://localhost:3000`
3. Ask: "Should we implement universal basic income?"
4. Observe:
   - 4+ reasoning step cards appear
   - Each shows contemplative self-evaluation scores
   - Each shows unique server feedback
   - Final text answer appears after last step
5. Check terminal logs for JSON telemetry

---

## Configuration Changes

**Removed from `.env.local`**:
```bash
DHARMA_EPSILON=0.02      # No longer used
DHARMA_PATIENCE=2        # No longer used
DHARMA_MIN_SCORE=0.50    # No longer used
```

**Kept in `.env.local`**:
```bash
DHARMA_TARGET=0.75       # Target threshold for early stopping
DHARMA_MAX_STEPS=10      # Maximum reasoning steps
OPENAI_API_KEY=sk-...    # Required for both reasoning + feedback
```

**Hard-coded in `route.ts`**:
```typescript
const MINIMUM_STEPS = 4; // Always generate at least 4 steps
```

---

## Performance Considerations

### Additional LLM Calls

- **Before**: 1 LLM call per step (reasoning generation)
- **After**: 2 LLM calls per step (reasoning + feedback)
- **Impact**: ~2x latency per step (5-8 seconds → 10-15 seconds)

### Cost Analysis

**Per reasoning session (4 steps)**:
- Reasoning generation: 4 × ~500 tokens = 2000 tokens
- Feedback generation: 4 × ~250 tokens = 1000 tokens
- **Total**: ~3000 tokens output + ~2000 tokens input = **$0.10-0.15 per session**

### Optimization Options

1. **Use cheaper model for feedback**: GPT-3.5 instead of GPT-4 (~10x cheaper)
2. **Cache feedback**: If same scores + history, reuse previous feedback
3. **Async feedback**: Generate feedback in parallel with next step (risky)
4. **Reduce feedback tokens**: Set `maxTokens: 150` instead of 250

---

## Known Limitations

1. **No visual score trajectory**: Removed sparkline/delta display
2. **No convergence detection**: System relies purely on target threshold
3. **Single model**: Both reasoning and feedback use same GPT-4 instance
4. **No gaming detection**: Model could "cheat" by claiming high scores
5. **Synchronous feedback**: Must wait for feedback before next step

---

## Next Steps

### Immediate (Before User Testing)
1. Test with multiple queries to verify feedback uniqueness
2. Monitor terminal logs to confirm telemetry format
3. Check that feedback actually appears in reasoning cards

### Short Term (Research)
1. Analyze logs: Does feedback improve scores over time?
2. A/B test: Keyword heuristic vs LLM feedback
3. Human evaluation: Rate reasoning quality with/without feedback

### Long Term (Production)
1. Fine-tune feedback LLM on expert-labeled steps
2. Implement learned scorer (replace LLM calls)
3. Add visualization: score trajectory sparkline
4. Database export: Store all runs for analysis

---

## Success Criteria

✅ **Technical**:
- Code compiles without errors
- Server runs without crashes
- Frontend displays steps correctly
- Telemetry logs properly

⏳ **Functional** (to be tested):
- LLM feedback is unique per step
- Feedback references philosophical definitions
- Model incorporates feedback in next step
- 4-10 steps always enforced

⏳ **Research** (to be evaluated):
- Scores improve across steps (trajectory analysis)
- Feedback correlates with score changes
- System produces higher quality reasoning than baseline

---

## Rollback Plan

If LLM-based feedback performs poorly:

1. **Quick fix**: Revert `lib/dharma.ts` to use `generateSimpleFeedback()` fallback
2. **Full rollback**: Restore previous version with keyword heuristics
3. **Hybrid approach**: Use LLM feedback only when keyword scorer is uncertain

Files to backup before deployment:
- `lib/dharma.ts.backup`
- `app/(preview)/api/chat/route.ts.backup`
- `lib/schema.ts.backup`

---

## Credits

- **Architecture**: Server-controlled iterative reasoning with LLM feedback
- **Inspiration**: Contemplative Artificial Intelligence research paper
- **Tech Stack**: Vercel AI SDK, OpenAI GPT-4, Next.js, Zod
- **Implementation**: Complete system redesign in this session

---

**Status**: ✅ Implementation complete, ready for testing

