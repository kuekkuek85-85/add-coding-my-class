import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "이용약관 · 코딩 한 스푼 심화반" },
      {
        name: "description",
        content: "코딩 한 스푼 심화반 연수 플랫폼 이용약관",
      },
      { property: "og:title", content: "이용약관 · 코딩 한 스푼 심화반" },
      {
        property: "og:description",
        content: "코딩 한 스푼 심화반 연수 플랫폼 이용약관",
      },
    ],
  }),
});

function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-7 text-foreground">
      <nav className="mb-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          ← 홈으로
        </Link>
      </nav>
      <h1 className="mb-2 text-2xl font-bold">이용약관</h1>
      <p className="mb-8 text-xs text-muted-foreground">최종 개정일: 2026-07-27</p>

      <section className="space-y-6">
        <div>
          <h2 className="mb-2 text-lg font-semibold">제1조 (목적)</h2>
          <p>
            본 약관은 교사 연수 「내 수업에 코딩 한 스푼 · 심화반」(이하 "본 서비스")의 이용 조건과
            운영에 관한 사항을 규정하는 것을 목적으로 합니다. 본 서비스는 연수에 참여하는
            강사·참가 교사만을 대상으로 하는 비영리 학습 도구입니다.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">제2조 (이용 자격)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>본 서비스는 운영자가 배포한 입장 코드를 보유한 참가자에 한해 이용할 수 있습니다.</li>
            <li>학생 등 연수 대상이 아닌 사용자는 이용 대상이 아닙니다.</li>
            <li>입장 코드는 타인에게 양도·공유할 수 없습니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">제3조 (이용자의 의무)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>본 서비스에 게시하는 산출물(PRD, 테스트 케이스, 슬라이드, 회고 등)은 연수 목적에 부합해야 합니다.</li>
            <li>타인을 비방하거나 저작권을 침해하는 콘텐츠, 불법적 정보를 게시할 수 없습니다.</li>
            <li>메시지·미션·발표 코멘트 기능은 상호 존중의 원칙에 따라 사용해야 합니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">제4조 (서비스 운영)</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>운영자는 연수 진행을 위해 스테이지 개방, 데이터 초기화, 세션 종료 등의 조치를 취할 수 있습니다.</li>
            <li>연수 종료 후 저장된 산출물은 사전 고지 없이 삭제될 수 있습니다.</li>
            <li>운영자는 서비스의 안정적 제공을 위해 기능을 사전 통지 없이 변경·중단할 수 있습니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">제5조 (지적재산권)</h2>
          <p>
            참가자가 본 서비스에 작성한 산출물의 저작권은 각 작성자에게 귀속됩니다. 다만 운영자는
            연수 사례 공유·교육 자료 재구성 등의 비영리 목적에 한해 익명 처리된 형태로 활용할 수
            있습니다.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">제6조 (면책)</h2>
          <p>
            본 서비스는 연수 진행을 보조하는 도구이며, 참가자가 외부 링크(배포 URL, 유튜브 링크
            등)를 통해 접근하는 콘텐츠에 대해서는 책임을 지지 않습니다. 천재지변, 외부 서비스
            장애 등 운영자의 통제를 벗어난 사유로 발생한 손해에 대해서는 책임이 제한됩니다.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">제7조 (약관 개정)</h2>
          <p>
            본 약관은 관련 법령 및 서비스 정책에 따라 개정될 수 있으며, 개정 시 본 페이지에 게시하는
            방식으로 공지합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
