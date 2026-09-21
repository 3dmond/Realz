import type { MockupProductDefinition, MockupVariant } from './types';

// Helper to create exact millimeter phone variants
function createPhoneVariant(
  id: string,
  name: string,
  brand: string,
  screenInches: number,
  heightMm: number,
  widthMm: number,
  formFactor: 'candybar' | 'foldable' | 'flip' = 'candybar',
): MockupVariant {
  const aspectRatio = +(widthMm / heightMm).toFixed(4);
  // Baseline phone height is ~147mm (iPhone standard)
  const physicalScaleFactor = +(147 / heightMm).toFixed(2);
  const isFold = formFactor === 'foldable';
  const bounds = isFold
    ? { left: 0.06, top: 0.08, width: 0.88, height: 0.84 }
    : { left: 0.08, top: 0.16, width: 0.84, height: 0.78 };

  return {
    id,
    name,
    brand,
    screenInches,
    heightMm,
    widthMm,
    sizeLabel: `${screenInches}″`,
    dimensionNote: `${heightMm.toFixed(1)} × ${widthMm.toFixed(1)} mm (${screenInches}″)`,
    aspectRatio,
    physicalScaleFactor,
    bounds,
    formFactor,
  };
}

// -------------------------------------------------------------
// 1. APPLE IPHONE VARIANTS (Ordered Smallest -> Largest)
// -------------------------------------------------------------
const APPLE_PHONES: MockupVariant[] = [
  createPhoneVariant('iphone-4s', 'iPhone 4 / 4s', 'Apple', 3.5, 115.2, 58.6),
  createPhoneVariant('iphone-5s', 'iPhone 5 / 5s / 5c', 'Apple', 4.0, 123.8, 58.6),
  createPhoneVariant('iphone-se-1', 'iPhone SE (1st gen)', 'Apple', 4.0, 123.8, 58.6),
  createPhoneVariant('iphone-6', 'iPhone 6 / 6s', 'Apple', 4.7, 138.1, 67.0),
  createPhoneVariant('iphone-7-8', 'iPhone 7 / 8', 'Apple', 4.7, 138.4, 67.3),
  createPhoneVariant('iphone-se-gen3', 'iPhone SE (2nd/3rd gen)', 'Apple', 4.7, 138.4, 67.3),
  createPhoneVariant('iphone-12-13-mini', 'iPhone 12 / 13 mini', 'Apple', 5.4, 131.5, 64.2),
  createPhoneVariant('iphone-6-plus', 'iPhone 6 Plus / 6s Plus', 'Apple', 5.5, 158.1, 77.8),
  createPhoneVariant('iphone-7-8-plus', 'iPhone 7 Plus / 8 Plus', 'Apple', 5.5, 158.4, 78.1),
  createPhoneVariant('iphone-x-xs', 'iPhone X / XS', 'Apple', 5.8, 143.6, 70.9),
  createPhoneVariant('iphone-11-pro', 'iPhone 11 Pro', 'Apple', 5.8, 144.0, 71.4),
  createPhoneVariant('iphone-xr', 'iPhone XR', 'Apple', 6.1, 150.9, 75.7),
  createPhoneVariant('iphone-11', 'iPhone 11', 'Apple', 6.1, 150.9, 75.7),
  createPhoneVariant('iphone-12-12pro', 'iPhone 12 / 12 Pro', 'Apple', 6.1, 146.7, 71.5),
  createPhoneVariant('iphone-13-13pro', 'iPhone 13 / 13 Pro', 'Apple', 6.1, 146.7, 71.5),
  createPhoneVariant('iphone-14-14pro', 'iPhone 14 / 14 Pro', 'Apple', 6.1, 147.5, 71.5),
  createPhoneVariant('iphone-15-15pro', 'iPhone 15 / 15 Pro', 'Apple', 6.1, 147.6, 71.6),
  createPhoneVariant('iphone-16', 'iPhone 16', 'Apple', 6.1, 147.6, 71.6),
  createPhoneVariant('iphone-16-pro', 'iPhone 16 Pro', 'Apple', 6.3, 149.6, 71.5),
  createPhoneVariant('iphone-xs-max', 'iPhone XS Max', 'Apple', 6.5, 157.5, 77.4),
  createPhoneVariant('iphone-11-promax', 'iPhone 11 Pro Max', 'Apple', 6.5, 158.0, 77.8),
  createPhoneVariant('iphone-12-13-promax', 'iPhone 12 / 13 Pro Max', 'Apple', 6.7, 160.8, 78.1),
  createPhoneVariant('iphone-14-15-16-plus', 'iPhone 14 / 15 / 16 Plus', 'Apple', 6.7, 160.9, 77.8),
  createPhoneVariant('iphone-14-15-promax', 'iPhone 14 / 15 Pro Max', 'Apple', 6.7, 159.9, 76.7),
  createPhoneVariant('iphone-16-promax', 'iPhone 16 Pro Max', 'Apple', 6.9, 163.0, 77.6),
];

