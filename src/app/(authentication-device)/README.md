# Authentication device (dev/test only)

Lets auth-ui double as a **CIBA authentication device**: a compatible
authorization server (the typescript-oauth-server) pushes pending backchannel
sign-in requests here, and the user approves or denies them at `/requests`.  **delete this one folder** to remove the feature; core auth-ui is unaffected.
