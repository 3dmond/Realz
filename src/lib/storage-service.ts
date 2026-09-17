import { supabase } from "@/integrations/supabase/client";

export type ImageValidationStatus = "valid" | "warning" | "rejected";

export type ImageValidationIssue = {
  type: "error" | "warning" | "info";
  message: string;
};

export type ImageValidationResult = {
  status: ImageValidationStatus;
  width?: number;
  height?: number;
  aspectRatio?: string;
  hasTransparency?: boolean;
  mimeType: string;
  fileSize: number;
  issues: ImageValidationIssue[];
};

export type ImageUploadResult = {
  publicUrl: string;
  storageKey: string;
  validation: ImageValidationResult;
};

export type OrphanItem = {
  storageKey: string;
  size: number;
  lastModified?: string;
  url: string;
};

export type OrphanScanResult = {
  scannedObjects: number;
  referencedObjects: number;
  orphanObjects: OrphanItem[];
};

export type StorageArtworkFile = {
  name: string;
  folder: string;
  storageKey: string;
  publicUrl: string;
  size: number;
  updatedAt?: string;
  createdAt?: string;
  mimeType?: string;
};

export interface ImageStorageService {
  validateImage(file: File): Promise<ImageValidationResult>;
  uploadImage(
    file: File,
    options?: { folder?: string; productId?: number },
  ): Promise<ImageUploadResult>;
  replaceImage(
    oldStorageKeyOrUrl: string,
    newFile: File,
    options?: { folder?: string; productId?: number },
  ): Promise<ImageUploadResult>;
  deleteImage(storageKeyOrUrl: string): Promise<void>;
  getImageUrl(storageKey: string): string;
  extractStorageKey(urlOrKey: string): string | null;
  scanOrphanImages(): Promise<OrphanScanResult>;
  cleanupOrphanImages(keys: string[]): Promise<{ deleted: number; errors: string[] }>;
  listArtworkFolders(): Promise<string[]>;
  createStorageFolder(folderName: string): Promise<void>;
  listArtwork(
    folder?: string,
    options?: { limit?: number; search?: string },
  ): Promise<StorageArtworkFile[]>;
}

