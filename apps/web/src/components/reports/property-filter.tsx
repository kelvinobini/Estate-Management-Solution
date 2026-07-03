"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Property {
  id: string;
  name: string;
}

export function PropertyFilter({
  basePath,
  properties,
  current,
}: {
  basePath: string;
  properties: Property[];
  current?: string;
}) {
  const router = useRouter();

  function handleChange(value: string | null) {
    const query = new URLSearchParams();
    if (value && value !== "all") query.set("propertyId", value);
    router.push(`${basePath}?${query.toString()}`);
  }

  return (
    <Select defaultValue={current ?? "all"} onValueChange={handleChange}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="All properties" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All properties</SelectItem>
        {properties.map((property) => (
          <SelectItem key={property.id} value={property.id}>
            {property.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
