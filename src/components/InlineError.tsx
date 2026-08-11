export function InlineError({ message }: { message: string }) {
  return (
    <p className="border-l-2 border-red-500 pl-3 text-base/7 text-red-300 sm:text-sm/6">
      {message}
    </p>
  )
}
