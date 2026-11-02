"""
DeepTrace Forensics - Website Multimodal Feature Extraction Pipeline
Extracts structured numerical feature vectors across 3 analytical pillars:
  1. Code & DOM Features (16 dims)
  2. Visual & Layout Consistency Features (12 dims)
  3. Website Fingerprint & Provenance Features (12 dims)
"""

import math
import re
from typing import Dict, Any, List, Tuple
import urllib.parse


def calculate_entropy(tokens: List[str]) -> float:
    """Computes Shannon entropy across a list of tokens."""
    if not tokens:
        return 0.0
    total = len(tokens)
    counts: Dict[str, int] = {}
    for tok in tokens:
        counts[tok] = counts.get(tok, 0) + 1
    entropy = 0.0
    for count in counts.values():
        p = count / total
        entropy -= p * math.log2(p)
    return round(entropy, 4)


def extract_code_features(html: str, headers: Dict[str, str], url: str) -> List[float]:
    """
    Extracts 16-dimensional Code & DOM structural features.
    """
    lower_html = html.lower()
    total_len = max(len(html), 1)

    # 1. Total Tag Count & DOM Depth estimation
    tags = re.findall(r'<([a-zA-Z0-9]+)\b', html)
    total_tags = len(tags)
    tag_count_norm = min(1.0, total_tags / 1500.0)

    # Nesting depth estimate via open/close tag stack
    depth = 0
    max_depth = 0
    void_tags = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
    for tag in tags[:500]:
        t_low = tag.lower()
        if t_low not in void_tags:
            depth += 1
            if depth > max_depth:
                max_depth = depth
    dom_depth_norm = min(1.0, max_depth / 25.0)

    # 2. Div vs Semantic Elements Ratio
    div_count = len(re.findall(r'<div\b', lower_html))
    semantic_count = len(re.findall(r'<(main|nav|header|footer|section|article|aside)\b', lower_html))
    div_to_semantic = min(1.0, div_count / max(1, semantic_count * 4))

    # 3. Inline style ratio
    inline_styles = len(re.findall(r'\bstyle=["\']', lower_html))
    inline_style_ratio = min(1.0, inline_styles / max(1, total_tags * 0.2))

    # 4. Class Token Entropy & Tailwind Density
    class_matches = re.findall(r'\bclass=["\']([^"\']+)["\']', html)
    class_tokens = []
    for cm in class_matches:
        class_tokens.extend(cm.split())
    class_entropy = min(1.0, calculate_entropy(class_tokens) / 8.0)

    # Tailwind tokens (e.g. flex, grid, p-4, m-2, text-sm, bg-white, space-y-, rounded-)
    tailwind_pattern = re.compile(r'^(flex|grid|p\d*|px-|py-|m\d*|mx-|my-|text-|bg-|space-|rounded|border|w-|h-|col-|row-|items-|justify-|shadow)', re.I)
    tailwind_matches = sum(1 for tok in class_tokens if tailwind_pattern.match(tok))
    tailwind_density = min(1.0, tailwind_matches / max(1, len(class_tokens)))

    # 5. Repetitive Block Subtree Ratio (identical classes on siblings)
    repeated_classes = len(class_tokens) - len(set(class_tokens))
    repetitive_ratio = min(1.0, repeated_classes / max(1, len(class_tokens)))

    # 6. Framework Markers
    is_react_next = 1.0 if ("__next_data__" in lower_html or "/_next/static" in lower_html or "data-reactroot" in lower_html) else 0.0
    is_vue_nuxt = 1.0 if ("__nuxt__" in lower_html or "data-v-" in lower_html or "vue.runtime" in lower_html) else 0.0

    # 7. Script and CSS Rule counts
    script_count = min(1.0, len(re.findall(r'<script\b', lower_html)) / 30.0)
    css_links = min(1.0, len(re.findall(r'<link\s+[^>]*rel=["\']stylesheet["\']', lower_html)) / 10.0)

    # 8. HTML Comment Density
    comment_count = len(re.findall(r'<!--[\s\S]*?-->', html))
    comment_density = min(1.0, comment_count / max(1, total_tags * 0.05))

    # 9. ID naming entropy
    ids = re.findall(r'\bid=["\']([^"\']+)["\']', html)
    id_entropy = min(1.0, calculate_entropy(ids) / 6.0)

    # 10. Text-to-HTML ratio
    clean_text = re.sub(r'<[^>]+>', ' ', html)
    text_ratio = min(1.0, len(clean_text.strip()) / total_len)

    # 11. SVG vs Image Ratio
    svg_count = len(re.findall(r'<svg\b', lower_html))
    img_count = len(re.findall(r'<img\b', lower_html))
    svg_ratio = min(1.0, svg_count / max(1, svg_count + img_count))

    # 12. Form inputs count
    form_inputs = min(1.0, len(re.findall(r'<(input|textarea|select|button)\b', lower_html)) / 25.0)

    return [
        dom_depth_norm,        # 0
        tag_count_norm,        # 1
        div_to_semantic,       # 2
        inline_style_ratio,    # 3
        class_entropy,         # 4
        tailwind_density,      # 5
        repetitive_ratio,      # 6
        is_react_next,         # 7
        is_vue_nuxt,           # 8
        script_count,          # 9
        css_links,             # 10
        comment_density,       # 11
        id_entropy,            # 12
        text_ratio,            # 13
        svg_ratio,             # 14
        form_inputs,           # 15
    ]


