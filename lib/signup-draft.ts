export type SignupDraft = {
  firstName: string;
  surname: string;
  nicNumber: string;
  phoneNumber: string;
  email: string;
  password: string;
};

let signupDraft: Partial<SignupDraft> = {};

export function setSignupDraft(next: Partial<SignupDraft>) {
  signupDraft = { ...signupDraft, ...next };
}

export function getSignupDraft() {
  return signupDraft;
}

export function clearSignupDraft() {
  signupDraft = {};
}
