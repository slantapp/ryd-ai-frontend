import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RYD_PARENT_SIGN_IN_URL, PUBLIC_PATHS } from "@/utils/routePaths";
import { FaArrowRight } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";

const SelectPlatform = () => {
  const navigate = useNavigate();
  const goToParentSignIn = () => {
    window.location.assign(RYD_PARENT_SIGN_IN_URL);
  };
  const goToAiLogin = () => {
    navigate(PUBLIC_PATHS.LOGIN);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10 md:py-12">
      <div className="flex w-full max-w-md flex-col gap-6 md:gap-8 lg:max-w-5xl lg:flex-row lg:items-stretch lg:justify-center lg:gap-10">
        <Card className="w-full max-w-md shrink-0 rounded-[20px] border-none bg-[#F3ECFE] shadow-none lg:mx-0">
          <CardContent className="flex flex-col items-center justify-center gap-5 px-6 py-6 text-center sm:gap-6 sm:px-8 sm:py-8 md:px-12 lg:px-14 xl:px-16">
            <img
              src="/images/illustration-1.png"
              alt="learning illustration"
              className="h-auto w-full max-w-[180px] object-contain sm:max-w-[200px] md:max-w-[220px]"
            />
            <div className="flex w-full flex-col gap-5 sm:gap-6">
              <h1 className="font-solway text-xl font-bold leading-tight tracking-[-0.03em] text-[#0A090B] sm:text-[22px] sm:leading-[1.2] md:text-[24px] md:leading-[28.8px] md:tracking-[-0.72px]">
                RYD Platform
              </h1>
              <p className="font-inter text-sm leading-relaxed text-[#4F4D55] sm:text-base">
                You can access your One-to-one tutor via the RYD Platforms
              </p>
              <div className="px-2 sm:px-4 md:px-8 lg:px-10">
                <Button
                  type="button"
                  onClick={goToParentSignIn}
                  className="relative h-[52px] w-full rounded-[20px] bg-white font-solway text-base font-semibold text-[#0A090B] transition-colors hover:bg-inherit/20 hover:text-primary sm:h-[56px] sm:text-lg"
                >
                  <div className="absolute flex items-center justify-center rounded-[20px] h-full w-[58px] left-0 bg-primary p-2">
                    <div className="flex justify-center items-center rounded-full text-primary bg-white w-full h-full ">
                      <FaArrowRight size={24} />
                    </div>
                  </div>
                  Let's Go!
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="w-full max-w-md shrink-0 rounded-[20px] border-none bg-[#CCE0FD] shadow-none lg:mx-0">
          <CardContent className="flex flex-col items-center justify-center gap-5 px-6 py-6 text-center sm:gap-6 sm:px-8 sm:py-8 md:px-12 lg:px-14 xl:px-16">
            <img
              src="/images/illustration-2.png"
              alt="learning illustration"
              className="h-auto w-full max-w-[180px] object-contain sm:max-w-[200px] md:max-w-[220px]"
            />
            <div className="flex w-full flex-col gap-5">
              <h1 className="font-solway text-xl font-bold leading-tight tracking-[-0.03em] text-[#0A090B] sm:text-[22px] sm:leading-[1.2] md:text-[24px] md:leading-[28.8px] md:tracking-[-0.72px]">
                AI-Powered LMS
              </h1>
              <p className="font-inter text-sm leading-relaxed text-[#4F4D55] sm:text-base">
                You can access our AI-Powered LMS system where our in-built AI
                helps you navigate your Learning Progress
              </p>
              <div className="px-2 sm:px-4 md:px-8 lg:px-10">
                <Button
                  type="button"
                  onClick={goToAiLogin}
                  className="relative h-[52px] w-full rounded-[20px] bg-white font-solway text-base font-semibold text-[#0A090B] transition-colors hover:bg-inherit/20 hover:text-[#0063F7] sm:h-[56px] sm:text-lg"
                >
                  <div className="absolute flex items-center justify-center rounded-[20px] h-full w-[58px] left-0 bg-[#0063F7] p-2">
                    <div className="flex justify-center items-center rounded-full text-[#0063F7] bg-white w-full h-full ">
                      <FaArrowRight size={24} />
                    </div>
                  </div>
                  Let's Go!
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SelectPlatform;
