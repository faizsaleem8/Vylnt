#!/bin/sh
# Developer-only. Creates a private browser profile and a one-host TLS leaf.
set -eu
tools=${VYLNT_LINUX_TOOLS:-"$PWD/.local/native-linux-tools"}
export PATH="$tools/node-v24.11.1-linux-x64/bin:$tools/lib/usr/bin:$PATH"
export LD_LIBRARY_PATH="$tools/lib/usr/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$tools/browsers}"
command -v node >/dev/null
command -v certutil >/dev/null
command -v openssl >/dev/null

profile=$(mktemp -d /tmp/vylnt-upgrade.XXXXXXXX)
cleanup() {
  case "$profile" in /tmp/vylnt-upgrade.*) rm -rf -- "$profile";; *) exit 2;; esac
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
umask 077
mkdir -p "$profile/.local/share/pki/nssdb" "$profile/.pki"
nss="$profile/.local/share/pki/nssdb"
ln -s "$nss" "$profile/.pki/nssdb"
openssl req -new -x509 -nodes -newkey rsa:2048 -days 1 -sha256 \
  -subj /CN=vylnt-resource.test -addext subjectAltName=DNS:vylnt-resource.test \
  -addext basicConstraints=critical,CA:FALSE -addext keyUsage=critical,digitalSignature,keyEncipherment \
  -addext extendedKeyUsage=serverAuth -keyout "$profile/leaf-key.pem" -out "$profile/leaf.pem" 2>/dev/null
certutil -N --empty-password -d "sql:$nss"
certutil -A -d "sql:$nss" -t 'P,,' -n 'VYLNT disposable fixture leaf' -i "$profile/leaf.pem"
export HOME="$profile" XDG_DATA_HOME="$profile/.local/share" XDG_CONFIG_HOME="$profile/.config"
case "${1-}" in
  '') node scripts/ml-resource-upgrade-probe.mjs "$profile/leaf-key.pem" "$profile/leaf.pem";;
  --native-etherpad)
    export ESBUILD_BINARY_PATH="${ESBUILD_BINARY_PATH:-$tools/esbuild/package/bin/esbuild}"
    stage=${2:?Supply the verified Linux-local Etherpad runtime}
    registration=${3:?Supply the prospective Etherpad HSTS registration}
    shift 3
    if [ "$#" -eq 0 ]; then set -- hsts-disabled hsts-positive hsts-disable-active hsts-activate-native hsts-missing hsts-host; fi
    for scenario do
      case "$scenario" in
        hsts-disabled|hsts-positive|hsts-disable-active|hsts-activate-native|hsts-missing|hsts-host)
          node scripts/native-etherpad-data.mjs "$stage" "$PWD/.local/etherpad-linux-pnpm-12.4.2/package/pnpm" --registered "$registration" "--hsts-profile=$scenario" || exit $?;;
        *) exit 2;;
      esac
    done;;
  --native-homeinventory)
    export ESBUILD_BINARY_PATH="${ESBUILD_BINARY_PATH:-$tools/esbuild/package/bin/esbuild}"
    registration=${2:?Supply the prospective HomeInventory HSTS registration}
    cp -a -- "$PWD/.local/native-linux-deps-homeinventory" "$profile/homeinventory-dependencies"
    shift 2
    if [ "$#" -eq 0 ]; then set -- hsts-disabled hsts-positive hsts-disable-active hsts-activate-native; fi
    for scenario do
      case "$scenario" in
        hsts-disabled|hsts-positive|hsts-disable-active|hsts-activate-native)
          node scripts/native-preference-data.mjs --seeds --registration "$registration" --hsts-profile "$scenario" || exit $?;;
        *) exit 2;;
      esac
    done;;
  --native-jingo)
    : "${VYLNT_NATIVE_REGISTRATION:?Register the prospective native cohort first}"
    export ESBUILD_BINARY_PATH="${ESBUILD_BINARY_PATH:-$tools/esbuild/package/bin/esbuild}"
    shift
    if [ "$#" -eq 0 ]; then
      node scripts/native-jingo-script-data.mjs --transport https-upgrade-editor
    else
      for scenario do
        case "$scenario" in
          hsts-disabled|hsts-positive|hsts-missing|hsts-host|hsts-invalid|hsts-invalid-host|hsts-disable-active|hsts-activate-native) node scripts/native-jingo-script-data.mjs --named-hsts --transport "$scenario" || exit $?;;
          http-style|https-upgrade-style) node scripts/native-jingo-script-data.mjs --transport "$scenario" || exit $?;;
          *) exit 2;;
        esac
      done
    fi;;
  --native-bookwise|--native-yoyo-collection|--native-fieldpoint|--native-habit-tracker|--native-tabinator|--native-8star-links|--native-portal|--native-personal-knowledge-manager|--native-wikiflow|--native-anonymous-notepad)
    : "${VYLNT_NATIVE_REGISTRATION:?Register the prospective native cohort first}"
    export ESBUILD_BINARY_PATH="${ESBUILD_BINARY_PATH:-$tools/esbuild/package/bin/esbuild}"
    family=${1#--native-}
    if [ "$family" = wikiflow ]; then
      export VYLNT_NATIVE_NODE20="${VYLNT_NATIVE_NODE20:-$tools/node-v20.18.0-linux-x64/bin/node}"
    fi
    shift
    if [ "$#" -eq 0 ]; then
      case "$family" in bookwise|yoyo-collection) set -- resource-http resource-upgrade hsts-disabled hsts-positive;;
        8star-links) set -- style-http style-upgrade;;
        *) set -- hsts-disabled hsts-positive hsts-missing;; esac
    fi
    for scenario do
      case "$family:$scenario" in 8star-links:style-http|8star-links:style-upgrade|8star-links:module-http|8star-links:module-upgrade|bookwise:style-http|bookwise:style-upgrade|yoyo-collection:style-http|yoyo-collection:style-upgrade|fieldpoint:style-http|fieldpoint:style-upgrade|*:resource-http|*:resource-upgrade|*:hsts-disabled|*:hsts-positive|*:hsts-missing|*:hsts-host|*:hsts-invalid|*:hsts-invalid-host|*:hsts-disable-active|*:hsts-activate-native) ;; *) exit 2;; esac
      if [ "$family" = tabinator ]; then
        case "$scenario" in
          resource-*) node scripts/native-tabinator-acceptance.mjs --seeds "--resource-profile=$scenario" || exit $?;;
          *) node scripts/native-tabinator-acceptance.mjs --seeds "--hsts-profile=$scenario" || exit $?;;
        esac
      else
        node scripts/native-expansion-data.mjs --family "$family" --profile "$scenario" || exit $?
      fi
    done;;
  *) echo 'Expected a supported --native-<family> argument or no argument' >&2; exit 2;;
esac
