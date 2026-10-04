export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-heading font-bold text-muted-foreground mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Page not found</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <a 
        href="/" 
        className="h-10 px-8 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90"
      >
        Return to Home
      </a>
    </div>
  )
}
