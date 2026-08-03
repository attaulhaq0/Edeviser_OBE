const humanizeIdentifier = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

export const formatNotificationTitle = (title: string): string => {
  const badgePrefix = "Badge earned:";
  if (!title.toLocaleLowerCase().startsWith(badgePrefix.toLocaleLowerCase())) {
    return title;
  }

  const badgeName = title.slice(badgePrefix.length).trim();
  return badgeName ? `${badgePrefix} ${humanizeIdentifier(badgeName)}` : title;
};
