
export {Span}

class Span {
  readonly isCharacterSpan: boolean
  private buffer: any[] = []

  constructor(buffer: any) {
    if (buffer instanceof Array) {
      this.isCharacterSpan = false
      this.buffer = buffer
    } else if (typeof buffer === 'string') {
      this.isCharacterSpan = true
      for (let i = 0; i < buffer.length; i++) {
        let codePoint = buffer.codePointAt(i)
        if (codePoint !== undefined && codePoint > 0xFFFF) i++
        this.buffer.push(codePoint)
      }
    } else {
      this.isCharacterSpan = false
      this.buffer.push(buffer)
    }
  }

  get length(): number {
    return this.buffer.length
  }

  append = (span: Span) => this.buffer.push(...span.buffer)

  at = (index: number) => new Span(this.buffer[index])

  equals(span: Span): boolean {
    return true
  }
}