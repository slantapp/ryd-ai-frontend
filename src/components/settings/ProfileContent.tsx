import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";
import AvatarDialog from "@/components/shared/AvatarModal";
import { useUserProfileStore } from "@/stores/userProfileStore";
import { useAuthStore } from "@/stores/authStore";
import { useSubscriptionHistory } from "@/hooks/useSubscription";

const ProfileContent = () => {
  const avatar = useUserProfileStore((state) => state.avatar);
  const setAvatar = useUserProfileStore((state) => state.setAvatar);
  const user = useAuthStore((s) => s.user);
  const historyQuery = useSubscriptionHistory();

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <h2 className="mb-6 text-lg font-semibold font-solway text-gray-900">
        Update Profile
      </h2>
      <Card className="rounded-2xl shadow-none border-none mt-16">
        <CardContent className="p-0">
          <div className="relative flex flex-col items-center bg-[#F8F8FA] rounded-[20px] p-8">
            {/* Profile Avatar */}
            <div className="absolute -top-20">
              <AvatarDialog value={avatar} onChange={setAvatar} size="lg" />
            </div>

            {/* Profile Info */}
            <div className="mt-14 text-center">
              <h3 className="text-[32px] font-sans-serifbookflf text-gray-900">
                {fullName || user?.email || "Your profile"}
              </h3>
              <div className="mt-2 flex flex-col items-center text-sm text-gray-600">
                <div className="mt-1 flex items-center gap-1">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{user?.email || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription history */}
      <Card className="rounded-2xl shadow-none border-none">
        <CardContent className="p-0">
          <h2 className="mb-6 text-lg font-semibold font-solway text-gray-900">
            Subscription History
          </h2>

          <div className="bg-[#F8F8FA] rounded-[20px] p-4">
            {historyQuery.isLoading ? (
              <p className="text-sm text-gray-600">Loading history…</p>
            ) : historyQuery.isError ? (
              <p className="text-sm text-gray-600">
                Unable to load subscription history.
              </p>
            ) : (historyQuery.data?.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-600">No subscription history.</p>
            ) : (
              <div className="space-y-3">
                {historyQuery.data?.data?.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white p-4 ring-1 ring-gray-100"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-solway text-base font-bold text-gray-900">
                          {item.plan?.name || item.planKey}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          Status: {item.status}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <p>{item.plan?.priceLabel || item.billingCurrency}</p>
                        <p>
                          Updated{" "}
                          {new Date(item.updatedAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-gray-600">
                      Period:{" "}
                      {new Date(item.currentPeriodStart).toLocaleDateString()} —{" "}
                      {new Date(item.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileContent;
