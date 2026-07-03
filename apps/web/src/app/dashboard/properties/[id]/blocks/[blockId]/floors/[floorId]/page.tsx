import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";
import { CreateUnitDialog } from "@/components/property/create-unit-dialog";
import { UnitStatusBadge } from "@/components/property/unit-status-badge";
import { formatNaira } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

interface Floor {
  id: string;
  level_number: number;
  label: string | null;
  block_id: string;
}

interface Unit {
  id: string;
  unit_code: string;
  unit_type: string;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  base_rent_kobo: string;
}

export default async function FloorDetailPage({
  params,
}: {
  params: Promise<{ id: string; blockId: string; floorId: string }>;
}) {
  const { id, blockId, floorId } = await params;

  let floor: Floor;
  try {
    floor = await api.get<Floor>(`/floors/${floorId}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const units = await api.get<Unit[]>(`/floors/${floorId}/units`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/properties/${id}/blocks/${blockId}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to block
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {floor.label ?? `Level ${floor.level_number}`}
        </h1>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Units</CardTitle>
            <CardDescription>Individual lettable units on this floor.</CardDescription>
          </div>
          <CreateUnitDialog floorId={floorId} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Beds / Baths</TableHead>
                <TableHead className="text-right">Base rent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No units yet.
                  </TableCell>
                </TableRow>
              )}
              {units.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell>
                    <Link href={`/dashboard/units/${unit.id}`} className="font-medium text-primary hover:underline">
                      {unit.unit_code}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{unit.unit_type.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    {unit.bedrooms ?? "—"} / {unit.bathrooms ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">{formatNaira(unit.base_rent_kobo)}</TableCell>
                  <TableCell>
                    <UnitStatusBadge status={unit.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
