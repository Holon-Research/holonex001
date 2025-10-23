# Contemplative Dharma Reasoning System

An auto-iterative AI reasoning system that uses **LLM-generated feedback** to guide multi-step thinking toward contemplative wisdom alignment.

## Key Features

🧠 **Server-Controlled Iteration**: Server runs a loop that generates 4-10 reasoning steps, regardless of model behavior

🔄 **LLM-Based Feedback**: After each step, a feedback LLM analyzes score trajectory and provides targeted philosophical guidance

📊 **Contemplative Evaluation**: Model self-evaluates against 4 dharma principles:
- **Mindfulness** (Meta-awareness)
- **Emptiness** (Conceptual flexibility)
- **Non-Duality** (Interconnection)
- **Boundless Care** (Universal concern)

🎯 **Hard-Coded Enforcement**: Minimum 4 steps, maximum 10 steps, target threshold 0.75

📈 **Rich Telemetry**: JSON logging of scores, trajectories, feedback, and latency per step

🔍 **Full Transparency**: UI shows model's self-evaluation, rationale, and server's LLM-generated feedback

## How It Works

```
1. User asks a question
2. Server loop starts (4-10 iterations)
   
   For each step:
   a. Model generates reasoning + self-evaluates (dharma scores)
   b. Server logs scores to history
   c. Feedback LLM analyzes trajectory, generates guidance
   d. Feedback injected into next step's context
   e. Step streamed to frontend
   
3. After loop: Model synthesizes final answer
4. User sees: reasoning steps + final text response
```

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key

### Installation

```bash
npm install
```

### Configuration

Create `.env.local`:

```bash
# OpenAI API Key (required)
OPENAI_API_KEY=sk-...

# Dharma target threshold (optional, default: 0.75)
DHARMA_TARGET=0.75

# Maximum reasoning steps (optional, default: 10)
DHARMA_MAX_STEPS=10
```

### Running

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Usage Example

**User**: "Should we go to war with Japan?"

**System generates**:
- **Step 1**: Geopolitical analysis (dharma: 0.65) → *Feedback: "Strengthen emptiness - acknowledge more uncertainty"*
- **Step 2**: Diplomatic alternatives (dharma: 0.70) → *Feedback: "Good progress on mindfulness, now consider broader stakeholder impact"*
- **Step 3**: Economic impacts (dharma: 0.72) → *Feedback: "Strong non-duality. Expand boundless care dimension"*
- **Step 4**: Ethical framework (dharma: 0.78) → *Target reached!*
- **Final Answer**: Synthesized recommendation

## Architecture

### Core Components

- **`lib/dharma.ts`**: LLM-based feedback generation with philosophical definitions
- **`lib/schema.ts`**: Zod schemas for reasoning steps and dharma evaluation
- **`app/(preview)/api/chat/route.ts`**: Server-controlled iteration loop
- **`components/reasoning-step.tsx`**: UI for displaying steps with full transparency

### Data Flow

```
User Question
    ↓
Server Loop (4-10 steps)
    ↓
Step 1: Model → Self-scores → History
    ↓
Feedback LLM: Analyzes trajectory → Generates guidance
    ↓
Step 2: Model (with feedback) → Self-scores → History
    ↓
Feedback LLM: Analyzes → Guidance
    ↓
... (continue until MIN_STEPS, MAX_STEPS, or TARGET)
    ↓
Final Synthesis
    ↓
User receives: Reasoning steps + Final answer
```

## Telemetry

Each reasoning step logs:

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

View logs in terminal where `npm run dev` is running.

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DHARMA_TARGET` | `0.75` | Target dharma score (0-1) for early stopping |
| `DHARMA_MAX_STEPS` | `10` | Maximum reasoning steps (hard limit) |
| `OPENAI_API_KEY` | Required | Your OpenAI API key |

### Hard-Coded Constants

| Constant | Value | Location | Description |
|----------|-------|----------|-------------|
| `MINIMUM_STEPS` | `4` | `route.ts` | Minimum reasoning steps (always enforced) |

## Research Questions

This system enables exploration of:

1. **Does LLM-generated feedback improve reasoning quality?**
   - Compare scores with vs without feedback injection

2. **What feedback strategies work best?**
   - Targeting weakest principle vs balanced guidance
   - Concise vs detailed feedback

3. **How do scores correlate with reasoning quality?**
   - Human evaluation vs model self-scores
   - Alignment with expert judgment

4. **When should iteration stop?**
   - Target-based (0.75) vs fixed steps (4-10)
   - Cost vs quality tradeoffs

5. **Can we detect gaming?**
   - Model "cheating" by mentioning principles without genuine insight
   - Need for verifier head or learned scorer

## Future Enhancements

### Phase 1 ✅ (Completed)
- LLM-based feedback generation
- Score history tracking
- Server-controlled iteration
- Rich telemetry

### Phase 2 (Next)
- Fine-tune feedback LLM on expert-labeled steps
- A/B test keyword heuristic vs LLM feedback
- Visualize score trajectory (sparkline)
- Export telemetry to database

### Phase 3 (Research)
- Multi-model ensemble evaluation
- Learned scorer (fine-tuned classifier)
- Active learning with human review
- Pareto analysis (dharma vs latency)

## Tech Stack

- **Framework**: Next.js 15 + React
- **AI SDK**: Vercel AI SDK
- **Model**: OpenAI GPT-4 (reasoning + feedback)
- **Validation**: Zod
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion

## Contributing

This is a research prototype. Contributions welcome for:
- Alternative feedback strategies
- Improved telemetry analysis
- UI enhancements
- Evaluation metrics

## License

MIT

## Acknowledgments

Based on research from the **Contemplative Artificial Intelligence** paper, which explores how Buddhist contemplative principles can guide AI reasoning toward wisdom.
