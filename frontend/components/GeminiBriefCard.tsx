"use client";

import { Sparkles, Wind, ShieldAlert, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface GeminiBriefCardProps {
  brief: string;
  stationName: string;
}

interface BriefSection {
  title: string;
  content: string;
  type: "atmospheric" | "health" | "mitigation";
}

export default function GeminiBriefCard({ brief, stationName }: GeminiBriefCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Parse markdown content into structured sections
  const parseSections = (rawText: string): BriefSection[] => {
    const sections: BriefSection[] = [];
    const lines = rawText.split("\n").filter((l) => l.trim().length > 0);

    let currentTitle = "";
    let currentContent: string[] = [];
    let currentType: "atmospheric" | "health" | "mitigation" = "atmospheric";

    lines.forEach((line) => {
      const cleanLine = line.trim();

      // Skip root heading
      if (cleanLine.startsWith("###") || cleanLine.toLowerCase().includes("environmental diagnostics")) {
        return;
      }

      // Check for numbered sections
      if (cleanLine.includes("**1.") || cleanLine.toLowerCase().includes("atmospheric & emission")) {
        if (currentTitle) {
          sections.push({ title: currentTitle, content: currentContent.join(" "), type: currentType });
          currentContent = [];
        }
        currentTitle = "Atmospheric & Emission Dynamics";
        currentType = "atmospheric";
        const contentPart = cleanLine.replace(/\*\*[0-9]\.[^*]+\*\*:\s*/, "").replace(/\*\*/g, "");
        if (contentPart) currentContent.push(contentPart);
      } else if (cleanLine.includes("**2.") || cleanLine.toLowerCase().includes("health & precautionary")) {
        if (currentTitle) {
          sections.push({ title: currentTitle, content: currentContent.join(" "), type: currentType });
          currentContent = [];
        }
        currentTitle = "Citizen Health & Precautionary Guidance";
        currentType = "health";
        const contentPart = cleanLine.replace(/\*\*[0-9]\.[^*]+\*\*:\s*/, "").replace(/\*\*/g, "");
        if (contentPart) currentContent.push(contentPart);
      } else if (cleanLine.includes("**3.") || cleanLine.toLowerCase().includes("recommended citizen mitigations") || cleanLine.toLowerCase().includes("mitigations")) {
        if (currentTitle) {
          sections.push({ title: currentTitle, content: currentContent.join(" "), type: currentType });
          currentContent = [];
        }
        currentTitle = "Recommended Citizen Mitigations";
        currentType = "mitigation";
        const contentPart = cleanLine.replace(/\*\*[0-9]\.[^*]+\*\*:\s*/, "").replace(/\*\*/g, "");
        if (contentPart) currentContent.push(contentPart);
      } else {
        const stripped = cleanLine.replace(/\*\*/g, "");
        currentContent.push(stripped);
      }
    });

    if (currentTitle && currentContent.length > 0) {
      sections.push({ title: currentTitle, content: currentContent.join(" "), type: currentType });
    }

    if (sections.length === 0) {
      sections.push({
        title: "Executive Synthesis",
        content: rawText.replace(/###/g, "").replace(/\*\*/g, "").trim(),
        type: "atmospheric",
      });
    }

    return sections;
  };

  const sections = parseSections(brief);

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case "atmospheric":
        return "text-cyan-400 border-cyan-900/60 bg-cyan-950/30";
      case "health":
        return "text-amber-400 border-amber-900/60 bg-amber-950/30";
      case "mitigation":
        return "text-emerald-400 border-emerald-900/60 bg-emerald-950/30";
      default:
        return "text-neutral-400 border-neutral-800 bg-neutral-900";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "atmospheric":
        return <Wind className="h-3.5 w-3.5 text-cyan-400" />;
      case "health":
        return <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />;
      case "mitigation":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-neutral-400" />;
    }
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-[#09090b] p-4 sm:p-5 space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-200">
                Gemini 1.5 Atmospheric Diagnostic
              </h3>
              <span className="rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.2 text-[10px] font-mono text-neutral-400">
                PROMPT SYNTHESIS
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 font-mono">
              Target node: <strong className="text-neutral-300 font-medium">{stationName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            SYNTHESIS VERIFIED
          </span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label={collapsed ? "Expand briefing" : "Collapse briefing"}
          >
            {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Structured Sections */}
      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {sections.map((sec, idx) => (
            <div
              key={idx}
              className="rounded-md border border-neutral-800/80 bg-neutral-950/80 p-3.5 flex flex-col justify-between hover:border-neutral-700 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1 rounded bg-neutral-900 border border-neutral-800">
                    {getIcon(sec.type)}
                  </span>
                  <span className={`text-[10px] font-mono font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${getBadgeStyle(sec.type)}`}>
                    {sec.title}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans pt-1">
                  {sec.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
