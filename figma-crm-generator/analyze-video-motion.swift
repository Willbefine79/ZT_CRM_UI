import AVFoundation
import CoreVideo
import Foundation

guard CommandLine.arguments.count >= 2 else {
  fputs("usage: analyze-video-motion <video>\n", stderr)
  exit(2)
}

let url = URL(fileURLWithPath: CommandLine.arguments[1])
let asset = AVURLAsset(url: url)
guard let track = asset.tracks(withMediaType: .video).first else {
  fputs("video track not found\n", stderr)
  exit(3)
}

let reader = try AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(
  track: track,
  outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
  ]
)
output.alwaysCopiesSampleData = false
reader.add(output)
reader.startReading()

var frameCount = 0
var previous: [UInt32] = []
var changes: [(time: Double, amount: Double)] = []
var redTotal = 0.0
var greenTotal = 0.0
var blueTotal = 0.0
var colorSamples = 0.0

while let sample = output.copyNextSampleBuffer(),
      let pixelBuffer = CMSampleBufferGetImageBuffer(sample) {
  CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
  defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }

  let width = CVPixelBufferGetWidth(pixelBuffer)
  let height = CVPixelBufferGetHeight(pixelBuffer)
  let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
  let base = CVPixelBufferGetBaseAddress(pixelBuffer)!.assumingMemoryBound(to: UInt8.self)
  let step = 24
  var current: [UInt32] = []
  current.reserveCapacity((width / step + 1) * (height / step + 1))

  for y in stride(from: 0, to: height, by: step) {
    for x in stride(from: 0, to: width, by: step) {
      let offset = y * bytesPerRow + x * 4
      let b = UInt32(base[offset])
      let g = UInt32(base[offset + 1])
      let r = UInt32(base[offset + 2])
      current.append((r << 16) | (g << 8) | b)
      redTotal += Double(r)
      greenTotal += Double(g)
      blueTotal += Double(b)
      colorSamples += 1
    }
  }

  if previous.count == current.count {
    var difference = 0.0
    for index in current.indices {
      let a = previous[index]
      let b = current[index]
      difference += Double(abs(Int((a >> 16) & 255) - Int((b >> 16) & 255)))
      difference += Double(abs(Int((a >> 8) & 255) - Int((b >> 8) & 255)))
      difference += Double(abs(Int(a & 255) - Int(b & 255)))
    }
    difference /= Double(current.count * 3 * 255)
    let time = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample))
    changes.append((time, difference))
  }

  previous = current
  frameCount += 1
}

let topChanges = changes.sorted { $0.amount > $1.amount }.prefix(12)
let averageR = redTotal / colorSamples
let averageG = greenTotal / colorSamples
let averageB = blueTotal / colorSamples
let duration = CMTimeGetSeconds(asset.duration)
let fps = duration > 0 ? Double(frameCount) / duration : 0

print(String(format: "frames=%d duration=%.3f derived_fps=%.2f", frameCount, duration, fps))
print(String(format: "sampled_average_rgb=(%.1f, %.1f, %.1f)", averageR, averageG, averageB))
print("top_motion_transitions:")
for item in topChanges {
  print(String(format: "  t=%06.3fs change=%.4f", item.time, item.amount))
}
