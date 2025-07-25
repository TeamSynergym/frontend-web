import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HiArrowRight } from "react-icons/hi";
import logo from "@/assets/logo.png";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const Section1 = () => {
  const navigate = useNavigate();
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section ref={ref} className="flex flex-col items-center justify-center min-h-screen 
                      bg-gray-50 dark:bg-background px-4 py-16 md:py-24 text-center"
              style={{
                backgroundImage: `url(${logo})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                }}>

      <div className={`transition-all duration-1000 ease-out ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-10 opacity-0'
      }`}>
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight text-gray-900">
          <span className="text-blue-500">AI</span>와 함께 똑똑하게, <br />
          나를 위한{" "}
          <span className="underline decoration-blue-500 decoration-4">
            진짜 자세교정
          </span>
          을 시작하세요
        </h1>
      </div>

      <div className={`transition-all duration-1000 ease-out delay-300 ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-10 opacity-0'
      }`}>
        <p className="mt-6 text-lg text-gray-600 max-w-2xl">
          당신의 몸을 가장 잘 아는 파트너, Synergym AI가 24시간 함께합니다.
        </p>
      </div>

      <div className={`transition-all duration-1000 ease-out delay-500 ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-10 opacity-0'
      }`}>
        <Button
          onClick={() => navigate("/photoupload")}
          style={{ padding: "1.25rem 2rem", fontSize: "1.125rem" }}
          className="bg-blue-600 text-white flex items-center  justify-center gap-2 mt-8 
                      px-6 py-4 text-lg md:px-8 md:py-5
                      transition-transform duration-200 hover:scale-105 hover:bg-blue-700"
        >
          내 자세 분석하기 <HiArrowRight className="w-5 h-5" />
        </Button>
      </div>

    </section>
  );
};

export default Section1;
