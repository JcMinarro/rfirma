// El fondo de la ventana del .dmg, a 1x y 2x; lo llama dmg-background.sh.
import AppKit

let width: CGFloat = 660
let height: CGFloat = 400
let appCenter = CGPoint(x: 180, y: 170)
let applicationsCenter = CGPoint(x: 480, y: 170)
let teal = NSColor(srgbRed: 0x06 / 255, green: 0x77 / 255, blue: 0x81 / 255, alpha: 1)

func drawArrow() {
    let startX = appCenter.x + 88
    let endX = applicationsCenter.x - 88
    let y = height - appCenter.y
    let shaft = NSBezierPath()
    shaft.move(to: CGPoint(x: startX, y: y))
    shaft.line(to: CGPoint(x: endX - 6, y: y))
    shaft.lineWidth = 6
    shaft.lineCapStyle = .round
    teal.setStroke()
    shaft.stroke()

    let head = NSBezierPath()
    head.move(to: CGPoint(x: endX - 22, y: y + 18))
    head.line(to: CGPoint(x: endX, y: y))
    head.line(to: CGPoint(x: endX - 22, y: y - 18))
    head.lineWidth = 6
    head.lineCapStyle = .round
    head.lineJoinStyle = .round
    head.stroke()
}

func render(scale: CGFloat, to url: URL) throws {
    let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: Int(width * scale), pixelsHigh: Int(height * scale),
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    bitmap.size = NSSize(width: width, height: height)
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    NSColor(srgbRed: 0xf8 / 255, green: 0xfa / 255, blue: 0xfc / 255, alpha: 1).setFill()
    CGRect(x: 0, y: 0, width: width, height: height).fill()
    drawArrow()
    NSGraphicsContext.restoreGraphicsState()
    try bitmap.representation(using: .png, properties: [:])!.write(to: url)
}

let output = URL(fileURLWithPath: CommandLine.arguments[1])
try render(scale: 1, to: output.appendingPathComponent("dmg-background.png"))
try render(scale: 2, to: output.appendingPathComponent("dmg-background@2x.png"))
