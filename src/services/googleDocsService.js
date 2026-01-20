/**
 * Google Docs API Service
 * Fetches and parses Google Docs with formatting preserved
 */

const API_KEY = import.meta.env.VITE_GOOGLE_DOCS_API_KEY;
const DOCS_API_BASE = 'https://docs.googleapis.com/v1/documents';

/**
 * Extract document ID from various Google Docs URL formats
 */
export const extractDocId = (url) => {
  if (!url) return null;

  // Handle various URL formats
  const patterns = [
    /\/document\/d\/([a-zA-Z0-9_-]+)/,  // Standard docs URL
    /\/d\/([a-zA-Z0-9_-]+)/,             // Short format
    /^([a-zA-Z0-9_-]{20,})$/              // Raw ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
};

/**
 * Fetch document from Google Docs API
 */
export const fetchGoogleDoc = async (docIdOrUrl) => {
  const docId = extractDocId(docIdOrUrl);
  if (!docId) {
    throw new Error('Invalid Google Docs URL or ID');
  }

  if (!API_KEY) {
    throw new Error('Google Docs API key not configured');
  }

  const response = await fetch(`${DOCS_API_BASE}/${docId}?key=${API_KEY}`);

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('Document is not publicly shared. Please make it viewable to anyone with the link.');
    }
    if (response.status === 404) {
      throw new Error('Document not found. Check the URL and sharing settings.');
    }
    throw new Error(`Failed to fetch document: ${response.status}`);
  }

  return response.json();
};

/**
 * Convert Google Docs color to hex
 */
