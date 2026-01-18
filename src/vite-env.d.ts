/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  readonly GEMINI_API_KEY: string;
  readonly VITE_ROOBZ_API_KEY: string;
  readonly VITE_ROOBZ_API_ENDPOINT: string;
  // Add other env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
