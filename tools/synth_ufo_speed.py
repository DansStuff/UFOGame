"""
Synthesizes campy 1950s B-movie flying-saucer sounds for the ship speeding up and slowing down.

Two styles, each rendered as a speed-up (pitch and vibrato rise) and a slow-down (both fall):
  A  theremin:   warbling near-sine voice, wide vibrato, slapback echo and spring-style reverb.
  B  oscillator: two detuned oscillators beating, ring-modulated shimmer, pulsing tremolo, same reverb.

Usage: python tools/synth_ufo_speed.py <out_dir>
Writes 44.1 kHz mono 16-bit WAVs: ufo_<style>_speedup.wav, ufo_<style>_slowdown.wav.
Needs numpy. Encode to OGG with ffmpeg afterwards.
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100


def glide(start: float, end: float, n: int, curve: float = 1.0) -> np.ndarray:
    """Exponential glide from start to end over n samples. curve > 1 lingers at the start."""
    t = np.linspace(0.0, 1.0, n) ** curve
    return start * (end / start) ** t


def phase(freq: np.ndarray) -> np.ndarray:
    """Running phase in radians for a per-sample frequency."""
    return 2 * np.pi * np.cumsum(freq) / SR


def envelope(n: int, attack: float, release: float, sustain_shape: np.ndarray | None = None) -> np.ndarray:
    env = np.ones(n)
    a = int(attack * SR)
    r = int(release * SR)
    if a > 0:
        env[:a] = np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if r > 0:
        env[-r:] *= np.cos(np.linspace(0, np.pi / 2, r)) ** 2
    if sustain_shape is not None:
        env *= sustain_shape
    return env


def comb(x: np.ndarray, delay_s: float, feedback: float, damp: float) -> np.ndarray:
    """Feedback comb with a one-pole lowpass in the loop, processed a delay-length block at a time."""
    d = int(delay_s * SR)
    y = np.zeros(len(x) + d)
    y[: len(x)] = x
    lp = 0.0
    out = np.zeros_like(y)
    for i in range(len(y)):
        fb = out[i - d] if i >= d else 0.0
        lp = (1 - damp) * fb + damp * lp
        out[i] = y[i] + feedback * lp
    return out[: len(x)]


def allpass(x: np.ndarray, delay_s: float, g: float) -> np.ndarray:
    d = int(delay_s * SR)
    out = np.zeros_like(x)
    buf = np.zeros(len(x))
    for i in range(len(x)):
        delayed = buf[i - d] if i >= d else 0.0
        buf[i] = x[i] + g * delayed
        out[i] = delayed - g * buf[i]
    return out


def spring_reverb(x: np.ndarray, mix: float) -> np.ndarray:
    """Short, bright Schroeder reverb: close comb delays give the boingy, metallic spring-tank colour."""
    wet = sum(comb(x, d, fb, 0.25) for d, fb in [(0.0297, 0.78), (0.0371, 0.76), (0.0411, 0.74), (0.0437, 0.72)]) / 4
    wet = allpass(allpass(wet, 0.005, 0.7), 0.0017, 0.7)
    return (1 - mix) * x + mix * wet


def slapback(x: np.ndarray, delay_s: float, gain: float, repeats: int) -> np.ndarray:
    out = x.copy()
    d = int(delay_s * SR)
    for k in range(1, repeats + 1):
        out[k * d :] += (gain**k) * x[: len(x) - k * d]
    return out


def pad_tail(x: np.ndarray, seconds: float) -> np.ndarray:
    return np.concatenate([x, np.zeros(int(seconds * SR))])


def theremin(base: np.ndarray, vib_rate: np.ndarray, vib_depth: float) -> np.ndarray:
    """Near-sine voice with a touch of 2nd and 3rd harmonic, like a theremin's slightly impure tone."""
    vib = np.sin(phase(vib_rate))
    freq = base * (1 + vib_depth * vib)
    p = phase(freq)
    return np.sin(p) + 0.18 * np.sin(2 * p) + 0.07 * np.sin(3 * p)


def oscillator_saucer(base: np.ndarray, vib_rate: np.ndarray, trem_rate: np.ndarray) -> np.ndarray:
    """Two detuned triangle-ish oscillators beating, ring-modulated by a higher sine, with tremolo."""
    vib = np.sin(phase(vib_rate))
    f1 = base * (1 + 0.02 * vib)
    f2 = base * 1.012 * (1 + 0.02 * vib)
    tri = lambda p: (2 / np.pi) * np.arcsin(np.sin(p))
    osc = 0.5 * tri(phase(f1)) + 0.5 * tri(phase(f2))
    ring = np.sin(phase(base * 2.37))
    tone = 0.75 * osc + 0.35 * osc * ring
    trem = 0.75 + 0.25 * np.sin(phase(trem_rate))
    return tone * trem


def finish(x: np.ndarray, peak_db: float = -3.0) -> np.ndarray:
    x = slapback(pad_tail(x, 0.45), 0.11, 0.35, 3)
    x = spring_reverb(x, 0.3)
    # Gentle high cut so it reads as old speaker / tape, not a clean digital tone.
    lp = np.zeros_like(x)
    a = 0.35
    for i in range(1, len(x)):
        lp[i] = lp[i - 1] + a * (x[i] - lp[i - 1])
    x = lp
    # Trim trailing silence after the reverb dies.
    level = np.abs(x)
    last = np.nonzero(level > level.max() * 10 ** (-60 / 20))[0][-1]
    x = x[: last + 1]
    fade = min(len(x), int(0.05 * SR))
    x[-fade:] *= np.linspace(1, 0, fade)
    return x / np.abs(x).max() * 10 ** (peak_db / 20)


def render(style: str, rising: bool) -> np.ndarray:
    # Glide length in seconds (the echo tail adds about 0.45 s). 30% longer than the first pass (1.3 / 1.5).
    dur = 1.7 if rising else 1.95
    n = int(dur * SR)
    if style == 'A':
        lo, hi = 260.0, 820.0
        base = glide(lo, hi, n, 0.8) if rising else glide(hi, lo, n, 1.3)
        vib_rate = np.linspace(4.5, 9.0, n) if rising else np.linspace(9.0, 3.5, n)
        swell = np.linspace(0.75, 1.0, n) if rising else np.linspace(1.0, 0.7, n)
        x = theremin(base, vib_rate, 0.035) * envelope(n, 0.06, 0.25, swell)
    else:
        lo, hi = 110.0, 330.0
        base = glide(lo, hi, n, 0.8) if rising else glide(hi, lo, n, 1.3)
        vib_rate = np.linspace(3.0, 7.0, n) if rising else np.linspace(7.0, 2.5, n)
        trem_rate = np.linspace(6.0, 16.0, n) if rising else np.linspace(16.0, 5.0, n)
        swell = np.linspace(0.75, 1.0, n) if rising else np.linspace(1.0, 0.7, n)
        x = oscillator_saucer(base, vib_rate, trem_rate) * envelope(n, 0.05, 0.25, swell)
    return finish(x)


def write_wav(path: Path, x: np.ndarray) -> None:
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for style, name in [('A', 'theremin'), ('B', 'oscillator')]:
        for rising, label in [(True, 'speedup'), (False, 'slowdown')]:
            path = out / f'ufo_{name}_{label}.wav'
            write_wav(path, render(style, rising))
            print(path)


if __name__ == '__main__':
    main()
