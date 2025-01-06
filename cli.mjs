/**
 * Combina los argumentos predeterminados con los actuales eliminando duplicados por clave.
 * @param {string[]} defaultArgs - Argumentos predeterminados (con valores).
 * @param {string[]} allargs - Argumentos actuales que podrían sobrescribir los predeterminados.
 * @returns {string[]} - Lista completa de argumentos combinados.
 */
function filterDefaultArgs(defaultArgs, allargs) {
  // Filtrar los argumentos predeterminados que no deben estar en el resultado final
  const filteredDefaults = defaultArgs.filter((defaultArg) => {
    const defaultKey = defaultArg.split("=")[0]; // Obtiene la clave del argumento (antes del "=")
    // Retorna solo los predeterminados que no están presentes en allargs
    return !allargs.some((arg) => arg.startsWith(defaultKey));
  });

  // Combinar los predeterminados filtrados con los argumentos actuales
  return [...filteredDefaults, ...allargs];
}

// config.mjs
export const CONFIG_COMMANDS = {
  version: "1.0.0",
  name: "crushify",
  prefix: "crushify",
  supportedFormats: ["jpg", "jpeg", "png", "webp", "gif", "bmp"],
  defaultQuality: 80,
  maxSize: 5120, // 5MB en KB
};

// commands.mjs
export default [
  {
    name: "png",
    prefix: "png",
    description:
      "Convierte imágenes de diversos formatos soportados al formato PNG, permitiendo ajustar el nivel de compresión para optimizar el tamaño del archivo final.",
    titleUse: "Ejemplo de uso de png",
    use: [
      "Convertir un archivo específico con calidad y formato definidos:\n" +
        "crushify png --file=imagen.jpg --pnglevel=9\n" +
        "# Convierte imagen.jpg al formato PNG con el nivel máximo de compresión (9).",

      "Convertir todos los archivos de una carpeta con esfuerzo personalizado:\n" +
        "crushify png --folder=imagenes/ --dest=output/ --pnglevel=5\n" +
        "# Convierte todas las imágenes en la carpeta imagenes/ al formato PNG con un nivel de compresión de 5 y las guarda en la carpeta output/.",

      "Convertir con selección interactiva de archivo:\n" +
        "crushify png --file=true --pnglevel=7\n" +
        "# Abre un selector de archivos para elegir la imagen a convertir y la guarda con un nivel de compresión de 7.",

      "Convertir con selección interactiva de carpeta:\n" +
        "crushify png --folder=true --dest=true --pnglevel=3\n" +
        "# Abre un selector de carpetas, convierte las imágenes seleccionadas al formato PNG con un nivel de compresión de 3 y permite elegir la carpeta de destino.",
    ],
    handler: async function (send, [command, named, ...allargs] = args) {
      // Opciones predeterminadas
      const defaultArgs = ["--pnglevel=5", "--format=png"];
      const filteredDefaultArgs = filterDefaultArgs(defaultArgs, allargs);

      send({
        name: command,
        args: filteredDefaultArgs,
        fileload: "js;convert.mjs",
        supportedFormats: ["jpg", "jpeg", "gif", "heif", "webp", "tiff", "avif"],
      });
      return {
        message: `Processing...`,
        type: "system",
      };
    },
  },
  {
    name: "jpeg",
    prefix: "jpeg",
    description:
      "Convierte y optimiza imágenes al formato JPG/JPEG con control de calidad y opciones avanzadas de compresión.",
    titleUse: "Ejemplo de uso de jpeg",
    use: [
      "Convertir imagen con calidad personalizada:\n" +
        "crushify jpeg --file=imagen.png --dest=output/ --quality=80\n" +
        "# Convierte imagen.png al formato JPEG con un 80% de calidad y la guarda en la carpeta output/.",

      "Convertir múltiples imágenes en una carpeta:\n" +
        "crushify jpeg --folder=imagenes/ --dest=output/ --quality=70\n" +
        "# Convierte todas las imágenes en la carpeta imagenes/ al formato JPEG con un 70% de calidad y las guarda en la carpeta output/.",

      "Convertir con selección interactiva de archivo:\n" +
        "crushify jpeg --file=true --quality=60\n" +
        "# Abre un selector de archivos, permite seleccionar la imagen y la guarda como JPEG con un 60% de calidad.",

      "Convertir con selección interactiva de carpeta:\n" +
        "crushify jpeg --folder=true --dest=true --quality=90\n" +
        "# Abre un selector de carpetas, convierte las imágenes seleccionadas a JPEG con un 90% de calidad y permite elegir la carpeta de destino.",
    ],
    handler: async function (send, [command, named, ...allargs] = args) {
      // Opciones predeterminadas para JPEG
      const defaultArgs = ["--quality=80", "--format=jpeg"];
      const filteredDefaultArgs = filterDefaultArgs(defaultArgs, allargs);

      send({
        name: command,
        args: filteredDefaultArgs,
        fileload: "js;convert.mjs",
        supportedFormats: ["png", "gif", "heif", "webp", "tiff", "avif"],
      });
      return {
        message: `Processing...`,
        type: "system",
      };
    },
  },
  {
    name: "webp",
    prefix: "webp",
    description:
      "Convierte imágenes al formato moderno WebP para optimizar el tamaño y mantener la calidad.",
    titleUse: "Ejemplo de uso de webp",
    use: [
      "Convertir un archivo específico con calidad y formato definidos:\n" +
        "crushify webp --file=imagen.png --quality=80 --format=webp\n" +
        "# Convierte imagen.png a WebP con una calidad del 80%.",

      "Convertir todos los archivos de una carpeta con esfuerzo personalizado:\n" +
        "crushify webp --folder=imagenes/ --dest=output/ --quality=75\n" +
        "# Convierte todas las imágenes en la carpeta imagenes/ al formato WebP con una calidad del 75% y las guarda en la carpeta output/.",

      "Convertir con selección interactiva de archivo:\n" +
        "crushify webp --file=true --quality=60\n" +
        "# Abre un selector de archivos, convierte la imagen seleccionada a WebP con calidad del 60%.",

      "Convertir con selección interactiva de carpeta:\n" +
        "crushify webp --folder=true --dest=true --quality=90\n" +
        "# Abre un selector de carpetas, convierte las imágenes seleccionadas a WebP con calidad del 90% y permite elegir la carpeta de destino.",
    ],
    handler: async function (send, [command, named, ...allargs] = args) {
      // Opciones predeterminadas para WebP
      const defaultArgs = ["--quality=80", "--format=webp"];
      const filteredDefaultArgs = filterDefaultArgs(defaultArgs, allargs);

      send({
        name: command,
        args: filteredDefaultArgs,
        fileload: "js;convert.mjs",
      });
      return {
        message: `Processing...`,
        type: "system",
      };
    },
  },
  {
    name: "gif",
    prefix: "gif",
    description:
      "Convierte imágenes estáticas o animadas al formato GIF, adecuado para web y optimización visual.",
    titleUse: "Ejemplo de uso de gif",
    use: [
      "Convertir un archivo específico con calidad y formato definidos:\n" +
        "crushify gif --file=imagen.jpg --format=gif\n" +
        "# Convierte imagen.jpg al formato GIF.",

      "Convertir todos los archivos de una carpeta:\n" +
        "crushify gif --folder=imagenes/ --dest=output/ --format=gif\n" +
        "# Convierte todas las imágenes en la carpeta imagenes/ al formato GIF y las guarda en la carpeta output/.",

      "Convertir con selección interactiva de archivo:\n" +
        "crushify gif --file=true --format=gif\n" +
        "# Abre un selector de archivos, permite seleccionar la imagen y la guarda como GIF.",

      "Convertir con selección interactiva de carpeta:\n" +
        "crushify gif --folder=true --dest=true --format=gif\n" +
        "# Abre un selector de carpetas, convierte las imágenes seleccionadas a GIF y permite elegir la carpeta de destino.",
    ],
    handler: async function (send, [command, named, ...allargs] = args) {
      // Opciones predeterminadas para GIF
      const defaultArgs = ["--format=gif"];
      const filteredDefaultArgs = filterDefaultArgs(defaultArgs, allargs);

      send({
        name: command,
        args: filteredDefaultArgs,
        fileload: "js;convert.mjs",
        supportedFormats: ["png", "heif", "webp", "tiff", "avif"],
      });
      return {
        message: `Processing...`,
        type: "system",
      };
    },
  },
  // {
  //   name: "bmp",
  //   prefix: "bmp",
  //   description:
  //     "Convierte imágenes de diversos formatos al formato BMP para la compatibilidad con sistemas antiguos o aplicaciones específicas.",
  //   titleUse: "Ejemplo de uso de bmp",
  //   use: [
  //     "Convertir un archivo específico:\n" +
  //       "crushify bmp --file=imagen.png --format=bmp\n" +
  //       "# Convierte imagen.png al formato BMP.",

  //     "Convertir todos los archivos de una carpeta:\n" +
  //       "crushify bmp --folder=imagenes/ --dest=output/ --format=bmp\n" +
  //       "# Convierte todas las imágenes en la carpeta imagenes/ al formato BMP y las guarda en la carpeta output/.",

  //     "Convertir con selección interactiva de archivo:\n" +
  //       "crushify bmp --file=true --format=bmp\n" +
  //       "# Abre un selector de archivos, permite seleccionar la imagen y la guarda como BMP.",

  //     "Convertir con selección interactiva de carpeta:\n" +
  //       "crushify bmp --folder=true --dest=true --format=bmp\n" +
  //       "# Abre un selector de carpetas, convierte las imágenes seleccionadas a BMP y permite elegir la carpeta de destino.",
  //   ],
  //   handler: async function () {},
  // },
  // {
  //   name: "avif",
  //   prefix: "avif",
  //   description:
  //     "Convierte imágenes a formato AVIF para una compresión eficiente y calidad superior.",
  //   titleUse: "Ejemplo de uso de avif",
  //   use: [
  //     "Convertir un archivo específico:\n" +
  //       "crushify avif --file=imagen.png --format=avif\n" +
  //       "# Convierte imagen.png al formato AVIF.",

  //     "Convertir todos los archivos de una carpeta:\n" +
  //       "crushify avif --folder=imagenes/ --dest=output/ --format=avif\n" +
  //       "# Convierte todas las imágenes en la carpeta imagenes/ al formato AVIF y las guarda en la carpeta output/.",

  //     "Convertir con selección interactiva de archivo:\n" +
  //       "crushify avif --file=true --format=avif\n" +
  //       "# Abre un selector de archivos, permite seleccionar la imagen y la guarda como AVIF.",

  //     "Convertir con selección interactiva de carpeta:\n" +
  //       "crushify avif --folder=true --dest=true --format=avif\n" +
  //       "# Abre un selector de carpetas, convierte las imágenes seleccionadas a AVIF y permite elegir la carpeta de destino.",
  //   ],
  //   handler: async function () {},
  // },
];
