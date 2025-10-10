"use strict";
/**
 * Versioning utility for semantic versioning (semver)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.incrementVersion = incrementVersion;
exports.determineChangeType = determineChangeType;
/**
 * Increments a semantic version number
 * @param currentVersion Current version string (e.g., '1.0.0')
 * @param incrementType Type of increment: 'major', 'minor', or 'patch'
 * @returns New version string
 */
function incrementVersion(currentVersion, incrementType = 'patch') {
    // Handle undefined or empty version
    if (!currentVersion) {
        return '1.0.0';
    }
    // Parse current version
    const versionParts = currentVersion.split('.').map(Number);
    // Ensure we have at least 3 parts (major.minor.patch)
    while (versionParts.length < 3) {
        versionParts.push(0);
    }
    // Increment the appropriate part
    if (incrementType === 'major') {
        versionParts[0] += 1;
        versionParts[1] = 0;
        versionParts[2] = 0;
    }
    else if (incrementType === 'minor') {
        versionParts[1] += 1;
        versionParts[2] = 0;
    }
    else {
        // Default to patch
        versionParts[2] += 1;
    }
    return versionParts.join('.');
}
/**
 * Determines the type of change between two spec data objects
 * @param oldData Previous spec data
 * @param newData New spec data
 * @returns Type of change: 'major', 'minor', or 'patch'
 */
function determineChangeType(oldData, newData) {
    if (!oldData || !newData)
        return 'patch';
    // Check for breaking changes (major version bump)
    // This is a simplified check - you might want to enhance this based on your specific needs
    if (JSON.stringify(oldData.messages) !== JSON.stringify(newData.messages) ||
        JSON.stringify(oldData.services) !== JSON.stringify(newData.services)) {
        return 'major';
    }
    // Check for new features (minor version bump)
    if (JSON.stringify(oldData.enums) !== JSON.stringify(newData.enums) ||
        JSON.stringify(oldData.imports) !== JSON.stringify(newData.imports)) {
        return 'minor';
    }
    // Default to patch for other changes
    return 'patch';
}
//# sourceMappingURL=versioning.js.map