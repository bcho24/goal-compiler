# Goal Compiler

> An experiment in compiling vague human goals into executable action graphs.

---

![Image](https://github.com/user-attachments/assets/af979c71-71dd-4b5f-8764-782ecc6c46c7)

---

## What does this output?

You type a vague goal. The system interviews you, evaluates feasibility, then compiles an execution graph — where every node knows its type, its dependencies, and whether an agent can run it.

```json
{
  "goal": "I want to transition into an AI-focused role",
  "clarifications": [
    { "question": "What's your current background?", "answer": "Backend engineer, 5 years" },
    { "question": "Target timeline?", "answer": "6–12 months" }
  ],
  "feasibility": {
    "level": "high",
    "assumptions": ["10+ hours/week available", "Willing to build side projects"],
    "risks": ["AI job market is competitive", "May need ML fundamentals first"]
  },
  "steps": [
    {
      "id": "step-1",
      "order": 1,
      "title": "Assess current ML knowledge gaps",
      "description": "Compare your existing skills against common AI role requirements. Identify the 3–5 biggest gaps.",
      "type": "research",
      "executable": true,
      "tool_hint": "web_search",
      "blocked_by": [],
      "status": "pending"
    },
    {
      "id": "step-2",
      "order": 2,
      "title": "Choose a learning path",
      "description": "Decide between fast-track (Cursor/LLM APIs focus) vs. fundamentals-first (ML theory + PyTorch).",
      "type": "decision",
      "executable": false,
      "reason_if_not_executable": "Requires human judgment on career direction",
      "blocked_by": ["step-1"],
      "status": "pending"
    },
    {
      "id": "step-3",
      "order": 3,
      "title": "Build a public AI project",
      "description": "Ship one end-to-end project demonstrating LLM integration, RAG, or fine-tuning. Publish to GitHub.",
      "type": "creation",
      "executable": false,
      "reason_if_not_executable": "Requires human creativity and effort",
      "blocked_by": ["step-2"],
      "status": "pending"
    },
    {
      "id": "step-4",
      "order": 4,
      "title": "Apply to 20 AI-adjacent roles",
      "description": "Target companies that value engineering background + AI tooling experience over pure research.",
      "type": "action",
      "executable": false,
      "reason_if_not_executable": "Requires human decision on which companies to target",
      "blocked_by": ["step-3"],
      "status": "pending"
    }
  ]
}
```

> Some nodes in the graph are executable by agents. Some are not. Yet.

---

## Quick Start

```bash
git clone https://github.com/bcho24/goal-compiler.git
cd goal-compiler
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Go to **Settings** and configure your AI API key (OpenAI / Anthropic / DeepSeek / any OpenAI-compatible endpoint).

---

## How it works

```
Vague Goal
    │
    ▼
Clarification   ← AI asks the minimum necessary questions
    │
    ▼
Feasibility     ← AI evaluates assumptions and risks
    │
    ▼
Execution Graph ← every step is annotated: type · executable · blocked_by · tool_hint
```

Each step in the graph carries:

| Field | Values | Meaning |
|---|---|---|
| `type` | `research` `decision` `action` `creation` | What kind of work this is |
| `executable` | `true` / `false` | Can an agent run this without human input? |
| `blocked_by` | `[step-id, ...]` | Dependency edges in the graph |
| `tool_hint` | `web_search` `code_generation` … | Which tool an agent would use |
| `reason_if_not_executable` | string | Why this node requires a human |

Any step can be recursively drilled down — it becomes a sub-goal with its own clarification → feasibility → execution graph cycle, always aware of its parent context.

---

## Tech stack

- **Next.js 16** (App Router)
- **Vercel AI SDK** — multi-model, streaming
- **Dexie.js** — IndexedDB, all data stays local in the browser
- **Zustand** — state management
- **shadcn/ui** + Tailwind CSS 4
- **TypeScript**

Supports: OpenAI · Anthropic · DeepSeek · MiniMax · any OpenAI-compatible endpoint

---

## Project structure

```
app/
  api/ai/          # clarify · feasibility · adjust-goal · steps
  goal/[id]/       # goal workspace (single-page full flow)
  settings/        # AI provider config
components/
  goal/            # ClarifyPanel · FeasibilityPanel · StepsPanel · StepItem …
lib/
  ai/prompts.ts    # all AI prompt templates
  db/              # Dexie.js schema and queries
  store/           # Zustand stores
  stateMachine.ts  # state transitions
  types.ts         # TypeScript types — Step, Goal, Feasibility
```

---

*This is an early experiment. The schema is intentionally designed to be agent-consumable from day one.*
