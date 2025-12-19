import { BaseLanguageExecutor } from "./base.ts";

/**
 * JavaScript executor for Judge0
 */
export class JavaScriptExecutor extends BaseLanguageExecutor {
    getLanguageId(): number {
        return 63; // JavaScript (Node.js 12.14.0)
    }

    getLanguageName(): string {
        return "javascript";
    }

    processCode(code: string, testCases: unknown[], functionName: string): string {
        const testCasesJson = JSON.stringify(testCases, null, 2);

        return `
const testCases = ${testCasesJson};

// User code
${code}

// Read test case index from stdin
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  const testCaseIndex = parseInt(line.trim());
  
  if (testCaseIndex >= 0 && testCaseIndex < testCases.length) {
    const tc = testCases[testCaseIndex];
    const result = ${functionName}(tc.input);
    console.log(JSON.stringify(result));
  } else {
    console.log("Invalid test case index");
  }
  
  process.exit(0);
});
`;
    }
}
