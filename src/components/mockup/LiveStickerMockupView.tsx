import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Smartphone,
  Laptop,
  Flame,
  Grid3x3,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Trash2,
  Plus,
  Layers,
  Search,
  Check,
} from 'lucide-react';
import type {
  MockupProductDefinition,
  MockupProductId,
  StickerTransform,
  PlacedSticker,
} from './types';
import { MOCKUP_PRODUCTS } from './mockup-data';
import PhoneSurface from './surfaces/PhoneSurface';
import LaptopSurface from './surfaces/LaptopSurface';
import BottleSurface from './surfaces/BottleSurface';
import SheetSurface from './surfaces/SheetSurface';
import StickerTransformLayer from './StickerTransformLayer';
import type { Product } from '@/lib/queries';

export interface LiveStickerMockupViewProps {
  /** The active Realz sticker to preview */
  sticker: {
    id: number | string;
    title: string;
    image_url: string;
  };
  /** Optional list of all Realz stickers to allow switching directly in customizer */
  allStickers?: Product[];
  /** Callback when user picks a different sticker */
  onSelectSticker?: (sticker: Product) => void;
  /** Optional back/close action */
  onClose?: () => void;
  /** Whether to hide the internal header bar (used when embedded in product layout) */
  hideHeader?: boolean;
}

const PRODUCT_ICONS: Record<MockupProductId, React.ElementType> = {
  phone: Smartphone,
  laptop: Laptop,
  bottle: Flame,
  sheet: Grid3x3,
};

