import axiosInstance from "@/lib/axios";

export async function trackAiTutorSubscribeIntent(parentToken: string) {
  await axiosInstance.post(
    "/parent/track/ai-tutor-subscribe-intent",
    undefined,
    {
      headers: {
        Authorization: `Bearer ${parentToken}`,
      },
    },
  );
}