const colorToHex = (color) => {
  if (!color) return '#000000';
  const r = Math.round((color.red || 0) * 255);
  const g = Math.round((color.green || 0) * 255);
  const b = Math.round((color.blue || 0) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

/**
 * Parse text style from Google Docs format
 */
const parseTextStyle = (textStyle) => {
  const style = {
    bold: textStyle?.bold || false,
    italic: textStyle?.italic || false,
    underline: textStyle?.underline || false,
    strikethrough: textStyle?.strikethrough || false,
    fontSize: textStyle?.fontSize?.magnitude || 11,
    fontFamily: textStyle?.weightedFontFamily?.fontFamily || 'Arial',
    color: colorToHex(textStyle?.foregroundColor?.color?.rgbColor),
    backgroundColor: textStyle?.backgroundColor?.color?.rgbColor
      ? colorToHex(textStyle.backgroundColor.color.rgbColor)
      : null,
    link: textStyle?.link?.url || null
  };
  return style;
};

/**
 * Parse paragraph style
 */
const parseParagraphStyle = (paragraphStyle) => {
  const namedStyleMap = {
    'HEADING_1': { fontSize: 24, bold: true },
    'HEADING_2': { fontSize: 20, bold: true },
    'HEADING_3': { fontSize: 16, bold: true },
    'HEADING_4': { fontSize: 14, bold: true },
    'HEADING_5': { fontSize: 12, bold: true },
    'HEADING_6': { fontSize: 11, bold: true },
    'TITLE': { fontSize: 26, bold: true },
    'SUBTITLE': { fontSize: 15, italic: true },
    'NORMAL_TEXT': { fontSize: 11, bold: false }
  };

  const namedStyle = paragraphStyle?.namedStyleType || 'NORMAL_TEXT';
  const baseStyle = namedStyleMap[namedStyle] || namedStyleMap['NORMAL_TEXT'];

  return {
    ...baseStyle,
    alignment: paragraphStyle?.alignment || 'START',
    lineSpacing: paragraphStyle?.lineSpacing || 100,
    spaceAbove: paragraphStyle?.spaceAbove?.magnitude || 0,
    spaceBelow: paragraphStyle?.spaceBelow?.magnitude || 0,
    indentFirstLine: paragraphStyle?.indentFirstLine?.magnitude || 0,
    indentStart: paragraphStyle?.indentStart?.magnitude || 0,
    direction: paragraphStyle?.direction || 'LEFT_TO_RIGHT'
  };
};

/**
 * Parse document content into structured format for Fabric.js
 */
export const parseDocumentContent = (doc) => {
  const content = doc.body?.content || [];
  const elements = [];

  let yPosition = 50; // Starting Y position
  const pageWidth = 700; // Available width for text
  const leftMargin = 50;

  for (const element of content) {
    if (element.paragraph) {
      const paragraph = element.paragraph;
      const paragraphStyle = parseParagraphStyle(paragraph.paragraphStyle);

      // Check for list items
      const isList = !!paragraph.bullet;
      const listPrefix = isList ? '• ' : '';

      // Process paragraph elements (text runs)
      const textRuns = [];
      for (const elem of paragraph.elements || []) {
        if (elem.textRun) {
          const text = elem.textRun.content || '';
          const textStyle = parseTextStyle(elem.textRun.textStyle);

          // Skip empty newlines at end
          if (text === '\n') continue;

          textRuns.push({
            text: text.replace(/\n$/, ''), // Remove trailing newline
            style: textStyle
          });
        }

        // Handle inline objects (images)
        if (elem.inlineObjectElement) {
          const objectId = elem.inlineObjectElement.inlineObjectId;
          const inlineObject = doc.inlineObjects?.[objectId];
          if (inlineObject?.inlineObjectProperties?.embeddedObject?.imageProperties) {
            const imageProps = inlineObject.inlineObjectProperties.embeddedObject;
            elements.push({
              type: 'image',
              url: imageProps.imageProperties.contentUri,
              x: leftMargin + (paragraphStyle.indentStart || 0),
              y: yPosition,
              width: imageProps.size?.width?.magnitude || 200,
              height: imageProps.size?.height?.magnitude || 200
            });
            yPosition += (imageProps.size?.height?.magnitude || 200) + 10;
          }
        }
      }

      // Combine text runs into paragraph text
      const fullText = listPrefix + textRuns.map(r => r.text).join('');

      if (fullText.trim()) {
        // Determine dominant style (use first run's style as base)
        const dominantStyle = textRuns[0]?.style || {};

        // Calculate x position based on alignment
        let xPosition = leftMargin + (paragraphStyle.indentStart || 0);
        let textAlign = 'left';

        if (paragraphStyle.alignment === 'CENTER') {
          xPosition = pageWidth / 2 + leftMargin;
          textAlign = 'center';
        } else if (paragraphStyle.alignment === 'END') {
          xPosition = pageWidth + leftMargin;
          textAlign = 'right';
        }

        // Determine text direction
        const isRTL = paragraphStyle.direction === 'RIGHT_TO_LEFT' ||
                      /[\u0590-\u05FF\u0600-\u06FF]/.test(fullText); // Hebrew or Arabic

        elements.push({
          type: 'text',
          text: fullText,
          x: xPosition,
          y: yPosition,
          fontSize: paragraphStyle.fontSize || dominantStyle.fontSize || 11,
          fontFamily: dominantStyle.fontFamily || 'Arial',
          fontWeight: (paragraphStyle.bold || dominantStyle.bold) ? 'bold' : 'normal',
          fontStyle: dominantStyle.italic ? 'italic' : 'normal',
          fill: dominantStyle.color || '#000000',
          textAlign: textAlign,
          underline: dominantStyle.underline || false,
          linethrough: dominantStyle.strikethrough || false,
          direction: isRTL ? 'rtl' : 'ltr',
          // Store rich text info for complex rendering
          textRuns: textRuns.length > 1 ? textRuns : null,
          link: dominantStyle.link
        });

        // Estimate height based on font size and line count
        const estimatedLines = Math.ceil(fullText.length / 60);
        const lineHeight = (paragraphStyle.fontSize || 11) * 1.4;
        yPosition += lineHeight * estimatedLines + paragraphStyle.spaceBelow + 5;
      } else {
        // Empty paragraph - add spacing
        yPosition += 15;
      }
    }

    // Handle tables
    if (element.table) {
      elements.push({
        type: 'table',
        x: leftMargin,
        y: yPosition,
        rows: element.table.rows,
        tableData: element.table
      });
      // Estimate table height
      yPosition += (element.table.rows || 1) * 30 + 20;
    }
  }

  return {
    title: doc.title || 'Untitled Document',
    elements,
    totalHeight: yPosition
  };
};

/**
 * Convert parsed content to Fabric.js objects
 */
export const createFabricObjects = async (fabric, parsedContent, maxHeight = 1000) => {
  const objects = [];

  for (const element of parsedContent.elements) {
    // Stop if we exceed page height
    if (element.y > maxHeight - 50) break;

    if (element.type === 'text') {
      const textObj = new fabric.IText(element.text, {
        left: element.x,
        top: element.y,
        fontSize: element.fontSize,
        fontFamily: element.fontFamily,
        fontWeight: element.fontWeight,
        fontStyle: element.fontStyle,
        fill: element.fill,
        textAlign: element.textAlign,
        underline: element.underline,
        linethrough: element.linethrough,
        direction: element.direction,
        width: 700,
        splitByGrapheme: element.direction === 'rtl'
      });
      objects.push(textObj);
    }

    if (element.type === 'image' && element.url) {
      try {
        const img = await new Promise((resolve, reject) => {
          fabric.Image.fromURL(element.url, (img) => {
            if (img) resolve(img);
            else reject(new Error('Failed to load image'));
          }, { crossOrigin: 'anonymous' });
        });

        // Scale image to fit
        const maxWidth = 300;
        if (img.width > maxWidth) {
          img.scaleToWidth(maxWidth);
        }

        img.set({
          left: element.x,
          top: element.y
        });

        objects.push(img);
      } catch (err) {
        console.warn('Failed to load inline image:', err);
      }
    }
  }

  return objects;
};

/**
 * Main function: Fetch and import Google Doc to Fabric canvas
 */
export const importGoogleDocToCanvas = async (fabric, fabricCanvas, docUrl, options = {}) => {
  const { maxHeight = 1000, onProgress } = options;

  onProgress?.('Fetching document...');
  const doc = await fetchGoogleDoc(docUrl);

  onProgress?.('Parsing content...');
  const parsedContent = parseDocumentContent(doc);

  onProgress?.('Creating objects...');
  const objects = await createFabricObjects(fabric, parsedContent, maxHeight);

  onProgress?.('Adding to canvas...');
  for (const obj of objects) {
    fabricCanvas.add(obj);
  }

  fabricCanvas.renderAll();

  return {
    title: parsedContent.title,
    objectCount: objects.length,
    totalElements: parsedContent.elements.length
  };
};
