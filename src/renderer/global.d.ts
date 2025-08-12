export {};

declare global {
  interface Window {
    electronAPI?: {
      clipboard?: {
        writeText?: (text: string) => void;
        readText?: () => string;
      };
  app?: { getName?: () => Promise<string>; };
  frontmostApp?: { getName?: () => Promise<string | undefined>; };
  background?: { isActive?: () => Promise<boolean>; onNew?: (cb: (payload: { text: string }) => void) => () => void; };
    };
  }
}
