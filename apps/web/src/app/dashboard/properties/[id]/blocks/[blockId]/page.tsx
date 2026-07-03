import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";
import { CreateFloorDialog } from "@/components/property/create-floor-dialog";
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

interface Block {
  id: string;
  name: string;
  property_id: string;
}

interface Floor {
  id: string;
  level_number: number;
  label: string | null;
}

export default async function BlockDetailPage({
  params,
}: {
  params: Promise<{ id: string; blockId: string }>;
}) {
  const { id, blockId } = await params;

  let block: Block;
  try {
    block = await api.get<Block>(`/blocks/${blockId}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const floors = await api.get<Floor[]>(`/blocks/${blockId}/floors`);
  const sortedFloors = [...floors].sort((a, b) => a.level_number - b.level_number);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/properties/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to property
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{block.name}</h1>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Floors</CardTitle>
            <CardDescription>Levels within this block, ordered low to high.</CardDescription>
          </div>
          <CreateFloorDialog blockId={blockId} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Level</TableHead>
                <TableHead>Label</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFloors.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No floors yet.
                  </TableCell>
                </TableRow>
              )}
              {sortedFloors.map((floor) => (
                <TableRow key={floor.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/properties/${id}/blocks/${blockId}/floors/${floor.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {floor.level_number}
                    </Link>
                  </TableCell>
                  <TableCell>{floor.label ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
