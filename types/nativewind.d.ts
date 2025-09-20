declare module 'nativewind' {
  export const NativeWindStyleSheet: {
    setOutput: (config: { default: string }) => void;
    [key: string]: any;
  };
}