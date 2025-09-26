declare module 'expo-file-system' {
  export const documentDirectory: string;

  interface CopyOptions {
    from: string;
    to: string;
  }

  interface MakeDirectoryOptions {
    intermediates?: boolean;
  }

  export function deleteAsync(fileUri: string, options?: { idempotent?: boolean }): Promise<void>;
  export function makeDirectoryAsync(dirUri: string, options?: MakeDirectoryOptions): Promise<void>;
  export function copyAsync(options: CopyOptions): Promise<void>;
}