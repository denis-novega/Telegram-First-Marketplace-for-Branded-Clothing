// components/ChatHeader.tsx
import Image from 'next/image'
import Link from 'next/link'

interface ChatHeaderProps {
  title: string
  imageUrl: string
  productId: string
}

export default function ChatHeader({ title, imageUrl, productId }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-neutral-800">
      <Link href={`/product/${productId}`}>
        <Image
          src={imageUrl}
          alt={title}
          width={80}
          height={80}
          className="rounded object-cover"
        />
      </Link>
      <div className="flex flex-col">
        <Link href={`/product/${productId}`} className="text-lg font-bold hover:underline">
          {title}
        </Link>
        <span className="text-sm text-neutral-400">Диалог по этому товару</span>
      </div>
    </div>
  )
}
