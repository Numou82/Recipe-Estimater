import { NestingInputs, NestingResult, SheetLayout, PlacedPart } from '../types/optimizer';

export function calculateNesting(inputs: NestingInputs): NestingResult {
  const { sheetWidth, sheetHeight, partWidth, partHeight, quantity, kerf, margin } = inputs;

  if (sheetWidth <= 0 || sheetHeight <= 0 || partWidth <= 0 || partHeight <= 0 || quantity <= 0) {
    return getEmptyResult();
  }

  const effectivePartW = partWidth + kerf + margin;
  const effectivePartH = partHeight + kerf + margin;

  const cols = Math.floor((sheetWidth - margin) / effectivePartW);
  const rows = Math.floor((sheetHeight - margin) / effectivePartH);
  const partsPerSheet = Math.max(0, cols * rows);

  if (partsPerSheet === 0) {
    return getEmptyResult();
  }

  const sheetsRequired = Math.ceil(quantity / partsPerSheet);
  const sheets: SheetLayout[] = [];
  let remainingParts = quantity;

  for (let s = 0; s < sheetsRequired; s++) {
    const partsInThisSheet = Math.min(remainingParts, partsPerSheet);
    const placedParts: PlacedPart[] = [];

    for (let i = 0; i < partsInThisSheet; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = margin + col * effectivePartW;
      const y = margin + row * effectivePartH;

      placedParts.push({
        id: `sheet-${s}-part-${i}`,
        x,
        y,
        width: partWidth,
        height: partHeight,
      });
    }

    const singleSheetArea = sheetWidth * sheetHeight;
    const usedArea = partsInThisSheet * (partWidth * partHeight);
    const utilization = (usedArea / singleSheetArea) * 100;

    sheets.push({
      sheetIndex: s + 1,
      parts: placedParts,
      usedArea,
      sheetArea: singleSheetArea,
      utilization,
    });

    remainingParts -= partsInThisSheet;
  }

  const totalSheetArea = sheetsRequired * (sheetWidth * sheetHeight);
  const totalUsedArea = quantity * (partWidth * partHeight);
  const totalWasteArea = totalSheetArea - totalUsedArea;
  const utilizationPercentage = totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0;
  const wastePercentage = 100 - utilizationPercentage;

  return {
    sheets,
    totalPartsPlaced: quantity,
    sheetsRequired,
    partsPerSheet,
    totalSheetArea,
    totalUsedArea,
    totalWasteArea,
    utilizationPercentage,
    wastePercentage,
  };
}

function getEmptyResult(): NestingResult {
  return {
    sheets: [],
    totalPartsPlaced: 0,
    sheetsRequired: 0,
    partsPerSheet: 0,
    totalSheetArea: 0,
    totalUsedArea: 0,
    totalWasteArea: 0,
    utilizationPercentage: 0,
    wastePercentage: 0,
  };
}
