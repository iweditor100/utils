export type SyncDirection =
  | "IMPORT"
  | "EXPORT"
  | "MERGE";

export type ConflictStrategy =
  | "KEEP_LOCAL"
  | "KEEP_REMOTE"
  | "SKIP";

export type SyncRangeType =
  | "TODAY"
  | "THIS_MONTH"
  | "NEXT_3_MONTHS"
  | "NEXT_6_MONTHS"
  | "ALL_LOCAL";



export interface SyncRequestInput {
  direction: SyncDirection;
  conflictStrategy: ConflictStrategy;
  range: SyncRangeType;
}


export interface SyncSummary {
  imported: number;
  exported: number;
  updated: number;
  conflicts: number;
}