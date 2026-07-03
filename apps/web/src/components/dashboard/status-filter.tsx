"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StatusFilter({
  basePath,
  statuses,
  current,
}: {
  basePath: string;
  statuses: readonly string[];
  current?: string;
}) {
  const router = useRouter();

  function handleChange(value: string | null) {
    const query = new URLSearchParams();
    if (value && value !== "all") query.set("status", value);
    query.set("page", "1");
    router.push(`${basePath}?${query.toString()}`);
  }

  return (
    <Select defaultValue={current ?? "all"} onValueChange={handleChange}>
      <SelectTrigger className="w-44">
        <SelectValue placeholder="All statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        {statuses.map((status) => (
          <SelectItem key={status} value={status} className="capitalize">
            {status.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
