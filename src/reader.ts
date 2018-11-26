
import {parse} from 'path'
import {Span} from './span'

export {ReaderLocation, StringReaderLocation, Reader, SpanReader, MatchingReader}

class ReaderLocation {
  readonly filename: string
  private _position = 0

  constructor(filename?: string, position?: number) {
    this.filename = filename ? parse(filename).name : '<source>'
    if (position && position >= 0) this._position = position
  }

  get position(): number {
    return this._position
  }

  next(span: Span): ReaderLocation {
    this._position += span.length
    return this.clone()
  }

  clone = () => new ReaderLocation(this.filename, this._position)

  toString = () => [this.filename, this._position].join(':')
}

class StringReaderLocation extends ReaderLocation {
  private _line = 1
  private _column = 1

  constructor(filename?: string, line?: number, column?: number, position?: number) {
    super(filename, position)
    if (line && line >= 1) this._line = line
    if (column && column >= 1) this._column = column
  }

  get line(): number {
    return this._line
  }

  get column(): number {
    return this._column
  }

  next(span: Span): ReaderLocation {
    if (span.isCharacterSpan && span.equals(new Span(10))) {
      this._line++
      this._column = 1
    } else {
      this._column++
    }
    return super.next(span)
  }

  clone = () => new StringReaderLocation(this.filename, this._line, this._column, this.position)

  toString = () => [this.filename, this._line, this._column].join(':')
}

interface Reader {
  readonly location: ReaderLocation
  hasNext(): Promise<boolean>
  next(): Promise<Span>
}

class SpanReader implements Reader {
  private span: Span
  private _location: ReaderLocation

  constructor(span: Span) {
    this.span = span
    this._location = span.isCharacterSpan ? new StringReaderLocation() : new ReaderLocation()
  }

  get location(): ReaderLocation {
    return this._location.clone()
  }

  async hasNext(): Promise<boolean> {
    return this._location.position < this.span.length
  }

  async next(): Promise<Span> {
    let next = this.span.at(this._location.position)
    this._location.next(next)
    return next
  }
}

class BranchingReader implements Reader {
  private reader: Reader
  private buffer: Span[] = []
  private index = 0
  private snapshots: number[] = []

  constructor(reader: Reader) {
    this.reader = reader
  }

  get location(): ReaderLocation {
    return this.reader.location
  }

  async hasNext(): Promise<boolean> {
    return this.index < this.buffer.length || await this.reader.hasNext()
  }

  async next(): Promise<Span> {
    if (this.index >= this.buffer.length) this.buffer.push(await this.reader.next())
    let next = this.buffer[this.index]
    if (this.snapshots.length < 1) this.buffer.shift()
    else this.index++
    return next
  }

  branch() {
    this.snapshots.push(this.index)
  }

  reject() {
    this.index = this.snapshots[this.snapshots.length - 1]
    this.snapshots.pop()
  }

  merge() {
    this.snapshots.pop()
    if (this.snapshots.length < 1) {
      this.buffer.splice(0, this.index)
      this.index = 0
    }
  }
}

class MatchingReader implements Reader {
  private reader: BranchingReader

  constructor(reader: Reader) {
    this.reader = new BranchingReader(reader)
  }

  get location(): ReaderLocation {
    return this.reader.location
  }

  async hasNext(): Promise<boolean> {
    return await this.reader.hasNext()
  }

  async next(): Promise<Span> {
    return await this.reader.next()
  }

  async nextFromPattern(pattern: Span, greedy = false): Promise<Span> {
    this.reader.branch()
    for (let i = 0; i < pattern.length; i++) {
      if (!(await this.reader.hasNext()) || !pattern.at(i).equals(await this.reader.next())) {
        this.reader.reject()
        return Promise.resolve(false)
      }
    }
    this.reader.merge()
    return Promise.resolve(true)
  }

  async nextFromDomain(domain: (lower: string | number, upper: string | number)): Promise<Span|null> {
    return null
  }
}