const CODE_FENCE = /(```[\s\S]*?```)/g

function normalizeMathBody(math: string): string {
  return math.replace(/\\n(?=[^a-zA-Z]|$)/g, '\n').trim()
}

function convertMathDelimiters(text: string): string {
  return text
    // Display math on its own lines keeps list indentation intact.
    .replace(/^([ \t]*)\\\[((?:(?!\\\])[\s\S])+)\\\][ \t]*$/gm, (_, indent: string, math: string) => {
      const body = normalizeMathBody(math).split('\n').map((line) => `${indent}${line.trim()}`).join('\n')
      return `${indent}$$\n${body}\n${indent}$$`
    })
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, math: string) => `$$${normalizeMathBody(math)}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, math: string) => `$${normalizeMathBody(math)}$`)
    .replace(/^([ \t]*)\$\$([^$\n]+?)\$\$[ \t]*$/gm, (_, indent: string, math: string) =>
      `${indent}$$\n${indent}${math.trim()}\n${indent}$$`)
}

function wrapBareAnswerFractions(text: string): string {
  return text.replace(
    /(^|[^\\$])([+-]?\\(?:frac|dfrac|tfrac)\s*\{(?:[^{}]|\{[^{}]*\})+\}\s*\{(?:[^{}]|\{[^{}]*\})+\})/g,
    (_match, prefix: string, fraction: string) => `${prefix}$${fraction}$`,
  )
}

/**
 * Converts alternate math delimiters that remark-math does not parse.
 */
export function normalizeMarkdownMath(markdown: string): string {
  return markdown
    .split(CODE_FENCE)
    .map((chunk, index) => (index % 2 === 1 ? chunk : convertMathDelimiters(chunk)))
    .join('')
}

/**
 * Also accepts bare LaTeX fractions from generated multiple-choice options.
 */
export function normalizeAnswerOptionMath(markdown: string): string {
  const normalized = normalizeMarkdownMath(markdown)
  if (/[$]|\\\(|\\\[/.test(normalized)) return normalized

  return normalized
    .split(/(`[^`]*`)/g)
    .map((part, index) => (index % 2 === 1 ? part : wrapBareAnswerFractions(part)))
    .join('')
}
