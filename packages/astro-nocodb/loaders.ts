import { AstroError } from 'astro/errors';
import type { DataStore, Loader } from 'astro/loaders';
import { defineCollection } from 'astro:content';
import type { z } from 'astro/zod';
import axios from 'axios';

type MapperFunction = (rawData: any) => any;

type NocoDBConfig = {
  baseUrl: string;
  apiKey: string;
  tables: Record<string, {
    tableId: string;
    schema: z.ZodObject<any>;
    queryParams?: Record<string, any>;
    bodyField?: string;
    fields?: string[]; // Flexible field selection
    mapper?: MapperFunction; // Custom data mapper
    retries?: number; // For rate limiting retry
    delay?: number; // Initial delay for retry
  }>;
};

export function nocodbCollections(config: NocoDBConfig) {
  const { baseUrl, apiKey, tables } = config;
  if (!baseUrl || !apiKey) {
    throw new AstroError('Missing baseUrl or apiKey in NocoDB config.');
  }
  const collections: Record<string, ReturnType<typeof defineCollection>> = {};

  for (const [name, { tableId, schema, queryParams = {}, bodyField = 'content', fields = [], mapper, retries = 10, delay = 2000 }] of Object.entries(tables)) {
    const apiUrl = new URL(`${baseUrl}/api/v2/tables/${tableId}/records`);
    collections[name] = defineCollection({
      schema,
      loader: makeLoader({ name: `nocodb-${name}`, url: apiUrl, apiKey, queryParams, bodyField, fields, mapper, retries, delay }),
    });
  }

  return collections;
}

function makeLoader({
  name,
  url,
  apiKey,
  queryParams,
  bodyField,
  fields,
  mapper,
  retries,
  delay
}: {
  name: string;
  url: URL;
  apiKey: string;
  queryParams: Record<string, any>;
  bodyField: string;
  fields: string[];
  mapper?: MapperFunction;
  retries: number;
  delay: number;
}): Loader {
  const loader: Loader = {
    name,
    async load({ store, parseData }) {
      const items = await fetchAll(url, apiKey, queryParams, fields, 0, [], retries, delay);
      for (const rawItem of items) {
        const mappedItem = mapper ? mapper(rawItem) : rawItem;
        const id = String(mappedItem.Id || mappedItem.id || 'unknown');
        const parsed = await parseData({ id, data: mappedItem });
        const storeEntry: Parameters<DataStore['set']>[0] = { id, data: parsed };
        if (parsed[bodyField]) {
          storeEntry.body = parsed[bodyField];
          delete parsed[bodyField]; // Remove from data to treat as content body
        }
        store.set(storeEntry);
      }
    },
  };
  return loader;
}

async function fetchAll(
  url: URL,
  apiKey: string,
  queryParams: Record<string, any>,
  fields: string[],
  offset = 0,
  results: any[] = [],
  retries: number,
  delay: number
): Promise<any[]> {
  const fetchUrl = new URL(url);
  const params = { ...queryParams, offset, limit: queryParams.limit || 100 };
  if (fields.length > 0) {
    params.fields = fields.join(',');
  }
  for (const [key, value] of Object.entries(params)) {
    fetchUrl.searchParams.set(key, String(value));
  }

  try {
    const response = await axios.get(fetchUrl.toString(), {
      headers: {
        'xc-token': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 429) {
      if (retries > 0) {
        console.log(`Rate limited (429), waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchAll(url, apiKey, queryParams, fields, offset, results, retries - 1, delay * 2);
      } else {
        throw new Error('Exceeded retry limit for 429 error');
      }
    }

    const data = response.data;
    const list = data.list || [];
    results.push(...list);

    const pageInfo = data.pageInfo || {};
    if (!pageInfo.isLastPage) {
      return fetchAll(url, apiKey, queryParams, fields, offset + (queryParams.limit || 100), results, retries, delay);
    }

    return results;
  } catch (error: any) {
    if (error.response && error.response.status === 429) {
      if (retries > 0) {
        console.log(`Rate limited (429), waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchAll(url, apiKey, queryParams, fields, offset, results, retries - 1, delay * 2);
      } else {
        console.error('Exceeded retry limit for 429 error');
        return results;
      }
    } else {
      console.error(`Error fetching NocoDB records:`, error);
      return results;
    }
  }
}