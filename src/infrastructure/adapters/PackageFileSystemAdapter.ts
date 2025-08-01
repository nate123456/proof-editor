import { err, ok, type Result } from 'neverthrow';
import type { IFileSystemPort } from '../../application/ports/IFileSystemPort.js';
import type { IPackageFileSystem } from '../../contexts/package-ecosystem/domain/services/PackageValidationService.js';
import { FilePath } from '../../domain/shared/value-objects/index.js';

export class PackageFileSystemAdapter implements IPackageFileSystem {
  constructor(private readonly fileSystemPort: IFileSystemPort) {}

  async fileExists(path: string): Promise<boolean> {
    const filePathResult = FilePath.create(path);
    if (filePathResult.isErr()) {
      return false;
    }

    const existsResult = await this.fileSystemPort.exists(filePathResult.value);
    return existsResult.isOk() ? existsResult.value : false;
  }

  async readFile(path: string): Promise<Result<string, Error>> {
    const filePathResult = FilePath.create(path);
    if (filePathResult.isErr()) {
      return err(new Error(`Invalid file path: ${path}`));
    }

    const readResult = await this.fileSystemPort.readFile(filePathResult.value);
    if (readResult.isErr()) {
      return err(new Error(`Failed to read file: ${readResult.error.message.getValue()}`));
    }

    return ok(readResult.value.getValue());
  }

  async listFiles(directory: string): Promise<Result<readonly string[], Error>> {
    const dirPathResult = FilePath.create(directory);
    if (dirPathResult.isErr()) {
      return err(new Error(`Invalid directory path: ${directory}`));
    }

    const listResult = await this.fileSystemPort.readDirectory(dirPathResult.value);
    if (listResult.isErr()) {
      return err(new Error(`Failed to list directory: ${listResult.error.message.getValue()}`));
    }

    const filePaths = listResult.value
      .filter((fileInfo) => !fileInfo.isDirectory)
      .map((fileInfo) => fileInfo.path.getValue());

    return ok(filePaths);
  }

  async isExecutable(path: string): Promise<boolean> {
    const filePathResult = FilePath.create(path);
    if (filePathResult.isErr()) {
      return false;
    }

    const existsResult = await this.fileSystemPort.exists(filePathResult.value);
    if (existsResult.isErr() || !existsResult.value) {
      return false;
    }

    const isWindows = process.platform === 'win32';
    if (isWindows) {
      return (
        path.toLowerCase().endsWith('.exe') ||
        path.toLowerCase().endsWith('.bat') ||
        path.toLowerCase().endsWith('.cmd')
      );
    }

    try {
      const fs = await import('node:fs/promises');
      const stats = await fs.stat(path);
      return !!(stats.mode & 0o111);
    } catch {
      return false;
    }
  }
}
