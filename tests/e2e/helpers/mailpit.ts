// Mailpit (https://mailpit.axllent.org) is a local SMTP catcher. PocketBase is
// pointed at its SMTP port (1025) during tests; these helpers read what landed
// via its HTTP API (8025).
const MAILPIT_URL = process.env.MAILPIT_URL || 'http://localhost:8025'

export interface MailpitMessage {
  ID: string
  Subject: string
  To: { Address: string }[]
  HTML: string
  Text: string
}

/** Deletes all caught messages — call before triggering an email to start clean. */
export async function clearMailpit(): Promise<void> {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' })
}

/** Polls Mailpit until an email arrives for `toAddress`, returning the full message. */
export async function waitForEmail(toAddress: string, timeoutMs = 10_000): Promise<MailpitMessage> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=10`)
    const data = await res.json()
    const match = (data.messages ?? []).find((m: MailpitMessage) =>
      m.To.some((t) => t.Address.toLowerCase() === toAddress.toLowerCase()),
    )
    if (match) {
      const full = await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`)
      return full.json()
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No email for ${toAddress} within ${timeoutMs}ms`)
}

/**
 * Extracts a URL from an email body. Pass `contains` to target a specific link
 * (HTML bodies start with a doctype DTD URL, so the first match is rarely yours).
 */
export function extractLinkFromEmail(message: MailpitMessage, contains?: string): string {
  const source = message.HTML || message.Text
  const urls = source.match(/https?:\/\/[^\s"<>]+/g) ?? []
  const match = contains ? urls.find((u) => u.includes(contains)) : urls[0]
  if (!match) throw new Error(`No link found in email body${contains ? ` containing "${contains}"` : ''}`)
  return match
}

/** True if Mailpit's HTTP API answers — lets specs skip cleanly when it is down. */
export async function mailpitUp(): Promise<boolean> {
  try {
    const res = await fetch(`${MAILPIT_URL}/api/v1/info`)
    return res.ok
  } catch {
    return false
  }
}