// -------------------------------------------------------------
// 2. SAMSUNG GALAXY VARIANTS (Ordered Smallest -> Largest)
// -------------------------------------------------------------
const SAMSUNG_PHONES: MockupVariant[] = [
  createPhoneVariant('samsung-s3-s4', 'Galaxy S3 / S4', 'Samsung', 4.8, 136.6, 70.6),
  createPhoneVariant('samsung-s5', 'Galaxy S5', 'Samsung', 5.1, 142.0, 72.5),
  createPhoneVariant('samsung-s6-s7', 'Galaxy S6 / S7', 'Samsung', 5.1, 142.4, 69.6),
  createPhoneVariant('samsung-s8', 'Galaxy S8', 'Samsung', 5.8, 148.9, 68.1),
  createPhoneVariant('samsung-s9', 'Galaxy S9', 'Samsung', 5.8, 147.7, 68.7),
  createPhoneVariant('samsung-s10e', 'Galaxy S10e', 'Samsung', 5.8, 142.2, 69.9),
  createPhoneVariant('samsung-s10', 'Galaxy S10', 'Samsung', 6.1, 149.9, 70.4),
  createPhoneVariant('samsung-s22', 'Galaxy S22', 'Samsung', 6.1, 146.0, 70.6),
  createPhoneVariant('samsung-s23', 'Galaxy S23', 'Samsung', 6.1, 146.3, 70.9),
  createPhoneVariant('samsung-s20-s21', 'Galaxy S20 / S21', 'Samsung', 6.2, 151.7, 71.2),
  createPhoneVariant('samsung-s24', 'Galaxy S24', 'Samsung', 6.2, 147.0, 70.6),
  createPhoneVariant('samsung-s8-s9-plus', 'Galaxy S8+ / S9+', 'Samsung', 6.2, 158.1, 73.8),
  createPhoneVariant('samsung-s10-plus', 'Galaxy S10+', 'Samsung', 6.4, 157.6, 74.1),
  createPhoneVariant('samsung-a53-a54', 'Galaxy A53 / A54 5G', 'Samsung', 6.4, 158.2, 76.7),
  createPhoneVariant('samsung-s22-s23-plus', 'Galaxy S22+ / S23+', 'Samsung', 6.6, 157.8, 76.2),
  createPhoneVariant('samsung-a55', 'Galaxy A55 5G', 'Samsung', 6.6, 161.1, 77.4),
  createPhoneVariant('samsung-s20-s21-plus', 'Galaxy S20+ / S21+', 'Samsung', 6.7, 161.5, 75.6),
  createPhoneVariant('samsung-s24-plus', 'Galaxy S24+', 'Samsung', 6.7, 158.5, 75.9),
  createPhoneVariant('samsung-z-flip-5-6', 'Galaxy Z Flip 5 / 6', 'Samsung', 6.7, 165.1, 71.9, 'flip'),
  createPhoneVariant('samsung-note-10-20-ultra', 'Galaxy Note 10+ / Note 20 Ultra', 'Samsung', 6.8, 164.8, 77.2),
  createPhoneVariant('samsung-s21-s22-ultra', 'Galaxy S21 / S22 Ultra', 'Samsung', 6.8, 163.3, 77.9),
  createPhoneVariant('samsung-s23-ultra', 'Galaxy S23 Ultra', 'Samsung', 6.8, 163.4, 78.1),
  createPhoneVariant('samsung-s24-ultra', 'Galaxy S24 Ultra', 'Samsung', 6.8, 162.3, 79.0),
  createPhoneVariant('samsung-z-fold-5-6', 'Galaxy Z Fold 5 / 6 (Open)', 'Samsung', 7.6, 153.5, 132.6, 'foldable'),
];

