---
'e2e': patch
---

`toHaveScreenshot` refuses a name Windows reserves: `CON`, `PRN`, `AUX`, `NUL`, `COM1`-`COM9`, and `LPT1`-`LPT9`, in any case and with or without a suffix, since `NUL.png` is the null device too. The check runs before the screen is read, so the step fails with `INVALID_ARGUMENT` and the name, instead of writing the image to a device and then comparing against a file that never existed. Names on other platforms are unaffected, and the comment on the character rule no longer claims to cover what it does not.