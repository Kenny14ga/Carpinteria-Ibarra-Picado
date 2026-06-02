"use client";

import { useCallback, useEffect, useState } from "react";

export type BeforeInstallPromptChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<BeforeInstallPromptChoice>;
  prompt: () => Promise<void>;
}

type PWAInstallState = {
  isInstallable: boolean;
  isInstalled: boolean;
};

type PWAInstallHook = PWAInstallState & {
  triggerInstall: () => Promise<BeforeInstallPromptChoice | null>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInstalled = false;
let isListening = false;

const subscribers = new Set<() => void>();

function getState(): PWAInstallState {
  return {
    isInstallable: Boolean(deferredPrompt) && !isInstalled,
    isInstalled
  };
}

function notifySubscribers() {
  subscribers.forEach((subscriber) => subscriber());
}

function handleBeforeInstallPrompt(event: Event) {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  isInstalled = false;
  notifySubscribers();
}

function handleAppInstalled() {
  deferredPrompt = null;
  isInstalled = true;
  notifySubscribers();
}

function ensureInstallListeners() {
  if (isListening || typeof window === "undefined") {
    return;
  }

  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);
  isListening = true;
}

function subscribe(listener: () => void) {
  ensureInstallListeners();
  subscribers.add(listener);

  return () => {
    subscribers.delete(listener);
  };
}

export function usePWAInstall(): PWAInstallHook {
  const [state, setState] = useState<PWAInstallState>(getState);

  useEffect(() => {
    return subscribe(() => setState(getState()));
  }, []);

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return null;
    }

    const promptEvent = deferredPrompt;

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      return choice;
    } finally {
      deferredPrompt = null;
      notifySubscribers();
    }
  }, []);

  return {
    ...state,
    triggerInstall
  };
}
