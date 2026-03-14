import AVFoundation
import Foundation

enum MergeError: Error {
  case invalidArguments
  case missingVideoTrack
  case exportFailed
}

func removeExistingFile(at url: URL) throws {
  if FileManager.default.fileExists(atPath: url.path) {
    try FileManager.default.removeItem(at: url)
  }
}

let arguments = CommandLine.arguments

guard arguments.count == 4 else {
  fputs("Usage: swift scripts/mergeDemoMedia.swift <video-file> <audio-file> <output-file>\n", stderr)
  throw MergeError.invalidArguments
}

let videoURL = URL(fileURLWithPath: arguments[1])
let audioURL = URL(fileURLWithPath: arguments[2])
let outputURL = URL(fileURLWithPath: arguments[3])

let mixComposition = AVMutableComposition()

let videoAsset = AVAsset(url: videoURL)
let audioAsset = AVAsset(url: audioURL)

guard let videoTrack = videoAsset.tracks(withMediaType: .video).first else {
  throw MergeError.missingVideoTrack
}

let videoTimeRange = CMTimeRange(start: .zero, duration: videoAsset.duration)
let outputDuration = videoAsset.duration

let compositionVideoTrack = mixComposition.addMutableTrack(
  withMediaType: .video,
  preferredTrackID: kCMPersistentTrackID_Invalid
)

try compositionVideoTrack?.insertTimeRange(videoTimeRange, of: videoTrack, at: .zero)
compositionVideoTrack?.preferredTransform = videoTrack.preferredTransform

if let originalAudioTrack = videoAsset.tracks(withMediaType: .audio).first {
  let compositionSourceAudioTrack = mixComposition.addMutableTrack(
    withMediaType: .audio,
    preferredTrackID: kCMPersistentTrackID_Invalid
  )
  try compositionSourceAudioTrack?.insertTimeRange(videoTimeRange, of: originalAudioTrack, at: .zero)
}

if let voiceoverTrack = audioAsset.tracks(withMediaType: .audio).first {
  let compositionVoiceoverTrack = mixComposition.addMutableTrack(
    withMediaType: .audio,
    preferredTrackID: kCMPersistentTrackID_Invalid
  )

  let voiceoverRange = CMTimeRange(start: .zero, duration: min(audioAsset.duration, outputDuration))
  try compositionVoiceoverTrack?.insertTimeRange(voiceoverRange, of: voiceoverTrack, at: .zero)
}

try removeExistingFile(at: outputURL)

guard let exportSession = AVAssetExportSession(asset: mixComposition, presetName: AVAssetExportPresetHighestQuality) else {
  throw MergeError.exportFailed
}

exportSession.outputURL = outputURL
exportSession.outputFileType = .mp4
exportSession.shouldOptimizeForNetworkUse = true

let semaphore = DispatchSemaphore(value: 0)
exportSession.exportAsynchronously {
  semaphore.signal()
}
semaphore.wait()

guard exportSession.status == .completed else {
  if let error = exportSession.error {
    fputs("Export failed: \(error.localizedDescription)\n", stderr)
  }
  throw MergeError.exportFailed
}

print(outputURL.path)
