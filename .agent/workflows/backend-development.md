---
description: Backend development patterns and best practices for CEO Agent
---

# Backend Development Workflow

## Module Structure

Each backend module follows a consistent pattern:

```
src/
├── module-name/
│   ├── index.js         # Factory function and exports
│   ├── ModuleName.js    # Main class implementation
│   └── helpers/         # Optional helper functions
```

## Creating a New Module

// turbo-all

1. Create the module directory and main class file:
```bash
mkdir src/new-module
touch src/new-module/NewModule.js
```

2. Implement the class following this pattern:
```javascript
/**
 * Module description
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';

export class NewModule {
    /**
     * @param {Object} options
     * @param {string} options.storageDir - Directory for data storage
     */
    constructor(options = {}) {
        this.storageDir = options.storageDir ?? './data/new-module';
        this._ensureDir(this.storageDir);
        
        this.log = logger.child({ component: 'NewModule' });
        this.log.info('NewModule initialized');
    }

    // Public methods...

    // Private helper methods prefixed with _
    _ensureDir(dir) {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
    }
}

/**
 * Factory function
 * @param {Object} options
 * @returns {NewModule}
 */
export function createNewModule(options = {}) {
    return new NewModule(options);
}

export default NewModule;
```

3. Create the index.js export file:
```javascript
export { NewModule, createNewModule } from './NewModule.js';
```

4. Register the module in `server.js`:
   - Import the factory function
   - Initialize in `initializeAgent()`
   - Add any API routes in `handleRequest()`

## Adding API Endpoints

1. Create handler function following existing patterns:
```javascript
async function handleNewEndpoint(req, res) {
    const body = await getBody(req);
    const data = parseJSON(body);

    if (!data || !data.requiredField) {
        return sendJSON(res, 400, {
            success: false,
            error: 'Missing required fields: requiredField'
        });
    }

    try {
        const result = await newModule.doSomething(data);
        sendJSON(res, 200, { success: true, data: result });
    } catch (error) {
        sendJSON(res, 500, { success: false, error: error.message });
    }
}
```

2. Add route matching in `handleRequest()`:
```javascript
// POST /api/new-module/action
if (method === 'POST' && url.split('?')[0] === '/api/new-module/action') {
    return await handleNewEndpoint(req, res);
}
```

3. Add endpoint documentation in server startup console output

## Error Handling

- Log errors with context using the logger
- Return consistent JSON error responses
- Use appropriate HTTP status codes:
  - 400: Bad Request (validation errors)
  - 404: Not Found
  - 500: Internal Server Error

## Testing

Currently, manual testing via curl is the primary method:

```bash
# Test a POST endpoint
curl -X POST http://localhost:3001/api/new-module/action \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'

# Test a GET endpoint
curl http://localhost:3001/api/new-module/list
```
