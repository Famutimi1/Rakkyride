import Image from "next/image";
export function BrandLogo() {
  return (
    <span className="brand-logo">
      <Image
        src="/brand/rakky-ride-logo.png"
        alt="Rakky Ride"
        width={76}
        height={76}
        priority
      />
    </span>
  );
}
