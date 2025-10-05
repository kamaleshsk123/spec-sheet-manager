/**
 * Versioning utility for semantic versioning (semver)
 */
/**
 * Increments a semantic version number
 * @param currentVersion Current version string (e.g., '1.0.0')
 * @param incrementType Type of increment: 'major', 'minor', or 'patch'
 * @returns New version string
 */
export declare function incrementVersion(currentVersion: string, incrementType?: 'major' | 'minor' | 'patch'): string;
/**
 * Determines the type of change between two spec data objects
 * @param oldData Previous spec data
 * @param newData New spec data
 * @returns Type of change: 'major', 'minor', or 'patch'
 */
export declare function determineChangeType(oldData: any, newData: any): 'major' | 'minor' | 'patch';
//# sourceMappingURL=versioning.d.ts.map