def extract_visual_features(html: str, headers: Dict[str, str], url: str) -> List[float]:
    """
    Extracts 12-dimensional Visual & Layout Consistency features.
    """
    lower_html = html.lower()

    # 1. Layout Grid & Flex Entropy
    grid_matches = len(re.findall(r'\b(grid|grid-cols-\d+|flex|flex-col|flex-row)\b', lower_html))
    layout_grid_ratio = min(1.0, grid_matches / 40.0)

    # 2. Spacing Rhythm Index (multiples of 4/8 in utility classes)
    spacing_matches = re.findall(r'\b[pm][xytb]?-(0|1|2|3|4|6|8|12|16|20|24|32)\b', lower_html)
    arbitrary_spacing = re.findall(r'\b[pm][xytb]?-\[\d+px\]\b', lower_html)
    total_spacing = len(spacing_matches) + len(arbitrary_spacing)
    spacing_rhythm = min(1.0, len(spacing_matches) / max(1, total_spacing)) if total_spacing > 0 else 0.5

    # 3. Font Family Count & Typography Pairing
    fonts = re.findall(r'font-family\s*:\s*([^;]+);', lower_html)
    font_count_norm = min(1.0, len(set(fonts)) / 4.0)

    # 4. Viewport meta tag presence & conformance
    has_viewport = 1.0 if 'name="viewport"' in lower_html else 0.0

    # 5. Visual Tag Density per 1KB HTML
    kb_size = max(1.0, len(html) / 1024.0)
    tag_count = len(re.findall(r'<[a-z0-9]+', lower_html))
    visual_density = min(1.0, (tag_count / kb_size) / 20.0)

    # 6. Color token count
    color_tokens = re.findall(r'\b(text|bg|border)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+\b', lower_html)
    color_count = min(1.0, len(set(color_tokens)) / 12.0)

    # 7. Button Consistency Score
    buttons = re.findall(r'<button\b[^>]*class=["\']([^"\']+)["\']', html)
    btn_classes = [b.strip() for b in buttons]
    btn_consistency = min(1.0, 1.0 - (len(set(btn_classes)) / max(1, len(btn_classes)))) if len(btn_classes) > 1 else 0.8

    # 8. Card component repetition
    cards = len(re.findall(r'\b(card|rounded-xl|rounded-2xl|shadow-sm|shadow-md)\b', lower_html))
    card_repetition = min(1.0, cards / 30.0)

    # 9. Hero Section Presence
    has_hero = 1.0 if any(k in lower_html for k in ["hero", "landing", "banner", "cta"]) else 0.0

    # 10. Footer complexity
    footer_match = re.search(r'<footer[\s\S]*?</footer>', lower_html)
    footer_complexity = min(1.0, len(footer_match.group(0)) / 2000.0) if footer_match else 0.0

    # 11. Typography Contrast (Headings vs Paragraphs)
    headings = len(re.findall(r'<h[1-3]\b', lower_html))
    paragraphs = len(re.findall(r'<p\b', lower_html))
    heading_p_ratio = min(1.0, headings / max(1, paragraphs * 2))

    # 12. Mobile Breakpoint Density (sm:, md:, lg:, xl:)
    responsive_tokens = len(re.findall(r'\b(sm:|md:|lg:|xl:|2xl:)', lower_html))
    responsive_density = min(1.0, responsive_tokens / 50.0)

    return [
        layout_grid_ratio,    # 0
        spacing_rhythm,       # 1
        font_count_norm,      # 2
        has_viewport,         # 3
        visual_density,       # 4
        color_count,          # 5
        btn_consistency,      # 6
        card_repetition,      # 7
        has_hero,             # 8
        footer_complexity,    # 9
        heading_p_ratio,      # 10
        responsive_density,   # 11
    ]