export default function LiveStickerMockupView({
  sticker,
  allStickers = [],
  onSelectSticker,
  onClose,
  hideHeader = false,
}: LiveStickerMockupViewProps) {
  // Selected product definition
  const [selectedProductId, setSelectedProductId] = useState<MockupProductId>('phone');
  const activeProduct = useMemo(
    () => MOCKUP_PRODUCTS.find((p) => p.id === selectedProductId) || MOCKUP_PRODUCTS[0],
    [selectedProductId],
  );

  // Selected variant ID (model/size)
  const [selectedVariantId, setSelectedVariantId] = useState<string>(activeProduct.defaultVariantId);
  const activeVariant = useMemo(() => {
    const found = activeProduct.variants.find((v) => v.id === selectedVariantId);
    return found || activeProduct.variants[0];
  }, [activeProduct, selectedVariantId]);

  // Selected color ID
  const [selectedColorId, setSelectedColorId] = useState<string>(activeProduct.defaultColorId);
  const activeColor = useMemo(() => {
    const found = activeProduct.colors.find((c) => c.id === selectedColorId);
    return found || activeProduct.colors[0];
  }, [activeProduct, selectedColorId]);

  // Placed stickers on the mockup surface
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([
    {
      instanceId: 'sticker-init',
      stickerId: sticker.id,
      title: sticker.title,
      imageUrl: sticker.image_url,
      transform: {
        x: 0.5,
        y: 0.5,
        scale: activeProduct.defaultStickerScale,
        rotation: 0,
      },
    },
  ]);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>('sticker-init');

  // Mode: 'switch' to replace active sticker, 'add' to place additional sticker
  const [stickerMode, setStickerMode] = useState<'switch' | 'add'>('switch');

  // Brand and Search filters for variants (Option 2)
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    activeProduct.variants.forEach((v) => {
      if (v.brand) brands.add(v.brand);
    });
    return Array.from(brands);
  }, [activeProduct]);

  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [variantSearch, setVariantSearch] = useState<string>('');

  // Reset brand and search when product category changes
  useEffect(() => {
    setSelectedBrand('All');
    setVariantSearch('');
  }, [selectedProductId]);

  const handleSelectBrand = (brand: string) => {
    setSelectedBrand(brand);
    if (brand !== 'All') {
      const firstOfBrand = activeProduct.variants.find((v) => v.brand === brand);
      if (firstOfBrand && activeVariant.brand !== brand) {
        setSelectedVariantId(firstOfBrand.id);
      }
    }
  };

  const filteredVariants = useMemo(() => {
    return activeProduct.variants.filter((v) => {
      if (selectedBrand !== 'All' && v.brand && v.brand !== selectedBrand) {
        return false;
      }
      if (variantSearch.trim()) {
        const q = variantSearch.toLowerCase();
        const matchName = v.name.toLowerCase().includes(q);
        const matchNote = v.dimensionNote.toLowerCase().includes(q);
        const matchSize = v.sizeLabel.toLowerCase().includes(q);
        const matchBrand = v.brand?.toLowerCase().includes(q);
        if (!matchName && !matchNote && !matchSize && !matchBrand) {
          return false;
        }
      }
      return true;
    });
  }, [activeProduct.variants, selectedBrand, variantSearch]);

  const surfaceContainerRef = useRef<HTMLDivElement>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);

  // Keep active placed sticker synced when parent sticker prop changes externally
  useEffect(() => {
    setPlacedStickers((prev) => {
      if (prev.length === 0) {
        const newId = `sticker-${Date.now()}`;
        setActiveInstanceId(newId);
        return [
          {
            instanceId: newId,
            stickerId: sticker.id,
            title: sticker.title,
            imageUrl: sticker.image_url,
            transform: {
              x: 0.5,
              y: 0.5,
              scale: activeProduct.defaultStickerScale,
              rotation: 0,
            },
          },
        ];
      }
      return prev.map((s) =>
        s.instanceId === activeInstanceId
          ? { ...s, stickerId: sticker.id, title: sticker.title, imageUrl: sticker.image_url }
          : s,
      );
    });
  }, [sticker.id, sticker.image_url, sticker.title]);

  // Drag over handler for canvas
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDragOverCanvas) setIsDragOverCanvas(true);
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOverCanvas(false);
  };

  // Drop sticker onto canvas handler
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCanvas(false);

    const surfaceEl = surfaceContainerRef.current;
    if (!surfaceEl) return;
    const rect = surfaceEl.getBoundingClientRect();

    const rawXPct = (e.clientX - rect.left) / rect.width;
    const rawYPct = (e.clientY - rect.top) / rect.height;

    const { bounds } = activeVariant;
    const placementX = (rawXPct - bounds.left) / bounds.width;
    const placementY = (rawYPct - bounds.top) / bounds.height;

    const clampedX = Math.max(0.18, Math.min(0.82, placementX));
    const clampedY = Math.max(0.18, Math.min(0.82, placementY));

    let droppedSticker = sticker;
    try {
      const rawPayload = e.dataTransfer.getData('application/realz-sticker');
      if (rawPayload) {
        const parsed = JSON.parse(rawPayload);
        if (parsed && parsed.id) {
          droppedSticker = parsed;
        }
      }
    } catch {
      // fallback
    }

    const newId = `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newPlacedSticker: PlacedSticker = {
      instanceId: newId,
      stickerId: droppedSticker.id,
      title: droppedSticker.title,
      imageUrl: droppedSticker.image_url,
      transform: {
        x: +clampedX.toFixed(4),
        y: +clampedY.toFixed(4),
        scale: activeProduct.defaultStickerScale,
        rotation: 0,
      },
    };

    setPlacedStickers((prev) => [...prev, newPlacedSticker]);
    setActiveInstanceId(newId);

    if (onSelectSticker) {
      onSelectSticker(droppedSticker as any);
    }
  };

  // Switch product helper
  const handleSelectProduct = (prodId: MockupProductId) => {
    const nextProd = MOCKUP_PRODUCTS.find((p) => p.id === prodId) || MOCKUP_PRODUCTS[0];
    setSelectedProductId(prodId);
    setSelectedVariantId(nextProd.defaultVariantId);
    setSelectedColorId(nextProd.defaultColorId);
  };

  // Reset transformation of active sticker
  const handleResetTransform = () => {
    if (!activeInstanceId) return;
    setPlacedStickers((prev) =>
      prev.map((s) =>
        s.instanceId === activeInstanceId
          ? {
              ...s,
              transform: {
                x: 0.5,
                y: 0.5,
                scale: activeProduct.defaultStickerScale,
                rotation: 0,
              },
            }
          : s,
      ),
    );
  };

  // Quick rotation adjustments
  const handleQuickRotate = (deltaDeg: number) => {
    if (!activeInstanceId) return;
    setPlacedStickers((prev) =>
      prev.map((s) =>
        s.instanceId === activeInstanceId
          ? {
              ...s,
              transform: {
                ...s.transform,
                rotation: ((s.transform.rotation + deltaDeg + 180) % 360) - 180,
              },
            }
          : s,
      ),
    );
  };

  // Remove sticker from mockup surface
  const handleRemoveSticker = (instanceIdToRemove: string) => {
    setPlacedStickers((prev) => {
      const remaining = prev.filter((s) => s.instanceId !== instanceIdToRemove);
      if (activeInstanceId === instanceIdToRemove) {
        const nextActive = remaining[remaining.length - 1] || null;
        setActiveInstanceId(nextActive ? nextActive.instanceId : null);
        if (nextActive && onSelectSticker) {
          const match = allStickers.find((st) => st.id === nextActive.stickerId);
          if (match) {
            onSelectSticker(match);
          } else {
            onSelectSticker({
              id: nextActive.stickerId,
              title: nextActive.title,
              image_url: nextActive.imageUrl,
            } as any);
          }
        }
      }
      return remaining;
    });
  };

  // Handle clicking sticker thumbnail: either 'switch' or 'add'
  const handleStickerClick = (s: Product) => {
    if (stickerMode === 'switch') {
      if (!activeInstanceId || placedStickers.length === 0) {
        const newId = `sticker-${Date.now()}`;
        setPlacedStickers([
          {
            instanceId: newId,
            stickerId: s.id,
            title: s.title,
            imageUrl: s.image_url || '',
            transform: {
              x: 0.5,
              y: 0.5,
              scale: activeProduct.defaultStickerScale,
              rotation: 0,
            },
          },
        ]);
        setActiveInstanceId(newId);
      } else {
        setPlacedStickers((prev) =>
          prev.map((item) =>
            item.instanceId === activeInstanceId
              ? { ...item, stickerId: s.id, title: s.title, imageUrl: s.image_url || '' }
              : item,
          ),
        );
      }
    } else {
      // 'add' mode: place a new sticker instance
      const newId = `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const offset = (placedStickers.length % 5) * 0.08 - 0.16;
      const newStickerItem: PlacedSticker = {
        instanceId: newId,
        stickerId: s.id,
        title: s.title,
        imageUrl: s.image_url || '',
        transform: {
          x: Math.max(0.2, Math.min(0.8, 0.5 + offset)),
          y: Math.max(0.2, Math.min(0.8, 0.5 + offset)),
          scale: activeProduct.defaultStickerScale,
          rotation: 0,
        },
      };
      setPlacedStickers((prev) => [...prev, newStickerItem]);
      setActiveInstanceId(newId);
    }

    // Always update parent/left column to the clicked sticker
    if (onSelectSticker) {
      onSelectSticker(s);
    }
  };

  // Handle selecting a sticker directly on the surface
  const handleSelectStickerFromSurface = (instanceId: string) => {
    setActiveInstanceId(instanceId);
    const found = placedStickers.find((s) => s.instanceId === instanceId);
    if (found && onSelectSticker) {
      const match = allStickers.find((st) => st.id === found.stickerId);
      if (match) {
        onSelectSticker(match);
      } else {
        onSelectSticker({
          id: found.stickerId,
          title: found.title,
          image_url: found.imageUrl,
        } as any);
      }
    }
  };

  // Handle transformation change on specific sticker instance
  const handleChangeTransform = (instanceId: string, next: StickerTransform) => {
    setPlacedStickers((prev) =>
      prev.map((s) => (s.instanceId === instanceId ? { ...s, transform: next } : s)),
    );
  };

  // Render surface with children layer
  const renderSurface = () => {
    const child = (
      <StickerTransformLayer
        product={activeProduct}
        variant={activeVariant}
        placedStickers={placedStickers}
        activeInstanceId={activeInstanceId}
        onSelectSticker={handleSelectStickerFromSurface}
        onChangeTransform={handleChangeTransform}
        onRemoveSticker={handleRemoveSticker}
      />
    );

    switch (activeProduct.id) {
      case 'phone':
        return <PhoneSurface variant={activeVariant} color={activeColor}>{child}</PhoneSurface>;
      case 'laptop':
        return <LaptopSurface variant={activeVariant} color={activeColor}>{child}</LaptopSurface>;
      case 'bottle':
        return <BottleSurface variant={activeVariant} color={activeColor}>{child}</BottleSurface>;
      case 'sheet':
        return <SheetSurface variant={activeVariant} color={activeColor}>{child}</SheetSurface>;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full flex flex-col min-h-[620px] max-h-[92vh] overflow-hidden bg-background text-foreground select-none">
      {/* 1. Header Toolbar (Optional, hidden when embedded in product page) */}
      {!hideHeader && (
        <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.08] bg-card/70 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-micro text-primary">Live Mockup</span>
                <span className="text-white/30 text-xs">•</span>
                <span className="text-xs font-bold text-muted-foreground truncate">{activeProduct.name}</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-foreground truncate">{sticker.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetTransform}
              disabled={!activeInstanceId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-xs font-bold text-foreground transition-all cursor-pointer disabled:opacity-30"
              title="Reset sticker position & rotation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-xs font-bold text-white transition-all cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Main Studio Body: Controls on left + Canvas in center + Stickers on right */}
      <div className="relative flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Controls Sidebar (Product, Variant, Colour, Adjustments) */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-card/30 p-3 sm:p-5 flex flex-col gap-4 overflow-y-auto no-scrollbar">
          {/* A. PRODUCT SELECTOR */}
          <div>
            <label className="text-micro text-muted-foreground block mb-2">1. Select Surface</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-2 gap-2">
              {MOCKUP_PRODUCTS.map((prod) => {
                const Icon = PRODUCT_ICONS[prod.id] || Smartphone;
                const isSelected = prod.id === selectedProductId;
                return (
                  <button
                    key={prod.id}
                    onClick={() => handleSelectProduct(prod.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_14px_var(--color-primary-glow)] font-black'
                        : 'bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:bg-white/[0.08] hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold truncate">{prod.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* B. VARIANT SELECTOR */}
          {activeProduct.variants.length > 1 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-micro text-muted-foreground">
                  2. {activeProduct.id === 'phone' ? 'Device Model' : activeProduct.id === 'laptop' ? 'Laptop Model' : activeProduct.id === 'sheet' ? 'Sheet Length' : 'Size'}
                </label>
                <span className="text-[10px] font-mono font-bold text-primary">
                  {activeVariant.sizeLabel}
                </span>
              </div>

              {/* Brand Filter Pills (For Phones & Laptops) */}
              {availableBrands.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => handleSelectBrand('All')}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                      selectedBrand === 'All'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-white/[0.05] border border-white/[0.08] text-muted-foreground hover:bg-white/[0.1] hover:text-foreground'
                    }`}
                  >
                    All ({activeProduct.variants.length})
                  </button>
                  {availableBrands.map((brand) => {
                    const count = activeProduct.variants.filter((v) => v.brand === brand).length;
                    const isBrandActive = selectedBrand === brand;
                    return (
                      <button
                        key={brand}
                        type="button"
                        onClick={() => handleSelectBrand(brand)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all shrink-0 cursor-pointer ${
                          isBrandActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-white/[0.05] border border-white/[0.08] text-muted-foreground hover:bg-white/[0.1] hover:text-foreground'
                        }`}
                      >
                        {brand} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Quick Model Search (When more than 6 variants exist) */}
              {activeProduct.variants.length > 6 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={variantSearch}
                    onChange={(e) => setVariantSearch(e.target.value)}
                    placeholder={`Search ${selectedBrand === 'All' ? activeProduct.name.toLowerCase() : selectedBrand}...`}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs placeholder:text-muted-foreground/60 text-foreground focus:outline-none focus:border-primary/60"
                  />
                  {variantSearch && (
                    <button
                      type="button"
                      onClick={() => setVariantSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Scrollable List of Filtered Variants */}
              <div
                className={`overflow-y-auto no-scrollbar flex flex-col gap-1.5 pr-0.5 ${
                  activeProduct.variants.length > 6 ? 'max-h-60 sm:max-h-72' : 'max-h-none'
                }`}
              >
                {filteredVariants.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground/70">
                    No models matching "{variantSearch}"
                  </div>
                ) : (
                  filteredVariants.map((variant) => {
                    const isSelected = variant.id === selectedVariantId;
                    return (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/20 text-foreground border-primary shadow-sm font-black'
                            : 'bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="text-xs font-bold truncate text-foreground">
                            {variant.name}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground/80 truncate">
                            {variant.dimensionNote}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/90">
                            {variant.sizeLabel}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* C. SURFACE COLOUR SELECTOR */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-micro text-muted-foreground">3. Surface Colour</label>
              <span className="text-[10px] font-bold text-foreground/80">{activeColor.name}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {activeProduct.colors.map((color) => {
                const isSelected = color.id === selectedColorId;
                return (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColorId(color.id)}
                    title={color.name}
                    aria-label={`Select ${color.name}`}
                    className={`relative w-8 h-8 rounded-full border transition-transform cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background border-white'
                        : 'border-white/20 hover:scale-105 opacity-85 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    {isSelected && (
                      <div
                        className={`w-2 h-2 rounded-full ${
                          color.contrastTone === 'dark' ? 'bg-black' : 'bg-white'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* D. QUICK ADJUST & REMOVE STICKER BUTTONS */}
          <div className="mt-auto pt-3 border-t border-white/[0.08]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-micro text-muted-foreground">Quick Adjust</label>
              {activeInstanceId && (
                <span className="text-[9px] font-mono text-primary font-bold">1 active</span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => handleQuickRotate(-45)}
                disabled={!activeInstanceId}
                className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                title="Rotate 45° counter-clockwise"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>-45°</span>
              </button>
              <button
                onClick={() => handleQuickRotate(45)}
                disabled={!activeInstanceId}
                className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                title="Rotate 45° clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>+45°</span>
              </button>
              <button
                onClick={handleResetTransform}
                disabled={!activeInstanceId}
                className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                title="Reset sticker position & rotation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                onClick={() => activeInstanceId && handleRemoveSticker(activeInstanceId)}
                disabled={!activeInstanceId}
                className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-400 hover:text-red-300 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                title="Remove sticker from mockup"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Del</span>
              </button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground/60 leading-tight">
              Drag sticker to position. Drag top handle to rotate. Drag corners to scale.
            </p>
          </div>
        </div>

        {/* Center Live Mockup Canvas */}
        <div className="relative flex-1 bg-black/20 flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden min-h-[360px]">
          <div
            className="absolute inset-0 pointer-events-none opacity-40 -z-10"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(139,92,246,0.06) 0%, transparent 70%)',
            }}
          />

          {/* Physical Object Mockup Wrapper */}
          <div
            ref={surfaceContainerRef}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
            className={`relative transition-all duration-300 flex items-center justify-center max-w-full max-h-full ${
              isDragOverCanvas ? 'ring-4 ring-primary ring-offset-4 ring-offset-background scale-[1.02]' : ''
            }`}
            style={{
              width:
                activeVariant.aspectRatio > 1.2
                  ? 'min(92%, 580px)'
                  : activeVariant.aspectRatio >= 0.85
                  ? 'min(86%, 460px)'
                  : 'min(75%, 340px)',
              aspectRatio: `${activeVariant.aspectRatio}`,
            }}
          >
            {renderSurface()}

            {/* Drop Indicator Overlay */}
            {isDragOverCanvas && (
              <div className="absolute inset-0 z-50 bg-primary/20 backdrop-blur-[2px] rounded-3xl border-2 border-primary border-dashed flex flex-col items-center justify-center pointer-events-none animate-pulse">
                <span className="px-3 py-1.5 rounded-full bg-black/80 text-xs font-black text-white border border-primary/50 shadow-lg">
                  Drop here to place sticker
                </span>
              </div>
            )}
          </div>

          {/* Floating Dimension Note Badge */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-white/70 font-mono">
            {activeVariant.dimensionNote}
          </div>
        </div>

        {/* Right Sticker Selector Strip: Mode (Switch vs + Add) + Sticker Thumbnails */}
        {allStickers.length > 0 && (
          <div className="w-full lg:w-48 xl:w-56 shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-card/20 p-3 flex flex-col gap-3 overflow-y-auto no-scrollbar">
            {/* Header + Mode Toggle: Switch vs + Add */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-micro text-muted-foreground">Stickers ({placedStickers.length})</label>
              </div>

              {/* Mode Toggle: Switch vs + Add */}
              <div className="grid grid-cols-2 p-0.5 rounded-xl bg-white/[0.06] border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setStickerMode('switch')}
                  className={`py-1 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    stickerMode === 'switch'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Switch
                </button>
                <button
                  type="button"
                  onClick={() => setStickerMode('add')}
                  className={`py-1 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    stickerMode === 'add'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Plus className="w-3 h-3 stroke-[3]" /> Add
                </button>
              </div>
            </div>

            {/* Sticker Grid Thumbnails */}
            <div className="grid grid-cols-4 lg:grid-cols-2 gap-2">
              {allStickers.map((s) => {
                const isSelected =
                  placedStickers.some((ps) => ps.stickerId === s.id && ps.instanceId === activeInstanceId) ||
                  s.id === sticker.id;

                return (
                  <button
                    key={s.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(s.id));
                      e.dataTransfer.setData('application/realz-sticker', JSON.stringify(s));
                      e.dataTransfer.effectAllowed = 'copyMove';
                    }}
                    onClick={() => handleStickerClick(s)}
                    title={`${stickerMode === 'switch' ? 'Switch active to' : 'Add'} ${s.title}`}
                    className={`relative aspect-square rounded-xl p-1.5 border transition-all cursor-grab active:cursor-grabbing flex items-center justify-center group ${
                      isSelected
                        ? 'bg-primary/20 border-primary ring-2 ring-primary/50'
                        : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.08]'
                    }`}
                  >
                    <img
                      src={s.image_url}
                      alt={s.title}
                      draggable={false}
                      className="w-full h-full object-contain filter drop-shadow-sm pointer-events-none group-hover:scale-105 transition-transform"
                    />

                    {/* Mode Hint Icon */}
                    <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-full bg-black/70 text-[8px] text-white">
                      {stickerMode === 'add' ? '+' : '⇄'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
