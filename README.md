# CEO Agent

An AI-powered strategic decision-making agent that simulates CEO-level reasoning with multi-LLM routing, RAG-based knowledge retrieval, and human-in-the-loop approval workflows.

## Overview

CEO Agent processes strategic business queries through a 5-stage cognitive lifecycle:

```
PERCEIVE → THINK → PLAN → PROPOSE → REFLECT
```

It generates decision options, evaluates tradeoffs, assesses risks, and produces actionable recommendations with confidence scores—all while maintaining audit trails and safety guardrails.

---

## Features

- **Multi-LLM Router**: Dynamic routing between OpenAI, Anthropic Claude, and Ollama with health-based failover
- **RAG Engine**: Policy-governed document retrieval with vector similarity search
- **Memory System**: Short-term (session) and long-term (persistent) memory
- **Reasoning Engine**: Option generation, multi-criteria evaluation, and risk modeling
- **Safety Guards**: Hallucination detection, loop prevention, and content filtering
- **Human-in-the-Loop**: Approval workflows with audit trails and feedback collection

---

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│                        CEO AGENT                          │
├───────────────────────────────────────────────────────────┤
│  Lifecycle: PERCEIVE → THINK → PLAN → PROPOSE → REFLECT  │
├───────────┬───────────┬───────────┬───────────┬──────────┤
│  Memory   │    RAG    │ Reasoning │ LLM Router│  Safety  │
│ • Short   │ • Loader  │ • Options │ • OpenAI  │ • Hallu. │
│ • Long    │ • Embed   │ • Evaluate│ • Claude  │ • Loop   │
│           │ • Vector  │ • Risk    │ • Ollama  │ • Filter │
│           │           │ • Format  │ • Health  │          │
├───────────┴───────────┴───────────┴───────────┴──────────┤
│                     Audit System                          │
│      AuditLogger  •  ApprovalManager  •  Feedback        │
└───────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 18+ (ES Modules) |
| LLM Providers | OpenAI API, Anthropic API, Ollama (local) |
| Vector Storage | In-memory (cosine similarity) |
| Embeddings | Lightweight bag-of-words (no external dependencies) |
| Storage | JSON/JSONL file-based persistence |
| Logging | Custom structured JSON logger |

### No External Dependencies Required

The agent is designed to run with **zero npm dependencies** for the core functionality. All embeddings, vector search, and storage are implemented natively.

---

## Quick Start

### 1. Clone and Setup

```bash
cd ceo-agent
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# LLM Provider Keys (at least one required)
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4-turbo

CLAUDE_API_KEY=sk-ant-your-anthropic-key
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Or use local Ollama (no API key needed)
OLLAMA_MODEL=llama2
OLLAMA_BASE_URL=http://localhost:11434

# Agent Settings
LLM_DEFAULT_PROVIDER=openai
LLM_TIMEOUT=30000
LLM_MAX_RETRIES=3
```

### 3. Run the Agent

```bash
node src/index.js
```

---

## Connecting LLM Providers

### OpenAI

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Set in `.env`:
   ```env
   OPENAI_API_KEY=sk-your-key
   OPENAI_MODEL=gpt-4-turbo
   ```

### Anthropic Claude

1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Set in `.env`:
   ```env
   CLAUDE_API_KEY=sk-ant-your-key
   CLAUDE_MODEL=claude-3-5-sonnet-20241022
   ```

### Ollama (Local)

1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model:
   ```bash
   ollama pull llama2
   ```
3. Set in `.env`:
   ```env
   OLLAMA_MODEL=llama2
   OLLAMA_BASE_URL=http://localhost:11434
   ```

### Routing Strategy

The LLM Router automatically:
- Routes to the healthiest available provider
- Falls back to alternatives on failure
- Degrades gracefully to rule-based reasoning if all providers fail

---

## Project Structure

```
ceo-agent/
├── src/
│   ├── core/           # Agent lifecycle and context
│   │   ├── Agent.js
│   │   ├── Lifecycle.js
│   │   └── Context.js
│   │
│   ├── memory/         # Short-term and long-term memory
│   │   ├── ShortTermMemory.js
│   │   ├── LongTermMemory.js
│   │   └── MemoryManager.js
│   │
│   ├── rag/            # RAG engine with vector store
│   │   ├── DocumentLoader.js
│   │   ├── Embedder.js
│   │   ├── VectorStore.js
│   │   └── RAGEngine.js
│   │
│   ├── reasoning/      # Decision-making components
│   │   ├── OptionGenerator.js
│   │   ├── OptionEvaluator.js
│   │   ├── RiskModel.js
│   │   └── DecisionFormatter.js
│   │
│   ├── llm/            # Multi-LLM routing
│   │   ├── LLMClient.js
│   │   ├── LLMRouter.js
│   │   ├── HealthTracker.js
│   │   └── providers/
│   │       ├── OpenAIClient.js
│   │       ├── AnthropicClient.js
│   │       └── OllamaClient.js
│   │
│   ├── safety/         # Safety guardrails
│   │   ├── HallucinationDetector.js
│   │   ├── LoopGuard.js
│   │   ├── ContentFilter.js
│   │   └── SafetyGuard.js
│   │
│   ├── audit/          # Audit and approval
│   │   ├── AuditLogger.js
│   │   ├── ApprovalManager.js
│   │   └── FeedbackCollector.js
│   │
│   ├── config/         # Configuration
│   │   └── index.js
│   │
│   ├── utils/          # Utilities
│   │   ├── logger.js
│   │   └── errors.js
│   │
│   └── index.js        # Entry point
│
├── data/
│   ├── documents/      # Knowledge base documents
│   ├── policies/       # Decision and context policies
│   ├── memory/         # Persistent memory storage
│   ├── audit/          # Audit logs
│   ├── approvals/      # Approval records
│   └── feedback/       # Feedback data
│
├── .env.example        # Environment template
└── package.json
```

