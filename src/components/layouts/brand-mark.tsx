import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "onLight" | "onDark";
  className?: string;
};

export function BrandMark({ variant = "onLight", className }: Props) {
  const src =
    variant === "onDark"
      ? "/brand/authlete-emblem-white.svg"
      : "/brand/authlete-emblem-blue.svg";
  return (
    <Image
      src={src}
      alt="Authlete"
      width={24}
      height={24}
      className={cn("h-6 w-6", className)}
    />
  );
}
