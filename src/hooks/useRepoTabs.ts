import { useEffect, useState } from "react";
import { type RepoTab } from "@/components/git/TopBar";
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
    const saved = getTabs();
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    return getActiveTab();
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
