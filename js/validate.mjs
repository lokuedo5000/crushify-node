/**
 * Processes and validates image conversion options with improved error handling and type validation
 * @param {Function} resp - Response callback function
 * @param {Object} args - Input arguments object
 * @param {Object} [args.file] - File selection options
 * @param {Object} [args.folder] - Folder selection options
 * @param {Object} [args.dest] - Destination selection options
 * @returns {Promise<Object>} Processed options object
 * @throws {Error} If validation fails or process is interrupted
 */
async function optionsConvert(resp, args = {}, others) {
  // Constants for configuration
  const CONFIG = {
    MAX_EFFORT: 6,
    MAX_QUALITY: 100,
    MAX_COMPRESSION: 10,
    SUPPORTED_FORMATS: ["png", "jpg", "jpeg", "webp", "avif", "tiff", "gif"],
    DEFAULT_FORMAT: "png",
    DEFAULT_QUALITY: 80,
    DEFAULT_EFFORT: 4,
  };

  // Initialize parser with default values
  const parser = {
    file: false,
    folder: false,
    dest: false,
    format: CONFIG.DEFAULT_FORMAT,
    processingOptions: {
      quality: CONFIG.DEFAULT_QUALITY,
      effort: CONFIG.DEFAULT_EFFORT,
    },
  };

  try {
    // Process input arguments
    const indexArgs = Object.keys(args);
    for (const index of indexArgs) {
      if (!args[index] || !args[index].value) continue;

      switch (index.toLowerCase()) {
        case "level":
          parser.processingOptions.effort = Math.min(
            args[index].value,
            CONFIG.MAX_EFFORT
          );
          break;
        case "quality":
          parser.processingOptions.quality = Math.min(
            args[index].value,
            CONFIG.MAX_QUALITY
          );
          break;
        case "pnglevel":
          parser.processingOptions.compressionLevel = Math.min(
            args[index].value,
            CONFIG.MAX_COMPRESSION
          );
          break;
        case "format":
          const format = args[index].value.toLowerCase();
          if (
            others.supportedFormats ||
            CONFIG.SUPPORTED_FORMATS.includes(format)
          ) {
            parser.format = format;
          }
          break;
        default:
          parser[index] = args[index].value;
      }
    }

    // Validate file/folder selection based on original logic
    if (
      (parser.file === true &&
        parser.folder !== true &&
        typeof parser.folder !== "string") ||
      (parser.folder === true &&
        parser.file !== true &&
        typeof parser.file !== "string") ||
      (typeof parser.file === "string" &&
        typeof parser.folder !== "string" &&
        parser.folder !== true) ||
      (typeof parser.folder === "string" &&
        typeof parser.file !== "string" &&
        parser.file !== true)
    ) {
      // Handle file selection
      if (parser.file === true) {
        const selectedFile = await FILE_SELECT.selectFile({
          title: "Select Image File",
          filters: [
            {
              name: "Images",
              extensions: others.supportedFormats || CONFIG.SUPPORTED_FORMATS,
            },
          ],
          defaultPath: FILE_SELECT.getFolder("pictures"),
        });

        if (selectedFile === null) {
          throw new Error("Process interrupted: File selection cancelled.");
        }
        parser.file = selectedFile;
      }

      // Handle folder selection
      if (parser.folder === true) {
        const selectedFolder = await FILE_SELECT.selectDirectory({
          title: "Select Images Folder",
          defaultPath: FILE_SELECT.getFolder("pictures"),
          buttonLabel: "Select",
        });

        if (selectedFolder === null) {
          throw new Error("Process interrupted: Folder selection cancelled.");
        }
        parser.folder = selectedFolder;
      }
    } else if (parser.file === false && parser.folder === false) {
      // Default to file selection if neither is specified
      const selectedFile = await FILE_SELECT.selectFile({
        title: "Select Image File",
        filters: [
          {
            name: "Images",
            extensions: others.supportedFormats || CONFIG.SUPPORTED_FORMATS,
          },
        ],
        defaultPath: FILE_SELECT.getFolder("pictures"),
      });

      if (selectedFile === null) {
        throw new Error("Process interrupted: File selection cancelled.");
      }
      parser.file = selectedFile;
    } else {
      throw new Error(
        "Only one argument (--file or --folder) can be used, not both at the same time."
      );
    }

    // Handle destination selection
    if (parser.dest === false || parser.dest === true) {
      const selectedDest = await FILE_SELECT.selectDirectory({
        title: "Select Destination",
        defaultPath: FILE_SELECT.getFolder("home"),
        buttonLabel: "Select",
      });

      if (selectedDest === null) {
        throw new Error(
          "Process interrupted: Destination selection cancelled."
        );
      }
      parser.dest = selectedDest;
    }

    return parser;
  } catch (error) {
    throw new Error(error.message);
  }
}

export default optionsConvert;
