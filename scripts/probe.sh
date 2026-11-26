#!/bin/bash
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
set -a; . /home/hatch/apps/lk21-api/proxy.env; set +a
for u in 'https://lk21official.fun/genre/tidak-ada-xyz/' 'https://lk21official.fun/genre/action/' 'https://lk21official.fun/genre/action/page/999/'; do
  printf '%-58s ' "$u"
  curl -sL -m 60 -A "$UA" -o /dev/null -w '%{http_code} size=%{size_download}\n' "$u"
done
