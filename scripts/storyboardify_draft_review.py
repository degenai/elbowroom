from __future__ import annotations

import re
from pathlib import Path
from bs4 import BeautifulSoup

HTML_PATH = Path('draft-review.html')


def clean_text(text: str) -> str:
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'`([^`]+)`', r'\1', text)
    text = ' '.join(text.split())
    return text


def split_slide(text: str, fallback_index: int) -> tuple[str, str]:
    text = clean_text(text)
    match = re.match(r'(?i)^(slide|image|panel|card|frame)\s*(\d+)?\s*[:\-]\s*(.+)$', text)
    if match:
        kind = match.group(1).title()
        num = match.group(2) or str(fallback_index)
        return f'{kind} {num}', match.group(3).strip()
    match = re.match(r'(?i)^([A-Z][^:]{2,34}):\s*(.+)$', text)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return f'Slide {fallback_index}', text


def truncate(text: str, limit: int = 210) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip(' ,.;:') + '…'


def find_details(article, summary_label: str):
    for details in article.find_all('details', recursive=False):
        summary = details.find('summary')
        if summary and summary.get_text(' ', strip=True).lower().startswith(summary_label.lower()):
            return details
    return None


def visual_items(visual_details) -> tuple[str, list[tuple[str, str]]]:
    if not visual_details:
        return 'Storyboard mock-up', [('Slide 1', 'Storyboard direction TBD.')]

    body = visual_details.find(class_='draft-detail-body')
    if not body:
        return 'Storyboard mock-up', [('Slide 1', 'Storyboard direction TBD.')]

    intro_parts = []
    for p in body.find_all('p', recursive=False):
        txt = clean_text(p.get_text(' ', strip=True))
        if txt:
            intro_parts.append(txt)
    intro = intro_parts[0] if intro_parts else 'Storyboard mock-up'

    lis = body.find_all('li')
    panels = []
    if lis:
        for idx, li in enumerate(lis, 1):
            title, desc = split_slide(li.get_text(' ', strip=True), idx)
            panels.append((title, truncate(desc)))
    else:
        raw = clean_text(body.get_text(' ', strip=True))
        raw = raw.replace(intro, '').strip() if intro and raw.startswith(intro) else raw
        if raw:
            panels.append(('Visual direction', truncate(raw)))
        else:
            panels.append(('Storyboard TBD', 'No slide breakdown yet. Review should decide the visual sequence before final art.'))
    return truncate(intro, 120), panels


def make_tag(soup, name: str, text: str | None = None, **attrs):
    tag = soup.new_tag(name, **attrs)
    if text is not None:
        tag.string = text
    return tag


def build_storyboard(soup, article, title: str, intro: str, panels: list[tuple[str, str]]):
    slide_count = len(panels)
    board = soup.new_tag(
        'div',
        attrs={
            'class': 'draft-storyboard',
            'role': 'group',
            'aria-label': f'Storyboard mock-up for {title}: {slide_count} panel' + ('' if slide_count == 1 else 's'),
        },
    )

    head = soup.new_tag('div', attrs={'class': 'storyboard-head'})
    head.append(make_tag(soup, 'span', 'Image mock-up'))
    count_label = 'single image' if slide_count == 1 else f'{slide_count}-slide storyboard'
    head.append(make_tag(soup, 'span', count_label))
    board.append(head)

    if intro:
        board.append(make_tag(soup, 'p', intro, **{'class': 'storyboard-intro'}))

    strip = soup.new_tag('div', attrs={'class': 'storyboard-strip', 'data-slides': str(slide_count)})
    for idx, (panel_title, desc) in enumerate(panels, 1):
        panel = soup.new_tag('div', attrs={'class': 'storyboard-panel', 'aria-label': f'Panel {idx} of {slide_count}'})
        frame = soup.new_tag('div', attrs={'class': 'storyboard-frame'})
        frame.append(make_tag(soup, 'span', str(idx), **{'class': 'storyboard-number'}))
        frame.append(make_tag(soup, 'span', panel_title, **{'class': 'storyboard-panel-title'}))
        frame.append(make_tag(soup, 'p', desc, **{'class': 'storyboard-panel-copy'}))
        frame.append(make_tag(soup, 'span', 'wireframe only', **{'class': 'storyboard-wire-tag'}))
        panel.append(frame)
        strip.append(panel)
    board.append(strip)
    return board


def main() -> None:
    soup = BeautifulSoup(HTML_PATH.read_text(encoding='utf-8'), 'html.parser')
    changed = 0
    for article in soup.select('article.draft-card'):
        title_tag = article.select_one('.draft-card-head h2')
        title = title_tag.get_text(' ', strip=True) if title_tag else article.get('id', 'draft card')
        concept = article.select_one('.draft-concept')
        if concept:
            concept.decompose()

        hook = article.select_one('.draft-hook')
        visual_details = find_details(article, 'Visual plan')
        caption_details = find_details(article, 'Caption draft')

        intro, panels = visual_items(visual_details)
        board = build_storyboard(soup, article, title, intro, panels)
        existing = article.select_one('.draft-storyboard')
        if existing:
            existing.replace_with(board)
        elif hook:
            hook.insert_after(board)
        else:
            meta = article.select_one('.draft-meta-row')
            if meta:
                meta.insert_after(board)
            else:
                article.insert(0, board)

        if caption_details:
            caption_details['class'] = list(set((caption_details.get('class') or []) + ['draft-caption-detail']))
            summary = caption_details.find('summary')
            if summary:
                summary.string = 'Caption draft (after images)'
            # Ensure caption is right after storyboard
            caption_details.extract()
            board.insert_after(caption_details)

        if visual_details:
            visual_details['class'] = list(set((visual_details.get('class') or []) + ['draft-design-spec']))
            summary = visual_details.find('summary')
            if summary:
                summary.string = 'Design spec / original visual plan'
            # Place design spec after caption if present, otherwise after board
            visual_details.extract()
            anchor = caption_details if caption_details else board
            anchor.insert_after(visual_details)

        changed += 1

    HTML_PATH.write_text(str(soup), encoding='utf-8')
    print(f'storyboardified {changed} cards')


if __name__ == '__main__':
    main()
