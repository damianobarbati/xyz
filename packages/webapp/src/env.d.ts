declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly APP_ENV: string;
  readonly APP_NAME: string;
  readonly APP_VERSION: string;
}
