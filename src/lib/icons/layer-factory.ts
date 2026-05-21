import type sharp from 'sharp';
import type { Vehicle } from '~/types.js';

export type LayerFactory = (w: number, h: number, vehicle: Vehicle) => Promise<sharp.OverlayOptions | null>;
