# Seven project-backed development datasets

Measured 7 November 2026. The seven category files are populated. None meets the thresholds for fitting the remaining-category candidate. JS-002 retains its separate controlled release.

## Latest HomeInventory HSTS supplement

`.local/ml-q-material-datasets-056` credits **326/630**, with **304
outstanding**. It contains 328 signed captures and 1011 finding observations.
HomeInventory supplied two change-warranted and two contextual examples
from its registered authenticated profile response. The four strict
Chromium runs verified native signed ownership, a real house write,
independent SQLite readback and an anonymous write that left storage unchanged.
Dataset digest `31bb2b7d63110b2e1d00e051d4a9276894eda40067900192b2092a231234e494`.

| HSTS class | Training | Validation |
|---|---:|---:|
| Change warranted | 30 / 30 from eight families | 12 / 15 from three families |
| Contextual | 30 / 30 from eight families | 12 / 15 from three families |

HSTS has **84/90** eligible examples. All six remaining HSTS slots are
in validation. [Transport evidence](ML_TLS_EVIDENCE.md)

## Previous native HSTS installation supplement

`.local/ml-q-material-datasets-055` credits **322/630**, with **308
outstanding**. It contains 324 signed captures and 1003 finding observations.
Ten families supply one contextual case each. Chromium reached plaintext
after a credential-free reset and attempted TLS only after the application's
positive response. Dataset digest
`8a2e36b0ec45aa1833c9bf953dc64dff11399228fb0253ad0863ae7426966011`.

| HSTS class | Training | Validation |
|---|---:|---:|
| Change warranted | 28 / 30 from seven families | 12 / 15 from three families |
| Contextual | 28 / 30 from seven families | 12 / 15 from three families |

HSTS has **80/90** eligible examples. The other category counts are
unchanged. [Transport evidence](ML_TLS_EVIDENCE.md)

The active split assigns HomeInventory to training and Etherpad to
validation. Four successful exploratory Anonymous Notepad captures
were registered against the original source list and rejected at
admission. The captured wire evidence adds zero examples to this split.

## Previous active HSTS removal supplement

`.local/ml-q-material-datasets-054` credits **312/630**, with **318
outstanding**. It contains 314 signed captures and 975 finding observations.
Seven training families and three validation families each add one
change-warranted example. Chromium reached plaintext before policy
installation, attempted TLS while the policy was active and returned to
plaintext after the native zero directive. Dataset digest
`86e81f2829f0a3baeea44d04d37621d44f371ceedd22fc78d15cf4450e20a47c`.

| HSTS class | Training | Validation |
|---|---:|---:|
| Change warranted | 28 / 30 from seven families | 12 / 15 from three families |
| Contextual | 21 / 30 from seven families | 9 / 15 from three families |

HSTS has **70/90** eligible examples. The other six category counts are
unchanged. [Transport evidence](ML_TLS_EVIDENCE.md)

## Previous Wikiflow HSTS supplement

`.local/ml-q-material-datasets-053` credits **302/630**, with **328
outstanding**. It contains 304 signed captures and 947 finding observations.
Wikiflow adds three change-warranted and three contextual HSTS training
cases from its signed-session endpoint. All six use strict browser TLS
and independent verification of a native term write. Anonymous writes and
missing or invalid CSRF tokens left storage unchanged. Dataset digest
`fbb27beaddb069f7340be1dfb6857bee1bfe011560daff6238811ef17270c6cd`.

| HSTS class | Training | Validation |
|---|---:|---:|
| Change warranted | 21 / 30 from seven families | 9 / 15 from three families |
| Contextual | 21 / 30 from seven families | 9 / 15 from three families |

HSTS has **60/90** eligible examples. The other six category counts are
unchanged from the previous snapshot. [Transport evidence](ML_TLS_EVIDENCE.md)

## Previous protected notes HSTS supplement

`.local/ml-q-material-datasets-052` credits **296/630**, with **334
outstanding**. It contains 298 signed captures and 935 finding observations.
Personal Knowledge Manager adds six HSTS training cases from the pinned
protected notes route. Each run combined strict browser TLS and the native
write with an independent SQLite readback. Missing and invalid credentials
left storage unchanged. The six profiles cover disabled, positive, missing
and malformed headers, plus missing and malformed headers under an active
same-host policy. Dataset digest
`e5a03e0f63e14c3bce983745bfdfda9b9002eba7c0bd60e8c4f9e5db57847426`.

| HSTS class | Training | Validation |
|---|---:|---:|
| Change warranted | 18 / 30 from six families | 9 / 15 from three families |
| Contextual | 18 / 30 from six families | 9 / 15 from three families |

HSTS has **54/90** eligible examples. The other six categories retain
their counts in the previous snapshot. [Transport evidence](ML_TLS_EVIDENCE.md)

## Previous contextual HttpOnly validation supplement

`.local/ml-q-material-datasets-051` credits **290/630**, with **340
outstanding**. It contains 292 signed captures and 929 finding observations.
Etherpad adds four contextual HttpOnly validation cases with Secure set,
across Lax and Strict and two browser cookie lifetimes. The existing
HomeInventory cases stay in training. Contextual HttpOnly now has eight
training and eight validation examples, each from one family. It still
needs 22 training and seven validation examples, with at least two more
contributing families in each split.
Dataset digest `6e00b21fc6ccc87d74ddc84c4af2c86392374fa0cc8a52f3bb87df05157c769f`.

| Category | Credited / 90 | Remaining |
|---|---:|---:|
| HDR-001 · HSTS | 48 | 42 |
| HDR-002 · Framing | 32 | 58 |
| HDR-003 · Script policy | 42 | 48 |
| CK-001 · Secure | 53 | 37 |
| CK-002 · HttpOnly | 61 | 29 |
| CK-003 · SameSite | 32 | 58 |
| NET-001 · Mixed resources | 22 | 68 |

## Previous contextual HttpOnly training supplement

`.local/ml-q-material-datasets-050` credits **286/630**, with **344
outstanding**. It contains 288 signed captures and 909 finding observations.
HomeInventory adds four contextual HttpOnly training cases, varying Lax
and Strict plus transient and persistent lifetime with Secure enabled.
The browser confirmed the targeted HttpOnly finding and absence of a
Secure finding for the same cookie. The checks exercise the native
language preference, separate it from the authentication cookie and
verify the HttpOnly counterfactual.
Dataset digest `8dccf79c50b6a483a472ddf751a6dfeaf84de815310d29271dd09241f643b4c0`.

| Category | Credited / 90 | Remaining |
|---|---:|---:|
| HDR-001 · HSTS | 48 | 42 |
| HDR-002 · Framing | 32 | 58 |
| HDR-003 · Script policy | 42 | 48 |
| CK-001 · Secure | 53 | 37 |
| CK-002 · HttpOnly | 57 | 33 |
| CK-003 · SameSite | 32 | 58 |
| NET-001 · Mixed resources | 22 | 68 |

Contextual HttpOnly has eight training and four validation cases.
Each split still needs at least two more contributing families.

## Previous standalone module transport supplement

`.local/ml-q-material-datasets-049` credits **282/630**, with **348
outstanding**. It contains 284 signed captures and 897 finding observations.
8star Links adds one mixed-resource training case for direct loopback HTTP
and one for a verified HTTPS upgrade. Both use the pinned native module,
the withheld/restored settings-menu control and independent SQLite readback.
Dataset digest `63135a8b2950357f0463dfe818224561d9ef2424f14dbce43a3d1e4e047f0d24`.

| Mixed-resource class | Training | Validation |
|---|---:|---:|
| Change warranted | 6 / 30 from three families | 5 / 15 from three families |
| Contextual | 6 / 30 from three families | 5 / 15 from three families |

