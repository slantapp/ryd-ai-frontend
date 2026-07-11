/**
 * Prepare HTML for an in-app preview iframe so external assets (e.g. images)
 * load reliably. Blob-URL iframes often fail CDN hotlink checks; srcDoc + a
 * no-referrer policy works much more consistently.
 */
export function prepareHtmlForPreview(html: string): string {
  let documentHtml = html.trim();
  if (!documentHtml) return "";

  // Ensure a referrer policy so CDNs (Pexels, etc.) don't block the request.
  if (!/name=["']referrer["']/i.test(documentHtml)) {
    const referrerMeta =
      '<meta name="referrer" content="no-referrer">\n';
    if (/<head[\s>]/i.test(documentHtml)) {
      documentHtml = documentHtml.replace(
        /<head([^>]*)>/i,
        `<head$1>\n  ${referrerMeta}`,
      );
    } else if (/<html[\s>]/i.test(documentHtml)) {
      documentHtml = documentHtml.replace(
        /<html([^>]*)>/i,
        `<html$1>\n<head>\n  <meta charset="UTF-8">\n  ${referrerMeta}</head>`,
      );
    } else {
      documentHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ${referrerMeta}<meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
</head>
<body>
${documentHtml}
</body>
</html>`;
    }
  }

  // Make sure every <img> opts out of sending a referrer.
  documentHtml = documentHtml.replace(/<img\b([^>]*)>/gi, (_full, attrs: string) => {
    let next = attrs;
    if (!/\breferrerpolicy\s*=/i.test(next)) {
      next += ' referrerpolicy="no-referrer"';
    }
    if (!/\bloading\s*=/i.test(next)) {
      next += ' loading="eager"';
    }
    return `<img${next}>`;
  });

  return documentHtml;
}