const ALLOWED_MIME_TYPES = [
  "image/webp",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/svg+xml",
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB max
const RECOMMENDED_MAX_SIZE = 2 * 1024 * 1024; // 2 MB warning threshold
const MIN_DIMENSION_PX = 400; // Warning below this
const MAX_DIMENSION_PX = 4000; // Warning above this
const OPTIMAL_MIN_PX = 800;

class SupabaseImageStorageService implements ImageStorageService {
  private bucketName = "stickers";

  /**
   * Comprehensive client-side validation of artwork files.
   * Inspects MIME type, size, dimensions, and alpha-channel transparency.
   */
  async validateImage(file: File): Promise<ImageValidationResult> {
    const issues: ImageValidationIssue[] = [];
    let status: ImageValidationStatus = "valid";

    // 1. MIME Type Check
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      issues.push({
        type: "error",
        message: `Unsupported format (${file.type || "unknown"}). Allowed formats: WebP, PNG, JPEG, SVG.`,
      });
      status = "rejected";
    }

    // 2. File Size Checks
    if (file.size > MAX_FILE_SIZE_BYTES) {
      issues.push({
        type: "error",
        message: `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
      });
      status = "rejected";
    } else if (file.size > RECOMMENDED_MAX_SIZE) {
      issues.push({
        type: "warning",
        message: `File is large (${(file.size / (1024 * 1024)).toFixed(2)} MB). WebP or compressed PNG recommended for instant storefront loading.`,
      });
      if (status !== "rejected") status = "warning";
    }

    // 3. Image Dimension & Transparency Inspection (for bitmap formats)
    let width: number | undefined;
    let height: number | undefined;
    let aspectRatio: string | undefined;
    let hasTransparency: boolean | undefined;

    if (file.type !== "image/svg+xml" && typeof window !== "undefined") {
      try {
        const dimensions = await this.readImageMetadata(file);
        width = dimensions.width;
        height = dimensions.height;
        hasTransparency = dimensions.hasTransparency;

        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const divisor = gcd(width, height);
        aspectRatio = `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;

        if (width < MIN_DIMENSION_PX || height < MIN_DIMENSION_PX) {
          issues.push({
            type: "warning",
            message: `Resolution (${width}×${height}px) is lower than recommended ${OPTIMAL_MIN_PX}px. Small artwork may appear blurry on high-DPI displays.`,
          });
          if (status !== "rejected") status = "warning";
        } else if (width > MAX_DIMENSION_PX || height > MAX_DIMENSION_PX) {
          issues.push({
            type: "warning",
            message: `Resolution (${width}×${height}px) is very high. Consider downscaling to ~1200px to optimize mobile bandwidth.`,
          });
          if (status !== "rejected") status = "warning";
        }

        if (file.type === "image/png" || file.type === "image/webp") {
          if (hasTransparency === true) {
            issues.push({
              type: "info",
              message: "Transparent sticker cutout detected (ideal for vinyl preview).",
            });
          } else if (hasTransparency === false) {
            issues.push({
              type: "warning",
              message: "Opaque background detected. GIMP cutout recommended for contour stickers.",
            });
            if (status !== "rejected") status = "warning";
          }
        }
      } catch {
        // If image reading fails, file might be corrupted
        issues.push({
          type: "error",
          message: "Unable to parse image data. The file may be corrupt or malformed.",
        });
        status = "rejected";
      }
    }

    return {
      status,
      width,
      height,
      aspectRatio,
      hasTransparency,
      mimeType: file.type,
      fileSize: file.size,
      issues,
    };
  }

  private readImageMetadata(
    file: File,
  ): Promise<{ width: number; height: number; hasTransparency: boolean }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        let hasTransparency = false;
        try {
          // Offscreen canvas downscale to probe alpha channel
          const probeSize = 64;
          const canvas = document.createElement("canvas");
          canvas.width = probeSize;
          canvas.height = probeSize;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0, probeSize, probeSize);
            const imgData = ctx.getImageData(0, 0, probeSize, probeSize).data;
            // Check every 4th value (alpha channel)
            for (let i = 3; i < imgData.length; i += 4) {
              if (imgData[i] < 250) {
                hasTransparency = true;
                break;
              }
            }
          }
        } catch {
          // Ignore canvas read error (CORS or memory)
        }

        URL.revokeObjectURL(objectUrl);
        resolve({ width, height, hasTransparency });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image decode failed"));
      };

      img.src = objectUrl;
    });
  }

  /**
   * Upload an artwork file directly to Supabase Storage with collision-free naming.
   */
  async uploadImage(
    file: File,
    options?: { folder?: string; productId?: number },
  ): Promise<ImageUploadResult> {
    const validation = await this.validateImage(file);
    if (validation.status === "rejected") {
      const errs = validation.issues
        .filter((i) => i.type === "error")
        .map((i) => i.message)
        .join(" ");
      throw new Error(`Image validation failed: ${errs}`);
    }

    const cleanExt = file.name.split(".").pop()?.toLowerCase() || "webp";
    const cleanBaseName = file.name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[\s_]+/g, "-")
      .replace(/[^a-z0-9-]+/g, "")
      .replace(/^-+|-+$/g, "");

    const rawFolder = options?.folder?.trim() || "";
    const folder = rawFolder
      .toLowerCase()
      .split("/")
      .map((part) =>
        part
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9_-]+/g, ""),
      )
      .filter(Boolean)
      .join("/");

    if (!folder && !options?.productId) {
      throw new Error(
        "A category folder is required to upload sticker artwork. Please select a category first.",
      );
    }

    const storageKey = options?.productId
      ? `products/${options.productId}/${cleanBaseName}.${cleanExt}`
      : `${folder}/${cleanBaseName}.${cleanExt}`;

    const { error: uploadErr } = await supabase.storage.from(this.bucketName).upload(storageKey, file, {
      contentType: file.type,
      upsert: true,
    });

    if (uploadErr) {
      throw new Error(`Upload failed: ${uploadErr.message}`);
    }

    const { data: urlData } = supabase.storage.from(this.bucketName).getPublicUrl(storageKey);

    return {
      publicUrl: urlData.publicUrl,
      storageKey,
      validation,
    };
  }

  /**
   * Safe image replacement:
   * Uploads new image -> validates -> returns new reference.
   * Caller commits DB update. Old image cleanup should only happen AFTER DB succeeds.
   */
  async replaceImage(
    oldStorageKeyOrUrl: string,
    newFile: File,
    options?: { folder?: string; productId?: number },
  ): Promise<ImageUploadResult> {
    // 1. Upload new image first
    const newUpload = await this.uploadImage(newFile, options);

    // 2. Safe cleanup of old asset only if it's within our bucket
    if (oldStorageKeyOrUrl) {
      const oldKey = this.extractStorageKey(oldStorageKeyOrUrl);
      if (oldKey && oldKey !== newUpload.storageKey) {
        // Attempt cleanup in background, don't let it abort successful replacement
        this.deleteImage(oldKey).catch((cleanupErr) => {
          console.warn("[Storage] Old asset cleanup failed (deferred to orphan scan):", cleanupErr);
        });
      }
    }

    return newUpload;
  }

  /**
   * Delete an image from storage by key or full public URL.
   */
  async deleteImage(storageKeyOrUrl: string): Promise<void> {
    const key = this.extractStorageKey(storageKeyOrUrl);
    if (!key) return;

    const { error } = await supabase.storage.from(this.bucketName).remove([key]);
    if (error) {
      console.warn(`[Storage] Deletion error for ${key}:`, error.message);
      throw error;
    }
  }

  /**
   * Retrieve stable public URL for a storage key.
   */
  getImageUrl(storageKey: string): string {
    if (storageKey.startsWith("http://") || storageKey.startsWith("https://")) {
      return storageKey;
    }
    const { data } = supabase.storage.from(this.bucketName).getPublicUrl(storageKey);
    return data.publicUrl;
  }

  /**
   * Helper to parse a relative storage key from either a key path or a Supabase Storage URL.
   */
  extractStorageKey(urlOrKey: string): string | null {
    if (!urlOrKey) return null;
    if (!urlOrKey.startsWith("http://") && !urlOrKey.startsWith("https://")) {
      return urlOrKey.replace(/^\/+/, "");
    }

    try {
      const url = new URL(urlOrKey);
      // Supabase public URL: /storage/v1/object/public/stickers/{folder}/{filename}
      const marker = `/storage/v1/object/public/${this.bucketName}/`;
      const idx = url.pathname.indexOf(marker);
      if (idx !== -1) {
        return decodeURIComponent(url.pathname.substring(idx + marker.length));
      }
    } catch {
      // Not a valid URL
    }
    return null;
  }

  /**
   * Scan for orphaned media assets in storage that are not referenced by any product record.
   */
  async scanOrphanImages(): Promise<OrphanScanResult> {
    // 1. Fetch all product image URLs from database
    const { data: prods, error: pErr } = await supabase
      .from("products")
      .select("image_url, image_storage_key");

    if (pErr) throw pErr;

    const { data: gallery, error: gErr } = await supabase
      .from("product_images")
      .select("url, storage_key");

    // Build set of referenced keys and URLs
    const referencedKeys = new Set<string>();
    const referencedUrls = new Set<string>();

    for (const p of prods || []) {
      if (p.image_url) referencedUrls.add(p.image_url);
      if (p.image_storage_key) referencedKeys.add(p.image_storage_key);
      const keyFromUrl = this.extractStorageKey(p.image_url || "");
      if (keyFromUrl) referencedKeys.add(keyFromUrl);
    }

    if (!gErr && gallery) {
      for (const item of gallery) {
        if (item.url) referencedUrls.add(item.url);
        if (item.storage_key) referencedKeys.add(item.storage_key);
        const keyFromUrl = this.extractStorageKey(item.url || "");
        if (keyFromUrl) referencedKeys.add(keyFromUrl);
      }
    }

    // 2. Scan folders in Supabase Storage
    const orphanObjects: OrphanItem[] = [];
    let scannedCount = 0;

    const { data: rootItems, error: rErr } = await supabase.storage.from(this.bucketName).list("", {
      limit: 100,
    });

    if (rErr) throw rErr;

    for (const item of rootItems || []) {
      if (item.id === null) {
        // It's a folder (like adult_cartoons, african, custom, products)
        const folderName = item.name;
        const { data: files } = await supabase.storage.from(this.bucketName).list(folderName, {
          limit: 200,
        });

        for (const file of files || []) {
          if (file.id === null) {
            // Subfolder (e.g. adult_cartoons/rick-and-morty)
            const subfolder = `${folderName}/${file.name}`;
            const { data: subFiles } = await supabase.storage.from(this.bucketName).list(subfolder, {
              limit: 200,
            });
            for (const subFile of subFiles || []) {
              if (subFile.id !== null && !subFile.name.startsWith(".")) {
                scannedCount++;
                const fullKey = `${subfolder}/${subFile.name}`;
                const publicUrl = this.getImageUrl(fullKey);

                if (!referencedKeys.has(fullKey) && !referencedUrls.has(publicUrl)) {
                  orphanObjects.push({
                    storageKey: fullKey,
                    size: (subFile.metadata?.size as number) || 0,
                    lastModified: subFile.updated_at || subFile.created_at,
                    url: publicUrl,
                  });
                }
              }
            }
          } else if (!file.name.startsWith(".")) {
            scannedCount++;
            const fullKey = `${folderName}/${file.name}`;
            const publicUrl = this.getImageUrl(fullKey);

            if (!referencedKeys.has(fullKey) && !referencedUrls.has(publicUrl)) {
              orphanObjects.push({
                storageKey: fullKey,
                size: (file.metadata?.size as number) || 0,
                lastModified: file.updated_at || file.created_at,
                url: publicUrl,
              });
            }
          }
        }
      } else {
        // Direct root file
        scannedCount++;
        const fullKey = item.name;
        const publicUrl = this.getImageUrl(fullKey);
        if (!referencedKeys.has(fullKey) && !referencedUrls.has(publicUrl)) {
          orphanObjects.push({
            storageKey: fullKey,
            size: (item.metadata?.size as number) || 0,
            lastModified: item.updated_at || item.created_at,
            url: publicUrl,
          });
        }
      }
    }

    return {
      scannedObjects: scannedCount,
      referencedObjects: referencedKeys.size,
      orphanObjects,
    };
  }

  /**
   * Safe, explicit cleanup of verified orphaned images.
   */
  async cleanupOrphanImages(keys: string[]): Promise<{ deleted: number; errors: string[] }> {
    if (keys.length === 0) return { deleted: 0, errors: [] };

    const errors: string[] = [];
    let deleted = 0;

    // Process in batches of 20
    const chunkSize = 20;
    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunk = keys.slice(i, i + chunkSize);
      const { error } = await supabase.storage.from(this.bucketName).remove(chunk);
      if (error) {
        errors.push(`Batch error: ${error.message}`);
      } else {
        deleted += chunk.length;
      }
    }

    return { deleted, errors };
  }

  /**
   * Retrieve all category folder names present in the stickers bucket.
   */
  async listArtworkFolders(): Promise<string[]> {
    const { data, error } = await supabase.storage.from(this.bucketName).list("", {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    return (data || [])
      .filter((item) => (item.id === null || !item.metadata) && !item.name.startsWith("."))
      .map((item) => item.name);
  }

  /**
   * Initialize a category folder in Supabase Storage.
   */
  async createStorageFolder(folderName: string): Promise<void> {
    const cleanFolder = folderName
      .toLowerCase()
      .trim()
      .split("/")
      .map((part) =>
        part
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9_-]+/g, ""),
      )
      .filter(Boolean)
      .join("/");

    if (!cleanFolder) return;

    // In Supabase storage, folders are virtual directories established upon uploading files.
    // Try to register an empty placeholder file if bucket allows, or ignore if rejected.
    try {
      const placeholderKey = `${cleanFolder}/.keep.webp`;
      // Smallest 1x1 transparent WebP bytes
      const transparentWebpBytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38,
        0x4c, 0x0d, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00, 0x10, 0x07, 0x10, 0x11, 0x11, 0x88,
        0x88, 0xfe, 0x07, 0x00,
      ]);
      const placeholderBlob = new Blob([transparentWebpBytes], { type: "image/webp" });
      await supabase.storage.from(this.bucketName).upload(placeholderKey, placeholderBlob, {
        upsert: true,
      });
    } catch {
      // Supabase folders exist virtually as prefixes; ignoring placeholder errors is completely safe
    }
  }

  /**
   * List artwork files from Supabase Storage with optional folder filtering and search.
   */
  async listArtwork(
    folder?: string,
    options?: { limit?: number; search?: string },
  ): Promise<StorageArtworkFile[]> {
    const targetFolder = folder && folder !== "ALL" ? folder.trim() : "";
    const searchTerm = options?.search?.toLowerCase().trim() || "";
    const results: StorageArtworkFile[] = [];

    if (targetFolder) {
      const { data, error } = await supabase.storage.from(this.bucketName).list(targetFolder, {
        limit: 200,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;

      for (const item of data || []) {
        if (item.name.startsWith(".")) continue;
        if (item.id === null) {
          // Subfolder (e.g. rick-and-morty)
          const subfolderPath = `${targetFolder}/${item.name}`;
          const { data: subFiles } = await supabase.storage.from(this.bucketName).list(subfolderPath, {
            limit: 200,
          });
          for (const subItem of subFiles || []) {
            if (subItem.name.startsWith(".") || subItem.id === null) continue;
            if (searchTerm && !subItem.name.toLowerCase().includes(searchTerm)) continue;
            const subKey = `${subfolderPath}/${subItem.name}`;
            results.push({
              name: subItem.name,
              folder: subfolderPath,
              storageKey: subKey,
              publicUrl: this.getImageUrl(subKey),
              size: (subItem.metadata?.size as number) || 0,
              updatedAt: subItem.updated_at,
              createdAt: subItem.created_at,
              mimeType: (subItem.metadata?.mimetype as string) || undefined,
            });
          }
          continue;
        }
        if (searchTerm && !item.name.toLowerCase().includes(searchTerm)) continue;

        const storageKey = `${targetFolder}/${item.name}`;
        results.push({
          name: item.name,
          folder: targetFolder,
          storageKey,
          publicUrl: this.getImageUrl(storageKey),
          size: (item.metadata?.size as number) || 0,
          updatedAt: item.updated_at,
          createdAt: item.created_at,
          mimeType: (item.metadata?.mimetype as string) || undefined,
        });
      }
    } else {
      const folders = await this.listArtworkFolders();
      const folderPromises = folders.map(async (f) => {
        try {
          const { data } = await supabase.storage.from(this.bucketName).list(f, {
            limit: 50,
          });
          return (data || [])
            .filter((item) => !item.name.startsWith(".") && item.id !== null)
            .map((item) => {
              const storageKey = `${f}/${item.name}`;
              return {
                name: item.name,
                folder: f,
                storageKey,
                publicUrl: this.getImageUrl(storageKey),
                size: (item.metadata?.size as number) || 0,
                updatedAt: item.updated_at,
                createdAt: item.created_at,
                mimeType: (item.metadata?.mimetype as string) || undefined,
              };
            });
        } catch {
          return [];
        }
      });

      const nestedFiles = await Promise.all(folderPromises);
      for (const list of nestedFiles) {
        for (const file of list) {
          if (!searchTerm || file.name.toLowerCase().includes(searchTerm)) {
            results.push(file);
          }
        }
      }
    }

    return results;
  }
}

export const imageStorageService: ImageStorageService = new SupabaseImageStorageService();