// -------------------------------------------------------------
// 3. HUAWEI VARIANTS (Ordered Smallest -> Largest)
// -------------------------------------------------------------
const HUAWEI_PHONES: MockupVariant[] = [
  createPhoneVariant('huawei-p8-p9-lite', 'Huawei P8 / P9 Lite', 'Huawei', 5.2, 146.8, 72.6),
  createPhoneVariant('huawei-p9-p10', 'Huawei P9 / P10', 'Huawei', 5.2, 145.0, 70.9),
  createPhoneVariant('huawei-p20', 'Huawei P20', 'Huawei', 5.8, 149.1, 70.8),
  createPhoneVariant('huawei-mate-10-pro', 'Huawei Mate 10 Pro', 'Huawei', 6.0, 154.2, 74.5),
  createPhoneVariant('huawei-p20-pro', 'Huawei P20 Pro', 'Huawei', 6.1, 155.0, 73.9),
  createPhoneVariant('huawei-p30', 'Huawei P30', 'Huawei', 6.1, 149.1, 71.4),
  createPhoneVariant('huawei-p40', 'Huawei P40', 'Huawei', 6.1, 148.9, 71.1),
  createPhoneVariant('huawei-mate-20-pro', 'Huawei Mate 20 Pro', 'Huawei', 6.39, 157.8, 72.3),
  createPhoneVariant('huawei-p30-pro', 'Huawei P30 Pro', 'Huawei', 6.47, 158.0, 73.4),
  createPhoneVariant('huawei-p50', 'Huawei P50', 'Huawei', 6.5, 156.5, 73.8),
  createPhoneVariant('huawei-mate-20', 'Huawei Mate 20', 'Huawei', 6.53, 158.2, 77.2),
  createPhoneVariant('huawei-mate-30-pro', 'Huawei Mate 30 Pro', 'Huawei', 6.53, 158.1, 73.1),
  createPhoneVariant('huawei-p40-pro', 'Huawei P40 Pro / Pro+', 'Huawei', 6.58, 158.2, 72.6),
  createPhoneVariant('huawei-p50-pro', 'Huawei P50 Pro', 'Huawei', 6.6, 158.8, 72.8),
  createPhoneVariant('huawei-pura-70', 'Huawei Pura 70', 'Huawei', 6.6, 157.6, 74.3),
  createPhoneVariant('huawei-p60-pro', 'Huawei P60 Pro', 'Huawei', 6.67, 161.0, 74.5),
  createPhoneVariant('huawei-nova-10-11-12', 'Huawei Nova 10 / 11 / 12', 'Huawei', 6.7, 161.5, 75.4),
  createPhoneVariant('huawei-mate-50-pro', 'Huawei Mate 50 Pro', 'Huawei', 6.74, 162.1, 75.5),
  createPhoneVariant('huawei-mate-40-pro', 'Huawei Mate 40 Pro', 'Huawei', 6.76, 162.9, 75.5),
  createPhoneVariant('huawei-pura-70-pro', 'Huawei Pura 70 Pro', 'Huawei', 6.8, 162.6, 75.1),
  createPhoneVariant('huawei-pura-70-ultra', 'Huawei Pura 70 Ultra', 'Huawei', 6.8, 162.6, 75.1),
  createPhoneVariant('huawei-mate-60-pro', 'Huawei Mate 60 Pro', 'Huawei', 6.82, 163.7, 79.0),
];

// -------------------------------------------------------------
// 4. XIAOMI & REDMI VARIANTS (Ordered Smallest -> Largest)
// -------------------------------------------------------------
const XIAOMI_PHONES: MockupVariant[] = [
  createPhoneVariant('xiaomi-redmi-4', 'Redmi 4 / 4X', 'Xiaomi', 5.0, 139.2, 70.0),
  createPhoneVariant('xiaomi-mi-6', 'Xiaomi Mi 6', 'Xiaomi', 5.15, 145.2, 70.5),
  createPhoneVariant('xiaomi-mi-9-se', 'Xiaomi Mi 9 SE', 'Xiaomi', 5.97, 147.5, 70.5),
  createPhoneVariant('xiaomi-12-12x', 'Xiaomi 12 / 12X', 'Xiaomi', 6.28, 152.7, 69.9),
  createPhoneVariant('xiaomi-redmi-note-7-8', 'Redmi Note 7 / Note 8', 'Xiaomi', 6.3, 158.3, 75.3),
  createPhoneVariant('xiaomi-13', 'Xiaomi 13', 'Xiaomi', 6.36, 152.8, 71.5),
  createPhoneVariant('xiaomi-14', 'Xiaomi 14', 'Xiaomi', 6.36, 152.8, 71.5),
  createPhoneVariant('xiaomi-mi-9', 'Xiaomi Mi 9', 'Xiaomi', 6.39, 157.5, 74.7),
  createPhoneVariant('xiaomi-redmi-note-10-11', 'Redmi Note 10 / Note 11', 'Xiaomi', 6.43, 159.9, 73.9),
  createPhoneVariant('xiaomi-redmi-note-9', 'Redmi Note 9 / 9S', 'Xiaomi', 6.53, 162.3, 77.2),
  createPhoneVariant('xiaomi-redmi-note-10-11-pro', 'Redmi Note 10 Pro / 11 Pro', 'Xiaomi', 6.67, 164.2, 76.1),
  createPhoneVariant('xiaomi-redmi-note-12-pro', 'Redmi Note 12 / 12 Pro', 'Xiaomi', 6.67, 162.9, 76.0),
  createPhoneVariant('xiaomi-redmi-note-13-pro-plus', 'Redmi Note 13 Pro+', 'Xiaomi', 6.67, 161.4, 74.2),
  createPhoneVariant('xiaomi-poco-f3-f4', 'POCO F3 / F4', 'Xiaomi', 6.67, 163.2, 76.0),
  createPhoneVariant('xiaomi-poco-f5-f5pro', 'POCO F5 / F5 Pro', 'Xiaomi', 6.67, 161.1, 74.9),
  createPhoneVariant('xiaomi-poco-x5-x6-pro', 'POCO X5 Pro / X6 Pro', 'Xiaomi', 6.67, 160.5, 74.3),
  createPhoneVariant('xiaomi-mi-10-pro', 'Xiaomi Mi 10 / 10 Pro', 'Xiaomi', 6.67, 162.6, 74.8),
  createPhoneVariant('xiaomi-12-13-pro', 'Xiaomi 12 Pro / 13 Pro', 'Xiaomi', 6.73, 162.9, 74.6),
  createPhoneVariant('xiaomi-13-ultra', 'Xiaomi 13 Ultra', 'Xiaomi', 6.73, 163.2, 74.6),
  createPhoneVariant('xiaomi-14-pro', 'Xiaomi 14 Pro', 'Xiaomi', 6.73, 161.4, 75.3),
  createPhoneVariant('xiaomi-14-ultra', 'Xiaomi 14 Ultra', 'Xiaomi', 6.73, 161.4, 75.3),
  createPhoneVariant('xiaomi-mi-11-ultra', 'Xiaomi Mi 11 / 11 Ultra', 'Xiaomi', 6.81, 164.3, 74.6),
  createPhoneVariant('xiaomi-mix-fold-3', 'Xiaomi MIX Fold 3 (Open)', 'Xiaomi', 8.03, 161.2, 143.3, 'foldable'),
  createPhoneVariant('xiaomi-mix-fold-4', 'Xiaomi MIX Fold 4 (Open)', 'Xiaomi', 7.98, 159.4, 142.6, 'foldable'),
];

