// Utility functions for data mapping
export const toNumber = (v: any, fallback = 0) => 
  Number.isFinite(Number(v)) ? Number(v) : fallback;

export const toString = (v: any, fallback = '') => 
  v == null ? fallback : String(v);

export const generateSlug = (text: string) => 
  text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
