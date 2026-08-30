declare module '@appdeploy/client' {
  export const api: {
    post(path: string, body?: unknown): Promise<{ data: any }>;
    get(path: string): Promise<{ data: any }>;
  };
}
