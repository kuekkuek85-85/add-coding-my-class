import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "개인정보처리방침 · 코딩 한 스푼 심화반" },
      {
        name: "description",
        content: "코딩 한 스푼 심화반 연수 플랫폼 개인정보처리방침",
      },
      { property: "og:title", content: "개인정보처리방침 · 코딩 한 스푼 심화반" },
      {
        property: "og:description",
        content: "코딩 한 스푼 심화반 연수 플랫폼 개인정보처리방침",
      },
    ],
  }),
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-7 text-foreground">
      <nav className="mb-6 text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          ← 홈으로
        </Link>
      </nav>
      <h1 className="mb-2 text-2xl font-bold">개인정보처리방침</h1>
      <p className="mb-8 text-xs text-muted-foreground">최종 개정일: 2026-07-27</p>

      <section className="space-y-6">
        <div>
          <h2 className="mb-2 text-lg font-semibold">1. 개요</h2>
          <p>
            본 플랫폼은 교사 연수 「내 수업에 코딩 한 스푼 · 심화반」의 운영을 위한 비영리 학습
            도구로, 이메일·전화번호 등 개인식별정보를 수집하지 않는 최소 수집 원칙을 채택합니다.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">2. 수집하는 정보</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>입장 코드 및 사용자가 직접 입력한 닉네임(소속·성함 형태 권장)</li>
            <li>사용자가 선택한 아바타·좌석 정보</li>
            <li>연수 중 작성한 산출물: PRD, 테스트 케이스, 배포 URL, 슬라이드, 회고, 메시지, 도움 미션 등</li>
            <li>서비스 이용 기록(스테이지 진행 상태, 신호등 상태, 도장 획득 이력)</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            ※ 이메일, 실명, 연락처, 위치정보 등 법령상 개인식별정보는 수집하지 않습니다. 닉네임에
            실명·소속을 입력할지는 참가자 본인이 결정합니다.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">3. 이용 목적</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>연수 진행 및 참가자 간 협업(리뷰, 메시지, 미션) 지원</li>
            <li>스테이지 진행 현황 시각화(2D 사무실 뷰, 대시보드)</li>
            <li>산출물 저장·회고·수료 확인</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">4. 보관 및 파기</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>모든 데이터는 Lovable Cloud 기반 백엔드에 저장됩니다.</li>
            <li>강사가 "데이터 초기화"를 실행하거나 연수가 종료되면 해당 세션 데이터는 삭제됩니다.</li>
            <li>참가자는 연수 종료 후 강사에게 요청하여 자신의 산출물 삭제를 요구할 수 있습니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">5. 제3자 제공</h2>
          <p>
            수집한 정보는 원칙적으로 외부에 제공하지 않습니다. 다만 참가자가 직접 등록한 배포 URL,
            유튜브 링크 등은 다른 참가자에게 노출되며, 이는 연수 진행상 필요한 정보 공유입니다.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">6. 이용자 권리</h2>
          <p>
            참가자는 자신이 등록한 정보의 열람·정정·삭제를 강사(운영자)에게 요청할 수 있습니다.
            메시지·미션 등 상호 협업 데이터는 상대방의 기록과 연동되어 있어 개별 삭제가 제한될 수
            있습니다.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">7. 안전성 확보 조치</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>데이터베이스 접근은 서버 함수 및 Row Level Security 정책으로 통제합니다.</li>
            <li>업로드된 이미지는 접근 권한이 제한된 스토리지 버킷에 보관합니다.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">8. 문의</h2>
          <p>
            개인정보 관련 문의는 연수 운영 강사에게 전달해 주시기 바랍니다. 본 방침은 서비스 정책
            및 관련 법령에 따라 개정될 수 있으며 개정 시 본 페이지에 게시합니다.
          </p>
        </div>
      </section>
    </main>
  );
}
