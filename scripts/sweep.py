#!/usr/bin/env python3
"""Sweep every public endpoint and report the HTTP code plus the payload shape.

Run it after a deploy:  python3 scripts/sweep.py [base-url]
"""
import subprocess, json, sys, time, concurrent.futures

LOCAL = 'http://127.0.0.1:3110'
PUB = 'https://api.zainulghani.biz.id'

EP = [
 '/api/health','/api/home','/api/home/film-unggulan','/api/home/latest-movies',
 '/api/home/latest-series','/api/home/series-update','/api/home/top-month',
 '/api/home/recommendations','/api/home/family','/api/home/action','/api/home/drakor',
 '/api/home/horror','/api/home/romance','/api/home/comedy','/api/home/korea',
 '/api/home/thailand','/api/home/india','/api/home/navigation','/api/home/genre',
 '/api/home/country','/api/home/years','/api/home/series','/api/home/populer',
 '/api/search?q=dilan','/api/movie/pagpag-24-7','/api/movie/pagpag-24-7/cast',
 '/api/series/against-the-current','/api/series/against-the-current/seasons',
 '/api/series/against-the-current/episodes','/api/episode/against-the-current-s1e1',
 '/api/person/eric-roberts','/api/person/tom-holland','/api/actors/popular',
 '/api/actors/stats','/api/home/genre/action','/api/home/country/korea',
 '/api/home/years/2025','/api/home/populer/action','/api/genre/action/movies',
 '/api/top-box-office','/api/coming-soon','/api/news','/api/trailers',
 '/api/debug/upstream',
]

# Slugs that do not exist upstream. A correct API answers 404 with a message
# here instead of an empty list, so they are checked separately.
INVALID = ['/api/home/series/netflix', '/api/home/genre/tidak-ada-xyz']

def fetch(base, ep):
    t0 = time.time()
    r = subprocess.run(
        ['curl', '-s', '-m', '180', '-w', '\n__CODE__%{http_code}', base + ep],
        capture_output=True, text=True)
    out = r.stdout
    code = out.rsplit('__CODE__', 1)[-1].strip() if '__CODE__' in out else 'ERR'
    body = out.rsplit('\n__CODE__', 1)[0]
    shape = ''
    try:
        d = json.loads(body)
        if not d.get('success'):
            shape = 'success=false:' + str(d.get('error') or d.get('message'))[:60]
        else:
            dat = d.get('data')
            if isinstance(dat, list):
                shape = 'list[%d]' % len(dat)
            elif isinstance(dat, dict):
                shape = 'obj{%s}' % ','.join(list(dat.keys())[:6])
            else:
                shape = 'scalar:' + str(type(dat).__name__)
    except Exception as e:
        shape = 'NON-JSON(%s)' % str(e)[:30]
    return ep, code, round(time.time() - t0, 2), shape

def sweep(base, label):
    print('=' * 12, label)
    with concurrent.futures.ThreadPoolExecutor(6) as ex:
        rows = list(ex.map(lambda e: fetch(base, e), EP))
    ok = bad = 0
    for ep, code, dt, shape in rows:
        good = code == '200' and not shape.startswith(('success=false', 'NON-JSON'))
        ok += good
        bad += not good
        print('%s %s %6ss %-45s %s' % ('OK ' if good else 'FAIL', code, dt, ep, shape))
    # Negative cases: an unknown slug must be a 404, not an empty list.
    for ep in INVALID:
        _, code, dt, shape = fetch(base, ep)
        good = code == '404'
        ok += good
        bad += not good
        print('%s %s %6ss %-45s %s' % ('OK ' if good else 'FAIL', code, dt, ep, shape))

    print('-- %s: %d ok / %d gagal\n' % (label, ok, bad))
    return ok, bad

if __name__ == '__main__':
    bases = [(LOCAL, 'LOKAL'), (PUB, 'PUBLIK')]
    if len(sys.argv) > 1:
        bases = [(sys.argv[1], 'TARGET')]
    a = b = 0
    for base, label in bases:
        o, f = sweep(base, label)
        a += o
        b += f
    print('TOTAL ok=%d gagal=%d' % (a, b))
    sys.exit(1 if b else 0)
