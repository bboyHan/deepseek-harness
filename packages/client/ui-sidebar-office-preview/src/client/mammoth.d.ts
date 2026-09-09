declare module 'mammoth/mammoth.browser.js' {
  interface ConversionResult {
    readonly value: string
  }

  interface Input {
    readonly arrayBuffer: ArrayBuffer
  }

  interface Mammoth {
    convertToHtml(input: Input): Promise<ConversionResult>
  }

  const mammoth: Mammoth
  export default mammoth
}
