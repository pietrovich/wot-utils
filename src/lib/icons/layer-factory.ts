import type sharp from 'sharp';
import type { Vehicle } from '~/types.js';

export type LayerFactory = (box: { width: number; height: number }, prev: sharp.OverlayOptions | null, vehicle: Vehicle) => Promise<sharp.OverlayOptions | null>;