| Category | Credited / 90 | Remaining |
|---|---:|---:|
| HDR-001 · HSTS | 48 | 42 |
| HDR-002 · Framing | 32 | 58 |
| HDR-003 · Script policy | 42 | 48 |
| CK-001 · Secure | 53 | 37 |
| CK-002 · HttpOnly | 53 | 37 |
| CK-003 · SameSite | 32 | 58 |
| NET-001 · Mixed resources | 22 | 68 |

Credits are capped at each class and split quota. A surplus of
change-warranted cases cannot fill a contextual or family gap.
[Resource evidence](ML_RESOURCE_COMPATIBILITY.md)

## Previous string-evaluation supplement

`.local/ml-q-material-datasets-048` credits **280/630**, with **350
outstanding**. It contains 282 signed captures and 889 finding observations.
8star Links, BookWise and FieldPoint add change-warranted training cases.
Jingo, Tabinator and Yoyo Collection add change-warranted validation cases.
Each run verified permitted string evaluation, blocked inline insertion and
a working native interaction after removal of `unsafe-eval`. Dataset digest
`22f91f522ce32b227553d7f8396a4edab4ffab81a2c945a2c4aba1838b6f494b`.

| Script-policy class | Training | Validation |
|---|---:|---:|
| Change warranted | 12 / 30 from three families | 12 / 15 from three families |
| Contextual | 9 / 30 from three families | 9 / 15 from three families |

[Script policy evidence](ML_META_POLICY.md)

## Previous hash-based script response supplement

`.local/ml-q-material-datasets-047` credits **274/630**, with **356
outstanding**. It contains 276 signed captures and 872 finding observations.
8star Links, BookWise and FieldPoint add contextual training cases.
Jingo, Tabinator and Yoyo Collection add contextual validation cases.
The native interaction remained usable under the response hash policy
while Chromium blocked the unapproved inline probe. Dataset digest
`e69264d05ef1d1c09229beefc0f3edc122dc9cc70b95e0b77458828f20f076e9`.

| Script-policy class | Training | Validation |
|---|---:|---:|
| Change warranted | 9 / 30 from three families | 9 / 15 from three families |
| Contextual | 9 / 30 from three families | 9 / 15 from three families |

[Script policy evidence](ML_META_POLICY.md)

## Previous broad ancestor policy supplement

`.local/ml-q-material-datasets-046` credits **268/630**, with **362
outstanding**. It contains 270 signed captures and 855 finding observations.
BookWise, FieldPoint and Habit Tracker add change-warranted training cases.
Jingo, Tabinator and Yoyo Collection add change-warranted validation cases.
All six show a native authenticated write under `frame-ancestors http:`.
Dataset digest `be3d5f3ba940c8d2101ce30bee0dafbe7309039aec936e1ffa58258662edaec2`.

| Framing class | Training | Validation |
|---|---:|---:|
| Change warranted | 6 / 30 from three families | 6 / 15 from three families |
| Contextual | 14 / 30 from seven families | 6 / 15 from three families |

[Framing evidence](ML_FRAME_POLICY.md)

## Previous paired framing denial supplement

`.local/ml-q-material-datasets-045` credits **262/630**, with **368
outstanding**. It contains 264 signed captures and 837 finding observations.
FieldPoint, Personal Knowledge Manager and Wikiflow add contextual
training examples. Jingo adds a contextual validation example. The
foreign direct and nested controls each recover native behavior after
removing only the duplicate deny header. Dataset digest
`5058ef0fcfea3067be958317c96b1014e48b9eeb3d22093450468dde42920aba`.

| Framing class | Training | Validation |
|---|---:|---:|
| Change warranted | 3 / 30 from three families | 3 / 15 from three families |
| Contextual | 14 / 30 from seven families | 6 / 15 from three families |

[Framing evidence](ML_FRAME_POLICY.md)

## Previous duplicate framing denial supplement

`.local/ml-q-material-datasets-044` credits **258/630**, with **372
outstanding**. It contains 260 signed captures and 826 finding observations.
8star Links, BookWise, Habit Tracker and Portal add contextual training
examples. Tabinator and Yoyo Collection add contextual validation examples.
FieldPoint, Personal Knowledge Manager and Wikiflow did not pass all
controls and contributed no rows. Dataset digest
`0864f0cbdf160074f0fd83c0db27ef6e3f660cb5238573af0f963f11984d5ac5`.

| Framing class | Training | Validation |
|---|---:|---:|
| Change warranted | 3 / 30 from three families | 3 / 15 from three families |
| Contextual | 11 / 30 from seven families | 5 / 15 from three families |

[Framing evidence](ML_FRAME_POLICY.md)

## Previous Jingo stylesheet supplement

`.local/ml-q-material-datasets-043` credits **252/630**, with **378
outstanding**. It contains 254 signed captures and 810 finding observations.
The two Jingo validation runs show direct HTTP and a verified pre-transfer
HTTPS upgrade for the same native stylesheet. Both verify loss of the
normal help-dialog behavior while the stylesheet is withheld and its
recovery after restoration. Dataset digest
`7ffb52d78f2cabd924ad0510fc5b3b873957dc02a1151e3dae2e061dca3efd83`.

| Mixed-resource class | Training | Validation |
|---|---:|---:|
| Change warranted | 5 / 30 from three families | 5 / 15 from three families |
| Contextual | 5 / 30 from three families | 5 / 15 from three families |

[Resource evidence](ML_RESOURCE_COMPATIBILITY.md)

## Previous FieldPoint origin configuration supplement

`.local/ml-q-material-datasets-042` credits **250/630**, with **380
outstanding**. It contains 252 signed captures and 797 finding observations.
All four change-warranted SameSite cases from FieldPoint were credited.
The browser verified repeated foreign writes, signed-session ownership
and negative cookie controls on the same route. Dataset digest
`c9810f4d090d1c1b5a7c499d074c3442bd712bbc38d5365a0aa3c62ae0d2100b`.

| SameSite class | Training | Validation |
|---|---:|---:|
| Change warranted | 16 / 30 from four families | 12 / 15 from three families |
| Contextual | 4 / 30 from one family | 0 / 15 from zero families |

[Cross-site evidence](ML_CROSS_SITE_EVIDENCE.md)

## Previous Portal HSTS supplement

`.local/ml-q-material-datasets-041` credits **246/630**, with **384
outstanding**. It contains 248 signed captures and 791 finding observations.
Portal adds three change-warranted and three contextual HSTS training
examples. Its native public group writes were checked against independently
reopened SQLite storage. Dataset digest
`26790e8f8c999b17ddb8ee92c07a56455f3aa7cfab1f54bc9faafde492311084`.

| HSTS class | Training | Validation |
|---|---:|---:|
| Change warranted | 15 / 30 from five families | 9 / 15 from three families |
| Contextual | 15 / 30 from five families | 9 / 15 from three families |

[TLS evidence](ML_TLS_EVIDENCE.md)

## Previous retained HSTS policy supplement

`.local/ml-q-material-datasets-040` credits **240/630**, with **390
outstanding**. It contains 242 signed captures and 773 finding
observations. 8star Links, BookWise, FieldPoint and Habit Tracker add
one contextual training case each. Jingo, Tabinator and Yoyo Collection
add one contextual validation case each.

| HSTS class | Training | Validation |
|---|---:|---:|
| Change warranted | 12 / 30 from four families | 9 / 15 from three families |
| Contextual | 12 / 30 from four families | 9 / 15 from three families |

All seven captures match the prospective registration and verify the
malformed header, installed policy and credential-free reset in Chromium.
Dataset digest `e9990faa77aef62151f2003bc7c7396238cf6444c9b8ffbdf12dc8a9eaadd2be`.
Replaying the signed registration reproduced all 14 preparation files.
[TLS evidence](ML_TLS_EVIDENCE.md)

## Previous malformed HSTS supplement

`.local/ml-q-material-datasets-039` credits **233/630**, with **397
outstanding**. It contains 235 signed captures and 751 finding
observations. 8star Links, BookWise, FieldPoint and Habit Tracker
add one change-warranted training case each. Jingo, Tabinator and
Yoyo Collection add one validation case each.

