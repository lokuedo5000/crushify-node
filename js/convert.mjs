import { dynamicImport } from "../utils/loadModule.mjs";
import path from "path";
import optionsConvert from "./validate.mjs";

/**
 * Main execution function for image processing
 * @param {Function} resp - Response callback
 * @param {Object} args - Input arguments
 */
async function run(resp, args, others) {
  try {
    // Import ImageProcessor dynamically
    const processor = await dynamicImport("../main.mjs", "default");

    // Set up event handlers
    processor.on("error", (error) => {
      resp({
        message: `Processing error: ${error.message}`,
        type: "error",
      });
    });

    // Get and validate options
    const opt = await optionsConvert(resp, args, others);

    if (!opt) return;
    // Progress callback for batch processing
    const progressCallback = ({ file, progress, result }) => {
      resp({
        message: `Processing ${file}: ${progress.toFixed(1)}%\n${
          result.message
        }`,
        type: "progress",
      });
    };

    // Process based on input type
    try {
      let result;

      if (opt.folder !== false) {
        // Folder processing
        result = await processor.processFolder(
          {
            folder: opt.folder,
            dest: opt.dest,
            format: opt.format,
            processingOptions: opt.processingOptions,
          },
          progressCallback
        );

        // Generate summary
        const stats = processor.getStats();
        const summary = `Processing complete:
          - Files processed: ${stats.processed}
          - Files skipped: ${stats.skipped}
          - Failed: ${stats.failed}
          - Total time: ${stats.processingTime}s
          - Average saving: ${stats.averageSaving}
        `;

        resp({
          message: summary,
          type: "success",
        });
      } else {
        // Single file processing
        const getFormat = processor.getFormt(opt.format);
        const output = path.join(
          opt.dest,
          `${path.basename(opt.file, path.extname(opt.file))}${
            getFormat.extension
          }`
        );

        result = await processor.processFile({
          input: opt.file,
          output,
          format: opt.format,
          processingOptions: opt.processingOptions,
        });

        resp({
          message: result.message,
          type: result.success ? "success" : "error",
        });
      }
    } catch (error) {
      resp({
        message: `Processing failed: ${error.message}`,
        type: "error",
      });
    } finally {
      // Clean up
      processor.clearCache();
      processor.resetStats();
    }
  } catch (error) {
    resp({
      message: `System error: ${error.message}`,
      type: "error",
    });
  }
}

/**
 * Helper function to validate supported formats
 * @param {string} format - Format to validate
 * @returns {boolean} - Whether format is supported
 */
function isSupportedFormat(format) {
  return ["png", "webp", "jpeg", "avif"].includes(format.toLowerCase());
}

export default { run };
