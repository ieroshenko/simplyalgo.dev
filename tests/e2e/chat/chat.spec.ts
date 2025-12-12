import { test, expect } from '../../utils/test-fixtures';
import { ChatHelper, ProblemHelper, NavigationHelper } from '../../utils/test-helpers';

test.describe('AI Chat', () => {
  let chatHelper: ChatHelper;
  let problemHelper: ProblemHelper;
  let navHelper: NavigationHelper;

  test.use({ storageState: { cookies: [], origins: [] } }); // Use authenticated state

  test.beforeEach(async ({ authenticatedPage }) => {
    chatHelper = new ChatHelper(authenticatedPage);
    problemHelper = new ProblemHelper(authenticatedPage);
    navHelper = new NavigationHelper(authenticatedPage);
  });

  test('should open chat interface', async ({ authenticatedPage }) => {
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    
    await chatHelper.openChat();
    
    // Should show chat interface
    await expect(authenticatedPage.locator('[data-testid="chat-interface"]')).toBeVisible();
    
    // Should show input field
    await expect(authenticatedPage.locator('[data-testid="chat-input"]')).toBeVisible();
    
    // Should show chat is open
    expect(await chatHelper.isChatOpen()).toBeTruthy();
  });

  test('should send message and receive AI response', async ({ authenticatedPage }) => {
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    
    await chatHelper.openChat();
    
    // Send a message
    await chatHelper.sendMessage('Can you give me a hint for this problem?');
    
    // Should receive AI response
    const aiResponse = await chatHelper.getLastAIMessage();
    expect(aiResponse).toBeTruthy();
    expect(aiResponse?.length).toBeGreaterThan(10); // Should have substantial content
  });

  test('should provide code suggestions', async ({ authenticatedPage }) => {
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    
    await chatHelper.openChat();
    
    // Ask for code help
    await chatHelper.sendMessage('Show me how to start solving this problem using a hash map');
    
    // Should receive code suggestion
    const aiResponse = await chatHelper.getLastAIMessage();
    expect(aiResponse).toContain('hash map' || 'Map');
  });

  test('should explain test failures', async ({ authenticatedPage }) => {
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    
    // Write incorrect code
    const incorrectSolution = `function twoSum(nums, target) {
  return [0, 1]; // Always wrong
}`;
    
    await problemHelper.writeCode(incorrectSolution);
    await problemHelper.runCode();
    
    await chatHelper.openChat();
    
    // Ask for help with failing tests
    await chatHelper.sendMessage('My code is failing the tests. Can you help me debug it?');
    
    // Should receive debugging help
    const aiResponse = await chatHelper.getLastAIMessage();
    expect(aiResponse).toBeTruthy();
    expect(aiResponse?.length).toBeGreaterThan(20);
  });

  test('should maintain chat history', async ({ authenticatedPage }) => {
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    
    await chatHelper.openChat();
    
    // Send multiple messages
    await chatHelper.sendMessage('What is the time complexity of this problem?');
    await chatHelper.sendMessage('Can you suggest an optimal solution?');
    await chatHelper.sendMessage('What data structures should I use?');
    
    // Should show all messages in chat
    const messages = authenticatedPage.locator('[data-testid="chat-message"]');
    await expect(messages).toHaveCount(6); // 3 user + 3 AI responses
    
    // Should maintain conversation context
    await chatHelper.sendMessage('Based on your previous suggestions, can you show me the code?');
    
    const contextualResponse = await chatHelper.getLastAIMessage();
    expect(contextualResponse).toBeTruthy();
  });

  test('should allow code insertion from chat', async ({ authenticatedPage }) => {
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    
    await chatHelper.openChat();
    
    // Ask for code
    await chatHelper.sendMessage('Show me the complete solution using a hash map');
    
    // Should have code insertion button
    await expect(authenticatedPage.locator('[data-testid="insert-code-button"]')).toBeVisible();
    
    // Click insert code
    await authenticatedPage.locator('[data-testid="insert-code-button"]').click();
    
    // Code should be inserted into editor
    const editorContent = await authenticatedPage.locator('.monaco-editor').first().textContent();
    expect(editorContent).toContain('function twoSum');
    expect(editorContent).toContain('Map');
  });

  test('should handle chat during problem solving', async ({ authenticatedPage }) => {
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    
    // Start writing code
    await problemHelper.writeCode('function twoSum(nums, target) {');
    
    // Open chat while coding
    await chatHelper.openChat();
    await chatHelper.sendMessage('I\'m stuck on the implementation. Any hints?');
    
    // Should receive response while preserving code
    const aiResponse = await chatHelper.getLastAIMessage();
    expect(aiResponse).toBeTruthy();
    
    // Code should still be in editor
    const editorContent = await authenticatedPage.locator('.monaco-editor').first().textContent();
    expect(editorContent).toContain('function twoSum');
  });

  test('should show typing indicators', async ({ authenticatedPage }) => {
    await navHelper.navigateToProblems();
    await problemHelper.selectProblem('Two Sum');
    
    await chatHelper.openChat();
    
    // Send message
    await chatHelper.sendMessage('Explain the two sum problem in detail');
    
    // Should show typing indicator
    await expect(authenticatedPage.locator('[data-testid="typing-indicator"]')).toBeVisible();
    
    // Wait for response
    await chatHelper.getLastAIMessage();
    
    // Typing indicator should disappear
    await expect(authenticatedPage.locator('[data-testid="typing-indicator"]')).not.toBeVisible();
  });
});