| HSTS class | Training | Validation |
|---|---:|---:|
| Change warranted | 12 / 30 from four families | 9 / 15 from three families |
| Contextual | 8 / 30 from four families | 6 / 15 from three families |

All seven cases used strict TLS and independent native write checks.
Chromium reached plaintext with the malformed directive and sent a
TLS handshake after the valid control. Dataset digest
`4c26d2cdf9ac97fa6015495b6f60feb03edcada2063a447301c13e090d6d0a60`.
[TLS evidence](ML_TLS_EVIDENCE.md)

## Previous credential-free HSTS reset supplement

`.local/ml-q-material-datasets-038` credits **226/630**, with **404
outstanding**. It contains 228 signed captures and 729 finding
observations. BookWise adds a contextual HSTS training case and
Tabinator adds a contextual HSTS validation case.

| HSTS class | Training | Validation |
|---|---:|---:|
| Change warranted | 8 / 30 from four families | 6 / 15 from three families |
| Contextual | 8 / 30 from four families | 6 / 15 from three families |

The two browser runs verified plaintext before the policy, an
upgrade while it was installed and plaintext after the reset. The
listener continued to reject credentials. Dataset digest
`ff292755b1fe3ade459d570fa9d73507a5ea619d29ae8db033cb490faf7b59ad`.
[TLS evidence](ML_TLS_EVIDENCE.md)

## Previous same-host HSTS supplement

`.local/ml-q-material-datasets-037` credits **224/630**, with **406
outstanding**. It contains 226 signed captures and 722 finding
observations. 8star Links, FieldPoint and Habit Tracker add one
contextual HSTS training case each. Jingo and Yoyo Collection add one
each in validation. BookWise's reset failed, so it adds no case.

| HSTS class | Training | Validation |
|---|---:|---:|
| Change warranted | 8 / 30 from four families | 6 / 15 from three families |
| Contextual | 7 / 30 from four families | 5 / 15 from three families |

The raw header remains absent. The scoped browser evidence proves
plaintext before installation, an upgrade after an HTTPS response
installed the policy, and plaintext after reset. Dataset digest
`7fb2522ed625bd5a2a5fd1d94e2b84574f9cf6a84ed55a7b527e96620307eddd`.
[TLS evidence](ML_TLS_EVIDENCE.md)

## Previous HSTS supplement

`.local/ml-q-material-datasets-036` credits **219/630**, with **411
outstanding**. It contains 221 signed captures and 707 finding
observations. 8star Links contributes two change cases and one
contextual training case. Jingo contributes one missing-header change
case in validation. Its disabled and positive cases reproduce the
existing material contexts.

| HSTS class | Training | Validation |
|---|---:|---:|
| Change warranted | 8 / 30 from four families | 6 / 15 from three families |
| Contextual | 4 / 30 from four families | 3 / 15 from three families |

All six runs used strict browser TLS and an independent native write
check. The missing cases proved plaintext before the positive control
and a TLS handshake instead of plaintext after it. Dataset digest
`01da10923750ff758f43cd5df0369cff57b27fd2a717a6f35ba17153a9b7a0b5`.
[TLS evidence](ML_TLS_EVIDENCE.md)

## Previous HomeInventory contextual cookie supplement

`.local/ml-q-material-datasets-035` credits **215/630**, with **415
outstanding**. It contains 215 signed captures and 683 finding
observations. HomeInventory's language preference passed the seven
native controls under Lax transient and Strict transient settings.
Each configuration adds one contextual Secure and one contextual
HttpOnly training case.

| Contextual training class | Before | Current |
|---|---:|---:|
| Secure | 2 / 30 | 4 / 30 from one family |
| HttpOnly | 2 / 30 | 4 / 30 from one family |

The new cases supplement the existing Lax and Strict persistent
contexts. The training family assignment remains fixed. Dataset digest
`4f961858e77c0401ba30363cd42dd0306b195cc5f3494040ed965bfeb843ad1a`.

## Previous Etherpad contextual cookie supplement

`.local/ml-q-material-datasets-034` credits **211/630**, with **419
outstanding**. It contains 213 signed captures and 675 finding
observations. The native editor reloaded its line-number preference
under three additional cookie configurations. Restricting reads with
HttpOnly reproduced the native initialization failure. Restoring
access restored the setting. The preference cookie alone received 401.

| Contextual validation class | Before | Current |
|---|---:|---:|
| Secure | 1 / 15 | 4 / 15 from one family |
| HttpOnly | 1 / 15 | 4 / 15 from one family |

The variants are Lax transient, Strict transient and Strict persistent.
The original Lax persistent case remains in the cohort. Dataset digest
`2e7f6a8d99341059575a99a4cb738434958df0f1bc6bd1303cc9f385037c9602`.

## Previous HomeInventory SameSite supplement

`.local/ml-q-material-datasets-033` credits **205/630**, with **425
outstanding**. It contains 210 signed captures and 657 finding
observations. Four Chromium configurations exercised the native
house-creation form. Same-origin and repeated foreign submissions
produced owner-linked SQLite rows. Anonymous submission returned 401
and left storage unchanged.

| SameSite class | Training | Validation |
|---|---:|---:|
| Change warranted | 12 / 30 from three families | 12 / 15 from three families |
| Contextual | 4 / 30 from one family | 0 / 15 from zero families |

Only CK-003 gains credit. HomeInventory keeps its existing training
assignment. Dataset digest
`a15be35fd5c5b9aa162f1b4b553d669bd7124cc4fff6f727a28d6e716fb6ffd8`.
[Browser checks](ML_CROSS_SITE_EVIDENCE.md)

## Previous Habit Tracker SameSite supplement

`.local/ml-q-material-datasets-032` credits **201/630**, with **429
outstanding**. It contains 206 signed captures and 647 finding
observations. Four new training cases span the native logout operation
under transient or persistent and HttpOnly or readable settings.
SQLite confirmed that the foreign form removed the signed session
twice. The anonymous control received HTTP 200 and left it intact.

| SameSite class | Training | Validation |
|---|---:|---:|
| Change warranted | 8 / 30 from two families | 12 / 15 from three families |
| Contextual | 4 / 30 from one family | 0 / 15 from zero families |

Only CK-003 gains credit. The new cases cover one route in one
additional family. Dataset digest
`9fbf54112172989a83e481d6a5e9af3b2217f4b9de9eea1e443ebe0df6b50e5a`.
[Browser checks](ML_CROSS_SITE_EVIDENCE.md)

## Previous Tabinator SameSite supplement

`.local/ml-q-material-datasets-031` credits **197/630**, with **433
outstanding**. It contains 202 signed captures and 633 finding
observations. Four new change cases cover the native JSON bookmark
write with the pinned server's permissive CORS development setting.
Chromium completed preflight and sent the cookie on both foreign writes.
Each write returned 201 and had a matching SQLite row. Each anonymous
request returned 401 without a write.

| SameSite class | Training | Validation |
|---|---:|---:|
| Change warranted | 4 / 30 from one family | 12 / 15 from three families |
| Contextual | 4 / 30 from one family | 0 / 15 from zero families |

Only CK-003 gains development credit. The four cases vary browser
cookie lifetime and readability and count as one additional family.
Dataset digest
`867096e43976c642ee6679b16f7b17c8ae205fef6f443dc5480f88a8d111337f`.
[Browser checks](ML_CROSS_SITE_EVIDENCE.md)

## Previous native SameSite supplements

`.local/ml-q-material-datasets-030` credits **193/630**, with **437
outstanding**. It contains 198 signed captures and 619 finding
observations. FieldPoint adds three contextual training cases across
readable and persistent cookie configurations. Yoyo Collection adds four
validation change cases across the same configuration dimensions.
The Yoyo foreign form sent the session cookie and stored a generated
photo. The test verifies both the SQLite row and stored file bytes.

