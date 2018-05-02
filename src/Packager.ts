import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { FunctionConfig, ServiceConfig, PackageResult } from './types';

interface PackageOptions {
  minify?: boolean;
  excludeDevDeps?: boolean;
  include?: string[];
  exclude?: string[];
}

export class Packager {
  private defaultExcludes = [
    'node_modules/.cache/**',
    '**/*.test.*',
    '**/*.spec.*',
    '**/__tests__/**',
    '.git/**',
    '.env*',
    'README.md',
    'CHANGELOG.md',
    'tsconfig.json',
    'jest.config.*',
    '.eslintrc*',
    '.prettierrc*',
    'coverage/**',
  ];

  async packageFunction(
    func: FunctionConfig,
    serviceConfig: ServiceConfig,
    options: PackageOptions = {}
  ): Promise<PackageResult> {
    const handlerDir = path.dirname(func.handler.replace(/\.\w+$/, ''));
    const handlerFile = func.handler.split('.')[0];
    const outputDir = path.resolve('.serverless');
    const zipPath = path.join(outputDir, `${func.name}.zip`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Collect files to include
    const files = this.collectFiles(handlerFile, options);

    // Calculate bundle size
    let totalSize = 0;
    for (const file of files) {
      try {
        const stat = fs.statSync(file);
        totalSize += stat.size;
      } catch {
        // File may not exist in simulation
      }
    }

    // Calculate hash for change detection
    const hash = this.calculateHash(files);

    // Tree-shake if requested (simplified)
    const processedFiles = options.minify ? this.treeShake(files) : files;

    // Generate a zip manifest (simulate archiving)
    const manifest = this.createManifest(func, processedFiles, serviceConfig);
    fs.writeFileSync(zipPath + '.manifest.json', JSON.stringify(manifest, null, 2));

    // Estimate final zip size (roughly 30% of raw size)
    const estimatedZipSize = Math.round(totalSize * 0.3) || files.length * 500;

    return {
      functionName: func.name,
      handler: func.handler,
      zipPath,
      size: estimatedZipSize,
      hash,
      files: processedFiles,
    };
  }

  private collectFiles(handlerPath: string, options: PackageOptions): string[] {
    const files: string[] = [];
    const includes = options.include ?? ['src/**/*.js', 'src/**/*.ts'];
    const excludes = [...this.defaultExcludes, ...(options.exclude ?? [])];

    // Add handler file
    const possibleExtensions = ['.js', '.ts', '.mjs'];
    for (const ext of possibleExtensions) {
      const filePath = handlerPath + ext;
      if (fs.existsSync(filePath)) {
        files.push(filePath);
        break;
      }
    }

    // Scan for additional source files
    const srcDir = path.resolve('src');
    if (fs.existsSync(srcDir)) {
      this.walkDirectory(srcDir, files, excludes);
    }

    // Include package.json for dependency resolution
    const pkgPath = path.resolve('package.json');
    if (fs.existsSync(pkgPath)) {
      files.push(pkgPath);
    }

    // Include node_modules (production deps only)
    if (!options.excludeDevDeps) {
      const nodeModules = path.resolve('node_modules');
      if (fs.existsSync(nodeModules)) {
        files.push(nodeModules);
      }
    }

    return [...new Set(files)];
  }

  private walkDirectory(dir: string, files: string[], excludes: string[]): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(process.cwd(), fullPath);

        if (this.isExcluded(relativePath, excludes)) continue;

        if (entry.isDirectory()) {
          this.walkDirectory(fullPath, files, excludes);
        } else {
          files.push(fullPath);
        }
      }
    } catch {
      // Directory might not be readable
    }
  }

  private isExcluded(filePath: string, excludes: string[]): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    return excludes.some((pattern) => {
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*');
      return new RegExp(`^${regexPattern}$`).test(normalized);
    });
  }

  private treeShake(files: string[]): string[] {
    // Simplified tree-shaking: remove test files and type declarations
    return files.filter((f) => {
      const name = path.basename(f);
      return !name.includes('.test.') &&
             !name.includes('.spec.') &&
             !name.endsWith('.d.ts') &&
             !name.endsWith('.map');
    });
  }

  private calculateHash(files: string[]): string {
    const hash = crypto.createHash('sha256');
    for (const file of files.sort()) {
      hash.update(file);
      try {
        const content = fs.readFileSync(file);
        hash.update(content);
      } catch {
        hash.update('missing');
      }
    }
    return hash.digest('hex').slice(0, 12);
  }

  private createManifest(
    func: FunctionConfig,
    files: string[],
    serviceConfig: ServiceConfig
  ): Record<string, unknown> {
    return {
      function: func.name,
      handler: func.handler,
      runtime: func.runtime ?? serviceConfig.provider.runtime,
      memory: func.memory ?? serviceConfig.provider.memorySize,
      timeout: func.timeout ?? serviceConfig.provider.timeout,
      environment: func.environment,
      files: files.map((f) => path.relative(process.cwd(), f)),
      builtAt: new Date().toISOString(),
    };
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
