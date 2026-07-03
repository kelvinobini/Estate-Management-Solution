import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { CreateAnnouncementDialog } from "@/components/community/create-announcement-dialog";
import { PublishAnnouncementButton } from "@/components/community/publish-announcement-button";
import { Pagination } from "@/components/dashboard/pagination";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Announcement {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  created_at: string;
}

interface AnnouncementListResponse {
  rows: Announcement[];
  total: number;
  page: number;
  pageSize: number;
}

interface Property {
  id: string;
  name: string;
}

export default async function AnnouncementsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;

  const [{ data, forbidden }, { data: properties }] = await Promise.all([
    fetchOrForbidden(() => api.get<AnnouncementListResponse>(`/announcements?page=${page}&pageSize=20`)),
    fetchOrForbidden(() => api.get<Property[]>("/properties")),
  ]);
  const announcements = data?.rows;
  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground">
            {forbidden ? "" : `${data?.total ?? 0} announcements`}
          </p>
        </div>
        {!forbidden && <CreateAnnouncementDialog properties={properties ?? []} />}
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view announcements." />
      ) : announcements?.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No announcements yet.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements?.map((announcement) => (
            <Card key={announcement.id}>
              <CardHeader className="flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{announcement.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">Created {formatDate(announcement.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {announcement.published_at ? (
                    <Badge variant="default">Published</Badge>
                  ) : (
                    <>
                      <Badge variant="outline">Draft</Badge>
                      <PublishAnnouncementButton announcementId={announcement.id} />
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="text-sm">{announcement.body}</CardContent>
            </Card>
          ))}
        </div>
      )}

      {!forbidden && (
        <Pagination basePath="/dashboard/community/announcements" page={page} totalPages={totalPages} />
      )}
    </div>
  );
}
