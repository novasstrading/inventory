import { cn } from "@/lib/utils";

export function Avatar({
  name,
  photoUrl,
  size = "default",
}: {
  name: string;
  photoUrl?: string | null;
  size?: "default" | "lg";
}) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const dims = size === "lg" ? "size-14 text-xl" : "size-[34px] text-[13px]";

  return (
    <span
      className={cn(
        "inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy font-bold text-white",
        dims,
      )}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- authenticated, non-static proxy URL
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
