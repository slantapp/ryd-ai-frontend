import { useSyncExternalStore } from "react";

const ALAT_SCRIPT_SRC = "https://web.alatpay.ng/js/alatpay.js";
const ALAT_BODY_ATTR = "data-alat-checkout-active";

type Listener = () => void;

let alatCheckoutActive = false;
const listeners = new Set<Listener>();

if (typeof window !== "undefined") {
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && alatCheckoutActive) {
      setAlatCheckoutActive(false);
    }
  });
}

function emitAlatCheckoutActive() {
  listeners.forEach((listener) => listener());
}

function syncAlatBodyAttr(active: boolean) {
  if (typeof document === "undefined") return;
  if (active) {
    document.body.setAttribute(ALAT_BODY_ATTR, "true");
  } else {
    document.body.removeAttribute(ALAT_BODY_ATTR);
  }
}

/** Suspend app modals / focus traps so ALAT can receive input. */
export function setAlatCheckoutActive(active: boolean): void {
  syncAlatBodyAttr(active);
  if (alatCheckoutActive === active) return;
  alatCheckoutActive = active;
  emitAlatCheckoutActive();
}

export function getAlatCheckoutActive(): boolean {
  return alatCheckoutActive;
}

export function subscribeAlatCheckoutActive(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAlatCheckoutActive(): boolean {
  return useSyncExternalStore(
    subscribeAlatCheckoutActive,
    getAlatCheckoutActive,
    () => false,
  );
}

/** Wait until React has closed/suspended stacked dialogs before showing ALAT. */
export function waitForAlatHostYield(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export type AlatPaySetupOptions = {
  apiKey: string;
  businessId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  metadata?: Record<string, unknown>;
  currency: string;
  amount: number;
  onTransaction: (response: {
    status?: boolean;
    transactionStatus?: string;
    data?: { id?: string };
  }) => void;
  onClose?: () => void;
};

type AlatPayPopup = {
  show: () => void;
};

type AlatPayGlobal = {
  setup: (options: AlatPaySetupOptions) => AlatPayPopup;
};

declare global {
  interface Window {
    Alatpay?: AlatPayGlobal;
  }
}

let alatScriptPromise: Promise<void> | null = null;

export function loadAlatPayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("ALAT Pay is only available in the browser."));
  }
  if (window.Alatpay) {
    return Promise.resolve();
  }
  if (alatScriptPromise) {
    return alatScriptPromise;
  }

  alatScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${ALAT_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load ALAT Pay.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = ALAT_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load ALAT Pay."));
    document.body.appendChild(script);
  });

  return alatScriptPromise;
}

export function openAlatPayCheckout(options: AlatPaySetupOptions): AlatPayPopup {
  if (!window.Alatpay) {
    throw new Error("ALAT Pay is not loaded.");
  }
  return window.Alatpay.setup(options);
}
