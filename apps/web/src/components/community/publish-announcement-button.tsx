"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publishAnnouncementAction } from "@/app/dashboard/community/actions";

export function PublishAnnouncementButton({ announcementId }: { announcementId: string }) {
  const [isPending, startTransition] = useTransition();

  function handlePublish() {
    startTransition(async () => {
      const result = await publishAnnouncementAction(announcementId);
      if (result.ok) {
        toast.success("Announcement published");
      } else {
        toast.error(result.message ?? "Unable to publish announcement");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={handlePublish}>
      Publish
    </Button>
  );
}
