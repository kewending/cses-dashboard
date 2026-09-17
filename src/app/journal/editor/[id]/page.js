import ThreePaneEditor from './ThreePaneEditor';

export default async function EditorPage({ params }) {
  const { id } = await params;

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--color-bg-dark)]">
      <ThreePaneEditor initialId={id} />
    </div>
  );
}
