import React, { useRef, useState, useCallback, useEffect } from 'react';
import { RotateCw, Trash2 } from 'lucide-react';
import type { MockupVariant, MockupProductDefinition, StickerTransform, PlacedSticker } from './types';

export interface StickerTransformLayerProps {
  product: MockupProductDefinition;
  variant: MockupVariant;
  placedStickers: PlacedSticker[];
  activeInstanceId: string | null;
  onSelectSticker: (instanceId: string) => void;
  onChangeTransform: (instanceId: string, next: StickerTransform) => void;
  onRemoveSticker: (instanceId: string) => void;
  onUpdateSticker?: (instanceId: string, updates: Partial<PlacedSticker>) => void;
}

type DragMode = 'none' | 'move' | 'scale' | 'rotate' | 'pinch';

export default function StickerTransformLayer({
  product,
  variant,
  placedStickers,
  activeInstanceId,
  onSelectSticker,
  onChangeTransform,
  onRemoveSticker,
  onUpdateSticker,
}: StickerTransformLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>('none');
  const [hoveredInstanceId, setHoveredInstanceId] = useState<string | null>(null);
  const [aspectRatioMap, setAspectRatioMap] = useState<Record<string, number>>({});

  // Surface physical dimensions in millimeters
  const surfaceWidthMm =
    variant.widthMm || (variant.aspectRatio ? 147 * variant.aspectRatio : 71.6);
  const surfaceHeightMm =
    variant.heightMm || (variant.aspectRatio ? 147 : 147.6);

  // Helper: compute exact physical millimeters and surface-relative percentages
  const getStickerMetrics = useCallback(
    (item: PlacedSticker, customScale?: number) => {
      const baseSizeMm = item.baseSizeMm || 50; // 50mm = 5.0cm (GIMP Medium standard)
      const aspect = item.aspectRatio || aspectRatioMap[item.instanceId] || 1.0;
      const currentScale = customScale ?? item.transform.scale;

      // Base dimensions locked to native aspect ratio (GIMP logic)
      let wMm = aspect >= 1 ? baseSizeMm : baseSizeMm * aspect;
      let hMm = aspect <= 1 ? baseSizeMm : baseSizeMm / aspect;

      // Scaled dimensions
      wMm *= currentScale;
      hMm *= currentScale;

      // Normalized fraction of the physical surface
      const wNorm = wMm / surfaceWidthMm;
      const hNorm = hMm / surfaceHeightMm;

      return {
        baseSizeMm,
        aspect,
        wMm,
        hMm,
        wNorm,
        hNorm,
      };
    },
    [surfaceWidthMm, surfaceHeightMm, aspectRatioMap],
  );

  // Maximum allowed scale so sticker never exceeds surface boundary
  const getMaxScaleForItem = useCallback(
    (item: PlacedSticker, rotation: number) => {
      const baseSizeMm = item.baseSizeMm || 50;
      const aspect = item.aspectRatio || aspectRatioMap[item.instanceId] || 1.0;
      const baseWMm = aspect >= 1 ? baseSizeMm : baseSizeMm * aspect;
      const baseHMm = aspect <= 1 ? baseSizeMm : baseSizeMm / aspect;

      const rad = (Math.abs(rotation) * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));

      const effWPerScale = (baseWMm / surfaceWidthMm) * cos + (baseHMm / surfaceHeightMm) * sin;
      const effHPerScale = (baseWMm / surfaceWidthMm) * sin + (baseHMm / surfaceHeightMm) * cos;

      const maxAllowed = Math.min(
        product.maxScale,
        0.98 / Math.max(0.001, Math.max(effWPerScale, effHPerScale)),
      );

      return Math.max(product.minScale, maxAllowed);
    },
    [product.maxScale, product.minScale, surfaceWidthMm, surfaceHeightMm, aspectRatioMap],
  );

  // IMPENETRABLE WALLS: Clamps center (x, y) so no corner or edge ever exits the surface
  const clampPosition = useCallback(
    (x: number, y: number, scale: number, rotation: number, item: PlacedSticker) => {
      const { wNorm, hNorm } = getStickerMetrics(item, scale);

      const rad = (Math.abs(rotation) * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));

      // Rotated axis-aligned bounding box fraction
      const wEff = wNorm * cos + hNorm * sin;
      const hEff = wNorm * sin + hNorm * cos;

      const halfWEff = wEff / 2;
      const halfHEff = hEff / 2;

      // Solid walls on all 4 ends: up, down, left, right
      const minX = halfWEff >= 0.5 ? 0.5 : halfWEff;
      const maxX = halfWEff >= 0.5 ? 0.5 : 1 - halfWEff;
      const minY = halfHEff >= 0.5 ? 0.5 : halfHEff;
      const maxY = halfHEff >= 0.5 ? 0.5 : 1 - halfHEff;

      return {
        x: Math.max(minX, Math.min(maxX, x)),
        y: Math.max(minY, Math.min(maxY, y)),
      };
    },
    [getStickerMetrics],
  );

  // Tracking interaction start points
  const dragStartRef = useRef<{
    instanceId: string;
    pointerId: number;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialScale: number;
    initialRotation: number;
    centerX: number;
    centerY: number;
    initialDist?: number;
    initialAngle?: number;
  }>({
    instanceId: '',
    pointerId: -1,
    startX: 0,
    startY: 0,
    initialX: 0.5,
    initialY: 0.5,
    initialScale: 1,
    initialRotation: 0,
    centerX: 0,
    centerY: 0,
  });

  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  // 1. DRAG / MOVE HANDLER
  const handleMovePointerDown = (e: React.PointerEvent, item: PlacedSticker) => {
    e.preventDefault();
    e.stopPropagation();

    onSelectSticker(item.instanceId);

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size >= 2) {
      setDragMode('pinch');
      return;
    }

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    dragStartRef.current = {
      instanceId: item.instanceId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: item.transform.x,
      initialY: item.transform.y,
      initialScale: item.transform.scale,
      initialRotation: item.transform.rotation,
      centerX: rect.left + rect.width * item.transform.x,
      centerY: rect.top + rect.height * item.transform.y,
    };

    setDragMode('move');
  };

  // 2. SCALE HANDLER (Corner handle)
  const handleScalePointerDown = (e: React.PointerEvent, item: PlacedSticker) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const stickerCenterX = rect.left + rect.width * item.transform.x;
    const stickerCenterY = rect.top + rect.height * item.transform.y;

    const dx = e.clientX - stickerCenterX;
    const dy = e.clientY - stickerCenterY;
    const initialDist = Math.hypot(dx, dy);

    dragStartRef.current = {
      instanceId: item.instanceId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: item.transform.x,
      initialY: item.transform.y,
      initialScale: item.transform.scale,
      initialRotation: item.transform.rotation,
      centerX: stickerCenterX,
      centerY: stickerCenterY,
      initialDist: Math.max(10, initialDist),
    };

    setDragMode('scale');
  };

  // 3. ROTATE HANDLER (Top rotation handle)
  const handleRotatePointerDown = (e: React.PointerEvent, item: PlacedSticker) => {
    e.preventDefault();
    e.stopPropagation();

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const stickerCenterX = rect.left + rect.width * item.transform.x;
    const stickerCenterY = rect.top + rect.height * item.transform.y;

    const angle = (Math.atan2(e.clientY - stickerCenterY, e.clientX - stickerCenterX) * 180) / Math.PI;

    dragStartRef.current = {
      instanceId: item.instanceId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: item.transform.x,
      initialY: item.transform.y,
      initialScale: item.transform.scale,
      initialRotation: item.transform.rotation,
      centerX: stickerCenterX,
      centerY: stickerCenterY,
      initialAngle: angle - item.transform.rotation,
    };

    setDragMode('rotate');
  };

  // GLOBAL POINTER MOVE
  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const activeItem = placedStickers.find((s) => s.instanceId === dragStartRef.current.instanceId);
    if (!activeItem) return;

    // Handle two-finger pinch on touch devices
    if (activePointers.current.size >= 2 && dragMode === 'pinch') {
      const points = Array.from(activePointers.current.values());
      const p1 = points[0];
      const p2 = points[1];
      const currentDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

      if (!dragStartRef.current.initialDist) {
        dragStartRef.current.initialDist = currentDist;
        dragStartRef.current.initialScale = activeItem.transform.scale;
      } else {
        const ratio = currentDist / dragStartRef.current.initialDist;
        const maxScaleAllowed = getMaxScaleForItem(activeItem, activeItem.transform.rotation);
        const newScale = Math.min(
          maxScaleAllowed,
          Math.max(product.minScale, dragStartRef.current.initialScale * ratio),
        );
        const clamped = clampPosition(
          activeItem.transform.x,
          activeItem.transform.y,
          newScale,
          activeItem.transform.rotation,
          activeItem,
        );
        onChangeTransform(activeItem.instanceId, {
          ...activeItem.transform,
          scale: +newScale.toFixed(3),
          x: +clamped.x.toFixed(4),
          y: +clamped.y.toFixed(4),
        });
      }
      return;
    }

    if (dragMode === 'none') return;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    if (dragMode === 'move') {
      const deltaXPct = (e.clientX - dragStartRef.current.startX) / rect.width;
      const deltaYPct = (e.clientY - dragStartRef.current.startY) / rect.height;

      const rawX = dragStartRef.current.initialX + deltaXPct;
      const rawY = dragStartRef.current.initialY + deltaYPct;

      const clamped = clampPosition(
        rawX,
        rawY,
        activeItem.transform.scale,
        activeItem.transform.rotation,
        activeItem,
      );
      onChangeTransform(activeItem.instanceId, {
        ...activeItem.transform,
        x: +clamped.x.toFixed(4),
        y: +clamped.y.toFixed(4),
      });
    } else if (dragMode === 'scale') {
      const { centerX, centerY, initialDist = 50, initialScale } = dragStartRef.current;
      const currentDist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      const ratio = currentDist / initialDist;

      const maxScaleAllowed = getMaxScaleForItem(activeItem, activeItem.transform.rotation);
      const newScale = Math.min(
        maxScaleAllowed,
        Math.max(product.minScale, initialScale * ratio),
      );

      const clamped = clampPosition(
        activeItem.transform.x,
        activeItem.transform.y,
        newScale,
        activeItem.transform.rotation,
        activeItem,
      );

      onChangeTransform(activeItem.instanceId, {
        ...activeItem.transform,
        scale: +newScale.toFixed(3),
        x: +clamped.x.toFixed(4),
        y: +clamped.y.toFixed(4),
      });
    } else if (dragMode === 'rotate') {
      const { centerX, centerY, initialAngle = 0 } = dragStartRef.current;
      const currentPointerAngle =
        (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI;

      let newRotation = currentPointerAngle - initialAngle;
      newRotation = ((newRotation + 180) % 360) - 180;

      // Re-clamp position in case rotation expands the bounding box into a wall
      const clamped = clampPosition(
        activeItem.transform.x,
        activeItem.transform.y,
        activeItem.transform.scale,
        Math.round(newRotation),
        activeItem,
      );

      onChangeTransform(activeItem.instanceId, {
        ...activeItem.transform,
        rotation: Math.round(newRotation),
        x: +clamped.x.toFixed(4),
        y: +clamped.y.toFixed(4),
      });
    }
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (activePointers.current.size < 2 && dragMode === 'pinch') {
      setDragMode('none');
      dragStartRef.current.initialDist = undefined;
    } else if (activePointers.current.size === 0) {
      setDragMode('none');
    }
  };

  // Re-clamp all placed stickers if surface/variant changes
  useEffect(() => {
    placedStickers.forEach((s) => {
      const clamped = clampPosition(
        s.transform.x,
        s.transform.y,
        s.transform.scale,
        s.transform.rotation,
        s,
      );
      if (clamped.x !== s.transform.x || clamped.y !== s.transform.y) {
        onChangeTransform(s.instanceId, {
          ...s.transform,
          x: +clamped.x.toFixed(4),
          y: +clamped.y.toFixed(4),
        });
      }
    });
  }, [variant.id, clampPosition]);

  // Image load: auto-detect natural aspect ratio so silhouette is locked to GIMP proportions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>, item: PlacedSticker) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const aspect = +(img.naturalWidth / img.naturalHeight).toFixed(4);
      if (aspect !== item.aspectRatio) {
        setAspectRatioMap((prev) => ({ ...prev, [item.instanceId]: aspect }));
        if (onUpdateSticker) {
          onUpdateSticker(item.instanceId, { aspectRatio: aspect });
        }
      }
    }
  };

  const isInteracting = dragMode !== 'none';

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full pointer-events-auto select-none touch-none overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
    >
      {/* Empty State when no stickers are placed */}
      {placedStickers.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
          <div className="px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/60 tracking-wider shadow-lg">
            Surface empty — drag or add a sticker
          </div>
        </div>
      )}

      {/* Render all placed stickers on the surface */}
      {placedStickers.map((item) => {
        const isActive = item.instanceId === activeInstanceId;
        const isHovered = item.instanceId === hoveredInstanceId;
        const showChrome = isActive || isHovered || (isActive && isInteracting);

        const metrics = getStickerMetrics(item);

        return (
          <div
            key={item.instanceId}
            onPointerEnter={() => setHoveredInstanceId(item.instanceId)}
            onPointerLeave={() => setHoveredInstanceId(null)}
            className={`absolute origin-center transition-shadow duration-200 cursor-grab active:cursor-grabbing ${
              isActive ? 'z-30' : 'z-10'
            }`}
            style={{
              left: `${item.transform.x * 100}%`,
              top: `${item.transform.y * 100}%`,
              width: `${metrics.wNorm * 100}%`,
              aspectRatio: `${metrics.aspect}`,
              transform: `translate(-50%, -50%) rotate(${item.transform.rotation}deg)`,
              touchAction: 'none',
            }}
          >
            {/* Live Dimension HUD (GIMP Style Readout) */}
            {showChrome && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none px-2.5 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-white shadow-lg whitespace-nowrap z-50 flex items-center gap-1.5">
                <span className="text-primary font-black">
                  {(metrics.wMm / 10).toFixed(1)} × {(metrics.hMm / 10).toFixed(1)} cm
                </span>
                <span className="text-white/40">•</span>
                <span className="text-white/80">
                  {metrics.wMm >= 75 || metrics.hMm >= 75
                    ? 'Large'
                    : metrics.wMm >= 45 || metrics.hMm >= 45
                    ? 'Medium'
                    : 'Standard'}
                </span>
              </div>
            )}

            {/* Manipulator Chrome Bounding Box (Hugs the exact sticker aspect ratio) */}
            <div
              className={`absolute -inset-1.5 rounded-lg border-2 border-primary/75 transition-all pointer-events-none ${
                showChrome ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              style={{
                boxShadow: '0 0 12px var(--color-primary-glow)',
              }}
            />

            {/* Top Rotation Handle with Connecting Stem */}
            <div
              className={`absolute -top-9 left-1/2 -translate-x-1/2 flex flex-col items-center z-40 transition-all ${
                isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
              }`}
            >
              <button
                type="button"
                aria-label="Rotate sticker"
                title="Rotate sticker"
                onPointerDown={(e) => handleRotatePointerDown(e, item)}
                className="w-7 h-7 rounded-full bg-primary text-primary-foreground border-2 border-white flex items-center justify-center cursor-alias shadow-lg hover:scale-115 active:scale-95 transition-transform"
              >
                <RotateCw className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
              <div className="w-0.5 h-2.5 bg-primary/80" />
            </div>

            {/* Top-Right Remove/Delete Sticker Handle */}
            <div
              className={`absolute -top-3 -right-3 z-40 transition-all ${
                isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
              }`}
            >
              <button
                type="button"
                aria-label="Remove sticker from mockup"
                title="Remove sticker from surface"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onRemoveSticker(item.instanceId);
                }}
                className="w-5.5 h-5.5 rounded-full bg-destructive text-white border-2 border-white flex items-center justify-center cursor-pointer shadow-md hover:scale-120 active:scale-90 transition-transform"
              >
                <Trash2 className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>

            {/* Corner Scale Handles (GIMP Locked Proportion Scaling) */}
            {/* Bottom-Right Corner Scale Handle */}
            <div
              className={`absolute -bottom-2.5 -right-2.5 z-40 transition-all ${
                isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
              }`}
            >
              <button
                type="button"
                aria-label="Scale sticker proportionally"
                title="Scale sticker proportionally"
                onPointerDown={(e) => handleScalePointerDown(e, item)}
                className="w-5.5 h-5.5 rounded-full bg-white text-black border-2 border-primary flex items-center justify-center cursor-nwse-resize shadow-md hover:scale-120 active:scale-90 transition-transform"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </button>
            </div>

            {/* Top-Left Corner Scale Handle */}
            <div
              className={`absolute -top-2.5 -left-2.5 z-40 transition-all ${
                isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
              }`}
            >
              <button
                type="button"
                aria-label="Scale sticker proportionally"
                title="Scale sticker proportionally"
                onPointerDown={(e) => handleScalePointerDown(e, item)}
                className="w-5.5 h-5.5 rounded-full bg-white text-black border-2 border-primary flex items-center justify-center cursor-nwse-resize shadow-md hover:scale-120 active:scale-90 transition-transform"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </button>
            </div>

            {/* The Sticker Artwork Itself (Draggable Surface) */}
            <div
              onPointerDown={(e) => handleMovePointerDown(e, item)}
              className="relative w-full h-full flex items-center justify-center select-none"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  draggable={false}
                  onLoad={(e) => handleImageLoad(e, item)}
                  className="w-full h-full object-contain pointer-events-none"
                />
              ) : (
                <div className="w-full h-full rounded-lg bg-white/10 flex items-center justify-center text-[10px] text-white/50">
                  Sticker
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
