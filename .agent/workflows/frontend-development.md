---
description: Frontend development patterns for the CEO Agent Next.js application
---

# Frontend Development Workflow

## Project Structure

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/
│   │   ├── ui/             # Shadcn/UI base components
│   │   ├── analysis/       # Analysis-related components
│   │   ├── feedback/       # Feedback components
│   │   ├── okr/            # OKR components
│   │   ├── vision/         # Vision components
│   │   └── timeline/       # Timeline components
│   ├── lib/                # Utilities and API client
│   ├── stores/             # Zustand state stores
│   └── types/              # TypeScript type definitions
```

## Creating a New Component

// turbo-all

1. Create the component file:
```bash
mkdir -p frontend/src/components/feature-name
touch frontend/src/components/feature-name/component-name.tsx
```

2. Use this template:
```tsx
'use client';

/**
 * Component description
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ComponentNameProps {
  requiredProp: string;
  optionalProp?: number;
  onAction?: () => void;
}

export function ComponentName({ 
  requiredProp, 
  optionalProp = 0,
  onAction 
}: ComponentNameProps) {
  const [state, setState] = useState<string>('');

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">{requiredProp}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Component content */}
      </CardContent>
    </Card>
  );
}
```

3. Create an index.ts export file:
```typescript
export { ComponentName } from './component-name';
```

## Adding API Client Functions

1. Add types to `types/api.ts`:
```typescript
export interface NewRequest {
    field: string;
    optionalField?: number;
}

export interface NewResponse {
    id: string;
    result: string;
}
```

2. Add function to `lib/api.ts`:
```typescript
import type { NewRequest, NewResponse } from '@/types/api';

export async function newApiFunction(request: NewRequest): Promise<NewResponse> {
    const response = await apiClient.post<ApiResponse<NewResponse>>(
        '/api/endpoint',
        request
    );
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Operation failed');
    }
    return response.data.data;
}
```

3. Add to the api export object at the bottom of the file

## State Management with Zustand

Create stores in `stores/` directory:

```typescript
import { create } from 'zustand';

interface FeatureState {
  items: Item[];
  isLoading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
}

export const useFeatureStore = create<FeatureState>((set) => ({
  items: [],
  isLoading: false,
  error: null,
  fetchItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.getItems();
      set({ items: data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
}));
```

## UI Component Library

We use Shadcn/UI components. Available components:
- Button, Input, Textarea
- Card, CardContent, CardHeader, CardTitle, CardDescription
- Badge
- Dialog, AlertDialog
- Tabs, TabsList, TabsTrigger, TabsContent
- Progress

## Styling Guidelines

- Use Tailwind CSS classes
- Dark theme is default (`bg-slate-900`, `text-white`, `border-slate-700`)
- Use gradient buttons for primary actions:
  ```tsx
  className="bg-gradient-to-r from-blue-600 to-purple-600"
  ```
- Use consistent spacing: `space-y-4` for vertical gaps, `gap-2` for flex items

## Running Development

```bash
cd frontend
npm run dev
```

The frontend runs on http://localhost:3000 and connects to the backend at http://localhost:3001.