| SameSite class | Training | Validation |
|---|---:|---:|
| Change warranted | 4 / 30 from one family | 8 / 15 from two families |
| Contextual | 4 / 30 from one family | 0 / 15 from zero families |

Both sources remain one family each. The Yoyo cases cover one
application write route. Other category counts are unchanged.
Dataset digest
`f42e7ffdc581b6b205bad783049a5e343642b09e145f31cab52a34cc82904ce5`.
[Browser checks](ML_CROSS_SITE_EVIDENCE.md)

## Previous native framing supplements

`.local/ml-q-material-datasets-028` credits **186/630**, with **444
outstanding**. It contains 191 signed captures and 600 finding
observations. FieldPoint, Habit Tracker and Jingo each contributed a
framed authenticated write. Jingo also contributed a contextual
own-origin policy case with a blocked foreign and nested ancestor.
The write cases rely on independent SQLite rows or Git commits and
separate anonymous non-mutation checks.

| Framing class | Training | Validation |
|---|---:|---:|
| Change warranted | 3 / 30 from three families | 3 / 15 from three families |
| Contextual | 7 / 30 from seven families | 3 / 15 from three families |

Both classes meet their family minimum in both splits. All four
numerical minima remain open. The profiles cover scoped controls on
disposable local applications. Dataset digest
`f2bdb94fc2b0cf6a09df9ca07a7dd58ae3f05e2b67c2d4e898ff64c5e456d138`.

## Previous native script-policy supplements

`.local/ml-q-material-datasets-026` credits **182/630**, with **448
outstanding**. It contains 187 signed captures and 587 finding
observations. FieldPoint and 8star Links supplied eight training
cases spanning missing, permissive response, permissive meta and
restrictive early meta policies. Six families then supplied one
layered-policy case each. A permissive response policy coexisted
with an early restrictive meta policy. Chromium blocked the
unapproved inline probe while the scoped native interaction remained
available, and the independent write check passed.

| Script-policy class | Training | Validation |
|---|---:|---:|
| Change warranted | 9 / 30 from three families | 9 / 15 from three families |
| Contextual | 6 / 30 from three families | 6 / 15 from three families |

Both classes meet their family minimum in both splits. All four
numerical minima remain open. The other category counts are unchanged.
The corpus retains the original findings and keeps uncertain evidence
outside the confident counts. Dataset digest
`5c603581e12a762016124a0decfc472fff0599324e2877cc2ebea754633f03af`.

## Previous 8star Links settings stylesheet supplement

`.local/ml-q-material-datasets-024` credits **168/630**, with **462
outstanding**. It contains 173 signed captures and 554 finding
observations. 8star Links contributes one direct-HTTP change case and
one verified HTTPS-upgrade contextual case in training. Withholding
the native stylesheet made a closed settings menu appear onscreen.
Restoring it recovered the open and close behavior. A disposable folder
operation was verified separately through SQLite.

| Mixed resource class | Training | Validation |
|---|---:|---:|
| Change warranted | 5 / 30 from three families | 4 / 15 from three families |
| Contextual | 5 / 30 from three families | 4 / 15 from three families |

Both classes meet their family minimum in both splits. All four
numerical minima remain open. Dataset digest
`c5333b981e08e4d20d9774c92d6df22482335f605db4d543c086f70bb1b6b438`.

## Previous Tabinator bookmark editor supplement

`.local/ml-q-material-datasets-023` credits **166/630**, with **464
outstanding**. It contains 171 signed captures and 545 finding observations.
Tabinator adds one direct-HTTP change example and one verified HTTPS
upgrade contextual example to validation. The fixture serves the
unchanged native editor script from a controlled resource URL. Withholding
the script stopped the editor from opening, and restoring it recovered
the behavior. A separate SQLite oracle verified a protected write and
anonymous denial.

| Mixed resource class | Training | Validation |
|---|---:|---:|
| Change warranted | 4 / 30 from two families | 4 / 15 from three families |
| Contextual | 4 / 30 from two families | 4 / 15 from three families |

Both validation classes meet the family minimum. The numerical
requirements remain open in both splits, and training still needs a
third family per class. Other category counts are unchanged. Dataset digest
`cd57876960f6ba0e28d985372ffefe72001883acd453d702dd063b400bbc7caf`.
[Resource test scope](ML_RESOURCE_COMPATIBILITY.md)

## Previous FieldPoint map stylesheet supplement

`.local/ml-q-material-datasets-022` credits **164/630**, with **466
outstanding**. It contains 169 signed captures and 537 finding observations.
The two new NET-001 credits cover direct HTTP and a working HTTPS upgrade
of FieldPoint's native Leaflet stylesheet. The bounded viewport made
the tile positioning failure observable in the withheld phase.

| Mixed resource class | Training | Validation |
|---|---:|---:|
| Change warranted | 4 / 30 from two families | 3 / 15 from two families |
| Contextual | 4 / 30 from two families | 3 / 15 from two families |

Both new cases come from the same FieldPoint family as the earlier
map-script cases. Dataset digest
`5808e9bd6c0e5ef50fac46372a01075c94b8e124e1116c4b203ebb925e52d950`.
[Resource test scope](ML_RESOURCE_COMPATIBILITY.md)

## Previous FieldPoint map-script supplement

`.local/ml-q-material-datasets-021` credits **162/630**, with **468
outstanding**. It contains 167 signed captures and 533 finding observations.
FieldPoint adds one direct HTTP change case and one functioning HTTPS
upgrade contextual case. Chromium verified that withholding the locked
Leaflet script broke the native map. Restoring it recovered the
right-click site editor. A separate SQLite readback verified the native
authenticated write and anonymous denial. The fixture used an offline
tile for both profiles.

| Mixed resource class | Training | Validation |
|---|---:|---:|
| Change warranted | 3 / 30 from two families | 3 / 15 from two families |
| Contextual | 3 / 30 from two families | 3 / 15 from two families |

Failed stylesheet runs contributed no rows. Other category counts
retain their previous values. Dataset digest
`9b8115a1ac19124cf74b693c71531be0d8c15b22fc3f6d94420a21328df08446`.

## Previous native stylesheet supplement

`.local/ml-q-material-datasets-020` credits **160/630**, with **470
outstanding**. It contains 165 signed captures and 530 finding observations.
Four new credits cover direct HTTP and pre-transfer HTTPS upgrade of
BookWise's profile-menu stylesheet and Yoyo Collection's editor stylesheet.
The withheld stylesheet made a closed control render onscreen. Restoring
the stylesheet restored normal behavior. The page and network records
for the same stylesheet count once.

| Mixed resource class | Training | Validation |
|---|---:|---:|
| Change warranted | 2 / 30 from one family | 3 / 15 from two families |
| Contextual | 2 / 30 from one family | 3 / 15 from two families |

All other category counts retain their previous values. Twenty-four
class or family requirements remain unmet. No fitting or holdout prediction
ran. Dataset digest
`eebcc5fce603121136ea367bae58daf677f8de2ac9984b23f35eaa10001cb5b1`.
[Resource test scope](ML_RESOURCE_COMPATIBILITY.md)

## Previous protected cross-site supplement

`.local/ml-q-material-datasets-019` credits **156/630**, with **474
outstanding**. It includes 161 signed captures and 510 finding observations.
The added FieldPoint capture is the first contextual SameSite example.
The 8/4 split and the other six category counts remain the same.

| SameSite class | Training | Validation |
|---|---:|---:|
| Change warranted | 4 / 30 from one family | 4 / 15 from one family |
| Contextual | 1 / 30 from one family | 0 / 15 |

The controlled split-origin fixture uses FieldPoint's native origin
allowlist and records the results of 38 JSON mutation requests and 19
form-encoded POST requests, plus trusted and cookie counterfactual controls.
Twenty-four class or family requirements remain unmet. Dataset digest
`ff5d2e9a51fa3fbd7de527055ef7f4c272c2d15f21aa63ff00edcafc2fbf3874`.
[Test scope](ML_CROSS_SITE_EVIDENCE.md)

