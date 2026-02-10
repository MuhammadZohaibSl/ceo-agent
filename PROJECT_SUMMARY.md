# CEO Agent – Project Summary

**Document Version:** 1.0  
**Last Updated:** February 9, 2026  
**Prepared For:** Smaashlabs Development Team

---

## Executive Summary

**CEO Agent** is an AI-powered strategic decision-making assistant designed to help business leaders make faster, more informed decisions. It processes business queries, analyzes options, evaluates risks, and provides actionable recommendations—all with full transparency and audit trails.

> **In Simple Terms:** Think of CEO Agent as a virtual strategic advisor that can analyze complex business decisions, weigh pros and cons, assess risks, and provide recommendations based on your company's policies and historical data.

---

## 🎯 What Problem Does It Solve?

| Challenge | CEO Agent Solution |
|-----------|-------------------|
| Decision fatigue from too many options | Generates and ranks the best 3-5 options automatically |
| Lack of context for new decisions | Uses RAG to retrieve relevant documents and past decisions |
| Inconsistent decision quality | Applies standardized evaluation criteria every time |
| No record of why decisions were made | Full audit trail with reasoning and confidence scores |
| Risk blindness | Built-in risk assessment for every recommendation |

---

## ✨ Key Features

### 1. **Smart Decision Analysis**
When you ask a business question like *"Should we expand into the European market?"*, the agent:
- Generates multiple strategic options
- Evaluates each option against weighted criteria
- Assesses risks and potential downsides
- Recommends the best course of action with a confidence score

### 2. **Multiple AI Providers**
The system can use different AI engines, automatically switching between them if one fails:

| Provider | Description | Best For |
|----------|-------------|----------|
| **Groq** | Fast, free, high-quality | General use (recommended) |
| **OpenRouter** | Access to 100+ models | Specialized tasks |
| **Auto Mode** | Automatically picks the best | Hands-off operation |

### 3. **Document Knowledge (RAG)**
Upload your company documents (strategy docs, policies, market research) and the agent will:
- Reference them when answering questions
- Provide context-aware recommendations
- Cite sources for transparency

### 4. **Human-in-the-Loop Approvals**
For high-risk or low-confidence decisions:
- Requires human review before proceeding
- Shows clear reasoning for the recommendation
- Allows approve/reject with notes

### 5. **OKR Management**
Create and track Objectives and Key Results:
- Set company objectives
- Define measurable key results
- Track progress over time

### 6. **Decision Timeline**
View all past decisions:
- Filter by date, outcome, or keyword
- See the reasoning behind each decision
- Learn from historical patterns

### 7. **Vision Management**
Define and track your company's strategic vision:
- Generate vision statements
- Validate alignment with decisions
- Track vision evolution over time

---

## 🖥️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CEO AGENT SYSTEM                        │
├──────────────────────┬──────────────────────────────────────┤
│     FRONTEND          │           BACKEND                   │
│  (What you see)       │      (Processing engine)            │
├──────────────────────┼──────────────────────────────────────┤
│ • Dashboard           │ • Decision Lifecycle                │
│ • Analysis Interface  │ • AI Providers (Groq, OpenRouter)   │
│ • Document Manager    │ • RAG Knowledge Engine              │
│ • Settings Panel      │ • Risk Assessment                   │
│ • OKR Dashboard       │ • Memory System                     │
│ • Decision Timeline   │ • Safety Guards                     │
│ • Vision Editor       │ • Audit & Approval System           │
└──────────────────────┴──────────────────────────────────────┘
                              │
                     ┌────────┴────────┐
                     │   DATABASE      │
                     │   (MongoDB)     │
                     │ • Documents     │
                     │ • Decisions     │
                     │ • Settings      │
                     │ • Audit Logs    │
                     └─────────────────┘
