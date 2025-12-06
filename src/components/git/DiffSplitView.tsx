import { DiffSplitSide, type SplitLine } from "./DiffSplitSide";

interface DiffSplitViewProps {
  splitViewData: SplitLine[];
  language: string;
  wordWrap: boolean;
}

export const DiffSplitView = ({
  splitViewData,
  language,
  wordWrap,
}: DiffSplitViewProps) => {
  return (
    <div className="flex font-mono text-xs h-full">
      <DiffSplitSide
        side="left"
        title="Old"
        splitViewData={splitViewData}
        language={language}
        wordWrap={wordWrap}
        className="border-r border-border"
      />
      <DiffSplitSide
        side="right"
        title="New"
        splitViewData={splitViewData}
        language={language}
        wordWrap={wordWrap}
      />
    </div>
  );
};
