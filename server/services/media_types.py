import mimetypes


def register_media_types() -> None:
    """Make StaticFiles label .webp as an image on every Python/OS build.

    StaticFiles picks Content-Type from the host's mimetypes table, and the
    slim Python 3.11 image does not map .webp, so it answered
    application/octet-stream. A cross-origin <img> of that response with
    nosniff is blocked by the browser.
    """
    mimetypes.add_type("image/webp", ".webp")
