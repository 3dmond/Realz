import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Check, X, ArrowLeft } from "lucide-react";
import { fetchProduct, fetchProducts, type Product as ProductType } from "@/lib/queries";
import { useCart } from "@/store/cart";
import { toast } from "sonner";
import LiveStickerMockupView from "@/components/mockup/LiveStickerMockupView";

export default function Product() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct(productId),
    enabled: !isNaN(productId),
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const [activeStickerOverride, setActiveStickerOverride] = useState<ProductType | null>(null);

  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);
  const itemsMap = useCart((s) => s.items);

  if (isLoading || !product) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center text-muted-foreground flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest">Loading sticker…</p>
      </div>
    );
  }

  // The active sticker displayed on the left column
  const currentSticker: ProductType = activeStickerOverride || product;

  const currentImageSrc = currentSticker.image_url || null;
  const isValidImage = typeof currentImageSrc === "string" && currentImageSrc.trim().length > 0;
  const displayImageSrc = isValidImage ? currentImageSrc : null;

  const isInCart = Boolean(itemsMap[currentSticker.id]);

  const handleClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else if (product.category_id) {
      navigate(`/?category=${product.category_id}`);
    } else {
      navigate("/");
    }
  };

  const handleToggleCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInCart) {
      remove(currentSticker.id);
      toast.info(`Removed ${currentSticker.title} from selections`);
    } else {
      add(
        {
          id: currentSticker.id,
          title: currentSticker.title,
          image_url: currentSticker.image_url || "",
          price: currentSticker.price,
        },
        1,
      );
      toast.success(`Added ${currentSticker.title} to selections`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1700px] px-4 sm:px-8 py-4 sm:py-6">
      {/* Top Header Bar: Back to shop & Close 'X' button */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleClose}
          className="text-micro-sm inline-flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <ArrowLeft className="h-3 w-3" /> Back to shop
        </button>

        {/* X Close Button to exit view and view other products */}
        <button
          onClick={handleClose}
          aria-label="Close and view other products"
          title="Close and view other products"
          className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/[0.12] flex items-center justify-center text-white/80 hover:text-white cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Horizontal Side-by-Side Layout: Sticker on Left, Mockup on Right */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start w-full">
        {/* ============================================================ */}
        {/* LEFT COLUMN: Sticker title on top, sticker card with (+) button */}
        {/* ============================================================ */}
        <div className="w-full lg:w-[32%] xl:w-[30%] shrink-0 flex flex-col">
          {/* Sticker Title at Top Left / On Top of Sticker */}
          <div className="mb-4">
            <p className="text-micro text-accent">Sticker</p>
            <h1 className="mt-1 text-3xl sm:text-4xl font-black text-foreground tracking-tight">
              {currentSticker.title}
            </h1>
            {currentSticker.description && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {currentSticker.description}
              </p>
            )}

            {/* Keyword tags */}
            {currentSticker.keywords && currentSticker.keywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {currentSticker.keywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full bg-white/8 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    #{k}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Draggable Sticker Artwork Card with (+) cross sign button */}
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", String(currentSticker.id));
              e.dataTransfer.setData(
                "application/realz-sticker",
                JSON.stringify({
                  id: currentSticker.id,
                  title: currentSticker.title,
                  image_url: currentSticker.image_url,
                }),
              );
              e.dataTransfer.effectAllowed = "copyMove";
            }}
            title="Drag sticker onto surface on the right"
            className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl bg-card border border-border/40 p-6 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group shadow-xl transition-all hover:border-primary/50 select-none"
          >
            {displayImageSrc ? (
              <img
                src={
                  displayImageSrc.includes("unsplash.com")
                    ? displayImageSrc +
                      (displayImageSrc.includes("?") ? "&" : "?") +
                      "w=800&q=80&auto=format"
                    : displayImageSrc
                }
                alt={currentSticker.title}
                draggable={false}
                className="h-full w-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] group-hover:scale-105 transition-transform duration-300 pointer-events-none"
              />
            ) : (
              <div className="h-full w-full bg-muted/20 animate-pulse rounded-xl" />
            )}

            {/* Drag hint overlay at bottom-left */}
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-[9px] font-black uppercase tracking-wider text-white pointer-events-none shadow-md">
              ✋ Drag onto surface
            </div>

            {/* Add button like in other areas (cross sign / check) */}
            <button
              onClick={handleToggleCart}
              aria-label={
                isInCart
                  ? `Remove ${currentSticker.title} from selections`
                  : `Add ${currentSticker.title} to selections`
              }
              title={
                isInCart
                  ? `Remove ${currentSticker.title} from selections`
                  : `Add ${currentSticker.title} to selections`
              }
              className={`absolute bottom-3 right-3 z-20 min-w-[42px] min-h-[42px] w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-lg active:scale-90 ${
                isInCart
                  ? "bg-white text-black border border-white shadow-[0_0_16px_rgba(255,255,255,0.45)] hover:scale-110"
                  : "bg-black/60 backdrop-blur-md border border-white/20 text-white/90 hover:bg-primary hover:text-white hover:border-primary/60 hover:shadow-[0_0_20px_rgba(139,92,246,0.6)] hover:scale-110"
              }`}
            >
              {isInCart ? (
                <Check className="h-5 w-5 stroke-[2.5]" />
              ) : (
                <Plus className="h-5 w-5 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Live Mockup Surface Customizer */}
        {/* ============================================================ */}
        <div className="w-full lg:w-[68%] xl:w-[70%] min-w-0 rounded-2xl border border-white/[0.12] bg-card/60 backdrop-blur-xl overflow-hidden shadow-2xl">
          <LiveStickerMockupView
            sticker={{
              id: currentSticker.id,
              title: currentSticker.title,
              image_url: currentSticker.image_url || "",
            }}
            allStickers={allProducts}
            hideHeader={true}
            onSelectSticker={(s) => setActiveStickerOverride(s)}
          />
        </div>
      </div>
    </div>
  );
}
