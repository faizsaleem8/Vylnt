#!/bin/sh
# Isolated Linux Chromium trust. The leaf stays inside a fresh browser home.
set -eu
case "${1-}" in hsts-disabled|hsts-positive|http-editor) ;; *) echo 'Select hsts-disabled, hsts-positive or http-editor' >&2; exit 2;; esac
command -v certutil >/dev/null
node scripts/ml-local-tls.mjs review >/dev/null
leaf=$(node -e "const f=require('fs'),p=require('path'),m=JSON.parse(f.readFileSync('.local/ml-local-tls/active.json'));process.stdout.write(p.resolve('.local/ml-local-tls',m.directory,'cert.pem'))")
profile_home=$(mktemp -d)
trap 'rmdir_work' EXIT
rmdir_work() {
  case "$profile_home" in "${TMPDIR:-/tmp}"/tmp.*) rm -rf -- "$profile_home";; *) echo 'Unexpected browser-home path' >&2; exit 2;; esac
}
trap 'exit 130' INT
trap 'exit 143' TERM
nss="$profile_home/.local/share/pki/nssdb"
mkdir -p "$nss" "$profile_home/.pki"
certutil -N --empty-password -d "sql:$nss"
certutil -A -d "sql:$nss" -t 'P,,' -n 'VYLNT isolated localhost peer' -i "$leaf"
ln -s "$nss" "$profile_home/.pki/nssdb"
env HOME="$profile_home" XDG_DATA_HOME="$profile_home/.local/share" XDG_CONFIG_HOME="$profile_home/.config" node scripts/native-jingo-script-data.mjs --transport "$1"
