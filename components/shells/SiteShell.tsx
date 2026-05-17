export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* твой Header */}
      <main id="content">{children}</main>
      {/* твой Footer */}
    </>
  )
}
