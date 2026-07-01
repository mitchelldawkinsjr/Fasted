export type Viewport = {
  name: string;
  width: number;
  height: number;
};

/** Full matrix for overflow audit and nightly visual runs. */
export const AUDIT_VIEWPORTS: Viewport[] = [
  { name: 'iphone-se', width: 320, height: 568 },
  { name: 'short-mobile', width: 360, height: 640 },
  { name: 'iphone-13', width: 390, height: 844 },
  { name: 'pixel-7', width: 412, height: 915 },
  { name: 'iphone-13-landscape', width: 844, height: 390 },
  { name: 'iphone-14-pro-max', width: 430, height: 932 },
  { name: 'ipad-mini', width: 768, height: 1024 },
  { name: 'ipad-landscape', width: 1024, height: 768 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide', width: 1920, height: 1080 },
  { name: 'landscape-stress', width: 800, height: 360 },
];

/** Subset for PR mobile smoke tests. */
export const MOBILE_SMOKE_VIEWPORTS: Viewport[] = [
  { name: 'iphone-se', width: 320, height: 568 },
  { name: 'iphone-13', width: 390, height: 844 },
];
