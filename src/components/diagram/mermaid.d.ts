// Minimal type declaration for mermaid to satisfy TypeScript
declare module 'mermaid' {
  export type Config = {
    startOnLoad?: boolean;
    securityLevel?: 'loose' | 'strict';
    theme?: string;
    themeVariables?: Record<string, string>;
  };
  export function initialize(config: Config): void;
  export function render(id: string, definition: string): Promise<{ svg: string; bindFunctions?: (element: Element) => void }>;
  const _default: any;
  export default _default;
}


