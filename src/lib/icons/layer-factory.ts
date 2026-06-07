import type sharp from 'sharp';
import type { Vehicle } from '~/types.js';

export type LayerMeta = {
  width: number;
  height: number;
  left: number;
  top: number;
  text?: string | number;
};

export type LayerRenderResult = sharp.OverlayOptions & { meta: LayerMeta };

export type LayerFactory = (box: { width: number; height: number }, prev: LayerRenderResult | null, vehicle: Vehicle) => Promise<LayerRenderResult | null>;
