---
description: API design and implementation guidelines for CEO Agent REST endpoints
---

# API Development Workflow

## API Design Principles

1. **Consistent Response Format**
   All endpoints return:
   ```json
   {
     "success": true|false,
     "data": { ... },      // on success
     "error": "message"    // on failure
   }
   ```

2. **RESTful Conventions**
   - `GET` for retrieving data
   - `POST` for creating or actions
   - `PUT` for updates
   - `DELETE` for removal

3. **Route Structure**
   - Base: `/api/{resource}`
   - CRUD: `/api/{resource}/:id`
   - Actions: `/api/{resource}/:id/{action}`
   - Queries: `/api/{resource}?filter=value`

## Adding a New API Endpoint

// turbo-all

### Step 1: Define the Handler Function

Add after existing handlers in `server.js`:

```javascript
// POST /api/{resource}/{action} - Action description
async function handleAction(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body);

    // Validate required fields
    if (!data || !data.requiredField) {
        return sendJSON(res, 400, {
            success: false,
            error: 'Missing required field: requiredField'
        });
    }

    try {
        // Call the appropriate module method
        const result = await module.performAction({
            field: data.requiredField,
            optional: data.optionalField ?? 'default',
        });

        // Return success response
        sendJSON(res, 201, { success: true, data: result });
    } catch (error) {
        logger.error('Action failed', { error: error.message });
        sendJSON(res, 400, { success: false, error: error.message });
    }
}
```

### Step 2: Add Route Matching

In the `handleRequest` function, add route matching:

```javascript
// Specific routes first (before generic :id routes)
if (method === 'GET' && url.split('?')[0] === '/api/resource/stats') {
    return await handleGetStats(req, res);
}

// Routes with parameters
if (method === 'GET' && urlParts[0] === 'api' && urlParts[1] === 'resource' &&
    urlParts[2] && !urlParts[3]) {
    return await handleGetResource(req, res, urlParts[2]);
}
```

**Important**: Order specific routes before generic ones!

### Step 3: Add Console Documentation

Add endpoint to the server startup output:

```javascript
console.log('\n📌 New Feature Endpoints:');
console.log('  POST /api/resource        - Create resource');
console.log('  GET  /api/resource        - List resources');
console.log('  GET  /api/resource/:id    - Get resource');
console.log('  PUT  /api/resource/:id    - Update resource');
console.log('  DELETE /api/resource/:id  - Delete resource');
```

### Step 4: Add Frontend Types

In `frontend/src/types/api.ts`:

```typescript
export interface CreateResourceRequest {
    name: string;
    description?: string;
}

export interface ResourceItem {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
}
```

### Step 5: Add Frontend API Functions

In `frontend/src/lib/api.ts`:

```typescript
export async function createResource(request: CreateResourceRequest): Promise<ResourceItem> {
    const response = await apiClient.post<ApiResponse<ResourceItem>>(
        '/api/resource',
        request
    );
    if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to create resource');
    }
    return response.data.data;
}

export async function getResources(): Promise<ResourceItem[]> {
    const response = await apiClient.get<ApiResponse<ResourceItem[]>>('/api/resource');
    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get resources');
    }
    return response.data.data || [];
}
```

## Testing Endpoints

### Manual Testing with curl

```bash
# Create
curl -X POST http://localhost:3001/api/resource \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", "description": "Test item"}'

# List
curl http://localhost:3001/api/resource

# Get by ID
curl http://localhost:3001/api/resource/resource_123

# Update
curl -X PUT http://localhost:3001/api/resource/resource_123 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'

# Delete
curl -X DELETE http://localhost:3001/api/resource/resource_123
```

## HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST that creates a resource |
| 400 | Bad Request | Invalid input, validation errors |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Error | Unexpected server errors |
