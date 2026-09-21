import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { fetchProducts } from '@/lib/queries';
import LiveStickerMockupView from '@/components/mockup/LiveStickerMockupView';

export default function MockupStudio() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const validProducts = products.filter(
    (p) => typeof p.image_url === 'string' && p.image_url.trim().length > 0,
  );

  const [selectedProduct, setSelectedProduct] = useState<(typeof validProducts)[0] | null>(null);

  // Sync selected product with route param or default to first valid product
  useEffect(() => {
    if (validProducts.length === 0) return;
    if (id) {
      const found = validProducts.find((p) => p.id === Number(id));
      if (found) {
        setSelectedProduct(found);
        return;
      }
    }
    // Fallback to first sticker if none selected or match
    if (!selectedProduct && validProducts.length > 0) {
      setSelectedProduct(validProducts[0]);
    }
  }, [id, validProducts]);

  const handleBack = () => {
    if (selectedProduct) {
      navigate(`/product/${selectedProduct.id}`);
    } else {
      navigate('/');
    }
  };

  if (isLoading || !selectedProduct) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center text-muted-foreground flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest">Loading Live Mockup Studio…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 py-4 sm:py-6">
      {/* Top Breadcrumb / Back Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handleBack}
          className="text-micro-sm inline-flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          <span>Back to {selectedProduct.title}</span>
        </button>
      </div>

      {/* Studio Container Card */}
      <div className="rounded-2xl border border-white/[0.1] bg-card overflow-hidden shadow-2xl">
        <LiveStickerMockupView
          sticker={{
            id: selectedProduct.id,
            title: selectedProduct.title,
            image_url: selectedProduct.image_url || '',
          }}
          allStickers={validProducts}
          onSelectSticker={(p) => {
            setSelectedProduct(p);
            navigate(`/mockup/${p.id}`, { replace: true });
          }}
          onClose={handleBack}
        />
      </div>
    </div>
  );
}
