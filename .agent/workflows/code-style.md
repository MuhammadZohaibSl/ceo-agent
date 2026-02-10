---
description: General code style and formatting conventions for the CEO Agent project
---

# Code Style Guidelines

## JavaScript/Node.js Backend

### File Structure
- Use ES modules (`import`/`export`) consistently
- Place imports at the top of the file
- Order imports: Node.js built-ins → External packages → Local modules
- Use JSDoc comments for function documentation

### Naming Conventions
- **Files**: Use `PascalCase` for class files (e.g., `OptionGenerator.js`), `camelCase` for utilities
- **Classes**: Use `PascalCase` (e.g., `FeedbackCollector`)
- **Functions**: Use `camelCase` (e.g., `recordRating`)
- **Constants**: Use `UPPER_SNAKE_CASE` for true constants
- **Variables**: Use `camelCase`

### Code Patterns
- Use nullish coalescing (`??`) over logical OR (`||`) for defaults
- Prefer `const` over `let`; avoid `var`
- Use async/await over raw Promises
- Handle errors with try/catch blocks

### Example
```javascript
/**
 * Process a strategic query
 * @param {string} query - The query to process
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} The processed result
 */
async function processQuery(query, options = {}) {
    const timeout = options.timeout ?? 30000;
    
    try {
        const result = await agent.analyze(query);
        return { success: true, data: result };
    } catch (error) {
        logger.error('Query processing failed', { error: error.message });
        return { success: false, error: error.message };
    }
}
```

## TypeScript Frontend

### File Structure
- Use `.tsx` for React components, `.ts` for utilities/types
- Colocate component-specific types within the component file
- Export shared types from `@/types/api.ts`

### Naming Conventions
- **Components**: Use `PascalCase` for filenames and exports (e.g., `FeedbackPanel.tsx`)
- **Hooks**: Prefix with `use` (e.g., `useQueryStore`)
- **Types/Interfaces**: Use `PascalCase` with descriptive names

### React Patterns
- Mark client components with `'use client'` directive
- Use Zustand for global state management
- Prefer functional components with hooks
- Use destructuring for props

### Example
```tsx
'use client';

interface RatingPanelProps {
  contextId: string;
  onRatingSubmitted?: (rating: number) => void;
}

export function RatingPanel({ contextId, onRatingSubmitted }: RatingPanelProps) {
  const [rating, setRating] = useState<number>(0);
  
  // Component logic...
}
```
