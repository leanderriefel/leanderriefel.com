type FuzzyMatchOptions = {
  threshold?: number
}

const normalize = (value: string): string => {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

export const fuzzyScore = (query: string, target: string): number => {
  const needle = normalize(query)
  const haystack = normalize(target)

  if (!needle) return 1
  if (!haystack) return 0

  let score = 0
  let haystackIndex = 0
  let consecutive = 0

  for (const char of needle) {
    const index = haystack.indexOf(char, haystackIndex)
    if (index === -1) return 0

    score += 1

    if (index === haystackIndex) {
      consecutive += 1
      score += 0.5 * consecutive
    } else {
      consecutive = 0
    }

    if (index === 0 || haystack[index - 1] === " ") {
      score += 0.7
    }

    score += Math.max(0, 0.25 - index * 0.005)

    haystackIndex = index + 1
  }

  const maxScore = needle.length * 3.2
  const normalized = score / maxScore

  return Math.min(1, Math.max(0, normalized))
}

export const fuzzyMatch = (query: string, target: string, options?: FuzzyMatchOptions): boolean => {
  const threshold = options?.threshold ?? 0.35
  return fuzzyScore(query, target) >= threshold
}

export const fuzzyMatchAny = (query: string, targets: readonly string[], options?: FuzzyMatchOptions): boolean => {
  if (!targets.length) return false
  return targets.some((text) => fuzzyMatch(query, text, options))
}
