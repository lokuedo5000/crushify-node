// dynamicModuleLoader.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { EventEmitter } from "events";

class DynamicModuleLoader extends EventEmitter {
  constructor(options = {}) {
    super();
    this.moduleCache = new Map();
    this.watchedFiles = new Map();
    this.moduleInstances = new Map();
    this.debounceTimers = new Map();
    this.moduleErrors = new Map();
    this.isInitialized = false;

    this.logSet = options.logSet || false;
  }

  #pathCache = new Map();
  resolveModulePath(modulePath, callerFile) {
    const cacheKey = `${callerFile}:${modulePath}`;
    if (this.#pathCache.has(cacheKey)) {
      return this.#pathCache.get(cacheKey);
    }

    const callerDir = path.dirname(callerFile);
    const resolvedPath = path.resolve(callerDir, modulePath);

    this.#pathCache.set(cacheKey, resolvedPath);
    return resolvedPath;
  }

  #moduleVersions = new Map();
  async #updateModuleVersion(absolutePath) {
    const stats = await fs.promises.stat(absolutePath);
    const newVersion = stats.mtimeMs;
    const currentVersion = this.#moduleVersions.get(absolutePath);

    if (newVersion !== currentVersion) {
      this.#moduleVersions.set(absolutePath, newVersion);
      return true;
    }
    return false;
  }

  async #reloadModule(absolutePath, originalPath) {
    if (this.debounceTimers.has(absolutePath)) {
      clearTimeout(this.debounceTimers.get(absolutePath));
    }

    this.debounceTimers.set(
      absolutePath,
      setTimeout(async () => {
        try {
          if (await this.#updateModuleVersion(absolutePath)) {
            const moduleUrl = `file://${absolutePath}`;
            const freshModule = await import(`${moduleUrl}?t=${Date.now()}`);
            this.moduleCache.set(absolutePath, freshModule);
            this.moduleErrors.delete(absolutePath);

            const instances = this.moduleInstances.get(absolutePath) || [];
            instances.forEach((callback) => callback(freshModule));
            if (this.logSet) {
              console.log(`Module ${originalPath} reloaded successfully`);
            }

            this.emit("moduleReloaded", {
              path: originalPath,
              absolutePath,
              success: true,
            });
          }
        } catch (error) {
          const errorMessage = `Error reloading module ${originalPath}: ${error.message}`;
          if (this.logSet) {
            console.error(errorMessage);
          }

          this.moduleErrors.set(absolutePath, error);

          this.emit("moduleReloadError", {
            path: originalPath,
            absolutePath,
            error,
          });

          if (!this.moduleCache.has(absolutePath)) {
            throw error;
          }
        } finally {
          this.debounceTimers.delete(absolutePath);
        }
      }, 50)
    );
  }

  #setupWatcher(absolutePath, originalPath) {
    if (!this.watchedFiles.has(absolutePath)) {
      const watcher = fs.watch(absolutePath, async () => {
        await this.#reloadModule(absolutePath, originalPath);
      });

      watcher.on("error", (error) => {
        console.error(`Watch error for ${originalPath}:`, error);
        this.emit("watchError", {
          path: originalPath,
          absolutePath,
          error,
        });
        this.unwatchModule(originalPath);
      });

      this.watchedFiles.set(absolutePath, watcher);
    }
  }

  async importModule(modulePath, callerFile) {
    const absolutePath = this.resolveModulePath(modulePath, callerFile);

    try {
      if (
        this.moduleErrors.has(absolutePath) &&
        this.moduleCache.has(absolutePath)
      ) {
        console.warn(
          `Using cached version of ${modulePath} due to previous error`
        );
        return this.moduleCache.get(absolutePath);
      }

      let module;
      const needsReload =
        !this.moduleCache.has(absolutePath) ||
        (await this.#updateModuleVersion(absolutePath));

      if (needsReload) {
        const moduleUrl = `file://${absolutePath}`;
        module = await import(moduleUrl);
        this.moduleCache.set(absolutePath, module);
        this.#setupWatcher(absolutePath, modulePath);
      } else {
        module = this.moduleCache.get(absolutePath);
      }

      return this.moduleCache.get(absolutePath);
    } catch (error) {
      console.error(`Error importing module ${modulePath}:`, error);
      this.moduleErrors.set(absolutePath, error);
      this.emit("importError", {
        path: modulePath,
        absolutePath,
        error,
      });
      throw error;
    }
  }

  hasError(modulePath, callerFile) {
    const absolutePath = this.resolveModulePath(modulePath, callerFile);
    return this.moduleErrors.has(absolutePath);
  }

  clearError(modulePath, callerFile) {
    const absolutePath = this.resolveModulePath(modulePath, callerFile);
    this.moduleErrors.delete(absolutePath);
  }

  unwatchModule(modulePath, callerFile) {
    const absolutePath = this.resolveModulePath(modulePath, callerFile);
    const watcher = this.watchedFiles.get(absolutePath);
    if (watcher) {
      watcher.close();
      this.watchedFiles.delete(absolutePath);
      this.moduleCache.delete(absolutePath);
      this.moduleInstances.delete(absolutePath);
      this.#moduleVersions.delete(absolutePath);
      this.#pathCache.delete(`${callerFile}:${modulePath}`);
      this.moduleErrors.delete(absolutePath);
    }
  }

  unwatchAll() {
    for (const [modulePath] of this.watchedFiles) {
      this.unwatchModule(modulePath);
    }
  }
}

// Exportar una instancia única
export const moduleLoader = new DynamicModuleLoader();

// Helper function mejorada
export async function dynamicImport(
  modulePath,
  constructor = null,
  isconstructor = false
) {
  // Obtener el archivo que está llamando a dynamicImport
  const error = new Error();
  const stackLines = error.stack.split("\n");
  const callerLine = stackLines[2]; // La línea que contiene la información del caller
  const match = callerLine.match(/at (?:.*?\s+\()?(?:(.+?):\d+:\d+|([^)]+))/);
  const callerFile = match[1] || match[2];

  // Convertir la URL del archivo a ruta del sistema de archivos si es necesario
  const normalizedCallerFile = callerFile.startsWith("file://")
    ? fileURLToPath(callerFile)
    : callerFile;

  const loadModule = await moduleLoader.importModule(
    modulePath,
    normalizedCallerFile
  );

  // Si se proporciona un constructor y el módulo tiene un export default
  if (Object.keys(constructor).length > 0 && loadModule.default) {
    try {
      // Intentar crear una instancia con los parámetros proporcionados
      return new loadModule.default(constructor);
    } catch (error) {
      return loadModule.default || loadModule;
    }
  }

  if (constructor == "default" && isconstructor == false) {
    console.log(false);
    
    return loadModule.default;
  }

  if (constructor == "default" && isconstructor == true) {
    console.log(true);
    
    return new loadModule.default();
  }

  return loadModule;
}
