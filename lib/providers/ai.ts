import "server-only";

export interface GenerateTextInput {
  system?: string;
  input: string;
  maxOutputLength?: number;
}

export interface GenerateTextResult {
  text: string;
  model: string;
}

export interface GenerateStructuredInput<T> {
  system?: string;
  input: string;
  schema: {
    parse(value: unknown): T;
  };
  maxOutputLength?: number;
}

export interface AIService {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;

  generateStructured<T>(
    input: GenerateStructuredInput<T>
  ): Promise<T>;
}