// -------------------------------------------------------------
// 5. TECNO VARIANTS (Ordered Smallest -> Largest)
// -------------------------------------------------------------
const TECNO_PHONES: MockupVariant[] = [
  createPhoneVariant('tecno-pop-7', 'Tecno Pop 7', 'Tecno', 6.6, 163.9, 75.5),
  createPhoneVariant('tecno-pop-8', 'Tecno Pop 8', 'Tecno', 6.6, 163.7, 75.6),
  createPhoneVariant('tecno-spark-9-pro', 'Tecno Spark 9 Pro', 'Tecno', 6.6, 164.2, 75.6),
  createPhoneVariant('tecno-spark-20-20c', 'Tecno Spark 20 / 20C', 'Tecno', 6.6, 163.7, 75.6),
  createPhoneVariant('tecno-camon-18-premier', 'Tecno Camon 18 Premier', 'Tecno', 6.7, 163.8, 75.9),
  createPhoneVariant('tecno-camon-20-pro', 'Tecno Camon 20 / 20 Pro', 'Tecno', 6.67, 163.4, 76.7),
  createPhoneVariant('tecno-camon-30-premier', 'Tecno Camon 30 Premier', 'Tecno', 6.77, 162.7, 76.2),
  createPhoneVariant('tecno-spark-20-pro-plus', 'Tecno Spark 20 Pro+', 'Tecno', 6.78, 164.7, 75.0),
  createPhoneVariant('tecno-camon-30-pro', 'Tecno Camon 30 / 30 Pro', 'Tecno', 6.78, 164.0, 74.5),
  createPhoneVariant('tecno-pova-5-pro', 'Tecno Pova 5 Pro', 'Tecno', 6.78, 168.5, 76.5),
  createPhoneVariant('tecno-pova-6-pro', 'Tecno Pova 6 Pro', 'Tecno', 6.78, 165.5, 76.1),
  createPhoneVariant('tecno-camon-19-pro', 'Tecno Camon 19 Pro', 'Tecno', 6.8, 166.8, 74.6),
  createPhoneVariant('tecno-spark-10-pro', 'Tecno Spark 10 Pro', 'Tecno', 6.8, 168.4, 76.2),
  createPhoneVariant('tecno-phantom-x2-pro', 'Tecno Phantom X2 Pro', 'Tecno', 6.8, 164.6, 72.7),
  createPhoneVariant('tecno-phantom-v-flip', 'Tecno Phantom V Flip', 'Tecno', 6.9, 171.7, 74.1, 'flip'),
  createPhoneVariant('tecno-phantom-v-fold', 'Tecno Phantom V Fold (Open)', 'Tecno', 7.85, 159.9, 140.4, 'foldable'),
];

