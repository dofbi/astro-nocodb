import { toString, generateSlug } from '../utils';

export const sampleMapper = (raw: any) => ({
  Id: toString(raw.Id),
  Album: raw.Album,
  Thumbnail: raw.Thumbnail ? raw.Thumbnail.map((att: any) => ({
    ...att,
    url: att.signedUrl || att.url
  })) : [],
  Platform: raw.Platform,
  Budget: raw.Budget
});
