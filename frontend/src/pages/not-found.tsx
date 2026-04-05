export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-6xl font-semibold tracking-tight">404</p>
        <p className="text-sm text-muted-foreground mt-3">
          The page you're looking for doesn't exist.
        </p>
      </div>
    </div>
  );
}