```

---

## 🛠️ Technology Stack

### For Non-Technical Readers
- **Frontend (User Interface):** Modern web application that works in any browser
- **Backend (Processing):** Server that handles AI processing and data storage
- **Database:** Stores all documents, decisions, and settings permanently
- **AI Providers:** External services that power the intelligent analysis

### Technical Details

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js 14 (React) | Modern, responsive user interface |
| Styling | Tailwind CSS | Premium dark theme with animations |
| Backend | Node.js + Express | API server and business logic |
| Database | MongoDB | Document storage and persistence |
| AI Router | Custom LLM Router | Manages multiple AI providers |
| State Management | Zustand | Frontend state handling |
| Language | TypeScript/JavaScript | Type-safe code |

---

## 📱 User Interface Features

### 1. **Analysis Tab**
- Enter strategic questions in natural language
- Set constraints (budget, timeline)
- View AI-generated recommendations with confidence scores
- See pros, cons, and risk levels for each option

### 2. **Documents Tab**
- Upload company documents (PDF, Markdown, Text)
- Documents are automatically indexed for search
- See document count and ingestion status
- Delete documents when no longer needed

### 3. **Settings Panel**
- Choose preferred AI provider
- **Auto (Recommended):** System picks the best available
- **Groq:** Fast, reliable, free tier available
- **OpenRouter:** Access to many different models

### 4. **Approvals Tab**
- View decisions pending human approval
- Approve or reject with notes
- See full reasoning for each request

### 5. **Dashboard**
- OKR progress tracking
- Decision history overview
- System health status

---

## 🔄 How It Works (The Decision Process)

When you ask CEO Agent a question, it follows a 5-stage "thinking" process:

### Stage 1: PERCEIVE (Understanding)
- Reads your question
- Retrieves relevant documents from your knowledge base
- Loads context from past similar decisions

### Stage 2: THINK (Option Generation)
- Uses AI to generate 3-5 strategic options
- Each option includes description, costs, timeline, and risk level

### Stage 3: PLAN (Evaluation)
- Scores each option against weighted criteria:
  - Cost Efficiency (25%)
  - Risk Alignment (20%)
  - Strategic Fit (20%)
  - Time to Value (15%)
  - Market Opportunity (10%)
  - Resource Availability (10%)
- Ranks options by overall score

### Stage 4: PROPOSE (Recommendation)
- Formats the top recommendation
- Lists alternatives with trade-offs
- Shows risk assessment
- Calculates confidence level

### Stage 5: REFLECT (Learning)
- Stores decision in memory for future reference
- Logs all actions for audit trail
- Requests human approval if needed

---

## 🔐 Safety & Compliance Features

### Audit Trail
Every decision includes:
- Who asked the question
- What options were considered
- Why the recommendation was made
- When the analysis was performed
- What AI provider was used

### Human Oversight
Automatic human approval required when:
- Confidence is below 70%
- Risk level is high
- Budget exceeds thresholds
- Policy violations detected

### Ethical Red Lines
System automatically blocks recommendations that involve:
- Illegal activities
- Harm to employees
- Environmental destruction

---

## 📊 Recent Updates (February 2026)

### ✅ Completed Features
1. **Dynamic LLM Provider Selection**
   - Users can now choose which AI provider to use
   - "Auto" mode intelligently picks the best available
   - Shows which provider was actually used in each analysis

2. **MongoDB Integration**
   - Documents now persist permanently in database
   - Settings are saved across sessions
   - Reliable document count tracking

3. **Document Count Synchronization**
   - Real-time document count updates
   - Optimistic UI updates for better responsiveness

4. **Confirmation Modals**
   - Professional themed modals for delete actions
   - Prevents accidental data loss

5. **Groq Integration**
   - Added support for Groq's fast Llama 3.3 70B model
   - Free tier available for testing

---

## 🚀 Getting Started

### For Team Members (Non-Technical)

1. **Open the application** in your web browser
2. **Upload relevant documents** in the Documents tab
3. **Select your preferred AI provider** in Settings
4. **Ask a strategic question** in the Analysis tab
5. **Review the recommendation** and supporting analysis

### For Developers

```bash
# Start the backend
cd ceo-agent
npm install
npm run dev

# Start the frontend (in another terminal)
cd frontend
npm install
npm run dev
```

---

## 📋 Use Cases

| Scenario | Example Query |
|----------|---------------|
| Market Expansion | "Should we expand into the European market next quarter?" |
| Investment Decisions | "Should we acquire this startup for $5M?" |
| Resource Allocation | "Where should we focus our Q2 engineering resources?" |
| Risk Assessment | "What are the risks of entering the healthcare sector?" |
| Strategy Planning | "How should we respond to this new competitor?" |

---

## 👥 Team Roles

| Role | Interaction with CEO Agent |
|------|---------------------------|
| **Executives** | Ask strategic questions, review recommendations |
| **Analysts** | Upload documents, review detailed analyses |
| **Administrators** | Approve/reject pending decisions |
| **Developers** | Maintain and extend the system |

---

## 📞 Support & Questions

For questions about:
- **Using the system:** Contact the development team
- **Technical issues:** Check the logs or escalate to developers
- **Feature requests:** Submit through the standard process

---

## 📎 Appendix: Glossary

| Term | Definition |
|------|------------|
| **RAG** | Retrieval-Augmented Generation – using your documents to enhance AI responses |
| **LLM** | Large Language Model – the AI that generates text and analysis |
| **OKR** | Objectives and Key Results – a goal-setting framework |
| **Confidence Score** | How certain the AI is about its recommendation (0-100%) |
| **Risk Level** | Assessment of potential downsides (low/medium/high) |
| **Human-in-the-Loop** | Requiring human approval for important decisions |

---

*This document is intended for internal team use. For technical implementation details, refer to the project README and code documentation.*
