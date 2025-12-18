import { useEffect, useState } from "react";
import { type RepoTab } from "@/components/git/RepoTabs";
import {
  getTabs,
  getActiveTab,
  removeActiveTab,
  removeTabs,
  saveActiveTab,
  saveTabs,
} from "@/lib/localStorage";

export const useRepoTabs = () => {
  const [tabs, setTabs] = useState<RepoTab[]>(() => {
    if (typeof window !== "undefined") {
      const saved = getTabs();
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return getActiveTab();
    }
    return null;
  });

  useEffect(() => {
    if (tabs.length > 0) {
      saveTabs(JSON.stringify(tabs));
    } else {
      removeTabs();
    }
  }, [tabs]);

  useEffect(() => {
    if (activeTabId) {
      saveActiveTab(activeTabId);
    } else {
      removeActiveTab();
    }
  }, [activeTabId]);

  return {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
  };
};
