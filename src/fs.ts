
import {createReadStream, ReadStream} from 'fs'
import {Span} from './span'
import {Reader} from './reader'

export {FileReader}

class FileReader implements Reader {
  private stream: ReadStream
  private error: any = null
  private onError = (error: any) => this.error = error
  private buffer: string | Buffer | null = null

  constructor(stream: ReadStream) {
    stream.once('error', this.onError)
    this.stream = stream
  }

  static open(path: string, encoding?: string): Promise<FileReader> {
    return new Promise((resolve, reject) => {
      let stream = createReadStream(path, {encoding})
      stream.once('error', reject)
      stream.once('readable', () => {
        stream.off('error', reject)
        resolve(new FileReader(stream))
      })
    })
  }

  hasNext(): Promise<boolean> {
    if (this.buffer !== null) return Promise.resolve(true)
    if (this.error) return Promise.reject(this.error)
    return new Promise((resolve, reject) => {
      this.onError = reject
      this.buffer = this.stream.read(1)
      this.onError = (error: any) => this.error = error
      resolve(this.buffer !== null)
    })
  }

  async next(): Promise<Span> {
    if (!(await this.hasNext()) || this.buffer === null)
      throw 'A read error occurred or end-of-file was reached'
    let next = Span.from(this.buffer)
    this.buffer = null
    return next
  }
}