# CEO Agent - Complete File Map

A comprehensive guide to every file in the codebase, organized by module.

---

## 📁 Project Root

| File | Description |
|------|-------------|
| `package.json` | Node.js dependencies and scripts |
| `.env` | Environment variables (API keys) |
| `README.md` | Project documentation |

---

## 📁 Backend (`src/`)

### Core Agent Files

| File | Purpose | Key Functions |
|------|---------|---------------|
| `server.js` | **Main HTTP server** - All API endpoints, request routing, server startup | All REST API handlers |
| `index.js` | CLI entry point for running agent directly | `main()` |

---

### 🧠 `src/core/` - Agent Brain

| File | Purpose | Key Classes/Functions |
|------|---------|----------------------|
| `Agent.js` | **Main Agent class** - Orchestrates the entire decision-making process | `Agent`, `createAgent()`, `process()` |
| `Lifecycle.js` | **Agent lifecycle stages** - PERCEIVE → THINK → PLAN → PROPOSE → REFLECT | `AgentLifecycle`, lifecycle stage handlers |
| `Context.js` | **Context builder** - Gathers context from memory, RAG, and constraints | `ContextBuilder` |

---

### 🤖 `src/llm/` - LLM Providers (OpenRouter is Default)

| File | Purpose | Key Classes |
|------|---------|-------------|
| `LLMRouter.js` | **Routes requests to LLM providers** - OpenRouter is prioritized first | `LLMRouter`, `RoutingStrategy` |
| `LLMClient.js` | Base class for all LLM clients | `LLMClient`, `LLMTaskType` |
| `HealthTracker.js` | Tracks provider health and availability | `HealthTracker` |
| `index.js` | Module exports | - |

#### `src/llm/providers/` - LLM Client Implementations

| File | Purpose | Key Classes |
|------|---------|-------------|
| `OpenRouterClient.js` | **Primary LLM provider** - Uses OpenRouter API | `OpenRouterClient` |
| `OpenAIClient.js` | OpenAI GPT integration | `OpenAIClient` |
| `AnthropicClient.js` | Anthropic Claude integration | `AnthropicClient` |
| `OllamaClient.js` | Local Ollama models (fallback) | `OllamaClient` |

---

### 🧩 `src/reasoning/` - Decision Logic & Prompts

| File | Purpose | Key Features |
|------|---------|--------------|
| `OptionGenerator.js` | **Contains LLM prompts** - Generates strategic options using LLM | `buildPrompt()`, option generation prompts |
| `OptionEvaluator.js` | Scores and ranks options | Risk/benefit analysis |
| `RiskModel.js` | Risk assessment calculations | Risk scoring, mitigation strategies |
| `DecisionFormatter.js` | Formats final recommendations | Output formatting |
| `index.js` | Module exports | - |

> **📝 PROMPTS LOCATION**: The main LLM prompts are in `OptionGenerator.js` in the `buildPrompt()` method.

---

### 📊 `src/audit/` - Logging & Feedback

| File | Purpose | Key Classes |
|------|---------|-------------|
| `AuditLogger.js` | Decision audit trail logging | `AuditLogger` |
| `ApprovalManager.js` | Human approval workflow | `ApprovalManager` |
| `FeedbackCollector.js` | User feedback collection (ratings, outcomes) | `FeedbackCollector`, `recordRating()` |
| `index.js` | Module exports | - |

---

### 💾 `src/memory/` - Agent Memory

| File | Purpose | Key Classes |
|------|---------|-------------|
| `MemoryManager.js` | Coordinates short-term and long-term memory | `MemoryManager` |
| `ShortTermMemory.js` | Context window management | `ShortTermMemory` |
| `LongTermMemory.js` | Persistent memory storage | `LongTermMemory` |
| `adapters/FileAdapter.js` | File-based memory storage | `FileAdapter` |
| `index.js` | Module exports | - |

---

### 📚 `src/rag/` - Document Retrieval

| File | Purpose | Key Classes |
|------|---------|-------------|
| `RAGEngine.js` | Main RAG orchestrator | `RAGEngine` |
| `DocumentLoader.js` | Loads documents from filesystem | Document parsing |
| `Embedder.js` | Text embedding generation | `Embedder` |
| `VectorStore.js` | Vector similarity search | `VectorStore` |
| `ContextPolicy.js` | Context selection policies | `ContextPolicy` |
| `index.js` | Module exports | - |

---

### 🛡️ `src/safety/` - Safety & Guardrails

| File | Purpose | Key Classes |
|------|---------|-------------|
| `SafetyGuard.js` | Main safety coordinator | `SafetyGuard` |
| `ContentFilter.js` | Filters unsafe content | `ContentFilter` |
| `HallucinationDetector.js` | Detects LLM hallucinations | `HallucinationDetector` |
| `LoopGuard.js` | Prevents infinite loops | `LoopGuard` |
| `index.js` | Module exports | - |

---

### 🎯 `src/okr/` - OKR Management

