import html
import json
import re

import models


def meta_escape(text) -> str:
    return html.escape(str(text or ""), quote=True)


def upsert_meta(html_text: str, *, name: str = None, prop: str = None, content: str = "") -> str:
    if not name and not prop:
        return html_text
    attr = "name" if name else "property"
    value = name if name else prop
    escaped_content = meta_escape(content)
    new_tag = f'<meta {attr}="{value}" content="{escaped_content}" />'
    pattern = rf'<meta\s+{attr}="{re.escape(value)}"\s+content="[^"]*"\s*/?>'
    if re.search(pattern, html_text, flags=re.IGNORECASE):
        return re.sub(pattern, new_tag, html_text, count=1, flags=re.IGNORECASE)
    return html_text.replace("</head>", f"  {new_tag}\n</head>")


def upsert_canonical(html_text: str, canonical_url: str) -> str:
    escaped_url = meta_escape(canonical_url)
    new_tag = f'<link rel="canonical" href="{escaped_url}" />'
    pattern = r'<link\s+rel="canonical"\s+href="[^"]*"\s*/?>'
    if re.search(pattern, html_text, flags=re.IGNORECASE):
        return re.sub(pattern, new_tag, html_text, count=1, flags=re.IGNORECASE)
    return html_text.replace("</head>", f"  {new_tag}\n</head>")


def inject_structured_data(html_text: str, payload: dict) -> str:
    if not payload:
        return html_text
    # Escape script-breaking characters to prevent JSON-LD payload from terminating script tag.
    json_payload = (
        json.dumps(payload, ensure_ascii=False)
        .replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
    )
    script_tag = f'<script type="application/ld+json">{json_payload}</script>'
    return html_text.replace("</head>", f"  {script_tag}\n</head>")


def inject_seo_html(
    html_text: str,
    *,
    title: str,
    description: str,
    canonical_url: str,
    og_type: str = "website",
    image_url: str = "",
    structured_data: dict = None,
) -> str:
    safe_title = meta_escape(title)

    if re.search(r"<title>.*?</title>", html_text, flags=re.IGNORECASE | re.DOTALL):
        html_text = re.sub(
            r"<title>.*?</title>",
            f"<title>{safe_title}</title>",
            html_text,
            count=1,
            flags=re.IGNORECASE | re.DOTALL,
        )
    else:
        html_text = html_text.replace("</head>", f"<title>{safe_title}</title>\n</head>")

    html_text = upsert_meta(html_text, name="description", content=description)
    html_text = upsert_meta(
        html_text,
        name="robots",
        content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
    )
    html_text = upsert_meta(html_text, prop="og:title", content=title)
    html_text = upsert_meta(html_text, prop="og:description", content=description)
    html_text = upsert_meta(html_text, prop="og:type", content=og_type)
    html_text = upsert_meta(html_text, prop="og:url", content=canonical_url)
    html_text = upsert_meta(html_text, prop="og:site_name", content="Screenplay Reader")
    html_text = upsert_meta(html_text, prop="og:locale", content="zh_TW")
    html_text = upsert_meta(
        html_text,
        name="twitter:card",
        content="summary_large_image" if image_url else "summary",
    )
    html_text = upsert_meta(html_text, name="twitter:title", content=title)
    html_text = upsert_meta(html_text, name="twitter:description", content=description)
    if image_url:
        html_text = upsert_meta(html_text, prop="og:image", content=image_url)
        html_text = upsert_meta(html_text, name="twitter:image", content=image_url)

    html_text = upsert_canonical(html_text, canonical_url)
    html_text = inject_structured_data(html_text, structured_data or {})
    return html_text


def ensure_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            return [value]
    return []


def inject_seo_for_route(full_path: str, db, html_template: str, public_base_url: str):
    if full_path.startswith("read/"):
        script_id = full_path.strip("/").split("/")[-1]
        script = db.query(models.Script).filter(models.Script.id == script_id).first()
        if script and script.isPublic == 1:
            canonical_url = f"{public_base_url}/read/{script_id}"
            title = f"{script.title or 'Untitled'}｜Screenplay Reader"
            desc = ((script.content or "").strip().replace("\n", " ")[:200] or "公開劇本閱讀頁")
            image_url = script.coverUrl or ""
            structured = {
                "@context": "https://schema.org",
                "@type": "CreativeWork",
                "name": script.title or "Untitled",
                "headline": script.title or "Untitled",
                "url": canonical_url,
                "inLanguage": "zh-Hant",
                "description": desc,
                "isAccessibleForFree": True,
            }
            if image_url:
                structured["image"] = image_url
            return inject_seo_html(
                html_template,
                title=title,
                description=desc,
                canonical_url=canonical_url,
                og_type="article",
                image_url=image_url,
                structured_data=structured,
            )

    if full_path.startswith("author/"):
        author_id = full_path.strip("/").split("/")[-1]
        persona = db.query(models.Persona).filter(models.Persona.id == author_id).first()
        user = db.query(models.User).filter(models.User.id == author_id).first() if not persona else None
        if persona or user:
            display_name = (persona.displayName if persona else user.displayName) or "作者"
            bio = (persona.bio if persona else user.bio) or f"{display_name} 的公開作品與個人資訊"
            avatar = (persona.avatar if persona else user.avatar) or ""
            banner = (persona.bannerUrl if persona else "") or ""
            website = (persona.website if persona else user.website) or ""
            links = ensure_list(persona.links) if persona else []
            same_as = [website] if website else []
            same_as.extend([x.get("url") for x in links if isinstance(x, dict) and x.get("url")])
            canonical_url = f"{public_base_url}/author/{author_id}"
            page_title = f"{display_name}｜Screenplay Reader"
            page_desc = str(bio).strip()[:200]
            image_url = avatar or banner
            structured = {
                "@context": "https://schema.org",
                "@type": "Person",
                "name": display_name,
                "url": canonical_url,
                "description": page_desc,
            }
            if image_url:
                structured["image"] = image_url
            if same_as:
                structured["sameAs"] = same_as
            return inject_seo_html(
                html_template,
                title=page_title,
                description=page_desc,
                canonical_url=canonical_url,
                og_type="profile",
                image_url=image_url,
                structured_data=structured,
            )

    if full_path.startswith("org/"):
        org_id = full_path.strip("/").split("/")[-1]
        org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
        if org:
            canonical_url = f"{public_base_url}/org/{org_id}"
            page_title = f"{(org.name or '組織')}｜Screenplay Reader"
            page_desc = str(org.description or f"{org.name or '組織'} 的公開作品與成員資訊").strip()[:200]
            image_url = org.logoUrl or org.bannerUrl or ""
            structured = {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": org.name or "Organization",
                "url": canonical_url,
                "description": page_desc,
            }
            if org.logoUrl:
                structured["logo"] = org.logoUrl
            if image_url:
                structured["image"] = image_url
            if org.website:
                structured["sameAs"] = [org.website]
            return inject_seo_html(
                html_template,
                title=page_title,
                description=page_desc,
                canonical_url=canonical_url,
                og_type="website",
                image_url=image_url,
                structured_data=structured,
            )

    if full_path.strip("/") == "about":
        canonical_url = f"{public_base_url}/about"
        page_title = "關於｜Screenplay Reader"
        page_desc = "這是一個面向公開閱讀與創作工作室的台本平台。使用者可以輕鬆瀏覽公開作品、建立專屬頁面並線上編輯劇本。"
        return inject_seo_html(
            html_template,
            title=page_title,
            description=page_desc,
            canonical_url=canonical_url,
            og_type="website",
        )

    return None
