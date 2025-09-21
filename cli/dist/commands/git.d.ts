import { Command } from 'commander';
export declare class GitCommand {
    private api;
    private config;
    private git;
    constructor();
    getCommand(): Command;
    private initGitIntegration;
    private syncWithGit;
    private pullFromGit;
    private showGitStatus;
    private setupGitHooks;
    private generateProtoContent;
    private generateIndexFile;
}
//# sourceMappingURL=git.d.ts.map