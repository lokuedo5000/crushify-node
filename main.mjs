import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import EventEmitter from "events";

/**
 * @typedef {Object} ProcessingOptions
 * @property {number} [quality] - Quality setting for lossy formats (1-100)
 * @property {boolean} [lossless] - Use lossless compression when available
 * @property {number} [effort] - Compression effort level (0-6)
 * @property {boolean} [progressive] - Enable progressive loading
 * @property {string} [chromaSubsampling] - Chroma subsampling ratio
 * @property {boolean} [mozjpeg] - Use mozjpeg encoder
 * @property {boolean} [remove] - Remove original file after processing
 */

/**
 * @typedef {Object} ProcessingResult
 * @property {boolean} success - Whether the operation was successful
 * @property {string} message - Status message
 * @property {Object} [stats] - Processing statistics
 * @property {number} [stats.inputSize] - Original file size in bytes
 * @property {number} [stats.outputSize] - Processed file size in bytes
 * @property {number} [stats.savedSize] - Bytes saved
 * @property {string} [stats.savingPercent] - Percentage saved/increased
 * @property {Error} [error] - Error object if operation failed
 */

class ImageProcessor extends EventEmitter {
  /**
   * Supported format mappings for different conversion types
   * @private
   * @readonly
   */
  static #FORMAT_MAPPINGS = {
    jpeg: {
      supportedInputs: [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".tiff",
        ".avif",
        ".gif",
        ".svg",
      ],
      defaultQuality: 80,
      extension: ".jpg",
      options: {
        progressive: true,
        chromaSubsampling: "4:4:4",
        mozjpeg: true,
      },
    },
    png: {
      supportedInputs: [
        ".jpg",
        ".jpeg",
        ".webp",
        ".tiff",
        ".avif",
        ".gif",
        ".svg",
      ],
      defaultQuality: 100,
      extension: ".png",
      options: {
        compressionLevel: 6,
        palette: true,
      },
    },
    webp: {
      supportedInputs: [
        ".jpg",
        ".jpeg",
        ".png",
        ".tiff",
        ".avif",
        ".gif",
        ".svg",
      ],
      defaultQuality: 80,
      extension: ".webp",
      options: {
        lossless: false,
        effort: 4,
        nearLossless: false,
        alphaQuality: 100,
      },
    },
    avif: {
      supportedInputs: [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".tiff",
        ".gif",
        ".svg",
      ],
      defaultQuality: 65,
      extension: ".avif",
      options: {
        effort: 4,
        chromaSubsampling: "4:4:4",
        lossless: false,
      },
    },
    tiff: {
      supportedInputs: [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".avif",
        ".gif",
        ".svg",
      ],
      defaultQuality: 100,
      extension: ".tiff",
      options: {
        compression: "lzw",
        quality: 100,
        pyramid: false,
        tile: false,
      },
    },
    gif: {
      supportedInputs: [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".tiff",
        ".avif",
        ".svg",
      ],
      defaultQuality: 100,
      extension: ".gif",
      options: {
        colours: 256,
        dither: 1,
      },
    },
    svg: {
      supportedInputs: [
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
        ".tiff",
        ".avif",
        ".gif",
      ],
      defaultQuality: 100,
      extension: ".svg",
      options: {
        density: 300,
      },
    },
  };

  /**
   * Processing statistics
   * @private
   */
  #stats = {
    processed: 0,
    failed: 0,
    skipped: 0,
    totalSaved: 0,
    startTime: null,
    endTime: null,
  };

  /**
   * Cache for processed files
   * @private
   */
  #cache = new Map();

  /**
   * Default processing options
   * @private
   * @readonly
   */
  #defaultOptions = {
    quality: 80,
    lossless: false,
    effort: 4,
    progressive: true,
    chromaSubsampling: "4:4:4",
    mozjpeg: true,
    remove: false,
  };

  constructor() {
    super();
    this.#bindEventHandlers();
  }

  /**
   * Bind event handlers
   * @private
   */
  #bindEventHandlers() {
    this.on("error", this.#handleError.bind(this));
    this.on("processing:start", this.#handleProcessingStart.bind(this));
    this.on("processing:complete", this.#handleProcessingComplete.bind(this));
  }

  /**
   * Validates and processes an image file
   * @private
   * @param {string} filePath - Path to input file
   * @param {string} outputPath - Path for output file
   * @param {ProcessingOptions} options - Processing options
   * @returns {Promise<ProcessingResult>}
   */
  async #processImage(filePath, outputPath, options) {
    try {
      await this.#validateFile(filePath);

      const inputSize = (await fs.stat(filePath)).size;
      const cacheKey = `${filePath}:${JSON.stringify(options)}`;

      if (this.#cache.has(cacheKey)) {
        this.#stats.skipped++;
        return this.#cache.get(cacheKey);
      }

      const { format, ...allOptions } = options;

      await sharp(filePath)
        .withMetadata()
        .rotate() // Auto-rotate based on EXIF
        .toFormat(path.extname(outputPath).slice(1), allOptions)
        .toFile(outputPath);

      // await sharp(filePath)[format](allOptions).toFile(outputPath);

      const outputSize = (await fs.stat(outputPath)).size;
      const result = this.#generateResult(filePath, inputSize, outputSize);

      if (options.remove) {
        await fs.unlink(filePath);
      }

      this.#cache.set(cacheKey, result);
      this.#stats.processed++;
      this.#stats.totalSaved += result.stats.savedSize;

      return result;
    } catch (error) {
      this.#stats.failed++;
      throw this.#enhanceError(error, filePath);
    }
  }

  /**
   * Validates file existence and permissions
   * @private
   * @param {string} filePath - Path to file
   */
  async #validateFile(filePath) {
    try {
      await fs.access(filePath, fs.constants.R_OK);
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error("Path is not a file");
      }
    } catch (error) {
      throw new Error(`Invalid file path: ${error.message}`);
    }
  }

  /**
   * Validates format compatibility
   * @private
   * @param {string} inputPath - Input file path
   * @param {string} format - Target format
   */
  #validateFormat(inputPath, format) {
    const inputExt = path.extname(inputPath).toLowerCase();
    const formatConfig = ImageProcessor.#FORMAT_MAPPINGS[format.toLowerCase()];

    if (!formatConfig) {
      throw new Error(`Unsupported output format: ${format}`);
    }

    if (!formatConfig.supportedInputs.includes(inputExt)) {
      throw new Error(
        `Cannot convert ${inputExt} to ${format}. Supported input formats: ${formatConfig.supportedInputs.join(
          ", "
        )}`
      );
    }

    return formatConfig;
  }

    /**
   * get format
   * @public
   * @param {string} format - Target format
   */
  getFormt(format) {
    const formatConfig = ImageProcessor.#FORMAT_MAPPINGS[format.toLowerCase()];
    return formatConfig;
  }

  /**
   * Generates standardized processing result
   * @private
   */
  #generateResult(filePath, inputSize, outputSize) {
    const savedSize = inputSize - outputSize;
    const savingPercent = ((savedSize / inputSize) * 100).toFixed(1);
    const fileName = path.basename(filePath);

    return {
      success: true,
      message: this.#formatResultMessage(
        fileName,
        inputSize,
        outputSize,
        savingPercent
      ),
      stats: {
        inputSize,
        outputSize,
        savedSize,
        savingPercent:
          savedSize < 0 ? `+${Math.abs(savingPercent)}` : `-${savingPercent}`,
      },
    };
  }

  /**
   * Formats result message
   * @private
   */
  #formatResultMessage(fileName, inputSize, outputSize, savingPercent) {
    const prefix =
      outputSize > inputSize ? "⚠️ Size increased" : "✅ Size reduced";
    return `${prefix} - ${fileName}
    Original: ${(inputSize / 1024).toFixed(2)}KB
    New: ${(outputSize / 1024).toFixed(2)}KB
    Change: ${outputSize > inputSize ? "+" : "-"}${Math.abs(savingPercent)}%`;
  }

  /**
   * Enhances error with context
   * @private
   */
  #enhanceError(error, filePath) {
    const enhancedError = new Error(
      `Processing failed for ${filePath}: ${error.message}`
    );
    enhancedError.originalError = error;
    enhancedError.filePath = filePath;
    return enhancedError;
  }

  /**
   * Event handlers
   * @private
   */
  #handleError(error) {
    console.error("Processing error:", error);
  }

  #handleProcessingStart() {
    this.#stats.startTime = Date.now();
  }

  #handleProcessingComplete() {
    this.#stats.endTime = Date.now();
  }

  /**
   * Process a single image file
   * @public
   * @param {Object} options - Processing options
   * @param {string} options.input - Input file path
   * @param {string} options.output - Output file path (optional)
   * @param {string} options.format - Target format (png, webp, jpeg, avif)
   * @param {ProcessingOptions} [options.processingOptions] - Processing options
   * @returns {Promise<ProcessingResult>}
   */
  async processFile(options) {
    const { input, format, processingOptions = {} } = options;

    this.emit("processing:start");

    try {
      const formatConfig = this.#validateFormat(input, format);

      // Determine output path

      const output =
        options.output ||
        path.join(
          path.dirname(input),
          `${path.basename(input, path.extname(input))}${
            formatConfig.extension
          }`
        );

      // Ensure output directory exists
      await fs.mkdir(path.dirname(output), { recursive: true });

      // Merge options
      const mergedOptions = {
        // ...this.#defaultOptions,
        ...formatConfig.options,
        quality: formatConfig.defaultQuality,
        format,
        ...processingOptions,
      };

      const result = await this.#processImage(input, output, mergedOptions);

      this.emit("processing:complete");
      return result;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * Process a folder of images
   * @public
   * @param {Object} options - Processing options
   * @param {string} options.folder - Input folder path
   * @param {string} options.dest - Output folder path
   * @param {string} options.format - Target format (png, webp, jpeg, avif)
   * @param {ProcessingOptions} [options.processingOptions] - Processing options
   * @param {Function} [progressCallback] - Progress callback
   * @returns {Promise<ProcessingResult[]>}
   */
  async processFolder(options, progressCallback = null) {
    const { folder, dest, format } = options;

    const formatConfig = ImageProcessor.#FORMAT_MAPPINGS[format.toLowerCase()];

    if (!formatConfig) {
      throw new Error(`Unsupported format: ${format}`);
    }

    this.emit("processing:start");

    try {
      await fs.mkdir(dest, { recursive: true });
      const files = await fs.readdir(folder);

      const imageFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return formatConfig.supportedInputs.includes(ext);
      });

      const results = [];
      for (const [index, file] of imageFiles.entries()) {
        const input = path.join(folder, file);
        const output = path.join(
          dest,
          `${path.basename(file, path.extname(file))}${formatConfig.extension}`
        );

        try {
          const result = await this.processFile({
            input,
            output,
            format,
            processingOptions: options.processingOptions,
          });

          results.push(result);

          if (progressCallback) {
            progressCallback({
              file,
              progress: ((index + 1) / imageFiles.length) * 100,
              result,
            });
          }
        } catch (error) {
          results.push({
            success: false,
            message: error.message,
            error,
          });
        }
      }

      this.emit("processing:complete");
      return results;
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

  /**
   * Get processing statistics
   * @public
   * @returns {Object} Processing statistics
   */
  getStats() {
    return {
      ...this.#stats,
      processingTime: this.#stats.endTime
        ? (this.#stats.endTime - this.#stats.startTime) / 1000
        : null,
      averageSaving: this.#stats.processed
        ? (this.#stats.totalSaved / this.#stats.processed / 1024).toFixed(2) +
          " KB"
        : null,
    };
  }

  /**
   * Clear processing cache
   * @public
   */
  clearCache() {
    this.#cache.clear();
  }

  /**
   * Reset statistics
   * @public
   */
  resetStats() {
    this.#stats = {
      processed: 0,
      failed: 0,
      skipped: 0,
      totalSaved: 0,
      startTime: null,
      endTime: null,
    };
  }

  /**
   * Convenience methods for single files
   */
  async convertToPNG(input, output = null, options = {}) {
    return this.processFile({
      input,
      output,
      format: "png",
      processingOptions: options,
    });
  }

  async convertToWebP(input, output = null, options = {}) {
    return this.processFile({
      input,
      output,
      format: "webp",
      processingOptions: options,
    });
  }

  async convertToJPEG(input, output = null, options = {}) {
    return this.processFile({
      input,
      output,
      format: "jpeg",
      processingOptions: options,
    });
  }

  async convertToAVIF(input, output = null, options = {}) {
    return this.processFile({
      input,
      output,
      format: "avif",
      processingOptions: options,
    });
  }

  /**
   * Convenience methods for folders
   */
  async convertFolderToPNG(folder, dest, options = {}) {
    return this.processFolder({
      folder,
      dest,
      format: "png",
      processingOptions: options,
    });
  }

  async convertFolderToWebP(folder, dest, options = {}) {
    return this.processFolder({
      folder,
      dest,
      format: "webp",
      processingOptions: options,
    });
  }

  async convertFolderToJPEG(folder, dest, options = {}) {
    return this.processFolder({
      folder,
      dest,
      format: "jpeg",
      processingOptions: options,
    });
  }

  async convertFolderToAVIF(folder, dest, options = {}) {
    return this.processFolder({
      folder,
      dest,
      format: "avif",
      processingOptions: options,
    });
  }
}

export default ImageProcessor;