// -------------------------------------------------------------
// 6. INFINIX VARIANTS (Ordered Smallest -> Largest)
// -------------------------------------------------------------
const INFINIX_PHONES: MockupVariant[] = [
  createPhoneVariant('infinix-hot-30i', 'Infinix Hot 30i', 'Infinix', 6.56, 164.0, 75.8),
  createPhoneVariant('infinix-smart-7', 'Infinix Smart 7', 'Infinix', 6.6, 163.9, 75.5),
  createPhoneVariant('infinix-smart-8-pro', 'Infinix Smart 8 / 8 Pro', 'Infinix', 6.6, 163.6, 75.6),
  createPhoneVariant('infinix-note-30-pro', 'Infinix Note 30 Pro', 'Infinix', 6.67, 162.7, 76.0),
  createPhoneVariant('infinix-gt-10-pro', 'Infinix GT 10 Pro', 'Infinix', 6.67, 162.7, 75.9),
  createPhoneVariant('infinix-note-12-pro', 'Infinix Note 12 Pro', 'Infinix', 6.7, 164.4, 76.7),
  createPhoneVariant('infinix-zero-30', 'Infinix Zero 30 5G', 'Infinix', 6.78, 164.5, 75.0),
  createPhoneVariant('infinix-note-40-pro-plus', 'Infinix Note 40 Pro / Pro+', 'Infinix', 6.78, 164.4, 74.6),
  createPhoneVariant('infinix-hot-30', 'Infinix Hot 30', 'Infinix', 6.78, 168.7, 76.6),
  createPhoneVariant('infinix-hot-40-pro', 'Infinix Hot 40 Pro', 'Infinix', 6.78, 168.6, 76.6),
  createPhoneVariant('infinix-gt-20-pro', 'Infinix GT 20 Pro', 'Infinix', 6.78, 164.3, 75.4),
  createPhoneVariant('infinix-zero-ultra', 'Infinix Zero Ultra', 'Infinix', 6.8, 165.5, 74.5),
  createPhoneVariant('infinix-zero-flip', 'Infinix Zero Flip', 'Infinix', 6.9, 170.4, 73.4, 'flip'),
];

// -------------------------------------------------------------
// 7. GOOGLE PIXEL VARIANTS (Ordered Smallest -> Largest)
// -------------------------------------------------------------
const GOOGLE_PHONES: MockupVariant[] = [
  createPhoneVariant('pixel-3', 'Google Pixel 3', 'Google', 5.5, 145.6, 68.2),
  createPhoneVariant('pixel-4', 'Google Pixel 4', 'Google', 5.7, 147.1, 68.8),
  createPhoneVariant('pixel-4a-5', 'Google Pixel 4a / 5', 'Google', 5.8, 144.0, 69.4),
  createPhoneVariant('pixel-6a-7a-8a', 'Google Pixel 6a / 7a / 8a', 'Google', 6.1, 152.1, 72.7),
  createPhoneVariant('pixel-8', 'Google Pixel 8', 'Google', 6.2, 150.5, 70.8),
  createPhoneVariant('pixel-7-9', 'Google Pixel 7 / 9', 'Google', 6.3, 152.8, 72.0),
  createPhoneVariant('pixel-9-pro', 'Google Pixel 9 Pro', 'Google', 6.3, 152.8, 72.0),
  createPhoneVariant('pixel-6', 'Google Pixel 6', 'Google', 6.4, 158.6, 74.8),
  createPhoneVariant('pixel-6-7-pro', 'Google Pixel 6 Pro / 7 Pro', 'Google', 6.7, 162.9, 76.6),
  createPhoneVariant('pixel-8-pro', 'Google Pixel 8 Pro', 'Google', 6.7, 162.6, 76.5),
  createPhoneVariant('pixel-9-pro-xl', 'Google Pixel 9 Pro XL', 'Google', 6.8, 162.8, 76.6),
  createPhoneVariant('pixel-9-pro-fold', 'Google Pixel 9 Pro Fold (Open)', 'Google', 8.0, 155.2, 150.2, 'foldable'),
];

// Combined Phone Variants
const ALL_PHONE_VARIANTS: MockupVariant[] = [
  ...APPLE_PHONES,
  ...SAMSUNG_PHONES,
  ...HUAWEI_PHONES,
  ...XIAOMI_PHONES,
  ...TECNO_PHONES,
  ...INFINIX_PHONES,
  ...GOOGLE_PHONES,
];

