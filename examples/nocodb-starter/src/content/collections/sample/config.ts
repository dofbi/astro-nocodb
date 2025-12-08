import { sampleSchema } from './schema';
import { sampleMapper } from './mapper';

export const sampleConfig = {
  tableId: 'mf3j1dklbw5cvsb',
  schema: sampleSchema,
  queryParams: { 
    where: '(Platform,eq,Instagram)~and(Album,notnull)', 
    sort: 'Budget' 
  },
  fields: ['Id', 'Album', 'Thumbnail','Platform', 'Budget'],
  mapper: sampleMapper,
  retries: 5,
  delay: 1000,
};
