/**
 * Public pilot-operator contact (shown on consent / dashboard / legal drafts).
 * Override via NEXT_PUBLIC_* for staging; defaults are the live operator identity.
 */

export const OPERATOR_NAME_DEFAULT = "Юсиф Ганбаров";
export const OPERATOR_EMAIL_DEFAULT = "yusif.ganbarov@volaura.app";
export const OPERATOR_PHONE_DEFAULT = "+994555857791";

export type OperatorContact = {
  name: string;
  email: string;
  phone: string;
};

export function getOperatorContact(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): OperatorContact {
  return {
    name: env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || OPERATOR_NAME_DEFAULT,
    email: env.NEXT_PUBLIC_OPERATOR_EMAIL?.trim() || OPERATOR_EMAIL_DEFAULT,
    phone: env.NEXT_PUBLIC_OPERATOR_PHONE?.trim() || OPERATOR_PHONE_DEFAULT,
  };
}
