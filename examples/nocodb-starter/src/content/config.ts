import { nocodbCollections } from 'astro-nocodb/loaders';
import { sampleConfig } from './collections/sample/config';

// Récupération des variables d'environnement (variables système)
// @ts-ignore - process.env est disponible au build time dans Astro
const API_URL = import.meta.env.API_URL || process.env.API_URL;
// @ts-ignore - process.env est disponible au build time dans Astro
const API_TOKEN = import.meta.env.API_TOKEN || process.env.API_TOKEN;

const collections = nocodbCollections({
  baseUrl: API_URL,
  apiKey: API_TOKEN,
  tables: {
    sample: sampleConfig,
    // Add other collections here (ressources, elections, etc.)
  },
});

export { collections };
