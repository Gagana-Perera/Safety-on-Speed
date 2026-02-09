export type GuardianContact = {
  id: string;
  name: string;
  phone: string;
};

export type SignupDraft = {
  fullName: string;
  nickName: string;
  birthdate: string;
  phoneNumber: string;
  email: string;
  password: string;
  guardians: GuardianContact[];
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
