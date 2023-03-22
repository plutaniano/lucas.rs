---
pubDatetime: 2023-03-02T03:41:00Z
title: Unwrapping Oracle's PLSQL Wrapped Objects
featured: false
tags:
  - oracle
  - plsql
description: How Oracle's wrapping works and how to reverse it.
---

Oracle databases provide a functionality called "PL/SQL Source Text Wrapping", available both as an executable called `wrap` and as a stored procedure under the name `DBMS_DDL.WRAP`. This functionality takes the source code of an object (a function, procedure, trigger...) and returns an obfuscated version of that object.

Wrapped objects behave exactly like a regular object, but their source code won't be readable.

## Example

Here's the source code for a very simple PL/SQL function:

```sql
CREATE OR REPLACE FUNCTION teste RETURN  NUMBER IS
BEGIN
RETURN 1;
END teste;
```

After you feed it to `wrap` you get:

```sql
CREATE OR REPLACE  FUNCTION teste wrapped 
a000000
1
abcd
abcd
abcd
abcd
abcd
abcd
abcd
abcd
abcd
abcd
abcd
abcd
abcd
abcd
abcd
8
3d 71
m9n4KQ8rT+C9b7lU4HcO3pDzsUMwg8eZgcfLCNL+XhahYtGhXOfAsr2ym16lmYEywLIJpXSL
wMAy/tKGCamhBKPHvpK+FkZTOQdTo4KmpqsCL3g=
```

There are a few sections in this wrapped code, let's break it down and talk about it:

### The signature
```sql
CREATE OR REPLACE  FUNCTION teste wrapped 
```

In the first line, as usual, there's the signature of the object. Probably not obfuscated to facilitate interacting with it. This signature is not used after the object is unwrapped, since the signature is also included in the obfuscated data. It always has a `WRAPPED` keyword appended to it.

### `a000000` padding/separator
After the signature, comes `a000000`. This line is included in every wrapped object I've seen. It's likely padding or a separator of some sort, we can ignore it.

### Database version
In the wrapped objects I managed to get from a database that I have, the line after `a000000` is always `1`, but from what I've researched it's some kind of code for the database version.

### A bunch of `abcd`s
Next, 15 lines of `abcd`. From what I've researched, these lines don't have any meaning. It's likely some kind of padding/separator, also.

### Object type
In the line after all the `abcd`s, there's a code for the type of object that's wrapped. `7` means procedure, `8` means function, `b` means package body. Certainly there are other codes, but I haven't tested them all.

### Content length
In the line `3d 71` there are two hex encoded numbers separated by a space. The first one, `0x3d`, tells us that the length of the unwrapped text (without the `CREATE` keyword) is 60 bytes long. You have to subtract 1 from it.
The other number, `0x71`, represents the length of the wrapped text.

### The good part

Now, here's the part that matters.
```
m9n4KQ8rT+C9b7lU4HcO3pDzsUMwg8eZgcfLCNL+XhahYtGhXOfAsr2ym16lmYEywLIJpXSL
wMAy/tKGCamhBKPHvpK+FkZTOQdTo4KmpqsCL3g=
```

To read this part you first need to strip all the new lines (\n) from it, then use base64 to decode it, resulting in the following bytes:

```
\x9b\xd9\xf8)\x0f+O\xe0\xbdo\xb9T\xe0w\x0e\xde\x90\xf3\xb1C0\x83\xc7\x99\x81\xc7\xcb\x08\xd2\xfe^\x16\xa1b\xd1\xa1\\\xe7\xc0\xb2\xbd\xb2\x9b^\xa5\x99\x812\xc0\xb2\t\xa5t\x8b\xc0\xc02\xfe\xd2\x86\t\xa9\xa1\x04\xa3\xc7\xbe\x92\xbe\x16FS9\x07S\xa3\x82\xa6\xa6\xab\x02/x
```

Now strip the first 20 bytes. They're some kind of checksum, we don't need them.

```
0\x83\xc7\x99\x81\xc7\xcb\x08\xd2\xfe^\x16\xa1b\xd1\xa1\\\xe7\xc0\xb2\xbd\xb2\x9b^\xa5\x99\x812\xc0\xb2\t\xa5t\x8b\xc0\xc02\xfe\xd2\x86\t\xa9\xa1\x04\xa3\xc7\xbe\x92\xbe\x16FS9\x07S\xa3\x82\xa6\xa6\xab\x02/x
```

After that you'll need to use a substitution table to map these bytes to the ones in the table (table available further down), resulting in the following bytes:

```
x\xdas\x0b\xf5s\x0e\xf1\xf4\xf7S(I-.IU\x08r\r\t\r\xf2S\xf0\x0b\xf5ur\rR\xf0\x0c\xe6rru\xf7\xf4\xe3R\x80I\x18Zs\xb9\xfa\xb9(\x84\xb8\x06\x87\xb8Z3\x00\x00\x1a\x85\x107
```

