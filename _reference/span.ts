
export {Span, StringSpan, IndexedSpan}

abstract class Span {
  protected abstract valueAt(index: number): number
  abstract readonly length: number
  abstract at(index: number): Span
  abstract append(span: Span): void

  static from(buffer: string | Array<any> | Buffer): Span {
    if (typeof buffer === 'string') return new StringSpan(buffer)
    else return new IndexedSpan(buffer)
  }

  equals(span: Span): boolean {
    if (this.length !== span.length) return false
    for (let i = 0; i < this.length; i++)
      if (this.valueAt(i) !== span.valueAt(i))
        return false
    return true
  }

  withinLowerBound(span: Span): boolean {
    if (this.length > span.length) return true
    else if (this.length < span.length) return false
    for (let i = 0; i < this.length; i++) {
      if (this.valueAt(i) < span.valueAt(i)) return false
      else if (this.valueAt(i) > span.valueAt(i)) return true
    }
    return true
  }

  withinUpperBound(span: Span): boolean {
    if (this.length < span.length) return true
    else if (this.length > span.length) return false
    for (let i = 0; i < this.length; i++) {
      if (this.valueAt(i) > span.valueAt(i)) return false
      else if (this.valueAt(i) < span.valueAt(i)) return true
    }
    return true
  }
}

class StringSpan extends Span {
  private buffer: string

  constructor(buffer: string) {
    super()
    this.buffer = buffer
  }

  get length(): number {
    return this.buffer.length
  }

  protected valueAt(index: number): number {
    return this.buffer.charCodeAt(index)
  }

  at(index: number): Span {
    return new StringSpan(this.buffer.charAt(index))
  }

  append(span: Span) {
    if (span instanceof StringSpan) this.buffer += span.buffer
    else for (let i = 0; i < span.length; i++) this.buffer += span.valueAt(i)
  }

  equals(span: Span): boolean {
    if (span instanceof StringSpan) return this.buffer === span.buffer
    else return span.equals(this)
  }
}

class IndexedSpan extends Span {
  private readonly buffer: Array<any> | Buffer

  constructor(buffer: Array<any> | Buffer) {
    super(buffer.length)
    this.buffer = buffer
  }

  protected valueAt(index: number): number {
    return this.buffer[index]
  }

  at(index: number): Span {
    return new IndexedSpan([this.buffer[index]])
  }
}
