// types/main.d.ts
import { EventEmitter } from 'events';

export interface ProcessingOptions {
  quality?: number;
  lossless?: boolean;
  effort?: number;
  progressive?: boolean;
  chromaSubsampling?: string;
  mozjpeg?: boolean;
  remove?: boolean;
}

export interface ProcessingResult {
  success: boolean;
  message: string;
  stats?: {
    inputSize: number;
    outputSize: number;
    savedSize: number;
    savingPercent: string;
  };
  error?: Error;
}

export interface ProcessFolderProgress {
  file: string;
  progress: number;
  result: ProcessingResult;
}

export default class ImageProcessor extends EventEmitter {
  constructor();
  
  processFile(options: {
    input: string;
    output?: string;
    format: string;
    processingOptions?: ProcessingOptions;
  }): Promise<ProcessingResult>;
  
  processFolder(
    options: {
      folder: string;
      dest: string;
      format: string;
      processingOptions?: ProcessingOptions;
    },
    progressCallback?: (progress: ProcessFolderProgress) => void
  ): Promise<ProcessingResult[]>;
  
  getStats(): {
    processed: number;
    failed: number;
    skipped: number;
    totalSaved: number;
    startTime: number | null;
    endTime: number | null;
    processingTime: number | null;
    averageSaving: string | null;
  };
  
  clearCache(): void;
  resetStats(): void;
  
  // Convenience methods
  convertToPNG(input: string, output?: string | null, options?: ProcessingOptions): Promise<ProcessingResult>;
  convertToWebP(input: string, output?: string | null, options?: ProcessingOptions): Promise<ProcessingResult>;
  convertToJPEG(input: string, output?: string | null, options?: ProcessingOptions): Promise<ProcessingResult>;
  convertToAVIF(input: string, output?: string | null, options?: ProcessingOptions): Promise<ProcessingResult>;
  
  convertFolderToPNG(folder: string, dest: string, options?: ProcessingOptions): Promise<ProcessingResult[]>;
  convertFolderToWebP(folder: string, dest: string, options?: ProcessingOptions): Promise<ProcessingResult[]>;
  convertFolderToJPEG(folder: string, dest: string, options?: ProcessingOptions): Promise<ProcessingResult[]>;
  convertFolderToAVIF(folder: string, dest: string, options?: ProcessingOptions): Promise<ProcessingResult[]>;
}