export async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.append(textArea)
  textArea.select()
  const copied = document.execCommand('copy')
  textArea.remove()
  if (!copied) throw new Error('Clipboard is unavailable')
}
