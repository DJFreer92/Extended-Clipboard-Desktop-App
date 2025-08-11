export {};

declare global {
  interface Window {
    electronAPI?: {
      clipboard?: {
        writeText?: (text: string) => void;
        readText?: () => string;
      };
    };
  }
}