## Previous missing-header HSTS supplement

`.local/ml-q-material-datasets-018` credits **155/630**, with **475
outstanding**. Five signed cases from BookWise, FieldPoint, Habit Tracker,
Tabinator and Yoyo Collection were admitted under the existing 8/4 split.
The 160 captures produced 509 finding observations and 230 retained rows,
59 of which are uncertain.

| HSTS class | Training | Validation |
|---|---:|---:|
| Change warranted | 6 / 30 | 5 / 15 |
| Contextual | 3 / 30 | 3 / 15 |

Each class retains three contributing families per split. In each new
case the application response had no HSTS header. Its browser reached
a disposable HTTP listener in plaintext, then attempted TLS to that
listener after receiving a positive control over trusted HTTPS. This
demonstrates the fixture browser's scoped behavior, with no inference
about other browsers or production preload lists. The other six category
counts are unchanged. Digest
`07866a6075dec0d458c4e9d05dc3761bbec0ddf88729889ea8883fdf841068ca`.

## Previous authenticated HSTS supplement

`.local/ml-q-material-datasets-017` credits **150/630**, with **480
outstanding**. Six signed cases from FieldPoint, Habit Tracker and
Tabinator are admitted under the existing 8/4 split. The 155 captures
produced 495 finding observations and 225 retained rows, of which 59
are uncertain.

HSTS now has **3 change / 3 contextual** examples from three families
per class in training and the same in validation. Its numerical
requirements remain 30 per class in training and 15 per class in
validation. The other six categories have the same counts as the
previous preparation. All 14 frozen files replayed byte for byte.
Twenty-four class or family deficits remain and no category is ready
to fit. Digest `cd1cd226be7b5a58df624e54208ee35757a4bc11f1dfe380875fdeff421fc147`.

## Previous BookWise and Yoyo transport supplement

`.local/ml-q-material-datasets-016` credits **144/630**, with **486
outstanding**. Material registration 18 adds four signed BookWise captures
to the preceding Yoyo acquisition. The eight new captures preserve the
8/4 split. The resulting 149 captures produced 481 finding observations
and 215 retained rows, 55 of which are uncertain.

| Category | Training change / contextual | Validation change / contextual |
|---|---:|---:|
| HDR-001 | 1 / 1 | 2 / 2 |
| NET-001 | 1 / 1 | 2 / 2 |

Each training class in the table comes from BookWise. Each validation
class has observations from Jingo and Yoyo. The other category counts
were unchanged. All 14 frozen files reproduced byte for byte. Twenty-four
class or family deficits remain. No category is ready to fit. Digest
`69ca1fc916f7cea12658fd2df7359b467fad033095e0c2a6e2de020ce8c2d80c`.

## Previous Yoyo transport supplement

`.local/ml-q-material-datasets-015` credits **140/630**, with **490
outstanding**. Material registrations 16 and 17 add four signed Yoyo
Collection captures and preserve the 8/4 family split. The 145 captures
produced 463 finding observations and 206 retained rows, 50 of which are
uncertain.

| Category | Training change / contextual | Validation change / contextual |
|---|---:|---:|
| HDR-001 | 0 / 0 | 2 / 2 |
| NET-001 | 0 / 0 | 2 / 2 |

Each validation count in the table comes from that many independent
families. The other five category counts match the preceding preparation.
Yoyo's HTTPS-upgrade case required actual HTTPS script delivery, a failed
modal interaction while the script was withheld, restored functionality and
an independently read SQLite row. The initial direct HTTP case stopped
before signing. The retry passed using an explicit numeric-loopback
resolver exception and supplies the second NET-001 change case in
validation. Digest
`4567769891f8c077e78ab45840ccd12e1119bb199ee305fe016ea1dd3735826e`.

## Previous native resource upgrade

`.local/ml-q-material-datasets-013` credits **136/630**, with **494
outstanding**. Material registration 15 adopts one prospective Jingo
capture and preserves the previous 8/4 split. The cohort contains 141
captures, 449 finding observations and 198 retained rows, of which 46
remain uncertain. Twenty-four class or family requirements still fail.

NET-001 now has one change case and one contextual case in validation,
both from Jingo, and zero in training. The other six category counts
match the table below. Dataset digest
`6f68a35c63e4e350f95116571fbab45775165c0aa47bc0c683deebcd168a29f5`.
[Native dependency and safeguards](ML_RESOURCE_COMPATIBILITY.md)

## Previous Etherpad validation cohort

`.local/ml-q-material-datasets-012` credits **135/630**, with **495 still
required**. Registration `native-etherpad-registration-01` reserves
StockBase's validation slot before collection. Material registration
`14` retires two StockBase captures and admits one signed Etherpad capture.
All eleven other source roles stay fixed. Both preparations replayed their
14 frozen files byte for byte.

| Category | Train change / contextual | Validation change / contextual | Credited / 90 |
|---|---:|---:|---:|
| HDR-001 · HSTS | 0 / 0 | 1 / 1 | 2 |
| HDR-002 · Framing | 1 / 7 | 2 / 2 | 12 |
| HDR-003 · Script policy | 3 / 1 | 9 / 3 | 16 |
| CK-001 · Secure | 32 / 2 | 19 / 1 | 48 |
| CK-002 · HttpOnly | 34 / 2 | 21 / 1 | 48 |
| CK-003 · SameSite | 4 / 0 | 4 / 0 | 8 |
| NET-001 · Mixed resources | 0 / 0 | 1 / 0 | 1 |

The net gain is one credit. Etherpad supplies two contextual cookie
examples from one family and StockBase's retirement removes one framing
example. Framing's validation contextual class now has two contributing
families. The new cohort has 140 captures, 443 finding observations and
196 retained rows, 45 of which are uncertain. Preflight lists 24
outstanding class or family requirements and zero predictions. Dataset
digest `97d51c1d7a2f808c2229a06bc86f2141577cc233fab6c31f9557ab7412eb5f98`.

The Etherpad result covers a single native line-number preference on one
protected pad. Chromium observed the readable cookie, the saved setting on
a fresh context, the native read failure with HttpOnly, successful
restoration and rejection of preference-only access. The signed snapshot
retains only security headers, structural references and cookie metadata.
Other findings from the run remain uncertain. No release or severity
change follows from these development rows.

## Previous Tabinator editor supplement

`.local/ml-q-material-datasets-011` credits **134/630**, with **496 still
required**. Material registration `13` adds five accepted Chromium captures
from prospective native registration `14`. The earlier failed registration
`13` remains available for audit. The fixed 8/4 roles and all 136 preceding
captures are preserved. The resulting 141 runs have 441 observations,
195 retained rows, 45 uncertain rows and 246 removed repeats. The dataset
digest is `6303d4017bb6409690ce0cc2f6ddf6125e5a92c71c0068a9c53d754f4407a186`.

| Category | Train change / contextual | Validation change / contextual | Credits added |
|---|---:|---:|---:|
| HDR-002 · Framing | 1 / 7 | 2 / 3 | 1 |
| HDR-003 · Script policy | 3 / 1 | 9 / 3 | 4 |

Both script-policy validation classes now have three contributing families.
Their context counts still fall below 15 per class. Framing validation change
has two contributing families. The other five categories retain the counts
below. The seven-category preflight still shows 24 deficits and zero
predictions.

The disposable editor omits the pinned CDN assets and external favicon lookup
and uses a small local icon. Native bookmark interactions, authentication and
storage remain in use. Script controls compare the native modal interaction
with JavaScript enabled, disabled and restored. The restrictive profile permits
the actual editor inline script by hash and blocks the unapproved probe. The
framing run performs three browser-originated POSTs and independently checks
the authenticated owner and row contents after each response. Scope is the
exercised editor operation. The first batch exceeded the 2 MiB replay limit
with the upstream logo and contributed no data.

