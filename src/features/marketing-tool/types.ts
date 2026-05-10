export type InstructorType = "woman" | "man";

export interface InstructorConfig {
  id: InstructorType;
  name: string;
  avatarUrl: string;
  avatarBody: "F" | "M";
  ttsVoice: string;
  description: string;
}
