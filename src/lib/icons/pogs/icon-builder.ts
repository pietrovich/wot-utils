import type { WGData } from '~/lib/WGData.js';
import type { ImageBaker } from '~/lib/icons/ImageBaker.js';

export interface IconBuilder {
  createBaker(app: WGData): ImageBaker;
}
