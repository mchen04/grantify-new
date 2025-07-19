# Shared Utilities

This directory contains shared utilities, types, and constants used across the Grantify.ai application components (frontend, Supabase functions, and any future services).

## Overview

The `shared/` directory promotes code reuse and consistency by providing common functionality that can be imported by any part of the application.

## Structure

```
shared/
├── types/                    # TypeScript type definitions
│   ├── grant.ts             # Grant and filter types
│   ├── api.ts               # API request/response types
│   └── index.ts             # Type exports
├── constants/               # Application constants
│   ├── app.ts               # Core application constants
│   └── index.ts             # Constant exports
├── utils/                   # Helper functions
│   ├── inputValidator.ts    # Input validation utilities
│   ├── logger.ts            # Logging utilities
│   └── index.ts             # Utility exports
├── index.ts                 # Main barrel export
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## Core Components

### Types (`/types/`)

#### Grant Types (`grant.ts`)
Core data structures for the grant discovery platform:

```typescript
// Main grant interface
interface Grant {
  id: string;
  title: string;
  funding_organization_name: string;
  application_deadline: string | null;
  funding_amount_max: number | null;
  // ... additional fields
}

// Search and filtering
interface GrantFilter {
  searchTerm: string;
  fundingMin?: number;
  fundingMax?: number;
  // ... filter options
}

// User authentication
interface AuthenticatedUser {
  id: string;
  email: string;
  created_at?: string;
  // ... user fields
}
```

#### API Types (`api.ts`)
Request and response type definitions for consistent API communication.

### Constants (`/constants/`)

#### Application Constants (`app.ts`)
Core application constants shared across components:

```typescript
// Funding limits
export const MAX_FUNDING = 100000000; // $100M
export const MIN_DEADLINE_DAYS = -90; // 90 days back
export const MAX_DEADLINE_DAYS = 365;  // 1 year ahead

// Pagination
export const SEARCH_GRANTS_PER_PAGE = 6;
export const DASHBOARD_GRANTS_PER_PAGE = 10;

// Default filter values
export const DEFAULT_FILTER_VALUES = {
  searchTerm: '',
  sortBy: 'relevance',
  page: 1,
  limit: 20,
  // ... other defaults
};
```

### Utilities (`/utils/`)

#### Input Validator (`inputValidator.ts`)
Shared validation logic for forms and API inputs:

```typescript
export const validateInput = {
  email: (email: string) => boolean,
  fundingAmount: (amount: number) => boolean,
  // ... validation functions
};
```

#### Logger (`logger.ts`)
Consistent logging across all components:

```typescript
export const logger = {
  info: (message: string, data?: any) => void,
  error: (message: string, error?: Error) => void,
  // ... logging methods
};
```

## Usage

### Importing from Frontend

```typescript
// Import specific types
import { Grant, GrantFilter } from '@/shared/types/grant';

// Import constants
import { MAX_FUNDING, DEFAULT_FILTER_VALUES } from '@/shared/constants/app';

// Import utilities
import { validateInput, logger } from '@/shared/utils';

// Import everything from barrel
import { Grant, MAX_FUNDING, logger } from '@/shared';
```

### Importing from Supabase Functions

```typescript
// In Edge Functions (Deno runtime)
import { Grant, GrantFilter } from '../../../shared/types/grant.ts';
import { MAX_FUNDING } from '../../../shared/constants/app.ts';
```

### Importing from Backend (Legacy)

```typescript
// In Node.js backend utilities
import { Grant } from '@/shared/types/grant';
import { logger } from '@/shared/utils/logger';
```

## TypeScript Configuration

The shared directory has its own `tsconfig.json` optimized for:
- **Modern JavaScript**: ES2020 target
- **Module Resolution**: Bundler-compatible
- **Strict Mode**: Full TypeScript strictness
- **Declaration Generation**: For type exports

## Development Guidelines

### Adding New Types

1. **Create in appropriate category**:
   ```bash
   # For user-related types
   touch shared/types/user.ts
   
   # For API-related types  
   touch shared/types/api.ts
   ```

2. **Export from category index**:
   ```typescript
   // shared/types/index.ts
   export * from './grant';
   export * from './user';
   export * from './api';
   ```

3. **Export from main barrel**:
   ```typescript
   // shared/index.ts
   export type { Grant, User, ApiResponse } from './types';
   ```

### Adding New Constants

1. **Add to appropriate file**:
   ```typescript
   // shared/constants/app.ts
   export const NEW_CONSTANT = 'value';
   ```

2. **Export from barrel**:
   ```typescript
   // shared/index.ts
   export { NEW_CONSTANT } from './constants/app';
   ```

### Adding New Utilities

1. **Create utility function**:
   ```typescript
   // shared/utils/myUtil.ts
   export const myUtil = (input: string) => {
     // utility logic
     return result;
   };
   ```

2. **Export from utilities index**:
   ```typescript
   // shared/utils/index.ts
   export { myUtil } from './myUtil';
   ```

3. **Export from main barrel**:
   ```typescript
   // shared/index.ts
   export { myUtil } from './utils';
   ```

## Best Practices

### Type Definitions
- **Use descriptive names** for interfaces and types
- **Document complex types** with JSDoc comments
- **Keep types focused** - avoid overly broad interfaces
- **Use unions and generics** for flexibility

### Constants
- **Use UPPER_SNAKE_CASE** for constants
- **Group related constants** in objects when appropriate
- **Provide meaningful defaults** that work across environments
- **Document magic numbers** with comments

### Utilities
- **Keep functions pure** when possible (no side effects)
- **Use TypeScript generics** for reusable functions
- **Handle errors gracefully** with proper return types
- **Write self-documenting code** with clear parameter names

### Exports
- **Use barrel exports** for cleaner imports
- **Export types and values separately** when needed
- **Maintain consistent naming** across exports
- **Re-export from main index** for convenience

## Path Mapping

The shared directory is configured with TypeScript path mapping:

```json
// tsconfig.json paths
{
  "@/shared/*": ["../shared/*"],
  "@/shared": ["../shared"]
}
```

This allows clean imports:
```typescript
import { Grant } from '@/shared/types/grant';
import { MAX_FUNDING } from '@/shared/constants/app';
```

## Dependencies

The shared directory aims to be dependency-free to avoid coupling. If external dependencies are needed:

1. **Consider the impact** on all consuming projects
2. **Use peer dependencies** when possible
3. **Document requirements** clearly
4. **Keep dependencies minimal** and well-justified

## Versioning

Changes to shared utilities should follow semantic versioning principles:

- **Major**: Breaking changes to types or function signatures
- **Minor**: New types, constants, or utilities (backwards compatible)
- **Patch**: Bug fixes and improvements (backwards compatible)

## Testing

While this directory contains utility code, testing should happen in the consuming applications:

- **Frontend**: Test components that use shared types
- **Edge Functions**: Test functions that use shared utilities
- **Integration**: Test cross-component data flow

## License

Part of the Grantify.ai project - MIT License

---

**Purpose**: Shared code for consistent types and utilities
**Architecture**: Consumed by Frontend and Supabase Edge Functions
**Version**: 2.0.0