All five accepted captures exclude cookie values and passed reload and tamper
checks. Separate Edge runs passed for the restrictive policy and framed write,
and Chromium passed the existing API profile. All 14 frozen preparation files
reproduced byte for byte. Etherpad remains at source screening.

## Previous Wikiflow and cross-site cookie supplement

`.local/ml-q-material-datasets-010` credits **129/630**, up 19 from 110,
with **501 still required**. Native registrations `11` and `12` add 12
Wikiflow, four Jingo and four BookWise captures through material registrations
`11` and `12`. The 8/4 family split remains fixed. The resulting 136 runs have
426 observations, 189 retained rows, 44 uncertain rows and 237 removed repeats.
The dataset digest is `d6ae8e780e2603f23cbbaf2250da2345f4ab67de3a0d5fba9a52acee7ff56f78`.

| Category | Train change / contextual | Validation change / contextual | Credited / 90 |
|---|---:|---:|---:|
| HDR-001 · HSTS | 0 / 0 | 1 / 1 | 2 |
| HDR-002 · Framing | 1 / 7 | 1 / 3 | 12 |
| HDR-003 · Script policy | 3 / 1 | 6 / 2 | 12 |
| CK-001 · Secure | 32 / 2 | 19 / 0 | 47 |
| CK-002 · HttpOnly | 34 / 2 | 21 / 0 | 47 |
| CK-003 · SameSite | 4 / 0 | 4 / 0 | 8 |
| NET-001 · Mixed resources | 0 / 0 | 1 / 0 | 1 |

Secure and HttpOnly each meet the training and validation change-case minima.
Their contextual classes each need 28 more training and 15 validation cases,
and additional contributing families. Both SameSite change classes have four
cases from one family apiece. SameSite and mixed-resource contextual classes
still have zero cases. Preflight reports 24 outstanding class or family
requirements and zero predictions.

Wikiflow's verified source copy changes only the cookie-session initializer
name for these profiles. The original cookie name is outside the detector's
heuristic. The profile produces real rule observations, verifies the signed
payload against a synthetic user row, and exercises the native write and
anonymous and invalid-CSRF controls. The material projection uses actual
browser attributes. The controlled name does not enter the model inputs.
Jingo and BookWise cross-site profiles require successful same-site, foreign
and repeated foreign writes, plus an unchanged anonymous control. The label
is limited to the tested native create operation. One of the four BookWise
captures matched an existing material state and earned zero additional credit.

Chromium passed all 20 registered runs. Separate Wikiflow and Jingo Edge runs
passed outside the frozen cohort. All 20 reports exclude cookie values and
passed reload and tamper checks. The preparation reproduced all 14 files byte
for byte. See [acquisition constraints](ML_DATA_ACQUISITION_CAPACITY.md) for
the current HSTS collector ceiling and next source screening.

## Previous Jingo validation supplement

`.local/ml-q-material-datasets-008` credits **110/630**, with **520 still
required**. It preserves all existing families and split assignments and adds
four Chromium captures from prospective registration `native-dev-registration-10`
through `native-material-registration-10`. The new preparation has 116 runs,
348 observations, 158 retained rows, 40 uncertain rows and 190 removed repeats.
The dataset digest is
`14d8b9f0da8aba3192068d94d8e473a42e9786d47b0339dfa81d418176b92081`.

| Category | Train change / contextual | Validation change / contextual | Validation change families |
|---|---:|---:|---:|
| CK-001 · Secure | 24 / 2 | 19 / 0 | 3 |
| CK-002 · HttpOnly | 24 / 2 | 19 / 0 | 3 |

Each category gained three change contexts from Jingo, joining Tabinator and
Yoyo Collection. The two cells now meet the 15-context and three-family gate.
The numerator stays at 110 because each cell was already capped at 15 credits.
The other five categories' eligible counts remain as in the table below.
Preflight reports 26 deficits and zero predictions.

Jingo profiles apply attribute changes only to the app's real session and its
signature cookie. Native account binding, signature verification, session
removal/restoration, and editor compatibility with HttpOnly were independently
checked. The browser authenticated a protected wiki update, an independent Git
readback checked the new page content and synthetic author, and the anonymous
update redirected to login without a change. Scope is limited to the exercised
editor and update. One Edge repeat passed outside the frozen cohort. The four
signed captures exclude cookie values and passed reload and tamper checks.
Preparation reproduced all 14 files byte for byte. Contextual cookie classes
still need suitable independent applications and scope-specific controls.

## Previous signed session-cookie matrix

`.local/ml-q-material-datasets-007` credits **110/630 examples**, an increase
of 63. **520 are still required.** Two signed captures from the initial
registration `08` are preserved in material registration `08`. Material
registration `09` adds all 60 matrix captures from prospective native
registration `09`, keeping the original eight training and four validation
roles. The final preparation contains 112 authenticated runs and 328
observations. Material preparation retains 151 rows, of which 39 need review,
and removes 177 repeated observations. The dataset digest is
`fa65cffba7dd45121d2fb43c03175eb15836ff5c06ec555d9c0a0dd106b90642`.

| Category | Retained rows | Train change / contextual | Validation change / contextual |
|---|---:|---:|---:|
| HDR-001 · HSTS | 3 | 0 / 0 | 1 / 1 |
| HDR-002 · Framing | 21 | 1 / 7 | 1 / 3 |
| HDR-003 · Script policy | 33 | 3 / 1 | 6 / 2 |
| CK-001 · Secure | 47 | 24 / 2 | 16 / 0 |
| CK-002 · HttpOnly | 42 | 24 / 2 | 16 / 0 |
| CK-003 · SameSite | 4 | 1 / 0 | 0 / 0 |
| NET-001 · Mixed resources | 1 | 0 / 0 | 1 / 0 |

The count towards 630 is capped at 30 per training class and 15 per validation
class. The two validation cookie change classes have 16 contexts apiece, but
each contributes at most 15 credits and still needs a third family. Their
training counterparts need six more contexts each. Each cookie contextual
class has two training contexts from HomeInventory and zero in validation.

The 12 profiles vary browser persistence, SameSite Lax/Strict and three
Secure/HttpOnly combinations. The proxy changes those four attributes on the
selected session cookie, retaining the application's issued session and scope.
Signed acquisition requires matching browser attributes, a native authenticated
operation, anonymous denial, storage readback, and seal reload and tamper
checks. The five families are BookWise, FieldPoint, Habit Tracker, Yoyo
Collection and Tabinator. The same execution retains the committed application
and uses fresh disposable data. The profiles supply only change cases for
Secure and HttpOnly. They make no determination about necessary cross-site
use, validated HTTPS, or the purpose of other cookies.

The first runner stalled during the handoff between Node versions. The repaired
runner attempted all 60 profiles and retained two first-attempt failures.
The BookWise startup and Habit Tracker source inspection both passed on retry.
All 60 signed reports exclude cookie values, and the scratch app copies were
removed. Preparation reproduced all 14 files byte for byte. Preflight still
reports 28 class or family deficits. Zero predictions or fits were run.

## Latest Yoyo Collection validation supplement

`.local/ml-q-material-datasets-006` credits **47/630 eligible examples**, with
583 cases still required. `.local/native-material-registration-07` adds five
Chromium captures from prospective registration `.local/native-dev-registration-07`.
The original 45 captures, twelve families, and eight/four split roles are preserved.
The resulting 50 runs contain 148 observations, 86 retained rows, 62 removed
repeats and 39 uncertain rows. The canonical dataset digest is
`f9a63202e9bcca88560b3391e7a3c4a69cecb9f50697cdae4b2e5bbf02852f4d`.

| Category | Retained rows | Train change / contextual | Validation change / contextual |
|---|---:|---:|---:|
| HDR-001 · HSTS | 3 | 0 / 0 | 1 / 1 |
| HDR-002 · Framing | 21 | 1 / 7 | 1 / 3 |
| HDR-003 · Script policy | 33 | 3 / 1 | 6 / 2 |
| CK-001 · Secure | 17 | 6 / 2 | 4 / 0 |
| CK-002 · HttpOnly | 7 | 3 / 2 | 2 / 0 |
| CK-003 · SameSite | 4 | 1 / 0 | 0 / 0 |
| NET-001 · Mixed resources | 1 | 0 / 0 | 1 / 0 |

