// Minimal typings for the File System Access API used by the batch invoice
// export ("Lưu vào thư mục"). TypeScript's DOM lib already ships
// FileSystemDirectoryHandle / FileSystemFileHandle / createWritable, but not
// the picker entry point, so only that is added here.

interface Window {
  /** Chrome/Edge only; undefined in Firefox/Safari. Must be called from a user gesture. */
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
    startIn?: FileSystemHandle | string;
  }) => Promise<FileSystemDirectoryHandle>;
}
