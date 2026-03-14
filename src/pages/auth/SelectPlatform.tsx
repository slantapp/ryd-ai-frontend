import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FaArrowRight } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";

const SelectPlatform = () => {
  const navigate = useNavigate();
  return (
    <div className="relative flex flex-col justify-center items-center p-6 h-screen">
      <div className=" flex gap-10">
        <Card className="max-w-md  w-full bg-[#F3ECFE] rounded-[20px] border-none shadow-none ">
          <CardContent className="flex flex-col gap-6 items-center text-center justify-center px-16 py-2">
            <img src="/images/illustration-1.png" alt="learning illustration" />
            <div className="flex flex-col gap-6">
              <h1 className="font-solway font-bold text-[#0A090B] text-[24px] tracking-[-0.72px] leading-[28.8px]">
                RYD Platform
              </h1>
              <p className="text-[#4F4D55] font-inter">
                You can access your One-to-one tutor via the RYD Platforms
              </p>
              <div className="px-10">
                <Button className="relative h-[56px] w-full rounded-[20px] font-solway font-semibold text-[#0A090B] hover:text-primary bg-white text-lg hover:bg-inherit/20 transition-colors">
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
        <Card className="max-w-md  w-full bg-[#CCE0FD] rounded-[20px] border-none shadow-none ">
          <CardContent className="flex flex-col gap-6 items-center text-center justify-center px-16 py-2">
            <img src="/images/illustration-2.png" alt="learning illustration" />
            <div className="flex flex-col gap-5">
              <h1 className="font-solway font-bold text-[#0A090B] text-[24px] tracking-[-0.72px] leading-[28.8px]">
                AI-Powered LMS
              </h1>
              <p className="text-[#4F4D55] font-inter">
                You can access our AI-Powered LMS system where our in-built AI
                helps you navigate your Learning Progress
              </p>
              <div className="px-10">
                <Button
                  onClick={() => navigate("/select-profile")}
                  className="relative h-[56px] w-full rounded-[20px] font-solway font-semibold text-[#0A090B] hover:text-[#0063F7] bg-white text-lg hover:bg-inherit/20 transition-colors"
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
