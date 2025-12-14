# astro-nocodb

An Astro content loader integration for NocoDB that enables you to use your NocoDB database as a content source for Astro projects.

## Features

- 🚀 **Content Layer Integration** - Native Astro Content Collections API support
- 📦 **Type-Safe** - Full TypeScript support with Zod schema validation
- 🔄 **Automatic Data Fetching** - Build-time data fetching from NocoDB
- ⚙️ **Flexible Configuration** - Per-table customization with schemas and mappers
- 🔁 **Retry Logic** - Built-in rate limiting handling with exponential backoff
- 🎯 **Field Selection** - Select specific fields to minimize payload size
- 🔧 **Data Mapping** - Custom transformation functions for data normalization

## Installation

```bash
npm install astro-nocodb
# or
pnpm add astro-nocodb
```

## Quick Start

### 1. Set up environment variables

```env
NOCODB_BASE_URL=https://your-nocodb-instance.com
NOCODB_API_KEY=your-api-key
```

### 2. Create a content collection configuration

**src/content/config.ts**
```typescript
import { nocodbCollections } from 'astro-nocodb/loaders';
import { z } from 'astro/zod';

const articlesSchema = z.object({
  Id: z.string(),
  title: z.string(),
  content: z.string(),
  slug: z.string(),
});

const collections = nocodbCollections({
  baseUrl: import.meta.env.NOCODB_BASE_URL,
  apiKey: import.meta.env.NOCODB_API_KEY,
  tables: {
    articles: {
      tableId: 'your-table-id',
      schema: articlesSchema,
      fields: ['Id', 'title', 'content', 'slug'],
      mapper: (raw) => ({
        ...raw,
        slug: raw.slug || raw.title.toLowerCase().replace(/\s+/g, '-'),
      }),
    },
  },
});

export { collections };
```

### 3. Multiple content sources

**src/content/config.ts**
```typescript
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { nocodbCollections } from 'astro-nocodb/loaders';
import { articlesConfig } from './collections/articles/config';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    heroImage: image().optional(),
  }),
});

const data = nocodbCollections({
  baseUrl: import.meta.env.NOCODB_BASE_URL,
  apiKey: import.meta.env.NOCODB_API_KEY,
  tables: {
    articles: articlesConfig,
    // Add more remote collections…
  },
});

export const collections = {
  blog,        // local Markdown content
  ...data,   // remote NocoDB content
};

```

### 4. Use your content

```astro
---
import { getCollection } from 'astro:content';

const articles = await getCollection('articles');
---

<ul>
  {articles.map((article) => (
    <li>
      <a href={`/articles/${article.data.slug}`}>
        {article.data.title}
      </a>
    </li>
  ))}
</ul>
```

## Configuration Options

### `baseUrl`
- **Type**: `string` (required)
- **Description**: Your NocoDB instance URL

### `apiKey`
- **Type**: `string` (required)
- **Description**: NocoDB API key for authentication

### `tables`
- **Type**: `Record<string, TableConfig>`
- **Description**: Configuration for each NocoDB table

#### TableConfig Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `tableId` | `string` | Yes | NocoDB table identifier |
| `schema` | `ZodObject` | Yes | Zod schema for type validation |
| `fields` | `string[]` | No | Specific fields to fetch (defaults to all) |
| `queryParams` | `Record<string, any>` | No | NocoDB API query parameters (where, sort, etc.) |
| `mapper` | `(raw: any) => any` | No | Custom function to transform raw data |
| `bodyField` | `string` | No | Field name to treat as markdown/HTML body |
| `retries` | `number` | No | Number of retry attempts on rate limit (default: 10) |
| `delay` | `number` | No | Initial delay in ms for retry backoff (default: 2000) |

## Examples

### With data mapping

```typescript
const paysConfig = {
  tableId: 'table123',
  schema: paysSchema,
  mapper: (raw) => ({
    id: raw.Id,
    name: raw.nom_pays,
    code: raw.code,
    slug: raw.nom_pays.toLowerCase().replace(/\s+/g, '-'),
  }),
  fields: ['Id', 'nom_pays', 'code'],
};
```

### With filtering and sorting

```typescript
const articlesConfig = {
  tableId: 'table456',
  schema: articlesSchema,
  queryParams: {
    where: '(status,eq,published)~and(publishedAt,gte,2024-01-01)',
    sort: '-publishedAt',
  },
};
```

### Organizing collections

For better maintainability, organize your collections:

```
src/content/
├── collections/
│   ├── articles/
│   │   ├── schema.ts
│   │   ├── mapper.ts
│   │   └── config.ts
│   └── authors/
│       ├── schema.ts
│       ├── mapper.ts
│       └── config.ts
└── config.ts
```

## Changelog

See [CHANGELOG.md](../../CHANGELOG.md) for detailed version history.

## License

MIT © 2024 Mamadou Diagne
