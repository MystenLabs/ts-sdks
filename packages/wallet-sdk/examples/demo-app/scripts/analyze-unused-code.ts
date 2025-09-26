// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Comprehensive unused code analyzer for the demo app
 *
 * This script:
 * 1. Parses all TypeScript/JavaScript files to extract imports and exports
 * 2. Builds a dependency graph to identify unused files and exports
 * 3. Provides detailed analysis and recommendations for manual cleanup
 *
 * Usage:
 *   npx tsx scripts/analyze-unused-code.ts    # Analysis only
 *   bun run scripts/analyze-unused-code.ts    # Analysis only (Bun)
 */

import fs from 'fs';
import path from 'path';

// Configuration
const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const ANALYSIS_OUTPUT_FILE = path.join(ROOT_DIR, 'unused-code-analysis.json');

// File patterns to analyze
const FILE_PATTERNS = /\.(ts|tsx|js|jsx)$/;
const IGNORE_PATTERNS = [
	/node_modules/,
	/\.d\.ts$/,
	/dist/,
	/build/,
	/coverage/,
	/\.test\./,
	/\.spec\./,
	/vite-env\.d\.ts$/,
	/contracts\/.*\.(ts|tsx)$/, // Generated contract code
];

// Entry points that should never be considered unused
const ENTRY_POINTS = [
	'src/main.tsx',
	'src/App.tsx',
	'src/DemoApp.tsx',
	'src/index.css',
	'vite.config.ts',
	'tsconfig.json',
];

interface FileInfo {
	path: string;
	size: number;
	exports: Set<string>;
	imports: Map<string, Set<string>>;
}

class CodeAnalyzer {
	private files = new Map<string, FileInfo>();
	private dependencyGraph = new Map<string, Set<string>>();
	private usedFiles = new Set<string>();
	private usedExports = new Map<string, Set<string>>();
	private unusedFiles = new Set<string>();
	private unusedExports = new Map<string, Set<string>>();

	/**
	 * Main analysis function
	 */
	async analyze(): Promise<void> {
		console.log('🔍 Starting comprehensive code analysis...\n');

		this.discoverFiles();
		this.parseFiles();
		this.buildDependencyGraph();
		this.identifyUnused();
		this.generateReport();
		this.saveResults();
	}

	/**
	 * Discover all analyzable files
	 */
	private discoverFiles(): void {
		console.log('📁 Discovering files...');
		const allFiles = this.walkDirectory(SRC_DIR);
		console.log(`   Found ${allFiles.length} files to analyze\n`);
	}

	/**
	 * Walk directory recursively to find files
	 */
	private walkDirectory(dir: string): string[] {
		const files: string[] = [];

		try {
			const entries = fs.readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				const relativePath = path.relative(ROOT_DIR, fullPath);

				if (this.shouldIgnore(relativePath)) continue;

				if (entry.isDirectory()) {
					files.push(...this.walkDirectory(fullPath));
				} else if (entry.isFile() && FILE_PATTERNS.test(entry.name)) {
					files.push(relativePath);
				}
			}
		} catch (error) {
			console.warn(`   ⚠️  Could not read directory ${dir}:`, (error as Error).message);
		}

