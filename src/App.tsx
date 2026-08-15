import { useState } from "react";

const examplePrompt = `Replace the starter screen with a pomodoro timer. One screen: a big readable countdown, start, pause, and reset buttons, and a satisfying finished state. Make it look polished.`;

export default function App() {
  const [copied, setCopied] = useState(false);

  async function copyPrompt() {
    await navigator.clipboard.writeText(examplePrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000); // 2 seconds
  }

  return (
    <main>
      <section className="card" aria-labelledby="page-title">
        <p className="eyebrow">AI Club at Oregon State</p>
        <h1 id="page-title">Workshop 3</h1>
        <p className="intro">
          This screen is a placeholder. Ask your agent to replace it with your app.
        </p>

        <div className="prompt-block">
          <div className="prompt-heading">
            <p>Try a prompt like this</p>
            <button type="button" onClick={copyPrompt}>
              {copied ? "Copied" : "Copy prompt"}
            </button>
          </div>
          <p className="prompt-text">{examplePrompt}</p>
        </div>

        <p className="hint">Or build your own idea. See the README for more.</p>
      </section>
    </main>
  );
}