Now use a zlib library to decompress this data, resulting in the source code with a trailling NULL byte:

```
FUNCTION teste RETURN NUMBER IS\nBEGIN\n  RETURN 1;\nEND TESTE;\x00
```

## Python code

Here's some python code to reproduce these steps:

```python
import zlib
import base64

CHARMAP = (
    0x3d, 0x65, 0x85, 0xb3, 0x18, 0xdb, 0xe2, 0x87,
    0xf1, 0x52, 0xab, 0x63, 0x4b, 0xb5, 0xa0, 0x5f,
    0x7d, 0x68, 0x7b, 0x9b, 0x24, 0xc2, 0x28, 0x67,
    0x8a, 0xde, 0xa4, 0x26, 0x1e, 0x03, 0xeb, 0x17,
    0x6f, 0x34, 0x3e, 0x7a, 0x3f, 0xd2, 0xa9, 0x6a,
    0x0f, 0xe9, 0x35, 0x56, 0x1f, 0xb1, 0x4d, 0x10,
    0x78, 0xd9, 0x75, 0xf6, 0xbc, 0x41, 0x04, 0x81,
    0x61, 0x06, 0xf9, 0xad, 0xd6, 0xd5, 0x29, 0x7e,
    0x86, 0x9e, 0x79, 0xe5, 0x05, 0xba, 0x84, 0xcc,
    0x6e, 0x27, 0x8e, 0xb0, 0x5d, 0xa8, 0xf3, 0x9f,
    0xd0, 0xa2, 0x71, 0xb8, 0x58, 0xdd, 0x2c, 0x38,
    0x99, 0x4c, 0x48, 0x07, 0x55, 0xe4, 0x53, 0x8c,
    0x46, 0xb6, 0x2d, 0xa5, 0xaf, 0x32, 0x22, 0x40,
    0xdc, 0x50, 0xc3, 0xa1, 0x25, 0x8b, 0x9c, 0x16,
    0x60, 0x5c, 0xcf, 0xfd, 0x0c, 0x98, 0x1c, 0xd4,
    0x37, 0x6d, 0x3c, 0x3a, 0x30, 0xe8, 0x6c, 0x31,
    0x47, 0xf5, 0x33, 0xda, 0x43, 0xc8, 0xe3, 0x5e,
    0x19, 0x94, 0xec, 0xe6, 0xa3, 0x95, 0x14, 0xe0,
    0x9d, 0x64, 0xfa, 0x59, 0x15, 0xc5, 0x2f, 0xca,
    0xbb, 0x0b, 0xdf, 0xf2, 0x97, 0xbf, 0x0a, 0x76,
    0xb4, 0x49, 0x44, 0x5a, 0x1d, 0xf0, 0x00, 0x96,
    0x21, 0x80, 0x7f, 0x1a, 0x82, 0x39, 0x4f, 0xc1,
    0xa7, 0xd7, 0x0d, 0xd1, 0xd8, 0xff, 0x13, 0x93,
    0x70, 0xee, 0x5b, 0xef, 0xbe, 0x09, 0xb9, 0x77,
    0x72, 0xe7, 0xb2, 0x54, 0xb7, 0x2a, 0xc7, 0x73,
    0x90, 0x66, 0x20, 0x0e, 0x51, 0xed, 0xf8, 0x7c,
    0x8f, 0x2e, 0xf4, 0x12, 0xc6, 0x2b, 0x83, 0xcd,
    0xac, 0xcb, 0x3b, 0xc4, 0x4e, 0xc0, 0x69, 0x36,
    0x62, 0x02, 0xae, 0x88, 0xfc, 0xaa, 0x42, 0x08,
    0xa6, 0x45, 0x57, 0xd3, 0x9a, 0xbd, 0xe1, 0x23,
    0x8d, 0x92, 0x4a, 0x11, 0x89, 0x74, 0x6b, 0x91,
    0xfb, 0xfe, 0xc9, 0x01, 0xea, 0x1b, 0xf7, 0xce,
)

def unwrap(content: str) -> str:
    b64str = content.replace("\n", "")
    unmapped_bytes = base64.b64decode(b64str)[20:]  # strip SHA1 hash
    mapped_bytes = bytearray(CHARMAP[i] for i in unmapped_bytes)
    unwrapped = zlib.decompress(mapped_bytes)[:-1]  # strip trailing NULL byte
    return unwrapped.decode()
```


## Security notes

Oracle's wrap functionality should **NOT** be used as a security measure. It's **NOT** encryption, even if it looks like it is.
I'm not sure why this functionality even exists, all it does is mislead people into thinking they're encrypting their code.

I've seen more than one article claiming that this functionality is a security functionality. It isn't.
