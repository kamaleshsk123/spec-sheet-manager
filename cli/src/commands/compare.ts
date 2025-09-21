import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ApiService, ProtobufSpec } from '../services/api';
import { Config } from '../services/config';

interface DiffLine {
  content: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged' | 'empty';
  lineNumber: number;
}

export class CompareCommand {
  private api: ApiService;
  private config: Config;

  constructor() {
    this.api = new ApiService();
    this.config = new Config();
  }

  getCommand(): Command {
    const cmd = new Command('compare');
    cmd.description('Compare specifications');

    cmd
      .command('versions <spec1> <spec2>')
      .description('Compare two specification versions')
      .option('-f, --format <format>', 'Output format (diff, json, html)', 'diff')
      .option('-o, --output <file>', 'Output to file')
      .option('--no-color', 'Disable colored output')
      .action(async (spec1, spec2, options) => {
        await this.compareVersions(spec1, spec2, options);
      });

    cmd
      .command('breaking-changes <spec1> <spec2>')
      .description('Detect breaking changes between versions')
      .option('-f, --format <format>', 'Output format (table, json)', 'table')
      .action(async (spec1, spec2, options) => {
        await this.detectBreakingChanges(spec1, spec2, options);
      });

    return cmd;
  }

  private async compareVersions(spec1Id: string, spec2Id: string, options: any): Promise<void> {
    if (!this.config.isAuthenticated()) {
      console.log(chalk.red('Please login first: proto-cli auth login'));
      return;
    }

    const spinner = ora('Fetching specifications...').start();

    try {
      const [response1, response2] = await Promise.all([
        this.api.getSpec(spec1Id),
        this.api.getSpec(spec2Id)
      ]);

      if (!response1.success || !response1.data) {
        spinner.fail(chalk.red('Failed to fetch first specification: ' + response1.error));
        return;
      }

      if (!response2.success || !response2.data) {
        spinner.fail(chalk.red('Failed to fetch second specification: ' + response2.error));
        return;
      }

      const spec1 = response1.data;
      const spec2 = response2.data;

      spinner.succeed(chalk.green(`Comparing: ${spec1.title} v${spec1.version} vs ${spec2.title} v${spec2.version}`));

      const content1 = this.generateProtoContent(spec1);
      const content2 = this.generateProtoContent(spec2);
      
      const diff = this.calculateDiff(content1, content2);

      switch (options.format) {
        case 'json':
          console.log(JSON.stringify(diff, null, 2));
          break;
        case 'html':
          console.log(this.generateHtmlDiff(diff, spec1, spec2));
          break;
        default:
          this.printColoredDiff(diff, spec1, spec2, !options.noColor);
      }

    } catch (error: any) {
      spinner.fail(chalk.red('Error: ' + error.message));
    }
  }

  private calculateDiff(leftContent: string, rightContent: string): { leftLines: DiffLine[], rightLines: DiffLine[], stats: any } {
    const leftLines = leftContent.split('\n');
    const rightLines = rightContent.split('\n');
    
    const result = {
      leftLines: [] as DiffLine[],
      rightLines: [] as DiffLine[],
      stats: { added: 0, removed: 0, modified: 0, unchanged: 0 }
    };

    const lcs = this.longestCommonSubsequence(leftLines, rightLines);
    
    let leftIndex = 0;
    let rightIndex = 0;
    let leftLineNum = 1;
    let rightLineNum = 1;

    for (const commonLine of lcs) {
      // Add removed lines
      while (leftIndex < leftLines.length && leftLines[leftIndex] !== commonLine) {
        result.leftLines.push({ 
          content: leftLines[leftIndex], 
          type: 'removed', 
          lineNumber: leftLineNum 
        });
        result.rightLines.push({ 
          content: '', 
          type: 'empty', 
          lineNumber: rightLineNum 
        });
        result.stats.removed++;
        leftIndex++;
        leftLineNum++;
      }

      // Add added lines
      while (rightIndex < rightLines.length && rightLines[rightIndex] !== commonLine) {
        result.leftLines.push({ 
          content: '', 
          type: 'empty', 
          lineNumber: leftLineNum 
        });
        result.rightLines.push({ 
          content: rightLines[rightIndex], 
          type: 'added', 
          lineNumber: rightLineNum 
        });
        result.stats.added++;
        rightIndex++;
        rightLineNum++;
      }

      // Add common line
      if (leftIndex < leftLines.length && rightIndex < rightLines.length) {
        result.leftLines.push({ 
          content: leftLines[leftIndex], 
          type: 'unchanged', 
          lineNumber: leftLineNum 
        });
        result.rightLines.push({ 
          content: rightLines[rightIndex], 
          type: 'unchanged', 
          lineNumber: rightLineNum 
        });
        result.stats.unchanged++;
        leftIndex++;
        rightIndex++;
        leftLineNum++;
        rightLineNum++;
      }
    }

    // Add remaining lines
    while (leftIndex < leftLines.length) {
      result.leftLines.push({ 
        content: leftLines[leftIndex], 
        type: 'removed', 
        lineNumber: leftLineNum 
      });
      result.rightLines.push({ 
        content: '', 
        type: 'empty', 
        lineNumber: rightLineNum 
      });
      result.stats.removed++;
      leftIndex++;
      leftLineNum++;
    }

    while (rightIndex < rightLines.length) {
      result.leftLines.push({ 
        content: '', 
        type: 'empty', 
        lineNumber: leftLineNum 
      });
      result.rightLines.push({ 
        content: rightLines[rightIndex], 
        type: 'added', 
        lineNumber: rightLineNum 
      });
      result.stats.added++;
      rightIndex++;
      rightLineNum++;
    }

    return result;
  }

