import type { AuthUser } from "@/stores/authStore";

export const DEFAULT_CONTACT_SUBJECT = "AI Tutor Support";
export const SUPPORT_EMAIL = "learning@rydlearning.com";

export type ContactMessageFormData = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

export type ContactMessageFormErrors = Partial<
  Record<keyof ContactMessageFormData, string>
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getContactPrefillFromUser(user: AuthUser | null): {
  name: string;
  email: string;
} {
  if (!user) {
    return { name: "", email: "" };
  }

  const first = user.firstName?.trim() ?? "";
  const last = user.lastName?.trim() ?? "";
  const name = [first, last].filter(Boolean).join(" ");
  const email = user.email?.trim() ?? "";

  return { name, email };
}

export function validateContactMessageForm(
  data: ContactMessageFormData,
): ContactMessageFormErrors {
  const errors: ContactMessageFormErrors = {};

  const name = data.name.trim();
  if (!name) {
    errors.name = "Please enter your name.";
  } else if (name.length < 2) {
    errors.name = "Name must be at least 2 characters.";
  } else if (name.length > 200) {
    errors.name = "Name must be 200 characters or less.";
  }

  const email = data.email.trim();
  if (!email) {
    errors.email = "Please enter your email address.";
  } else if (!EMAIL_RE.test(email)) {
    errors.email = "Please enter a valid email address.";
  } else if (email.length > 320) {
    errors.email = "Email must be 320 characters or less.";
  }

  const subject = data.subject.trim();
  if (!subject) {
    errors.subject = "Please enter a subject.";
  } else if (subject.length < 2) {
    errors.subject = "Subject must be at least 2 characters.";
  } else if (subject.length > 300) {
    errors.subject = "Subject must be 300 characters or less.";
  }

  const message = data.message.trim();
  if (!message) {
    errors.message = "Please enter your message.";
  } else if (message.length < 10) {
    errors.message = "Message must be at least 10 characters.";
  } else if (message.length > 10000) {
    errors.message = "Message must be 10,000 characters or less.";
  }

  return errors;
}

export function emptyContactMessageForm(
  overrides?: Partial<ContactMessageFormData>,
): ContactMessageFormData {
  return {
    name: "",
    email: "",
    subject: DEFAULT_CONTACT_SUBJECT,
    message: "",
    ...overrides,
  };
}
