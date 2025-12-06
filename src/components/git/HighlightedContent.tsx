import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface HighlightedContentProps {
  content: string;
  language: string;
  wordWrap?: boolean;
}

export const HighlightedContent = ({
  content,
  language,
  wordWrap = false,
}: HighlightedContentProps) => {
  if (language === "text" || !content.trim()) {
    return (
      <span
        className={
          wordWrap
            ? "select-text whitespace-pre-wrap"
            : "select-text whitespace-pre"
        }
      >
        {content}
      </span>
    );
  }

  return (
    <SyntaxHighlighter
      language={language}
      style={vscDarkPlus}
      customStyle={{
        margin: 0,
        padding: 0,
        background: "transparent",
        fontSize: "inherit",
        lineHeight: "inherit",
      }}
      codeTagProps={{
        style: {
          fontFamily: "inherit",
          fontSize: "inherit",
        },
      }}
      PreTag="span"
      CodeTag="span"
      showLineNumbers={false}
      wrapLines={wordWrap}
      wrapLongLines={wordWrap}
    >
      {content}
    </SyntaxHighlighter>
  );
};
