const ALAT_SCRIPT_SRC = "https://web.alatpay.ng/js/alatpay.js";
const ALAT_BODY_ATTR = "data-alat-checkout-active";

/** Hide app modals so ALAT overlay receives touches (mobile). */
export function setAlatCheckoutActive(active: boolean): void {
  if (typeof document === "undefined") return;
  if (active) {
    document.body.setAttribute(ALAT_BODY_ATTR, "true");
  } else {
    document.body.removeAttribute(ALAT_BODY_ATTR);
  }
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
