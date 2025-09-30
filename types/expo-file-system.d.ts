declare module "expo-file-system" {
  export const documentDirectory: string;

  interface CopyOptions {
    from: string;
    to: string;
  }

  interface MakeDirectoryOptions {
    intermediates?: boolean;
  }

  interface WriteAsStringOptions {
    encoding?: "utf8" | "base64";
  }

  interface FileInfo {
    exists: boolean;
    isDirectory: boolean;
    modificationTime?: number;
    size?: number;
    uri: string;
  }

  export function deleteAsync(fileUri: string, options?: { idempotent?: boolean }): Promise<void>;
  export function makeDirectoryAsync(dirUri: string, options?: MakeDirectoryOptions): Promise<void>;
  export function copyAsync(options: CopyOptions): Promise<void>;
  export function writeAsStringAsync(
    fileUri: string,
    data: string,
    options?: WriteAsStringOptions
  ): Promise<void>;
  export function getInfoAsync(fileUri: string, options?: { md5?: boolean; size?: boolean }): Promise<FileInfo>;
}