// Helper to create exact millimeter laptop variants
function createLaptopVariant(
  id: string,
  name: string,
  brand: string,
  screenInches: number,
  widthMm: number,
  depthMm: number,
): MockupVariant {
  const aspectRatio = +(widthMm / depthMm).toFixed(4);
  const physicalScaleFactor = +(304 / widthMm).toFixed(2);
  return {
    id,
    name,
    brand,
    screenInches,
    widthMm,
    heightMm: depthMm,
    sizeLabel: `${screenInches}″`,
    dimensionNote: `${widthMm.toFixed(1)} × ${depthMm.toFixed(1)} mm (${screenInches}″)`,
    aspectRatio,
    physicalScaleFactor,
    bounds: { left: 0.1, top: 0.12, width: 0.8, height: 0.76 },
    formFactor: 'laptop',
  };
}

// -------------------------------------------------------------
// LAPTOP VARIANTS (Ordered Smallest -> Largest by screen & width)
// -------------------------------------------------------------
const ALL_LAPTOP_VARIANTS: MockupVariant[] = [
  // 13″ - 14″ Compact Laptops
  createLaptopVariant('dell-xps-13', 'Dell XPS 13', 'Dell', 13.4, 295.3, 199.1),
  createLaptopVariant('surface-laptop-7-13', 'Surface Laptop 7 13.8″', 'Microsoft', 13.8, 301.0, 220.0),
  createLaptopVariant('macbook-air-13', 'MacBook Air 13″ M2/M3', 'Apple', 13.6, 304.1, 215.0),
  createLaptopVariant('asus-rog-g14', 'ASUS ROG Zephyrus G14', 'ASUS', 14.0, 311.0, 220.0),
  createLaptopVariant('asus-zenbook-14', 'ASUS Zenbook 14 OLED', 'ASUS', 14.0, 312.4, 220.1),
  createLaptopVariant('macbook-pro-14', 'MacBook Pro 14″ M3/M4', 'Apple', 14.2, 312.6, 221.2),
  createLaptopVariant('hp-omen-transcend-14', 'HP OMEN Transcend 14″', 'HP', 14.0, 313.0, 233.5),
  createLaptopVariant('hp-spectre-14', 'HP Spectre x360 14″', 'HP', 14.0, 313.7, 220.4),
  createLaptopVariant('lenovo-x1-carbon-14', 'Lenovo ThinkPad X1 Carbon 14″', 'Lenovo', 14.0, 315.6, 222.5),
  createLaptopVariant('lenovo-yoga-9i-14', 'Lenovo Yoga 9i 14″', 'Lenovo', 14.0, 318.0, 230.0),
  createLaptopVariant('dell-xps-14', 'Dell XPS 14', 'Dell', 14.5, 320.0, 216.0),

  // 15″ Midsize Laptops
  createLaptopVariant('surface-laptop-7-15', 'Surface Laptop 7 15″', 'Microsoft', 15.0, 329.0, 239.0),
  createLaptopVariant('macbook-air-15', 'MacBook Air 15″ M2/M3', 'Apple', 15.3, 340.4, 237.6),
  createLaptopVariant('dell-inspiron-15', 'Dell Inspiron 15', 'Dell', 15.6, 358.5, 235.6),
  createLaptopVariant('asus-vivobook-15', 'ASUS Vivobook 15', 'ASUS', 15.6, 359.7, 232.5),
  createLaptopVariant('lenovo-ideapad-slim-3-15', 'Lenovo IdeaPad Slim 3 15.6″', 'Lenovo', 15.6, 359.3, 235.0),
  createLaptopVariant('hp-pavilion-15', 'HP Pavilion 15.6″', 'HP', 15.6, 360.2, 234.0),

  // 16″ Pro & Gaming Laptops
  createLaptopVariant('asus-vivobook-16', 'ASUS Vivobook 16″', 'ASUS', 16.0, 358.7, 249.5),
  createLaptopVariant('dell-xps-16', 'Dell XPS 16', 'Dell', 16.3, 358.2, 240.0),
  createLaptopVariant('macbook-pro-16', 'MacBook Pro 16″ M3/M4', 'Apple', 16.2, 355.7, 248.1),
  createLaptopVariant('hp-envy-16', 'HP Envy 16″', 'HP', 16.0, 357.4, 252.4),
  createLaptopVariant('lenovo-legion-pro-7-16', 'Lenovo Legion Pro 7 16″', 'Lenovo', 16.0, 363.4, 262.1),
  createLaptopVariant('hp-omen-16', 'HP OMEN 16″', 'HP', 16.1, 369.0, 259.4),
];

