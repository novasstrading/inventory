import { CopyCodeCard } from "@/components/auth/copy-code-card";

export default async function CopyPage({ searchParams }: PageProps<"/copy">) {
  const params = await searchParams;
  const raw = Array.isArray(params.c) ? params.c[0] : params.c;
  const code = (raw ?? "").replace(/[^0-9]/g, "");
  return <CopyCodeCard code={code} />;
}