---

## How It Works

### 1. Query Processing

```javascript
const result = await agent.process(
  'Should we expand into the European market next quarter?',
  { budget: 500000, timeframe: 'Q2 2026' }
);
```

### 2. Lifecycle Stages

| Stage | Description |
|-------|-------------|
| **PERCEIVE** | Load RAG context, retrieve relevant documents |
| **THINK** | Generate strategic options using LLM or rules |
| **PLAN** | Evaluate options, assess risks, rank by weighted criteria |
| **PROPOSE** | Format decision proposal with recommendation |
| **REFLECT** | Store to memory, log audit events |

### 3. Decision Output

```
═══════════════════════════════════════════════════════════
                  CEO AGENT - DECISION PROPOSAL
═══════════════════════════════════════════════════════════

📌 RECOMMENDATION: Partnership Entry
   Enter market through strategic local partnership
   Estimated Cost: $150,000
   Timeline: 3-6 months
   Risk Level: low
   Score: 81.5%

📋 ALTERNATIVES:
   2. Delay and Monitor (Score: 74.8%)

⚠️  RISK ASSESSMENT: medium

📊 CONFIDENCE: 80.0% (moderate)

🔐 REQUIRES HUMAN APPROVAL
═══════════════════════════════════════════════════════════
```

---

## Configuration

### Decision Policy (`data/policies/decision_policy.json`)

```json
{
  "version": "1.0.0",
  "evaluationCriteria": {
    "weights": {
      "costEfficiency": 0.25,
      "riskAlignment": 0.20,
      "strategicFit": 0.20,
      "timeToValue": 0.15,
      "marketOpportunity": 0.10,
      "resourceAvailability": 0.10
    }
  },
  "approvalThresholds": {
    "autoApprove": 0.9,
    "requiresReview": 0.7,
    "requiresApproval": 0.0
  },
  "riskTolerances": {
    "maxAcceptableRisk": 0.7,
    "preferredRiskRange": [0.2, 0.5]
  },
  "ethicalRedLines": [
    "illegal_activity",
    "harm_to_employees",
    "environmental_destruction"
  ]
}
```

### Context Policy (`data/policies/context_policy.json`)

```json
{
  "maxTokenBudget": 4000,
  "minSimilarityScore": 0.7,
  "maxRetrievedDocuments": 5,
  "onNoRetrieval": "proceed_without_context"
}
```

---

## API Reference

### Agent

```javascript
import { createAgent } from './core/Agent.js';

const agent = createAgent({
  memoryManager,
  ragEngine,
  optionGenerator,
  optionEvaluator,
  riskModel,
  decisionFormatter,
  safetyGuard,
});

// Process a query
const result = await agent.process(query, constraints);

// Get status
const status = agent.getStatus();
```

### LLM Router

```javascript
import { createLLMRouter, RoutingStrategy } from './llm/index.js';

const router = createLLMRouter({
  strategy: RoutingStrategy.BEST_AVAILABLE,
  providers: { openai, anthropic, ollama },
});

// Generate with automatic routing
const response = await router.generate(prompt, { taskType: 'analysis' });

// Get health status
const status = router.getStatus();
```

### Approval Manager

```javascript
import { createApprovalManager } from './audit/index.js';

const manager = createApprovalManager({ expirationHours: 24 });

// Submit for approval
const request = manager.submitForApproval({ contextId, proposal, priority: 'high' });

// Approve/Reject
manager.approve(approvalId, 'approver_name', 'Approved with confidence');
manager.reject(approvalId, 'approver_name', 'Needs more data');

// Get pending
const pending = manager.getPending();
```

---

## Adding Knowledge Documents

Place markdown or text files in `data/documents/`:

```markdown
# Company Strategy 2026

## Market Analysis
- European market growing at 15% annually
- Key competitors: CompanyA, CompanyB

## Financial Guidelines
- Maximum project budget: $500,000
- Preferred ROI threshold: 20%
```

Documents are automatically chunked and embedded when the agent starts.

---

## Data Storage

| Directory | Contents |
|-----------|----------|
| `data/memory/` | `long_term.json` - Persistent memory |
| `data/audit/` | `audit_YYYY-MM-DD.jsonl` - Daily audit logs |
| `data/approvals/` | `apr_xxx.json` - Approval records |
| `data/feedback/` | `feedback_YYYY-MM-DD.jsonl` - User feedback |

---

## Safety Features

### Hallucination Detection
- Checks for unsupported claims
- Detects internal contradictions
- Flags overconfident language
- Validates numerical data against sources

### Loop Prevention
- Maximum iteration limits
- Content hash comparison
- Circular reasoning detection

### Content Filtering
- Blocked patterns (fraud, illegal activity)
- Ethical red line enforcement
- PII sanitization

---

## Development

### Running in Development

```bash
node src/index.js
```

### Testing with Different LLMs

```bash
# Use OpenAI
LLM_DEFAULT_PROVIDER=openai node src/index.js

# Use Ollama locally
LLM_DEFAULT_PROVIDER=ollama node src/index.js
```

---

## Troubleshooting

### "All providers failed"

- Ensure at least one LLM provider is configured in `.env`
- Check API key validity
- For Ollama, verify it's running: `ollama list`

### "No RAG context retrieved"

- Add relevant documents to `data/documents/`
- Lower `minSimilarityScore` in context policy
- Check document format (markdown/text supported)

### Approval requests expiring

- Default expiration is 24 hours
- Adjust `expirationHours` in ApprovalManager config


