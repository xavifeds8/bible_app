import type { EmotionTag } from "@bible/db";

export interface EmotionDef {
  tag: EmotionTag;
  label: string;
  seedQueries: string[];
  seedPassages: string[];
}

export const EMOTIONS: EmotionDef[] = [
  {
    tag: "anxiety",
    label: "Anxious",
    seedQueries: ["do not worry", "cast your cares", "peace", "rest for your soul"],
    seedPassages: ["psalm-23", "matt-6-25", "phil-4-6", "1pet-5-7", "psalm-94-19", "isa-41-10", "matt-11-28", "psalm-46-1", "john-14-27"],
  },
  {
    tag: "grief",
    label: "Grieving",
    seedQueries: ["brokenhearted", "mourn", "wept", "comfort"],
    seedPassages: ["psalm-34-18", "matt-5-4", "john-11-35", "psalm-147-3", "psalm-23"],
  },
  {
    tag: "fear",
    label: "Afraid",
    seedQueries: ["do not fear", "afraid", "courage", "strong and courageous"],
    seedPassages: ["psalm-56-3", "2tim-1-7", "josh-1-9", "isa-41-10", "psalm-46-1", "psalm-23", "psalm-27", "calms-storm"],
  },
  {
    tag: "anger",
    label: "Angry",
    seedQueries: ["anger", "slow to anger", "wrath", "soft answer"],
    seedPassages: ["eph-4-26", "james-1-19", "prov-15-1", "psalm-37-8"],
  },
  {
    tag: "loneliness",
    label: "Lonely",
    seedQueries: ["never leave", "forsake", "with you", "where can i flee"],
    seedPassages: ["psalm-139-7", "deut-31-6", "heb-13-5", "matt-28-20", "psalm-23"],
  },
  {
    tag: "guilt",
    label: "Ashamed",
    seedQueries: ["forgive", "clean heart", "no condemnation", "mercy"],
    seedPassages: ["1john-1-9", "psalm-51", "rom-8-1", "psalm-103-12", "1cor-13"],
  },
  {
    tag: "hope",
    label: "Hopeful",
    seedQueries: ["hope", "plans", "new every morning", "all things work"],
    seedPassages: ["jer-29-11", "rom-15-13", "lam-3-22", "rom-8-28", "rom-8-38"],
  },
  {
    tag: "gratitude",
    label: "Thankful",
    seedQueries: ["give thanks", "thanksgiving", "mercy endures", "rejoice"],
    seedPassages: ["psalm-100", "1thess-5-16", "psalm-136-1", "col-3-15"],
  },
];

export const EMOTION_BY_TAG = Object.fromEntries(EMOTIONS.map((e) => [e.tag, e])) as Record<
  EmotionTag,
  EmotionDef
>;
