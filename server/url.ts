export function toUrl(
  pathname: string,
  searchParams: Record<string, string | number | boolean>,
) {
  return (
    pathname + '?' + new URLSearchParams(searchParams as Record<string, string>)
  )
}