| File | Purpose | Key Classes |
|------|---------|-------------|
| `OKRManager.js` | CRUD operations for OKRs | `OKRManager`, `create()`, `update()` |
| `index.js` | Module exports | - |

---

### 🌟 `src/vision/` - Company Vision

| File | Purpose | Key Classes |
|------|---------|-------------|
| `VisionEngine.js` | Vision generation and management | `VisionEngine`, `generate()` |
| `index.js` | Module exports | - |

---

### 📅 `src/timeline/` - Decision Timeline

| File | Purpose | Key Classes |
|------|---------|-------------|
| `TimelineManager.js` | Decision history tracking | `TimelineManager` |
| `index.js` | Module exports | - |

---

### ⚙️ `src/config/` - Configuration

| File | Purpose |
|------|---------|
| `index.js` | Application configuration (ports, defaults, etc.) |

---

### 🔧 `src/utils/` - Utilities

| File | Purpose |
|------|---------|
| `logger.js` | Winston-based logging |

---

## 📁 Frontend (`frontend/src/`)

### 📄 `app/` - Next.js Pages

| File/Folder | Purpose |
|-------------|---------|
| `layout.tsx` | Root layout with theme provider |
| `page.tsx` | Homepage (redirects to dashboard) |
| `dashboard/page.tsx` | Main dashboard with query input |
| `okr/page.tsx` | OKR management page |
| `vision/page.tsx` | Vision editor page |
| `timeline/page.tsx` | Decision timeline page |
| `history/page.tsx` | Decision history page |
| `settings/page.tsx` | Settings page |

---

### 🧱 `components/` - React Components

#### `components/analysis/` - Analysis Display

| File | Purpose |
|------|---------|
| `analysis-results.tsx` | Main container for analysis results |
| `recommendation-card.tsx` | Displays top recommendation |
| `alternatives-list.tsx` | Shows alternative options |
| `confidence-meter.tsx` | Confidence score visualization |
| `risk-assessment.tsx` | Risk assessment display |

#### `components/feedback/` - Feedback System

| File | Purpose |
|------|---------|
| `feedback-panel.tsx` | Main feedback container |
| `rating-panel.tsx` | Star rating component |
| `outcome-recorder.tsx` | Record decision outcomes |
| `index.ts` | Component exports |

#### `components/okr/` - OKR Management

| File | Purpose |
|------|---------|
| `okr-dashboard.tsx` | OKR list and stats |
| `okr-card.tsx` | Individual OKR display |
| `okr-form.tsx` | Create/edit OKR form |

#### `components/vision/` - Vision Editor

| File | Purpose |
|------|---------|
| `vision-editor.tsx` | Vision generation and editing |

#### `components/timeline/` - Timeline

| File | Purpose |
|------|---------|
| `timeline-view.tsx` | Decision timeline visualization |

#### `components/ui/` - Shadcn/UI Components

Base UI components: Button, Card, Input, Dialog, Badge, Progress, etc.

---

### 📡 `lib/` - Utilities & API

| File | Purpose | Key Exports |
|------|---------|-------------|
| `api.ts` | **API client** - All backend communication | `analyze()`, `recordRating()`, `getOKRs()`, etc. |
| `utils.ts` | Utility functions | `cn()` (classNames) |

---

### 🗃️ `stores/` - State Management (Zustand)

| File | Purpose |
|------|---------|
| `query-store.ts` | Analysis query state |
| `status-store.ts` | Agent status state |

---

### 📝 `types/` - TypeScript Types

| File | Purpose |
|------|---------|
| `api.ts` | All API request/response types |

---

## 📁 Workflows (`.agent/workflows/`)

| File | Purpose |
|------|---------|
| `code-style.md` | Coding conventions |
| `backend-development.md` | Backend development patterns |
| `frontend-development.md` | Frontend development patterns |
| `api-development.md` | API design guidelines |

---

## 📁 Data Directories

| Directory | Purpose |
|-----------|---------|
| `data/documents/` | RAG documents for context |
| `data/feedback/` | User feedback storage |
| `data/memory/` | Agent memory persistence |
| `data/okrs/` | OKR data files |
| `data/vision/` | Vision data files |
| `data/timeline/` | Decision timeline data |

---

## 🔑 Environment Variables

```bash
# Required - OpenRouter API Key (Primary LLM)
OPENROUTER_API_KEY=your_key_here

# Optional - Override default model
OPENROUTER_MODEL=google/gemini-2.0-flash-exp:free

# Optional - Other providers (fallbacks)
OPENAI_API_KEY=your_key        # For OpenAI fallback
ANTHROPIC_API_KEY=your_key     # For Anthropic fallback
```

---

## 🚀 Quick Start Commands

```bash
# Start backend server
cd ceo-agent && node src/server.js

# Start frontend (separate terminal)
cd ceo-agent/frontend && npm run dev
```

**Backend runs on**: http://localhost:3001  
**Frontend runs on**: http://localhost:3000
