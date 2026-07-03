import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { CreateInventoryItemDialog } from "@/components/maintenance/create-inventory-item-dialog";
import { RestockDialog } from "@/components/maintenance/restock-dialog";
import { formatNaira } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  quantity_on_hand: number;
  reorder_level: number;
  unit_cost_kobo: string;
}

export default async function InventoryPage() {
  const { data: items, forbidden } = await fetchOrForbidden(() => api.get<InventoryItem[]>("/inventory-items"));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">{forbidden ? "" : `${items?.length ?? 0} items`}</p>
        </div>
        {!forbidden && <CreateInventoryItemDialog />}
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view inventory." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parts &amp; supplies</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">On hand</TableHead>
                  <TableHead className="text-right">Reorder level</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No inventory items yet.
                    </TableCell>
                  </TableRow>
                )}
                {items?.map((item) => {
                  const lowStock = item.quantity_on_hand <= item.reorder_level;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sku ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.quantity_on_hand}
                          {lowStock && <Badge variant="destructive">Low</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.reorder_level}</TableCell>
                      <TableCell className="text-right">{formatNaira(item.unit_cost_kobo)}</TableCell>
                      <TableCell>
                        <RestockDialog itemId={item.id} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