Yoyo Collection’s native form submitted successful authenticated writes inside
same-origin and repeated foreign-origin frames. Each successful response had
an independent SQLite readback. The anonymous control was denied without a
mutation. This supplies one change-warranted framing example on the exercised
route. For script policy, four profiles checked the native editor, the
unapproved inline probe, and behavior with JavaScript disabled and restored.
The restrictive early meta profile preserved the pinned inline initializer
with its exact hash and blocked the unapproved probe. The permissive response,
permissive early meta and missing-policy profiles each yielded a change case.
Separate Edge runs passed for framing and restrictive early meta.

The supplement uses the same Yoyo family and split role. Script-policy
validation has two contributing families and the framing change class has one.
The data preparation reproduced byte for byte and rejected duplicate adoption
and forged readiness. The seed reload checks rejected altered scans and seals.
All seven categories still fail the training gate. No candidate fitting,
holdout predictions or category promotion occurred.

## Previous signed preference cohort

Previous preparation: `.local/ml-q-material-datasets-005`. Its source/capture
manifest is `.local/native-material-registration-06`, adopting 43 authenticated
earlier runs plus two new HomeInventory preference runs registered prospectively
under `.local/native-preference-registration-07`. HomeInventory takes Anonymous
Notepad's training slot because the latter's supported adapter lacks the native
context needed here. Source suitability, not model predictions, determines this
replacement. Eleven existing roles remain unchanged; validation retains
StockBase, Jingo, Tabinator and Yoyo Collection. Excluded captures, original
registrations and all earlier datasets remain available.

**45 runs, 12 families, 133 observations, 80 retained rows, 53 material repeats
removed and 38 uncertain rows. Candidate preflight credits 42/630 cases.**
Eleven numeric inputs overlap train/validation and remain audited. The minimum
example deficit is 588; every category also has class/family coverage deficits.

| Category | Retained rows | Train change / contextual | Validation change / contextual |
|---|---:|---:|---:|
| HDR-001 · HSTS | 3 | 0 / 0 | 1 / 1 |
| HDR-002 · Framing | 20 | 1 / 7 | 0 / 3 |
| HDR-003 · Script policy | 29 | 3 / 1 | 3 / 1 |
| CK-001 · Secure | 16 | 6 / 2 | 4 / 0 |
| CK-002 · HttpOnly | 7 | 3 / 2 | 2 / 0 |
| CK-003 · SameSite | 4 | 1 / 0 | 0 / 0 |
| NET-001 · Mixed resources | 1 | 0 / 0 | 1 / 0 |

The row counts come from the saved category arrays; the eligible columns
are independently recomputed by `candidate-readiness.json`. The dataset digest
is `8bc15264918e0188abd64977ea3ff5f61e1b827cc867ca60291aa35fd2ccaadd`.

The first contextual Secure and HttpOnly cases use actual native localization,
not cookie-name labels. Both browsers passed seven controls including signed
authentication/owner readback, preference changes, removed/restricted/restored
cookie states, competing local storage and authentication removal. Native Lax
and Strict attributes produce two target variants per category in one family.
An additional Chromium repetition passed after freezing and is excluded from
the manifest. No repeated browser run becomes an independent family.

The cookie Secure warning retains high severity and remains visible for review.
The purpose labels do not prove site-wide safety or enable an unqualified model.
Other cookies/categories without sufficient context remain uncertain. Old
v1-v8 policies and released JS-002 behavior are unchanged.

The shared collector now has optional bounded native readiness before snapshot
capture. Actual browser checks cover settled metadata and fail-closed cleanup.
The existing default collection acceptance also passed. The final 133
TypeScript tests across twelve files, 72 Python tests, type checking and
production builds passed. Actual copied-data checks preserved archived counts,
verified all eleven retained roles and rejected a forged readiness flag.
Full validation and the rejected
acquisition attempts are recorded in PLAN.md. Native source selection and exact
scope are in [the preference protocol](ML_NATIVE_PREFERENCE_PLAN.md).

**Remaining:** 588 additional eligible development cases with the required
contributing families, candidate fitting, untouched fresh-family qualification,
material-protocol evaluation and qualified runtime/report acceptance. The two
new cookie classes still have only one contributing training family and no
contextual validation family. Zero remaining categories are training-ready or
qualified. The 42-case count is not a percentage of ML-Q implementation.

Earlier recounts follow as historical measurements.

## Approved material-context recount

The user approved the [counting correction](ML_COUNTING_CORRECTION_PROPOSAL.md).
Registration `.local/native-material-registration-02` adopts the original 45
authenticated development captures under a frozen category-specific projection.
The source identities, original labels and eight/four assignments stay fixed.
The adoption authenticates every capture and recomputes its numeric context from
the original signed scan evidence. It does not manufacture new application runs.

The latest output is `.local/ml-q-material-datasets-002`. Its independent
candidate preflight credits **38 eligible cases**, compared with 18 under the
archived strict protocol. There are **78 retained rows, 40 uncertain rows and 51
removed material repeats** from 129 observations. Eleven numeric variants appear
in both partitions and are explicitly audited. No supported material-label
conflict was found in this corpus. Equal numeric vectors across independently
verified source families are now permitted. Repeated material variants within
one family are still one case.

| Category | Retained rows | Train change / contextual | Validation change / contextual |
|---|---:|---:|---:|
| HDR-001 · HSTS | 3 | 0 / 0 | 1 / 1 |
| HDR-002 · Framing | 22 | 1 / 7 | 0 / 3 |
| HDR-003 · Script policy | 30 | 3 / 1 | 3 / 1 |
| CK-001 · Secure | 13 | 6 / 0 | 4 / 0 |
| CK-002 · HttpOnly | 5 | 3 / 0 | 2 / 0 |
| CK-003 · SameSite | 4 | 1 / 0 | 0 / 0 |
| NET-001 · Mixed resources | 1 | 0 / 0 | 1 / 0 |

All 28 class/partition cells still fail their count and/or contributing-family
requirement. The minimum deficit is **592 cases**. The actual per-cell family
counts are in `candidate-readiness.json`; 38/630 is a dataset count, not a
percentage of ML-Q implementation or qualification. The dataset digest is
`807af175bdd76c8e196fd7b766cb421d6774c91d238ea0d274836f8987e1409b`.
Registration `01` and prepared output `001` preserve the initial implementation
before family-weighted calibration was finalized. Output `002` is current.

The correction does not make the existing collectors capable of producing all
630 cases. More supported native contexts and, where needed, richer relevant
evidence are still required. Preference-cookie controls now have a separate
executed prototype, but no signed training seed. Necessary protected cross-site
flows and working pre-transfer resource upgrades remain missing contextual
mechanisms. New captures require prospective registration, fitting requires
readiness, and qualification requires genuinely fresh families. The strict
holdout tooling has not been converted to this material protocol and rejects
its new envelope. Family-clustered evaluation, conflict abstention in the model
decision path and qualified runtime/report integration remain open.

Validation passed 72 relevant TypeScript tests across seven files, including
the 13 focused counting/dataset tests, all 72 Python ML tests, type checking
and the production build. Actual copied-data checks rejected changed
labels, readiness, policy and registration, and refused candidate creation.
Concurrent preflights preserved both archived and current results after removing
shared temporary-feature-file races. These checks make no predictions and do
not establish category accuracy.

The sections below retain the **historical strict-protocol** measurements.

## What was built

