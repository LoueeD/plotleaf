const prompt = document.querySelector('#agent-prompt');
const button = document.querySelector('#copy-prompt');
const status = document.querySelector('#copy-status');

if (prompt && button && status) {
  prompt.textContent = `Build a beautiful, interactive report with Plotleaf.\nHere's what I want to explore: [Your brief and data]\nFollow ${new URL('/agent', window.location.origin).href} and give me a preview and a standalone HTML report.`;
  button.disabled = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(prompt.textContent);
      status.textContent = 'Copied. Ready for your agent.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(prompt);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      status.textContent = 'Select and copy the prompt.';
    }
  });
}
