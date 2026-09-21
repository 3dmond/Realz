import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import LiveStickerMockupView from './LiveStickerMockupView';
import type { Product } from '@/lib/queries';

export interface LiveStickerMockupModalProps {
  isOpen: boolean;
  onClose: () => void;
  sticker: {
    id: number | string;
    title: string;
    image_url: string;
  };
  allStickers?: Product[];
}

export default function LiveStickerMockupModal({
  isOpen,
  onClose,
  sticker: initialSticker,
  allStickers = [],
}: LiveStickerMockupModalProps) {
  const [currentSticker, setCurrentSticker] = useState(initialSticker);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[94vh] p-0 border border-white/[0.12] bg-card rounded-2xl overflow-hidden shadow-2xl">
        <LiveStickerMockupView
          sticker={currentSticker}
          allStickers={allStickers}
          onSelectSticker={(s) =>
            setCurrentSticker({
              id: s.id,
              title: s.title,
              image_url: s.image_url || '',
            })
          }
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