def extract_fingerprint_features(html: str, headers: Dict[str, str], url: str, metadata: Dict[str, Any] = None) -> List[float]:
    """
    Extracts 12-dimensional Fingerprint & Metadata features.
    """
    lower_html = html.lower()
    lower_url = url.lower()
    norm_headers = {k.lower(): v.lower() for k, v in headers.items()}

    # 1. Direct AI Website Builder Signature
    ai_builder_markers = [
        "lovable-tagger", "cdn.lovable.dev", "@lovable/", "lovable.app", "lovable.dev", "gptengineer",
        "bolt.new", "sb1-", "bolt-generated", "bolt.diy", "webcontainer",
        "v0.dev", "data-v0-t", "v0-generated", "v0.build",
        ".replit.dev", ".replit.app", "x-replit-user", "replit-badge",
        "framer-ai", "framer.ai"
    ]
    matches = sum(1 for m in ai_builder_markers if m in lower_html or m in lower_url or m in str(norm_headers))
    has_ai_sig = 1.0 if matches > 0 else 0.0
    ai_prior = min(1.0, matches / 3.0)

    # 2. Hosting / CDN Vendor Index
    server = norm_headers.get("server", "")
    is_vercel = 1.0 if "x-vercel-id" in norm_headers or "vercel" in server else 0.0
    is_cloudflare = 1.0 if "cf-ray" in norm_headers or "cloudflare" in server else 0.0
    is_netlify = 1.0 if "x-nf-request-id" in norm_headers or "netlify" in server else 0.0

    # 3. CMS Platform Indicators (WordPress, Shopify, Webflow)
    has_cms = 1.0 if any(c in lower_html for c in ["wp-content", "cdn.shopify.com", "data-wf-page", "squarespace"]) else 0.0

    # 4. Backend Header Exposure (PHP, Express, ASP.NET)
    has_backend_header = 1.0 if "x-powered-by" in norm_headers or "server" in norm_headers else 0.0

    # 5. Security Score Normalized
    is_https = 1.0 if lower_url.startswith("https://") else 0.0
    has_hsts = 1.0 if "strict-transport-security" in norm_headers else 0.0
    has_csp = 1.0 if "content-security-policy" in norm_headers else 0.0
    sec_score = (is_https * 0.4) + (has_hsts * 0.3) + (has_csp * 0.3)

    # 6. External Asset Domains count
    domains = set(re.findall(r'https?://([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/', html))
    ext_domains_norm = min(1.0, len(domains) / 10.0)

    # 7. Robots.txt and Sitemap indicators
    has_robots = 1.0 if (metadata and metadata.get("hasRobotsTxt")) else 0.5
    has_sitemap = 1.0 if (metadata and metadata.get("hasSitemapXml")) else 0.5

    # 8. Schema.org JSON-LD structured data count
    json_ld_matches = len(re.findall(r'<script\s+[^>]*type=["\']application\/ld\+json["\']', lower_html))
    json_ld_norm = min(1.0, json_ld_matches / 3.0)

    # 9. Known Human Portfolio Signals (CV, resume, GitHub personal repos, personal email)
    human_signals = [
        "curriculum vitae", "resume.pdf", "github.com/", "about me", "my projects",
        "get in touch", "mailto:", "personal website"
    ]
    human_match_count = sum(1 for h in human_signals if h in lower_html)
    human_signal_norm = min(1.0, human_match_count / 3.0)

    return [
        has_ai_sig,            # 0
        ai_prior,              # 1
        is_vercel,             # 2
        is_cloudflare,         # 3
        is_netlify,            # 4
        has_cms,               # 5
        has_backend_header,    # 6
        sec_score,             # 7
        ext_domains_norm,      # 8
        has_robots,            # 9
        json_ld_norm,          # 10
        human_signal_norm,     # 11
    ]
