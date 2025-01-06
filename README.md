# Crushify Documentation

## Overview
The crushify is a robust Node.js class that provides high-performance image processing capabilities using the Sharp library. It extends EventEmitter to provide event-driven processing updates and includes comprehensive error handling, caching, and statistics tracking.

## Features
- Support for multiple image formats (PNG, WebP, JPEG, AVIF)
- Batch processing capabilities
- Progress tracking and statistics
- File validation and error handling
- Event-driven architecture
- Processing cache for optimization
- Configurable processing options
- Automatic output directory creation
- EXIF metadata preservation

## Installation

```javascript
import crushify from 'crushify';
```

## Core Concepts

### Format Support
The processor supports conversion between the following formats:

- **PNG**
  - Input formats: JPG, JPEG, GIF, WebP, TIFF, AVIF
  - Default quality: 100
  
- **WebP**
  - Input formats: JPG, JPEG, PNG, GIF, HEIF, TIFF, AVIF
  - Default quality: 80
  - Additional options: lossless, effort level, alpha quality
  
- **JPEG**
  - Input formats: PNG, GIF, HEIF, WebP, TIFF, AVIF
  - Default quality: 85
  - Additional options: progressive loading, chroma subsampling, mozjpeg optimization
  
- **AVIF**
  - Input formats: JPG, JPEG, PNG, GIF, WebP, TIFF
  - Default quality: 65
  - Additional options: effort level, chroma subsampling

<!-- ### Processing Options

```typescript
interface ProcessingOptions {
  quality?: number;      // Quality setting (1-100)
  lossless?: boolean;    // Enable lossless compression
  effort?: number;       // Compression effort (0-6)
  progressive?: boolean; // Enable progressive loading
  chromaSubsampling?: string; // Chroma subsampling ratio
  mozjpeg?: boolean;    // Use mozjpeg encoder
  remove?: boolean;     // Remove original after processing
}
```

### Processing Results

```typescript
interface ProcessingResult {
  success: boolean;      // Operation success status
  message: string;       // Status message
  stats?: {
    inputSize: number;   // Original file size (bytes)
    outputSize: number;  // Processed file size (bytes)
    savedSize: number;   // Bytes saved
    savingPercent: string; // Percentage saved/increased
  };
  error?: Error;         // Error object if failed
}
``` -->

## API Reference

### Constructor
```javascript
const processor = new crushify();
```

### Single File Processing

#### Process File
```javascript
async processFile({
  input: string,
  output?: string,
  format: 'png' | 'webp' | 'jpeg' | 'avif',
  processingOptions?: ProcessingOptions
}): Promise<ProcessingResult>
```

#### Convenience Methods
```javascript
async convertToPNG(input, output?, options?)
async convertToWebP(input, output?, options?)
async convertToJPEG(input, output?, options?)
async convertToAVIF(input, output?, options?)
```

### Batch Processing

#### Process Folder
```javascript
async processFolder({
  folder: string,
  dest: string,
  format: 'png' | 'webp' | 'jpeg' | 'avif',
  processingOptions?: ProcessingOptions
}, progressCallback?: Function): Promise<ProcessingResult[]>
```

#### Convenience Methods
```javascript
async convertFolderToPNG(folder, dest, options?)
async convertFolderToWebP(folder, dest, options?)
async convertFolderToJPEG(folder, dest, options?)
async convertFolderToAVIF(folder, dest, options?)
```

### Utility Methods

#### Get Statistics
```javascript
getStats(): {
  processed: number,
  failed: number,
  skipped: number,
  totalSaved: number,
  processingTime: number | null,
  averageSaving: string | null
}
```

#### Cache Management
```javascript
clearCache(): void
resetStats(): void
```

## Events

The processor emits the following events:

- `processing:start`: Emitted when processing begins
- `processing:complete`: Emitted when processing finishes
- `error`: Emitted when an error occurs

## Usage Examples

### Basic Single File Conversion
```javascript
const processor = new crushify();

try {
  const result = await processor.convertToWebP('input.jpg', 'output.webp', {
    quality: 85,
    lossless: false
  });
  console.log(result.message);
} catch (error) {
  console.error('Conversion failed:', error.message);
}
```

### Batch Processing with Progress
```javascript
const processor = new crushify();

try {
  const results = await processor.convertFolderToAVIF(
    './input',
    './output',
    {
      quality: 70,
      effort: 6
    },
    ({ file, progress, result }) => {
      console.log(`Processing ${file}: ${progress.toFixed(1)}%`);
    }
  );
  
  console.log(`Processed ${results.length} files`);
} catch (error) {
  console.error('Batch processing failed:', error.message);
}
```

### Custom Format Processing
```javascript
const processor = new crushify();

try {
  const result = await processor.processFile({
    input: 'input.png',
    output: 'output.webp',
    format: 'webp',
    processingOptions: {
      quality: 90,
      effort: 6,
      lossless: true,
      progressive: true
    }
  });
  
  console.log(result.stats);
} catch (error) {
  console.error('Processing failed:', error.message);
}
```

## Error Handling

The processor includes comprehensive error handling:

1. **File Validation**: Checks file existence and permissions
2. **Format Validation**: Verifies format compatibility
3. **Processing Errors**: Captures and enhances Sharp processing errors
4. **Event Emission**: Emits error events for monitoring

Errors include:
- Invalid file paths
- Unsupported format conversions
- Processing failures
- File system errors

## Performance Considerations

1. **Caching**
   - Processed results are cached using input path and options as key
   - Identical processing requests use cached results
   - Cache can be cleared manually using `clearCache()`

2. **Statistics**
   - Processing statistics are maintained automatically
   - Available via `getStats()` method
   - Include counts, timing, and storage savings
   - Can be reset using `resetStats()`

3. **Memory Usage**
   - Streams are used for file processing
   - Cache should be cleared for long-running processes
   - Consider batch size in folder processing

## Best Practices

1. **Error Handling**
   ```javascript
   try {
     await processor.processFile(options);
   } catch (error) {
     if (error.originalError) {
       // Handle Sharp-specific errors
     }
     // Handle general errors
   }
   ```

2. **Resource Management**
   ```javascript
   // Clear cache periodically for long-running processes
   setInterval(() => processor.clearCache(), 3600000);
   ```

3. **Progress Monitoring**
   ```javascript
   processor.on('processing:start', () => console.log('Started'));
   processor.on('processing:complete', () => console.log('Completed'));
   processor.on('error', (error) => console.error(error));
   ```

## License
This code is provided under the MIT License. See the LICENSE file for details.