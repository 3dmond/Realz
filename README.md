Realz
---
**Realz** is a sticker e-commerce platform designed to make stickers feel tangible, collectible, and expressive rather than flat images in a grid.

Built around an artwork-first philosophy, the storefront strips away the clutter of conventional retail to create an immersive, visual world. Discovery is effortless and checkout is straightforward, minimizing friction so the focus remains entirely on the art itself.

![Realz Homepage Preview](https://github.com/user-attachments/assets/f1ee38b8-ded1-4ccd-b279-fe36055bea9b)

Art takes the centre stage. Laid on a deep canvas to ensure the colours and die-cut shapes grab attention instantly. And once someone finds what they love, they can easily add them to the cart in just one tap.  

---

## Table of Contents

* [Visual Cart & Seamless Checkout](#visual-cart--seamless-checkout)
* [Categories](#categories)
* [Artwork Pipeline](#artwork-pipeline)

---

## Visual Cart & Seamless Checkout

Realz turns your cart into your personal sticker wall - a place to review your stash, manage quantities effortlessly, and see real savings as your collection grows

<p align="center">
  <img src="https://github.com/user-attachments/assets/fdcc321b-deb4-42e2-b346-0b1f2fe6f353" alt="Realz Sticker Wall & Checkout" width="550" style="border-radius: 6px; vertical-align: middle; margin-right: 14px;" />
  <img src="https://github.com/user-attachments/assets/e1554cc8-113e-471a-9c44-0e875d0e3dcc" alt="Sticker Hover Controls" width="280" style="border-radius: 6px; vertical-align: middle;" />
</p>
<p align="center">
  <sub><b>The Sticker Wall & Live Receipt</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Quick Hover Actions</b></sub>
</p>

The cart is an open visual tray displaying the artwork you've handpicked, keeping the visual experience alive right to the end.
You can hover over any sticker to fine-tune your order. Bump counts up or down, check quantities, or trash an item instantly
No password hurdles or email confirmations. Just enter your name, phone number, and drop-off neighborhood on a clean lined-paper slip to place your order

---

## Categories

What feels like effortless exploration on the storefront is powered by a fine-tuned management engine behind the scenes. From customer discovery down to pixel-level inventory control

Visitors are met with clean, transparent sticker silhouettes, live drop counts, and instant filter tags for quick navigation.

<p align="center">
  <img src="https://github.com/user-attachments/assets/4f61d5d9-1420-4925-9e9c-3f9fbfde53c3" alt="Storefront Category View" width="850" />
</p>


Behind that storefront view sits the **Category Taxonomy** dashboard. This is where high-level parent categories are created, assigned web-friendly paths, and tracked for total active inventory.

<p align="center">
  <img src="https://github.com/user-attachments/assets/0641c0f3-d296-43ff-87cb-1f2b9084d03e" alt="Category Taxonomy Manager" width="850" />
</p>


Diving into a category opens the **Subcategory Folder System**. Instead of dumping dozens of designs into a single messy bucket, artwork is neatly partitioned into recognizable universes.

<p align="center">
  <img src="https://github.com/user-attachments/assets/0fa5c18e-4e19-4bf7-ada2-92f1115f77da" alt="Subcategory Folders" width="850" />
</p>


Opening the sticker view reveals the **Catalogue Floor**. Here, every piece is monitored with status indicators, pricing, subcategory tags, and source asset filenames.

<p align="center">
  <img src="https://github.com/user-attachments/assets/aada31f3-daff-4b74-875f-8af6b54666c5" alt="Admin Sticker Grid" width="850" />
</p>

The **Sticker Editor** opens a focused inspection dock

<p align="center">
  <a href="https://github.com/user-attachments/assets/081d7a9d-3aa0-4c65-9d23-64fbc021136e">
    <img src="https://github.com/user-attachments/assets/081d7a9d-3aa0-4c65-9d23-64fbc021136e" alt="Sticker Editor Modal" width="260" style="border-radius: 6px; vertical-align: middle; margin-right: 16px;" />
  </a>
  <a href="https://github.com/user-attachments/assets/17c7c625-cc5b-4f74-af8b-2e7530597a03">
    <img src="https://github.com/user-attachments/assets/17c7c625-cc5b-4f74-af8b-2e7530597a03" alt="Card Status Badges" width="540" style="border-radius: 6px; vertical-align: middle;" />
  </a>
</p>
<p align="center">
  <sub><b>Fine-Grained Controls</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <b>Live Asset Card Badges</b></sub>
</p>

---

## Artwork Pipeline

Stickers only look as good as their edges. Low-res artifacts, fringing backgrounds, or inconsistent scales ruin the experience.
Before any sticker enters Realz, raw artwork runs through an automated batch pipeline in GIMP, transforming messy art into store ready physical assets.

Automated alpha extraction strips out raw backgrounds using tight color-boundary detection and edge feathering, preventing pixelated halos
Every piece runs through automated dynamic level adjustment to bring vibrancy and depth to illustration colors
Artwork is auto-cropped, centered, and fitted into a uniform 1000×1000 canvas with high-fidelity Lanczos resampling ensuring consistent sizing across the store.
A sharpening mask pass brings out intricate linework and detail.
Fully automated batch export to lossless WebP format, delivering maximum visual clarity with instant load times

<details>
<summary><b>View Automated Batch Script Reference</b></summary>

The batch preparation routine is fully automated via GIMP’s Python 3 engine. See [scripts/prepare_stickers.py](scripts/prepare_stickers.py) for the complete extraction and export pipeline.

</details>


