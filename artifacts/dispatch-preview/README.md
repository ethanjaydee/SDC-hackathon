# Dispatch Hub preview registration

This package restores the managed preview entry for the existing pulled application.
The running frontend source remains in `../dispatch-hub`; this is not a second copy of
the product. Both package scripts and the validated artifact service definitions
delegate to `@workspace/dispatch-hub`. The API and SQLite data remain in `../api-server`.

The original frontend's malformed artifact manifest could not be repaired by the
validated replacement callback, which rejected its duplicate keys before reading a
corrected candidate. This new managed registration avoids editing that manifest
directly and preserves the original application and data.
