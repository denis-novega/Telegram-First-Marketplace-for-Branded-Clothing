import { createClient } from '@supabase/supabase-js'

export const revalidate = 60

type Brand = { id: number; name: string; slug: string; logo_url: string | null }

export default async function BrandsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  )

  const { data } = await supabase
    .from('brands')
    .select('id,name,slug,logo_url')
    .order('name', { ascending: true })

  const groups = (data ?? []).reduce((acc: Record<string, Brand[]>, b) => {
    const L = (b.name[0] || '#').toUpperCase()
    ;(acc[L] ||= []).push(b)
    return acc
  }, {} as Record<string, Brand[]>)

  const letters = Object.keys(groups).sort()

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 md:px-6">
      <h1 className="mb-6 text-2xl font-semibold md:text-3xl">Бренды</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {letters.map((L) => (
          <section key={L} className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="mb-3 text-lg font-semibold">{L}</h2>
            <ul className="space-y-1">
              {groups[L].map((b) => (
                <li key={b.id} className="text-sm text-zinc-700 dark:text-zinc-300">
                  {b.name}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
