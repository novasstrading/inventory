import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";

export function Avatar({
  name,
  photoUrl,
  size = "default",
}: {
  name: string;
  /** App-relative path (e.g. "/api/employees/x/photo") — this component applies the basePath. */
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
        <img src={withBasePath(photoUrl)} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
