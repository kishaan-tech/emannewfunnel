#!/usr/bin/env python3
"""Regenerate every tracking clone of fboptin.html.

NOT a build step: the site still ships as authored and needs no tooling to run.
This exists because 27 pages now carry a byte-identical copy of fboptin.html --
17 /fboptin-b3v*, 2 /fboptin-b3img*, the 5 lettered ones and fboptin3/5/6,
whose own hero copy the universal headline erased -- and hand-editing 27 files
is how they silently drift apart.

Each clone keeps its own header comment and takes its body from fboptin.html.

Usage (from the repo root):   python3 tools/sync-clones.py [--check]
  --check  report drift and exit non-zero instead of rewriting.
"""
import io, os, re, sys

BASE = "fboptin.html"
# Every paid opt-in page whose body is identical to fboptin.html. igoptin is
# deliberately absent: it is the organic page, with no Pixel and 14 attribution
# fields instead of 20, so it has to be edited by hand.
CLONES = ["fboptin-b3v%d.html" % i for i in range(1, 18)] + \
         ["fboptin-b3img1.html", "fboptin-b3img2.html",
          "fboptinaa.html", "fboptinab.html", "fboptinba.html",
          "fboptinca.html", "fboptinda.html",
          "fboptin3.html", "fboptin5.html", "fboptin6.html"]
HDR = re.compile(r'^<!DOCTYPE html>\n(<!--.*?-->\n)?', re.S)

def split(path):
    s = io.open(path, encoding="utf-8").read()
    m = HDR.match(s)
    if not m:
        raise SystemExit("%s: no <!DOCTYPE html> at the top" % path)
    return m.group(0), s[m.end():]

def main():
    check = "--check" in sys.argv
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    _, body = split(BASE)
    drift, synced = [], []
    for c in CLONES:
        if not os.path.exists(c):
            drift.append(c + " (missing)"); continue
        head, own = split(c)
        if own == body:
            continue
        if check:
            drift.append(c)
        else:
            io.open(c, "w", encoding="utf-8").write(head + body)
            synced.append(c)
    if check:
        print("drift: " + (", ".join(drift) if drift else "none"))
        return 1 if drift else 0
    print("synced %d of %d clones%s" % (len(synced), len(CLONES),
          (": " + ", ".join(synced)) if synced else " (all already current)"))
    return 0

if __name__ == "__main__":
    sys.exit(main())
