export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl w-full mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  );
}
