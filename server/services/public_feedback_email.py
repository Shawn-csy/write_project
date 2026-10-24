"""Email notifications for messages submitted from the public site.

The database write remains the source of truth.  Email delivery is best effort
and deliberately happens after the request has been accepted, so a temporary
SMTP outage cannot make a visitor's report disappear.
"""

from __future__ import annotations

from datetime import datetime, timezone
from email.message import EmailMessage
import logging
import os
import smtplib
import ssl
from typing import Mapping


logger = logging.getLogger(__name__)
DEFAULT_FEEDBACK_NOTIFICATION_EMAIL = "silence0603@gmail.com"


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


def _configured_recipients() -> list[str]:
    raw = os.getenv("FEEDBACK_NOTIFICATION_EMAIL", "").strip() or DEFAULT_FEEDBACK_NOTIFICATION_EMAIL
    if not raw:
        # Keep the feature useful for existing deployments that already have
        # an admin email allow-list, while allowing a dedicated recipient.
        raw = os.getenv("ADMIN_USER_EMAILS", "")
    return [
        item.strip()
        for item in raw.split(",")
        if item.strip() and "\r" not in item and "\n" not in item
    ]


def send_public_feedback_notification(feedback: Mapping[str, str]) -> None:
    """Send one notification email, or log why delivery was skipped/failed."""

    host = os.getenv("SMTP_HOST", "").strip()
    recipients = _configured_recipients()
    if not host or not recipients:
        logger.warning(
            "Public feedback email is not configured; message %s remains in the admin inbox",
            feedback.get("id", ""),
        )
        return

    port_raw = os.getenv("SMTP_PORT", "587").strip()
    try:
        port = int(port_raw)
    except ValueError:
        port = 587

    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    sender = os.getenv("SMTP_FROM", "").strip() or username or recipients[0]
    if "\r" in sender or "\n" in sender:
        logger.error("Public feedback email skipped because SMTP_FROM is invalid")
        return

    kind = "Bug 回報" if feedback.get("kind") == "bug" else "上架申請"
    created_at = feedback.get("createdAt", "")
    try:
        created_label = datetime.fromtimestamp(
            int(created_at) / 1000,
            tz=timezone.utc,
        ).astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
    except (TypeError, ValueError, OSError):
        created_label = str(created_at)

    message = EmailMessage()
    message["Subject"] = f"公開台本平台｜新的{kind}"
    message["From"] = sender
    message["To"] = ", ".join(recipients)
    contact_email = str(feedback.get("contactEmail", "") or "").strip()
    if contact_email and "\r" not in contact_email and "\n" not in contact_email:
        message["Reply-To"] = contact_email
    message.set_content(
        "\n".join(
            [
                f"類型：{kind}",
                f"聯絡名稱：{feedback.get('contactName', '') or '未提供'}",
                f"聯絡 Email：{contact_email or '未提供'}",
                f"來源頁面：{feedback.get('pageUrl', '') or '未提供'}",
                f"提交時間：{created_label}",
                f"回報編號：{feedback.get('id', '')}",
                "",
                "內容：",
                str(feedback.get("content", "") or ""),
            ]
        )
    )

    use_ssl = _env_bool("SMTP_USE_SSL", False)
    use_tls = _env_bool("SMTP_USE_TLS", True) and not use_ssl
    context = ssl.create_default_context()

    try:
        if use_ssl:
            with smtplib.SMTP_SSL(host, port, timeout=10, context=context) as smtp:
                if username:
                    smtp.login(username, password)
                smtp.send_message(message)
        else:
            with smtplib.SMTP(host, port, timeout=10) as smtp:
                smtp.ehlo()
                if use_tls:
                    smtp.starttls(context=context)
                    smtp.ehlo()
                if username:
                    smtp.login(username, password)
                smtp.send_message(message)
    except Exception:
        logger.exception(
            "Unable to send public feedback email for message %s; it remains in the admin inbox",
            feedback.get("id", ""),
        )
        return

    logger.info("Public feedback email sent for message %s", feedback.get("id", ""))
