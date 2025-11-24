// Type declarations for React extensions

declare module "react" {
  interface HTMLAttributes<T> {
    inert?: boolean | undefined;
  }
}

export {};

