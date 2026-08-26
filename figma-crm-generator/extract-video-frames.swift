import AppKit
import AVFoundation
import Foundation

guard CommandLine.arguments.count >= 3 else {
  fputs("usage: extract-video-frames <video> <output-dir>\n", stderr)
  exit(2)
}

let videoURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2], isDirectory: true)
try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)

let asset = AVURLAsset(url: videoURL)
let duration = CMTimeGetSeconds(asset.duration)
guard duration.isFinite, duration > 0 else {
  fputs("invalid video duration\n", stderr)
  exit(3)
}

let count = 16
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero
generator.maximumSize = CGSize(width: 640, height: 640)

var frames: [(image: NSImage, time: Double)] = []
for index in 0..<count {
  let seconds = duration * Double(index) / Double(count - 1)
  let time = CMTime(seconds: seconds, preferredTimescale: 600)
  var actual = CMTime.zero
  let cgImage = try generator.copyCGImage(at: time, actualTime: &actual)
  let image = NSImage(cgImage: cgImage, size: .zero)
  frames.append((image, CMTimeGetSeconds(actual)))

  let rep = NSBitmapImageRep(cgImage: cgImage)
  let data = rep.representation(using: .png, properties: [:])!
  let frameURL = outputURL.appendingPathComponent(String(format: "frame-%02d-%05.2fs.png", index, seconds))
  try data.write(to: frameURL)
}

let columns = 4
let rows = 4
let cellWidth = 360
let cellHeight = 250
let sheetWidth = columns * cellWidth
let sheetHeight = rows * cellHeight
let sheetRep = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: sheetWidth,
  pixelsHigh: sheetHeight,
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: false,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: sheetRep)
NSColor(calibratedWhite: 0.12, alpha: 1).setFill()
NSRect(x: 0, y: 0, width: sheetWidth, height: sheetHeight).fill()

let textAttributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.monospacedSystemFont(ofSize: 14, weight: .medium),
  .foregroundColor: NSColor.white
]

for (index, frame) in frames.enumerated() {
  let column = index % columns
  let row = rows - 1 - index / columns
  let originX = column * cellWidth
  let originY = row * cellHeight
  let imageArea = NSRect(x: originX + 8, y: originY + 30, width: cellWidth - 16, height: cellHeight - 38)
  let sourceSize = frame.image.size
  let scale = min(imageArea.width / sourceSize.width, imageArea.height / sourceSize.height)
  let drawSize = NSSize(width: sourceSize.width * scale, height: sourceSize.height * scale)
  let destination = NSRect(
    x: imageArea.midX - drawSize.width / 2,
    y: imageArea.midY - drawSize.height / 2,
    width: drawSize.width,
    height: drawSize.height
  )
  frame.image.draw(in: destination)
  let caption = String(format: "%02d  %05.2fs", index, frame.time)
  caption.draw(at: NSPoint(x: originX + 10, y: originY + 8), withAttributes: textAttributes)
}

NSGraphicsContext.restoreGraphicsState()
let sheetData = sheetRep.representation(using: .png, properties: [:])!
try sheetData.write(to: outputURL.appendingPathComponent("contact-sheet.png"))

print(String(format: "duration=%.3f frames=%d output=%@", duration, count, outputURL.path))
