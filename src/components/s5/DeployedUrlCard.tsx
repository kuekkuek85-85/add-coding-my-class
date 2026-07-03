import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Save, Link2 } from "lucide-react";
import { toast } from "sonner";

import { getMyS5State, saveMyDeployedUrl } from "@/lib/s5.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeployedUrlCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const fetchState = useServerFn(getMyS5State);
  const save = useServerFn(saveMyDeployedUrl);
  const key = ["s5-state", userId];

  const { data } = useQuery({
    queryKey: key,
    queryFn: () => fetchState({ data: { userId } }),
    enabled: !!userId,
  });

  const saved = data?.ok ? data.deployedUrl : "";
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(saved ?? "");
  }, [saved]);

  const mut = useMutation({
    mutationFn: () => save({ data: { userId, url } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("배포 URL이 저장되었습니다.");
      qc.invalidateQueries({ queryKey: key });
    },
  });

  const dirty = url.trim() !== (saved ?? "").trim();

  return (
    <div className="rounded-2xl border-2 border-primary/25 bg-accent/15 p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Link2 className="h-4 w-4 text-primary" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/70">
          배포한 웹 앱 URL
        </p>
      </div>
      <h2 className="mb-1 font-display text-lg font-bold text-foreground">
        내가 만든 앱의 주소를 붙여넣어 주세요
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        이 URL은 교차 QA 파트너에게 공개되어, 상대방이 직접 열어 체크리스트를 검증합니다.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="url"
          inputMode="url"
          placeholder="https://my-app.lovable.app"
          value={url}
          maxLength={500}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          {saved && (
            <Button asChild variant="outline" size="sm">
              <a href={saved} target="_blank" rel="noreferrer noopener">
                <ExternalLink className="mr-1 h-4 w-4" aria-hidden /> 열기
              </a>
            </Button>
          )}
          <Button
            size="sm"
            disabled={!dirty || mut.isPending}
            onClick={() => mut.mutate()}
          >
            <Save className="mr-1 h-4 w-4" aria-hidden />
            {saved ? "URL 갱신" : "URL 저장"}
          </Button>
        </div>
      </div>
    </div>
  );
}
