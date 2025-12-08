# Astro-NocoDB: Astro Content Loader for NocoDB

## Overview

Astro-NocoDB is an Astro loader package that integrates NocoDB data into Astro content collections. It allows you to fetch records from NocoDB tables using the v2 Data API and treat them as content entries in your Astro project. This is ideal for building content-driven sites (e.g., blogs, databases, or catalogs) backed by NocoDB.

Key features:
- **Flexible Schemas**: Define custom Zod schemas for each table to validate and type-check data.
- **Custom Mappers**: Transform raw API data (e.g., convert strings to numbers, generate slugs).
- **Query Customization**: Support for NocoDB query parameters like `where`, `sort`, `limit`, and field selection.
- **Attachment Handling**: Processes attachments (e.g., images) with support for signed URLs.
- **Rate Limiting Retry**: Built-in exponential backoff for handling 429 errors.
- **Relations**: Use Astro's `reference()` for cross-collection links.
- **Stateful and Performant**: Fetches all paginated results automatically.

**Prerequisites**:
- Astro v5.14.3 or higher.
- NocoDB instance with API access (xc-token).
- Basic knowledge of Zod for schemas and Astro content collections.

## Installation

1. Install the package via your package manager (in a monorepo or standalone project):

   ```bash
   pnpm add astro-nocodb
   # or npm install astro-nocodb
   # or yarn add astro-nocodb
   ```

2. Ensure `axios` is installed (peer dependency for API requests).

3. In your Astro project's `src/content/config.ts`, import and configure the loader.

**Note**: For monorepos, use workspace linking (e.g., `astro-nocodb: "workspace:*"` in examples).

## Configuration

Configure collections in `src/content/config.ts`. Use `nocodbCollections` to define multiple tables.

### Basic Setup

```ts
import { nocodbCollections } from 'astro-nocodb/loaders';
import { z } from 'astro/zod';

// Environment variables (recommended for security)
const API_URL = import.meta.env.API_URL || process.env.API_URL;
const API_TOKEN = import.meta.env.API_TOKEN || process.env.API_TOKEN;

// Example schema
const sampleSchema = z.object({
  Id: z.string().optional(),
  Album: z.string().optional(),
  Thumbnail: z.array(z.object({
    url: z.string(),
    signedUrl: z.string().optional(), // For temporary access
    title: z.string().optional(),
    mimetype: z.string().optional(),
  })).optional(),
  Platform: z.string().optional(),
  Budget: z.number().optional()
});

// Example mapper
const sampleMapper = (raw: any) => ({
  Id: String(raw.Id ?? ''),
  Album: raw.Album ?? '',
  Thumbnail: raw.Thumbnail ? raw.Thumbnail.map((att: any) => ({
    ...att,
    url: att.signedUrl || att.url // Prefer signedUrl for access
  })) : [],
  Platform: raw.Platform ?? '',
  Budget: Number(raw.Budget ?? 0)
});

const collections = nocodbCollections({
  baseUrl: API_URL,
  apiKey: API_TOKEN,
  tables: {
    sample: {
      tableId: 'mf3j1dklbw5cvsb', // Your NocoDB table ID
      schema: sampleSchema,
      queryParams: { 
        where: '(Platform,eq,Instagram)~and(Album,notnull)', 
        sort: 'Budget' 
      },
      fields: ['Id', 'Album', 'Thumbnail', 'Platform', 'Budget'], // Optional: reduce payload
      mapper: sampleMapper, // Optional: data transformation
      bodyField: 'Album', // Optional: field for content body (treat as Markdown/text)
      retries: 5, // Optional: max retries for 429 errors
      delay: 1000 // Optional: initial retry delay (ms)
    },
    // Add more tables...
  },
});

export { collections };
```

- **baseUrl**: Your NocoDB instance URL (e.g., `https://app.nocodb.com`).
- **apiKey**: xc-token from NocoDB settings.
- **tables**: Object where keys are collection names, values are config objects.
  - `tableId`: Required NocoDB table ID.
  - `schema`: Required Zod schema for validation.
  - `queryParams`: Optional NocoDB filters (e.g., `where: '(field,eq,value)'`).
  - `fields`: Optional array of columns to fetch (reduces API response size).
  - `mapper`: Optional function to transform raw data (e.g., type conversions, slug generation).
  - `bodyField`: Optional field name for content body (extracted to `entry.body`).
  - `retries`/`delay`: Optional for rate limiting handling (exponential backoff).

