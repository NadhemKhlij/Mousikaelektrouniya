#!/usr/bin/env python3
"""Build the sound packs in bendir-rai/s/.

A pack is a JSON file that maps a sound's name to its audio file, base64-encoded:
  - drums.json: one entry per stroke ("dum", "tak", ...). A name ending in 2 ("dum2") is a second take
    that alternates with the first; "dums" is the soft dum. The stroke names are the ids in DRUMS in
    bendir-rai/index.html.
  - every other pack holds one instrument, one entry per note: "C4", "Eb3", "F#2" (or "Fs2").
    The app uses the nearest recorded note and shifts it to the note being played.

Usage:
  python3 tools/build_packs.py                       rebuild every pack listed in tools/packs.json
  python3 tools/build_packs.py --only drums lead     rebuild some of them
  python3 tools/build_packs.py notes FOLDER NAME     make bendir-rai/s/NAME.json from your own recordings,
                                                     one file per note, named like C4.wav, Eb3.wav, F#2.wav
Needs Python 3 and ffmpeg. Downloads are cached in tools/.cache/.
"""
import argparse, base64, json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'bendir-rai', 's')
CACHE = os.path.join(ROOT, 'tools', '.cache')
VCSL = 'https://raw.githubusercontent.com/sgossner/VCSL/master/'
GM = 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/{}-mp3/{}.mp3'
GM_NOTES = [n + str(o) for o in range(1, 7) for n in ('C', 'E', 'Ab')] + ['C7']
NOTE_RE = re.compile(r'^([A-G])(b|#|s)?(-?\d)$')


def fetch(src):
    url = VCSL + urllib.parse.quote(src[5:]) if src.startswith('vcsl:') else src
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, re.sub(r'[^A-Za-z0-9._-]+', '_', url.split('://', 1)[-1]))
    if not os.path.exists(path):
        print('  downloading', url)
        with urllib.request.urlopen(url, timeout=60) as r, open(path + '.part', 'wb') as f:
            f.write(r.read())
        os.replace(path + '.part', path)
    return path


def peak_db(path, filters):
    err = subprocess.run(['ffmpeg', '-v', 'info', '-i', path, '-ac', '1', '-af', filters + ',volumedetect', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    found = re.findall(r'max_volume: (-?[\d.]+)', err)
    if not found:
        sys.exit('ffmpeg could not read ' + path)
    return float(found[-1])


def trimmed(path, seconds, target_db, silence_db, codec):
    """Cut the silence before the sound, keep `seconds` of it with a fade-out, set its peak level."""
    f = (f'silenceremove=start_periods=1:start_threshold={silence_db}dB,atrim=0:{seconds},'
         f'afade=t=out:st={seconds * 0.7:.3f}:d={seconds * 0.3:.3f}')
    gain = target_db - peak_db(path, f)
    with tempfile.NamedTemporaryFile(suffix='.wav' if codec == 'wav' else '.mp3', delete=False) as t:
        out = t.name
    enc = ['-c:a', 'pcm_s16le'] if codec == 'wav' else ['-c:a', 'libmp3lame', '-b:a', '128k']
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-ac', '1', '-ar', '44100', '-af', f + f',volume={gain}dB'] + enc + [out], check=True)
    data = open(out, 'rb').read()
    os.remove(out)
    return data


def write(name, entries):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, name + '.json')
    with open(path, 'w') as f:
        json.dump({k: base64.b64encode(v).decode() for k, v in entries.items()}, f)
    print(f'wrote {os.path.relpath(path, ROOT)}: {len(entries)} sounds, {os.path.getsize(path) // 1024} KB')


def build(name, spec):
    print('building', name)
    if spec['type'] == 'hits':
        write(name, {k: trimmed(fetch(h['src']), h['seconds'], h['peak_db'], h['silence_db'], 'wav') for k, h in spec['hits'].items()})
    elif spec['type'] == 'gm':
        write(name, {n: open(fetch(GM.format(spec['instrument'], n)), 'rb').read() for n in sorted(GM_NOTES)})
    else:
        sys.exit('unknown pack type: ' + spec['type'])


def from_folder(folder, name, seconds):
    entries = {}
    for fn in sorted(os.listdir(folder)):
        stem, ext = os.path.splitext(fn)
        if ext.lower() not in ('.wav', '.mp3', '.m4a', '.ogg', '.flac', '.aiff', '.aif'):
            continue
        if not NOTE_RE.match(stem):
            print('  skipped', fn, '(name it after its note, like C4 or Eb3)')
            continue
        entries[stem] = trimmed(os.path.join(folder, fn), seconds, -1, -45, 'mp3')
    if not entries:
        sys.exit('No recordings named after notes were found in ' + folder)
    write(name, entries)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', nargs='+', metavar='PACK', help='rebuild only these packs')
    sub = ap.add_subparsers(dest='cmd')
    nt = sub.add_parser('notes', help='make an instrument pack from a folder of recordings')
    nt.add_argument('folder')
    nt.add_argument('name', help='pack name, for example oud (becomes bendir-rai/s/oud.json)')
    nt.add_argument('--seconds', type=float, default=3.0, help='how much of each note to keep (default 3)')
    a = ap.parse_args()
    if a.cmd == 'notes':
        from_folder(a.folder, a.name, a.seconds)
        return
    specs = {k: v for k, v in json.load(open(os.path.join(ROOT, 'tools', 'packs.json'))).items() if not k.startswith('_')}
    for name in a.only or specs:
        if name not in specs:
            sys.exit(f'{name} is not in tools/packs.json')
        build(name, specs[name])


if __name__ == '__main__':
    main()
