export type MockupProductId = 'phone' | 'laptop' | 'bottle' | 'sheet';

export interface PlacementBounds {
  /** Normalized 0..1 left offset within the surface component */
  left: number;
  /** Normalized 0..1 top offset within the surface component */
  top: number;
  /** Normalized 0..1 width of usable area */
  width: number;
  /** Normalized 0..1 height of usable area */
  height: number;
}

export interface MockupVariant {
  id: string;
  name: string;
  sizeLabel: string;
  dimensionNote: string;
  /** Canvas aspect ratio: width / height */
  aspectRatio: number;
  /** Approximate relative physical scale factor (1 = standard baseline) */
  physicalScaleFactor: number;
  /** Usable placement region inside the surface */
  bounds: PlacementBounds;
  /** Brand grouping for filters (e.g. 'Apple', 'Samsung', 'Huawei', 'Xiaomi', 'Tecno', 'Infinix', 'Google') */
  brand?: string;
  /** Screen diagonal size in inches (if applicable) */
  screenInches?: number;
  /** Exact physical height in mm */
  heightMm?: number;
  /** Exact physical width in mm */
  widthMm?: number;
  /** Optional form factor or category */
  formFactor?: 'candybar' | 'foldable' | 'flip' | 'laptop' | 'sheet';
}

export interface MockupColor {
  id: string;
  name: string;
  /** Swatch display color */
  hex: string;
  /** Primary background color for the physical object */
  bodyHex: string;
  /** Secondary/accent color (bezels, edges, details) */
  accentHex: string;
  /** Subtle border/stroke color */
  borderHex: string;
  /** Text/monogram indicator color (e.g. white or dark) */
  contrastTone: 'light' | 'dark';
}

export interface MockupProductDefinition {
  id: MockupProductId;
  name: string;
  categoryLabel: string;
  variants: MockupVariant[];
  colors: MockupColor[];
  defaultVariantId: string;
  defaultColorId: string;
  /** Default sticker scale relative to usable area (0.1 to 1.0) */
  defaultStickerScale: number;
  minScale: number;
  maxScale: number;
}

export interface StickerTransform {
  /** Center X position normalized 0..1 relative to usable placement bounds */
  x: number;
  /** Center Y position normalized 0..1 relative to usable placement bounds */
  y: number;
  /** Scale factor where 1.0 is default size relative to surface */
  scale: number;
  /** Rotation in degrees (-180 to 180 or free continuous) */
  rotation: number;
}

export interface PlacedSticker {
  instanceId: string;
  stickerId: number | string;
  title: string;
  imageUrl: string;
  transform: StickerTransform;
}

