import { Card, CardContent } from "@/components/ui/card";
import { Mail, Star, Trophy, CreditCard } from "lucide-react";
import { FaChevronDown } from "react-icons/fa6";
import AvatarDialog from "@/components/shared/AvatarModal";
import { useUserProfileStore } from "@/stores/userProfileStore";

const ProfileContent = () => {
  const avatar = useUserProfileStore((state) => state.avatar);
  const setAvatar = useUserProfileStore((state) => state.setAvatar);

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
                Deborah Oluwatoyin
              </h3>
              <div className="mt-2 flex flex-col items-center text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <span role="img" aria-label="flag">
                    🇺🇸
                  </span>
                  <span>Los Angeles, United States</span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>deborah@gmail.com</span>
                </div>
              </div>
            </div>

            {/* Rewards */}
            <div className="mt-6 flex w-full items-center justify-center gap-6 rounded-xl bg-[#F3ECFE] p-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-900">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span>120 Points</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">My Reward Points</p>
              </div>
              <div className="h-10 w-[1px] bg-gray-300"></div>
              <div>
                <div className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-900">
                  <Trophy className="h-5 w-5 text-indigo-600" />
                  <span>2nd rank</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">My Ranking</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card className="rounded-2xl shadow-none border-none">
        <CardContent className="p-0">
          <h2 className="mb-6 text-lg font-semibold font-solway text-gray-900">
            Payment History
          </h2>

          <div className="bg-[#F8F8FA] rounded-[20px] p-3">
            {/* Transaction Item */}
            <div className="mb-6 space-y-4 ">
              {/* Header */}
              <div className="flex items-center justify-between bg-white p-3 rounded-[8px]">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/mastercard.png"
                    alt="Mastercard"
                    width={38}
                    height={38}
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      Jessica Anderson
                    </p>
                    <p className="text-sm text-gray-500">Ref: 1213234234232</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">$50.00</p>
                  <p className="text-sm text-gray-500">Mar 10, 2025</p>
                </div>
                <div className="bg-purple-600 rounded-full p-1 text-white">
                  <FaChevronDown size={12} strokeWidth={3} />
                </div>
              </div>

              {/* Details */}
              <div className="text-sm text-gray-600 bg-white p-3 rounded-[8px]">
                <p className="font-medium">1st September, 2021 at 11:30 PM</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1">🎓 2 Courses</span>
                  <span className="flex items-center gap-1 text-green-600">
                    💲 $75.00 USD
                  </span>
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    Credit Card
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-gray-700">
                  <span>Kevin Gilbert</span>
                  <span>4142 **** ****</span>
                  <span>04/24</span>
                </div>
              </div>
            </div>

            {/* Another Transaction */}
            <div className="bg-white p-3 rounded-[8px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/mastercard.png"
                    alt="Mastercard"
                    width={38}
                    height={38}
                  />
                  <div>
                    <p className="font-medium text-gray-900">
                      Jessica Anderson
                    </p>
                    <p className="text-sm text-gray-500">Ref: 1213234234232</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">$50.00</p>
                  <p className="text-sm text-gray-500">Mar 10, 2025</p>
                </div>
                <div className="bg-purple-600 rounded-full p-1 text-white">
                  <FaChevronDown size={12} strokeWidth={3} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileContent;
