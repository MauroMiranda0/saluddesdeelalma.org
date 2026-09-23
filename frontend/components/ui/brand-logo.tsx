type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

const LOGO_URL = "/logo.jpg";

export const BrandLogo = ({ className = "", priority }: BrandLogoProps) => (
  <img
    src={LOGO_URL}
    alt="Salud desde el Alma"
    className={`rounded-full object-cover ${className}`}
    loading={priority ? "eager" : "lazy"}
  />
);
