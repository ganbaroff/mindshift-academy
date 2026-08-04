export type TaskPrimaryActionProps = {
  formId: string;
  hidePrimaryAction?: boolean;
  onSubmitReadyChange?: (ready: boolean) => void;
};

export const PRIMARY_ACTION_HIDDEN =
  "pointer-events-none absolute h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [-webkit-clip-path:inset(50%)] [clip-path:inset(50%)]";