  private longestCommonSubsequence(left: string[], right: string[]): string[] {
    const m = left.length;
    const n = right.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (left[i - 1] === right[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const lcs: string[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (left[i - 1] === right[j - 1]) {
        lcs.unshift(left[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  private printColoredDiff(diff: any, spec1: ProtobufSpec, spec2: ProtobufSpec, useColor: boolean): void {
    console.log(chalk.bold(`\n--- ${spec1.title} v${spec1.version}`));
    console.log(chalk.bold(`+++ ${spec2.title} v${spec2.version}`));
    console.log(chalk.gray(`@@ Changes: +${diff.stats.added} -${diff.stats.removed} @@\n`));

    const maxLines = Math.max(diff.leftLines.length, diff.rightLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const leftLine = diff.leftLines[i];
      const rightLine = diff.rightLines[i];

      if (leftLine?.type === 'removed') {
        const line = `${leftLine.lineNumber.toString().padStart(4)} | ${leftLine.content}`;
        console.log(useColor ? chalk.red(`- ${line}`) : `- ${line}`);
      } else if (rightLine?.type === 'added') {
        const line = `${rightLine.lineNumber.toString().padStart(4)} | ${rightLine.content}`;
        console.log(useColor ? chalk.green(`+ ${line}`) : `+ ${line}`);
      } else if (leftLine?.type === 'unchanged') {
        const line = `${leftLine.lineNumber.toString().padStart(4)} | ${leftLine.content}`;
        console.log(useColor ? chalk.gray(`  ${line}`) : `  ${line}`);
      }
    }

    console.log(chalk.bold(`\nSummary:`));
    console.log(chalk.green(`  Added lines: ${diff.stats.added}`));
    console.log(chalk.red(`  Removed lines: ${diff.stats.removed}`));
    console.log(chalk.gray(`  Unchanged lines: ${diff.stats.unchanged}`));
  }

  private generateHtmlDiff(diff: any, spec1: ProtobufSpec, spec2: ProtobufSpec): string {
    let html = `
<!DOCTYPE html>
<html>
<head>
    <title>Diff: ${spec1.title} vs ${spec2.title}</title>
    <style>
        body { font-family: 'Courier New', monospace; margin: 20px; }
        .header { background: #f5f5f5; padding: 10px; margin-bottom: 20px; }
        .diff-line { padding: 2px 5px; }
        .added { background-color: #e6ffed; border-left: 3px solid #28a745; }
        .removed { background-color: #ffeef0; border-left: 3px solid #d73a49; }
        .unchanged { background-color: #f8f9fa; }
        .line-number { color: #586069; margin-right: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Comparison: ${spec1.title} v${spec1.version} → ${spec2.title} v${spec2.version}</h2>
        <p>Added: ${diff.stats.added} | Removed: ${diff.stats.removed} | Unchanged: ${diff.stats.unchanged}</p>
    </div>
    <div class="diff-content">
`;

    const maxLines = Math.max(diff.leftLines.length, diff.rightLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const leftLine = diff.leftLines[i];
      const rightLine = diff.rightLines[i];

      if (leftLine?.type === 'removed') {
        html += `<div class="diff-line removed"><span class="line-number">${leftLine.lineNumber}</span>- ${this.escapeHtml(leftLine.content)}</div>\n`;
      } else if (rightLine?.type === 'added') {
        html += `<div class="diff-line added"><span class="line-number">${rightLine.lineNumber}</span>+ ${this.escapeHtml(rightLine.content)}</div>\n`;
      } else if (leftLine?.type === 'unchanged') {
        html += `<div class="diff-line unchanged"><span class="line-number">${leftLine.lineNumber}</span>  ${this.escapeHtml(leftLine.content)}</div>\n`;
      }
    }

    html += `
    </div>
</body>
</html>`;

    return html;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private generateProtoContent(spec: ProtobufSpec): string {
    // Reuse the same logic from spec command
    if (!spec.spec_data) return 'No content available';

    const data = spec.spec_data;
    let protoContent = `syntax = "${data.syntax || 'proto3'}";\n\n`;
    
    if (data.package) {
      protoContent += `package ${data.package};\n\n`;
    }
    
    // Add other proto content generation logic...
    
    return protoContent;
  }

  private async detectBreakingChanges(spec1Id: string, spec2Id: string, options: any): Promise<void> {
    console.log(chalk.yellow('Breaking change detection coming soon...'));
    // Implementation for detecting breaking changes
    // - Field removals
    // - Type changes
    // - Service method changes
    // - Enum value removals
  }
}