### Environment Variables
Store sensitive info in `.env`:
```
API_URL=https://your-nocodb-instance.com
API_TOKEN=your-xc-token
```
Load via `import.meta.env` in Astro.

## Usage

### Querying Collections
In Astro pages/components:

```astro
---
import { getCollection } from 'astro:content';

const sampleEntries = await getCollection('sample');
---

<ul>
  {sampleEntries.map(entry => (
    <li>
      {entry.data.Album} (Platform: {entry.data.Platform})
      {entry.data.Thumbnail?.[0]?.url && <img src={entry.data.Thumbnail[0].url} alt="Thumbnail" />}
    </li>
  ))}
</ul>
```

- Access data via `entry.data` (validated frontmatter-like props).
- Use `entry.body` for the content field (e.g., render as Markdown with `<Markdown>{entry.body}</Markdown>` if using @astrojs/markdown).

### Handling Relations
Use `reference('other-collection')` in schemas for links:

```ts
const paysSchema = z.object({
  // ...
  ressources: z.array(reference('ressources')).optional(),
});
```

Query related entries dynamically in pages.

### Attachments and Images
- NocoDB attachments return arrays like `[{ url, signedUrl, title, mimetype, size }]`.
- Use `signedUrl` for temporary access (expires ~2-3 hours).
- In mappers, rewrite URLs if needed (e.g., to NocoDB proxy `/download/{path}`).
- Handle empty arrays safely in templates.

### Advanced Cases
- **Pagination in Queries**: Loader auto-fetches all pages; set `limit` in `queryParams` for manual control.
- **Custom Transformations**: Use mappers for complex logic (e.g., date parsing, array flattening).
- **Error Handling**: Loader logs errors and continues with partial results. Customize in mappers.
- **Large Datasets**: Increase `retries`/`delay` for rate-limited APIs; fetch in batches.
- **Relations via Links**: For NocoDB linked records, use `listLinkedRecords` (not built-in; extend loader if needed).
- **Dynamic Config**: Load configs from separate files/modules (as in your revisited structure) for modularity.
- **Self-Hosted NocoDB**: Ensure API is exposed; test auth with xc-token.
- **No Internet in Builds**: All fetches happen at build time; ensure NocoDB is accessible.
- **Untreated Cases**:
  - **Empty Results**: If no records match `where`, collection returns empty array—handle in templates.
  - **Invalid Data**: Zod validation skips invalid entries with warnings; use `safeParse` in mappers for custom error handling.
  - **Multi-Table Joins**: Not directly supported; fetch separately and join in code.
  - **Updates/Writes**: Loader is read-only; for CRUD, extend with POST/PATCH (future feature).
  - **Authentication Issues**: If token expires, rebuild fails—use long-lived tokens.
  - **File Attachments**: For non-image files, use similar mapping; download via signed URLs.

## API Integration Notes
- **NocoDB v2 Data API**: Uses `/api/v2/tables/{tableId}/records` for listing.
  - Headers: `xc-token` for auth.
  - Params: `fields`, `where` (e.g., `(field,eq,value)~and(...)`), `sort` (e.g., `field asc`), `limit`, `offset`.
  - Pagination: Via `pageInfo.isLastPage`; loader handles automatically.
  - Attachments: Returns array with `url` (direct S3), `signedUrl` (temporary), `path`, etc.
- **Rate Limits**: Cloud plans may limit requests; retry logic mitigates 429 errors.
- **Docs Reference**: See [NocoDB API Docs](https://nocodb.com/apis/v2/data) for full params.
- **Security**: Keep API keys in env vars; avoid committing to Git.
- **Performance**: Select fields to minimize data; use `where` for filtering.

## Troubleshooting
- **Undefined '_parseAsync'**: Zod schema mismatch (e.g., invalid array types)—ensure schemas match API structure.
- **AccessDenied on URLs**: Use `signedUrl` in mappers; check bucket permissions.
- **429 Errors**: Increase `retries`/`delay`; reduce concurrent builds.
- **No Data**: Verify `tableId`, params, and API key; log raw responses in loader.
- **Build Fails**: Ensure env vars are set; test with `astro build`.
- **Debugging**: Add `console.log` in mappers/loaders; inspect `getCollection` output.

## Contributing
- Fork the repo on GitHub.
- Add features (e.g., write support, more API endpoints).
- Submit PRs with changesets for versioning.
- Issues: Report bugs or suggest enhancements.

For questions, open an issue on [GitHub](https://github.com/dofbi/astro-nocodb).

**License**: MIT. See LICENSE file for details.