export const env = {
    API_URL: import.meta.env.VITE_API_URL || 'http://localhost:4000/',
    IsProduction: import.meta.env.PROD,
    /** Base URL for R2 public assets (CDN). Used to build profile image URL from key after upload. */
    R2_PUBLIC_BASE_URL: import.meta.env.VITE_R2_PUBLIC_BASE_URL || '',
};
