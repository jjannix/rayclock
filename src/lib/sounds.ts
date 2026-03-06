import { exec } from "child_process";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const SAMPLE_RATE = 44100;
const TEMP_PATH = join(tmpdir(), "rayclock-timer.wav");

interface Note {
  /** Frequency in Hz (use 0 for silence/rest) */
  freq: number;
  /** Duration in seconds */
  dur: number;
  /** Volume 0-1 (default 0.35) */
  vol?: number;
  /** Fade-out ratio 0-1 of note duration (default 0.3) */
  release?: number;
}

/** Musical note frequencies */
const N = {
  C4: 262,
  D4: 294,
  E4: 330,
  F4: 349,
  G4: 392,
  A4: 440,
  B4: 494,
  C5: 523,
  D5: 587,
  E5: 659,
  F5: 698,
  G5: 784,
  A5: 880,
  B5: 988,
  C6: 1047,
  E6: 1319,
  G6: 1568,
};

export const SOUND_PRESETS: Record<string, Note[]> = {
  chime: [
    { freq: N.C5, dur: 0.2, vol: 0.3 },
    { freq: N.E5, dur: 0.2, vol: 0.3 },
    { freq: N.G5, dur: 0.2, vol: 0.3 },
    { freq: N.C6, dur: 0.6, vol: 0.35, release: 0.6 },
  ],
  gentle: [
    { freq: N.E5, dur: 0.4, vol: 0.25, release: 0.4 },
    { freq: 0, dur: 0.15 },
    { freq: N.C5, dur: 0.6, vol: 0.2, release: 0.5 },
  ],
  melody: [
    { freq: N.G4, dur: 0.2, vol: 0.3 },
    { freq: N.A4, dur: 0.15, vol: 0.3 },
    { freq: N.B4, dur: 0.2, vol: 0.3 },
    { freq: N.D5, dur: 0.7, vol: 0.35, release: 0.5 },
  ],
  bell: [
    { freq: N.E6, dur: 0.08, vol: 0.35 },
    { freq: N.C6, dur: 0.12, vol: 0.3 },
    { freq: N.G5, dur: 1.0, vol: 0.25, release: 0.7 },
  ],
  celebration: [
    { freq: N.C5, dur: 0.12, vol: 0.3 },
    { freq: N.E5, dur: 0.12, vol: 0.3 },
    { freq: N.G5, dur: 0.12, vol: 0.3 },
    { freq: 0, dur: 0.06 },
    { freq: N.C6, dur: 0.12, vol: 0.35 },
    { freq: N.G5, dur: 0.12, vol: 0.3 },
    { freq: N.C6, dur: 0.7, vol: 0.35, release: 0.5 },
  ],
  pulse: [
    { freq: N.A4, dur: 0.15, vol: 0.25, release: 0.5 },
    { freq: 0, dur: 0.12 },
    { freq: N.A4, dur: 0.15, vol: 0.25, release: 0.5 },
    { freq: 0, dur: 0.12 },
    { freq: N.E5, dur: 0.5, vol: 0.3, release: 0.6 },
  ],
};

function generateWav(notes: Note[]): Buffer {
  // Calculate total samples from individual notes to avoid floating point mismatch
  const sampleCounts = notes.map((n) => Math.floor(SAMPLE_RATE * n.dur));
  const numSamples = sampleCounts.reduce((sum, s) => sum + s, 0);
  const dataSize = numSamples * 2; // 16-bit mono

  const buf = Buffer.alloc(44 + dataSize);

  // RIFF header
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);

  // fmt chunk
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample

  // data chunk
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);

  // Generate PCM samples with sine waves + envelopes
  let offset = 44;

  for (let ni = 0; ni < notes.length; ni++) {
    const note = notes[ni];
    const noteSamples = sampleCounts[ni];
    const vol = note.vol ?? 0.35;
    const releaseRatio = note.release ?? 0.3;

    const fadeInSamples = Math.floor(
      Math.min(0.01 * SAMPLE_RATE, noteSamples * 0.05),
    );
    const fadeOutSamples = Math.floor(noteSamples * releaseRatio);

    for (let i = 0; i < noteSamples; i++) {
      let sample = 0;

      if (note.freq > 0) {
        const t = i / SAMPLE_RATE;
        // Fundamental + soft second harmonic for warmth
        sample =
          Math.sin(2 * Math.PI * note.freq * t) * 0.8 +
          Math.sin(2 * Math.PI * note.freq * 2 * t) * 0.2;

        // Smooth envelope
        let env = 1;
        if (i < fadeInSamples) {
          env = i / fadeInSamples;
          env = env * env; // ease-in
        }
        if (i > noteSamples - fadeOutSamples) {
          env = (noteSamples - i) / fadeOutSamples;
          env = env * env; // ease-out (quadratic for smooth decay)
        }

        sample *= env * vol;
      }

      const value = Math.max(
        -32768,
        Math.min(32767, Math.floor(sample * 32767)),
      );
      buf.writeInt16LE(value, offset);
      offset += 2;
    }
  }

  return buf;
}

export function playSound(presetName: string): void {
  if (presetName === "none") return;
  const notes = SOUND_PRESETS[presetName];
  if (!notes) return;

  const wav = generateWav(notes);
  writeFileSync(TEMP_PATH, wav);

  exec(
    `powershell -c "(New-Object Media.SoundPlayer '${TEMP_PATH}').PlaySync()"`,
  );
}