// -------------------------------------------------------------
// STICKER SHEET VARIANTS (1x1m, 2x2m, 3x3m)
// -------------------------------------------------------------
const STICKER_SHEET_VARIANTS: MockupVariant[] = [
  {
    id: 'sheet-1x1m',
    name: '1m × 1m Sheet',
    sizeLabel: '1 × 1m',
    dimensionNote: '1.0 × 1.0 m (100 × 100 cm)',
    aspectRatio: 1.0,
    physicalScaleFactor: 1.0,
    bounds: { left: 0.05, top: 0.05, width: 0.9, height: 0.9 },
    heightMm: 1000,
    widthMm: 1000,
    formFactor: 'sheet',
  },
  {
    id: 'sheet-2x2m',
    name: '2m × 2m Sheet',
    sizeLabel: '2 × 2m',
    dimensionNote: '2.0 × 2.0 m (200 × 200 cm)',
    aspectRatio: 1.0,
    physicalScaleFactor: 0.5,
    bounds: { left: 0.05, top: 0.05, width: 0.9, height: 0.9 },
    heightMm: 2000,
    widthMm: 2000,
    formFactor: 'sheet',
  },
  {
    id: 'sheet-3x3m',
    name: '3m × 3m Sheet',
    sizeLabel: '3 × 3m',
    dimensionNote: '3.0 × 3.0 m (300 × 300 cm)',
    aspectRatio: 1.0,
    physicalScaleFactor: 0.33,
    bounds: { left: 0.05, top: 0.05, width: 0.9, height: 0.9 },
    heightMm: 3000,
    widthMm: 3000,
    formFactor: 'sheet',
  },
];

// -------------------------------------------------------------
// WATER BOTTLE VARIANTS
// -------------------------------------------------------------
const BOTTLE_VARIANTS: MockupVariant[] = [
  {
    id: 'bottle-24oz',
    name: '24oz Tumbler',
    sizeLabel: '24oz',
    dimensionNote: 'Standard 24oz Insulated Tumbler',
    aspectRatio: 80 / 220,
    physicalScaleFactor: 1.0,
    bounds: { left: 0.12, top: 0.22, width: 0.76, height: 0.64 },
  },
  {
    id: 'bottle-32oz',
    name: '32oz Wide Mouth',
    sizeLabel: '32oz',
    dimensionNote: 'Heavy Duty 32oz Trail Bottle',
    aspectRatio: 92 / 240,
    physicalScaleFactor: 0.88,
    bounds: { left: 0.12, top: 0.24, width: 0.76, height: 0.62 },
  },
  {
    id: 'bottle-40oz',
    name: '40oz Travel Mug',
    sizeLabel: '40oz',
    dimensionNote: 'Large 40oz Commuter Mug with Handle',
    aspectRatio: 100 / 280,
    physicalScaleFactor: 0.75,
    bounds: { left: 0.14, top: 0.2, width: 0.72, height: 0.65 },
  },
];

