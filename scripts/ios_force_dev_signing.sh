#!/usr/bin/env bash
# After `expo prebuild`, force Manual signing onto the explicit
# "Bangkok Darts League Development" profile so Xcode does not fall
# back to the wildcard "iOS Team Provisioning Profile: *", which cannot
# carry Push / Associated Domains / Sign in with Apple.
set -euo pipefail

cd "$(dirname "$0")/.."

PBX="$(echo ios/*.xcodeproj/project.pbxproj)"
if [ ! -f "$PBX" ]; then
  echo "error: no ios/*.xcodeproj/project.pbxproj (run prebuild first)" >&2
  exit 1
fi

PROFILE_NAME="${IOS_DEV_PROFILE_NAME:-Bangkok Darts League Development}"
TEAM_ID="${APPLE_TEAM_ID:-2MXCL8R3KW}"

python3 - <<PY
from pathlib import Path
path = Path("$PBX")
text = path.read_text()
profile = "$PROFILE_NAME"
team = "$TEAM_ID"
keys = {
    "CODE_SIGN_STYLE": "Manual",
    "CODE_SIGN_IDENTITY": '"Apple Development"',
    '"CODE_SIGN_IDENTITY[sdk=iphoneos*]"': '"Apple Development"',
    "PROVISIONING_PROFILE_SPECIFIER": f'"{profile}"',
    "DEVELOPMENT_TEAM": team,
}

# Inject/replace keys inside the app target Debug/Release configs only
# (those that already set PRODUCT_BUNDLE_IDENTIFIER).
import re
def patch_block(block: str) -> str:
    if "PRODUCT_BUNDLE_IDENTIFIER" not in block:
        return block
    for key, value in keys.items():
        pattern = re.compile(rf'^\t+{re.escape(key)} = .*?;\n', re.M)
        line = None
        # Find indentation from DEVELOPMENT_TEAM or PRODUCT_BUNDLE_IDENTIFIER
        m = re.search(r'^(\t+)DEVELOPMENT_TEAM = ', block, re.M) or re.search(
            r'^(\t+)PRODUCT_BUNDLE_IDENTIFIER = ', block, re.M
        )
        indent = m.group(1) if m else "\t\t\t\t"
        replacement = f"{indent}{key} = {value};\n"
        if pattern.search(block):
            block = pattern.sub(replacement, block)
        else:
            # Insert after DEVELOPMENT_TEAM if present, else after CODE_SIGN_ENTITLEMENTS
            for anchor in ("DEVELOPMENT_TEAM", "CODE_SIGN_ENTITLEMENTS", "PRODUCT_BUNDLE_IDENTIFIER"):
                am = re.search(rf'^(\t+){anchor} = .*?;\n', block, re.M)
                if am:
                    insert_at = am.end()
                    block = block[:insert_at] + replacement + block[insert_at:]
                    break
    return block

parts = re.split(r'(/\* Begin XCBuildConfiguration section \*/|/\* End XCBuildConfiguration section \*/)', text)
if len(parts) < 3:
    raise SystemExit("XCBuildConfiguration section not found")
# parts: before, begin marker, body, end marker, after
body = parts[2]
configs = re.split(r'(?=\t\t[0-9A-F]+ /\* (?:Debug|Release) \*/ = \{)', body)
configs = [patch_block(c) for c in configs]
parts[2] = "".join(configs)
path.write_text("".join(parts))
print(f"Forced Manual signing → profile '{profile}', team {team}")
PY
