"""Email the site owner when a visitor submits something that needs approval.

The database row is the source of truth; delivery is best effort and runs after
the response, so a mail outage can never lose or reject a submission.  Uses the
same SMTP_* settings and recipient as the public feedback email.
"""

from __future__ import annotations

from datetime import datetime, timezone
from email.message import EmailMessage
import logging
import os
import smtplib
import ssl
from typing import Any, Mapping

from services.public_feedback_email import _configured_recipients, _env_bool


logger = logging.getLogger(__name__)

DEFAULT_REVIEW_URL = "https://studio-open-scripts.shawnup.com/superadmin"
MAX_FIELD_CHARS = 300

APPROVAL_KINDS = {
    "demo": "Demo 投稿",
    "audio_work": "音聲作品投稿",
    "external_author_profile": "外部作者資料補充",
    "voice_actor_profile": "聲演資料補充",
    "author_profile": "作者資料補充",
    "voice_actor_claim": "聲演身份認領",
    "resource_profile": "製作資源資料補充",
    "new_resource": "新增製作資源",
}


def _clean(value: Any) -> str:
    text = " ".join(str(value or "").split())
    return text[:MAX_FIELD_CHARS] + ("…" if len(text) > MAX_FIELD_CHARS else "")


def _safe_header(value: str) -> bool:
    return "\r" not in value and "\n" not in value


def build_approval_message(kind: str, fields: Mapping[str, Any], *, sender: str, recipients: list[str]) -> EmailMessage:
    label = APPROVAL_KINDS.get(kind, "待核可項目")
    message = EmailMessage()
    message["Subject"] = f"公開台本平台｜新的待核可：{label}"
    message["From"] = sender
    message["To"] = ", ".join(recipients)
    reply_to = str(fields.get("contactEmail") or "").strip()
    if reply_to and _safe_header(reply_to):
        message["Reply-To"] = reply_to

    review_url = os.getenv("ADMIN_REVIEW_URL", "").strip() or DEFAULT_REVIEW_URL
    lines = [f"類型：{label}"]
    for name, value in fields.items():
        if name == "id":
            continue
        cleaned = _clean(value)
        if cleaned:
            lines.append(f"{name}：{cleaned}")
    lines.extend([
        "",
        f"收到時間：{datetime.now(timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M:%S %Z')}",
        f"項目編號：{fields.get('id', '')}",
        f"前往審核：{review_url}",
    ])
    message.set_content("\n".join(lines))
    return message


def notify_approval_request(kind: str, fields: Mapping[str, Any]) -> None:
    """Send one notification; never raises."""

    try:
        host = os.getenv("SMTP_HOST", "").strip()
        recipients = _configured_recipients()
        if not host or not recipients:
            logger.warning("Approval email is not configured; %s %s waits in the admin inbox", kind, fields.get("id", ""))
            return
        try:
            port = int(os.getenv("SMTP_PORT", "587").strip())
        except ValueError:
            port = 587
        username = os.getenv("SMTP_USERNAME", "").strip()
        password = os.getenv("SMTP_PASSWORD", "")
        sender = os.getenv("SMTP_FROM", "").strip() or username or recipients[0]
        if not _safe_header(sender):
            logger.error("Approval email skipped because SMTP_FROM is invalid")
            return

        message = build_approval_message(kind, fields, sender=sender, recipients=recipients)
        use_ssl = _env_bool("SMTP_USE_SSL", False)
        use_tls = _env_bool("SMTP_USE_TLS", True) and not use_ssl
        context = ssl.create_default_context()
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
        logger.exception("Approval email failed for %s %s", kind, fields.get("id", ""))
