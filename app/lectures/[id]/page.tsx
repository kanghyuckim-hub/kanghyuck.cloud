import LecturePlayerClient from "./LecturePlayerClient";

export default async function LecturePlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LecturePlayerClient lectureId={id} />;
}