The current prospective registration is in `.local/native-dev-registration-05`. Its 12 upstream identities, pinned revisions, MIT licence hashes, inspected source hashes, adapter and oracle identities, and train/validation assignments were fixed before the 45 accepted runs. Assignment uses a deterministic hash of each canonical upstream identity. The private historical registry includes the 11 earlier dataset entries and every family/input in the unfiltered, previously consumed JS-002 holdout. Registration checks that inventory against its published evaluation hashes. The earlier exploratory batches and the two Edge compatibility runs are excluded from this preparation. These familiar development applications remain ineligible as fresh qualification families.

Training families are Wikiflow, Anonymous Notepad, 8star Links, Portal, BookWise, Habit Tracker, FieldPoint and Personal Knowledge Manager. Validation families are StockBase, Jingo, Tabinator and Yoyo Collection.

The collector binds the prospective registration to each authenticated acquisition receipt. Preparation checks the original report, signed evidence, finding, oracle, source, collection time and family. It recomputes the tensor from the underlying signed evidence. The per-run public key is accepted only after the installation's authenticated acquisition receipt has bound the exact seal. Prepared files retain immutable output directories. The candidate preflight verifies an additional installation receipt over the combined dataset, assignments, audit and collection manifest.

## Measured results

Open `.local/ml-q-seven-datasets-004`. Each category JSON contains separate training and validation arrays, the feature contract, collection registration and numeric readiness audit. `candidate-readiness.json` contains the stricter material-context and family counts used by the candidate. All examples are development data. The directory is deliberately excluded from Git.

**45 accepted application runs produced 129 observations and 107 retained rows.** Preparation removed 22 repeats. The audit flagged 17 cross-partition variants and 38 uncertain or conflicting variants. Candidate preflight credits 18 cases, up from 17 in the preceding preparation.

| Dataset | Retained rows | Train change / contextual | Validation change / contextual |
|---|---:|---:|---:|
| HDR-001 · HSTS | 3 | 0 / 0 | 1 / 1 |
| HDR-002 · Framing | 33 | 1 / 3 | 0 / 0 |
| HDR-003 · Script policy | 40 | 3 / 1 | 3 / 1 |
| CK-001 · Secure | 21 | 1 / 0 | 0 / 0 |
| CK-002 · HttpOnly | 5 | 1 / 0 | 0 / 0 |
| CK-003 · SameSite | 4 | 1 / 0 | 0 / 0 |
| NET-001 · Mixed resources | 1 | 0 / 0 | 1 / 0 |

Class columns count independently supported, distinct native cases after uncertainty, overlap and repeat filtering. The candidate selects one representative per native cause and per numeric input within each partition. Every category requires at least 30 cases per class for training, 15 per class for validation, and at least three families per class per partition. The combined dataset SHA-256 is `729f829324837cbe6d58d445f6d2a447eedd1b641329b7d2e9a14e55a0f362ea`.

## New empirical evidence

- **Authenticated framing.** A BookWise category was created through the real form inside one same-origin frame and two fresh foreign-origin frames. Each 201 response was followed by an independent SQLite check for exactly one row owned by the authenticated synthetic user. Native signature and anonymous-denial checks ran first. The profile passed in Chromium and Edge. The browser regression additionally rejected escaped post-action traffic and copied or modified receipts. The registered Chromium run supplied one eligible HDR-002 change-warranted case.

- **Permissive inline execution.** An enforcing response header and an early meta policy each permitted an unapproved script on both native editors. Functionality passed with scripts enabled, failed when disabled and recovered after restoration. Both applications passed independent storage readback. All four new inputs earned credit. Two additional BookWise Edge runs supplied compatibility evidence.

- **BookWise script policy.** On the native `/categories` page, the authenticated account created a category, the SQLite check matched its owner and contents, and an anonymous create attempt left storage unchanged. Each fresh browser context clicked the real edit button. The dialog opened with the matching row ID and name with scripts enabled, stayed closed with scripts disabled, and opened again after restoration. An independent unapproved inline-script probe ran under the missing policy and was blocked under the early restrictive meta policy. The latter permits same-origin scripts and the two reviewed inline blocks for this route. Both profiles omit the remote font. The labels apply to the category-editor operation. The pinned source and synthetic data stay local. Only registered repeats count in dataset totals.

- **HSTS.** Jingo served a disabled directive and a valid positive directive with a leading zero. The latter still triggered the original heuristic. Strict Chromium HTTPS, the observed response header, signed same-run evidence and a successful Git-backed editor operation differentiated the two cases. The third HTTPS response omitted the header and remained uncertain. The conclusions cover the response directive.
- **Mixed resources.** A disposable configuration served Jingo's real CodeMirror script over HTTP from the pinned native server. The operator typed in the editor, withheld that single script, and restored it. The browser observed a direct wire transfer, a functional failure while withheld, and recovery after restoration. The editor also saved the expected content to its disposable Git repository. This establishes a direct dependency in this scenario. A comparable functioning pre-transfer HTTPS upgrade remains outstanding.
- **SameSite.** For the controlled BookWise session configuration, a real form on a distinct loopback site submitted a native category write twice. Both returned 201 with independently verified owner-specific SQLite rows. The anonymous control redirected and left its expected row absent. The record supports reviewing protection of that operation. Whole-application cross-site necessity and route coverage remain unknown. Three other applications yielded explicit uncertainty.
- **Framing, CSP, Secure and HttpOnly.** Fresh registered runs exercised the prior ancestor, editor and session controls. Equivalent inputs present in opposite partitions, incomplete facts and nuisance changes are excluded from candidate counts even when the original browser interaction passed.

## Limits and next collection

The current preflight reported 28 class/partition deficits and zero test predictions. All 45 registered application runs completed. A BookWise login acquisition failed once and passed on retry. The two new BookWise cases also passed in Edge. The 59 focused TypeScript tests, type check and production build passed.

**Why repeats alone cannot close HDR-003.** Each independently measured cause earns at most one credit per family. The current three change mechanisms and one contextual mechanism can supply at most 24 change and eight contextual training examples across eight training families. Validation has four families. Additional independently evidenced mechanisms and functional tests are needed in both partitions. Report-only controls require a distinguishable input before receiving separate credit.

1. Cover the missing class in each partition with materially different native operations. In particular, Secure and HttpOnly need verified non-sensitive preference flows. A text screen of the twelve pinned sources did not identify a direct client cookie preference operation in the inspected application files. Dynamic and library-managed uses still need functional investigation. Cookie names and repeated header configurations cannot supply these labels.
2. Collect interactive framing changes, legitimate cross-site flows with tested protection, and working resource upgrades with request-chain and functionality controls. Record unknowns separately.
3. Keep this split and its inputs frozen. If additional applications or modified producers are necessary, register a new experiment before collection. Preserve the old result; do not move validation applications into training to fill an empty cell.
4. Fit and calibrate only after the candidate preflight passes. Qualification then requires fresh families and the existing measured safety gates. No candidate was fitted or holdout consumed in this acquisition.

## Test environment and reproducibility

The Windows certificate import/strict browser attempts failed. Removal of the exact leaf was checked. Native HTTPS acquisition succeeded in Ubuntu under WSL with Chromium 156, Node 24, and a temporary NSS database trusting the exact localhost leaf as a peer. No certificate-error bypass or issuing CA was used. A native-filesystem copy of Jingo's verified source and pinned dependencies avoided slow template startup on the mounted Windows checkout. The temporary browser homes and app copies were removed. The separate Windows app profiles used their established locked dependencies and Node versions. Chromium's guidance documents the Linux peer-trust setting. [Chromium certificate management](https://chromium.googlesource.com/chromium/src/+/7cab636ebce4a3d375cf7df2dddb59ce6035f474/docs/linux/cert_management.md)

See [RUN_COMMANDS.md](../RUN_COMMANDS.md) for registration, collection, preparation and readiness checks. Policies through version 8 are opt-in for these developer acquisitions. The default extension, evidence-based runtime, JS-002 release and historical reports keep their recorded policies.

The [capacity audit](ML_DATA_ACQUISITION_CAPACITY.md) quantifies the implemented mechanisms and the native evidence still required before a complete collection.
