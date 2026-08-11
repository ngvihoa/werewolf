import type { Role } from '#/game/domain'

import { roleDescription, roleLabel } from '#/game/presentation/labels'

export function RoleCard({ role }: { role: Role }) {
  const imagePath = `/role/${role.toLowerCase()}.png`

  return (
    <figure className="relative mx-auto w-full max-w-64 overflow-hidden rounded-2xl bg-stone-900 shadow-2xl ring-1 ring-white/15">
      <div className="aspect-[989/1500] overflow-hidden">
        <img
          alt={`Thẻ vai trò ${roleLabel(role)}`}
          className="size-full object-cover"
          decoding="async"
          height={1500}
          src={imagePath}
          width={989}
        />
      </div>
      <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-stone-950 via-stone-950/95 to-transparent px-5 pt-16 pb-5">
        <p className="font-mono text-xs tracking-[0.16em] text-red-300 uppercase">
          Thân phận của bạn
        </p>
        <p className="pt-1 text-2xl font-semibold text-stone-50">
          {roleLabel(role)}
        </p>
        <p className="pt-2 text-sm/6 text-stone-300">{roleDescription(role)}</p>
      </figcaption>
    </figure>
  )
}
