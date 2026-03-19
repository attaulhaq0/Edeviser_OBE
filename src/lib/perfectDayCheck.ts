export const isPerfectDay = (academicHabits: {
  login: boolean;
  submit: boolean;
  journal: boolean;
  read: boolean;
}): boolean => {
  return academicHabits.login && academicHabits.submit && academicHabits.journal && academicHabits.read;
};
