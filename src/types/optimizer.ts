export type Unit = 'mm' | 'in';

export interface NestingInputs {
  sheetWidth: number;
  sheetHeight: number;
  partWidth: number;
  partHeight: number;
  quantity: number;
  kerf: number;
  margin: number;
  unit: Unit;
}

export interface PlacedPart {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SheetLayout {
  sheetIndex: number;
  parts: PlacedPart[];
  usedArea: number;
  sheetArea: number;
  utilization: number;
}

export interface NestingResult {
  sheets: SheetLayout[];
  totalPartsPlaced: number;
  sheetsRequired: number;
  partsPerSheet: number;
  totalSheetArea: number;
  totalUsedArea: number;
  totalWasteArea: number;
  utilizationPercentage: number;
  wastePercentage: number;
}
