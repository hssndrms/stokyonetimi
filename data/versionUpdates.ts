
export interface VersionUpdate {
  version: string;
  date: string;
  description: string;
  sql: string;
}

// Gelecekteki veritabanı güncellemeleri bu diziye eklenecektir.
export const VERSION_UPDATES: VersionUpdate[] = [
    
].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
