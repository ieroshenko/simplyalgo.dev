import { BaseLanguageExecutor } from "./base.ts";

/**
 * Java executor for Judge0
 */
export class JavaExecutor extends BaseLanguageExecutor {
    getLanguageId(): number {
        return 62; // Java (OpenJDK 13.0.1)
    }

    getLanguageName(): string {
        return "java";
    }

    processCode(code: string, testCases: unknown[], functionName: string): string {
        const testCasesJson = JSON.stringify(testCases, null, 2);

        return `
import java.util.*;
import java.io.*;
import com.google.gson.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        int testCaseIndex = Integer.parseInt(reader.readLine().trim());
        
        // Test cases data
        String testCasesJson = ${JSON.stringify(testCasesJson)};
        
        Gson gson = new Gson();
        TestCase[] testCases = gson.fromJson(testCasesJson, TestCase[].class);
        
        if (testCaseIndex >= 0 && testCaseIndex < testCases.length) {
            TestCase tc = testCases[testCaseIndex];
            Solution solution = new Solution();
            Object result = solution.${functionName}(tc.input);
            System.out.println(gson.toJson(result));
        } else {
            System.out.println("Invalid test case index");
        }
    }
    
    static class TestCase {
        Object input;
        Object expected;
    }
}

// User code
${code}
`;
    }
}