		return files;
	}

	/**
	 * Check if file should be ignored
	 */
	private shouldIgnore(filePath: string): boolean {
		return IGNORE_PATTERNS.some((pattern) => pattern.test(filePath));
	}

	/**
	 * Parse all discovered files
	 */
	private parseFiles(): void {
		console.log('📖 Parsing imports and exports...');

		const allFiles = this.walkDirectory(SRC_DIR);

		for (const file of allFiles) {
			this.parseFile(file);
		}

		console.log(`   Parsed ${this.files.size} files\n`);
	}

	/**
	 * Parse individual file for imports and exports
	 */
	private parseFile(filePath: string): void {
		try {
			const content = fs.readFileSync(path.join(ROOT_DIR, filePath), 'utf8');
			const size = new TextEncoder().encode(content).length;
			const exports = this.extractExports(content);
			const imports = this.extractImports(content, filePath);

			this.files.set(filePath, {
				path: filePath,
				size,
				exports,
				imports,
			});
		} catch (error) {
			console.warn(`   ⚠️  Could not parse ${filePath}:`, (error as Error).message);
		}
	}

	/**
	 * Extract exports from file content
	 */
	private extractExports(content: string): Set<string> {
		const exports = new Set<string>();

		// Remove comments and strings to avoid false matches
		const cleanContent = this.removeCommentsAndStrings(content);

		// Export patterns
		const patterns = [
			// Named exports: export { foo, bar }
			/export\s*{([^}]+)}/g,
			// Direct exports: export const foo = ..., export function foo(), etc.
			/export\s+(?:const|let|var|function|class|interface|type|enum)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
			// Default export with name: export default function foo()
			/export\s+default\s+(?:function|class)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
		];

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.exec(cleanContent)) !== null) {
				if (match[1]) {
					// Handle comma-separated exports in braces
					if (pattern.source.includes('{')) {
						const exportNames = match[1]
							.split(',')
							.map((name) => name.trim().replace(/\s+as\s+.+/, ''));
						exportNames.forEach((name) => {
							if (name && !name.includes('*')) {
								exports.add(name.trim());
							}
						});
					} else {
						exports.add(match[1].trim());
					}
				}
			}
		}

		// Check for default exports
		if (/export\s+default/g.test(cleanContent)) {
			exports.add('default');
		}

		return exports;
	}

	/**
	 * Extract imports from file content
	 */
	private extractImports(content: string, currentFile: string): Map<string, Set<string>> {
		const imports = new Map<string, Set<string>>();
		const cleanContent = this.removeCommentsAndStrings(content);

		// Import patterns (with multiline support)
		const patterns = [
			// import type { foo, bar } from 'module'
			/import\s+type\s*{([^}]+)}\s*from\s*['"`]([^'"`]+)['"`]/gm,
			// import { foo, bar } from 'module'
			/import\s*{([^}]+)}\s*from\s*['"`]([^'"`]+)['"`]/gm,
			// import foo from 'module'
			/import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*from\s*['"`]([^'"`]+)['"`]/gm,
			// import * as foo from 'module'
			/import\s*\*\s*as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*from\s*['"`]([^'"`]+)['"`]/gm,
			// import 'module' (side effect)
			/import\s*['"`]([^'"`]+)['"`]/gm,
		];

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.exec(cleanContent)) !== null) {
				let modulePath: string;
				let importedItems: string[] = [];

				if (pattern.source.includes('{')) {
					// Named imports
					importedItems = match[1]
						.split(',')
						.map((item) => item.trim().replace(/\s+as\s+.+/, ''))
						.filter((item) => item && !item.includes('*'));
					modulePath = match[2];
				} else if (pattern.source.includes('\\*\\s*as')) {
					// Namespace import
					importedItems = ['*'];
					modulePath = match[2];
				} else if (match[2]) {
					// Default import
					importedItems = ['default'];
					modulePath = match[2];
				} else {
					// Side effect import
					importedItems = ['*']; // Mark as using the whole module
					modulePath = match[1];
				}

				const resolvedPath = this.resolveImportPath(modulePath, currentFile);
				if (resolvedPath) {
					if (!imports.has(resolvedPath)) {
						imports.set(resolvedPath, new Set());
					}
					importedItems.forEach((item) => imports.get(resolvedPath)!.add(item));
				}
			}
		}

		return imports;
	}

	/**
	 * Remove comments and strings from content to avoid false matches
	 */
	private removeCommentsAndStrings(content: string): string {
		// Remove single line comments
		content = content.replace(/\/\/.*$/gm, '');
		// Remove multi-line comments
		content = content.replace(/\/\*[\s\S]*?\*\//g, '');

		// Remove strings but preserve import/export module paths
		// First, protect import/export statements by marking them
		const protectedStatements: string[] = [];
		let protectedIndex = 0;

		// Protect import statements
		content = content.replace(/(import[\s\S]*?from\s*['"`][^'"`]+['"`])/g, (match) => {
			const placeholder = `__IMPORT_${protectedIndex}__`;
			protectedStatements[protectedIndex] = match;
			protectedIndex++;
			return placeholder;
		});

		// Protect export statements
		content = content.replace(/(export[\s\S]*?from\s*['"`][^'"`]+['"`])/g, (match) => {
			const placeholder = `__EXPORT_${protectedIndex}__`;
			protectedStatements[protectedIndex] = match;
			protectedIndex++;
			return placeholder;
		});

		// Now remove other strings
		content = content.replace(/'([^'\\]|\\.)*'/g, '""');
		content = content.replace(/"([^"\\]|\\.)*"/g, '""');
		content = content.replace(/`([^`\\]|\\.)*`/g, '""');

		// Restore protected statements
		for (let i = 0; i < protectedStatements.length; i++) {
			content = content.replace(`__IMPORT_${i}__`, protectedStatements[i]);
			content = content.replace(`__EXPORT_${i}__`, protectedStatements[i]);
		}

		return content;
	}

	/**
	 * Resolve import path to actual file path
	 */
	private resolveImportPath(importPath: string, currentFile: string): string | null {
		// Skip external modules
		if (!importPath.startsWith('.')) {
			return null;
		}

		const currentDir = path.dirname(currentFile);
		let resolvedPath = path.resolve(ROOT_DIR, currentDir, importPath);

		// Convert to relative path from root
		resolvedPath = path.relative(ROOT_DIR, resolvedPath);

		// Strategy 1: Direct file match
		if (fs.existsSync(path.join(ROOT_DIR, resolvedPath))) {
			return resolvedPath;
		}

		// Strategy 2: Replace .js/.jsx with .ts/.tsx (common in TS projects)
		if (resolvedPath.endsWith('.js') || resolvedPath.endsWith('.jsx')) {
			const basePath = resolvedPath.replace(/\.(js|jsx)$/, '');
			const tsExtensions = ['.ts', '.tsx'];

			for (const ext of tsExtensions) {
				const tsPath = basePath + ext;
				if (fs.existsSync(path.join(ROOT_DIR, tsPath))) {
					return tsPath;
				}
			}
		}

		// Strategy 3: Try common extensions
		const extensions = ['.ts', '.tsx', '.js', '.jsx'];
		for (const ext of extensions) {
			const withExt = resolvedPath + ext;
			if (fs.existsSync(path.join(ROOT_DIR, withExt))) {
				return withExt;
			}
		}

		// Strategy 4: Check for index files
		const indexFiles = ['index.ts', 'index.tsx', 'index.js', 'index.jsx'];
		for (const indexFile of indexFiles) {
			const indexPath = path.join(resolvedPath, indexFile);
			if (fs.existsSync(path.join(ROOT_DIR, indexPath))) {
				return indexPath;
			}
		}

		return null;
	}

	/**
	 * Build dependency graph from imports
	 */
	private buildDependencyGraph(): void {
		console.log('🔗 Building dependency graph...');

		for (const [filePath, fileInfo] of this.files) {
			const deps = new Set<string>();

			for (const [importedFile] of fileInfo.imports) {
				if (this.files.has(importedFile)) {
					deps.add(importedFile);
				}
			}

			this.dependencyGraph.set(filePath, deps);
		}

		console.log('   Dependency graph built\n');
	}

	/**
	 * Identify unused files and exports
	 */
	private identifyUnused(): void {
		console.log('🎯 Identifying unused code...');

		// Mark entry points as used
		// Mark entry points as used
		for (const entryPoint of ENTRY_POINTS) {
			if (this.files.has(entryPoint)) {
				this.markFileAsUsed(entryPoint);
			}
		}

		// Find unused files
		for (const filePath of this.files.keys()) {
			if (!this.usedFiles.has(filePath)) {
				this.unusedFiles.add(filePath);
			}
		}

		// Find unused exports
		for (const [filePath, fileInfo] of this.files) {
			const usedExportsInFile = this.usedExports.get(filePath) || new Set();
			const unusedExportsInFile = new Set<string>();

			for (const exportName of fileInfo.exports) {
				if (!usedExportsInFile.has(exportName)) {
					unusedExportsInFile.add(exportName);
				}
			}

			if (unusedExportsInFile.size > 0) {
				this.unusedExports.set(filePath, unusedExportsInFile);
			}
		}
	}

	/**
	 * Recursively mark file and its dependencies as used
	 */
	private markFileAsUsed(filePath: string): void {
		if (this.usedFiles.has(filePath)) return;

		this.usedFiles.add(filePath);

		const fileInfo = this.files.get(filePath);
		if (!fileInfo) return;

		// Mark imports as used
		for (const [importedFile, importedItems] of fileInfo.imports) {
			if (this.files.has(importedFile)) {
				this.markFileAsUsed(importedFile);

				// Mark specific exports as used
				if (!this.usedExports.has(importedFile)) {
					this.usedExports.set(importedFile, new Set());
				}

				const usedExportsInFile = this.usedExports.get(importedFile)!;
				for (const item of importedItems) {
					if (item === '*') {
						// Import * means all exports are used
						const importedFileInfo = this.files.get(importedFile);
						if (importedFileInfo) {
							for (const exp of importedFileInfo.exports) {
								usedExportsInFile.add(exp);
							}
						}
					} else {
						usedExportsInFile.add(item);
					}
				}
			}
		}
	}

	/**
	 * Generate comprehensive report
	 */
	private generateReport(): void {
		const totalFiles = this.files.size;
		const unusedFilesCount = this.unusedFiles.size;
		const filesWithUnusedExports = Array.from(this.unusedExports.keys()).length;
		const totalUnusedExports = Array.from(this.unusedExports.values()).reduce(
			(sum, exports) => sum + exports.size,
			0,
		);

		console.log('📊 ANALYSIS RESULTS');
		console.log('==================\n');

		console.log('📈 SUMMARY:');
		console.log(`   Total files analyzed: ${totalFiles}`);
		console.log(`   Unused files: ${unusedFilesCount}`);
		console.log(`   Files with unused exports: ${filesWithUnusedExports}`);
		console.log(`   Total unused exports: ${totalUnusedExports}\n`);

		// Show unused files
		if (this.unusedFiles.size > 0) {
			console.log('🗑️  UNUSED FILES:');
			const sortedUnusedFiles = Array.from(this.unusedFiles).sort();
			sortedUnusedFiles.forEach((file, index) => {
				const fileInfo = this.files.get(file);
				const sizeStr = fileInfo ? this.formatBytes(fileInfo.size) : 'unknown size';
				console.log(`   ${index + 1}. ${file} (${sizeStr})`);
			});
			console.log('');
		}

		// Show files with unused exports
		if (this.unusedExports.size > 0) {
			console.log('🔧 FILES WITH UNUSED EXPORTS:');
			const sortedFiles = Array.from(this.unusedExports.entries()).sort(([a], [b]) =>
				(a as string).localeCompare(b as string),
			);

			let exportIndex = 1;
			for (const [file, exports] of sortedFiles) {
				console.log(`   📄 ${file}:`);
				const sortedExports = Array.from(exports).sort();
				for (const exportName of sortedExports) {
					console.log(`      ${exportIndex}. export { ${exportName} }`);
					exportIndex++;
				}
			}
			console.log('');
		}

		console.log('💡 RECOMMENDATIONS:');
		console.log('===================\n');
		console.log('⚠️  Review each unused file and export carefully before removal:');
		console.log("   1. Check if it's part of a public API");
		console.log("   2. Verify it's not used by external consumers");
		console.log('   3. Consider if it provides future extensibility');
		console.log("   4. Ensure tests don't depend on it\n");

		console.log('🔄 MANUAL CLEANUP PROCESS:');
		console.log('   1. Review the analysis results above');
		console.log('   2. Remove files/exports that are truly unused');
		console.log('   3. Run: bun run build');
		console.log('   4. Run: bun run lint');
		console.log('   5. Verify all tests pass');
		console.log('   6. Re-run this analyzer to see improvements\n');
	}

	/**
	 * Format bytes to human readable format
	 */
	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 bytes';
		const k = 1024;
		const sizes = ['bytes', 'KB', 'MB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	/**
	 * Save analysis results to JSON file
	 */
	private saveResults(): void {
		const results = {
			timestamp: new Date().toISOString(),
			summary: {
				totalFiles: this.files.size,
				unusedFiles: this.unusedFiles.size,
				filesWithUnusedExports: Array.from(this.unusedExports.keys()).length,
				totalUnusedExports: Array.from(this.unusedExports.values()).reduce(
					(sum, exports) => sum + exports.size,
					0,
				),
			},
			unusedFiles: Array.from(this.unusedFiles).sort(),
			unusedExports: Object.fromEntries(
				Array.from(this.unusedExports.entries())
					.map(([file, exports]) => [file, Array.from(exports).sort()])
					.sort(([a], [b]) => (a as string).localeCompare(b as string)),
			),
			dependencyGraph: Object.fromEntries(
				Array.from(this.dependencyGraph.entries())
					.map(([file, deps]) => [file, Array.from(deps).sort()])
					.sort(([a], [b]) => (a as string).localeCompare(b as string)),
			),
		};

		fs.writeFileSync(ANALYSIS_OUTPUT_FILE, JSON.stringify(results, null, 2));
		console.log(`💾 Analysis results saved to: ${path.relative(ROOT_DIR, ANALYSIS_OUTPUT_FILE)}`);
	}
}

/**
 * Main function - analysis only
 */
async function main(): Promise<void> {
	const analyzer = new CodeAnalyzer();

	try {
		await analyzer.analyze();
	} catch (error) {
		console.error('💥 Analysis failed:', (error as Error).message);
		console.error((error as Error).stack);
		process.exit(1);
	}
}

// Run if called directly (works with both Node.js and Bun)
if ((import.meta as any).main || import.meta.url === `file://${process.argv[1]}`) {
	main();
}

export { CodeAnalyzer };
