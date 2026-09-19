type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

const LOGO_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDdN8AH6gyHZ5_IWLbOVVUBWrQ6KI50NqvpSuIyhfW7RCdyFF_B1vk7Etdu3Lbe1oGbrDiElgM8hRpbY0iAHjoerJvgZj-UqJTVTKYePNaoPWMxFIDv4_60OK-q2fYkuyuEyPB-V8DWBW-8MK6nZ-XtSB_4lXvQAIBpQ1yuRqaWD8oClbCOFmmCygBC0pdIhWI8fBTFG_kxbSv4RtNju1Zke9E-ad1xgWYyFfFhGm68ha1RzRAu8fo8";

export const BrandLogo = ({ className = "", priority }: BrandLogoProps) => (
  <img
    src={LOGO_URL}
    alt="Salud desde el Alma"
    className={`rounded-full object-cover ${className}`}
    loading={priority ? "eager" : "lazy"}
  />
);
