export interface LectureCharacter {
  key: string;
  label: string;
  emoji: string;
}

export const LECTURE_CHARACTERS: LectureCharacter[] = [
  { key: "fox", label: "여우 선생님", emoji: "🦊" },
  { key: "bear", label: "곰 선생님", emoji: "🐻" },
  { key: "owl", label: "부엉이 선생님", emoji: "🦉" },
  { key: "rabbit", label: "토끼 선생님", emoji: "🐰" },
  { key: "cat", label: "고양이 선생님", emoji: "🐱" },
];

export const DEFAULT_LECTURE_CHARACTER = "fox";

export function isValidCharacterKey(key: string): boolean {
  return LECTURE_CHARACTERS.some((c) => c.key === key);
}

export function getCharacterEmoji(key: string): string {
  return LECTURE_CHARACTERS.find((c) => c.key === key)?.emoji ?? "🦊";
}