// -------------------------------------------------------------
// FULL CATALOG DEFINITIONS
// -------------------------------------------------------------
export const MOCKUP_PRODUCTS: MockupProductDefinition[] = [
  // 1. PHONE
  {
    id: 'phone',
    name: 'Phone',
    categoryLabel: 'Smartphone Backplate',
    defaultVariantId: 'iphone-15-15pro',
    defaultColorId: 'phone-midnight',
    defaultStickerScale: 0.38,
    minScale: 0.15,
    maxScale: 0.85,
    variants: ALL_PHONE_VARIANTS,
    colors: [
      {
        id: 'phone-midnight',
        name: 'Midnight',
        hex: '#18181b',
        bodyHex: '#121217',
        accentHex: '#27272a',
        borderHex: '#3f3f46',
        contrastTone: 'light',
      },
      {
        id: 'phone-alpine',
        name: 'Alpine White',
        hex: '#f4f4f5',
        bodyHex: '#f8fafc',
        accentHex: '#e2e8f0',
        borderHex: '#cbd5e1',
        contrastTone: 'dark',
      },
      {
        id: 'phone-titanium',
        name: 'Natural Titanium',
        hex: '#a1a1aa',
        bodyHex: '#d4d4d8',
        accentHex: '#71717a',
        borderHex: '#9ca3af',
        contrastTone: 'dark',
      },
      {
        id: 'phone-violet',
        name: 'Deep Violet',
        hex: '#7c3aed',
        bodyHex: '#4c1d95',
        accentHex: '#3b0764',
        borderHex: '#8b5cf6',
        contrastTone: 'light',
      },
      {
        id: 'phone-sage',
        name: 'Forest Sage',
        hex: '#3f6212',
        bodyHex: '#2b440e',
        accentHex: '#1a2e05',
        borderHex: '#4d7c0f',
        contrastTone: 'light',
      },
      {
        id: 'phone-gold',
        name: 'Desert Gold',
        hex: '#eab308',
        bodyHex: '#ca8a04',
        accentHex: '#78350f',
        borderHex: '#facc15',
        contrastTone: 'dark',
      },
    ],
  },

  // 2. LAPTOP
  {
    id: 'laptop',
    name: 'Laptop',
    categoryLabel: 'Laptop Lid Surface',
    defaultVariantId: 'macbook-pro-14',
    defaultColorId: 'laptop-spacegray',
    defaultStickerScale: 0.28,
    minScale: 0.1,
    maxScale: 0.75,
    variants: ALL_LAPTOP_VARIANTS,
    colors: [
      {
        id: 'laptop-spacegray',
        name: 'Space Gray',
        hex: '#52525b',
        bodyHex: '#27272a',
        accentHex: '#3f3f46',
        borderHex: '#71717a',
        contrastTone: 'light',
      },
      {
        id: 'laptop-silver',
        name: 'Starlight Silver',
        hex: '#e4e4e7',
        bodyHex: '#e2e8f0',
        accentHex: '#cbd5e1',
        borderHex: '#94a3b8',
        contrastTone: 'dark',
      },
      {
        id: 'laptop-matteblack',
        name: 'Matte Stealth Black',
        hex: '#09090b',
        bodyHex: '#18181b',
        accentHex: '#27272a',
        borderHex: '#3f3f46',
        contrastTone: 'light',
      },
      {
        id: 'laptop-midnight',
        name: 'Midnight Blue',
        hex: '#1e293b',
        bodyHex: '#0f172a',
        accentHex: '#1e293b',
        borderHex: '#334155',
        contrastTone: 'light',
      },
    ],
  },

  // 3. WATER BOTTLE
  {
    id: 'bottle',
    name: 'Water Bottle',
    categoryLabel: 'Drinkware / Flask',
    defaultVariantId: 'bottle-24oz',
    defaultColorId: 'bottle-matteblack',
    defaultStickerScale: 0.45,
    minScale: 0.2,
    maxScale: 0.85,
    variants: BOTTLE_VARIANTS,
    colors: [
      {
        id: 'bottle-matteblack',
        name: 'Matte Obsidian',
        hex: '#18181b',
        bodyHex: '#27272a',
        accentHex: '#18181b',
        borderHex: '#3f3f46',
        contrastTone: 'light',
      },
      {
        id: 'bottle-stainless',
        name: 'Brushed Steel',
        hex: '#d4d4d8',
        bodyHex: '#e4e4e7',
        accentHex: '#71717a',
        borderHex: '#a1a1aa',
        contrastTone: 'dark',
      },
      {
        id: 'bottle-ocean',
        name: 'Pacific Blue',
        hex: '#0284c7',
        bodyHex: '#0369a1',
        accentHex: '#075985',
        borderHex: '#38bdf8',
        contrastTone: 'light',
      },
      {
        id: 'bottle-blush',
        name: 'Blush Rose',
        hex: '#f43f5e',
        bodyHex: '#e11d48',
        accentHex: '#be123c',
        borderHex: '#fb7185',
        contrastTone: 'light',
      },
      {
        id: 'bottle-emerald',
        name: 'Evergreen',
        hex: '#059669',
        bodyHex: '#047857',
        accentHex: '#065f46',
        borderHex: '#34d399',
        contrastTone: 'light',
      },
    ],
  },

  // 4. STICKER SHEET (Replaces Wall)
  {
    id: 'sheet',
    name: 'Sticker Sheet',
    categoryLabel: 'Custom Sheet Canvas',
    defaultVariantId: 'sheet-1x1m',
    defaultColorId: 'sheet-gloss-white',
    defaultStickerScale: 0.22,
    minScale: 0.08,
    maxScale: 0.9,
    variants: STICKER_SHEET_VARIANTS,
    colors: [
      {
        id: 'sheet-gloss-white',
        name: 'Gloss Vinyl (White)',
        hex: '#f8fafc',
        bodyHex: '#ffffff',
        accentHex: '#e2e8f0',
        borderHex: '#cbd5e1',
        contrastTone: 'dark',
      },
      {
        id: 'sheet-matte-white',
        name: 'Matte Vinyl (White)',
        hex: '#e2e8f0',
        bodyHex: '#f1f5f9',
        accentHex: '#cbd5e1',
        borderHex: '#94a3b8',
        contrastTone: 'dark',
      },
      {
        id: 'sheet-clear',
        name: 'Clear / Transparent Vinyl',
        hex: '#38bdf8',
        bodyHex: '#0f172a',
        accentHex: '#1e293b',
        borderHex: '#38bdf8',
        contrastTone: 'light',
      },
      {
        id: 'sheet-holo',
        name: 'Holographic Vinyl',
        hex: '#ec4899',
        bodyHex: '#1e1b4b',
        accentHex: '#f43f5e',
        borderHex: '#e879f9',
        contrastTone: 'light',
      },
      {
        id: 'sheet-kraft',
        name: 'Kraft Release Liner',
        hex: '#b45309',
        bodyHex: '#d4a373',
        accentHex: '#9c6644',
        borderHex: '#7f4f24',
        contrastTone: 'dark',
      },
    ],
  },
];
